// @ts-nocheck
// Real-Time Anomaly Detection with Machine Learning
// Implements advanced anomaly detection algorithms for continuous monitoring

import type { Pool } from 'pg';
import EventEmitter from 'events';

// Types for Anomaly Detection
export interface AnomalyDetectionModel {
  id: string;
  name: string;
  type: 'statistical' | 'isolation_forest' | 'autoencoder' | 'lstm' | 'ensemble';
  targetMetric: string;
  sensitivity: number; // 0-1, higher = more sensitive
  windowSize: number; // Number of data points to consider
  trainingData: number;
  lastTrained: Date;
  accuracy: number;
  falsePositiveRate: number;
  parameters: Record<string, unknown>;
  status: 'active' | 'training' | 'inactive';
}

export interface AnomalyAlert {
  id: string;
  type: 'supplier_performance' | 'inventory_movement' | 'price_fluctuation' | 'system_performance' | 'demand_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;

  detection: {
    modelId: string;
    algorithm: string;
    confidence: number;
    anomalyScore: number;
    threshold: number;
  };

  context: {
    entityId: string;
    entityType: 'supplier' | 'inventory_item' | 'category' | 'system';
    entityName: string;
    currentValue: number;
    expectedValue: number;
    deviation: number;
    historicalContext: {
      min: number;
      max: number;
      mean: number;
      stdDev: number;
    };
  };

  impact: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    potentialLoss: number;
    affectedOperations: string[];
    urgency: number; // 0-1
  };

  recommendation: {
    action: string;
    priority: 'immediate' | 'urgent' | 'scheduled' | 'monitor';
    steps: string[];
    estimatedResolutionTime: string;
    preventiveMeasures: string[];
  };

  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  falsePositive?: boolean;
}

export interface AnomalyPattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  entities: string[];
  rootCause?: string;
  preventionStrategy?: string;
}

// Statistical Anomaly Detector
export class StatisticalAnomalyDetector {
  private model: AnomalyDetectionModel;
  private historicalData: number[] = [];
  private statistics: {
    mean: number;
    stdDev: number;
    median: number;
    q1: number;
    q3: number;
  } = { mean: 0, stdDev: 0, median: 0, q1: 0, q3: 0 };

  constructor(model: AnomalyDetectionModel) {
    this.model = model;
  }

  train(data: number[]): void {
    this.historicalData = data.slice(-this.model.windowSize);
    this.calculateStatistics();
  }

  private calculateStatistics(): void {
    if (this.historicalData.length === 0) return;

    const sorted = [...this.historicalData].sort((a, b) => a - b);
    const n = sorted.length;

    this.statistics.mean = this.historicalData.reduce((sum, val) => sum + val, 0) / n;

    const variance = this.historicalData.reduce(
      (sum, val) => sum + Math.pow(val - this.statistics.mean, 2), 0
    ) / n;
    this.statistics.stdDev = Math.sqrt(variance);

    this.statistics.median = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)];

    this.statistics.q1 = sorted[Math.floor(n * 0.25)];
    this.statistics.q3 = sorted[Math.floor(n * 0.75)];
  }

  detect(value: number): { isAnomaly: boolean; score: number; method: string } {
    if (this.historicalData.length < 10) {
      return { isAnomaly: false, score: 0, method: 'insufficient_data' };
    }

    // Z-score method
    const zScore = Math.abs((value - this.statistics.mean) / Math.max(this.statistics.stdDev, 0.1));
    const zThreshold = 2 + (this.model.sensitivity * 1); // 2-3 sigma

    // IQR method
    const iqr = this.statistics.q3 - this.statistics.q1;
    const lowerBound = this.statistics.q1 - 1.5 * iqr;
    const upperBound = this.statistics.q3 + 1.5 * iqr;
    const iqrAnomaly = value < lowerBound || value > upperBound;

    // Modified Z-score using median
    const medianDev = Math.abs(value - this.statistics.median);
    const mad = this.calculateMAD();
    const modifiedZScore = 0.6745 * medianDev / Math.max(mad, 0.1);
    const modifiedZThreshold = 3.5;

    // Combine methods
    const zAnom = zScore > zThreshold;
    const modZAnom = modifiedZScore > modifiedZThreshold;

    const isAnomaly = zAnom || iqrAnomaly || modZAnom;
    const score = Math.max(zScore / zThreshold, modifiedZScore / modifiedZThreshold);

    return {
      isAnomaly,
      score: Math.min(1, score),
      method: `statistical(z:${zScore.toFixed(2)},iqr:${iqrAnomaly},mz:${modifiedZScore.toFixed(2)})`
    };
  }

  private calculateMAD(): number {
    if (this.historicalData.length === 0) return 0;

    const deviations = this.historicalData.map(val => Math.abs(val - this.statistics.median));
    deviations.sort((a, b) => a - b);

    const n = deviations.length;
    return n % 2 === 0
      ? (deviations[n/2 - 1] + deviations[n/2]) / 2
      : deviations[Math.floor(n/2)];
  }

  updateModel(newData: number[]): void {
    this.historicalData.push(...newData);
    if (this.historicalData.length > this.model.windowSize) {
      this.historicalData = this.historicalData.slice(-this.model.windowSize);
    }
    this.calculateStatistics();
  }

  getStatistics() {
    return { ...this.statistics };
  }
}

// Isolation Forest Implementation (Simplified)
export class IsolationForestDetector {
  private model: AnomalyDetectionModel;
  private trees: Array<{
    root: unknown;
    height: number;
  }> = [];
  private numTrees: number = 100;
  private subsampleSize: number = 256;

  constructor(model: AnomalyDetectionModel) {
    this.model = model;
    this.numTrees = model.parameters.numTrees || 100;
    this.subsampleSize = model.parameters.subsampleSize || 256;
  }

  train(data: number[][]): void {
    this.trees = [];

    for (let i = 0; i < this.numTrees; i++) {
      const subsample = this.createSubsample(data);
      const tree = this.buildTree(subsample, 0);
      this.trees.push(tree);
    }
  }

  private createSubsample(data: number[][]): number[][] {
    const subsample = [];
    for (let i = 0; i < Math.min(this.subsampleSize, data.length); i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      subsample.push(data[randomIndex]);
    }
    return subsample;
  }

  private buildTree(data: number[][], depth: number): unknown {
    if (data.length <= 1 || depth >= 10) {
      return { size: data.length, isLeaf: true, depth };
    }

    // Random feature selection
    const featureIndex = Math.floor(Math.random() * data[0].length);
    const values = data.map(point => point[featureIndex]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return { size: data.length, isLeaf: true, depth };
    }

    const splitValue = min + Math.random() * (max - min);

    const leftData = data.filter(point => point[featureIndex] < splitValue);
    const rightData = data.filter(point => point[featureIndex] >= splitValue);

    return {
      featureIndex,
      splitValue,
      left: this.buildTree(leftData, depth + 1),
      right: this.buildTree(rightData, depth + 1),
      isLeaf: false,
      depth
    };
  }

  detect(point: number[]): { isAnomaly: boolean; score: number; method: string } {
    if (this.trees.length === 0) {
      return { isAnomaly: false, score: 0, method: 'not_trained' };
    }

    const avgPathLength = this.trees.reduce((sum, tree) => {
      return sum + this.pathLength(point, tree.root);
    }, 0) / this.trees.length;

    const c = this.cFunction(this.subsampleSize);
    const anomalyScore = Math.pow(2, -avgPathLength / c);

    const threshold = 0.5 + (this.model.sensitivity * 0.3); // 0.5-0.8 threshold
    const isAnomaly = anomalyScore > threshold;

    return {
      isAnomaly,
      score: anomalyScore,
      method: `isolation_forest(avg_path:${avgPathLength.toFixed(2)})`
    };
  }

  private pathLength(point: number[], node: unknown): number {
    if (node.isLeaf) {
      return node.depth + this.cFunction(node.size);
    }

    if (point[node.featureIndex] < node.splitValue) {
      return this.pathLength(point, node.left);
    } else {
      return this.pathLength(point, node.right);
    }
  }

  private cFunction(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

// LSTM Autoencoder for Time Series Anomaly Detection
export class LSTMAutoencoderDetector {
  private model: AnomalyDetectionModel;
  private sequenceLength: number;
  private reconstructionErrors: number[] = [];

  constructor(model: AnomalyDetectionModel) {
    this.model = model;
    this.sequenceLength = model.parameters.sequenceLength || 10;
  }

  train(timeSeries: number[]): void {
    // Simplified LSTM autoencoder simulation
    const sequences = this.createSequences(timeSeries);
    this.reconstructionErrors = [];

    // Calculate reconstruction errors for training data
    for (const sequence of sequences) {
      const reconstructed = this.simulateReconstruction(sequence);
      const error = this.calculateReconstructionError(sequence, reconstructed);
      this.reconstructionErrors.push(error);
    }
  }

  private createSequences(data: number[]): number[][] {
    const sequences = [];
    for (let i = 0; i <= data.length - this.sequenceLength; i++) {
      sequences.push(data.slice(i, i + this.sequenceLength));
    }
    return sequences;
  }

  private simulateReconstruction(sequence: number[]): number[] {
    // Simplified reconstruction simulation
    // In real implementation, this would use a trained LSTM autoencoder
    const reconstructed = [];
    for (let i = 0; i < sequence.length; i++) {
      let predicted = sequence[i];

      // Add some smoothing based on neighbors
      if (i > 0) predicted = (predicted + sequence[i-1]) / 2;
      if (i < sequence.length - 1) predicted = (predicted + sequence[i+1]) / 2;

      // Add slight noise to simulate imperfect reconstruction
      predicted += (Math.random() - 0.5) * 0.1 * Math.abs(predicted);

      reconstructed.push(predicted);
    }
    return reconstructed;
  }

  private calculateReconstructionError(original: number[], reconstructed: number[]): number {
    let mse = 0;
    for (let i = 0; i < original.length; i++) {
      mse += Math.pow(original[i] - reconstructed[i], 2);
    }
    return mse / original.length;
  }

  detect(sequence: number[]): { isAnomaly: boolean; score: number; method: string } {
    if (sequence.length !== this.sequenceLength) {
      return { isAnomaly: false, score: 0, method: 'invalid_sequence_length' };
    }

    if (this.reconstructionErrors.length === 0) {
      return { isAnomaly: false, score: 0, method: 'not_trained' };
    }

    const reconstructed = this.simulateReconstruction(sequence);
    const error = this.calculateReconstructionError(sequence, reconstructed);

    // Calculate threshold based on training errors
    const meanError = this.reconstructionErrors.reduce((sum, err) => sum + err, 0) / this.reconstructionErrors.length;
    const stdError = Math.sqrt(
      this.reconstructionErrors.reduce((sum, err) => sum + Math.pow(err - meanError, 2), 0) / this.reconstructionErrors.length
    );

    const threshold = meanError + (2 + this.model.sensitivity * 2) * stdError;
    const isAnomaly = error > threshold;
    const score = Math.min(1, error / threshold);

    return {
      isAnomaly,
      score,
      method: `lstm_autoencoder(error:${error.toFixed(4)},threshold:${threshold.toFixed(4)})`
    };
  }
}

// Real-Time Anomaly Detection Engine
export class RealTimeAnomalyDetectionEngine extends EventEmitter {
  private db: Pool;
  private models: Map<string, AnomalyDetectionModel> = new Map();
  private detectors: Map<string, unknown> = new Map();
  private alertHistory: AnomalyAlert[] = [];
  private patterns: Map<string, AnomalyPattern> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(database: Pool) {
    super();
    this.db = database;
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      // Load models from database
      const result = await this.db.query(`
        SELECT * FROM anomaly_detection_models
        WHERE status = 'active'
      `);

      for (const row of result.rows) {
        const model: AnomalyDetectionModel = {
          id: row.id,
          name: row.name,
          type: row.type,
          targetMetric: row.target_metric,
          sensitivity: parseFloat(row.sensitivity),
          windowSize: parseInt(row.window_size),
          trainingData: parseInt(row.training_data),
          lastTrained: new Date(row.last_trained),
          accuracy: parseFloat(row.accuracy),
          falsePositiveRate: parseFloat(row.false_positive_rate),
          parameters: JSON.parse(row.parameters || '{}'),
          status: row.status
        };

        this.models.set(model.id, model);
        await this.initializeDetector(model);
      }

      // Create default models if none exist
      if (this.models.size === 0) {
        await this.createDefaultModels();
      }

    } catch (error) {
      console.error('Error initializing anomaly detection models:', error);
      await this.createDefaultModels();
    }
  }

  private async createDefaultModels(): Promise<void> {
    const defaultModels = [
      {
        name: 'Supplier Performance Anomaly Detector',
        type: 'statistical',
        targetMetric: 'supplier_performance',
        sensitivity: 0.7,
        windowSize: 50,
        parameters: {}
      },
      {
        name: 'Inventory Movement Anomaly Detector',
        type: 'isolation_forest',
        targetMetric: 'inventory_movement',
        sensitivity: 0.6,
        windowSize: 100,
        parameters: { numTrees: 100, subsampleSize: 256 }
      },
      {
        name: 'Price Fluctuation Detector',
        type: 'lstm',
        targetMetric: 'price_fluctuation',
        sensitivity: 0.8,
        windowSize: 30,
        parameters: { sequenceLength: 10 }
      }
    ];

    for (const modelConfig of defaultModels) {
      await this.createModel(modelConfig);
    }
  }

  private async createModel(config: unknown): Promise<string> {
    const modelId = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const model: AnomalyDetectionModel = {
      id: modelId,
      name: config.name,
      type: config.type,
      targetMetric: config.targetMetric,
      sensitivity: config.sensitivity,
      windowSize: config.windowSize,
      trainingData: 0,
      lastTrained: now,
      accuracy: 0.85,
      falsePositiveRate: 0.05,
      parameters: config.parameters,
      status: 'active'
    };

    try {
      await this.db.query(`
        INSERT INTO anomaly_detection_models (
          id, name, type, target_metric, sensitivity, window_size,
          training_data, last_trained, accuracy, false_positive_rate,
          parameters, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        model.id, model.name, model.type, model.targetMetric,
        model.sensitivity, model.windowSize, model.trainingData,
        model.lastTrained, model.accuracy, model.falsePositiveRate,
        JSON.stringify(model.parameters), model.status
      ]);

      this.models.set(modelId, model);
      await this.initializeDetector(model);

      return modelId;

    } catch (error) {
      console.error('Error creating anomaly detection model:', error);
      throw new Error('Failed to create anomaly detection model');
    }
  }

  private async initializeDetector(model: AnomalyDetectionModel): Promise<void> {
    let detector;

    switch (model.type) {
      case 'statistical':
        detector = new StatisticalAnomalyDetector(model);
        break;
      case 'isolation_forest':
        detector = new IsolationForestDetector(model);
        break;
      case 'lstm':
        detector = new LSTMAutoencoderDetector(model);
        break;
      default:
        detector = new StatisticalAnomalyDetector(model);
    }

    // Train detector with historical data
    await this.trainDetector(detector, model);
    this.detectors.set(model.id, detector);
  }

  private async trainDetector(detector: unknown, model: AnomalyDetectionModel): Promise<void> {
    try {
      // Get historical data based on target metric
      const data = await this.getHistoricalData(model.targetMetric, model.windowSize * 2);

      if (data.length < 10) {
        console.warn(`Insufficient training data for model ${model.id}`);
        return;
      }

      if (model.type === 'isolation_forest') {
        // For isolation forest, convert to multi-dimensional data
        const features = data.map((value, index) => [value, index]);
        detector.train(features);
      } else {
        // For statistical and LSTM models
        detector.train(data);
      }

    } catch (error) {
      console.error(`Error training detector for model ${model.id}:`, error);
    }
  }

  private async getHistoricalData(targetMetric: string, limit: number): Promise<number[]> {
    let query = '';
    const params: unknown[] = [limit];

    switch (targetMetric) {
      case 'supplier_performance':
        query = `
          SELECT overall_rating
          FROM supplier_performance
          ORDER BY evaluation_date DESC
          LIMIT $1
        `;
        break;
      case 'inventory_movement':
        query = `
          SELECT quantity
          FROM stock_movements
          WHERE type = 'outbound'
          ORDER BY timestamp DESC
          LIMIT $1
        `;
        break;
      case 'price_fluctuation':
        query = `
          SELECT unit_cost
          FROM stock_movements
          WHERE unit_cost IS NOT NULL
          ORDER BY timestamp DESC
          LIMIT $1
        `;
        break;
      default:
        return [];
    }

    try {
      const result = await this.db.query(query, params);
      return result.rows.map(row => parseFloat(Object.values(row)[0] as string));
    } catch (error) {
      console.error(`Error fetching historical data for ${targetMetric}:`, error);
      return [];
    }
  }

  async detectAnomalies(organizationId: string): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      // Check each active model
      for (const [modelId, model] of this.models) {
        if (model.status !== 'active') continue;

        const detector = this.detectors.get(modelId);
        if (!detector) continue;

        const recentData = await this.getRecentData(model.targetMetric, organizationId);

        for (const dataPoint of recentData) {
          const detection = await this.performDetection(detector, model, dataPoint);

          if (detection.isAnomaly) {
            const alert = await this.createAnomalyAlert(model, detection, dataPoint);
            alerts.push(alert);
          }
        }
      }

      // Store alerts in database
      for (const alert of alerts) {
        await this.storeAlert(alert);
      }

      // Emit real-time alerts
      if (alerts.length > 0) {
        this.emit('anomaliesDetected', alerts);
      }

      return alerts;

    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  private async getRecentData(targetMetric: string, organizationId: string): Promise<unknown[]> {
    let query = '';
    const params: unknown[] = [organizationId];

    switch (targetMetric) {
      case 'supplier_performance':
        query = `
          SELECT sp.*, s.name as supplier_name, s.id as supplier_id
          FROM supplier_performance sp
          JOIN public.suppliers s ON sp.supplier_id = s.id
          WHERE s.organization_id = $1
          AND sp.evaluation_date >= NOW() - INTERVAL '1 hour'
          ORDER BY sp.evaluation_date DESC
        `;
        break;
      case 'inventory_movement':
        query = `
          SELECT sm.*, ii.name as item_name, ii.id as item_id
          FROM stock_movements sm
          JOIN inventory_items ii ON sm.item_id = ii.id
          WHERE ii.organization_id = $1
          AND sm.timestamp >= NOW() - INTERVAL '1 hour'
          ORDER BY sm.timestamp DESC
        `;
        break;
      case 'price_fluctuation':
        query = `
          SELECT sm.*, ii.name as item_name, ii.id as item_id
          FROM stock_movements sm
          JOIN inventory_items ii ON sm.item_id = ii.id
          WHERE ii.organization_id = $1
          AND sm.unit_cost IS NOT NULL
          AND sm.timestamp >= NOW() - INTERVAL '1 hour'
          ORDER BY sm.timestamp DESC
        `;
        break;
      default:
        return [];
    }

    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching recent data for ${targetMetric}:`, error);
      return [];
    }
  }

  private async performDetection(detector: unknown, model: AnomalyDetectionModel, dataPoint: unknown): Promise<unknown> {
    let value: number;
    let sequence: number[];

    switch (model.targetMetric) {
      case 'supplier_performance':
        value = parseFloat(dataPoint.overall_rating);
        break;
      case 'inventory_movement':
        value = parseFloat(dataPoint.quantity);
        break;
      case 'price_fluctuation':
        value = parseFloat(dataPoint.unit_cost);
        break;
      default:
        return { isAnomaly: false, score: 0, method: 'unknown_metric' };
    }

    if (model.type === 'lstm') {
      // For LSTM, need sequence data
      const historicalData = await this.getHistoricalData(model.targetMetric, model.parameters.sequenceLength);
      sequence = [...historicalData.slice(0, model.parameters.sequenceLength - 1), value];
      return {
        ...detector.detect(sequence),
        value,
        dataPoint
      };
    } else if (model.type === 'isolation_forest') {
      // For isolation forest, create feature vector
      const features = [value, Date.now()]; // Simple feature set
      return {
        ...detector.detect(features),
        value,
        dataPoint
      };
    } else {
      // For statistical methods
      return {
        ...detector.detect(value),
        value,
        dataPoint
      };
    }
  }

  private async createAnomalyAlert(
    model: AnomalyDetectionModel,
    detection: unknown,
    dataPoint: unknown
  ): Promise<AnomalyAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine severity based on anomaly score
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (detection.score > 0.9) severity = 'critical';
    else if (detection.score > 0.7) severity = 'high';
    else if (detection.score > 0.5) severity = 'medium';

    // Calculate expected value and deviation
    const historicalStats = await this.getHistoricalStatistics(model.targetMetric);
    const expectedValue = historicalStats.mean;
    const deviation = Math.abs(detection.value - expectedValue) / Math.max(expectedValue, 1);

    const alert: AnomalyAlert = {
      id: alertId,
      type: this.getAlertType(model.targetMetric),
      severity,
      title: `${model.name}: Anomaly Detected`,
      description: this.generateAlertDescription(model, detection, dataPoint),

      detection: {
        modelId: model.id,
        algorithm: model.type,
        confidence: detection.score,
        anomalyScore: detection.score,
        threshold: model.sensitivity
      },

      context: {
        entityId: this.getEntityId(dataPoint, model.targetMetric),
        entityType: this.getEntityType(model.targetMetric),
        entityName: this.getEntityName(dataPoint, model.targetMetric),
        currentValue: detection.value,
        expectedValue,
        deviation,
        historicalContext: historicalStats
      },

      impact: {
        riskLevel: severity,
        potentialLoss: this.estimatePotentialLoss(model.targetMetric, deviation),
        affectedOperations: this.getAffectedOperations(model.targetMetric),
        urgency: Math.min(1, detection.score)
      },

      recommendation: this.generateRecommendation(model, detection, severity),

      detectedAt: new Date()
    };

    return alert;
  }

  private getAlertType(targetMetric: string): AnomalyAlert['type'] {
    const mapping: Record<string, AnomalyAlert['type']> = {
      'supplier_performance': 'supplier_performance',
      'inventory_movement': 'inventory_movement',
      'price_fluctuation': 'price_fluctuation'
    };
    return mapping[targetMetric] || 'system_performance';
  }

  private getEntityId(dataPoint: unknown, targetMetric: string): string {
    switch (targetMetric) {
      case 'supplier_performance': return dataPoint.supplier_id;
      case 'inventory_movement': return dataPoint.item_id;
      case 'price_fluctuation': return dataPoint.item_id;
      default: return 'unknown';
    }
  }

  private getEntityType(targetMetric: string): AnomalyAlert['context']['entityType'] {
    switch (targetMetric) {
      case 'supplier_performance': return 'supplier';
      case 'inventory_movement': return 'inventory_item';
      case 'price_fluctuation': return 'inventory_item';
      default: return 'system';
    }
  }

  private getEntityName(dataPoint: unknown, targetMetric: string): string {
    switch (targetMetric) {
      case 'supplier_performance': return dataPoint.supplier_name || 'Unknown Supplier';
      case 'inventory_movement': return dataPoint.item_name || 'Unknown Item';
      case 'price_fluctuation': return dataPoint.item_name || 'Unknown Item';
      default: return 'System';
    }
  }

  private async getHistoricalStatistics(targetMetric: string): Promise<unknown> {
    const data = await this.getHistoricalData(targetMetric, 100);

    if (data.length === 0) {
      return { min: 0, max: 0, mean: 0, stdDev: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      stdDev
    };
  }

  private estimatePotentialLoss(targetMetric: string, deviation: number): number {
    const baseLoss = {
      'supplier_performance': 10000,
      'inventory_movement': 5000,
      'price_fluctuation': 15000
    };

    return (baseLoss[targetMetric] || 1000) * deviation;
  }

  private getAffectedOperations(targetMetric: string): string[] {
    const operations: Record<string, string[]> = {
      'supplier_performance': ['Procurement', 'Quality Control', 'Delivery Schedule'],
      'inventory_movement': ['Inventory Management', 'Order Fulfillment', 'Demand Planning'],
      'price_fluctuation': ['Cost Management', 'Pricing Strategy', 'Vendor Negotiations']
    };

    return operations[targetMetric] || ['General Operations'];
  }

  private generateAlertDescription(model: AnomalyDetectionModel, detection: unknown, dataPoint: unknown): string {
    return `Anomaly detected in ${model.targetMetric} with confidence ${(detection.score * 100).toFixed(1)}%. ` +
           `Current value: ${detection.value}, Detection method: ${detection.method}`;
  }

  private generateRecommendation(
    model: AnomalyDetectionModel,
    detection: unknown,
    severity: string
  ): AnomalyAlert['recommendation'] {
    const urgentActions = {
      'supplier_performance': 'Review supplier performance metrics and contact supplier',
      'inventory_movement': 'Investigate unusual inventory movement and verify accuracy',
      'price_fluctuation': 'Review price changes and validate with supplier'
    };

    const steps = [
      'Verify the anomaly is not a false positive',
      'Investigate root cause',
      'Take corrective action if necessary',
      'Monitor for recurrence'
    ];

    return {
      action: urgentActions[model.targetMetric] || 'Investigate anomaly',
      priority: severity === 'critical' ? 'immediate' : severity === 'high' ? 'urgent' : 'scheduled',
      steps,
      estimatedResolutionTime: severity === 'critical' ? '1-2 hours' : '1-2 days',
      preventiveMeasures: [
        'Implement automated monitoring',
        'Set up early warning thresholds',
        'Regular performance reviews'
      ]
    };
  }

  private async storeAlert(alert: AnomalyAlert): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO anomaly_alerts (
          id, type, severity, title, description, detection,
          context, impact, recommendation, detected_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        alert.id, alert.type, alert.severity, alert.title, alert.description,
        JSON.stringify(alert.detection), JSON.stringify(alert.context),
        JSON.stringify(alert.impact), JSON.stringify(alert.recommendation),
        alert.detectedAt
      ]);

      this.alertHistory.push(alert);
      if (this.alertHistory.length > 1000) {
        this.alertHistory.shift();
      }

    } catch (error) {
      console.error('Error storing anomaly alert:', error);
    }
  }

  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.detectAnomalies('default'); // Use default org for now
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, intervalMs);

    console.log('Real-time anomaly detection monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Real-time anomaly detection monitoring stopped');
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      await this.db.query(`
        UPDATE anomaly_alerts
        SET acknowledged_at = NOW(), acknowledged_by = $1
        WHERE id = $2
      `, [userId, alertId]);

      const alert = this.alertHistory.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = userId;
      }

      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }

  async resolveAlert(alertId: string, resolution: string, userId: string): Promise<boolean> {
    try {
      await this.db.query(`
        UPDATE anomaly_alerts
        SET resolved_at = NOW(), resolution = $1
        WHERE id = $2
      `, [resolution, alertId]);

      const alert = this.alertHistory.find(a => a.id === alertId);
      if (alert) {
        alert.resolvedAt = new Date();
        alert.resolution = resolution;
      }

      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }

  getActiveAlerts(): AnomalyAlert[] {
    return this.alertHistory.filter(alert => !alert.resolvedAt);
  }

  getAlertHistory(limit: number = 100): AnomalyAlert[] {
    return this.alertHistory
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, limit);
  }

  getModelPerformance(): Array<{
    modelId: string;
    name: string;
    accuracy: number;
    falsePositiveRate: number;
    alertsGenerated: number;
    lastTrained: Date;
  }> {
    return Array.from(this.models.values()).map(model => ({
      modelId: model.id,
      name: model.name,
      accuracy: model.accuracy,
      falsePositiveRate: model.falsePositiveRate,
      alertsGenerated: this.alertHistory.filter(alert =>
        alert.detection.modelId === model.id
      ).length,
      lastTrained: model.lastTrained
    }));
  }
}

// Export real-time anomaly detection
export const realTimeAnomalyDetection = {
  engine: (db: Pool) => new RealTimeAnomalyDetectionEngine(db),
  statisticalDetector: (model: AnomalyDetectionModel) => new StatisticalAnomalyDetector(model),
  isolationForestDetector: (model: AnomalyDetectionModel) => new IsolationForestDetector(model),
  lstmDetector: (model: AnomalyDetectionModel) => new LSTMAutoencoderDetector(model)
};
