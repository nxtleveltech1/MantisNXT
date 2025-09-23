# Secrets Management

This directory contains sensitive configuration files for production deployment.

## Required Secret Files

Create the following files with secure random values:

### Database Secrets
```bash
# postgres_password.txt
echo "$(openssl rand -base64 32)" > postgres_password.txt
```

### Application Secrets
```bash
# jwt_secret.txt
echo "$(openssl rand -base64 32)" > jwt_secret.txt

# supabase_service_key.txt
echo "your_supabase_service_role_key" > supabase_service_key.txt
```

### Monitoring Secrets
```bash
# grafana_password.txt
echo "$(openssl rand -base64 16)" > grafana_password.txt
```

## Security Notes

- Never commit these files to version control
- Use proper file permissions (600)
- Rotate secrets regularly
- Use a proper secret management system in production

## Example Commands

```bash
# Create all secrets at once
./scripts/generate-secrets.sh

# Set proper permissions
chmod 600 secrets/*.txt
```

## Production Considerations

For production environments, consider using:
- Docker Swarm secrets
- Kubernetes secrets
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager