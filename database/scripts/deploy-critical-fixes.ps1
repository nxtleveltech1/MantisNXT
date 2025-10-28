################################################################################
# Critical Database Fixes Deployment Script (PowerShell)
################################################################################
# Deploys critical migrations to fix:
#   - Analytics sequences (005)
#   - Supplier contact_person column (006)
#
# Usage:
#   .\database\scripts\deploy-critical-fixes.ps1
#   powershell -ExecutionPolicy Bypass -File .\database\scripts\deploy-critical-fixes.ps1
#
# Requirements:
#   - psql (PostgreSQL client) in PATH
#   - DATABASE_URL or NEON_SPP_DATABASE_URL environment variable
################################################################################

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# Script paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$MigrationsDir = Join-Path $ProjectRoot "database\migrations"

# Colors (using ANSI escape codes - works in PowerShell 5.1+)
$Script:Colors = @{
    Red     = "`e[31m"
    Green   = "`e[32m"
    Yellow  = "`e[33m"
    Blue    = "`e[34m"
    Cyan    = "`e[36m"
    Bold    = "`e[1m"
    Reset   = "`e[0m"
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "$($Colors.Blue)→$($Colors.Reset) $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "$($Colors.Green)✓$($Colors.Reset) $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "$($Colors.Red)✗$($Colors.Reset) $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "$($Colors.Yellow)⚠$($Colors.Reset) $Message"
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "$($Colors.Bold)$($Colors.Cyan)$Message$($Colors.Reset)"
    Write-Host "$($Colors.Cyan)$('=' * 60)$($Colors.Reset)"
}

# Check prerequisites
function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    # Check psql
    $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlCmd) {
        Write-Error "psql not found. Please install PostgreSQL client and add to PATH."
        exit 1
    }

    $psqlVersion = & psql --version 2>&1 | Select-Object -First 1
    Write-Success "psql found: $psqlVersion"

    # Check database URL
    $Script:DbUrl = $env:NEON_SPP_DATABASE_URL
    if (-not $Script:DbUrl) {
        $Script:DbUrl = $env:DATABASE_URL
    }

    if (-not $Script:DbUrl) {
        Write-Error "DATABASE_URL or NEON_SPP_DATABASE_URL not set"
        exit 1
    }

    Write-Success "Database URL configured"

    # Test connection
    try {
        $null = & psql $Script:DbUrl -c "SELECT 1" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Database connection verified"
        } else {
            Write-Error "Cannot connect to database"
            exit 1
        }
    } catch {
        Write-Error "Cannot connect to database: $_"
        exit 1
    }
}

# Deploy single migration
function Deploy-Migration {
    param(
        [string]$MigrationFile
    )

    $migrationPath = Join-Path $MigrationsDir $MigrationFile

    if (-not (Test-Path $migrationPath)) {
        Write-Error "Migration file not found: $MigrationFile"
        return $false
    }

    Write-Info "Deploying $MigrationFile..."

    try {
        $output = & psql $Script:DbUrl -v ON_ERROR_STOP=1 -f $migrationPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$MigrationFile deployed successfully"
            return $true
        } else {
            Write-Error "$MigrationFile deployment failed"
            Write-Host $output
            return $false
        }
    } catch {
        Write-Error "$MigrationFile deployment failed: $_"
        return $false
    }
}

# Verify analytics sequences
function Test-AnalyticsSequences {
    Write-Info "Verifying analytics sequences..."

    $query = @"
SELECT COUNT(*)
FROM information_schema.sequences
WHERE sequence_schema = 'core'
AND sequence_name IN (
  'analytics_anomalies_anomaly_id_seq',
  'analytics_predictions_prediction_id_seq'
)
"@

    try {
        $result = & psql $Script:DbUrl -t -A -c $query 2>&1
        if ($LASTEXITCODE -eq 0 -and $result -eq "2") {
            Write-Success "Analytics sequences verified (2/2)"
            return $true
        } else {
            Write-Error "Analytics sequences missing ($result/2)"
            return $false
        }
    } catch {
        Write-Error "Analytics sequences verification failed: $_"
        return $false
    }
}

# Verify contact_person column
function Test-ContactPerson {
    Write-Info "Verifying contact_person column..."

    $query = @"
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'core'
  AND table_name = 'supplier'
  AND column_name = 'contact_person'
"@

    try {
        $result = & psql $Script:DbUrl -t -A -c $query 2>&1
        if ($LASTEXITCODE -eq 0 -and $result -eq "1") {
            Write-Success "contact_person column verified"

            # Check GIN index
            $idxQuery = @"
SELECT COUNT(*)
FROM pg_indexes
WHERE schemaname = 'core'
  AND tablename = 'supplier'
  AND indexname = 'idx_supplier_contact_person_gin'
"@

            $idxResult = & psql $Script:DbUrl -t -A -c $idxQuery 2>&1
            if ($LASTEXITCODE -eq 0 -and $idxResult -eq "1") {
                Write-Success "GIN index verified"
            } else {
                Write-Warning "GIN index missing (non-critical)"
            }

            return $true
        } else {
            Write-Error "contact_person column missing"
            return $false
        }
    } catch {
        Write-Error "contact_person verification failed: $_"
        return $false
    }
}

# Main deployment function
function Main {
    $startTime = Get-Date

    Write-Header "CRITICAL DATABASE FIXES DEPLOYMENT"

    # Check prerequisites
    Test-Prerequisites

    # Deploy migrations
    Write-Header "Deploying Migrations"

    $migrations = @(
        "005_fix_analytics_sequences.sql",
        "006_add_supplier_contact_person.sql"
    )

    $failed = $false
    foreach ($migration in $migrations) {
        if (-not (Deploy-Migration $migration)) {
            $failed = $true
            break
        }
    }

    if ($failed) {
        Write-Error "Deployment failed"
        exit 1
    }

    # Verify deployments
    Write-Header "Verifying Deployments"

    $verifyFailed = $false
    if (-not (Test-AnalyticsSequences)) { $verifyFailed = $true }
    if (-not (Test-ContactPerson)) { $verifyFailed = $true }

    # Calculate duration
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds

    # Final status
    Write-Host ""
    if (-not $verifyFailed) {
        Write-Header "✓ DEPLOYMENT SUCCESSFUL"
        Write-Host "$($Colors.Green)All critical fixes deployed and verified$($Colors.Reset)"
        Write-Host "$($Colors.Cyan)Duration: $($duration.ToString('F2'))s$($Colors.Reset)"
    } else {
        Write-Header "⚠ DEPLOYMENT COMPLETED WITH WARNINGS"
        Write-Host "$($Colors.Yellow)Some verification checks failed$($Colors.Reset)"
        Write-Host "$($Colors.Cyan)Duration: $($duration.ToString('F2'))s$($Colors.Reset)"
        exit 1
    }

    Write-Host ""
}

# Run main function
try {
    Main
} catch {
    Write-Error "Fatal error: $_"
    exit 1
}
