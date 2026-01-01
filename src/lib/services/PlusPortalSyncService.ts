/**
 * PlusPortal Sync Service
 * Automated browser-based extraction and sync from PlusPortal
 */

import { query } from '@/lib/database';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';

const PLUSPORTAL_BASE_URL = 'https://my.plusportal.africa';
const PLUSPORTAL_LOGIN_URL = `${PLUSPORTAL_BASE_URL}/apps/authentication/external-login`;

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
   */
  private async initializeBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

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

      // Wait for page changes (this is an Angular SPA, URL might not change)
      console.log('[PlusPortal] Waiting for page update...');
      await this.delay(5000);

      // Check current URL
      const currentUrl = page.url();
      console.log('[PlusPortal] Current URL after login attempt:', currentUrl);
      
      // Check for error messages first
      const errorText = await page.evaluate(() => {
        const errorSelectors = [
          '.error', '.alert-danger', '[role="alert"]', 
          '.text-red-500', '.text-red-600', 
          '[class*="error"]', '[class*="danger"]',
          '.validation-message', '.field-validation-error'
        ];
        const errorElements = document.querySelectorAll(errorSelectors.join(', '));
        return Array.from(errorElements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .join(' | ');
      });
      
      if (errorText) {
        console.log('[PlusPortal] Error messages found:', errorText);
        throw new Error(`Login failed: ${errorText}`);
      }

      // Check if we're on the company selection page (login was successful!)
      // After login, PlusPortal shows a list of companies to select
      const companyListFound = await page.evaluate(() => {
        // Look for the company list (nz-list-item elements with company names)
        const listItems = document.querySelectorAll('nz-list-item, .ant-list-item');
        return listItems.length > 0;
      });

      if (companyListFound) {
        console.log('[PlusPortal] Login successful - company selection page detected');
        
        // Click on the first company in the list to proceed
        const companyClicked = await page.evaluate(() => {
          const listItems = Array.from(document.querySelectorAll('nz-list-item, .ant-list-item'));
          if (listItems.length > 0) {
            // Click the first available company
            (listItems[0] as HTMLElement).click();
            const companyName = listItems[0].textContent?.trim().slice(0, 100);
            return { clicked: true, company: companyName };
          }
          return { clicked: false };
        });
        
        console.log('[PlusPortal] Company selection result:', JSON.stringify(companyClicked));
        
        if (companyClicked.clicked) {
          // Wait for navigation after selecting company
          await this.delay(5000);
          const newUrl = page.url();
          console.log('[PlusPortal] After company selection, URL:', newUrl);
          return true;
        }
      }

      // Check if login form is still visible (login failed)
      const loginFormStillVisible = await page.evaluate(() => {
        const passwordInput = document.querySelector('input[type="password"]');
        const signInButton = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent?.toLowerCase().includes('sign in')
        );
        return passwordInput !== null && signInButton !== null;
      });

      if (loginFormStillVisible) {
        // Check checkbox status
        const checkboxChecked = await page.evaluate(() => {
          const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
          return checkbox ? checkbox.checked : true;
        });
        
        if (!checkboxChecked) {
          throw new Error('Login failed: Terms and conditions checkbox must be checked');
        }
        
        throw new Error('Login failed: Still on login page after clicking Sign in');
      }

      console.log('[PlusPortal] Login successful, navigated to:', currentUrl);
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
      } else {
        console.log('[PlusPortal] Step 6: SOH INFO tab not found, continuing...');
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
      
      const csvButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          // Look for button with exactly "CSV" text
          if (text === 'CSV' || text.toLowerCase() === 'csv') {
            (btn as HTMLElement).click();
            return { found: true, text };
          }
        }
        return { found: false };
      });

      if (csvButtonClicked.found) {
        console.log(`[PlusPortal] Step 5: Clicked CSV button: "${csvButtonClicked.text}"`);
      } else {
        throw new Error('CSV button not found on the page');
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
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      try {
        // Step 1-5: Login (includes URL, email, password, checkbox, sign in)
        await this.login(page, credentials);

        // Steps 6-9: Navigate to SOH INFO tab, CSV Download, select Comma Delimited, Export
        csvFilePath = await this.downloadSOHCSV(page);
        csvDownloaded = true;

        await this.updateSyncLog(logId, {
          csvDownloaded: true,
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
    return {
      supplierId: row.supplier_id,
      username: row.plusportal_username,
      password: row.plusportal_password_encrypted || '', // Will need decryption
      enabled: row.plusportal_enabled,
      intervalMinutes: row.plusportal_interval_minutes,
    };
  }

  /**
   * Update sync configuration
   */
  async updateConfig(config: Partial<PlusPortalSyncConfig>): Promise<void> {
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

    if (updates.length > 0) {
      // Add supplier ID as the last parameter
      params.push(this.supplierId);
      await query(
        `UPDATE core.supplier 
         SET ${updates.join(', ')}
         WHERE supplier_id = $${paramIndex}`,
        params
      );
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
        errors
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


