/**
 * Production Configuration Optimizer
 * Aligns environment configuration with Enterprise Connection Manager
 */

const fs = require('fs');
const path = require('path');

const OPTIMIZED_CONFIG = `# Production-Optimized Database Configuration
NODE_ENV=production
APP_PORT=3000

# Enterprise Database Connection (Optimized)
DATABASE_URL=postgresql://nxtdb_admin:P@33w0rd-1@62.169.20.53:6600/nxtprod-db_001
DB_HOST=62.169.20.53
DB_PORT=6600
DB_USER=nxtdb_admin
DB_PASSWORD=P@33w0rd-1
DB_NAME=nxtprod-db_001

# Optimized Connection Pool Configuration (Aligned with Enterprise Manager)
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_CONNECTION_TIMEOUT=3000
DB_ACQUIRE_TIMEOUT=10000
DB_IDLE_TIMEOUT=30000
DB_HEALTH_INTERVAL=30000

# Circuit Breaker Configuration
DB_CIRCUIT_THRESHOLD=5
DB_CIRCUIT_TIMEOUT=30000
DB_MAX_RETRIES=3
DB_RETRY_DELAY=2000

# Real-Time Configuration
REALTIME_ENABLED=true
WEBSOCKET_PORT=3001
SSE_ENABLED=true

# Authentication Configuration
JWT_SECRET=enterprise_jwt_secret_key_2024_production
SESSION_SECRET=enterprise_session_secret_key_2024
SESSION_TIMEOUT=3600000

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
UPLOAD_DIR=/app/uploads

# Performance Configuration (Production Optimized)
NODE_OPTIONS=--max-old-space-size=2048
ENABLE_CACHING=true
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Production Logging & Monitoring
LOG_LEVEL=warn
DEBUG_MODE=false
ENABLE_ANALYTICS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true

# API Security Configuration
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
CORS_ENABLED=true
CORS_ORIGIN=https://mantisnxt.com
`;

function optimizeConfiguration() {
    console.log('🔧 Starting Production Configuration Optimization...');

    // Backup current configuration
    const envPath = path.join(process.cwd(), '.env.local');
    const backupPath = path.join(process.cwd(), '.env.local.backup');

    try {
        if (fs.existsSync(envPath)) {
            fs.copyFileSync(envPath, backupPath);
            console.log('✅ Backed up current configuration to .env.local.backup');
        }

        // Apply optimized configuration
        fs.writeFileSync(envPath, OPTIMIZED_CONFIG);
        console.log('✅ Applied optimized production configuration');

        // Validate configuration
        validateConfiguration();

        console.log('🎉 Configuration optimization completed successfully!');
        console.log('📋 Key Changes:');
        console.log('   - Aligned pool settings with Enterprise Connection Manager');
        console.log('   - Optimized timeout configurations for production');
        console.log('   - Added circuit breaker configuration');
        console.log('   - Enabled performance monitoring');
        console.log('   - Added API security settings');

    } catch (error) {
        console.error('❌ Configuration optimization failed:', error.message);

        // Restore backup if exists
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, envPath);
            console.log('🔄 Restored previous configuration');
        }

        process.exit(1);
    }
}

function validateConfiguration() {
    const config = fs.readFileSync('.env.local', 'utf8');

    const requiredSettings = [
        'DB_POOL_MIN=2',
        'DB_POOL_MAX=10',
        'DB_CONNECTION_TIMEOUT=3000',
        'DB_ACQUIRE_TIMEOUT=10000',
        'DB_IDLE_TIMEOUT=30000'
    ];

    const missingSettings = requiredSettings.filter(setting =>
        !config.includes(setting)
    );

    if (missingSettings.length > 0) {
        throw new Error(`Missing required settings: ${missingSettings.join(', ')}`);
    }

    console.log('✅ Configuration validation passed');
}

if (require.main === module) {
    optimizeConfiguration();
}

module.exports = { optimizeConfiguration };