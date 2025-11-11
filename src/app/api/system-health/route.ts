import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

// System Health API Endpoint
export async function GET(request: NextRequest) {
  try {
    // Simulate real-time system data gathering
    const systemHealth = await gatherSystemData()
    
    return NextResponse.json({
      success: true,
      data: systemHealth,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('System health check failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to gather system health data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function gatherSystemData() {
  // Simulate gathering data from various system components
  const now = new Date()
  
  // Service status with more detailed metrics
  const services = [
    {
      name: "Web Server (Nginx)",
      status: "healthy",
      responseTime: 95 + Math.random() * 50,
      uptime: "99.94%",
      requestsPerSecond: Math.floor(Math.random() * 100) + 50,
      errors: Math.floor(Math.random() * 5),
      lastCheck: now.toISOString(),
      url: "/health/web-server"
    },
    {
      name: "API Gateway",
      status: Math.random() > 0.8 ? "warning" : "healthy",
      responseTime: 120 + Math.random() * 80,
      uptime: "99.89%",
      requestsPerSecond: Math.floor(Math.random() * 200) + 100,
      errors: Math.floor(Math.random() * 3),
      lastCheck: now.toISOString(),
      url: "/health/api-gateway"
    },
    {
      name: "Authentication Service",
      status: Math.random() > 0.9 ? "error" : "healthy",
      responseTime: 80 + Math.random() * 40,
      uptime: "98.7%",
      requestsPerSecond: Math.floor(Math.random() * 150) + 75,
      errors: Math.floor(Math.random() * 8),
      lastCheck: now.toISOString(),
      url: "/health/auth"
    },
    {
      name: "File Storage (AWS S3)",
      status: "healthy",
      responseTime: 150 + Math.random() * 100,
      uptime: "99.99%",
      requestsPerSecond: Math.floor(Math.random() * 300) + 200,
      errors: 0,
      lastCheck: now.toISOString(),
      url: "/health/storage"
    },
    {
      name: "Email Service (SendGrid)",
      status: Math.random() > 0.7 ? "error" : "healthy",
      responseTime: 200 + Math.random() * 300,
      uptime: "96.8%",
      requestsPerSecond: Math.floor(Math.random() * 50) + 25,
      errors: Math.floor(Math.random() * 12),
      lastCheck: now.toISOString(),
      url: "/health/email"
    },
    {
      name: "Cache Layer (Redis)",
      status: "healthy",
      responseTime: 2 + Math.random() * 8,
      uptime: "99.97%",
      requestsPerSecond: Math.floor(Math.random() * 1000) + 500,
      errors: 0,
      lastCheck: now.toISOString(),
      url: "/health/cache"
    }
  ]

  // Database health with more detailed metrics
  const databases = [
    {
      name: "PostgreSQL (Primary)",
      host: "db-primary.internal",
      status: "connected",
      responseTime: 8 + Math.random() * 15,
      connections: {
        active: Math.floor(Math.random() * 45) + 20,
        total: 100,
        max: 200
      },
      queryPerformance: {
        avgQueryTime: 12 + Math.random() * 20,
        slowQueries: Math.floor(Math.random() * 3),
        totalQueries: Math.floor(Math.random() * 10000) + 5000
      },
      replication: {
        status: "healthy",
        lag: Math.random() * 100,
        followerCount: 2
      },
      backups: {
        lastBackup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        status: "success"
      }
    },
    {
      name: "Redis Cache",
      host: "cache.internal",
      status: "connected",
      responseTime: 1 + Math.random() * 5,
      connections: {
        active: Math.floor(Math.random() * 25) + 5,
        total: 50,
        max: 100
      },
      queryPerformance: {
        avgQueryTime: 1 + Math.random() * 3,
        slowQueries: 0,
        totalQueries: Math.floor(Math.random() * 50000) + 25000
      },
      memory: {
        used: Math.floor(Math.random() * 1000) + 500,
        total: 2048,
        percentage: Math.floor(Math.random() * 60) + 30
      }
    },
    {
      name: "MongoDB (Analytics)",
      host: "mongo-analytics.internal",
      status: Math.random() > 0.8 ? "slow" : "connected",
      responseTime: 150 + Math.random() * 200,
      connections: {
        active: Math.floor(Math.random() * 15) + 3,
        total: 20,
        max: 50
      },
      queryPerformance: {
        avgQueryTime: 100 + Math.random() * 150,
        slowQueries: Math.floor(Math.random() * 8) + 1,
        totalQueries: Math.floor(Math.random() * 5000) + 2000
      },
      storage: {
        used: Math.floor(Math.random() * 500) + 200,
        total: 1000,
        percentage: Math.floor(Math.random() * 70) + 25
      }
    }
  ]

  // System metrics
  const systemMetrics = {
    cpu: {
      usage: Math.floor(Math.random() * 100),
      cores: 16,
      loadAverage: [Math.random() * 2, Math.random() * 1.5, Math.random() * 1],
      temperature: 35 + Math.random() * 25
    },
    memory: {
      used: Math.floor(Math.random() * 32) + 24,
      total: 64,
      percentage: Math.floor(Math.random() * 70) + 20,
      swapUsed: Math.floor(Math.random() * 10),
      swapTotal: 16
    },
    disk: {
      used: Math.floor(Math.random() * 500) + 300,
      total: 1000,
      percentage: Math.floor(Math.random() * 80) + 10,
      readSpeed: Math.random() * 1000 + 200,
      writeSpeed: Math.random() * 800 + 150
    },
    network: {
      inbound: Math.random() * 100 + 10,
      outbound: Math.random() * 50 + 5,
      packetsIn: Math.floor(Math.random() * 10000) + 5000,
      packetsOut: Math.floor(Math.random() * 5000) + 2500,
      errors: Math.floor(Math.random() * 5)
    }
  }

  // Security status
  const securityStatus = {
    ssl: {
      status: "valid",
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      issuer: "Let's Encrypt"
    },
    firewall: {
      status: "active",
      rules: 45,
      blockedIPs: 12
    },
    vulnerability: {
      status: "no-issues",
      lastScan: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      findings: 0
    },
    authentication: {
      activeSessions: Math.floor(Math.random() * 150) + 50,
      failedAttempts: Math.floor(Math.random() * 20),
      lockouts: Math.floor(Math.random() * 3)
    }
  }

  // Application metrics
  const applicationMetrics = {
    version: "2.1.4",
    uptime: "15 days, 7 hours",
    gitCommit: "a7b8c9d",
    buildDate: "2024-01-15T10:30:00Z",
    environment: "production",
    features: {
      aiSuppliers: { status: "healthy", lastUpdate: now.toISOString() },
      webScraping: { status: "healthy", lastUpdate: now.toISOString() },
      databaseIntegration: { status: "healthy", lastUpdate: now.toISOString() },
      realTimeMonitoring: { status: "healthy", lastUpdate: now.toISOString() }
    }
  }

  // Performance benchmarks
  const performanceBenchmarks = {
    apiLatency: {
      p50: Math.floor(Math.random() * 100) + 50,
      p95: Math.floor(Math.random() * 200) + 100,
      p99: Math.floor(Math.random() * 500) + 250
    },
    throughput: {
      requestsPerSecond: Math.floor(Math.random() * 1000) + 500,
      peakRequestsPerSecond: Math.floor(Math.random() * 2000) + 1000
    },
    errorRate: Math.random() * 0.1,
    availability: 99.5 + Math.random() * 0.4
  }

  return {
    overall: {
      status: calculateOverallStatus(services),
      score: calculateHealthScore(services, databases),
      lastUpdated: now.toISOString()
    },
    services,
    databases,
    system: systemMetrics,
    security: securityStatus,
    application: applicationMetrics,
    performance: performanceBenchmarks
  }
}

function calculateOverallStatus(services: unknown[]): string {
  const hasError = services.some(s => s.status === 'error')
  const hasWarning = services.some(s => s.status === 'warning')
  
  if (hasError) return 'critical'
  if (hasWarning) return 'warning'
  return 'healthy'
}

function calculateHealthScore(services: unknown[], databases: unknown[]): number {
  let score = 100
  
  services.forEach(service => {
    if (service.status === 'error') score -= 20
    if (service.status === 'warning') score -= 10
    score -= Math.min(service.errors * 2, 10)
  })
  
  databases.forEach(db => {
    if (db.status === 'disconnected') score -= 30
    if (db.status === 'slow') score -= 15
  })
  
  return Math.max(0, score)
}