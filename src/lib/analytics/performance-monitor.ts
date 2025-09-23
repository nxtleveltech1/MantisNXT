import { EventEmitter } from 'events';

/**
 * Performance Monitoring and Optimization System
 * Comprehensive performance tracking, analysis, and optimization for MantisNXT platform
 */

// Performance Metrics Types
export interface SystemMetrics {
  timestamp: Date;
  organizationId: string;

  // Application Performance
  responseTime: {
    api: number;
    database: number;
    frontend: number;
    average: number;
  };

  // Resource Utilization
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };

  // Database Performance
  database: {
    queryTime: number;
    connectionCount: number;
    slowQueries: number;
    cacheHitRatio: number;
  };

  // Business Metrics
  business: {
    transactionThroughput: number;
    userConcurrency: number;
    errorRate: number;
    availability: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'warning' | 'info';
  category: 'performance' | 'resource' | 'availability' | 'security';
  metric: string;
  currentValue: number;
  threshold: number;
  impact: string;
  recommendation: string;
  organizationId: string;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'database' | 'api' | 'frontend' | 'infrastructure' | 'business';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact: {
    performanceGain: number; // percentage
    costReduction: number; // percentage
    implementationEffort: number; // hours
  };
  implementation: {
    steps: string[];
    requirements: string[];
    risks: string[];
  };
  metrics: {
    before: any;
    expectedAfter: any;
  };
}

export interface PerformanceTrend {
  metric: string;
  timeframe: string;
  trend: 'improving' | 'degrading' | 'stable';
  changeRate: number;
  confidence: number;
  forecasted: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
}

// Performance Threshold Configuration
export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
  resourceUtilization: {
    warning: number;
    critical: number;
  };
  availability: {
    warning: number;
    critical: number;
  };
}

/**
 * Real-time Performance Monitor
 * Collects and analyzes system performance metrics in real-time
 */
export class RealTimePerformanceMonitor extends EventEmitter {
  private metrics: Map<string, SystemMetrics[]> = new Map();
  private alerts: Map<string, PerformanceAlert[]> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private thresholds: PerformanceThresholds;

  constructor(thresholds?: PerformanceThresholds) {
    super();
    this.thresholds = thresholds || this.getDefaultThresholds();
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(organizationId: string, intervalMs: number = 30000): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics(organizationId);
        await this.processMetrics(metrics);
      } catch (error) {
        console.error('Performance monitoring error:', error);
        this.emit('monitoringError', error);
      }
    }, intervalMs);

    this.emit('monitoringStarted', { organizationId, intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    this.emit('monitoringStopped');
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectMetrics(organizationId: string): Promise<SystemMetrics> {
    const timestamp = new Date();

    // API Response Time Monitoring
    const apiMetrics = await this.measureApiPerformance(organizationId);

    // Database Performance Monitoring
    const dbMetrics = await this.measureDatabasePerformance(organizationId);

    // Resource Utilization Monitoring
    const resourceMetrics = await this.measureResourceUtilization();

    // Business Metrics Monitoring
    const businessMetrics = await this.measureBusinessMetrics(organizationId);

    const metrics: SystemMetrics = {
      timestamp,
      organizationId,
      responseTime: {
        api: apiMetrics.responseTime,
        database: dbMetrics.averageQueryTime,
        frontend: apiMetrics.frontendTime,
        average: (apiMetrics.responseTime + dbMetrics.averageQueryTime + apiMetrics.frontendTime) / 3
      },
      resources: resourceMetrics,
      database: dbMetrics,
      business: businessMetrics
    };

    // Store metrics
    if (!this.metrics.has(organizationId)) {
      this.metrics.set(organizationId, []);
    }
    const orgMetrics = this.metrics.get(organizationId)!;
    orgMetrics.push(metrics);

    // Keep only last 1000 metrics for memory management
    if (orgMetrics.length > 1000) {
      orgMetrics.splice(0, orgMetrics.length - 1000);
    }

    return metrics;
  }

  /**
   * Measure API performance
   */
  private async measureApiPerformance(organizationId: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Simulate API calls to key endpoints
      const endpoints = [
        '/api/suppliers',
        '/api/inventory',
        '/api/analytics/dashboard',
        '/api/predictions'
      ];

      const measurements = await Promise.all(
        endpoints.map(async (endpoint) => {
          const endpointStart = Date.now();
          // In real implementation, make actual HTTP requests
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
          return Date.now() - endpointStart;
        })
      );

      const averageResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const frontendTime = Math.random() * 200 + 100; // Simulate frontend rendering time

      return {
        responseTime: averageResponseTime,
        frontendTime,
        endpointMetrics: endpoints.map((endpoint, index) => ({
          endpoint,
          responseTime: measurements[index]
        }))
      };
    } catch (error) {
      console.error('API performance measurement error:', error);
      return {
        responseTime: 5000, // High value to indicate error
        frontendTime: 5000,
        endpointMetrics: []
      };
    }
  }

  /**
   * Measure database performance
   */
  private async measureDatabasePerformance(organizationId: string): Promise<any> {
    try {
      // Simulate database performance metrics
      const queryTimes = [
        Math.random() * 100 + 20, // Typical query time
        Math.random() * 200 + 50, // Complex query time
        Math.random() * 50 + 10   // Simple query time
      ];

      const averageQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      const slowQueries = queryTimes.filter(time => time > 100).length;
      const connectionCount = Math.floor(Math.random() * 20) + 5;
      const cacheHitRatio = 0.85 + Math.random() * 0.1; // 85-95%

      return {
        averageQueryTime,
        queryTime: averageQueryTime,
        connectionCount,
        slowQueries,
        cacheHitRatio
      };
    } catch (error) {
      console.error('Database performance measurement error:', error);
      return {
        averageQueryTime: 1000,
        queryTime: 1000,
        connectionCount: 0,
        slowQueries: 10,
        cacheHitRatio: 0.5
      };
    }
  }

  /**
   * Measure resource utilization
   */
  private async measureResourceUtilization(): Promise<any> {
    // Simulate system resource metrics
    return {
      cpu: Math.random() * 80 + 10, // 10-90% CPU usage
      memory: Math.random() * 70 + 20, // 20-90% memory usage
      disk: Math.random() * 60 + 30, // 30-90% disk usage
      network: Math.random() * 50 + 10 // 10-60% network usage
    };
  }

  /**
   * Measure business metrics
   */
  private async measureBusinessMetrics(organizationId: string): Promise<any> {
    return {
      transactionThroughput: Math.floor(Math.random() * 1000) + 100, // 100-1100 transactions/hour
      userConcurrency: Math.floor(Math.random() * 50) + 5, // 5-55 concurrent users
      errorRate: Math.random() * 0.05, // 0-5% error rate
      availability: 0.95 + Math.random() * 0.049 // 95-99.9% availability
    };
  }

  /**
   * Process metrics and generate alerts
   */
  private async processMetrics(metrics: SystemMetrics): Promise<void> {
    const alerts = await this.analyzeMetricsForAlerts(metrics);

    if (alerts.length > 0) {
      if (!this.alerts.has(metrics.organizationId)) {
        this.alerts.set(metrics.organizationId, []);
      }

      const orgAlerts = this.alerts.get(metrics.organizationId)!;
      orgAlerts.push(...alerts);

      // Keep only last 100 alerts
      if (orgAlerts.length > 100) {
        orgAlerts.splice(0, orgAlerts.length - 100);
      }

      this.emit('alertsGenerated', { organizationId: metrics.organizationId, alerts });
    }

    this.emit('metricsCollected', metrics);
  }

  /**
   * Analyze metrics for threshold violations
   */
  private async analyzeMetricsForAlerts(metrics: SystemMetrics): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    // Response Time Alerts
    if (metrics.responseTime.average > this.thresholds.responseTime.critical) {
      alerts.push({
        id: `rt-critical-${Date.now()}`,
        timestamp: metrics.timestamp,
        severity: 'critical',
        category: 'performance',
        metric: 'response_time',
        currentValue: metrics.responseTime.average,
        threshold: this.thresholds.responseTime.critical,
        impact: 'Severe user experience degradation',
        recommendation: 'Investigate database queries and API bottlenecks immediately',
        organizationId: metrics.organizationId
      });
    } else if (metrics.responseTime.average > this.thresholds.responseTime.warning) {
      alerts.push({
        id: `rt-warning-${Date.now()}`,
        timestamp: metrics.timestamp,
        severity: 'warning',
        category: 'performance',
        metric: 'response_time',
        currentValue: metrics.responseTime.average,
        threshold: this.thresholds.responseTime.warning,
        impact: 'Noticeable user experience impact',
        recommendation: 'Review recent changes and optimize slow queries',
        organizationId: metrics.organizationId
      });
    }

    // Resource Utilization Alerts
    if (metrics.resources.cpu > this.thresholds.resourceUtilization.critical) {
      alerts.push({
        id: `cpu-critical-${Date.now()}`,
        timestamp: metrics.timestamp,
        severity: 'critical',
        category: 'resource',
        metric: 'cpu_utilization',
        currentValue: metrics.resources.cpu,
        threshold: this.thresholds.resourceUtilization.critical,
        impact: 'System instability and severe performance degradation',
        recommendation: 'Scale resources immediately or reduce system load',
        organizationId: metrics.organizationId
      });
    }

    // Error Rate Alerts
    if (metrics.business.errorRate > this.thresholds.errorRate.critical) {
      alerts.push({
        id: `error-critical-${Date.now()}`,
        timestamp: metrics.timestamp,
        severity: 'critical',
        category: 'availability',
        metric: 'error_rate',
        currentValue: metrics.business.errorRate,
        threshold: this.thresholds.errorRate.critical,
        impact: 'High failure rate affecting user operations',
        recommendation: 'Investigate error logs and fix critical bugs immediately',
        organizationId: metrics.organizationId
      });
    }

    return alerts;
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(organizationId: string, timeframe: string = '24h'): Promise<PerformanceTrend[]> {
    const orgMetrics = this.metrics.get(organizationId) || [];

    if (orgMetrics.length < 2) {
      return [];
    }

    const trends: PerformanceTrend[] = [];

    // Analyze response time trend
    const responseTimes = orgMetrics.map(m => m.responseTime.average);
    const rtTrend = this.calculateTrend(responseTimes);
    trends.push({
      metric: 'response_time',
      timeframe,
      trend: rtTrend.direction,
      changeRate: rtTrend.rate,
      confidence: rtTrend.confidence,
      forecasted: {
        nextWeek: rtTrend.forecast.week,
        nextMonth: rtTrend.forecast.month,
        confidence: rtTrend.confidence
      }
    });

    // Analyze error rate trend
    const errorRates = orgMetrics.map(m => m.business.errorRate);
    const erTrend = this.calculateTrend(errorRates);
    trends.push({
      metric: 'error_rate',
      timeframe,
      trend: erTrend.direction,
      changeRate: erTrend.rate,
      confidence: erTrend.confidence,
      forecasted: {
        nextWeek: erTrend.forecast.week,
        nextMonth: erTrend.forecast.month,
        confidence: erTrend.confidence
      }
    });

    return trends;
  }

  /**
   * Calculate trend direction and rate
   */
  private calculateTrend(values: number[]): any {
    if (values.length < 3) {
      return {
        direction: 'stable' as const,
        rate: 0,
        confidence: 0,
        forecast: { week: values[values.length - 1], month: values[values.length - 1] }
      };
    }

    // Simple linear regression for trend analysis
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = values.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const direction = Math.abs(slope) < 0.1 ? 'stable' : slope > 0 ? 'degrading' : 'improving';
    const changeRate = Math.abs(slope);
    const confidence = Math.max(0, Math.min(1, rSquared));

    // Forecast future values
    const weekForecast = slope * (n + 7) + intercept;
    const monthForecast = slope * (n + 30) + intercept;

    return {
      direction,
      rate: changeRate,
      confidence,
      forecast: {
        week: Math.max(0, weekForecast),
        month: Math.max(0, monthForecast)
      }
    };
  }

  /**
   * Get current metrics for organization
   */
  getCurrentMetrics(organizationId: string): SystemMetrics | null {
    const orgMetrics = this.metrics.get(organizationId);
    return orgMetrics && orgMetrics.length > 0 ? orgMetrics[orgMetrics.length - 1] : null;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(organizationId: string, limit: number = 10): PerformanceAlert[] {
    const orgAlerts = this.alerts.get(organizationId) || [];
    return orgAlerts.slice(-limit).reverse();
  }

  /**
   * Get default performance thresholds
   */
  private getDefaultThresholds(): PerformanceThresholds {
    return {
      responseTime: {
        warning: 1000, // 1 second
        critical: 3000 // 3 seconds
      },
      errorRate: {
        warning: 0.01, // 1%
        critical: 0.05 // 5%
      },
      resourceUtilization: {
        warning: 70, // 70%
        critical: 90 // 90%
      },
      availability: {
        warning: 0.99, // 99%
        critical: 0.95 // 95%
      }
    };
  }
}

/**
 * Performance Optimization Engine
 * Analyzes performance data and generates optimization recommendations
 */
export class PerformanceOptimizationEngine {
  private monitor: RealTimePerformanceMonitor;
  private recommendations: Map<string, OptimizationRecommendation[]> = new Map();

  constructor(monitor: RealTimePerformanceMonitor) {
    this.monitor = monitor;
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(organizationId: string): Promise<OptimizationRecommendation[]> {
    const currentMetrics = this.monitor.getCurrentMetrics(organizationId);
    const trends = await this.monitor.getPerformanceTrends(organizationId);
    const alerts = this.monitor.getRecentAlerts(organizationId, 50);

    if (!currentMetrics) {
      return [];
    }

    const recommendations: OptimizationRecommendation[] = [];

    // Database optimization recommendations
    if (currentMetrics.database.queryTime > 500) {
      recommendations.push({
        id: `db-opt-${Date.now()}`,
        type: 'database',
        priority: currentMetrics.database.queryTime > 1000 ? 'critical' : 'high',
        title: 'Optimize Database Query Performance',
        description: 'Database queries are taking longer than optimal. Consider query optimization, indexing, and connection pooling.',
        estimatedImpact: {
          performanceGain: 40,
          costReduction: 15,
          implementationEffort: 16
        },
        implementation: {
          steps: [
            'Analyze slow query logs',
            'Add missing database indexes',
            'Optimize complex JOIN operations',
            'Implement query result caching',
            'Configure connection pooling'
          ],
          requirements: [
            'Database administrator access',
            'Query performance monitoring tools',
            'Caching infrastructure'
          ],
          risks: [
            'Index creation may temporarily slow writes',
            'Cache invalidation complexity',
            'Connection pool configuration tuning needed'
          ]
        },
        metrics: {
          before: { averageQueryTime: currentMetrics.database.queryTime },
          expectedAfter: { averageQueryTime: currentMetrics.database.queryTime * 0.6 }
        }
      });
    }

    // API optimization recommendations
    if (currentMetrics.responseTime.api > 800) {
      recommendations.push({
        id: `api-opt-${Date.now()}`,
        type: 'api',
        priority: 'high',
        title: 'Implement API Response Optimization',
        description: 'API response times can be improved through caching, compression, and payload optimization.',
        estimatedImpact: {
          performanceGain: 35,
          costReduction: 10,
          implementationEffort: 12
        },
        implementation: {
          steps: [
            'Implement Redis caching for frequently accessed data',
            'Add response compression (gzip)',
            'Optimize JSON payload sizes',
            'Implement API rate limiting',
            'Add CDN for static assets'
          ],
          requirements: [
            'Redis server setup',
            'CDN configuration',
            'API versioning strategy'
          ],
          risks: [
            'Cache invalidation complexity',
            'CDN propagation delays',
            'Rate limiting may affect legitimate users'
          ]
        },
        metrics: {
          before: { responseTime: currentMetrics.responseTime.api },
          expectedAfter: { responseTime: currentMetrics.responseTime.api * 0.65 }
        }
      });
    }

    // Resource optimization recommendations
    if (currentMetrics.resources.cpu > 70) {
      recommendations.push({
        id: `resource-opt-${Date.now()}`,
        type: 'infrastructure',
        priority: currentMetrics.resources.cpu > 85 ? 'critical' : 'medium',
        title: 'Scale Infrastructure Resources',
        description: 'CPU utilization is high. Consider scaling up or implementing horizontal scaling.',
        estimatedImpact: {
          performanceGain: 50,
          costReduction: 0,
          implementationEffort: 8
        },
        implementation: {
          steps: [
            'Monitor CPU usage patterns',
            'Implement auto-scaling policies',
            'Optimize resource-intensive operations',
            'Consider load balancing',
            'Schedule non-critical tasks during off-peak hours'
          ],
          requirements: [
            'Cloud infrastructure setup',
            'Monitoring and alerting systems',
            'Load balancer configuration'
          ],
          risks: [
            'Increased infrastructure costs',
            'Auto-scaling misconfiguration',
            'Load balancer single point of failure'
          ]
        },
        metrics: {
          before: { cpuUtilization: currentMetrics.resources.cpu },
          expectedAfter: { cpuUtilization: Math.min(60, currentMetrics.resources.cpu * 0.7) }
        }
      });
    }

    // Business process optimization
    if (currentMetrics.business.errorRate > 0.02) {
      recommendations.push({
        id: `business-opt-${Date.now()}`,
        type: 'business',
        priority: 'high',
        title: 'Improve Error Handling and Reliability',
        description: 'High error rate detected. Implement better error handling and retry mechanisms.',
        estimatedImpact: {
          performanceGain: 25,
          costReduction: 20,
          implementationEffort: 20
        },
        implementation: {
          steps: [
            'Implement comprehensive error logging',
            'Add retry mechanisms for failed operations',
            'Improve input validation',
            'Implement circuit breaker patterns',
            'Add health checks and monitoring'
          ],
          requirements: [
            'Error tracking system',
            'Monitoring and alerting infrastructure',
            'Testing framework for error scenarios'
          ],
          risks: [
            'Retry storms may worsen performance',
            'Circuit breaker false positives',
            'Increased system complexity'
          ]
        },
        metrics: {
          before: { errorRate: currentMetrics.business.errorRate },
          expectedAfter: { errorRate: currentMetrics.business.errorRate * 0.3 }
        }
      });
    }

    // Frontend optimization recommendations
    if (currentMetrics.responseTime.frontend > 1000) {
      recommendations.push({
        id: `frontend-opt-${Date.now()}`,
        type: 'frontend',
        priority: 'medium',
        title: 'Optimize Frontend Performance',
        description: 'Frontend rendering is slow. Implement code splitting, lazy loading, and asset optimization.',
        estimatedImpact: {
          performanceGain: 30,
          costReduction: 5,
          implementationEffort: 24
        },
        implementation: {
          steps: [
            'Implement code splitting and lazy loading',
            'Optimize image assets and use WebP format',
            'Minimize and compress JavaScript/CSS bundles',
            'Implement service worker for caching',
            'Use virtual scrolling for large lists'
          ],
          requirements: [
            'Build system configuration',
            'CDN setup for static assets',
            'Performance monitoring tools'
          ],
          risks: [
            'Code splitting may increase complexity',
            'Service worker caching issues',
            'Browser compatibility concerns'
          ]
        },
        metrics: {
          before: { frontendTime: currentMetrics.responseTime.frontend },
          expectedAfter: { frontendTime: currentMetrics.responseTime.frontend * 0.7 }
        }
      });
    }

    // Store recommendations
    this.recommendations.set(organizationId, recommendations);

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get stored recommendations
   */
  getRecommendations(organizationId: string): OptimizationRecommendation[] {
    return this.recommendations.get(organizationId) || [];
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(organizationId: string): Promise<any> {
    const currentMetrics = this.monitor.getCurrentMetrics(organizationId);
    const trends = await this.monitor.getPerformanceTrends(organizationId);
    const alerts = this.monitor.getRecentAlerts(organizationId, 10);
    const recommendations = await this.generateOptimizationRecommendations(organizationId);

    if (!currentMetrics) {
      return null;
    }

    return {
      overall: {
        status: this.calculateOverallStatus(currentMetrics, alerts),
        score: this.calculatePerformanceScore(currentMetrics),
        lastUpdated: currentMetrics.timestamp
      },
      metrics: currentMetrics,
      trends: trends,
      alerts: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        recent: alerts.slice(0, 5)
      },
      recommendations: {
        count: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length,
        estimatedGains: {
          performance: recommendations.reduce((sum, r) => sum + r.estimatedImpact.performanceGain, 0) / recommendations.length || 0,
          cost: recommendations.reduce((sum, r) => sum + r.estimatedImpact.costReduction, 0) / recommendations.length || 0
        }
      }
    };
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(metrics: SystemMetrics, alerts: PerformanceAlert[]): string {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

    if (criticalAlerts > 0) return 'critical';
    if (warningAlerts > 2) return 'warning';
    if (metrics.responseTime.average > 1000 || metrics.business.errorRate > 0.01) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(metrics: SystemMetrics): number {
    let score = 100;

    // Response time impact (0-30 points)
    const responseTimeScore = Math.max(0, 30 - (metrics.responseTime.average / 100));
    score -= (30 - responseTimeScore);

    // Error rate impact (0-25 points)
    const errorRateScore = Math.max(0, 25 - (metrics.business.errorRate * 500));
    score -= (25 - errorRateScore);

    // Resource utilization impact (0-25 points)
    const avgResourceUse = (metrics.resources.cpu + metrics.resources.memory) / 2;
    const resourceScore = Math.max(0, 25 - (avgResourceUse / 4));
    score -= (25 - resourceScore);

    // Availability impact (0-20 points)
    const availabilityScore = metrics.business.availability * 20;
    score -= (20 - availabilityScore);

    return Math.round(Math.max(0, Math.min(100, score)));
  }
}

/**
 * Main Performance Management System
 * Orchestrates monitoring, optimization, and reporting
 */
export class PerformanceManagementSystem extends EventEmitter {
  private monitor: RealTimePerformanceMonitor;
  private optimizer: PerformanceOptimizationEngine;

  constructor(thresholds?: PerformanceThresholds) {
    super();
    this.monitor = new RealTimePerformanceMonitor(thresholds);
    this.optimizer = new PerformanceOptimizationEngine(this.monitor);

    // Forward events
    this.monitor.on('alertsGenerated', (data) => this.emit('alertsGenerated', data));
    this.monitor.on('metricsCollected', (data) => this.emit('metricsCollected', data));
  }

  /**
   * Initialize performance monitoring for organization
   */
  async initialize(organizationId: string): Promise<void> {
    await this.monitor.startMonitoring(organizationId);
    this.emit('initialized', { organizationId });
  }

  /**
   * Get comprehensive performance dashboard data
   */
  async getPerformanceDashboard(organizationId: string): Promise<any> {
    const summary = await this.optimizer.getPerformanceSummary(organizationId);
    const recommendations = await this.optimizer.generateOptimizationRecommendations(organizationId);

    return {
      summary,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      monitoring: {
        isActive: this.monitor['isMonitoring'],
        lastUpdate: summary?.overall.lastUpdated || null
      }
    };
  }

  /**
   * Stop monitoring
   */
  shutdown(): void {
    this.monitor.stopMonitoring();
    this.emit('shutdown');
  }

  // Expose sub-components
  getMonitor(): RealTimePerformanceMonitor {
    return this.monitor;
  }

  getOptimizer(): PerformanceOptimizationEngine {
    return this.optimizer;
  }
}

// Export singleton instance
export const performanceManager = new PerformanceManagementSystem();