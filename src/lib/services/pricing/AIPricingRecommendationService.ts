/**
 * AI Pricing Recommendation Service
 * Generates AI-powered pricing recommendations integrated with existing AI Services
 */

import { generateText } from 'ai';
import { query } from '../../../../lib/database/unified-connection';
import { AIServiceConfigService } from '../../ai/services/AIServiceConfigService';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export interface PricingRecommendationInput {
  supplier_product_id: string;
  product_name: string;
  unit_cost: number;
  current_price: number; // Rule-based price
  org_id: string;
  supplier_discounts?: number;
  historical_sales?: number;
  market_context?: string;
}

export interface PricingRecommendationResult {
  recommendation_id: string;
  recommended_price: number;
  confidence_score: number;
  reasoning: string;
  risk_factors: string[];
  impact_on_revenue: number | null;
  impact_on_margin: number | null;
  impact_on_volume: number | null;
  review_status: 'pending';
  eligible_for_auto_apply: boolean;
}

export class AIPricingRecommendationService {
  private aiServiceConfig: AIServiceConfigService;

  constructor() {
    this.aiServiceConfig = new AIServiceConfigService();
  }

  /**
   * Generate AI pricing recommendation for a SOH item
   */
  async generateRecommendation(
    input: PricingRecommendationInput
  ): Promise<PricingRecommendationResult> {
    const {
      supplier_product_id,
      product_name,
      unit_cost,
      current_price,
      org_id,
      supplier_discounts = 0,
      historical_sales = 0,
      market_context = '',
    } = input;

    // Get AI service configuration for the organization
    const aiConfig = await this.aiServiceConfig.getConfig(org_id, 'pricing_recommendation');

    if (!aiConfig || !aiConfig.is_enabled) {
      throw new Error('AI pricing recommendation service not configured for organization');
    }

    // Check rate limits
    const canProceed = await this.aiServiceConfig.checkRateLimit(org_id, 'pricing_recommendation');
    if (!canProceed) {
      throw new Error('AI service rate limit exceeded');
    }

    // Get the AI model
    const model = this.getAIModel(aiConfig.ai_provider, aiConfig.model_name);

    // Construct prompt for AI pricing recommendation
    const prompt = this.buildPricingPrompt({
      product_name,
      unit_cost,
      current_price,
      supplier_discounts,
      historical_sales,
      market_context,
    });

    try {
      // Generate AI recommendation
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.3, // Lower temperature for more consistent pricing
        maxTokens: 1000,
      });

      // Parse AI response
      const aiResponse = this.parseAIResponse(text);

      // Get pricing automation config to check auto-activation eligibility
      const pricingConfig = await this.getPricingAutomationConfig(org_id);

      // Save recommendation to database
      const recommendation_id = await this.saveRecommendation({
        org_id,
        inventory_item_id: supplier_product_id,
        current_price,
        recommended_price: aiResponse.recommended_price,
        confidence_score: aiResponse.confidence_score,
        reasoning: aiResponse.reasoning,
        risk_factors: aiResponse.risk_factors,
        impact_on_revenue: aiResponse.impact_on_revenue,
        impact_on_margin: aiResponse.impact_on_margin,
        impact_on_volume: aiResponse.impact_on_volume,
      });

      // Determine if eligible for auto-activation
      const eligible_for_auto_apply =
        pricingConfig.enable_auto_activation &&
        aiResponse.confidence_score >= pricingConfig.auto_activation_confidence_threshold;

      // Auto-apply if eligible
      if (eligible_for_auto_apply) {
        await this.autoApplyRecommendation(recommendation_id, supplier_product_id, aiResponse.recommended_price);
      }

      return {
        recommendation_id,
        recommended_price: aiResponse.recommended_price,
        confidence_score: aiResponse.confidence_score,
        reasoning: aiResponse.reasoning,
        risk_factors: aiResponse.risk_factors,
        impact_on_revenue: aiResponse.impact_on_revenue,
        impact_on_margin: aiResponse.impact_on_margin,
        impact_on_volume: aiResponse.impact_on_volume,
        review_status: 'pending',
        eligible_for_auto_apply,
      };
    } catch (error) {
      console.error('AI pricing recommendation failed:', error);
      throw new Error(`Failed to generate AI pricing recommendation: ${error}`);
    }
  }

  /**
   * Get AI model based on provider configuration
   */
  private getAIModel(provider: string, model_name: string) {
    switch (provider) {
      case 'anthropic':
        return anthropic(model_name || 'claude-3-5-sonnet-20241022');

      case 'openai':
        return openai(model_name || 'gpt-4o');

      case 'azure_openai':
        // Azure OpenAI requires additional configuration
        return openai(model_name || 'gpt-4o');

      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Build pricing recommendation prompt
   */
  private buildPricingPrompt(data: {
    product_name: string;
    unit_cost: number;
    current_price: number;
    supplier_discounts: number;
    historical_sales: number;
    market_context: string;
  }): string {
    const adjustedCost = data.unit_cost - data.supplier_discounts;
    const currentMargin = data.current_price - adjustedCost;
    const currentMarginPct = (currentMargin / adjustedCost) * 100;

    return `You are a pricing optimization expert. Analyze the following product and recommend an optimal selling price.

Product: ${data.product_name}
Unit Cost (after discounts): $${adjustedCost.toFixed(2)}
Current Rule-Based Price: $${data.current_price.toFixed(2)} (${currentMarginPct.toFixed(1)}% margin)
Historical Monthly Sales: ${data.historical_sales} units
${data.market_context ? `Market Context: ${data.market_context}` : ''}

Consider:
1. Profit margin optimization
2. Price elasticity and demand sensitivity
3. Competitive positioning
4. Market conditions
5. Sales volume trade-offs

Provide your recommendation in the following JSON format:
{
  "recommended_price": <number>,
  "confidence_score": <number 0-100>,
  "reasoning": "<detailed explanation>",
  "risk_factors": ["<risk 1>", "<risk 2>"],
  "impact_on_revenue": <percentage change estimate or null>,
  "impact_on_margin": <percentage change estimate or null>,
  "impact_on_volume": <percentage change estimate or null>
}

Respond with ONLY the JSON object, no additional text.`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(text: string) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        recommended_price: parseFloat(parsed.recommended_price),
        confidence_score: parseFloat(parsed.confidence_score),
        reasoning: parsed.reasoning,
        risk_factors: Array.isArray(parsed.risk_factors) ? parsed.risk_factors : [],
        impact_on_revenue: parsed.impact_on_revenue ? parseFloat(parsed.impact_on_revenue) : null,
        impact_on_margin: parsed.impact_on_margin ? parseFloat(parsed.impact_on_margin) : null,
        impact_on_volume: parsed.impact_on_volume ? parseFloat(parsed.impact_on_volume) : null,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Save pricing recommendation to database
   */
  private async saveRecommendation(data: {
    org_id: string;
    inventory_item_id: string;
    current_price: number;
    recommended_price: number;
    confidence_score: number;
    reasoning: string;
    risk_factors: string[];
    impact_on_revenue: number | null;
    impact_on_margin: number | null;
    impact_on_volume: number | null;
  }): Promise<string> {
    const result = await query<{ id: string }>(
      `
      INSERT INTO pricing_recommendation (
        org_id,
        inventory_item_id,
        current_price,
        recommended_price,
        confidence_score,
        reasoning,
        risk_factors,
        impact_on_revenue,
        impact_on_margin,
        impact_on_volume,
        review_status,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'active')
      RETURNING id
      `,
      [
        data.org_id,
        data.inventory_item_id,
        data.current_price,
        data.recommended_price,
        data.confidence_score,
        data.reasoning,
        JSON.stringify(data.risk_factors),
        data.impact_on_revenue,
        data.impact_on_margin,
        data.impact_on_volume,
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Auto-apply recommendation if confidence threshold met
   */
  private async autoApplyRecommendation(
    recommendation_id: string,
    supplier_product_id: string,
    recommended_price: number
  ): Promise<void> {
    await query(
      `
      BEGIN;

      -- Update recommendation as auto-applied
      UPDATE pricing_recommendation
      SET
        review_status = 'auto_approved',
        auto_applied = true,
        applied_at = NOW()
      WHERE id = $1;

      -- Update SOH with AI-recommended price
      UPDATE core.stock_on_hand
      SET
        selling_price = $2,
        pricing_recommendation_id = $1,
        price_calculated_at = NOW(),
        price_source = 'ai_recommendation'
      WHERE supplier_product_id = $3;

      COMMIT;
      `,
      [recommendation_id, recommended_price, supplier_product_id]
    );
  }

  /**
   * Get pricing automation configuration
   */
  private async getPricingAutomationConfig(org_id: string) {
    const result = await query<{
      enable_auto_activation: boolean;
      auto_activation_confidence_threshold: number;
    }>(
      `SELECT * FROM get_pricing_automation_config($1)`,
      [org_id]
    );

    if (result.rows.length === 0) {
      return {
        enable_auto_activation: false,
        auto_activation_confidence_threshold: 85.0,
      };
    }

    return result.rows[0];
  }

  /**
   * Approve pricing recommendation manually
   */
  async approveRecommendation(
    recommendation_id: string,
    reviewed_by: string,
    review_notes?: string
  ): Promise<void> {
    // Get recommendation details
    const recResult = await query<{
      inventory_item_id: string;
      recommended_price: number;
    }>(
      `SELECT inventory_item_id, recommended_price FROM pricing_recommendation WHERE id = $1`,
      [recommendation_id]
    );

    if (recResult.rows.length === 0) {
      throw new Error('Recommendation not found');
    }

    const { inventory_item_id, recommended_price } = recResult.rows[0];

    // Apply the recommendation
    await query(
      `
      BEGIN;

      -- Update recommendation status
      UPDATE pricing_recommendation
      SET
        review_status = 'approved',
        reviewed_by = $2,
        reviewed_at = NOW(),
        review_notes = $3,
        applied_at = NOW()
      WHERE id = $1;

      -- Update SOH with approved price
      UPDATE core.stock_on_hand
      SET
        selling_price = $4,
        pricing_recommendation_id = $1,
        price_calculated_at = NOW(),
        price_source = 'ai_recommendation'
      WHERE supplier_product_id = $5;

      COMMIT;
      `,
      [recommendation_id, reviewed_by, review_notes, recommended_price, inventory_item_id]
    );
  }

  /**
   * Reject pricing recommendation
   */
  async rejectRecommendation(
    recommendation_id: string,
    reviewed_by: string,
    review_notes: string
  ): Promise<void> {
    await query(
      `
      UPDATE pricing_recommendation
      SET
        review_status = 'rejected',
        reviewed_by = $2,
        reviewed_at = NOW(),
        review_notes = $3
      WHERE id = $1
      `,
      [recommendation_id, reviewed_by, review_notes]
    );
  }

  /**
   * Bulk generate recommendations for multiple products
   */
  async bulkGenerateRecommendations(
    inputs: PricingRecommendationInput[]
  ): Promise<PricingRecommendationResult[]> {
    const results: PricingRecommendationResult[] = [];

    for (const input of inputs) {
      try {
        const result = await this.generateRecommendation(input);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate recommendation for ${input.supplier_product_id}:`, error);
        // Continue with other items
      }
    }

    return results;
  }
}

// Export singleton instance
export const aiPricingRecommendationService = new AIPricingRecommendationService();
