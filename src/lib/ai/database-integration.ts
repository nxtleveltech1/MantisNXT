/**
 * AI Database Integration Service
 *
 * Provides AI-powered database operations:
 * - Natural language to SQL conversion
 * - Intelligent data analysis
 * - Anomaly detection
 * - Predictive analytics
 *
 * Uses Vercel AI SDK v5 with Anthropic Claude for optimal database reasoning
 */

import { generateObject, generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { query, withTransaction } from '@/lib/database/connection';
import { PoolClient } from 'pg';

// ============================================================================
// SCHEMAS FOR STRUCTURED AI OUTPUTS
// ============================================================================

const SQLQuerySchema = z.object({
  sql: z.string().describe('The generated SQL query'),
  parameters: z.array(z.any()).describe('Query parameters for safe execution'),
  explanation: z.string().describe('Human-readable explanation of what the query does'),
  safety_score: z.number().min(0).max(1).describe('Safety score (1 = completely safe)'),
  estimated_rows: z.number().optional().describe('Estimated number of rows returned'),
});

const DataAnalysisSchema = z.object({
  summary: z.string().describe('High-level summary of findings'),
  insights: z.array(z.object({
    category: z.string().describe('Category: trend, pattern, risk, opportunity'),
    title: z.string().describe('Insight title'),
    description: z.string().describe('Detailed description'),
    impact: z.enum(['low', 'medium', 'high', 'critical']).describe('Business impact level'),
    actionable: z.boolean().describe('Can immediate action be taken?'),
    recommendation: z.string().optional().describe('Recommended action'),
  })).describe('Specific insights discovered'),
  metrics: z.object({
    total_records: z.number(),
    data_quality_score: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
    anomalies_found: z.number(),
  }).describe('Data quality metrics'),
  visualizations: z.array(z.object({
    type: z.enum(['line', 'bar', 'pie', 'scatter', 'heatmap']),
    title: z.string(),
    data_query: z.string().describe('SQL to fetch visualization data'),
  })).optional().describe('Recommended visualizations'),
});

const AnomalyDetectionSchema = z.object({
  anomalies: z.array(z.object({
    id: z.string().describe('Unique anomaly identifier'),
    type: z.enum(['data_quality', 'statistical', 'business_rule', 'security']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    title: z.string().describe('Anomaly title'),
    description: z.string().describe('Detailed description'),
    affected_records: z.number().describe('Number of records affected'),
    detection_method: z.string().describe('How this was detected'),
    suggested_fix: z.string().optional().describe('Recommended fix'),
    sql_to_fix: z.string().optional().describe('SQL to fix the issue'),
  })).describe('List of detected anomalies'),
  overall_health_score: z.number().min(0).max(1).describe('Overall data health (1 = perfect)'),
  recommendations: z.array(z.string()).describe('General recommendations'),
});

const PredictionSchema = z.object({
  prediction_type: z.string().describe('Type of prediction'),
  predictions: z.array(z.object({
    date: z.string().describe('Prediction date'),
    value: z.number().describe('Predicted value'),
    confidence: z.number().min(0).max(1).describe('Confidence level'),
    lower_bound: z.number().optional(),
    upper_bound: z.number().optional(),
  })).describe('Time-series predictions'),
  factors: z.array(z.object({
    name: z.string(),
    impact: z.number().describe('Impact on prediction (-1 to 1)'),
    description: z.string(),
  })).describe('Factors influencing predictions'),
  confidence: z.number().min(0).max(1).describe('Overall confidence'),
  recommendations: z.array(z.string()).describe('Action recommendations'),
});

// ============================================================================
// DATABASE SCHEMA CONTEXT
// ============================================================================

const DATABASE_SCHEMA = `
MantisNXT Database Schema:

CORE TABLES:
- suppliers: id, name, email, phone, address, status, created_at, updated_at
- products: id, name, sku, description, category, unit_price, supplier_id, created_at
- inventory_items: id, product_id, warehouse_id, quantity, reorder_level, reorder_quantity, location
- purchase_orders: id, supplier_id, order_date, delivery_date, status, total_amount, notes
- purchase_order_items: id, purchase_order_id, product_id, quantity, unit_price, total
- invoices: id, supplier_id, invoice_number, invoice_date, due_date, amount, status
- stock_movements: id, product_id, warehouse_id, quantity, movement_type, reference_id, created_at

ANALYTICS TABLES:
- analytics_predictions: Cached AI predictions
- analytics_anomalies: Detected data anomalies
- analytics_recommendations: Business recommendations
- supplier_performance: Supplier performance metrics
- ai_insights: Stored AI insights

VIEWS:
- v_inventory_analytics: Inventory health metrics
- v_supplier_performance_summary: Supplier performance overview
- v_purchase_order_analytics: PO analytics
- supplier_inventory_performance: Supplier inventory metrics

KEY RELATIONSHIPS:
- products.supplier_id -> suppliers.id
- inventory_items.product_id -> products.id
- purchase_order_items.purchase_order_id -> purchase_orders.id
- purchase_order_items.product_id -> products.id
- invoices.supplier_id -> suppliers.id
`;

// ============================================================================
// AI DATABASE SERVICE
// ============================================================================

export class AIDatabaseService {
  private model = anthropic('claude-3-5-sonnet-20241022');
  private fallbackModel = openai('gpt-4-turbo');

  /**
   * Convert natural language query to SQL
   */
  async naturalLanguageToSQL(userQuery: string): Promise<{
    sql: string;
    parameters: any[];
    explanation: string;
    safety_score: number;
    estimated_rows?: number;
  }> {
    try {
      const result = await generateObject({
        model: this.model,
        schema: SQLQuerySchema,
        prompt: `You are a PostgreSQL expert. Convert this natural language query to SQL.

Database Schema:
${DATABASE_SCHEMA}

User Query: "${userQuery}"

Requirements:
1. Generate SAFE, READ-ONLY SQL (SELECT only, no DELETE/UPDATE/DROP)
2. Use parameterized queries to prevent SQL injection
3. Include JOINs for related data
4. Add appropriate WHERE, ORDER BY, LIMIT clauses
5. Calculate safety_score (1.0 = completely safe read-only, 0.0 = dangerous)
6. Provide clear explanation of what the query does
7. Estimate rows returned if possible

Return a valid SQL query that answers the user's question.`,
      });

      return result.object;
    } catch (error) {
      console.error('Error in naturalLanguageToSQL:', error);
      throw new Error(`Failed to convert query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute natural language query safely
   */
  async executeNaturalLanguageQuery(userQuery: string): Promise<{
    data: any[];
    rowCount: number;
    explanation: string;
    query_generated: string;
    execution_time_ms: number;
  }> {
    const startTime = Date.now();

    // Generate SQL from natural language
    const sqlResult = await this.naturalLanguageToSQL(userQuery);

    // Safety check
    if (sqlResult.safety_score < 0.8) {
      throw new Error(`Query rejected for safety reasons (score: ${sqlResult.safety_score}). This query might modify data or pose security risks.`);
    }

    // Execute query
    const result = await query(sqlResult.sql, sqlResult.parameters);

    const executionTime = Date.now() - startTime;

    // Log query to history
    await this.logQueryHistory({
      user_query: userQuery,
      generated_sql: sqlResult.sql,
      result_count: result.rowCount || 0,
      execution_time_ms: executionTime,
    });

    return {
      data: result.rows,
      rowCount: result.rowCount || 0,
      explanation: sqlResult.explanation,
      query_generated: sqlResult.sql,
      execution_time_ms: executionTime,
    };
  }

  /**
   * Analyze data with AI insights
   */
  async analyzeData(options: {
    table?: string;
    query?: string;
    focus?: 'trends' | 'patterns' | 'risks' | 'opportunities' | 'all';
  }): Promise<z.infer<typeof DataAnalysisSchema>> {
    // Fetch data to analyze
    let dataQuery = options.query;
    if (!dataQuery && options.table) {
      dataQuery = `SELECT * FROM ${options.table} LIMIT 1000`;
    }

    if (!dataQuery) {
      throw new Error('Either table or query must be provided');
    }

    const result = await query(dataQuery);
    const sampleData = result.rows.slice(0, 100); // Analyze sample

    try {
      const analysis = await generateObject({
        model: this.model,
        schema: DataAnalysisSchema,
        prompt: `You are a business intelligence analyst. Analyze this data and provide insights.

Database Schema:
${DATABASE_SCHEMA}

Data Sample (${sampleData.length} records):
${JSON.stringify(sampleData, null, 2)}

Total Records: ${result.rowCount}
Focus Area: ${options.focus || 'all'}

Provide:
1. High-level summary of findings
2. Specific insights (trends, patterns, risks, opportunities)
3. Data quality metrics
4. Recommended visualizations with SQL queries
5. Actionable recommendations

Focus on business value and actionable insights.`,
      });

      // Store insights
      await this.storeInsights({
        analysis_type: 'data_analysis',
        input_data: { table: options.table, focus: options.focus },
        insights: analysis.object,
      });

      return analysis.object;
    } catch (error) {
      console.error('Error in analyzeData:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect anomalies in data
   */
  async detectAnomalies(options: {
    table?: string;
    query?: string;
    checks?: ('data_quality' | 'statistical' | 'business_rule' | 'security')[];
  }): Promise<z.infer<typeof AnomalyDetectionSchema>> {
    // Fetch data
    let dataQuery = options.query;
    if (!dataQuery && options.table) {
      dataQuery = `SELECT * FROM ${options.table} LIMIT 1000`;
    }

    if (!dataQuery) {
      throw new Error('Either table or query must be provided');
    }

    const result = await query(dataQuery);

    try {
      const detection = await generateObject({
        model: this.model,
        schema: AnomalyDetectionSchema,
        prompt: `You are a data quality expert. Detect anomalies in this data.

Database Schema:
${DATABASE_SCHEMA}

Data Sample:
${JSON.stringify(result.rows.slice(0, 100), null, 2)}

Total Records: ${result.rowCount}
Checks to Perform: ${options.checks?.join(', ') || 'all'}

Detect:
1. Data Quality Issues: NULL values, invalid formats, duplicates
2. Statistical Anomalies: Outliers, unexpected distributions
3. Business Rule Violations: Invalid states, constraint violations
4. Security Issues: Suspicious patterns, unauthorized access

For each anomaly:
- Classify type and severity
- Count affected records
- Explain detection method
- Suggest fix with SQL if possible

Calculate overall health score (1.0 = perfect).`,
      });

      // Store anomalies
      for (const anomaly of detection.object.anomalies) {
        await this.storeAnomaly({
          type: anomaly.type,
          severity: anomaly.severity,
          title: anomaly.title,
          description: anomaly.description,
          affected_records: anomaly.affected_records,
          detection_method: anomaly.detection_method,
          suggested_fix: anomaly.suggested_fix,
        });
      }

      return detection.object;
    } catch (error) {
      console.error('Error in detectAnomalies:', error);
      throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate predictions
   */
  async generatePredictions(options: {
    type: 'inventory_demand' | 'supplier_performance' | 'price_trends' | 'stock_levels';
    target_id?: number;
    forecast_days?: number;
  }): Promise<z.infer<typeof PredictionSchema>> {
    const forecastDays = options.forecast_days || 30;

    // Fetch historical data based on prediction type
    let historicalQuery = '';
    switch (options.type) {
      case 'inventory_demand':
        historicalQuery = `
          SELECT date_trunc('day', created_at) as date, SUM(quantity) as value
          FROM stock_movements
          WHERE movement_type = 'out'
          ${options.target_id ? `AND product_id = ${options.target_id}` : ''}
          GROUP BY date_trunc('day', created_at)
          ORDER BY date DESC
          LIMIT 90
        `;
        break;
      case 'supplier_performance':
        historicalQuery = `
          SELECT date_trunc('day', order_date) as date, COUNT(*) as value
          FROM purchase_orders
          WHERE status = 'completed'
          ${options.target_id ? `AND supplier_id = ${options.target_id}` : ''}
          GROUP BY date_trunc('day', order_date)
          ORDER BY date DESC
          LIMIT 90
        `;
        break;
      case 'stock_levels':
        historicalQuery = `
          SELECT date_trunc('day', created_at) as date, AVG(quantity) as value
          FROM inventory_items
          ${options.target_id ? `AND product_id = ${options.target_id}` : ''}
          GROUP BY date_trunc('day', created_at)
          ORDER BY date DESC
          LIMIT 90
        `;
        break;
      default:
        throw new Error(`Unsupported prediction type: ${options.type}`);
    }

    const historicalData = await query(historicalQuery);

    try {
      const prediction = await generateObject({
        model: this.model,
        schema: PredictionSchema,
        prompt: `You are a forecasting expert. Generate predictions based on historical data.

Prediction Type: ${options.type}
Forecast Period: ${forecastDays} days

Historical Data (last 90 days):
${JSON.stringify(historicalData.rows, null, 2)}

Provide:
1. Daily predictions for next ${forecastDays} days
2. Confidence intervals (lower_bound, upper_bound)
3. Key factors influencing predictions
4. Overall confidence score
5. Actionable recommendations

Use statistical patterns, seasonality, and trends to make accurate predictions.`,
      });

      // Cache predictions
      await this.cachePrediction({
        prediction_type: options.type,
        target_id: options.target_id,
        predictions: prediction.object,
        confidence: prediction.object.confidence,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      return prediction.object;
    } catch (error) {
      console.error('Error in generatePredictions:', error);
      throw new Error(`Prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream AI analysis (for real-time insights)
   */
  async streamAnalysis(userQuery: string): AsyncIterable<string> {
    const stream = await streamText({
      model: this.model,
      prompt: `You are a data analyst. Analyze this query and provide insights.

Database Schema:
${DATABASE_SCHEMA}

User Query: "${userQuery}"

Provide real-time analysis as you think through the data.`,
    });

    return stream.textStream;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async logQueryHistory(data: {
    user_query: string;
    generated_sql: string;
    result_count: number;
    execution_time_ms: number;
  }): Promise<void> {
    try {
      await query(`
        INSERT INTO ai_query_history (user_query, generated_sql, result_count, execution_time_ms)
        VALUES ($1, $2, $3, $4)
      `, [data.user_query, data.generated_sql, data.result_count, data.execution_time_ms]);
    } catch (error) {
      console.error('Failed to log query history:', error);
      // Don't throw - logging failure shouldn't break the query
    }
  }

  private async storeInsights(data: {
    analysis_type: string;
    input_data: any;
    insights: any;
  }): Promise<void> {
    try {
      await query(`
        INSERT INTO ai_insights (analysis_type, input_data, insights, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [data.analysis_type, JSON.stringify(data.input_data), JSON.stringify(data.insights)]);
    } catch (error) {
      console.error('Failed to store insights:', error);
    }
  }

  private async storeAnomaly(data: {
    type: string;
    severity: string;
    title: string;
    description: string;
    affected_records: number;
    detection_method: string;
    suggested_fix?: string;
  }): Promise<void> {
    try {
      await query(`
        INSERT INTO ai_data_anomalies (anomaly_type, severity, title, description, affected_records, detection_method, suggested_fix, detected_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [data.type, data.severity, data.title, data.description, data.affected_records, data.detection_method, data.suggested_fix || null]);
    } catch (error) {
      console.error('Failed to store anomaly:', error);
    }
  }

  private async cachePrediction(data: {
    prediction_type: string;
    target_id?: number;
    predictions: any;
    confidence: number;
    expires_at: Date;
  }): Promise<void> {
    try {
      await query(`
        INSERT INTO ai_predictions (prediction_type, target_id, predictions, confidence, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [data.prediction_type, data.target_id || null, JSON.stringify(data.predictions), data.confidence, data.expires_at]);
    } catch (error) {
      console.error('Failed to cache prediction:', error);
    }
  }
}

// Export singleton instance
export const aiDatabase = new AIDatabaseService();
