/**
 * Delivery Cost Service
 *
 * Handles cost calculation and quote management
 */

import { query } from '@/lib/database/unified-connection';
import type {
  DeliveryCostQuote,
  DeliveryCostQuoteInsert,
  GetDeliveryQuotesRequest,
} from '@/types/logistics';
import { CourierProviderService } from './CourierProviderService';

export class DeliveryCostService {
  /**
   * Get cost quotes for a delivery request
   * This will fetch quotes from all active courier providers
   */
  static async getDeliveryQuotes(
    orgId: string,
    request: GetDeliveryQuotesRequest
  ): Promise<DeliveryCostQuote[]> {
    try {
      // Get all active courier providers
      const providers = await CourierProviderService.getActiveCourierProviders(orgId);

      // Import courier client factory
      const { createCourierClient } = await import('./CourierProviderClients');

      const quotes: DeliveryCostQuote[] = [];

      // Fetch quotes from each provider
      for (const provider of providers) {
        if (!provider.supports_quotes) continue;

        try {
          // Create client instance
          const client = createCourierClient(provider, provider.api_credentials || {});

          // Get quote from provider
          const quoteResponse = await client.getQuote({
            pickup_address: request.pickup_address,
            delivery_address: request.delivery_address,
            weight_kg: request.weight_kg,
            dimensions: request.dimensions,
            service_tier: request.service_tier,
            declared_value: request.declared_value,
            requires_signature: request.requires_signature,
            is_fragile: request.is_fragile,
            is_insured: request.is_insured,
          });

          // Create cost quote record
          const costQuote = await this.createCostQuote({
            org_id: orgId,
            courier_provider_id: provider.id,
            cost: quoteResponse.cost,
            currency: quoteResponse.currency,
            estimated_delivery_days: quoteResponse.estimated_delivery_days,
            estimated_delivery_date: quoteResponse.estimated_delivery_date,
            base_cost: quoteResponse.base_cost,
            fuel_surcharge: quoteResponse.fuel_surcharge,
            insurance_cost: quoteResponse.insurance_cost,
            other_fees: quoteResponse.other_fees,
            expires_at: quoteResponse.expires_at,
            quotation_id: request.quotation_id,
            sales_order_id: request.sales_order_id,
            metadata: {
              quote_id: quoteResponse.quote_id,
            },
          });

          quotes.push(costQuote);
        } catch (error) {
          console.error(`Error getting quote from ${provider.name}:`, error);
          // Continue with other providers even if one fails
        }
      }

      return quotes.sort((a, b) => a.cost - b.cost); // Sort by cost ascending
    } catch (error) {
      console.error('Error getting delivery quotes:', error);
      throw error;
    }
  }

  /**
   * Get cost quotes for a delivery
   */
  static async getCostQuotesForDelivery(
    deliveryId: string,
    orgId: string
  ): Promise<DeliveryCostQuote[]> {
    try {
      const result = await query<DeliveryCostQuote>(
        'SELECT * FROM delivery_cost_quotes WHERE delivery_id = $1 AND org_id = $2 ORDER BY cost ASC',
        [deliveryId, orgId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching cost quotes:', error);
      throw error;
    }
  }

  /**
   * Get cost quotes for a quotation
   */
  static async getCostQuotesForQuotation(
    quotationId: string,
    orgId: string
  ): Promise<DeliveryCostQuote[]> {
    try {
      const result = await query<DeliveryCostQuote>(
        'SELECT * FROM delivery_cost_quotes WHERE quotation_id = $1 AND org_id = $2 ORDER BY cost ASC',
        [quotationId, orgId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching cost quotes for quotation:', error);
      throw error;
    }
  }

  /**
   * Get selected cost quote
   */
  static async getSelectedCostQuote(
    deliveryId: string,
    orgId: string
  ): Promise<DeliveryCostQuote | null> {
    try {
      const result = await query<DeliveryCostQuote>(
        'SELECT * FROM delivery_cost_quotes WHERE delivery_id = $1 AND org_id = $2 AND is_selected = true LIMIT 1',
        [deliveryId, orgId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching selected cost quote:', error);
      throw error;
    }
  }

  /**
   * Create a cost quote
   */
  static async createCostQuote(data: DeliveryCostQuoteInsert): Promise<DeliveryCostQuote> {
    try {
      const insertSql = `
        INSERT INTO delivery_cost_quotes (
          org_id, delivery_id, quotation_id, sales_order_id,
          courier_provider_id, service_tier_id,
          cost, currency, estimated_delivery_days, estimated_delivery_date,
          base_cost, fuel_surcharge, insurance_cost, other_fees,
          is_selected, expires_at, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `;

      const result = await query<DeliveryCostQuote>(insertSql, [
        data.org_id,
        data.delivery_id || null,
        data.quotation_id || null,
        data.sales_order_id || null,
        data.courier_provider_id,
        data.service_tier_id || null,
        data.cost,
        data.currency || 'ZAR',
        data.estimated_delivery_days || null,
        data.estimated_delivery_date || null,
        data.base_cost || null,
        data.fuel_surcharge || null,
        data.insurance_cost || null,
        data.other_fees || null,
        data.is_selected || false,
        data.expires_at || null,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating cost quote:', error);
      throw error;
    }
  }

  /**
   * Select a cost quote (unselects others for the same delivery/quotation)
   */
  static async selectCostQuote(
    quoteId: string,
    orgId: string
  ): Promise<DeliveryCostQuote> {
    try {
      // Get the quote to find delivery/quotation IDs
      const quoteResult = await query<DeliveryCostQuote>(
        'SELECT * FROM delivery_cost_quotes WHERE id = $1 AND org_id = $2',
        [quoteId, orgId]
      );

      if (quoteResult.rows.length === 0) {
        throw new Error('Cost quote not found');
      }

      const quote = quoteResult.rows[0];

      // Unselect all other quotes for the same delivery/quotation
      if (quote.delivery_id) {
        await query(
          'UPDATE delivery_cost_quotes SET is_selected = false WHERE delivery_id = $1 AND org_id = $2 AND id != $3',
          [quote.delivery_id, orgId, quoteId]
        );
      } else if (quote.quotation_id) {
        await query(
          'UPDATE delivery_cost_quotes SET is_selected = false WHERE quotation_id = $1 AND org_id = $2 AND id != $3',
          [quote.quotation_id, orgId, quoteId]
        );
      } else if (quote.sales_order_id) {
        await query(
          'UPDATE delivery_cost_quotes SET is_selected = false WHERE sales_order_id = $1 AND org_id = $2 AND id != $3',
          [quote.sales_order_id, orgId, quoteId]
        );
      }

      // Select this quote
      const updateResult = await query<DeliveryCostQuote>(
        'UPDATE delivery_cost_quotes SET is_selected = true WHERE id = $1 AND org_id = $2 RETURNING *',
        [quoteId, orgId]
      );

      return updateResult.rows[0];
    } catch (error) {
      console.error('Error selecting cost quote:', error);
      throw error;
    }
  }

  /**
   * Delete cost quote
   */
  static async deleteCostQuote(id: string, orgId: string): Promise<void> {
    try {
      await query('DELETE FROM delivery_cost_quotes WHERE id = $1 AND org_id = $2', [
        id,
        orgId,
      ]);
    } catch (error) {
      console.error('Error deleting cost quote:', error);
      throw error;
    }
  }
}

