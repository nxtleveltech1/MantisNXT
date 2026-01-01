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
   */
  private async login(page: Page, credentials: PlusPortalCredentials): Promise<boolean> {
    try {
      await page.goto(PLUSPORTAL_LOGIN_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for login form to be visible
      await page.waitForSelector('input[type="email"], input[type="text"], input[type="password"]', {
        timeout: 10000,
      });

      await this.delay(1000);

      // Fill email field using Puppeteer's type method
      const emailInput = await page.$('input[type="email"], input[type="text"]');
      if (!emailInput) {
        throw new Error('Email input field not found');
      }
      await emailInput.click({ clickCount: 3 }); // Select all existing text
      await emailInput.type(credentials.username, { delay: 50 });

      await this.delay(500);

      // Fill password field using Puppeteer's type method
      const passwordInput = await page.$('input[type="password"]');
      if (!passwordInput) {
        throw new Error('Password input field not found');
      }
      await passwordInput.click({ clickCount: 3 }); // Select all existing text
      await passwordInput.type(credentials.password, { delay: 50 });

      await this.delay(500);

      // Find and check "Accept terms and Conditions" checkbox
      const checkboxHandle = await page.evaluateHandle(() => {
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        for (const checkbox of checkboxes) {
          const parent = checkbox.parentElement;
          const sibling = checkbox.nextElementSibling;
          const nearbyText = (parent?.textContent || sibling?.textContent || '').toLowerCase();
          
          if (nearbyText.includes('terms') || nearbyText.includes('accept')) {
            return checkbox;
          }
        }
        // Fallback: return first checkbox
        return document.querySelector('input[type="checkbox"]');
      });

      const checkboxElement = await checkboxHandle.asElement();
      if (checkboxElement) {
        const isChecked = await page.evaluate((el) => (el as HTMLInputElement).checked, checkboxElement);
        if (!isChecked) {
          await checkboxElement.click();
        }
      }

      await this.delay(1000);

      // Find and click "Sign in" button using Puppeteer's click method
      const signInButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        for (const btn of buttons) {
          const text = (btn.textContent || btn.getAttribute('value') || '').toLowerCase().trim();
          if (text === 'sign in' || text.includes('sign in')) {
            return btn;
          }
        }
        return null;
      });

      if (!signInButton) {
        throw new Error('Sign in button not found');
      }

      const buttonElement = await signInButton.asElement();
      if (!buttonElement) {
        throw new Error('Sign in button element not found');
      }

      // Wait for navigation promise BEFORE clicking
      const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
        // Navigation might not happen, we'll check URL later
        return null;
      });

      await buttonElement.click();

      // Wait for navigation or timeout
      await navigationPromise;
      
      // Give it a moment for any async navigation
      await this.delay(3000);

      // Check current URL
      const currentUrl = page.url();
      
      // Check for error messages first
      const errorText = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .alert-danger, [role="alert"], .text-red-500, .text-red-600, [class*="error"], [class*="danger"]');
        return Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean).join(' ');
      });
      
      if (errorText) {
        throw new Error(`Login failed: ${errorText}`);
      }

      // Verify login was successful - check if we're still on login page
      if (currentUrl.includes('login') || currentUrl.includes('authentication')) {
        // Still on login page - check checkbox status
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

      // STEP 6: SELECT THE SOH INFO TAB
      const sohTabClicked = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, .tab, [role="tab"], li, span, div'));
        for (const el of elements) {
          const text = el.textContent?.trim().toLowerCase() || '';
          // Look for "SOH INFO" or "SOH" tab
          if (text === 'soh info' || text === 'soh' || text.includes('soh info')) {
            (el as HTMLElement).click();
            return { found: true, text: el.textContent?.trim() };
          }
        }
        return { found: false, text: null };
      });

      if (sohTabClicked.found) {
        console.log(`[PlusPortal] Step 6: Clicked SOH INFO tab: "${sohTabClicked.text}"`);
      } else {
        console.log('[PlusPortal] Step 6: SOH INFO tab not found, continuing...');
      }

      await this.delay(2000);

      // STEP 7: SELECT CSV DOWNLOAD TAB
      const csvTabClicked = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('a, button, .tab, [role="tab"], li, span, div'));
        for (const el of elements) {
          const text = el.textContent?.trim().toLowerCase() || '';
          // Look for "CSV Download" or similar tab
          if (text === 'csv download' || text === 'csv' || text.includes('csv download') || text.includes('download csv')) {
            (el as HTMLElement).click();
            return { found: true, text: el.textContent?.trim() };
          }
        }
        return { found: false, text: null };
      });

      if (csvTabClicked.found) {
        console.log(`[PlusPortal] Step 7: Clicked CSV Download tab: "${csvTabClicked.text}"`);
      } else {
        console.log('[PlusPortal] Step 7: CSV Download tab not found, continuing...');
      }

      await this.delay(2000);

      // Set up download listener BEFORE clicking export
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: this.downloadPath,
      });

      // STEP 8: SELECT COMMA DELIMITED
      const commaDelimitedClicked = await page.evaluate(() => {
        // Look for radio buttons, checkboxes, or clickable elements with "Comma" text
        const radioInputs = Array.from(document.querySelectorAll('input[type="radio"]'));
        for (const input of radioInputs) {
          const label = input.parentElement?.textContent?.toLowerCase() || '';
          const nextSibling = input.nextElementSibling?.textContent?.toLowerCase() || '';
          const value = (input as HTMLInputElement).value?.toLowerCase() || '';
          
          if (label.includes('comma') || nextSibling.includes('comma') || value.includes('comma')) {
            (input as HTMLInputElement).click();
            return { found: true, type: 'radio', text: label || nextSibling || value };
          }
        }

        // Try regular buttons/links with "Comma Delimited" text
        const elements = Array.from(document.querySelectorAll('a, button, label, span, div, option'));
        for (const el of elements) {
          const text = el.textContent?.trim().toLowerCase() || '';
          if (text.includes('comma delimited') || text === 'comma') {
            (el as HTMLElement).click();
            return { found: true, type: 'element', text: el.textContent?.trim() };
          }
        }

        // Try select dropdown
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
          const options = Array.from(select.options);
          for (const option of options) {
            if (option.text.toLowerCase().includes('comma')) {
              select.value = option.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return { found: true, type: 'select', text: option.text };
            }
          }
        }

        return { found: false, text: null };
      });

      if (commaDelimitedClicked.found) {
        console.log(`[PlusPortal] Step 8: Selected Comma Delimited: "${commaDelimitedClicked.text}" (${commaDelimitedClicked.type})`);
      } else {
        console.log('[PlusPortal] Step 8: Comma Delimited option not found, continuing...');
      }

      await this.delay(1000);

      // STEP 9: EXPORT
      const exportClicked = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
        for (const el of elements) {
          const text = (el.textContent || (el as HTMLInputElement).value || '').trim().toLowerCase();
          if (text === 'export' || text.includes('export')) {
            (el as HTMLElement).click();
            return { found: true, text: el.textContent?.trim() || (el as HTMLInputElement).value };
          }
        }
        return { found: false, text: null };
      });

      if (exportClicked.found) {
        console.log(`[PlusPortal] Step 9: Clicked Export: "${exportClicked.text}"`);
      } else {
        console.log('[PlusPortal] Step 9: Export button not found');
        throw new Error('Export button not found on the page');
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

