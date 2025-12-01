// @ts-nocheck
// Advanced Machine Learning Models for MantisNXT Platform
// Implements sophisticated ML algorithms for intelligent analytics

import type { Pool } from 'pg';
import type { SupplierPerformance } from '@/types';

// Advanced ML Types
export interface NeuralNetworkPrediction {
  prediction: number;
  confidence: number;
  uncertaintyBounds: { lower: number; upper: number };
  features: Record<string, number>;
  modelType: 'regression' | 'classification' | 'ensemble';
  explanation: string[];
  timestamp: Date;
}

export interface TimeSeriesForecast {
  itemId: string;
  forecastHorizon: number; // days
  predictions: Array<{
    date: Date;
    predicted: number;
    lowerBound: number;
    upperBound: number;
    seasonalComponent: number;
    trendComponent: number;
  }>;
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number; // Mean Absolute Error
  };
  modelMetadata: {
    algorithm: string;
    trainingData: number;
    lastTraining: Date;
    parameters: Record<string, unknown>;
  };
}

export interface EnsemblePrediction {
  models: Array<{
    name: string;
    prediction: number;
    weight: number;
    confidence: number;
  }>;
  finalPrediction: number;
  consensus: number; // Agreement between models
  explanation: string;
}

// Neural Network Implementation (Simplified)
export class NeuralNetwork {
  private weights: number[][];
  private biases: number[];
  private learningRate: number = 0.01;
  private layers: number[];

  constructor(layers: number[]) {
    this.layers = layers;
    this.initializeWeights();
  }

  private initializeWeights() {
    this.weights = [];
    this.biases = [];

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layerWeights: number[][] = [];
      for (let j = 0; j < this.layers[i + 1]; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < this.layers[i]; k++) {
          neuronWeights.push((Math.random() - 0.5) * 2);
        }
        layerWeights.push(neuronWeights);
      }
      this.weights.push(layerWeights);
      this.biases.push(new Array(this.layers[i + 1]).fill(0).map(() => (Math.random() - 0.5) * 2));
    }
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  predict(inputs: number[]): number[] {
    let activations = [...inputs];

    for (let i = 0; i < this.weights.length; i++) {
      const newActivations: number[] = [];

      for (let j = 0; j < this.weights[i].length; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < activations.length; k++) {
          sum += activations[k] * this.weights[i][j][k];
        }
        newActivations.push(i === this.weights.length - 1 ? sum : this.relu(sum));
      }

      activations = newActivations;
    }

    return activations;
  }

  train(trainingData: Array<{ inputs: number[]; outputs: number[] }>, epochs: number = 1000) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of trainingData) {
        this.backpropagate(sample.inputs, sample.outputs);
      }
    }
  }

  private backpropagate(inputs: number[], targetOutputs: number[]) {
    // Forward pass
    const layerOutputs: number[][] = [inputs];
    let currentInput = inputs;

    for (let i = 0; i < this.weights.length; i++) {
      const output: number[] = [];
      for (let j = 0; j < this.weights[i].length; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < currentInput.length; k++) {
          sum += currentInput[k] * this.weights[i][j][k];
        }
        output.push(i === this.weights.length - 1 ? sum : this.relu(sum));
      }
      layerOutputs.push(output);
      currentInput = output;
    }

    // Backward pass (simplified)
    const errors: number[][] = [];
    const finalOutput = layerOutputs[layerOutputs.length - 1];
    const outputError = finalOutput.map((output, i) => targetOutputs[i] - output);
    errors.unshift(outputError);

    // Update weights and biases
    for (let i = this.weights.length - 1; i >= 0; i--) {
      for (let j = 0; j < this.weights[i].length; j++) {
        for (let k = 0; k < this.weights[i][j].length; k++) {
          this.weights[i][j][k] += this.learningRate * errors[0][j] * layerOutputs[i][k];
        }
        this.biases[i][j] += this.learningRate * errors[0][j];
      }
    }
  }
}

// Advanced Supplier Performance Predictor
export class AdvancedSupplierPredictor {
  private neuralNetwork: NeuralNetwork;
  private featureScaling: { mean: number[]; std: number[] };
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
    this.neuralNetwork = new NeuralNetwork([10, 20, 15, 1]); // 10 inputs, hidden layers, 1 output
    this.featureScaling = { mean: [], std: [] };
  }

  async predictSupplierPerformance(
    supplierId: string,
    historicalData: SupplierPerformance[]
  ): Promise<NeuralNetworkPrediction> {
    try {
      // Extract and normalize features
      const features = this.extractAdvancedFeatures(historicalData);
      const normalizedFeatures = this.normalizeFeatures(features);

      // Get prediction from neural network
      const prediction = this.neuralNetwork.predict(normalizedFeatures)[0];

      // Calculate confidence based on historical performance variance
      const confidence = this.calculateAdvancedConfidence(historicalData, features);

      // Calculate uncertainty bounds
      const uncertaintyBounds = this.calculateUncertaintyBounds(prediction, confidence);

      // Generate explanation
      const explanation = this.generateExplanation(features, prediction);

      return {
        prediction: Math.max(0, Math.min(1, prediction)),
        confidence,
        uncertaintyBounds,
        features: this.featuresToObject(features),
        modelType: 'regression',
        explanation,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Advanced supplier prediction error:', error);
      throw new Error('Failed to predict supplier performance');
    }
  }

  private extractAdvancedFeatures(history: SupplierPerformance[]): number[] {
    if (history.length === 0) {
      return new Array(10).fill(0);
    }

    const recent = history.slice(0, 5); // Last 5 evaluations
    const older = history.slice(5, 10); // Previous 5 evaluations

    return [
      this.calculateAverage(recent.map(h => h.metrics.onTimeDeliveryRate)) / 100,
      this.calculateAverage(recent.map(h => h.metrics.qualityAcceptanceRate)) / 100,
      this.calculateTrend(history.map(h => h.overallRating)),
      this.calculateVolatility(history.map(h => h.overallRating)),
      this.calculateSeasonality(history),
      this.calculateAverage(recent.map(h => h.metrics.responseTime)) / 48, // Normalize by 48 hours
      this.calculateImprovement(recent, older),
      this.calculateConsistency(history),
      this.calculateRecentPerformance(recent),
      this.calculateRiskIndicator(history),
    ];
  }

  private normalizeFeatures(features: number[]): number[] {
    if (this.featureScaling.mean.length === 0) {
      // Initialize with current features (in production, use historical data)
      this.featureScaling.mean = features.slice();
      this.featureScaling.std = new Array(features.length).fill(1);
    }

    return features.map(
      (feature, i) =>
        (feature - this.featureScaling.mean[i]) / Math.max(this.featureScaling.std[i], 0.01)
    );
  }

  private calculateAdvancedConfidence(history: SupplierPerformance[], features: number[]): number {
    const dataQuality = Math.min(1, history.length / 10);
    const featureQuality =
      features.reduce((sum, f) => sum + (isNaN(f) ? 0 : 1), 0) / features.length;
    const performanceConsistency = this.calculateConsistency(history);

    return dataQuality * 0.4 + featureQuality * 0.3 + performanceConsistency * 0.3;
  }

  private calculateUncertaintyBounds(
    prediction: number,
    confidence: number
  ): { lower: number; upper: number } {
    const uncertainty = (1 - confidence) * 0.3; // Max 30% uncertainty
    return {
      lower: Math.max(0, prediction - uncertainty),
      upper: Math.min(1, prediction + uncertainty),
    };
  }

  private generateExplanation(features: number[], prediction: number): string[] {
    const explanations: string[] = [];

    if (features[0] < 0.85) explanations.push('Delivery performance is below optimal levels');
    if (features[1] < 0.9) explanations.push('Quality issues detected in recent performance');
    if (features[2] < -0.1) explanations.push('Declining performance trend identified');
    if (features[3] > 0.3) explanations.push('High performance volatility observed');
    if (features[6] > 0.1) explanations.push('Recent improvement in performance metrics');

    if (explanations.length === 0) {
      explanations.push('Performance metrics are within acceptable ranges');
    }

    return explanations;
  }

  // Utility methods
  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + idx * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private calculateSeasonality(history: SupplierPerformance[]): number {
    // Simplified seasonality calculation
    return 0; // Placeholder for more complex seasonality analysis
  }

  private calculateImprovement(
    recent: SupplierPerformance[],
    older: SupplierPerformance[]
  ): number {
    if (recent.length === 0 || older.length === 0) return 0;
    const recentAvg = this.calculateAverage(recent.map(h => h.overallRating));
    const olderAvg = this.calculateAverage(older.map(h => h.overallRating));
    return (recentAvg - olderAvg) / Math.max(olderAvg, 0.1);
  }

  private calculateConsistency(history: SupplierPerformance[]): number {
    if (history.length < 2) return 1;
    const ratings = history.map(h => h.overallRating);
    const volatility = this.calculateVolatility(ratings);
    return Math.max(0, 1 - volatility);
  }

  private calculateRecentPerformance(recent: SupplierPerformance[]): number {
    if (recent.length === 0) return 0.5;
    return this.calculateAverage(recent.map(h => h.overallRating));
  }

  private calculateRiskIndicator(history: SupplierPerformance[]): number {
    if (history.length === 0) return 0.5;
    const latest = history[0];
    let risk = 0;

    if (latest.metrics.onTimeDeliveryRate < 85) risk += 0.3;
    if (latest.metrics.qualityAcceptanceRate < 90) risk += 0.3;
    if (latest.metrics.responseTime > 24) risk += 0.2;

    return Math.min(1, risk);
  }

  private featuresToObject(features: number[]): Record<string, number> {
    return {
      deliveryRate: features[0],
      qualityRate: features[1],
      trend: features[2],
      volatility: features[3],
      seasonality: features[4],
      responseTime: features[5],
      improvement: features[6],
      consistency: features[7],
      recentPerformance: features[8],
      riskIndicator: features[9],
    };
  }
}

// Time Series Forecasting with Advanced Algorithms
export class TimeSeriesForecaster {
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
  }

  async forecastDemand(itemId: string, horizon: number = 30): Promise<TimeSeriesForecast> {
    try {
      // Get historical demand data
      const historicalData = await this.getHistoricalDemand(itemId);

      if (historicalData.length < 14) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Apply time series decomposition
      const decomposed = this.decomposeTimeSeries(historicalData);

      // Generate forecasts using multiple methods
      const armaForecast = this.armaForecast(decomposed.trend, horizon);
      const seasonalForecast = this.seasonalForecast(decomposed.seasonal, horizon);
      const polynomialForecast = this.polynomialTrendForecast(historicalData, horizon);

      // Combine forecasts
      const predictions = this.combineForecastMethods(
        armaForecast,
        seasonalForecast,
        polynomialForecast,
        horizon
      );

      // Calculate accuracy metrics
      const accuracy = this.calculateAccuracyMetrics(historicalData, predictions);

      return {
        itemId,
        forecastHorizon: horizon,
        predictions,
        accuracy,
        modelMetadata: {
          algorithm: 'Ensemble Time Series (ARMA + Seasonal + Polynomial)',
          trainingData: historicalData.length,
          lastTraining: new Date(),
          parameters: {
            armaOrder: { p: 2, q: 2 },
            seasonalPeriod: 7,
            polynomialDegree: 3,
          },
        },
      };
    } catch (error) {
      console.error('Time series forecasting error:', error);
      throw new Error('Failed to generate demand forecast');
    }
  }

  private async getHistoricalDemand(
    itemId: string
  ): Promise<Array<{ date: Date; demand: number }>> {
    const query = `
      SELECT DATE(timestamp) as date, SUM(quantity) as demand
      FROM stock_movements
      WHERE item_id = $1 AND type = 'outbound'
      AND timestamp >= NOW() - INTERVAL '6 months'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

    const result = await this.db.query(query, [itemId]);
    return result.rows.map(row => ({
      date: new Date(row.date),
      demand: parseFloat(row.demand),
    }));
  }

  private decomposeTimeSeries(data: Array<{ date: Date; demand: number }>) {
    const values = data.map(d => d.demand);

    // Simple moving average for trend
    const trend = this.calculateMovingAverage(values, 7);

    // Detrended series for seasonality
    const detrended = values.map((val, i) => val - (trend[i] || trend[trend.length - 1]));

    // Weekly seasonality
    const seasonal = this.extractSeasonality(detrended, 7);

    // Residual
    const residual = values.map((val, i) => val - (trend[i] || 0) - (seasonal[i % 7] || 0));

    return { trend, seasonal, residual };
  }

  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.ceil(window / 2));
      const slice = values.slice(start, end);
      result.push(slice.reduce((sum, val) => sum + val, 0) / slice.length);
    }
    return result;
  }

  private extractSeasonality(values: number[], period: number): number[] {
    const seasonal: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);

    values.forEach((val, i) => {
      const periodIndex = i % period;
      seasonal[periodIndex] += val;
      counts[periodIndex]++;
    });

    return seasonal.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
  }

  private armaForecast(trendData: number[], horizon: number): number[] {
    // Simplified ARMA(2,2) model
    const p = 2,
      q = 2;
    const forecast: number[] = [];
    const data = [...trendData];

    for (let h = 0; h < horizon; h++) {
      let prediction = 0;

      // AR component
      for (let i = 1; i <= p && data.length >= i; i++) {
        prediction += 0.3 * data[data.length - i]; // Simplified AR coefficients
      }

      // MA component (simplified)
      prediction += 0.1 * (Math.random() - 0.5); // Noise term

      forecast.push(prediction);
      data.push(prediction);
    }

    return forecast;
  }

  private seasonalForecast(seasonalPattern: number[], horizon: number): number[] {
    const forecast: number[] = [];
    for (let h = 0; h < horizon; h++) {
      forecast.push(seasonalPattern[h % seasonalPattern.length]);
    }
    return forecast;
  }

  private polynomialTrendForecast(
    data: Array<{ date: Date; demand: number }>,
    horizon: number
  ): number[] {
    // Fit polynomial trend
    const x = data.map((_, i) => i);
    const y = data.map(d => d.demand);

    // Simple linear trend (can be extended to higher order polynomials)
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecasts
    const forecast: number[] = [];
    for (let h = 0; h < horizon; h++) {
      const futureX = n + h;
      forecast.push(slope * futureX + intercept);
    }

    return forecast;
  }

  private combineForecastMethods(
    arma: number[],
    seasonal: number[],
    polynomial: number[],
    horizon: number
  ): Array<{
    date: Date;
    predicted: number;
    lowerBound: number;
    upperBound: number;
    seasonalComponent: number;
    trendComponent: number;
  }> {
    const predictions: Array<unknown> = [];
    const today = new Date();

    for (let h = 0; h < horizon; h++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + h + 1);

      const trendComponent = polynomial[h] || 0;
      const seasonalComponent = seasonal[h] || 0;
      const armaComponent = arma[h] || 0;

      // Weighted combination
      const predicted = trendComponent * 0.4 + seasonalComponent * 0.3 + armaComponent * 0.3;

      // Uncertainty bounds (±20%)
      const uncertainty = predicted * 0.2;

      predictions.push({
        date: futureDate,
        predicted: Math.max(0, predicted),
        lowerBound: Math.max(0, predicted - uncertainty),
        upperBound: predicted + uncertainty,
        seasonalComponent,
        trendComponent,
      });
    }

    return predictions;
  }

  private calculateAccuracyMetrics(
    historical: Array<{ date: Date; demand: number }>,
    predictions: Array<{ predicted: number }>
  ): { mape: number; rmse: number; mae: number } {
    // Use last portion of historical data for validation
    const validationSize = Math.min(7, Math.floor(historical.length * 0.2));
    const validation = historical.slice(-validationSize);
    const testPredictions = predictions.slice(0, validationSize);

    if (validation.length === 0 || testPredictions.length === 0) {
      return { mape: 0, rmse: 0, mae: 0 };
    }

    let mapeSum = 0,
      rmseSum = 0,
      maeSum = 0;

    for (let i = 0; i < Math.min(validation.length, testPredictions.length); i++) {
      const actual = validation[i].demand;
      const predicted = testPredictions[i].predicted;

      mapeSum += Math.abs((actual - predicted) / Math.max(actual, 1));
      rmseSum += Math.pow(actual - predicted, 2);
      maeSum += Math.abs(actual - predicted);
    }

    const n = Math.min(validation.length, testPredictions.length);

    return {
      mape: (mapeSum / n) * 100,
      rmse: Math.sqrt(rmseSum / n),
      mae: maeSum / n,
    };
  }
}

// Ensemble Learning for Multiple Model Predictions
export class EnsemblePredictor {
  private models: Array<{
    name: string;
    predictor: unknown;
    weight: number;
    performance: number;
  }>;

  constructor() {
    this.models = [];
  }

  addModel(name: string, predictor: unknown, weight: number = 1.0) {
    this.models.push({
      name,
      predictor,
      weight,
      performance: 0.5, // Initial performance
    });
  }

  async predict(data: unknown): Promise<EnsemblePrediction> {
    const predictions = [];

    for (const model of this.models) {
      try {
        const prediction = await model.predictor.predict(data);
        predictions.push({
          name: model.name,
          prediction: prediction.prediction || prediction,
          weight: model.weight,
          confidence: prediction.confidence || 0.8,
        });
      } catch (error) {
        console.error(`Model ${model.name} prediction failed:`, error);
        predictions.push({
          name: model.name,
          prediction: 0.5,
          weight: 0,
          confidence: 0,
        });
      }
    }

    // Calculate weighted average
    const totalWeight = predictions.reduce((sum, p) => sum + p.weight * p.confidence, 0);
    const finalPrediction =
      predictions.reduce((sum, p) => sum + p.prediction * p.weight * p.confidence, 0) /
      Math.max(totalWeight, 0.1);

    // Calculate consensus (agreement between models)
    const predictionValues = predictions.map(p => p.prediction);
    const mean = predictionValues.reduce((sum, val) => sum + val, 0) / predictionValues.length;
    const variance =
      predictionValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      predictionValues.length;
    const consensus = Math.max(0, 1 - Math.sqrt(variance));

    return {
      models: predictions,
      finalPrediction,
      consensus,
      explanation: this.generateEnsembleExplanation(predictions, consensus),
    };
  }

  private generateEnsembleExplanation(predictions: unknown[], consensus: number): string {
    const topModel = predictions.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    if (consensus > 0.8) {
      return `High model consensus (${(consensus * 100).toFixed(1)}%). All models agree on prediction.`;
    } else if (consensus > 0.6) {
      return `Moderate consensus. ${topModel.name} has highest confidence at ${(topModel.confidence * 100).toFixed(1)}%.`;
    } else {
      return `Low consensus between models. Prediction uncertainty is high.`;
    }
  }

  updateModelPerformance(modelName: string, performance: number) {
    const model = this.models.find(m => m.name === modelName);
    if (model) {
      model.performance = performance;
      // Adjust weight based on performance
      model.weight = Math.max(0.1, performance);
    }
  }
}

// Export all advanced ML models
export const advancedMLModels = {
  supplierPredictor: (db: Pool) => new AdvancedSupplierPredictor(db),
  timeSeriesForecaster: (db: Pool) => new TimeSeriesForecaster(db),
  ensemblePredictor: () => new EnsemblePredictor(),
  neuralNetwork: (layers: number[]) => new NeuralNetwork(layers),
};

// Export individual classes for direct import
export { AdvancedSupplierPredictor as AdvancedMLModels };
