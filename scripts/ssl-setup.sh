#!/bin/bash

# SSL Certificate setup for MantisNXT production deployment
set -euo pipefail

# Configuration
DOMAIN=${DOMAIN:-localhost}
SSL_DIR="./ssl"
EMAIL=${SSL_EMAIL:-admin@${DOMAIN}}
CERTBOT_WEBROOT="/var/www/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create SSL directory
create_ssl_directory() {
    log_info "Creating SSL directory structure..."
    mkdir -p "$SSL_DIR"
    chmod 700 "$SSL_DIR"
}

# Generate self-signed certificate for development/testing
generate_self_signed() {
    log_info "Generating self-signed SSL certificate for $DOMAIN..."

    # Generate private key
    openssl genrsa -out "$SSL_DIR/key.pem" 2048

    # Generate certificate signing request
    openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=$DOMAIN"

    # Generate self-signed certificate
    openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem"

    # Generate DH parameters
    openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

    # Set proper permissions
    chmod 600 "$SSL_DIR"/*.pem
    chmod 600 "$SSL_DIR"/*.csr

    # Clean up CSR
    rm "$SSL_DIR/cert.csr"

    log_success "Self-signed certificate generated for $DOMAIN"
    log_warning "Self-signed certificates should only be used for development/testing"
}

# Setup Let's Encrypt with Certbot
setup_letsencrypt() {
    log_info "Setting up Let's Encrypt SSL certificate for $DOMAIN..."

    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot not found. Please install certbot first."
        log_info "On Ubuntu/Debian: sudo apt-get install certbot python3-certbot-nginx"
        log_info "On CentOS/RHEL: sudo yum install certbot python3-certbot-nginx"
        exit 1
    fi

    # Create webroot directory
    mkdir -p "$CERTBOT_WEBROOT"

    # Stop nginx temporarily to allow certbot standalone mode
    log_info "Stopping nginx for certificate generation..."
    docker-compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true

    # Generate certificate using standalone mode
    log_info "Requesting SSL certificate from Let's Encrypt..."
    certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN" \
        --cert-path "$SSL_DIR/cert.pem" \
        --key-path "$SSL_DIR/key.pem" \
        --fullchain-path "$SSL_DIR/fullchain.pem" \
        --chain-path "$SSL_DIR/chain.pem"

    # Copy certificates to SSL directory
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$SSL_DIR/chain.pem"
    fi

    # Generate DH parameters if not exists
    if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
        log_info "Generating DH parameters..."
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
    fi

    # Set proper permissions
    chmod 600 "$SSL_DIR"/*.pem

    # Restart nginx
    log_info "Starting nginx with SSL configuration..."
    docker-compose -f docker-compose.prod.yml up -d nginx

    log_success "Let's Encrypt certificate configured for $DOMAIN"
}

# Setup certificate renewal
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."

    # Create renewal script
    cat > "$SSL_DIR/renew-cert.sh" << 'EOF'
#!/bin/bash

# Certificate renewal script
DOMAIN=${DOMAIN:-localhost}
SSL_DIR="./ssl"

# Renew certificate
certbot renew --quiet

# Copy renewed certificates
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$SSL_DIR/chain.pem"

    # Reload nginx
    docker-compose -f docker-compose.prod.yml restart nginx

    echo "SSL certificate renewed and nginx reloaded"
fi
EOF

    chmod +x "$SSL_DIR/renew-cert.sh"

    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null || true; echo "0 12,0 * * * cd $(pwd) && ./ssl/renew-cert.sh >/dev/null 2>&1") | crontab -

    log_success "Certificate renewal configured (runs twice daily)"
}

# Verify SSL configuration
verify_ssl() {
    log_info "Verifying SSL configuration..."

    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        log_error "SSL certificates not found"
        return 1
    fi

    # Check certificate validity
    if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout > /dev/null 2>&1; then
        local expiry_date=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -dates | grep notAfter | cut -d= -f2)
        log_success "SSL certificate is valid until: $expiry_date"
    else
        log_error "SSL certificate is invalid"
        return 1
    fi

    # Check private key
    if openssl rsa -in "$SSL_DIR/key.pem" -check -noout > /dev/null 2>&1; then
        log_success "SSL private key is valid"
    else
        log_error "SSL private key is invalid"
        return 1
    fi

    # Check if certificate and key match
    local cert_hash=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -modulus | openssl md5)
    local key_hash=$(openssl rsa -in "$SSL_DIR/key.pem" -noout -modulus | openssl md5)

    if [ "$cert_hash" = "$key_hash" ]; then
        log_success "SSL certificate and private key match"
    else
        log_error "SSL certificate and private key do not match"
        return 1
    fi

    return 0
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --domain DOMAIN      Domain name for SSL certificate (default: localhost)"
    echo "  --email EMAIL        Email for Let's Encrypt registration"
    echo "  --letsencrypt        Use Let's Encrypt for production SSL"
    echo "  --self-signed        Generate self-signed certificate (development)"
    echo "  --verify             Verify existing SSL configuration"
    echo "  --renew              Setup certificate renewal (Let's Encrypt only)"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --self-signed                          # Development certificate"
    echo "  $0 --letsencrypt --domain example.com     # Production certificate"
    echo "  $0 --verify                               # Verify existing certificate"
}

# Main function
main() {
    local action=""

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --email)
                EMAIL="$2"
                shift 2
                ;;
            --letsencrypt)
                action="letsencrypt"
                shift
                ;;
            --self-signed)
                action="self-signed"
                shift
                ;;
            --verify)
                action="verify"
                shift
                ;;
            --renew)
                action="renew"
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    if [ -z "$action" ]; then
        log_error "No action specified"
        usage
        exit 1
    fi

    create_ssl_directory

    case $action in
        "self-signed")
            generate_self_signed
            verify_ssl
            ;;
        "letsencrypt")
            setup_letsencrypt
            setup_renewal
            verify_ssl
            ;;
        "verify")
            verify_ssl
            ;;
        "renew")
            setup_renewal
            ;;
        *)
            log_error "Unknown action: $action"
            usage
            exit 1
            ;;
    esac

    log_success "SSL setup completed successfully!"
}

# Run main function with all arguments
main "$@"