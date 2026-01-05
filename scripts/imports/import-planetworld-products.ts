#!/usr/bin/env bun
/**
 * Import Planetworld Products from Google Sites
 *
 * Scrapes pricing data from Planetworld's Google Sites pricelist which contains
 * multiple brand pages with embedded Google Sheets.
 *
 * Usage:
 *   bun scripts/import-planetworld-products.ts
 *
 * Requirements:
 *   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable must be set
 *   - Supplier "Planetworld" must exist in core.supplier table
 */

import { pricelistService } from '../src/lib/services/PricelistService';
import { WebScrapingService } from '../src/lib/supplier-discovery/web-scraping-service';
import type { PricelistRow } from '../src/types/nxt-spp';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

const BASE_URL = 'https://sites.google.com/view/planetworldpromipricelist';
const SUPPLIER_NAMES = ['PLANETWORLD SA', 'Planet World MI', 'Planetworld']; // Try these in order
const RATE_LIMIT_MS = 1000; // Delay between requests
const VAT_RATE = 0.15; // Default VAT rate

interface BrandPage {
  name: string;
  url: string;
  parentBrand?: string; // For category submodules
  isCategory?: boolean; // True if this is a category submodule
}

interface SheetInfo {
  sheetId: string;
  gid?: string;
}

/**
 * Find supplier by name (tries multiple name variations)
 */
async function findSupplier(names: string[]): Promise<{ supplierId: string; name: string } | null> {
  try {
    const { query } = await import('../src/lib/database');
    
    // Try each name in order
    for (const name of names) {
      const result = await query<{ supplier_id: string; name: string }>(
        `SELECT supplier_id, name 
         FROM core.supplier 
         WHERE name ILIKE $1 OR code ILIKE $1
         LIMIT 1`,
        [name]
      );

      if (result.rows.length > 0) {
        return {
          supplierId: result.rows[0].supplier_id,
          name: result.rows[0].name,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding supplier:', error);
    throw error;
  }
}

/**
 * Discover all brand pages from the main Planetworld site
 * Also discovers submodules/pages within each brand
 */
async function discoverBrandPages(scrapingService: WebScrapingService): Promise<BrandPage[]> {
  console.log(`🔍 Scraping main page: ${BASE_URL}`);
  
  const content = await scrapingService.extractWebsiteContent(BASE_URL);
  
  if (content.status !== 'success' || !content.content) {
    throw new Error(`Failed to scrape main page: ${content.status}`);
  }

  const $ = cheerio.load(content.content);
  const brandPages: BrandPage[] = [];
  const visitedUrls = new Set<string>([BASE_URL]);

  // Look for navigation links - Google Sites typically uses various patterns
  // Try multiple selectors to find brand links
  
  // Pattern 1: Navigation menu links
  $('nav a, .navigation a, [role="navigation"] a').each((_, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const text = $link.text().trim();
    
    if (href && text && href.includes('/view/')) {
      const url = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
      if (url !== BASE_URL && !visitedUrls.has(url)) {
        brandPages.push({ name: text || 'Unknown Brand', url });
        visitedUrls.add(url);
      }
    }
  });

  // Pattern 2: Sidebar links
  $('.sidebar a, aside a').each((_, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const text = $link.text().trim();
    
    if (href && text && href.includes('/view/')) {
      const url = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
      if (url !== BASE_URL && !visitedUrls.has(url)) {
        brandPages.push({ name: text || 'Unknown Brand', url });
        visitedUrls.add(url);
      }
    }
  });

  // Pattern 3: Any links containing brand-like patterns
  $('a[href*="/view/"]').each((_, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');
    const text = $link.text().trim();
    
    if (href && text && href !== BASE_URL) {
      const url = href.startsWith('http') ? href : new URL(href, BASE_URL).href;
      if (!visitedUrls.has(url)) {
        brandPages.push({ name: text || 'Unknown Brand', url });
        visitedUrls.add(url);
      }
    }
  });

  console.log(`✅ Found ${brandPages.length} brand pages`);
  brandPages.forEach((brand, idx) => {
    console.log(`   ${idx + 1}. ${brand.name}: ${brand.url}`);
  });

  // Now discover category submodules within each brand page
  console.log(`\n🔍 Discovering category submodules within brand pages...`);
  const allPages: BrandPage[] = [...brandPages];
  
  for (const brandPage of brandPages) {
    try {
      console.log(`   Checking categories in: ${brandPage.name}`);
      const categoryPages = await discoverSubPages(scrapingService, brandPage, visitedUrls);
      allPages.push(...categoryPages);
      
      if (categoryPages.length > 0) {
        console.log(`   ✅ Found ${categoryPages.length} category submodule(s) in ${brandPage.name}:`);
        categoryPages.forEach((cat, idx) => {
          console.log(`      - ${cat.name}`);
        });
      }
      
      // Rate limiting between brand pages
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    } catch (error) {
      console.warn(`   ⚠️  Error discovering categories for ${brandPage.name}:`, error instanceof Error ? error.message : String(error));
      // Continue with next brand
    }
  }

  const categoryCount = allPages.length - brandPages.length;
  console.log(`\n✅ Total pages discovered: ${allPages.length} (${brandPages.length} brands + ${categoryCount} category submodules)`);
  
  return allPages;
}

/**
 * Discover category submodules within a brand page
 * Each brand will have different categories - we discover them dynamically
 * Categories might be structured as tiles, cards, grids, lists, or any HTML structure
 */
async function discoverSubPages(
  scrapingService: WebScrapingService,
  parentPage: BrandPage,
  visitedUrls: Set<string>
): Promise<BrandPage[]> {
  const subPages: BrandPage[] = [];
  const foundUrls = new Set<string>(); // Track URLs found in this discovery pass
  
  try {
    const content = await scrapingService.extractWebsiteContent(parentPage.url);
    
    if (content.status !== 'success' || !content.content) {
      return subPages; // Return empty if failed
    }

    const $ = cheerio.load(content.content);
    
    // Helper function to extract text from a link element (handles various structures)
    const extractLinkText = ($link: cheerio.Cheerio<cheerio.Element>): string => {
      // Try direct text first
      let text = $link.text().trim();
      if (text) return text;
      
      // Try child elements (for overlays, nested structures)
      text = $link.find('span, div, p, h1, h2, h3, h4, h5, h6, [class*="text"], [class*="label"], [class*="title"]').first().text().trim();
      if (text) return text;
      
      // Try attributes
      text = $link.attr('title') || $link.attr('aria-label') || $link.attr('alt') || '';
      if (text) return text;
      
      // Try parent element text (for cases where link wraps an image)
      text = $link.parent().text().trim();
      if (text) return text;
      
      return '';
    };
    
    // Helper function to check if URL is a valid category subpage
    // Category URLs typically follow pattern: /brand-category-name (e.g., /ibanez-acoustic-guitar)
    const isValidCategoryUrl = (url: string): boolean => {
      // Must be different from parent and base
      if (url === parentPage.url || url === BASE_URL) return false;
      
      // Must be under the same site
      if (!url.includes(parentPage.url.split('/view/')[0])) return false;
      
      // Must not be already visited
      if (visitedUrls.has(url) || foundUrls.has(url)) return false;
      
      // Category URLs typically have the brand name in them followed by a category
      // e.g., /ibanez-acoustic-guitar, /ibanez-bass-guitar
      // Extract brand slug from parent URL (e.g., "ibanez" from "/ibanez")
      const parentSlug = parentPage.url.split('/').pop() || '';
      const urlSlug = url.split('/').pop() || '';
      
      // Check if URL slug starts with brand slug followed by a hyphen (category pattern)
      // Or check if it's a subpath of the brand URL
      const isCategoryPattern = urlSlug.startsWith(parentSlug + '-') && urlSlug.length > parentSlug.length + 1;
      const isSubpath = url.startsWith(parentPage.url + '/') || url.startsWith(parentPage.url + '-');
      
      return isCategoryPattern || isSubpath;
    };
    
    // Comprehensive discovery: Find ALL links that could be category pages
    // Pattern 1: All links to /view/ pages (most comprehensive - catches everything)
    $('a[href*="/view/"]').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      if (!href) return;
      
      const text = extractLinkText($link);
      // Allow links without text if they match category URL pattern (might be image links)
      const url = href.startsWith('http') ? href : new URL(href, parentPage.url).href;
      
      if (isValidCategoryUrl(url)) {
        // Use text if available, otherwise extract from URL slug
        const categoryName = text || url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Category';
        subPages.push({ 
          name: categoryName,
          url,
          parentBrand: parentPage.name,
          isCategory: true,
        });
        foundUrls.add(url);
        visitedUrls.add(url);
      }
    });
    
    // Pattern 2: Also check for relative links that might be category pages
    // Google Sites might use relative URLs like "acoustic-guitar" or "./acoustic-guitar"
    $('a[href]').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      if (!href) return;
      
      // Skip absolute URLs (already handled above) and external links
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return;
      
      // Check if it looks like a category link (contains hyphens, no file extension)
      if (href.includes('-') && !href.match(/\.(pdf|doc|jpg|png|gif|zip)$/i)) {
        const url = new URL(href, parentPage.url).href;
        const text = extractLinkText($link) || href.replace(/-/g, ' ');
        
        if (isValidCategoryUrl(url)) {
          subPages.push({ 
            name: text,
            url,
            parentBrand: parentPage.name,
            isCategory: true,
          });
          foundUrls.add(url);
          visitedUrls.add(url);
        }
      }
    });
    
    // Deduplicate by URL (in case same category found via multiple patterns)
    const uniqueSubPages = subPages.filter((page, index, self) =>
      index === self.findIndex(p => p.url === page.url)
    );
    
    return uniqueSubPages;
    
  } catch (error) {
    console.warn(`   ⚠️  Error scraping subpages for ${parentPage.name}:`, error instanceof Error ? error.message : String(error));
  }
  
  // Return deduplicated list
  return subPages.filter((page, index, self) =>
    index === self.findIndex(p => p.url === page.url)
  );
}

/**
 * Extract Google Sheets IDs from a brand page
 */
async function extractSheetIds(
  scrapingService: WebScrapingService,
  brandPage: BrandPage
): Promise<SheetInfo[]> {
  console.log(`\n📄 Extracting sheets from: ${brandPage.name}`);
  
  const sheets: SheetInfo[] = [];
  
  // For Google Sites, we need to use Puppeteer to access iframe content
  // Try to access the page directly with Puppeteer to inspect iframes
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto(brandPage.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for embeds
    
    // Get all iframes and try to extract sheet IDs from their content
    const iframeData = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      return iframes.map(iframe => ({
        src: iframe.src,
        title: iframe.title,
        id: iframe.id,
      }));
    });
    
    // Also try to find sheet IDs in the page's JavaScript/HTML
    const pageContent = await page.content();
    
    // Try to extract sheet data from iframe content by navigating into iframes
    // Google Sites embeds load via JavaScript, so we need to wait and check iframe content
    try {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const frameUrl = frame.url();
          if (frameUrl.includes('spreadsheets') || frameUrl.includes('docs.google.com')) {
            const sheetInfo = extractSheetId(frameUrl);
            if (sheetInfo) {
              sheets.push(sheetInfo);
            }
          }
        } catch {
          // Iframe might be cross-origin, can't access directly
        }
      }
    } catch {
      // Can't access frames
    }
    
    await browser.close();
    
    // Extract sheet IDs from iframe sources and page content
    const allContent = iframeData.map(i => i.src).join(' ') + ' ' + pageContent;
    const $ = cheerio.load(pageContent);
    
    // Debug: Log page structure
    const iframeCount = $('iframe').length;
    const scriptCount = $('script').length;
    const hasGoogleContent = pageContent.includes('google.com') || pageContent.includes('spreadsheets');
    
    if (iframeCount > 0 || hasGoogleContent) {
      console.log(`   🔍 Debug: Found ${iframeCount} iframe(s), ${scriptCount} script(s), Google content: ${hasGoogleContent}`);
    }

    // Helper function to extract sheet ID from various URL patterns
    const extractSheetId = (url: string): { sheetId: string; gid?: string } | null => {
    // Pattern 1: /spreadsheets/d/{SHEET_ID}/...
    let match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
    if (!match) {
      // Pattern 2: /d/{SHEET_ID}/...
      match = url.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
    }
    if (!match) {
      // Pattern 3: spreadsheetId={SHEET_ID}
      match = url.match(/spreadsheetId=([a-zA-Z0-9-_]{20,})/);
    }
    if (!match) {
      // Pattern 4: id={SHEET_ID}
      match = url.match(/[?&]id=([a-zA-Z0-9-_]{20,})/);
    }
    if (!match) {
      // Pattern 5: key={SHEET_ID}
      match = url.match(/[?&]key=([a-zA-Z0-9-_]{20,})/);
    }
    
    if (match && match[1] && match[1].length >= 20) {
      const gidMatch = url.match(/[?&]gid=(\d+)/);
      return {
        sheetId: match[1],
        gid: gidMatch ? gidMatch[1] : undefined,
      };
    }
    return null;
  };

  // Pattern 1: Embedded iframes (most common for Google Sites)
  $('iframe').each((_, elem) => {
    const src = $(elem).attr('src');
    if (!src) return;
    
    // Log ALL iframe sources for debugging (first brand page only to avoid spam)
    if (brandPage.name === 'BSS' || brandPage.name.includes('Ibanez')) {
      console.log(`   🔍 Debug iframe src: ${src.substring(0, 150)}`);
    }
    
    // Google Sites might embed sheets directly or via embed URLs
    // Check for any Google-related content
    if (src.includes('spreadsheets') || src.includes('docs.google.com') || src.includes('google.com')) {
      const sheetInfo = extractSheetId(src);
      if (sheetInfo) {
        console.log(`   ✅ Found sheet ID in iframe: ${sheetInfo.sheetId.substring(0, 20)}...`);
        sheets.push(sheetInfo);
      } else if (src.includes('spreadsheets') || src.includes('docs.google')) {
        // Log if we found a spreadsheet URL but couldn't extract ID
        console.log(`   ⚠️  Found spreadsheet URL but couldn't extract ID: ${src.substring(0, 100)}`);
      }
    }
  });

  // Pattern 2: Links to Google Sheets
  $('a[href*="spreadsheets"], a[href*="docs.google.com"]').each((_, elem) => {
    const href = $(elem).attr('href');
    if (href) {
      const sheetInfo = extractSheetId(href);
      if (sheetInfo) {
        sheets.push(sheetInfo);
      }
    }
  });

  // Pattern 3: Embedded Google Sheets widgets/embeds (data attributes)
  $('[data-src*="spreadsheets"], [data-url*="spreadsheets"], [data-id*="spreadsheet"], [data-src*="docs.google"], [data-url*="docs.google"]').each((_, elem) => {
    const src = $(elem).attr('data-src') || $(elem).attr('data-url') || $(elem).attr('data-id');
    if (src) {
      const sheetInfo = extractSheetId(src);
      if (sheetInfo) {
        sheets.push(sheetInfo);
      }
    }
  });
  
  // Pattern 4: Check for Google Sites embedded content in script tags
  // Google Sites embeds sheets via JavaScript, so sheet IDs are in script content
  $('script').each((_, elem) => {
    const scriptContent = $(elem).html() || '';
    if (scriptContent.includes('spreadsheets') || scriptContent.includes('docs.google.com') || scriptContent.includes('drive.google.com')) {
      // Try multiple patterns to find sheet IDs in script content
      // Pattern 1: /spreadsheets/d/{SHEET_ID}
      let matches = scriptContent.matchAll(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/g);
      for (const match of matches) {
        if (match[1] && match[1].length >= 20) {
          const gidMatch = scriptContent.match(/[?&]gid=(\d+)/);
          sheets.push({
            sheetId: match[1],
            gid: gidMatch ? gidMatch[1] : undefined,
          });
        }
      }
      
      // Pattern 2: /d/{SHEET_ID} (shorter form)
      matches = scriptContent.matchAll(/\/d\/([a-zA-Z0-9-_]{20,})/g);
      for (const match of matches) {
        if (match[1] && match[1].length >= 20 && !sheets.some(s => s.sheetId === match[1])) {
          const gidMatch = scriptContent.match(/[?&]gid=(\d+)/);
          sheets.push({
            sheetId: match[1],
            gid: gidMatch ? gidMatch[1] : undefined,
          });
        }
      }
      
      // Pattern 3: "fileId":"{SHEET_ID}" or fileId:{SHEET_ID}
      matches = scriptContent.matchAll(/["']fileId["']\s*:\s*["']([a-zA-Z0-9-_]{20,})["']/g);
      for (const match of matches) {
        if (match[1] && match[1].length >= 20 && !sheets.some(s => s.sheetId === match[1])) {
          sheets.push({
            sheetId: match[1],
            gid: undefined,
          });
        }
      }
      
      // Pattern 4: "id":"{SHEET_ID}" in context of spreadsheets
      if (scriptContent.includes('spreadsheet')) {
        matches = scriptContent.matchAll(/["']id["']\s*:\s*["']([a-zA-Z0-9-_]{20,})["']/g);
        for (const match of matches) {
          if (match[1] && match[1].length >= 20 && !sheets.some(s => s.sheetId === match[1])) {
            sheets.push({
              sheetId: match[1],
              gid: undefined,
            });
          }
        }
      }
    }
  });
  
  // Pattern 5: Google Sites might embed via embedded file widgets
  // Look for embedded file references
  $('[class*="embedded"], [class*="file"], [class*="drive"], [data-type="drive"], [class*="sites-embed"]').each((_, elem) => {
    const $elem = $(elem);
    // Check various attributes that might contain sheet IDs
    const possibleAttrs = ['data-id', 'data-file-id', 'data-drive-id', 'data-src', 'data-url', 'id', 'data-fileid'];
    for (const attr of possibleAttrs) {
      const value = $elem.attr(attr);
      if (value) {
        const sheetInfo = extractSheetId(value);
        if (sheetInfo) {
          sheets.push(sheetInfo);
          break;
        }
      }
    }
  });
  
  // Pattern 6: Check for Google Sites embed content in the page
  // Google Sites might store embed info in data attributes or hidden inputs
  $('input[type="hidden"], [data-embed-url], [data-file-url]').each((_, elem) => {
    const $elem = $(elem);
    const value = $elem.attr('value') || $elem.attr('data-embed-url') || $elem.attr('data-file-url');
    if (value) {
      const sheetInfo = extractSheetId(value);
      if (sheetInfo) {
        sheets.push(sheetInfo);
      }
    }
  });

  // If no sheets found via standard methods, try extracting from page URL patterns
  // Some Google Sites embed sheets via URL parameters or hash fragments
  if (sheets.length === 0) {
    // Check if the page URL itself contains sheet information
    const urlSheetInfo = extractSheetId(brandPage.url);
    if (urlSheetInfo) {
      sheets.push(urlSheetInfo);
    }
    
    // Check for Google Sites embed patterns in the HTML
    // Look for data attributes that might contain embed information
    $('[data-*]').each((_, elem) => {
      const $elem = $(elem);
      const attrs = $elem.get(0)?.attribs || {};
      for (const [key, value] of Object.entries(attrs)) {
        if (typeof value === 'string' && (value.includes('spreadsheet') || value.includes('docs.google'))) {
          const sheetInfo = extractSheetId(value);
          if (sheetInfo) {
            sheets.push(sheetInfo);
          }
        }
      }
    });
  }

  // If no sheets found, check if Google Sites rendered the sheet as an HTML table
  // Google Sites sometimes embeds sheets as direct HTML tables instead of iframes
  // In this case, we can extract data directly from the HTML tables
  if (sheets.length === 0) {
    const tableCount = $('table').length;
    if (tableCount > 0) {
      console.log(`   🔍 Found ${tableCount} table(s) - Google Sites may have rendered sheet as HTML table`);
      console.log(`   💡 Will attempt to extract data directly from HTML tables`);
      // Return a special marker to indicate we should extract from HTML tables
      // We'll handle this in the main processing loop
      return [{ sheetId: '__HTML_TABLE__', gid: undefined }];
    }
  }

  // Deduplicate sheets
  const uniqueSheets = sheets.filter((sheet, index, self) =>
    index === self.findIndex(s => s.sheetId === sheet.sheetId && s.gid === sheet.gid)
  );

  console.log(`   ✅ Found ${uniqueSheets.length} sheet(s)`);
  if (uniqueSheets.length > 0) {
    uniqueSheets.forEach((sheet, idx) => {
      console.log(`      Sheet ${idx + 1}: ${sheet.sheetId.substring(0, 20)}... (gid: ${sheet.gid || '0'})`);
    });
  } else {
    // Log a sample of the HTML to help debug (only for category pages)
    const sampleHtml = pageContent ? pageContent.substring(0, 1000) : '';
    if (brandPage.name.includes('Ibanez') && brandPage.isCategory && sampleHtml) {
      // Check for common indicators of embedded content
      const hasEmbed = sampleHtml.includes('embed') || sampleHtml.includes('gstatic');
      const hasTable = sampleHtml.includes('<table');
      console.log(`   🔍 Debug: Has embed: ${hasEmbed}, Has table: ${hasTable}`);
      if (hasTable) {
        console.log(`   💡 Google Sites may have rendered the sheet as an HTML table - we may need to extract data directly from tables`);
      }
    }
  }
  
  return uniqueSheets;
  
  } catch (error) {
    console.warn(`   ⚠️  Error using Puppeteer for ${brandPage.name}:`, error instanceof Error ? error.message : String(error));
    
    // Fallback to WebScrapingService
    const content = await scrapingService.extractWebsiteContent(brandPage.url);
    
    if (content.status !== 'success' || !content.content) {
      console.warn(`⚠️  Failed to scrape ${brandPage.name}, skipping...`);
      return [];
    }

    const $ = cheerio.load(content.content);
    
    // Helper function to extract sheet ID from various URL patterns
    const extractSheetId = (url: string): { sheetId: string; gid?: string } | null => {
      let match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
      if (!match) {
        match = url.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
      }
      if (!match) {
        match = url.match(/spreadsheetId=([a-zA-Z0-9-_]{20,})/);
      }
      if (!match) {
        match = url.match(/[?&]id=([a-zA-Z0-9-_]{20,})/);
      }
      if (!match) {
        match = url.match(/[?&]key=([a-zA-Z0-9-_]{20,})/);
      }
      
      if (match && match[1] && match[1].length >= 20) {
        const gidMatch = url.match(/[?&]gid=(\d+)/);
        return {
          sheetId: match[1],
          gid: gidMatch ? gidMatch[1] : undefined,
        };
      }
      return null;
    };
    
    // Check iframes
    $('iframe').each((_, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const sheetInfo = extractSheetId(src);
        if (sheetInfo) {
          sheets.push(sheetInfo);
        }
      }
    });
    
    // Check links
    $('a[href*="spreadsheets"], a[href*="docs.google.com"]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        const sheetInfo = extractSheetId(href);
        if (sheetInfo) {
          sheets.push(sheetInfo);
        }
      }
    });
    
    // Check scripts
    $('script').each((_, elem) => {
      const scriptContent = $(elem).html() || '';
      if (scriptContent.includes('spreadsheets')) {
        const matches = scriptContent.matchAll(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/g);
        for (const match of matches) {
          if (match[1] && match[1].length >= 20 && !sheets.some(s => s.sheetId === match[1])) {
            sheets.push({
              sheetId: match[1],
              gid: undefined,
            });
          }
        }
      }
    });
    
    const uniqueSheets = sheets.filter((sheet, index, self) =>
      index === self.findIndex(s => s.sheetId === sheet.sheetId && s.gid === sheet.gid)
    );
    
    // Check for HTML tables in fallback path too
    if (uniqueSheets.length === 0) {
      const tableCount = $('table').length;
      if (tableCount > 0) {
        console.log(`   🔍 Found ${tableCount} table(s) in fallback - will extract from HTML tables`);
        return [{ sheetId: '__HTML_TABLE__', gid: undefined }];
      }
    }
    
    console.log(`   ✅ Found ${uniqueSheets.length} sheet(s)`);
    return uniqueSheets;
  }
}

/**
 * Extract data directly from HTML tables on the page
 * Google Sites sometimes renders sheets as HTML tables
 */
async function extractDataFromHTMLTables(
  scrapingService: WebScrapingService,
  brandPage: BrandPage
): Promise<Record<string, unknown>[]> {
  const content = await scrapingService.extractWebsiteContent(brandPage.url);
  
  if (content.status !== 'success' || !content.content) {
    return [];
  }

  const $ = cheerio.load(content.content);
  const rows: Record<string, unknown>[] = [];
  
  // Find all tables on the page
  $('table').each((tableIdx, tableElem) => {
    const $table = $(tableElem);
    const tableRows = $table.find('tr');
    
    if (tableRows.length === 0) return;
    
    // First row is usually headers
    const headerRow = tableRows.first();
    const headers: string[] = [];
    headerRow.find('th, td').each((_, cell) => {
      const text = $(cell).text().trim();
      if (text) {
        headers.push(text);
      }
    });
    
    // If no headers in first row, try to infer from second row structure
    if (headers.length === 0 && tableRows.length > 1) {
      const firstDataRow = $(tableRows[1]);
      firstDataRow.find('td').each((idx) => {
        headers.push(`Column_${idx + 1}`);
      });
    }
    
    // Extract data rows
    tableRows.slice(1).each((_, rowElem) => {
      const $row = $(rowElem);
      const rowData: Record<string, unknown> = {};
      let hasData = false;
      
      $row.find('td').each((colIdx, cell) => {
        const text = $(cell).text().trim();
        const header = headers[colIdx] || `Column_${colIdx + 1}`;
        if (text) {
          rowData[header] = text;
          hasData = true;
        }
      });
      
      if (hasData && Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    });
  });
  
  console.log(`   ✅ Extracted ${rows.length} rows from HTML tables`);
  return rows;
}

/**
 * Fetch CSV data from Google Sheets
 */
async function fetchSheetCSV(sheetInfo: SheetInfo): Promise<string> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetInfo.sheetId}/export?format=csv&gid=${sheetInfo.gid || 0}`;
  
  console.log(`   📥 Fetching CSV from sheet ${sheetInfo.sheetId}...`);
  
  try {
    const response = await axios.get(csvUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error(`   ❌ Failed to fetch CSV: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Parse CSV data and return rows
 */
function parseCSV(csvData: string): Record<string, unknown>[] {
  try {
    if (!csvData || csvData.trim().length === 0) {
      throw new Error('CSV data is empty');
    }
    
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true, // Handle BOM if present
    });
    
    if (!Array.isArray(records)) {
      throw new Error('CSV parsing did not return an array');
    }
    
    return records as Record<string, unknown>[];
  } catch (error) {
    console.error(`   ❌ Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Normalize header value for matching
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detect column mappings from headers
 */
function detectColumnMappings(headers: string[]): Map<string, string> {
  const mapping = new Map<string, string>();
  
  headers.forEach(header => {
    const normalized = normalizeHeader(header);
    
    // SKU detection
    if (normalized.includes('sku') || normalized.includes('code') || normalized.includes('itemnumber') || normalized.includes('model')) {
      if (!mapping.has('sku')) {
        mapping.set('sku', header);
      }
    }
    
    // Description/Name
    if (normalized.includes('description') || normalized.includes('name') || normalized.includes('product')) {
      if (!mapping.has('name')) {
        mapping.set('name', header);
      }
    }
    
    // Brand
    if (normalized.includes('brand')) {
      if (!mapping.has('brand')) {
        mapping.set('brand', header);
      }
    }
    
    // Cost Excluding
    if (normalized.includes('costexcluding') || normalized.includes('costexvat') || normalized.includes('priceex') || normalized.includes('exclusive')) {
      if (!mapping.has('cost_excluding')) {
        mapping.set('cost_excluding', header);
      }
    }
    
    // Cost Including
    if (normalized.includes('costincluding') || normalized.includes('costincvat') || normalized.includes('priceinc') || normalized.includes('inclusive')) {
      if (!mapping.has('cost_including')) {
        mapping.set('cost_including', header);
      }
    }
    
    // RSP
    if (normalized.includes('rsp') || normalized.includes('rrp') || normalized.includes('recommendedretail') || normalized.includes('recommendedselling')) {
      if (!mapping.has('rsp')) {
        mapping.set('rsp', header);
      }
    }
    
    // UOM
    if (normalized.includes('uom') || normalized.includes('unit') || normalized.includes('measure')) {
      if (!mapping.has('uom')) {
        mapping.set('uom', header);
      }
    }
    
    // Pack Size
    if (normalized.includes('pack') || normalized.includes('quantity') || normalized.includes('qty')) {
      if (!mapping.has('pack_size')) {
        mapping.set('pack_size', header);
      }
    }
    
    // Category
    if (normalized.includes('category')) {
      if (!mapping.has('category')) {
        mapping.set('category', header);
      }
    }
  });
  
  // Fallbacks
  if (!mapping.has('sku') && headers.length > 0) {
    mapping.set('sku', headers[0]);
  }
  if (!mapping.has('name') && headers.length > 1) {
    mapping.set('name', headers[1]);
  }
  
  return mapping;
}

/**
 * Parse number value, handling currency symbols and commas
 */
function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }
  
  const str = String(value)
    .replace(/[R$€£,\s]/g, '')
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

/**
 * Sanitize text value
 */
function sanitizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Transform CSV row to PricelistRow format
 */
function transformRowToPricelistRow(
  row: Record<string, unknown>,
  brandName: string,
  uploadId: string,
  rowNum: number,
  columnMapping: Map<string, string>,
  categoryName?: string
): PricelistRow | null {
  // Extract SKU
  const skuHeader = columnMapping.get('sku');
  const sku = skuHeader ? sanitizeText(row[skuHeader]) : '';
  
  if (!sku) {
    return null; // Skip rows without SKU
  }
  
  // Extract name
  const nameHeader = columnMapping.get('name');
  const name = nameHeader ? sanitizeText(row[nameHeader]) : sku;
  
  // Extract brand (prefer from sheet, fallback to page brand)
  const brandHeader = columnMapping.get('brand');
  const brand = brandHeader ? sanitizeText(row[brandHeader]) : brandName;
  
  // Extract prices
  const costExcludingHeader = columnMapping.get('cost_excluding');
  const costIncludingHeader = columnMapping.get('cost_including');
  
  let costExcluding = costExcludingHeader ? parseNumber(row[costExcludingHeader]) : undefined;
  let costIncluding = costIncludingHeader ? parseNumber(row[costIncludingHeader]) : undefined;
  
  // Calculate missing price if one is present
  if (costExcluding !== undefined && costIncluding === undefined) {
    costIncluding = costExcluding * (1 + VAT_RATE);
  } else if (costIncluding !== undefined && costExcluding === undefined) {
    costExcluding = costIncluding / (1 + VAT_RATE);
  }
  
  // Need at least one price
  if (costExcluding === undefined && costIncluding === undefined) {
    return null; // Skip rows without price
  }
  
  // Use cost_excluding as primary price, fallback to cost_including
  const price = costExcluding !== undefined ? costExcluding : costIncluding!;
  
  // Extract RSP
  const rspHeader = columnMapping.get('rsp');
  const rsp = rspHeader ? parseNumber(row[rspHeader]) : undefined;
  
  // Extract UOM
  const uomHeader = columnMapping.get('uom');
  const uom = uomHeader ? sanitizeText(row[uomHeader]) : 'each';
  
  // Extract pack size
  const packSizeHeader = columnMapping.get('pack_size');
  const packSize = packSizeHeader ? sanitizeText(row[packSizeHeader]) : undefined;
  
  // Extract category
  const categoryHeader = columnMapping.get('category');
  const category = categoryHeader ? sanitizeText(row[categoryHeader]) : undefined;
  
  // Build attrs_json with all extracted data
  const attrs: Record<string, unknown> = {
    brand_page: brandName,
  };
  
  // Add category if provided (from category submodule)
  if (categoryName) {
    attrs.category_submodule = categoryName;
  }
  
  if (costExcluding !== undefined) {
    attrs.cost_excluding = costExcluding;
  }
  if (costIncluding !== undefined) {
    attrs.cost_including = costIncluding;
  }
  if (rsp !== undefined) {
    attrs.rsp = rsp;
  }
  
  // Store all other columns in attrs_json
  Object.keys(row).forEach(key => {
    if (!columnMapping.has(key) && row[key] !== null && row[key] !== undefined && row[key] !== '') {
      attrs[key] = row[key];
    }
  });
  
  return {
    upload_id: uploadId,
    row_num: rowNum,
    supplier_sku: sku,
    name,
    brand: brand || undefined,
    uom,
    pack_size: packSize,
    price,
    currency: 'ZAR',
    category_raw: category,
    barcode: undefined,
    attrs_json: attrs,
  };
}

/**
 * Main import function
 */
async function importPlanetworldProducts() {
  console.log('🚀 Starting Planetworld product import...\n');

  const scrapingService = new WebScrapingService();

  try {
    // Initialize browser for dynamic content
    await scrapingService.initializeBrowser();

    // Step 1: Find supplier
    console.log(`🔍 Looking for supplier (trying: ${SUPPLIER_NAMES.join(', ')})...`);
    const supplier = await findSupplier(SUPPLIER_NAMES);

    if (!supplier) {
      throw new Error(`None of the suppliers (${SUPPLIER_NAMES.join(', ')}) found in database. Please create one first.`);
    }

    console.log(`✅ Found supplier: ${supplier.name} (ID: ${supplier.supplierId})\n`);
    const supplierId = supplier.supplierId;

    // Step 2: Discover brand pages
    console.log('📋 Discovering brand pages...');
    const brandPages = await discoverBrandPages(scrapingService);

    if (brandPages.length === 0) {
      throw new Error('No brand pages found on the main site');
    }

    // Step 3: Create pricelist upload
    console.log('\n📝 Creating pricelist upload record...');
    const upload = await pricelistService.createUpload({
      supplier_id: supplierId,
      filename: `planetworld-import-${new Date().toISOString()}.csv`,
      currency: 'ZAR',
      valid_from: new Date(),
    });

    console.log(`✅ Created upload with ID: ${upload.upload_id}\n`);

    // Step 4: Extract and process all brand sheets
    console.log('📥 Extracting products from brand pages...\n');
    const allPricelistRows: PricelistRow[] = [];
    let rowNum = 1;

    for (const brandPage of brandPages) {
      try {
        // Determine display name and category
        const displayName = brandPage.isCategory && brandPage.parentBrand 
          ? `${brandPage.parentBrand} - ${brandPage.name}` 
          : brandPage.name;
        const brandName = brandPage.parentBrand || brandPage.name;
        const categoryName = brandPage.isCategory ? brandPage.name : undefined;
        
        console.log(`\n📄 Processing: ${displayName}${categoryName ? ` (Category: ${categoryName})` : ''}`);
        
        // Extract sheet IDs from brand/category page
        const sheets = await extractSheetIds(scrapingService, brandPage);

        if (sheets.length === 0) {
          console.warn(`⚠️  No sheets found for ${displayName}, skipping...\n`);
          continue;
        }

        // Process each sheet
        for (const sheet of sheets) {
          try {
            let rows: Record<string, unknown>[] = [];
            
            // Check if this is an HTML table extraction (special marker)
            if (sheet.sheetId === '__HTML_TABLE__') {
              console.log(`   📊 Extracting data from HTML tables on page...`);
              rows = await extractDataFromHTMLTables(scrapingService, brandPage);
            } else {
              // Fetch CSV data from Google Sheets
              const csvData = await fetchSheetCSV(sheet);
              
              // Parse CSV
              rows = parseCSV(csvData);
            }
            
            if (rows.length === 0) {
              console.warn(`   ⚠️  No data rows found in sheet ${sheet.sheetId}`);
              continue;
            }

            // Detect column mappings from first row headers
            const headers = Object.keys(rows[0] || {});
            if (headers.length === 0) {
              console.warn(`   ⚠️  No headers found in sheet ${sheet.sheetId}`);
              continue;
            }
            
            const columnMapping = detectColumnMappings(headers);

            console.log(`   📊 Processing ${rows.length} rows...`);
            console.log(`   🔍 Column mappings: ${Array.from(columnMapping.entries()).map(([k, v]) => `${k}="${v}"`).join(', ')}`);

            // Transform rows to PricelistRow format
            let validRows = 0;
            let skippedRows = 0;
            
            for (const row of rows) {
              try {
                const pricelistRow = transformRowToPricelistRow(
                  row,
                  brandName,
                  upload.upload_id,
                  rowNum,
                  columnMapping,
                  categoryName
                );

                if (pricelistRow) {
                  allPricelistRows.push(pricelistRow);
                  rowNum++;
                  validRows++;
                } else {
                  skippedRows++;
                }
              } catch (rowError) {
                console.warn(`   ⚠️  Error transforming row ${rowNum}: ${rowError instanceof Error ? rowError.message : String(rowError)}`);
                skippedRows++;
                // Continue with next row
              }
            }

            console.log(`   ✅ Processed ${rows.length} rows (${validRows} valid, ${skippedRows} skipped) from ${displayName}\n`);

            // Rate limiting between sheets
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
          } catch (error) {
            console.error(`   ❌ Error processing sheet ${sheet.sheetId} for ${displayName}:`, error instanceof Error ? error.message : String(error));
            // Continue with next sheet
          }
        }

        // Rate limiting between brand/category pages
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      } catch (error) {
        console.error(`❌ Error processing ${brandPage.name}:`, error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.error(`   Stack: ${error.stack}`);
        }
        // Continue with next page
      }
    }

    console.log(`\n✅ Extracted ${allPricelistRows.length} products total\n`);

    if (allPricelistRows.length === 0) {
      throw new Error('No products extracted from any brand pages');
    }

    // Step 5: Insert rows into database
    console.log('💾 Inserting products into database...');
    const insertedCount = await pricelistService.insertRows(upload.upload_id, allPricelistRows);
    console.log(`✅ Inserted ${insertedCount} rows\n`);

    // Step 6: Validate upload
    console.log('✔️  Validating upload...');
    const validationResult = await pricelistService.validateUpload(upload.upload_id);
    console.log(`✅ Validation complete:`);
    console.log(`   Status: ${validationResult.status}`);
    console.log(`   Total rows: ${validationResult.total_rows}`);
    console.log(`   Valid rows: ${validationResult.valid_rows}`);
    console.log(`   Invalid rows: ${validationResult.invalid_rows}`);
    console.log(`   New products: ${validationResult.summary.new_products}`);
    console.log(`   Updated prices: ${validationResult.summary.updated_prices}\n`);

    if (validationResult.status === 'invalid' && validationResult.errors.length > 0) {
      console.log('⚠️  Validation errors found:');
      validationResult.errors.slice(0, 10).forEach(error => {
        console.log(`   Row ${error.row_num}: ${error.message}`);
      });
      if (validationResult.errors.length > 10) {
        console.log(`   ... and ${validationResult.errors.length - 10} more errors`);
      }
      console.log('');
    }

    // Step 7: Merge pricelist into core schema
    if (validationResult.status === 'valid' || validationResult.status === 'validated' || validationResult.status === 'warning') {
      console.log('🔄 Merging pricelist into core schema (SIP staging -> core)...');
      const mergeResult = await pricelistService.mergePricelist(upload.upload_id, {
        skipInvalidRows: validationResult.status === 'warning',
      });

      console.log(`✅ Merge complete:`);
      console.log(`   Products created: ${mergeResult.products_created}`);
      console.log(`   Products updated: ${mergeResult.products_updated}`);
      console.log(`   Prices updated: ${mergeResult.prices_updated}`);
      console.log(`   Duration: ${mergeResult.duration_ms}ms\n`);

      if (mergeResult.errors.length > 0) {
        console.log('⚠️  Merge errors:');
        mergeResult.errors.forEach(error => {
          console.log(`   ${error}`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  Skipping merge due to validation errors\n');
    }

    console.log('✅ Import completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Upload ID: ${upload.upload_id}`);
    console.log(`   Brand pages processed: ${brandPages.length}`);
    console.log(`   Products imported: ${allPricelistRows.length}`);
    console.log(`   Validation status: ${validationResult.status}`);
  } catch (error) {
    console.error('❌ Import failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup
    await scrapingService.cleanup();
  }
}

// Run the import
importPlanetworldProducts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

