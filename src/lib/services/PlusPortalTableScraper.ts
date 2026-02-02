/**
 * PlusPortal Table Scraper
 * Scrapes product data from the Shopping > All Products tab
 */

import type { Page } from 'puppeteer-core';

export interface ScrapedProduct {
  productCode: string;        // Product Code column
  description: string;        // Description column
  availability: string;       // Availability (e.g., "New Special Order", "In Stock")
  priceBeforeDiscount: number; // Price Before Discount (Ex VAT)
  discountPercent: number;    // Discount % (e.g., 20)
  priceAfterDiscount: number; // Price After Discount (our cost Ex VAT)
  imageUrl?: string;          // Product image URL if available
}

export interface ScrapeResult {
  success: boolean;
  products: ScrapedProduct[];
  totalPages: number;
  totalProducts: number;
  errors: string[];
}

/**
 * Parse South African Rand currency string to number
 * Examples: "R 92,000.00" -> 92000, "R92000" -> 92000, "92 000,00" -> 92000
 */
export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  
  // Remove currency symbol, spaces, and handle both comma and period decimals
  let cleaned = value
    .replace(/^R\s*/i, '')  // Remove "R " prefix
    .replace(/\s/g, '')      // Remove all spaces
    .trim();
  
  // Handle European format (1.234,56) vs US format (1,234.56)
  // If there's a comma after a period, it's European format
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');
    
    if (lastComma > lastPeriod) {
      // European format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Could be thousand separator (1,234) or decimal (1,23)
    // If comma is followed by exactly 2 digits at end, treat as decimal
    if (/,\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse discount percentage string to number
 * Examples: "20 %" -> 20, "20%" -> 20, "15.5 %" -> 15.5
 */
export function parseDiscountPercent(value: string | null | undefined): number {
  if (!value) return 0;
  
  const cleaned = value
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize availability status to standard format
 */
export function normalizeAvailability(value: string | null | undefined): string {
  if (!value) return 'unknown';
  
  const normalized = value.toLowerCase().trim();
  
  // Map common statuses
  if (normalized.includes('special order') || normalized.includes('specialorder')) {
    return 'special_order';
  }
  if (normalized.includes('in stock') || normalized === 'instock' || normalized === 'available') {
    return 'instock';
  }
  if (normalized.includes('out of stock') || normalized === 'outofstock' || normalized === 'oos') {
    return 'outofstock';
  }
  if (normalized.includes('back order') || normalized.includes('backorder')) {
    return 'backorder';
  }
  if (normalized.includes('discontinued')) {
    return 'discontinued';
  }
  if (normalized.includes('low stock') || normalized.includes('limited')) {
    return 'low_stock';
  }
  
  // Return original if no match (will be stored as-is)
  return value.trim();
}

export class PlusPortalTableScraper {
  private page: Page;
  private progressCallback: ((stage: string, percent: number) => Promise<void>) | undefined;

  constructor(page: Page, progressCallback?: (stage: string, percent: number) => Promise<void>) {
    this.page = page;
    this.progressCallback = progressCallback;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update progress if callback is provided
   */
  private async updateProgress(stage: string, percent: number): Promise<void> {
    if (this.progressCallback) {
      await this.progressCallback(stage, percent);
    }
  }

  /**
   * Navigate to Shopping tab and select All Products
   */
  async navigateToShoppingTab(): Promise<boolean> {
    try {
      console.log('[PlusPortal Scraper] Looking for Shopping tab...');
      await this.updateProgress('Looking for Shopping tab...', 25);
      
      // Wait for page to be ready
      await this.delay(2000);
      
      // Log available navigation elements for debugging
      const navElements = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, .ant-menu-item, nz-menu-item, [routerlink], span, div'));
        return elements.slice(0, 50).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 50),
          href: el.getAttribute('href'),
          routerLink: el.getAttribute('routerlink'),
          className: el.className?.slice(0, 50),
        }));
      });
      console.log('[PlusPortal Scraper] Available nav elements:', JSON.stringify(navElements.slice(0, 20), null, 2));
      
      // Click on Shopping menu item
      const shoppingClicked = await this.page.evaluate(() => {
        // Try various selectors for "Shopping" link
        const selectors = [
          'a', 'span', 'div', '.ant-menu-item', 'nz-menu-item',
          '[routerlink]', 'li', 'button'
        ];
        
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const el of elements) {
            const text = el.textContent?.trim().toLowerCase() || '';
            if (text === 'shopping' || text.startsWith('shopping')) {
              (el as HTMLElement).click();
              return { found: true, text: el.textContent?.trim(), selector };
            }
          }
        }
        return { found: false };
      });
      
      if (shoppingClicked.found) {
        console.log(`[PlusPortal Scraper] Clicked Shopping tab: "${shoppingClicked.text}"`);
        await this.delay(3000);
      } else {
        console.log('[PlusPortal Scraper] Shopping tab not found via click, checking current page...');
        // Check if we're already on the shopping page
        const currentUrl = this.page.url();
        if (!currentUrl.includes('shopping')) {
          console.log('[PlusPortal Scraper] Not on shopping page, URL:', currentUrl);
        }
      }
      
      // Now click on "All Products" submenu
      await this.updateProgress('Selecting All Products...', 28);
      
      const allProductsClicked = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, span, div, .ant-menu-item, li'));
        for (const el of elements) {
          const text = el.textContent?.trim().toLowerCase() || '';
          if (text === 'all products' || text === 'allproducts') {
            (el as HTMLElement).click();
            return { found: true, text: el.textContent?.trim() };
          }
        }
        return { found: false };
      });
      
      if (allProductsClicked.found) {
        console.log(`[PlusPortal Scraper] Clicked All Products: "${allProductsClicked.text}"`);
      } else {
        console.log('[PlusPortal Scraper] All Products submenu not found, may already be selected');
      }
      
      // Wait for table to load
      await this.delay(5000);
      await this.updateProgress('Waiting for product table...', 30);
      
      // Wait for table element
      try {
        await this.page.waitForSelector('table, .ant-table, nz-table, [class*="table"]', { 
          timeout: 30000 
        });
        console.log('[PlusPortal Scraper] Product table found');
        return true;
      } catch (error) {
        console.error('[PlusPortal Scraper] Table not found:', error);
        return false;
      }
    } catch (error) {
      console.error('[PlusPortal Scraper] Navigation error:', error);
      return false;
    }
  }

  /**
   * Scrape all products from the current page
   */
  async scrapeCurrentPage(): Promise<ScrapedProduct[]> {
    try {
      // Wait for table data to be present
      await this.delay(2000);
      
      const products = await this.page.evaluate(() => {
        const results: Array<{
          productCode: string;
          description: string;
          availability: string;
          priceBeforeDiscount: string;
          discountPercent: string;
          priceAfterDiscount: string;
          imageUrl?: string;
        }> = [];
        
        // Try to find table rows
        const rows = Array.from(document.querySelectorAll('table tbody tr, .ant-table-tbody tr, nz-table tbody tr, tr'));
        
        console.log(`[Scraper] Found ${rows.length} rows`);
        
        for (const row of rows) {
          // Skip header rows
          if (row.querySelector('th')) continue;
          
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells.length < 6) continue; // Need at least: Image, Code, Description, Availability, ..., Prices
          
          // Based on the screenshot column order:
          // Image | Product Code | Description | Availability | Ordered Qty | Price Before Discount | Discount | Price After Discount | Line Total
          
          // Get image URL from first cell
          const imageCell = cells[0];
          const img = imageCell?.querySelector('img');
          const imageUrl = img?.getAttribute('src') || img?.getAttribute('data-src') || undefined;
          
          // Get Product Code (usually 2nd column)
          const productCode = cells[1]?.textContent?.trim() || '';
          
          // Get Description (usually 3rd column)
          const description = cells[2]?.textContent?.trim() || '';
          
          // Get Availability (usually 4th column)
          const availability = cells[3]?.textContent?.trim() || '';
          
          // Skip ordered qty column (5th) - it's an input field
          
          // Get Price Before Discount (usually 6th column)
          const priceBeforeDiscount = cells[5]?.textContent?.trim() || '';
          
          // Get Discount % (usually 7th column)
          const discountPercent = cells[6]?.textContent?.trim() || '';
          
          // Get Price After Discount (usually 8th column)
          const priceAfterDiscount = cells[7]?.textContent?.trim() || '';
          
          // Only add if we have a product code
          if (productCode && productCode !== '' && !productCode.toLowerCase().includes('total')) {
            results.push({
              productCode,
              description,
              availability,
              priceBeforeDiscount,
              discountPercent,
              priceAfterDiscount,
              imageUrl: imageUrl || '', // Ensure string, not undefined
            });
          }
        }
        
        return results;
      });
      
      console.log(`[PlusPortal Scraper] Scraped ${products.length} products from current page`);
      
      // Parse the raw string values to proper types
      return products.map((p): ScrapedProduct => {
        const result: ScrapedProduct = {
          productCode: p.productCode,
          description: p.description,
          availability: normalizeAvailability(p.availability),
          priceBeforeDiscount: parseCurrency(p.priceBeforeDiscount),
          discountPercent: parseDiscountPercent(p.discountPercent),
          priceAfterDiscount: parseCurrency(p.priceAfterDiscount),
        };
        // Only add imageUrl if it has a value (not empty string)
        if (p.imageUrl && p.imageUrl.trim() !== '') {
          result.imageUrl = p.imageUrl;
        }
        return result;
      });
    } catch (error) {
      console.error('[PlusPortal Scraper] Error scraping current page:', error);
      return [];
    }
  }

  /**
   * Get total number of pages from pagination
   */
  async getTotalPages(): Promise<number> {
    try {
      const totalPages = await this.page.evaluate(() => {
        // Try different pagination selectors
        // NG-ZORRO pagination typically has page numbers or "of X" text
        
        // Look for "of X" pattern in pagination
        const paginationText = document.body.innerText;
        const ofMatch = paginationText.match(/of\s+(\d+)/i);
        if (ofMatch) {
          return parseInt(ofMatch[1], 10);
        }
        
        // Look for page number buttons
        const pageButtons = Array.from(document.querySelectorAll(
          '.ant-pagination-item, nz-pagination-item, [class*="pagination"] a, [class*="pagination"] button, [class*="pagination"] li'
        ));
        
        let maxPage = 1;
        for (const btn of pageButtons) {
          const text = btn.textContent?.trim() || '';
          const pageNum = parseInt(text, 10);
          if (!isNaN(pageNum) && pageNum > maxPage) {
            maxPage = pageNum;
          }
        }
        
        return maxPage;
      });
      
      console.log(`[PlusPortal Scraper] Total pages detected: ${totalPages}`);
      return totalPages || 1;
    } catch (error) {
      console.error('[PlusPortal Scraper] Error getting total pages:', error);
      return 1;
    }
  }

  /**
   * Click next page button and wait for table to update
   * Returns false if no next page available
   */
  async clickNextPage(): Promise<boolean> {
    try {
      const hasNextPage = await this.page.evaluate(() => {
        // Try different selectors for next page button
        const selectors = [
          '.ant-pagination-next:not(.ant-pagination-disabled)',
          'nz-pagination-next:not([disabled])',
          '[class*="pagination"] [class*="next"]:not([disabled])',
          'li.ant-pagination-next:not(.ant-pagination-disabled) button',
          'button[aria-label="Next page"]:not([disabled])',
          '[class*="next-page"]:not([disabled])',
        ];
        
        for (const selector of selectors) {
          const nextBtn = document.querySelector(selector);
          if (nextBtn && !(nextBtn as HTMLButtonElement).disabled) {
            (nextBtn as HTMLElement).click();
            return true;
          }
        }
        
        // Fallback: look for ">" or "Next" text
        const buttons = Array.from(document.querySelectorAll('button, a, span'));
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          if ((text === '>' || text === '›' || text.toLowerCase() === 'next' || ariaLabel.toLowerCase().includes('next')) 
              && !(btn as HTMLButtonElement).disabled
              && !btn.classList.contains('disabled')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        
        return false;
      });
      
      if (hasNextPage) {
        // Wait for table to update
        await this.delay(3000);
        
        // Wait for any loading indicators to disappear
        try {
          await this.page.waitForFunction(() => {
            const loading = document.querySelector('.ant-spin-spinning, .ant-table-loading, [class*="loading"]');
            return !loading;
          }, { timeout: 10000 });
        } catch {
          // Ignore timeout, proceed anyway
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PlusPortal Scraper] Error clicking next page:', error);
      return false;
    }
  }

  /**
   * Scrape all pages and aggregate results
   */
  async scrapeAllPages(): Promise<ScrapeResult> {
    const allProducts: ScrapedProduct[] = [];
    const errors: string[] = [];
    let pageNum = 1;
    let totalPages = 1;
    
    try {
      // Navigate to Shopping > All Products first
      const navigated = await this.navigateToShoppingTab();
      if (!navigated) {
        errors.push('Failed to navigate to Shopping > All Products tab');
        return { success: false, products: [], totalPages: 0, totalProducts: 0, errors };
      }
      
      // Get total pages
      totalPages = await this.getTotalPages();
      console.log(`[PlusPortal Scraper] Starting scrape of ${totalPages} pages`);
      
      // Scrape each page
      let hasMorePages = true;
      while (hasMorePages) {
        const progressPercent = 30 + Math.floor((pageNum / totalPages) * 50); // 30-80%
        await this.updateProgress(`Scraping page ${pageNum} of ${totalPages}...`, progressPercent);
        
        console.log(`[PlusPortal Scraper] Scraping page ${pageNum}/${totalPages}...`);
        
        const pageProducts = await this.scrapeCurrentPage();
        allProducts.push(...pageProducts);
        
        console.log(`[PlusPortal Scraper] Page ${pageNum}: ${pageProducts.length} products (total: ${allProducts.length})`);
        
        // Check if there's a next page
        if (pageNum < totalPages) {
          hasMorePages = await this.clickNextPage();
          pageNum++;
        } else {
          hasMorePages = false;
        }
        
        // Safety limit to prevent infinite loops
        if (pageNum > 500) {
          errors.push('Safety limit reached: stopped at 500 pages');
          break;
        }
      }
      
      await this.updateProgress('Scraping complete', 80);
      
      console.log(`[PlusPortal Scraper] Scrape complete: ${allProducts.length} total products from ${pageNum} pages`);
      
      return {
        success: true,
        products: allProducts,
        totalPages: pageNum,
        totalProducts: allProducts.length,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during scraping';
      errors.push(errorMessage);
      console.error('[PlusPortal Scraper] Scrape error:', error);
      
      return {
        success: allProducts.length > 0, // Partial success if we got some products
        products: allProducts,
        totalPages: pageNum,
        totalProducts: allProducts.length,
        errors,
      };
    }
  }
}

/**
 * Factory function to create scraper instance
 */
export function createPlusPortalTableScraper(
  page: Page, 
  progressCallback?: (stage: string, percent: number) => Promise<void>
): PlusPortalTableScraper {
  return new PlusPortalTableScraper(page, progressCallback);
}
