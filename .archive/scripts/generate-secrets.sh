#!/bin/bash

# Generate secure secrets for production deployment
set -euo pipefail

SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"

echo "🔐 Generating secrets for MantisNXT deployment..."

# Generate database password
echo "Generating database password..."
openssl rand -base64 32 > "$SECRETS_DIR/postgres_password.txt"

# Generate JWT secret
echo "Generating JWT secret..."
openssl rand -base64 32 > "$SECRETS_DIR/jwt_secret.txt"

# Generate Grafana password
echo "Generating Grafana admin password..."
openssl rand -base64 16 > "$SECRETS_DIR/grafana_password.txt"

# Placeholder for Supabase service key (must be set manually)
if [ ! -f "$SECRETS_DIR/supabase_service_key.txt" ]; then
    echo "your_supabase_service_role_key_here" > "$SECRETS_DIR/supabase_service_key.txt"
    echo "⚠️  Please update $SECRETS_DIR/supabase_service_key.txt with your actual Supabase service role key"
fi

# Set proper permissions
chmod 600 "$SECRETS_DIR"/*.txt

echo "✅ Secrets generated successfully!"
echo ""
echo "📝 Generated files:"
ls -la "$SECRETS_DIR"
echo ""
echo "🔒 File permissions set to 600 (owner read/write only)"
echo ""
echo "⚠️  Remember to:"
echo "   1. Update supabase_service_key.txt with your actual key"
echo "   2. Never commit these files to version control"
echo "   3. Backup these secrets securely"
echo "   4. Rotate secrets regularly"

# Create .gitignore entry if it doesn't exist
if ! grep -q "secrets/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Secrets" >> .gitignore
    echo "secrets/*.txt" >> .gitignore
    echo "secrets/*.key" >> .gitignore
    echo "secrets/*.pem" >> .gitignore
    echo "✅ Added secrets/ to .gitignore"
fi