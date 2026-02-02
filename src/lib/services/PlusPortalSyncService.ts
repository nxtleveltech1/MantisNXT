/**
 * PlusPortal Sync Service
 * Automated browser-based extraction and sync from PlusPortal
 */

import { query } from '@/lib/database';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';

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
  csvDownloaded: boolean;
  csvFilePath?: string;
  productsProcessed: number;
  productsCreated: number;
  productsSkipped: number;
  productsUpdated: number;
  errors: string[];
}

export interface PlusPortalSyncConfig {
  supplierId: string;
  username: string;
  password: string;
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
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        return checkboxes.map(cb => ({
          id: cb.id,
          name: cb.name,
          checked: (cb as HTMLInputElement).checked,
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
   * Navigate to SOH INFO tab and download CSV
   * Process Steps:
   * 6. SELECT THE SOH INFO TAB
   * 7. SELECT CSV DOWNLOAD TAB
   * 8. SELECT COMMA DELIMITED
   * 9. EXPORT
   */
  private async downloadSOHCSV(page: Page): Promise<string> {
    try {
      // Wait for page to load after login
      await this.delay(3000);
      console.log('[PlusPortal] Page loaded, looking for SOH INFO tab...');

      // Log available menu items for debugging
      const menuItems = await page.evaluate(() => {
        // Look for menu links - typically anchor tags in navigation
        const links = Array.from(document.querySelectorAll('a, nz-menu-item, .ant-menu-item, [role="menuitem"]'));
        return links.slice(0, 30).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 50),
          href: el.getAttribute('href'),
          className: el.className?.slice(0, 50),
        }));
      });
      console.log('[PlusPortal] Available menu items:', JSON.stringify(menuItems.slice(0, 15), null, 2));

      // STEP 6: SELECT THE SOH INFO TAB
      // Need to find and click the specific link/menu item, not a parent container
      const sohTabClicked = await page.evaluate(() => {
        // First try anchor tags with exact or near-exact text
        const anchors = Array.from(document.querySelectorAll('a'));
        for (const a of anchors) {
          const text = a.textContent?.trim().toLowerCase() || '';
          if (text === 'soh info' || text === 'soh') {
            a.click();
            return { found: true, text: a.textContent?.trim(), type: 'anchor' };
          }
        }

        // Try menu items
        const menuItems = Array.from(document.querySelectorAll('nz-menu-item, .ant-menu-item, [role="menuitem"], li'));
        for (const item of menuItems) {
          const text = item.textContent?.trim().toLowerCase() || '';
          if (text === 'soh info' || text === 'soh') {
            (item as HTMLElement).click();
            return { found: true, text: item.textContent?.trim(), type: 'menu-item' };
          }
        }

        // Try spans or divs with exact text
        const elements = Array.from(document.querySelectorAll('span, div'));
        for (const el of elements) {
          // Check direct text content, not children
          const directText = Array.from(el.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent?.trim())
            .join('').toLowerCase();
          
          if (directText === 'soh info' || directText === 'soh') {
            (el as HTMLElement).click();
            return { found: true, text: directText, type: 'span/div' };
          }
        }

        return { found: false, text: null };
      });

      if (sohTabClicked.found) {
        console.log(`[PlusPortal] Step 6: Clicked SOH INFO tab: "${sohTabClicked.text}" (${sohTabClicked.type})`);
        // Wait for tab content to load
        await this.delay(3000);
      } else {
        console.log('[PlusPortal] Step 6: SOH INFO tab not found, trying alternative navigation...');
        
        // Try clicking directly on SOH INFO URL if available
        const navigatedToSoh = await page.evaluate(() => {
          // Look for any link containing 'soh' in href
          const links = Array.from(document.querySelectorAll('a[href*="soh"], a[href*="stock"]'));
          if (links.length > 0) {
            (links[0] as HTMLElement).click();
            return { found: true, href: (links[0] as HTMLAnchorElement).href };
          }
          return { found: false };
        });
        
        if (navigatedToSoh.found) {
          console.log(`[PlusPortal] Navigated via href: ${navigatedToSoh.href}`);
          await this.delay(3000);
        } else {
          // Log page content for debugging
          const pageTitle = await page.title();
          const pageUrl = page.url();
          console.log(`[PlusPortal] Current page: ${pageTitle} (${pageUrl})`);
        }
      }

      // STEP 4: Wait for the SOH table to fully load
      console.log('[PlusPortal] Step 4: Waiting for SOH table to load...');
      await this.delay(5000);
      
      // Wait for table data to appear
      try {
        await page.waitForSelector('table, .ant-table, nz-table', { timeout: 15000 });
        console.log('[PlusPortal] Table found, waiting for data...');
        await this.delay(3000);
      } catch {
        console.log('[PlusPortal] Table selector not found, continuing...');
      }

      // Set up download listener BEFORE clicking CSV
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: this.downloadPath,
      });

      // STEP 5: Click CSV button
      console.log('[PlusPortal] Step 5: Looking for CSV button...');
      
      // Log all buttons for debugging
      const allButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"], a.btn'));
        return buttons.slice(0, 20).map(btn => ({
          text: btn.textContent?.trim().slice(0, 30),
          className: btn.className?.slice(0, 50),
          id: btn.id,
        }));
      });
      console.log('[PlusPortal] Available buttons:', JSON.stringify(allButtons, null, 2));
      
      const csvButtonClicked = await page.evaluate(() => {
        // Try multiple selectors for Export/CSV button
        const selectors = [
          'button',
          '.btn',
          '[role="button"]',
          'a.btn',
          'span.ant-btn',
          '.ant-btn',
          'nz-button',
        ];
        
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const el of elements) {
            const text = el.textContent?.trim().toLowerCase() || '';
            // Look for "export" button FIRST (this is the actual button name)
            // Then fall back to CSV variations
            if (text === 'export' || text === 'csv' || text.includes('csv') || text === 'export csv' || text === 'download') {
              (el as HTMLElement).click();
              return { found: true, text: el.textContent?.trim(), selector };
            }
          }
        }
        
        // Also try looking for icons with download/export functionality
        const icons = Array.from(document.querySelectorAll('[class*="download"], [class*="export"], [class*="csv"]'));
        for (const icon of icons) {
          const parent = icon.closest('button, a, [role="button"]');
          if (parent) {
            (parent as HTMLElement).click();
            return { found: true, text: 'icon-based', selector: 'icon' };
          }
        }
        
        return { found: false, availableButtons: [] };
      });

      if (csvButtonClicked.found) {
        console.log(`[PlusPortal] Step 5: Clicked CSV button: "${csvButtonClicked.text}" (${csvButtonClicked.selector})`);
      } else {
        // Take a screenshot for debugging
        console.log('[PlusPortal] CSV button not found. Page might have different structure.');
        throw new Error('CSV button not found on the page. Check if the SOH INFO tab loaded correctly.');
      }

      // Wait for the export dialog to appear
      await this.delay(2000);

      // STEP 6: Select comma delimiter (click the "," button)
      console.log('[PlusPortal] Step 6: Looking for comma delimiter button...');
      
      const commaClicked = await page.evaluate(() => {
        // The delimiter is shown as buttons with "," or ";" or "Tab"
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          // Look for button with comma symbol
          if (text === ',' || text === ',') {
            (btn as HTMLElement).click();
            return { found: true, text: 'comma button' };
          }
        }
        
        // Also try looking for spans or divs that might be clickable delimiter options
        const elements = Array.from(document.querySelectorAll('span, div, label'));
        for (const el of elements) {
          const text = el.textContent?.trim() || '';
          if (text === ',' || text === ',') {
            (el as HTMLElement).click();
            return { found: true, text: 'comma element' };
          }
        }
        
        // Try input/radio for comma
        const inputs = Array.from(document.querySelectorAll('input'));
        for (const input of inputs) {
          const value = (input as HTMLInputElement).value || '';
          if (value === ',' || value === 'comma') {
            (input as HTMLInputElement).click();
            return { found: true, text: 'comma input' };
          }
        }
        
        return { found: false };
      });

      if (commaClicked.found) {
        console.log(`[PlusPortal] Step 6: Selected comma delimiter: "${commaClicked.text}"`);
      } else {
        console.log('[PlusPortal] Step 6: Comma delimiter button not found, may already be selected');
      }

      await this.delay(1000);

      // STEP 7: Click Export button
      console.log('[PlusPortal] Step 7: Looking for Export button...');
      
      const exportClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent?.trim().toLowerCase() || '';
          if (text === 'export') {
            (btn as HTMLElement).click();
            return { found: true, text: btn.textContent?.trim() };
          }
        }
        return { found: false };
      });

      if (exportClicked.found) {
        console.log(`[PlusPortal] Step 7: Clicked Export: "${exportClicked.text}"`);
      } else {
        throw new Error('Export button not found');
      }

      // Wait for download to complete (check for new files in download directory)
      console.log('[PlusPortal] Waiting for CSV download...');
      let downloadedFile: string | null = null;
      const maxWaitTime = 60000; // 60 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        try {
          if (fs.existsSync(this.downloadPath)) {
            const files = fs.readdirSync(this.downloadPath);
            const csvFiles = files.filter(f => f.endsWith('.csv') && !f.endsWith('.crdownload'));
            if (csvFiles.length > 0) {
              downloadedFile = path.join(this.downloadPath, csvFiles[0]);
              console.log(`[PlusPortal] CSV downloaded: ${downloadedFile}`);
              break;
            }
          }
        } catch (err) {
          // Directory might not exist yet
        }
        await this.delay(1000);
      }

      if (!downloadedFile) {
        throw new Error('CSV file download timeout - file not found after 60 seconds');
      }

      return downloadedFile;
    } catch (error) {
      console.error('[PlusPortal] CSV download error:', error);
      throw new Error(`Failed to download CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // Get existing details and merge
      const existingResult = await query<{ details: unknown }>(
        `SELECT details FROM core.plusportal_sync_log WHERE log_id = $1`,
        [logId]
      );
      const existingDetails = existingResult.rows[0]?.details || {};
      const mergedDetails = { ...(existingDetails as Record<string, unknown>), ...details };
      updatesList.push(`details = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(mergedDetails));
      paramIndex++;
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
   */
  async executeSync(credentials: PlusPortalCredentials): Promise<PlusPortalSyncResult> {
    const logId = await this.createSyncLog();
    const errors: string[] = [];
    let csvFilePath: string | null = null;
    let csvDownloaded = false;

    try {
      // Initialize browser
      await this.updateSyncLog(logId, {
        currentStage: 'Initializing browser...',
        progressPercent: 5,
      });
      const browser = await this.initializeBrowser();
      let page = await browser.newPage();

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
            progressPercent: 20,
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
        
        // Don't navigate away - instead find and click the SOH INFO menu item in the SPA
        console.log('[PlusPortal] Looking for SOH INFO menu item...');
        await this.updateSyncLog(logId, {
          currentStage: 'Navigating to SOH INFO...',
          progressPercent: 30,
        });
        
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
        
        // Click on the SOH INFO menu item
        const sohClicked = await page.evaluate(() => {
          // Try various ways to find the SOH INFO link
          const allElements = Array.from(document.querySelectorAll('a, span, div, .ant-menu-item, nz-menu-item'));
          for (const el of allElements) {
            const text = el.textContent?.trim().toLowerCase() || '';
            if (text === 'soh info' || text === 'soh' || text.includes('soh info')) {
              (el as HTMLElement).click();
              return { found: true, text: el.textContent?.trim() };
            }
          }
          return { found: false };
        });
        
        if (sohClicked.found) {
          console.log('[PlusPortal] Clicked SOH INFO menu item:', sohClicked.text);
          await this.delay(5000);
        } else {
          console.log('[PlusPortal] SOH INFO menu item not found, continuing with current page...');
        }
        
        console.log('[PlusPortal] Current URL:', page.url());

        // Steps 6-9: Navigate to SOH INFO tab, CSV Download, select Comma Delimited, Export
        await this.updateSyncLog(logId, {
          currentStage: 'Downloading CSV file...',
          progressPercent: 40,
        });
        csvFilePath = await this.downloadSOHCSV(page);
        csvDownloaded = true;

        await this.updateSyncLog(logId, {
          csvDownloaded: true,
          currentStage: 'CSV downloaded, ready for processing...',
          progressPercent: 50,
        });
      } finally {
        await page.close();
        await this.cleanupBrowser();
      }

      // Process CSV (will be handled by CSV processor)
      return {
        success: true,
        logId,
        csvDownloaded: true,
        csvFilePath: csvFilePath || undefined,
        productsProcessed: 0,
        productsCreated: 0,
        productsSkipped: 0,
        productsUpdated: 0,
        errors: [],
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
        csvDownloaded,
        csvFilePath: csvFilePath || undefined,
        productsProcessed: 0,
        productsCreated: 0,
        productsSkipped: 0,
        productsUpdated: 0,
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
    return {
      supplierId: row.supplier_id,
      username: row.plusportal_username,
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
      updates.push(`plusportal_enabled = $${paramIndex}`);
      params.push(config.enabled);
      paramIndex++;
    }

    if (config.username !== undefined) {
      updates.push(`plusportal_username = $${paramIndex}`);
      params.push(config.username);
      paramIndex++;
    }

    if (config.password !== undefined) {
      // TODO: Encrypt password before storing
      updates.push(`plusportal_password_encrypted = $${paramIndex}`);
      params.push(config.password); // Should be encrypted
      paramIndex++;
    }

    if (config.intervalMinutes !== undefined) {
      updates.push(`plusportal_interval_minutes = $${paramIndex}`);
      params.push(config.intervalMinutes);
      paramIndex++;
    }

    if (updates.length === 0) {
      console.warn('[PlusPortal] updateConfig called with no updates');
      return;
    }

    // Add supplier ID as the last parameter
    params.push(this.supplierId);
    
    try {
      const result = await query<{ supplier_id: string }>(
        `UPDATE core.supplier 
         SET ${updates.join(', ')}
         WHERE supplier_id = $${paramIndex}
         RETURNING supplier_id`,
        params
      );
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update supplier ${this.supplierId} - no rows affected`);
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
        updates: updates.length,
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

        return {
          logId: row.log_id,
          status: row.status,
          csvDownloaded: row.csv_downloaded,
          productsProcessed: row.products_processed,
          productsCreated: row.products_created,
          productsSkipped: row.products_skipped,
          syncStartedAt: row.sync_started_at,
          syncCompletedAt: row.sync_completed_at,
          errors,
          currentStage,
          progressPercent,
        };
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


