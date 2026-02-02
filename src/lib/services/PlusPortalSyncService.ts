/**
 * PlusPortal Sync Service
 * Automated browser-based extraction and sync from PlusPortal
 * 
 * Updated: Scrapes data from Shopping > All Products tab instead of CSV download from SOH Info
 */

import { query } from '@/lib/database';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import { createPlusPortalTableScraper, type ScrapedProduct, type ScrapeResult } from './PlusPortalTableScraper';

const PLUSPORTAL_BASE_URL = 'https://my.plusportal.africa';
const PLUSPORTAL_LOGIN_URL = `${PLUSPORTAL_BASE_URL}/apps/authentication/external-login`;

// Check if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;

// Dynamic import for chromium (only needed in serverless)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromium: any = null;
async function getChromium() {
  if (!chromium && isServerless) {
    chromium = (await import('@sparticuz/chromium')).default;
  }
  return chromium;
}

export interface PlusPortalCredentials {
  username: string;
  password: string;
}

export interface PlusPortalSyncResult {
  success: boolean;
  logId?: string;
  dataScraped: boolean;
  scrapedProducts?: ScrapedProduct[];
  totalPages?: number;
  productsProcessed: number;
  productsCreated: number;
  productsSkipped: number;
  productsUpdated: number;
  discountRulesCreated: number;
  discountRulesUpdated: number;
  errors: string[];
}

// Re-export ScrapedProduct for use by API and processor
export type { ScrapedProduct, ScrapeResult } from './PlusPortalTableScraper';

export interface PlusPortalSyncConfig {
  supplierId: string;
  username: string;
  password: string | null;
  enabled: boolean;
  intervalMinutes: number;
}

export class PlusPortalSyncService {
  private supplierId: string;
  private browser: Browser | null = null;
  private downloadPath: string;

  constructor(supplierId: string) {
    this.supplierId = supplierId;
    // Create temporary download directory
    try {
      this.downloadPath = path.join(os.tmpdir(), `plusportal-downloads-${Date.now()}`);
      if (!fs.existsSync(this.downloadPath)) {
        fs.mkdirSync(this.downloadPath, { recursive: true });
      }
    } catch (error) {
      console.error('[PlusPortal] Failed to create download directory:', error);
      // Fallback to a simple path - will be created when needed
      this.downloadPath = path.join(os.tmpdir(), `plusportal-downloads-${Date.now()}`);
    }
  }

  /**
   * Delay helper (replacement for deprecated page.waitForTimeout)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize browser instance
   * Uses @sparticuz/chromium for serverless environments (Vercel, AWS Lambda)
   * Falls back to system Chrome for local development
   */
  private async initializeBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    // Minimal launch args for stability
    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ];

    if (isServerless) {
      // Serverless environment - use @sparticuz/chromium
      console.log('[PlusPortal] Running in serverless mode, using @sparticuz/chromium');
      
      const chromiumModule = await getChromium();
      if (!chromiumModule) {
        throw new Error('Failed to load @sparticuz/chromium in serverless mode');
      }
      
      // Set font configuration for serverless
      chromiumModule.setHeadlessMode = 'shell';
      chromiumModule.setGraphicsMode = false;
      
      const executablePath = await chromiumModule.executablePath();
      console.log('[PlusPortal] Chromium executable path:', executablePath);
      
      this.browser = await puppeteer.launch({
        args: [...chromiumModule.args, ...launchArgs],
        defaultViewport: chromiumModule.defaultViewport,
        executablePath,
        headless: true,
      });
    } else {
      // Local development - try to find system Chrome
      console.log('[PlusPortal] Running in local mode, looking for system Chrome');
      
      // Common Chrome paths
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ];
      
      let executablePath: string | undefined;
      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          executablePath = chromePath;
          break;
        }
      }
      
      if (!executablePath) {
        throw new Error('Chrome not found. Please install Chrome or set CHROME_PATH environment variable.');
      }
      
      console.log('[PlusPortal] Using Chrome at:', executablePath);
      
      // Check for debug mode via environment variable
      const debugMode = process.env.PLUSPORTAL_DEBUG === 'true';
      
      this.browser = await puppeteer.launch({
        headless: !debugMode, // Run with visible browser if debugging
        executablePath,
        args: launchArgs,
        // Increase timeout to help with slow pages
        protocolTimeout: 60000,
      });
      
      if (debugMode) {
        console.log('[PlusPortal] Running in DEBUG mode - browser is visible');
      }
    }

    return this.browser;
  }

  /**
   * Cleanup browser instance
   */
  private async cleanupBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Login to PlusPortal
   * Process Steps:
   * 1. OPEN URL: https://my.plusportal.africa/apps/authentication/external-login
   * 2. LOGIN EMAIL
   * 3. PASSWORD
   * 4. CHECK BOX: Accept terms and conditions
   * 5. CLICK: SIGN IN
   */
  private async login(page: Page, credentials: PlusPortalCredentials): Promise<boolean> {
    try {
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log('[PlusPortal] Step 1: Opening login URL...');
      await page.goto(PLUSPORTAL_LOGIN_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      console.log('[PlusPortal] Page loaded, current URL:', page.url());

      // Wait for login form to be visible
      await page.waitForSelector('input[type="email"], input[type="text"], input[type="password"]', {
        timeout: 15000,
      });
      console.log('[PlusPortal] Login form found');

      await this.delay(2000);

      // Log all input fields found
      const inputInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
        }));
      });
      console.log('[PlusPortal] Found inputs:', JSON.stringify(inputInfo, null, 2));

      // Step 2: Fill email field
      console.log('[PlusPortal] Step 2: Filling email field...');
      const emailInput = await page.$('input[type="email"], input[type="text"]');
      if (!emailInput) {
        throw new Error('Email input field not found');
      }
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(credentials.username, { delay: 30 });
      console.log('[PlusPortal] Email entered');

      await this.delay(500);

      // Step 3: Fill password field
      console.log('[PlusPortal] Step 3: Filling password field...');
      const passwordInput = await page.$('input[type="password"]');
      if (!passwordInput) {
        throw new Error('Password input field not found');
      }
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(credentials.password, { delay: 30 });
      console.log('[PlusPortal] Password entered');

      await this.delay(500);

      // Step 4: Check terms checkbox
      console.log('[PlusPortal] Step 4: Looking for terms checkbox...');
      const checkboxInfo = await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        return checkboxes.map(cb => ({
          id: cb.id,
          name: cb.name,
          checked: cb.checked,
          parentText: cb.parentElement?.textContent?.trim().slice(0, 100),
        }));
      });
      console.log('[PlusPortal] Found checkboxes:', JSON.stringify(checkboxInfo, null, 2));

      // Click the checkbox
      const checkboxClicked = await page.evaluate(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        for (const checkbox of checkboxes) {
          if (!(checkbox as HTMLInputElement).checked) {
            (checkbox as HTMLInputElement).click();
            return { clicked: true, id: checkbox.id };
          }
        }
        return { clicked: false, reason: 'No unchecked checkbox found or already checked' };
      });
      console.log('[PlusPortal] Checkbox click result:', JSON.stringify(checkboxClicked));

      await this.delay(1000);

      // Step 5: Click Sign In button
      console.log('[PlusPortal] Step 5: Looking for Sign In button...');
      const buttonInfo = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        return buttons.map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.getAttribute('type'),
          id: btn.id,
          className: btn.className,
        }));
      });
      console.log('[PlusPortal] Found buttons:', JSON.stringify(buttonInfo, null, 2));

      // Click the Sign In button
      const buttonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        for (const btn of buttons) {
          const text = (btn.textContent || (btn as HTMLInputElement).value || '').toLowerCase().trim();
          if (text === 'sign in' || text.includes('sign in')) {
            (btn as HTMLElement).click();
            return { clicked: true, text: btn.textContent?.trim() };
          }
        }
        // Try finding by submit type
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          (submitBtn as HTMLElement).click();
          return { clicked: true, text: 'submit button', type: 'submit' };
        }
        return { clicked: false, reason: 'No sign in button found' };
      });
      console.log('[PlusPortal] Button click result:', JSON.stringify(buttonClicked));

      if (!buttonClicked.clicked) {
        // Take screenshot for debugging
        const screenshotPath = path.join(this.downloadPath, 'login-debug.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('[PlusPortal] Debug screenshot saved:', screenshotPath);
        throw new Error('Sign in button not found or could not be clicked');
      }

      // After clicking sign in, wait for navigation to complete
      // Use Promise.race to handle both navigation and timeout cases
      console.log('[PlusPortal] Waiting for login navigation...');
      try {
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }),
          this.delay(15000),
        ]);
      } catch (waitError) {
        console.log('[PlusPortal] Navigation wait completed/timed out:', waitError);
      }
      
      // Wait a bit more for Angular to initialize
      await this.delay(3000);
      
      console.log('[PlusPortal] Login step completed');
      return true;
    } catch (error) {
      console.error('[PlusPortal] Login error:', error);
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape product data from Shopping > All Products tab
   * This replaces the old CSV download from SOH INFO tab
   */
  private async scrapeShoppingData(page: Page, logId: string): Promise<ScrapeResult> {
    try {
      console.log('[PlusPortal] Starting Shopping tab scrape...');
      
      // Create progress callback to update sync log
      const progressCallback = async (stage: string, percent: number) => {
        await this.updateSyncLog(logId, {
          currentStage: stage,
          progressPercent: percent,
        });
      };
      
      // Create table scraper instance
      const scraper = createPlusPortalTableScraper(page, progressCallback);
      
      // Scrape all pages
      const result = await scraper.scrapeAllPages();
      
      console.log(`[PlusPortal] Scrape completed: ${result.products.length} products from ${result.totalPages} pages`);
      
      return result;
    } catch (error) {
      console.error('[PlusPortal] Scrape error:', error);
      throw new Error(`Failed to scrape Shopping data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create sync log entry
   */
  private async createSyncLog(): Promise<string> {
    const result = await query<{ log_id: string }>(
      `INSERT INTO core.plusportal_sync_log (
        supplier_id, status, sync_started_at
      ) VALUES ($1, 'in_progress', NOW())
      RETURNING log_id`,
      [this.supplierId]
    );

    return result.rows[0].log_id;
  }

  /**
   * Update sync log
   */
  private async updateSyncLog(
    logId: string,
    updates: {
      status?: string;
      csvDownloaded?: boolean;
      productsProcessed?: number;
      productsCreated?: number;
      productsSkipped?: number;
      productsUpdated?: number;
      errors?: string[];
      currentStage?: string;
      progressPercent?: number;
    }
  ): Promise<void> {
    const updatesList: string[] = [];
    const params: unknown[] = [logId];
    let paramIndex = 2;

    if (updates.status) {
      updatesList.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;
    }

    if (updates.csvDownloaded !== undefined) {
      updatesList.push(`csv_downloaded = $${paramIndex}`);
      params.push(updates.csvDownloaded);
      paramIndex++;
    }

    if (updates.productsProcessed !== undefined) {
      updatesList.push(`products_processed = $${paramIndex}`);
      params.push(updates.productsProcessed);
      paramIndex++;
    }

    if (updates.productsCreated !== undefined) {
      updatesList.push(`products_created = $${paramIndex}`);
      params.push(updates.productsCreated);
      paramIndex++;
    }

    if (updates.productsSkipped !== undefined) {
      updatesList.push(`products_skipped = $${paramIndex}`);
      params.push(updates.productsSkipped);
      paramIndex++;
    }

    if (updates.productsUpdated !== undefined) {
      updatesList.push(`products_updated = $${paramIndex}`);
      params.push(updates.productsUpdated);
      paramIndex++;
    }

    if (updates.errors) {
      updatesList.push(`errors = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(updates.errors));
      paramIndex++;
    }

    // Store progress info in details JSONB field
    const details: Record<string, unknown> = {};
    if (updates.currentStage) {
      details.currentStage = updates.currentStage;
    }
    if (updates.progressPercent !== undefined) {
      details.progressPercent = updates.progressPercent;
    }
    if (Object.keys(details).length > 0) {
      // Get existing details and merge (handle case where column might not exist yet)
      try {
        const existingResult = await query<{ details: unknown }>(
          `SELECT details FROM core.plusportal_sync_log WHERE log_id = $1`,
          [logId]
        );
        const existingDetails = existingResult.rows[0]?.details || {};
        const mergedDetails = { ...(existingDetails as Record<string, unknown>), ...details };
        updatesList.push(`details = $${paramIndex}::jsonb`);
        params.push(JSON.stringify(mergedDetails));
        paramIndex++;
      } catch (error) {
        // If details column doesn't exist, just set it directly
        if (error instanceof Error && error.message.includes('does not exist')) {
          updatesList.push(`details = $${paramIndex}::jsonb`);
          params.push(JSON.stringify(details));
          paramIndex++;
        } else {
          throw error;
        }
      }
    }

    if (updates.status === 'completed' || updates.status === 'failed') {
      updatesList.push(`sync_completed_at = NOW()`);
    }

    if (updatesList.length > 0) {
      await query(
        `UPDATE core.plusportal_sync_log 
         SET ${updatesList.join(', ')}
         WHERE log_id = $1`,
        params
      );
    }
  }

  /**
   * Execute full sync process
   * Updated to scrape from Shopping > All Products tab instead of CSV download
   */
  async executeSync(credentials: PlusPortalCredentials): Promise<PlusPortalSyncResult> {
    const logId = await this.createSyncLog();
    const errors: string[] = [];
    let dataScraped = false;
    let scrapedProducts: ScrapedProduct[] = [];
    let totalPages = 0;

    try {
      // Initialize browser
      await this.updateSyncLog(logId, {
        currentStage: 'Initializing browser...',
        progressPercent: 5,
      });
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      try {
        // Step 1-5: Login (includes URL, email, password, checkbox, sign in)
        await this.updateSyncLog(logId, {
          currentStage: 'Logging in to PlusPortal...',
          progressPercent: 10,
        });
        await this.login(page, credentials);
        
        // Check current URL after login
        console.log('[PlusPortal] Checking post-login state, URL:', page.url());
        
        // Check if we need to select a company (this happens after login in PlusPortal)
        let companyListFound = false;
        try {
          companyListFound = await page.evaluate(() => {
            const listItems = document.querySelectorAll('nz-list-item, .ant-list-item, [nz-list-item]');
            const listContainer = document.querySelector('.ant-list, nz-list');
            return listItems.length > 0 || listContainer !== null;
          });
        } catch (evalError) {
          console.log('[PlusPortal] Could not check for company list:', evalError);
        }
        
        if (companyListFound) {
          console.log('[PlusPortal] Company selection page detected, finding matching company...');
          await this.updateSyncLog(logId, {
            currentStage: 'Selecting company...',
            progressPercent: 15,
          });
          
          // Get the supplier name to match against companies
          const supplierResult = await query<{ name: string }>(
            `SELECT name FROM core.supplier WHERE supplier_id = $1`,
            [this.supplierId]
          );
          const supplierName = supplierResult.rows[0]?.name?.toUpperCase() || '';
          console.log('[PlusPortal] Looking for company matching supplier:', supplierName);
          
          try {
            // Get all available companies and their text content
            const companies = await page.evaluate(() => {
              const listItems = Array.from(document.querySelectorAll('nz-list-item, .ant-list-item, [nz-list-item]'));
              return listItems.map((el, idx) => ({
                index: idx,
                text: el.textContent?.trim().toUpperCase() || '',
              }));
            });
            
            console.log('[PlusPortal] Available companies:', companies.map((c: { index: number; text: string }) => c.text));
            
            // Find the best matching company
            let matchIndex = -1;
            
            // Try exact match first
            for (const company of companies) {
              if (company.text.includes(supplierName) || supplierName.includes(company.text)) {
                matchIndex = company.index;
                console.log('[PlusPortal] Found matching company at index', matchIndex, ':', company.text);
                break;
              }
            }
            
            // Try partial match on key words
            if (matchIndex === -1) {
              const supplierWords = supplierName.split(/\s+/).filter(w => w.length > 3);
              for (const company of companies) {
                for (const word of supplierWords) {
                  if (company.text.includes(word)) {
                    matchIndex = company.index;
                    console.log('[PlusPortal] Found partial match at index', matchIndex, ':', company.text, '(matched:', word, ')');
                    break;
                  }
                }
                if (matchIndex !== -1) break;
              }
            }
            
            // Fallback to first company if no match found
            if (matchIndex === -1) {
              console.log('[PlusPortal] WARNING: No matching company found, using first company');
              matchIndex = 0;
            }
            
            // Click the matched company
            await page.evaluate((idx: number) => {
              const listItems = Array.from(document.querySelectorAll('nz-list-item, .ant-list-item, [nz-list-item]'));
              if (listItems[idx]) {
                (listItems[idx] as HTMLElement).click();
              }
            }, matchIndex);
            
            await this.delay(5000);
            console.log('[PlusPortal] After company selection, URL:', page.url());
          } catch (evalError) {
            console.log('[PlusPortal] Company selection failed:', evalError);
          }
        }
        
        // Wait for the dashboard/menu to load
        await this.delay(3000);
        
        // Log what menu items we can see
        const menuInfo = await page.evaluate(() => {
          const allLinks = Array.from(document.querySelectorAll('a, .ant-menu-item, nz-menu-item, [routerlink], [nz-menu-item]'));
          return allLinks.slice(0, 30).map(el => ({
            text: el.textContent?.trim().slice(0, 50),
            href: el.getAttribute('href'),
            routerLink: el.getAttribute('routerlink'),
          }));
        });
        console.log('[PlusPortal] Available navigation items:', JSON.stringify(menuInfo.slice(0, 15), null, 2));

        // Scrape product data from Shopping > All Products tab
        await this.updateSyncLog(logId, {
          currentStage: 'Navigating to Shopping tab...',
          progressPercent: 20,
        });
        
        const scrapeResult = await this.scrapeShoppingData(page, logId);
        
        if (scrapeResult.success || scrapeResult.products.length > 0) {
          dataScraped = true;
          scrapedProducts = scrapeResult.products;
          totalPages = scrapeResult.totalPages;
          
          // Add any scraping errors to our error list
          if (scrapeResult.errors.length > 0) {
            errors.push(...scrapeResult.errors);
          }
          
          console.log(`[PlusPortal] Scrape successful: ${scrapedProducts.length} products from ${totalPages} pages`);
        } else {
          errors.push('Scraping returned no products');
          if (scrapeResult.errors.length > 0) {
            errors.push(...scrapeResult.errors);
          }
        }

        await this.updateSyncLog(logId, {
          currentStage: `Scraped ${scrapedProducts.length} products, ready for processing...`,
          progressPercent: 80,
        });
      } finally {
        await page.close();
        await this.cleanupBrowser();
      }

      // Return scraped data for processing by the processor
      return {
        success: dataScraped,
        logId,
        dataScraped,
        scrapedProducts,
        totalPages,
        productsProcessed: 0,
        productsCreated: 0,
        productsSkipped: 0,
        productsUpdated: 0,
        discountRulesCreated: 0,
        discountRulesUpdated: 0,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      await this.updateSyncLog(logId, {
        status: 'failed',
        errors,
        currentStage: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progressPercent: 0,
      });

      return {
        success: false,
        logId,
        dataScraped,
        scrapedProducts,
        totalPages,
        productsProcessed: 0,
        productsCreated: 0,
        productsSkipped: 0,
        productsUpdated: 0,
        discountRulesCreated: 0,
        discountRulesUpdated: 0,
        errors,
      };
    }
  }

  /**
   * Get sync configuration
   */
  async getConfig(): Promise<PlusPortalSyncConfig | null> {
    const result = await query<{
      supplier_id: string;
      plusportal_enabled: boolean;
      plusportal_username: string | null;
      plusportal_password_encrypted: string | null;
      plusportal_interval_minutes: number;
    }>(
      `SELECT 
        supplier_id,
        plusportal_enabled,
        plusportal_username,
        plusportal_password_encrypted,
        plusportal_interval_minutes
      FROM core.supplier
      WHERE supplier_id = $1`,
      [this.supplierId]
    );

    if (result.rows.length === 0 || !result.rows[0].plusportal_username) {
      return null;
    }

    const row = result.rows[0];
    // Return null password as null, not empty string, to properly detect first-time setup
    // We know username exists because of the check above
    return {
      supplierId: row.supplier_id,
      username: row.plusportal_username!, // Non-null because we checked above
      password: row.plusportal_password_encrypted || null, // Return null if not set
      enabled: row.plusportal_enabled,
      intervalMinutes: row.plusportal_interval_minutes,
    };
  }

  /**
   * Update sync configuration
   */
  async updateConfig(config: Partial<PlusPortalSyncConfig>): Promise<void> {
    // First, verify supplier exists
    const supplierCheck = await query<{ supplier_id: string }>(
      `SELECT supplier_id FROM core.supplier WHERE supplier_id = $1`,
      [this.supplierId]
    );
    
    if (supplierCheck.rows.length === 0) {
      throw new Error(`Supplier not found: ${this.supplierId}`);
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (config.enabled !== undefined) {
      updates.push(`plusportal_enabled = $${paramIndex++}`);
      params.push(config.enabled);
    }

    if (config.username !== undefined) {
      updates.push(`plusportal_username = $${paramIndex++}`);
      params.push(config.username);
    }

    if (config.password !== undefined) {
      // TODO: Encrypt password before storing
      updates.push(`plusportal_password_encrypted = $${paramIndex++}`);
      params.push(config.password); // Should be encrypted
    }

    if (config.intervalMinutes !== undefined) {
      updates.push(`plusportal_interval_minutes = $${paramIndex++}`);
      params.push(config.intervalMinutes);
    }

    if (updates.length === 0) {
      console.warn('[PlusPortal] updateConfig called with no updates');
      return;
    }

    // Add updated_at and supplier ID
    updates.push(`updated_at = NOW()`);
    params.push(this.supplierId);
    
    try {
      console.log('[PlusPortal] Attempting to update config:', {
        supplierId: this.supplierId,
        updates: updates,
        paramCount: params.length,
      });
      
      const result = await query<{ supplier_id: string }>(
        `UPDATE core.supplier 
         SET ${updates.join(', ')}
         WHERE supplier_id = $${paramIndex}
         RETURNING supplier_id`,
        params
      );
      
      console.log('[PlusPortal] Update result:', { rowCount: result.rows.length, rows: result.rows });
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update supplier ${this.supplierId} - no rows affected. Check if supplier exists and columns are writable.`);
      }
      
      console.log('[PlusPortal] Config updated successfully for supplier:', this.supplierId, {
        updatedFields: updates.length,
        enabled: config.enabled,
        username: config.username ? '***' : undefined,
        passwordUpdated: config.password !== undefined,
        intervalMinutes: config.intervalMinutes,
      });
    } catch (error) {
      console.error('[PlusPortal] Failed to update config:', {
        supplierId: this.supplierId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        updates: updates,
        sql: `UPDATE core.supplier SET ${updates.join(', ')} WHERE supplier_id = $${paramIndex}`,
      });
      throw new Error(`Failed to update PlusPortal configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sync status and logs
   */
  async getStatus(): Promise<{
    config: PlusPortalSyncConfig | null;
    lastSync: Date | null;
      recentLogs: Array<{
      logId: string;
      status: string;
      csvDownloaded: boolean;
      productsProcessed: number;
      productsCreated: number;
      productsSkipped: number;
      syncStartedAt: Date;
      syncCompletedAt: Date | null;
      errors: string[];
      currentStage?: string;
      progressPercent?: number;
    }>;
  }> {
    let config: PlusPortalSyncConfig | null = null;
    try {
      config = await this.getConfig();
    } catch (error) {
      console.error('[PlusPortal] Failed to get config:', error);
      // Continue without config - this is not critical for status retrieval
    }

    const logsResult = await query<{
      log_id: string;
      status: string;
      csv_downloaded: boolean;
      products_processed: number;
      products_created: number;
      products_skipped: number;
      sync_started_at: Date;
      sync_completed_at: Date | null;
      errors: string | null;
      details: unknown;
    }>(
      `SELECT 
        log_id,
        status,
        csv_downloaded,
        products_processed,
        products_created,
        products_skipped,
        sync_started_at,
        sync_completed_at,
        errors,
        details
      FROM core.plusportal_sync_log
      WHERE supplier_id = $1
      ORDER BY sync_started_at DESC
      LIMIT 10`,
      [this.supplierId]
    );

    const supplierResult = await query<{ plusportal_last_sync: Date | null }>(
      `SELECT plusportal_last_sync FROM core.supplier WHERE supplier_id = $1`,
      [this.supplierId]
    );

    return {
      config,
      lastSync: supplierResult.rows[0]?.plusportal_last_sync || null,
      recentLogs: logsResult.rows.map(row => {
        let errors: string[] = [];
        if (row.errors) {
          try {
            // Handle both string and already-parsed JSON
            if (typeof row.errors === 'string') {
              errors = JSON.parse(row.errors);
            } else if (Array.isArray(row.errors)) {
              errors = row.errors;
            } else {
              errors = [String(row.errors)];
            }
          } catch (parseError) {
            console.error('[PlusPortal] Failed to parse errors JSON:', parseError);
            errors = [String(row.errors)];
          }
        }
        // Extract progress info from details JSONB
        let currentStage: string | undefined;
        let progressPercent: number | undefined;
        if (row.details) {
          try {
            const details = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
            if (details && typeof details === 'object') {
              currentStage = details.currentStage as string | undefined;
              progressPercent = details.progressPercent as number | undefined;
            }
          } catch (parseError) {
            console.error('[PlusPortal] Failed to parse details JSON:', parseError);
          }
        }

        const logEntry: {
          logId: string;
          status: string;
          csvDownloaded: boolean;
          productsProcessed: number;
          productsCreated: number;
          productsSkipped: number;
          syncStartedAt: Date;
          syncCompletedAt: Date | null;
          errors: string[];
          currentStage?: string;
          progressPercent?: number;
        } = {
          logId: row.log_id,
          status: row.status,
          csvDownloaded: row.csv_downloaded,
          productsProcessed: row.products_processed,
          productsCreated: row.products_created,
          productsSkipped: row.products_skipped,
          syncStartedAt: row.sync_started_at,
          syncCompletedAt: row.sync_completed_at,
          errors,
        };
        
        // Only add optional properties if they have values
        if (currentStage !== undefined) {
          logEntry.currentStage = currentStage;
        }
        if (progressPercent !== undefined) {
          logEntry.progressPercent = progressPercent;
        }
        
        return logEntry;
      }),
    };
  }

  /**
   * Cleanup temporary files
   */
  cleanup(): void {
    if (fs.existsSync(this.downloadPath)) {
      try {
        fs.rmSync(this.downloadPath, { recursive: true, force: true });
      } catch (error) {
        console.error('[PlusPortal] Failed to cleanup download directory:', error);
      }
    }
  }
}

/**
 * Get PlusPortal sync service instance
 */
export function getPlusPortalSyncService(supplierId: string): PlusPortalSyncService {
  return new PlusPortalSyncService(supplierId);
}


