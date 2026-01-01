/**
 * PlusPortal Sync Service
 * Automated browser-based extraction and sync from PlusPortal
 */

import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { query, withTransaction } from '@/lib/database';
import { findSupplierByName } from '@/lib/utils/supplier-matcher';
import { shouldCreateProductForStageAudioWorks } from './SKUDeduplicationService';

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
    this.downloadPath = path.join(os.tmpdir(), `plusportal-downloads-${Date.now()}`);
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
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
      await page.waitForSelector('input[type="text"], input[type="email"], input[name*="username"], input[name*="email"]', {
        timeout: 10000,
      });

      // Find username input (try multiple selectors)
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[type="text"]',
        '#username',
        '#email',
      ];

      let usernameInput = null;
      for (const selector of usernameSelectors) {
        try {
          usernameInput = await page.$(selector);
          if (usernameInput) break;
        } catch {
          // Continue to next selector
        }
      }

      if (!usernameInput) {
        throw new Error('Username input field not found');
      }

      await usernameInput.type(credentials.username, { delay: 100 });

      // Find password input
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        '#password',
      ];

      let passwordInput = null;
      for (const selector of passwordSelectors) {
        try {
          passwordInput = await page.$(selector);
          if (passwordInput) break;
        } catch {
          // Continue to next selector
        }
      }

      if (!passwordInput) {
        throw new Error('Password input field not found');
      }

      await passwordInput.type(credentials.password, { delay: 100 });

      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        '.btn-primary',
        '#login-button',
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.$(selector);
          if (submitButton) break;
        } catch {
          // Continue to next selector
        }
      }

      if (!submitButton) {
        throw new Error('Submit button not found');
      }

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        submitButton.click(),
      ]);

      // Check if login was successful (URL should change or error message should not appear)
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('authentication')) {
        // Check for error messages
        const errorText = await page.evaluate(() => {
          const errorElements = document.querySelectorAll('.error, .alert-danger, [role="alert"]');
          return Array.from(errorElements).map(el => el.textContent).join(' ');
        });

        if (errorText) {
          throw new Error(`Login failed: ${errorText}`);
        }

        // Wait a bit more in case of redirect delay
        await page.waitForTimeout(2000);
        const finalUrl = page.url();
        if (finalUrl.includes('login') || finalUrl.includes('authentication')) {
          throw new Error('Login failed: Still on login page');
        }
      }

      return true;
    } catch (error) {
      console.error('[PlusPortal] Login error:', error);
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select supplier from dropdown/list
   */
  private async selectSupplier(page: Page, supplierName: string): Promise<boolean> {
    try {
      // Wait for supplier selection UI to appear
      await page.waitForTimeout(2000);

      // Try to find supplier dropdown or list
      const supplierSelectors = [
        'select[name*="supplier"]',
        'select[id*="supplier"]',
        '.supplier-select',
        '[data-supplier]',
      ];

      let supplierElement = null;
      for (const selector of supplierSelectors) {
        try {
          supplierElement = await page.$(selector);
          if (supplierElement) break;
        } catch {
          // Continue
        }
      }

      if (supplierElement) {
        // It's a select dropdown
        const selectorUsed = supplierSelectors.find(s => {
          try {
            return page.$(s) === supplierElement;
          } catch {
            return false;
          }
        }) || supplierSelectors[0];

        const options = await page.evaluate((sel) => {
          const select = document.querySelector(sel) as HTMLSelectElement;
          if (!select) return [];
          return Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text.trim(),
          }));
        }, selectorUsed);

        // Find matching option (fuzzy match)
        const normalizedTarget = supplierName.toLowerCase().trim();
        const matchingOption = options.find(opt =>
          opt.text.toLowerCase().includes(normalizedTarget) ||
          normalizedTarget.includes(opt.text.toLowerCase())
        );

        if (matchingOption) {
          await page.select(selectorUsed, matchingOption.value);
          await page.waitForTimeout(1000);
          return true;
        }
      } else {
        // Try to find clickable supplier items
        const supplierItems = await page.evaluate((name) => {
          const items = Array.from(document.querySelectorAll('a, button, [role="button"], .supplier-item, [data-name]'));
          return items
            .map(item => ({
              element: item,
              text: item.textContent?.trim() || '',
            }))
            .filter(item => item.text.toLowerCase().includes(name.toLowerCase()));
        }, supplierName);

        if (supplierItems.length > 0) {
          // Click the first matching item
          await page.evaluate((name) => {
            const items = Array.from(document.querySelectorAll('a, button, [role="button"], .supplier-item, [data-name]'));
            const matching = items.filter(item =>
              item.textContent?.toLowerCase().includes(name.toLowerCase())
            );
            if (matching[0]) {
              (matching[0] as HTMLElement).click();
            }
          }, supplierName);

          await page.waitForTimeout(2000);
          return true;
        }
      }

      throw new Error(`Supplier "${supplierName}" not found in selection UI`);
    } catch (error) {
      console.error('[PlusPortal] Supplier selection error:', error);
      throw new Error(`Failed to select supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Navigate to SOH INFO tab and download CSV
   */
  private async downloadSOHCSV(page: Page): Promise<string> {
    try {
      // Wait for page to load
      await page.waitForTimeout(2000);

      // Find and click SOH INFO tab
      const tabSelectors = [
        'a[href*="soh"]',
        'button:has-text("SOH INFO")',
        '.tab:has-text("SOH")',
        '[data-tab="soh"]',
        'a:has-text("SOH INFO")',
      ];

      let tabFound = false;
      for (const selector of tabSelectors) {
        try {
          const tab = await page.$(selector);
          if (tab) {
            await tab.click();
            await page.waitForTimeout(2000);
            tabFound = true;
            break;
          }
        } catch {
          // Continue
        }
      }

      if (!tabFound) {
        // Try finding by text content
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('a, button, .tab, [role="tab"]'));
          const sohTab = elements.find(el =>
            el.textContent?.toLowerCase().includes('soh') ||
            el.textContent?.toLowerCase().includes('stock')
          );
          if (sohTab) {
            (sohTab as HTMLElement).click();
          }
        });
        await page.waitForTimeout(2000);
      }

      // Set up download listener
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: this.downloadPath,
      });

      // Find CSV Download button/link
      const csvSelectors = [
        'button:has-text("CSV Download")',
        'a:has-text("CSV Download")',
        'button:has-text("Download CSV")',
        '[data-action="csv-download"]',
        '.csv-download',
      ];

      let csvButton = null;
      for (const selector of csvSelectors) {
        try {
          csvButton = await page.$(selector);
          if (csvButton) break;
        } catch {
          // Continue
        }
      }

      if (!csvButton) {
        // Try finding by text
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('a, button'));
          const csvBtn = elements.find(el =>
            el.textContent?.toLowerCase().includes('csv') &&
            el.textContent?.toLowerCase().includes('download')
          );
          if (csvBtn) {
            (csvBtn as HTMLElement).click();
          }
        });
      } else {
        await csvButton.click();
      }

      await page.waitForTimeout(2000);

      // Select "Comma Delimited" option if it's a modal/dropdown
      const delimiterSelectors = [
        'input[value="comma"]',
        'input[value="csv"]',
        'option:has-text("Comma")',
        'button:has-text("Comma Delimited")',
      ];

      for (const selector of delimiterSelectors) {
        try {
          const delimiter = await page.$(selector);
          if (delimiter) {
            await delimiter.click();
            await page.waitForTimeout(1000);
            break;
          }
        } catch {
          // Continue
        }
      }

      // Click Export button
      const exportSelectors = [
        'button:has-text("Export")',
        'button:has-text("Download")',
        '.export-button',
        '[data-action="export"]',
      ];

      let exportButton = null;
      for (const selector of exportSelectors) {
        try {
          exportButton = await page.$(selector);
          if (exportButton) break;
        } catch {
          // Continue
        }
      }

      if (exportButton) {
        await exportButton.click();
      } else {
        // Try finding by text
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('button, a'));
          const exportBtn = elements.find(el =>
            el.textContent?.toLowerCase().includes('export')
          );
          if (exportBtn) {
            (exportBtn as HTMLElement).click();
          }
        });
      }

      // Wait for download to complete (check for new files in download directory)
      let downloadedFile: string | null = null;
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        const files = fs.readdirSync(this.downloadPath);
        const csvFiles = files.filter(f => f.endsWith('.csv'));
        if (csvFiles.length > 0) {
          downloadedFile = path.join(this.downloadPath, csvFiles[0]);
          break;
        }
        await page.waitForTimeout(1000);
      }

      if (!downloadedFile) {
        throw new Error('CSV file download timeout - file not found');
      }

      return downloadedFile;
    } catch (error) {
      console.error('[PlusPortal] CSV download error:', error);
      throw new Error(`Failed to download CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get supplier name from database
   */
  private async getSupplierName(): Promise<string> {
    const result = await query<{ name: string }>(
      `SELECT name FROM core.supplier WHERE supplier_id = $1 LIMIT 1`,
      [this.supplierId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Supplier ${this.supplierId} not found`);
    }

    return result.rows[0].name;
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
        // Login
        await this.login(page, credentials);

        // Get supplier name
        const supplierName = await this.getSupplierName();

        // Select supplier
        await this.selectSupplier(page, supplierName);

        // Download CSV
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
    const config = await this.getConfig();

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
      recentLogs: logsResult.rows.map(row => ({
        logId: row.log_id,
        status: row.status,
        csvDownloaded: row.csv_downloaded,
        productsProcessed: row.products_processed,
        productsCreated: row.products_created,
        productsSkipped: row.products_skipped,
        syncStartedAt: row.sync_started_at,
        syncCompletedAt: row.sync_completed_at,
        errors: row.errors ? JSON.parse(row.errors) : [],
      })),
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

