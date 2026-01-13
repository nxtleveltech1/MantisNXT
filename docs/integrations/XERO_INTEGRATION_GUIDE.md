# Xero Accounting Integration Guide

This guide covers the setup and configuration of the Xero accounting integration with MantisNXT.

## Prerequisites

1. A Xero organization account
2. Xero Developer Portal access (https://developer.xero.com)
3. Vercel deployment access for environment variables

## Environment Variables Setup

Add the following environment variables to your Vercel project:

| Variable | Required | Source | Description |
|----------|----------|--------|-------------|
| `XERO_CLIENT_ID` | Yes | Xero Developer Portal | OAuth 2.0 Client ID |
| `XERO_CLIENT_SECRET` | Yes | Xero Developer Portal | OAuth 2.0 Client Secret |
| `XERO_WEBHOOK_KEY` | Yes | Xero Developer Portal | Webhook signing key |
| `NEXT_PUBLIC_APP_URL` | Yes | Your domain | Full URL (e.g., `https://app.yourcompany.com`) |
| `PII_ENCRYPTION_KEY` | Yes | Generate securely | AES-256 encryption key for token storage |

### Step 1: Create a Xero App

1. Go to [Xero Developer Portal](https://developer.xero.com/app/manage)
2. Click "New app"
3. Fill in the details:
   - **App name**: MantisNXT (or your preferred name)
   - **Integration type**: Web app
   - **Company or application URL**: Your production URL
   - **OAuth 2.0 redirect URI**: `https://your-domain.com/api/xero/callback`
4. Save and copy the **Client ID** and **Client Secret**

### Step 2: Configure OAuth Scopes

The following scopes are requested automatically:
- `openid` - User identity
- `profile` - User profile info
- `email` - User email
- `offline_access` - Refresh token support
- `accounting.transactions` - Invoices, payments, credit notes
- `accounting.contacts` - Customers and suppliers
- `accounting.settings` - Chart of accounts
- `accounting.reports.read` - Financial reports

### Step 3: Configure Webhooks

1. In the Xero Developer Portal, navigate to your app
2. Click "Webhooks" in the left menu
3. Add a new webhook subscription:
   - **Delivery URL**: `https://your-domain.com/api/xero/webhooks`
   - **Event types**: Select all relevant types (invoices, contacts, payments)
4. Copy the **Webhook Key** that Xero generates
5. Add this key as `XERO_WEBHOOK_KEY` in Vercel

**Important**: When you save the webhook subscription, Xero sends an "Intent to Receive" validation request. Your endpoint must:
- Return HTTP 200
- Correctly validate the `x-xero-signature` header using the webhook key

If you see "Intent to receive required" error, verify:
1. `XERO_WEBHOOK_KEY` is set correctly in Vercel
2. The key matches exactly what Xero generated
3. Redeploy after adding the environment variable

### Step 4: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable:

```
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_WEBHOOK_KEY=your_webhook_key_here
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

4. Redeploy your application

### Step 5: Generate Encryption Key (if not already set)

```bash
# Generate a secure 32-byte key
openssl rand -base64 32
```

Add as `PII_ENCRYPTION_KEY` in Vercel.

## Usage

### Connecting to Xero

1. Navigate to **Integrations > Xero Accounting** in the sidebar
2. Click "Connect to Xero"
3. Authorize the application in Xero's consent screen
4. Configure account mappings for your chart of accounts

### Account Mappings

Map NXT transaction types to your Xero chart of accounts:

| NXT Transaction | Xero Account Type | Purpose |
|-----------------|-------------------|---------|
| Sales Revenue | REVENUE | Product sales |
| Service Revenue | REVENUE | Repairs, rentals |
| Cost of Goods Sold | DIRECTCOSTS | Inventory costs |
| Accounts Receivable | CURRENT | Customer balances |
| Accounts Payable | CURRLIAB | Supplier balances |
| Bank Account | BANK | Payment allocation |

### Sync Operations

| Entity | Direction | Trigger |
|--------|-----------|---------|
| Suppliers | NXT → Xero | Manual / On create |
| Customers | NXT → Xero | Manual / On create |
| Products | NXT → Xero | Manual sync |
| Invoices (AR) | NXT → Xero | On finalize |
| Bills (AP) | NXT → Xero | On create |
| Payments | Bidirectional | Webhook / Manual |

## Troubleshooting

### "Intent to receive" Webhook Error

**Cause**: `XERO_WEBHOOK_KEY` is not set or incorrect.

**Solution**:
1. Verify the key in Xero Developer Portal > Your App > Webhooks
2. Copy the exact key (no extra spaces)
3. Add/update in Vercel environment variables
4. Redeploy the application
5. In Xero, resend the intent-to-receive validation

### OAuth Connection Fails

**Cause**: Redirect URI mismatch or invalid credentials.

**Solution**:
1. Verify `NEXT_PUBLIC_APP_URL` matches your domain exactly
2. Check that OAuth redirect URI in Xero app matches: `{NEXT_PUBLIC_APP_URL}/api/xero/callback`
3. Verify `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` are correct

### Token Encryption Error

**Cause**: `PII_ENCRYPTION_KEY` not configured.

**Solution**:
1. Generate a new key: `openssl rand -base64 32`
2. Add as `PII_ENCRYPTION_KEY` in Vercel
3. Redeploy

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/xero/auth` | GET | Initiate OAuth flow |
| `/api/xero/callback` | GET | OAuth callback handler |
| `/api/xero/connection` | GET | Check connection status |
| `/api/xero/disconnect` | POST | Revoke connection |
| `/api/xero/webhooks` | POST | Receive Xero events |
| `/api/xero/accounts` | GET | Fetch chart of accounts |
| `/api/xero/mappings` | GET/POST | Manage account mappings |
| `/api/xero/sync/*` | POST | Trigger sync operations |
| `/api/xero/reports/*` | GET | Fetch financial reports |

## Database Tables

The integration uses the following tables:

- `xero_connections` - OAuth tokens and tenant info
- `xero_entity_mappings` - NXT ↔ Xero ID mappings
- `xero_account_mappings` - Chart of accounts configuration
- `xero_sync_log` - Sync operation audit trail
- `xero_webhook_events` - Webhook event queue

## Security Considerations

1. **Token Encryption**: Access and refresh tokens are encrypted at rest using AES-256-GCM
2. **Webhook Validation**: All webhooks are validated using HMAC-SHA256 with timing-safe comparison
3. **OAuth State**: CSRF protection via cryptographic state parameter
4. **Rate Limiting**: Built-in rate limiter respects Xero's API limits (60/min, 5000/day)
