// @ts-nocheck

/**
 * WooCommerceService - Production-ready WooCommerce REST API v3 client
 * Implements OAuth 1.0a authentication and comprehensive API methods
 */

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
  timeout?: number;
  verifySsl?: boolean;
}

export interface WooCommerceProduct {
  id?: number;
  name: string;
  slug?: string;
  type?: 'simple' | 'grouped' | 'external' | 'variable';
  status?: 'draft' | 'pending' | 'private' | 'publish';
  featured?: boolean;
  catalog_visibility?: 'visible' | 'catalog' | 'search' | 'hidden';
  description?: string;
  short_description?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  categories?: Array<{ id: number; name?: string }>;
  images?: Array<{ id?: number; src: string; alt?: string }>;
  attributes?: Array<{
    id?: number;
    name: string;
    options: string[];
    visible?: boolean;
    variation?: boolean;
  }>;
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WooCommerceOrder {
  id?: number;
  parent_id?: number;
  number?: string;
  status?: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  currency?: string;
  date_created?: string;
  date_modified?: string;
  total?: string;
  total_tax?: string;
  billing?: WooCommerceAddress;
  shipping?: WooCommerceAddress;
  payment_method?: string;
  payment_method_title?: string;
  customer_id?: number;
  line_items?: WooCommerceLineItem[];
  shipping_lines?: Array<{
    id?: number;
    method_title: string;
    method_id: string;
    total: string;
  }>;
  fee_lines?: Array<{
    id?: number;
    name: string;
    total: string;
  }>;
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WooCommerceAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooCommerceLineItem {
  id?: number;
  name?: string;
  product_id?: number;
  variation_id?: number;
  quantity: number;
  tax_class?: string;
  subtotal?: string;
  total?: string;
  sku?: string;
  price?: number;
}

export interface WooCommerceCustomer {
  id?: number;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  billing?: WooCommerceAddress;
  shipping?: WooCommerceAddress;
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WooCommerceCategory {
  id?: number;
  name: string;
  slug?: string;
  parent?: number;
  description?: string;
  display?: 'default' | 'products' | 'subcategories' | 'both';
  image?: { id?: number; src: string; alt?: string };
}

export interface WooCommerceWebhook {
  id?: number;
  name: string;
  status?: 'active' | 'paused' | 'disabled';
  topic: string; // e.g., 'order.created', 'product.updated'
  resource: string; // e.g., 'order', 'product'
  event: string; // e.g., 'created', 'updated', 'deleted'
  delivery_url: string;
  secret?: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  order?: 'asc' | 'desc';
  orderby?: string;
}

export interface WooCommerceResponse<T> {
  data: T;
  headers: Record<string, string>;
}

export class WooCommerceService {
  private config: Required<WooCommerceConfig>;
  private oauth: OAuth;
  private baseUrl: string;

  constructor(config: WooCommerceConfig) {
    const legacyConfig = config as Record<string, unknown>;

    const rawUrl =
      (config.url as string | undefined)?.trim() ||
      (legacyConfig.store_url as string | undefined)?.trim() ||
      (legacyConfig.storeUrl as string | undefined)?.trim() ||
      '';
    if (!rawUrl) {
      throw new Error('WooCommerce config missing store URL');
    }

    const consumerKey =
      config.consumerKey ||
      (legacyConfig.consumer_key as string | undefined) ||
      (legacyConfig.consumerKey as string | undefined);
    if (!consumerKey) {
      throw new Error('WooCommerce config missing consumer key');
    }

    const consumerSecret =
      config.consumerSecret ||
      (legacyConfig.consumer_secret as string | undefined) ||
      (legacyConfig.consumerSecret as string | undefined);
    if (!consumerSecret) {
      throw new Error('WooCommerce config missing consumer secret');
    }

    const version = config.version || (legacyConfig.version as string | undefined) || 'wc/v3';

    const timeout = config.timeout || (legacyConfig.timeout as number | undefined) || 30000;

    const verifySslFlag =
      config.verifySsl ??
      (legacyConfig.verifySsl as boolean | undefined) ??
      (legacyConfig.verify_ssl as boolean | undefined);

    this.config = {
      url: rawUrl.replace(/\/$/, ''),
      consumerKey,
      consumerSecret,
      version,
      timeout,
      verifySsl: verifySslFlag !== false,
    };

    this.baseUrl = `${this.config.url}/wp-json/${this.config.version}`;

    // Initialize OAuth 1.0a
    this.oauth = new OAuth({
      consumer: {
        key: this.config.consumerKey,
        secret: this.config.consumerSecret,
      },
      signature_method: 'HMAC-SHA256',
      hash_function(base_string, key) {
        return crypto.createHmac('sha256', key).update(base_string).digest('base64');
      },
    });
  }

  /**
   * Make authenticated request to WooCommerce API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<WooCommerceResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Build query parameters object for OAuth signature
    // For OAuth 1.0a: query params must be included in signature base string
    const oauthData: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          oauthData[key] = String(value);
        }
      });
    }

    // Create request data for OAuth signature
    // WooCommerce uses two-legged OAuth (no token), so we pass null as second param
    const requestData = {
      url,
      method,
      data: oauthData, // Query params MUST be in data field for signature
    };

    // Generate OAuth signature - no token needed for WooCommerce (two-legged OAuth)
    const authorized = this.oauth.authorize(requestData);
    const authHeader = this.oauth.toHeader(authorized);

    // Debug logging disabled by default - enable with WOOCOMMERCE_DEBUG=true env var
    // if (process.env.WOOCOMMERCE_DEBUG === 'true') {
    //   console.log('[WooCommerce OAuth Debug]', {
    //     method,
    //     url,
    //     queryParams: oauthData,
    //     signatureParams: Object.keys(authorized).sort(),
    //     authorizationHeader: authHeader.Authorization?.substring(0, 100) + '...',
    //   });
    // }

    // Build query string for actual request
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

    // Make request
    const response = await fetch(fullUrl, {
      method,
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `WooCommerce API Error (${response.status}): ${error.message || response.statusText}`
      );
    }

    const responseData = await response.json();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      data: responseData,
      headers,
    };
  }

  /**
   * Test connection to WooCommerce store
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/system_status');
      return true;
    } catch (error) {
      console.error('WooCommerce connection test failed:', error);
      return false;
    }
  }

  // ==================== Products ====================

  async getProducts(
    params?: PaginationParams & {
      search?: string;
      status?: string;
      category?: number;
      sku?: string;
    }
  ): Promise<WooCommerceResponse<WooCommerceProduct[]>> {
    return this.request<WooCommerceProduct[]>('GET', '/products', null, params);
  }

  async getProduct(id: number): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.request<WooCommerceProduct>('GET', `/products/${id}`);
  }

  async createProduct(
    product: WooCommerceProduct
  ): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.request<WooCommerceProduct>('POST', '/products', product);
  }

  async updateProduct(
    id: number,
    product: Partial<WooCommerceProduct>
  ): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.request<WooCommerceProduct>('PUT', `/products/${id}`, product);
  }

  async deleteProduct(id: number, force = false): Promise<WooCommerceResponse<WooCommerceProduct>> {
    return this.request<WooCommerceProduct>('DELETE', `/products/${id}`, null, { force });
  }

  async batchUpdateProducts(data: {
    create?: WooCommerceProduct[];
    update?: WooCommerceProduct[];
    delete?: number[];
  }): Promise<
    WooCommerceResponse<{
      create: WooCommerceProduct[];
      update: WooCommerceProduct[];
      delete: WooCommerceProduct[];
    }>
  > {
    return this.request('POST', '/products/batch', data);
  }

  // ==================== Orders ====================

  async getOrders(
    params?: PaginationParams & {
      status?: string;
      customer?: number;
      product?: number;
      after?: string;
      before?: string;
    }
  ): Promise<WooCommerceResponse<WooCommerceOrder[]>> {
    return this.request<WooCommerceOrder[]>('GET', '/orders', null, params);
  }

  async getOrder(id: number): Promise<WooCommerceResponse<WooCommerceOrder>> {
    return this.request<WooCommerceOrder>('GET', `/orders/${id}`);
  }

  async createOrder(
    order: Partial<WooCommerceOrder>
  ): Promise<WooCommerceResponse<WooCommerceOrder>> {
    return this.request<WooCommerceOrder>('POST', '/orders', order);
  }

  async updateOrder(
    id: number,
    order: Partial<WooCommerceOrder>
  ): Promise<WooCommerceResponse<WooCommerceOrder>> {
    return this.request<WooCommerceOrder>('PUT', `/orders/${id}`, order);
  }

  async deleteOrder(id: number, force = false): Promise<WooCommerceResponse<WooCommerceOrder>> {
    return this.request<WooCommerceOrder>('DELETE', `/orders/${id}`, null, { force });
  }

  // ==================== Customers ====================

  async getCustomers(
    params?: PaginationParams & {
      email?: string;
      search?: string;
      role?: string;
    }
  ): Promise<WooCommerceResponse<WooCommerceCustomer[]>> {
    return this.request<WooCommerceCustomer[]>('GET', '/customers', null, params);
  }

  async getCustomer(id: number): Promise<WooCommerceResponse<WooCommerceCustomer>> {
    return this.request<WooCommerceCustomer>('GET', `/customers/${id}`);
  }

  async createCustomer(
    customer: WooCommerceCustomer
  ): Promise<WooCommerceResponse<WooCommerceCustomer>> {
    return this.request<WooCommerceCustomer>('POST', '/customers', customer);
  }

  async updateCustomer(
    id: number,
    customer: Partial<WooCommerceCustomer>
  ): Promise<WooCommerceResponse<WooCommerceCustomer>> {
    return this.request<WooCommerceCustomer>('PUT', `/customers/${id}`, customer);
  }

  async deleteCustomer(
    id: number,
    force = false
  ): Promise<WooCommerceResponse<WooCommerceCustomer>> {
    return this.request<WooCommerceCustomer>('DELETE', `/customers/${id}`, null, { force });
  }

  // ==================== Categories ====================

  async getCategories(
    params?: PaginationParams & {
      parent?: number;
      search?: string;
    }
  ): Promise<WooCommerceResponse<WooCommerceCategory[]>> {
    return this.request<WooCommerceCategory[]>('GET', '/products/categories', null, params);
  }

  async getCategory(id: number): Promise<WooCommerceResponse<WooCommerceCategory>> {
    return this.request<WooCommerceCategory>('GET', `/products/categories/${id}`);
  }

  async createCategory(
    category: WooCommerceCategory
  ): Promise<WooCommerceResponse<WooCommerceCategory>> {
    return this.request<WooCommerceCategory>('POST', '/products/categories', category);
  }

  async updateCategory(
    id: number,
    category: Partial<WooCommerceCategory>
  ): Promise<WooCommerceResponse<WooCommerceCategory>> {
    return this.request<WooCommerceCategory>('PUT', `/products/categories/${id}`, category);
  }

  // ==================== Webhooks ====================

  async getWebhooks(params?: PaginationParams): Promise<WooCommerceResponse<WooCommerceWebhook[]>> {
    return this.request<WooCommerceWebhook[]>('GET', '/webhooks', null, params);
  }

  async getWebhook(id: number): Promise<WooCommerceResponse<WooCommerceWebhook>> {
    return this.request<WooCommerceWebhook>('GET', `/webhooks/${id}`);
  }

  async createWebhook(
    webhook: WooCommerceWebhook
  ): Promise<WooCommerceResponse<WooCommerceWebhook>> {
    return this.request<WooCommerceWebhook>('POST', '/webhooks', webhook);
  }

  async updateWebhook(
    id: number,
    webhook: Partial<WooCommerceWebhook>
  ): Promise<WooCommerceResponse<WooCommerceWebhook>> {
    return this.request<WooCommerceWebhook>('PUT', `/webhooks/${id}`, webhook);
  }

  async deleteWebhook(id: number, force = false): Promise<WooCommerceResponse<WooCommerceWebhook>> {
    return this.request<WooCommerceWebhook>('DELETE', `/webhooks/${id}`, null, { force });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('base64');

    return hash === signature;
  }

  // ==================== Stock Management ====================

  async updateStock(
    productId: number,
    quantity: number,
    operation: 'set' | 'increase' | 'decrease' = 'set'
  ): Promise<WooCommerceResponse<WooCommerceProduct>> {
    let newQuantity = quantity;

    if (operation !== 'set') {
      const { data: product } = await this.getProduct(productId);
      const currentQuantity = product.stock_quantity || 0;
      newQuantity =
        operation === 'increase' ? currentQuantity + quantity : currentQuantity - quantity;
    }

    return this.updateProduct(productId, {
      stock_quantity: Math.max(0, newQuantity),
      manage_stock: true,
    });
  }

  // ==================== Utility Methods ====================

  /**
   * Get total count from response headers
   */
  getTotalCount(response: WooCommerceResponse<unknown>): number {
    return parseInt(response.headers['x-wp-total'] || '0', 10);
  }

  /**
   * Get total pages from response headers
   */
  getTotalPages(response: WooCommerceResponse<unknown>): number {
    return parseInt(response.headers['x-wp-totalpages'] || '0', 10);
  }

  /**
   * Fetch all pages of a resource
   */
  async fetchAllPages<T>(
    fetchFunction: (params: PaginationParams) => Promise<WooCommerceResponse<T[]>>,
    params: PaginationParams = {},
    options: { maxPages?: number } = {}
  ): Promise<T[]> {
    const results: T[] = [];
    const perPage = Math.min(Math.max(params.per_page ?? 100, 1), 100);
    const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY;

    let page = 1;

    while (true) {
      const response = await fetchFunction({ ...params, page, per_page: perPage });
      results.push(...response.data);

      const totalPages = this.getTotalPages(response);
      const reachedHeaderLimit =
        totalPages > 0 ? page >= totalPages : response.data.length < perPage;
      const reachedCustomLimit = page >= maxPages;

      if (reachedHeaderLimit || reachedCustomLimit) {
        break;
      }

      page++;
    }

    return results;
  }
}
