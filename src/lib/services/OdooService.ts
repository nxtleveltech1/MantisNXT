/**
 * OdooService - Production-ready Odoo XML-RPC/JSON-RPC client
 * Implements authentication and comprehensive ERP integration
 *
 * Features:
 * - Rate limiting to prevent API abuse
 * - Authentication token caching (60 min TTL)
 * - Exponential backoff for 429 errors
 * - Circuit breaker for fault tolerance
 * - Request queuing to prevent duplicate auth calls
 */

import * as xmlrpc from 'xmlrpc';
import { getRateLimiter, exponentialBackoff, getCircuitBreaker } from '@/lib/utils/rate-limiter';
import { getOdooAuthCache, getAuthRequestQueue } from '@/lib/cache/odoo-auth-cache';

export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  password: string;
  protocol?: 'http' | 'https';
  port?: number;
  timeout?: number;
}

export interface OdooAuthResult {
  uid: number;
  session_id?: string;
  server_version?: string;
  server_version_info?: number[];
}

export interface OdooSearchParams {
  domain?: any[];
  fields?: string[];
  offset?: number;
  limit?: number;
  order?: string;
}

export interface OdooProduct {
  id?: number;
  name: string;
  default_code?: string; // SKU
  type?: 'consu' | 'service' | 'product';
  categ_id?: number | [number, string];
  list_price?: number;
  standard_price?: number;
  qty_available?: number;
  virtual_available?: number;
  description?: string;
  description_sale?: string;
  description_purchase?: string;
  active?: boolean;
  sale_ok?: boolean;
  purchase_ok?: boolean;
  barcode?: string;
  weight?: number;
  volume?: number;
  image_1920?: string; // Base64 encoded
}

export interface OdooPartner {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  street?: string;
  street2?: string;
  city?: string;
  state_id?: number | [number, string];
  zip?: string;
  country_id?: number | [number, string];
  is_company?: boolean;
  customer_rank?: number;
  supplier_rank?: number;
  vat?: string; // Tax ID
  ref?: string; // Internal reference
  comment?: string;
  active?: boolean;
}

export interface OdooPurchaseOrder {
  id?: number;
  name?: string;
  partner_id: number | [number, string];
  date_order?: string;
  date_planned?: string;
  state?: 'draft' | 'sent' | 'to approve' | 'purchase' | 'done' | 'cancel';
  order_line?: OdooPurchaseOrderLine[];
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  notes?: string;
  currency_id?: number | [number, string];
  payment_term_id?: number | [number, string];
}

export interface OdooPurchaseOrderLine {
  id?: number;
  product_id: number | [number, string];
  name?: string;
  product_qty: number;
  price_unit: number;
  product_uom?: number | [number, string];
  date_planned?: string;
  taxes_id?: number[];
}

export interface OdooStockQuant {
  id?: number;
  product_id: number | [number, string];
  location_id: number | [number, string];
  quantity: number;
  reserved_quantity?: number;
  inventory_quantity?: number;
  inventory_diff_quantity?: number;
}

export interface OdooInventoryAdjustment {
  id?: number;
  name: string;
  location_ids: number[];
  product_ids?: number[];
  state?: 'draft' | 'in_progress' | 'done' | 'cancel';
  date?: string;
  line_ids?: OdooInventoryLine[];
}

export interface OdooInventoryLine {
  id?: number;
  product_id: number | [number, string];
  location_id: number | [number, string];
  theoretical_qty: number;
  product_qty: number;
  difference_qty?: number;
}

export interface OdooInvoice {
  id?: number;
  name?: string;
  partner_id: number | [number, string];
  move_type: 'out_invoice' | 'out_refund' | 'in_invoice' | 'in_refund';
  invoice_date?: string;
  invoice_date_due?: string;
  state?: 'draft' | 'posted' | 'cancel';
  amount_untaxed?: number;
  amount_tax?: number;
  amount_total?: number;
  invoice_line_ids?: OdooInvoiceLine[];
  payment_reference?: string;
}

export interface OdooInvoiceLine {
  id?: number;
  product_id?: number | [number, string];
  name: string;
  quantity: number;
  price_unit: number;
  tax_ids?: number[];
}

/**
 * Odoo Service using XML-RPC protocol with rate limiting and caching
 */
export class OdooService {
  private config: Required<OdooConfig>;
  private commonClient: xmlrpc.Client;
  private objectClient: xmlrpc.Client;
  private uid: number | null = null;
  private rateLimiter: ReturnType<typeof getRateLimiter>;
  private circuitBreaker: ReturnType<typeof getCircuitBreaker>;
  private authCache: ReturnType<typeof getOdooAuthCache>;
  private authQueue: ReturnType<typeof getAuthRequestQueue>;

  constructor(config: OdooConfig) {
    // Normalize URL: remove trailing slash and ensure protocol
    let normalizedUrl = config.url.replace(/\/$/, '');
    
    // Check for common Odoo.sh URL mistakes
    if (normalizedUrl.includes('www.odoo.sh/project/')) {
      throw new Error(
        `Invalid Odoo.sh URL. You're using the project management URL.\n\n` +
        `Wrong: https://www.odoo.sh/project/yourproject/branches/production\n` +
        `Correct: https://yourproject-production-xxxxx.odoo.com\n\n` +
        `Find your instance URL in your Odoo.sh dashboard under "Connect" or "Access" section.`
      );
    }
    
    // Detect protocol from URL if not explicitly provided
    let protocol: 'http' | 'https' = config.protocol || 'https';
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `${protocol}://${normalizedUrl}`;
    } else {
      protocol = normalizedUrl.startsWith('https') ? 'https' : 'http';
    }

    // Auto-detect port based on URL and protocol
    // Odoo.sh always uses HTTPS on port 443
    // Self-hosted may use HTTP on 8069 or HTTPS on 443
    const urlObj = new URL(normalizedUrl);
    let port = config.port;
    if (!port) {
      if (urlObj.port) {
        port = parseInt(urlObj.port, 10);
      } else {
        port = protocol === 'https' ? 443 : 8069;
      }
    }

    this.config = {
      url: normalizedUrl,
      database: config.database,
      username: config.username,
      password: config.password,
      protocol,
      port,
      timeout: config.timeout || 30000,
    };

    const clientOptions = {
      host: new URL(this.config.url).hostname,
      port: this.config.port,
      path: '/xmlrpc/2',
      timeout: this.config.timeout,
    };

    // Common endpoint for authentication
    this.commonClient = this.config.protocol === 'https'
      ? xmlrpc.createSecureClient({ ...clientOptions, path: '/xmlrpc/2/common' })
      : xmlrpc.createClient({ ...clientOptions, path: '/xmlrpc/2/common' });

    // Object endpoint for CRUD operations
    this.objectClient = this.config.protocol === 'https'
      ? xmlrpc.createSecureClient({ ...clientOptions, path: '/xmlrpc/2/object' })
      : xmlrpc.createClient({ ...clientOptions, path: '/xmlrpc/2/object' });

    // Initialize rate limiter (10 requests per minute)
    const rateLimitKey = `odoo:${this.config.url}:${this.config.database}`;
    this.rateLimiter = getRateLimiter(rateLimitKey, 10, 0.16);

    // Initialize circuit breaker
    this.circuitBreaker = getCircuitBreaker(rateLimitKey, 5, 60000);

    // Get global auth cache and queue
    this.authCache = getOdooAuthCache();
    this.authQueue = getAuthRequestQueue();
  }

  /**
   * Authenticate with Odoo
   * Uses caching and request queuing to prevent excessive auth calls
   */
  async authenticate(): Promise<OdooAuthResult> {
    // Check cache first
    const cached = this.authCache.get(
      this.config.url,
      this.config.database,
      this.config.username
    );

    if (cached) {
      console.log('[OdooService] Using cached authentication');
      this.uid = cached.uid;
      return { uid: cached.uid };
    }

    // Use auth queue to prevent concurrent auth requests
    const authKey = `${this.config.url}:${this.config.database}:${this.config.username}`;

    const uid = await this.authQueue.execute(authKey, async () => {
      // Double-check cache after acquiring queue (another request might have populated it)
      const recheck = this.authCache.get(
        this.config.url,
        this.config.database,
        this.config.username
      );

      if (recheck) {
        console.log('[OdooService] Using cached authentication (from queue)');
        return recheck.uid;
      }

      // Wait for rate limiter token
      await this.rateLimiter.consume();

      console.log('[OdooService] Performing fresh authentication');

      // Perform actual authentication with exponential backoff
      return await exponentialBackoff<number>(
        () => new Promise((resolve, reject) => {
          this.commonClient.methodCall(
            'authenticate',
            [
              this.config.database,
              this.config.username,
              this.config.password,
              {},
            ],
            (error, uid) => {
              if (error) {
                // Check for rate limit error
                const errorMsg = error.message || String(error);
                if (errorMsg.includes('429') || errorMsg.includes('too many requests')) {
                  const rateLimitError: any = new Error(`Odoo authentication rate limited: ${errorMsg}`);
                  rateLimitError.status = 429;
                  reject(rateLimitError);
                  return;
                }

                reject(new Error(`Odoo authentication failed: ${errorMsg}`));
                return;
              }

              if (!uid || uid === false) {
                reject(new Error('Invalid Odoo credentials'));
                return;
              }

              // Cache the successful authentication
              this.authCache.set(
                this.config.url,
                this.config.database,
                this.config.username,
                uid as number
              );

              resolve(uid as number);
            }
          );
        }),
        5, // max retries
        1000, // base delay 1s
        32000 // max delay 32s
      );
    });

    this.uid = uid;
    return { uid };
  }

  /**
   * Verify XML-RPC endpoint is accessible before making calls
   * This helps catch issues where server returns HTML instead of XML-RPC
   */
  private async verifyEndpoint(): Promise<void> {
    try {
      const url = `${this.config.url}/xmlrpc/2/common`;
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'User-Agent': 'MantisNXT-Odoo-Integration/1.0',
          },
          body: '<?xml version="1.0"?><methodCall><methodName>version</methodName></methodCall>',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const contentType = response.headers.get('content-type') || '';
        
        // Check if response is HTML (error page) instead of XML
        if (contentType.includes('text/html')) {
          const text = await response.text();
          if (text.includes('<html') || text.includes('<TITLE>') || text.includes('<!DOCTYPE')) {
            throw new Error(
              `Odoo server returned HTML instead of XML-RPC. This usually means:\n` +
              `1. The URL is incorrect or redirecting to a login/error page\n` +
              `2. The XML-RPC endpoint is not enabled\n` +
              `3. SSL certificate issues\n` +
              `URL: ${url}\n` +
              `Status: ${response.status} ${response.statusText}\n` +
              `Response preview: ${text.substring(0, 200)}...`
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}. ` +
            `Please verify the server URL is correct and XML-RPC is enabled.`
          );
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout}ms`);
        }
        throw fetchError;
      }
    } catch (error: any) {
      // Re-throw with better context if it's not our custom error
      if (error.message && !error.message.includes('Odoo server returned HTML')) {
        throw new Error(
          `Failed to connect to Odoo XML-RPC endpoint: ${error.message}\n` +
          `URL: ${this.config.url}/xmlrpc/2/common\n` +
          `Please verify:\n` +
          `1. The server URL is correct\n` +
          `2. The server is accessible\n` +
          `3. XML-RPC is enabled on the Odoo instance`
        );
      }
      throw error;
    }
  }

  /**
   * Get Odoo version info
   */
  async version(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.commonClient.methodCall('version', [], (error, version) => {
        if (error) {
          // Check if error is due to HTML response
          const errorMsg = error.message || String(error);
          if (errorMsg.includes('Unknown XML-RPC tag') || errorMsg.includes('TITLE')) {
            reject(new Error(
              `Odoo server returned HTML instead of XML-RPC response.\n` +
              `This usually means:\n` +
              `1. The URL is incorrect (check: ${this.config.url})\n` +
              `2. XML-RPC endpoint is disabled or redirecting\n` +
              `3. The server URL should end with domain only (e.g., https://company.odoo.sh)\n` +
              `4. Try accessing ${this.config.url}/xmlrpc/2/common manually to verify\n` +
              `Original error: ${errorMsg}`
            ));
            return;
          }
          reject(error);
          return;
        }
        resolve(version);
      });
    });
  }

  /**
   * Test connection to Odoo
   * Returns detailed connection info including server version
   */
  async testConnection(): Promise<{ success: boolean; version?: any; error?: string }> {
    try {
      // First verify endpoint is accessible (helps catch HTML response issues early)
      try {
        await this.verifyEndpoint();
      } catch (verifyError: any) {
        // If verification fails, include helpful error message
        return {
          success: false,
          error: verifyError.message || 'Failed to verify XML-RPC endpoint',
        };
      }

      // Then check version (doesn't require auth)
      const versionInfo = await this.version();
      
      // Finally authenticate
      await this.authenticate();
      
      return {
        success: true,
        version: versionInfo,
      };
    } catch (error: any) {
      console.error('Odoo connection test failed:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Connection test failed';
      
      // Check for common issues
      if (errorMessage.includes('Unknown XML-RPC tag') || errorMessage.includes('TITLE')) {
        errorMessage = 
          `Odoo server returned HTML instead of XML-RPC. ` +
          `Verify the server URL is correct and XML-RPC is enabled. ` +
          `URL: ${this.config.url}`;
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        errorMessage = 
          `Cannot connect to Odoo server at ${this.config.url}. ` +
          `Please verify the URL is correct and the server is accessible.`;
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        errorMessage = 
          `Connection timeout. The server at ${this.config.url} did not respond. ` +
          `Please check if the server is running and accessible.`;
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Ensure authenticated before making requests
   */
  private async ensureAuthenticated(): Promise<number> {
    if (!this.uid) {
      await this.authenticate();
    }
    return this.uid!;
  }

  /**
   * Execute a method on an Odoo model
   * Uses rate limiting, circuit breaker, and exponential backoff
   */
  private async execute<T>(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: Record<string, any> = {}
  ): Promise<T> {
    return await this.circuitBreaker.execute(async () => {
      const uid = await this.ensureAuthenticated();

      // Wait for rate limiter token
      await this.rateLimiter.consume();

      // Execute with exponential backoff
      return await exponentialBackoff<T>(
        () => new Promise((resolve, reject) => {
          this.objectClient.methodCall(
            'execute_kw',
            [
              this.config.database,
              uid,
              this.config.password,
              model,
              method,
              args,
              kwargs,
            ],
            (error, result) => {
              if (error) {
                // Check for rate limit error
                const errorMsg = error.message || String(error);
                if (errorMsg.includes('429') || errorMsg.includes('too many requests')) {
                  const rateLimitError: any = new Error(`Odoo API rate limited: ${errorMsg}`);
                  rateLimitError.status = 429;
                  reject(rateLimitError);
                  return;
                }

                reject(new Error(`Odoo execute error: ${errorMsg}`));
                return;
              }
              resolve(result as T);
            }
          );
        }),
        5, // max retries
        1000, // base delay 1s
        32000 // max delay 32s
      );
    });
  }

  // ==================== Generic CRUD Operations ====================

  /**
   * Search for records
   */
  async search(
    model: string,
    domain: any[] = [],
    params: Omit<OdooSearchParams, 'domain'> = {}
  ): Promise<number[]> {
    const kwargs: any = {};
    if (params.offset !== undefined) kwargs.offset = params.offset;
    if (params.limit !== undefined) kwargs.limit = params.limit;
    if (params.order) kwargs.order = params.order;

    return this.execute<number[]>(model, 'search', [domain], kwargs);
  }

  /**
   * Count records matching domain
   */
  async searchCount(model: string, domain: any[] = []): Promise<number> {
    return this.execute<number>(model, 'search_count', [domain]);
  }

  /**
   * Search and read records
   */
  async searchRead<T>(
    model: string,
    params: OdooSearchParams = {}
  ): Promise<T[]> {
    const kwargs: any = {};
    if (params.domain) kwargs.domain = params.domain;
    if (params.fields) kwargs.fields = params.fields;
    if (params.offset !== undefined) kwargs.offset = params.offset;
    if (params.limit !== undefined) kwargs.limit = params.limit;
    if (params.order) kwargs.order = params.order;

    return this.execute<T[]>(model, 'search_read', [], kwargs);
  }

  /**
   * Read records by IDs
   */
  async read<T>(
    model: string,
    ids: number | number[],
    fields?: string[]
  ): Promise<T[]> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const kwargs = fields ? { fields } : {};
    return this.execute<T[]>(model, 'read', [idArray], kwargs);
  }

  /**
   * Create a record
   */
  async create<T>(model: string, values: Record<string, any>): Promise<number> {
    return this.execute<number>(model, 'create', [values]);
  }

  /**
   * Update records
   */
  async write(
    model: string,
    ids: number | number[],
    values: Record<string, any>
  ): Promise<boolean> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    return this.execute<boolean>(model, 'write', [idArray, values]);
  }

  /**
   * Delete records
   */
  async unlink(model: string, ids: number | number[]): Promise<boolean> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    return this.execute<boolean>(model, 'unlink', [idArray]);
  }

  // ==================== Products ====================

  async getProducts(params: OdooSearchParams = {}): Promise<OdooProduct[]> {
    return this.searchRead<OdooProduct>('product.template', params);
  }

  async getProduct(id: number, fields?: string[]): Promise<OdooProduct> {
    const [product] = await this.read<OdooProduct>('product.template', id, fields);
    return product;
  }

  async createProduct(product: Partial<OdooProduct>): Promise<number> {
    return this.create('product.template', product);
  }

  async updateProduct(id: number, product: Partial<OdooProduct>): Promise<boolean> {
    return this.write('product.template', id, product);
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.unlink('product.template', id);
  }

  /**
   * Update product stock quantity
   */
  async updateProductStock(
    productId: number,
    locationId: number,
    newQuantity: number
  ): Promise<boolean> {
    // Find existing stock quant
    const quantIds = await this.search('stock.quant', [
      ['product_id', '=', productId],
      ['location_id', '=', locationId],
    ]);

    if (quantIds.length > 0) {
      // Update existing quant
      return this.write('stock.quant', quantIds[0], {
        inventory_quantity: newQuantity,
      });
    } else {
      // Create new quant
      await this.create('stock.quant', {
        product_id: productId,
        location_id: locationId,
        inventory_quantity: newQuantity,
      });
      return true;
    }
  }

  // ==================== Partners (Customers/Suppliers) ====================

  async getPartners(params: OdooSearchParams = {}): Promise<OdooPartner[]> {
    return this.searchRead<OdooPartner>('res.partner', params);
  }

  async getPartner(id: number, fields?: string[]): Promise<OdooPartner> {
    const [partner] = await this.read<OdooPartner>('res.partner', id, fields);
    return partner;
  }

  async createPartner(partner: Partial<OdooPartner>): Promise<number> {
    return this.create('res.partner', partner);
  }

  async updatePartner(id: number, partner: Partial<OdooPartner>): Promise<boolean> {
    return this.write('res.partner', id, partner);
  }

  async getSuppliers(params: OdooSearchParams = {}): Promise<OdooPartner[]> {
    const domain = [['supplier_rank', '>', 0], ...(params.domain || [])];
    return this.searchRead<OdooPartner>('res.partner', { ...params, domain });
  }

  async getCustomers(params: OdooSearchParams = {}): Promise<OdooPartner[]> {
    const domain = [['customer_rank', '>', 0], ...(params.domain || [])];
    return this.searchRead<OdooPartner>('res.partner', { ...params, domain });
  }

  // ==================== Purchase Orders ====================

  async getPurchaseOrders(params: OdooSearchParams = {}): Promise<OdooPurchaseOrder[]> {
    return this.searchRead<OdooPurchaseOrder>('purchase.order', params);
  }

  async getPurchaseOrder(id: number, fields?: string[]): Promise<OdooPurchaseOrder> {
    const [order] = await this.read<OdooPurchaseOrder>('purchase.order', id, fields);
    return order;
  }

  async createPurchaseOrder(order: Partial<OdooPurchaseOrder>): Promise<number> {
    return this.create('purchase.order', order);
  }

  async updatePurchaseOrder(id: number, order: Partial<OdooPurchaseOrder>): Promise<boolean> {
    return this.write('purchase.order', id, order);
  }

  /**
   * Confirm purchase order
   */
  async confirmPurchaseOrder(id: number): Promise<boolean> {
    return this.execute<boolean>('purchase.order', 'button_confirm', [[id]]);
  }

  /**
   * Cancel purchase order
   */
  async cancelPurchaseOrder(id: number): Promise<boolean> {
    return this.execute<boolean>('purchase.order', 'button_cancel', [[id]]);
  }

  // ==================== Inventory ====================

  async getStockQuants(params: OdooSearchParams = {}): Promise<OdooStockQuant[]> {
    return this.searchRead<OdooStockQuant>('stock.quant', params);
  }

  async getStockQuantsByProduct(productId: number): Promise<OdooStockQuant[]> {
    return this.searchRead<OdooStockQuant>('stock.quant', {
      domain: [['product_id', '=', productId]],
    });
  }

  async getStockQuantsByLocation(locationId: number): Promise<OdooStockQuant[]> {
    return this.searchRead<OdooStockQuant>('stock.quant', {
      domain: [['location_id', '=', locationId]],
    });
  }

  /**
   * Create inventory adjustment
   */
  async createInventoryAdjustment(
    adjustment: Partial<OdooInventoryAdjustment>
  ): Promise<number> {
    return this.create('stock.inventory', adjustment);
  }

  /**
   * Validate inventory adjustment
   */
  async validateInventoryAdjustment(id: number): Promise<boolean> {
    return this.execute<boolean>('stock.inventory', 'action_validate', [[id]]);
  }

  // ==================== Invoices ====================

  async getInvoices(params: OdooSearchParams = {}): Promise<OdooInvoice[]> {
    return this.searchRead<OdooInvoice>('account.move', params);
  }

  async getInvoice(id: number, fields?: string[]): Promise<OdooInvoice> {
    const [invoice] = await this.read<OdooInvoice>('account.move', id, fields);
    return invoice;
  }

  async createInvoice(invoice: Partial<OdooInvoice>): Promise<number> {
    return this.create('account.move', invoice);
  }

  async updateInvoice(id: number, invoice: Partial<OdooInvoice>): Promise<boolean> {
    return this.write('account.move', id, invoice);
  }

  /**
   * Post invoice (confirm)
   */
  async postInvoice(id: number): Promise<boolean> {
    return this.execute<boolean>('account.move', 'action_post', [[id]]);
  }

  // ==================== Utility Methods ====================

  /**
   * Get all records (handling pagination automatically)
   */
  async fetchAll<T>(
    model: string,
    params: OdooSearchParams = {}
  ): Promise<T[]> {
    const pageSize = 100;
    let offset = 0;
    const results: T[] = [];

    while (true) {
      const page = await this.searchRead<T>(model, {
        ...params,
        offset,
        limit: pageSize,
      });

      if (page.length === 0) break;

      results.push(...page);
      offset += pageSize;

      if (page.length < pageSize) break;
    }

    return results;
  }

  /**
   * Get field metadata for a model
   */
  async getFields(model: string, fieldNames?: string[]): Promise<any> {
    return this.execute(
      model,
      'fields_get',
      fieldNames ? [fieldNames] : [],
      { attributes: ['string', 'help', 'type', 'required', 'readonly'] }
    );
  }

  /**
   * Call a custom method on a model
   */
  async callMethod<T>(
    model: string,
    method: string,
    recordIds: number[] = [],
    args: any[] = [],
    kwargs: Record<string, any> = {}
  ): Promise<T> {
    return this.execute<T>(model, method, [recordIds, ...args], kwargs);
  }
}
