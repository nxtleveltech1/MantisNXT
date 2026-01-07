# Social Media & Marketing Module - Environment Variables

> Complete guide for setting up environment variables for the Social Media & Marketing module in MantisNXT.

---

## 📋 Quick Reference

| Priority | Variable | Required For |
|----------|----------|--------------|
| 🔴 Required | `DATABASE_URL` | Core functionality |
| 🔴 Required | `JWT_SECRET` | Authentication |
| 🔴 Required | `SESSION_SECRET` | Sessions |
| 🟡 Optional | `SOCIAL_MEDIA_DATABASE_URL` | Separate social media database |
| 🟡 Optional | `SOCIAL_MEDIA_ENCRYPTION_KEY` | Credential encryption |
| 🟢 Integration | `META_*` | Facebook/Instagram |
| 🟢 Integration | `WHATSAPP_*` / `TWILIO_*` | WhatsApp messaging |
| 🟢 Integration | `TIKTOK_*` | TikTok integration |

---

## 🔴 Required Variables (Already in your setup)

These should already be configured in your Vercel environment:

```bash
# Main Database
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-example-pooler.gwc.azure.neon.tech/neondb?sslmode=require&pgbouncer=true

# App Secrets (must be >= 32 characters)
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
SESSION_SECRET=your_session_secret_at_least_32_characters_long
```

---

## 🟡 Social Media Module Variables (Optional)

### Database Configuration

```bash
# Separate database for Social Media module
# If not set, uses main DATABASE_URL
SOCIAL_MEDIA_DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-social-example.neon.tech/social_media_db?sslmode=require
```

### Credential Encryption

```bash
# 32-byte base64 encoded key for encrypting social media credentials
# Generate with: openssl rand -base64 32
SOCIAL_MEDIA_ENCRYPTION_KEY="YOUR_32_BYTE_BASE64_KEY_HERE"
```

---

## 🟢 Platform Integration Variables

### Meta (Facebook & Instagram)

Required for Facebook/Instagram OAuth and API access:

```bash
# Get these from https://developers.facebook.com
META_APP_ID="your_meta_app_id"
META_APP_SECRET="your_meta_app_secret"

# OAuth callback URL - update with your domain
META_REDIRECT_URI="https://your-app.vercel.app/api/social-media/oauth/meta/callback"

# Random string for webhook verification
META_WEBHOOK_VERIFY_TOKEN="your_random_webhook_verify_token"
```

### WhatsApp Integration

**Choose ONE of the following options:**

#### Option A: Twilio (Recommended - Easiest setup)

```bash
# Get these from https://console.twilio.com
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

#### Option B: Meta Cloud API (Direct)

```bash
# Get these from Meta Business Manager
WHATSAPP_BUSINESS_PHONE_NUMBER="+27761478369"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_business_account_id"
WHATSAPP_ACCESS_TOKEN="your_whatsapp_access_token"
WHATSAPP_CLOUD_API_PHONE_NUMBER_ID="your_phone_number_id"
WHATSAPP_CLOUD_API_ACCESS_TOKEN="your_cloud_api_access_token"
```

### TikTok Integration (Optional)

```bash
# Get these from https://developers.tiktok.com
TIKTOK_CLIENT_KEY="your_tiktok_client_key"
TIKTOK_CLIENT_SECRET="your_tiktok_client_secret"

# OAuth callback URL - update with your domain
TIKTOK_REDIRECT_URI="https://your-app.vercel.app/api/social-media/oauth/tiktok/callback"
```

### Media Storage

```bash
# Vercel Blob storage for media uploads
# Get from Vercel Dashboard → Storage → Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxxx"
```

### Advanced Meta Features (Optional)

```bash
# For Meta Conversions API and Commerce features
META_PIXEL_ID="your_pixel_id"
META_BUSINESS_ID="your_business_id"
META_AD_ACCOUNT_ID="act_your_ad_account_id"
```

---

## 🚀 Vercel Setup Instructions

### Step 1: Navigate to Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your MantisNXT project
3. Click **Settings** → **Environment Variables**

### Step 2: Add Variables

Add each variable with the appropriate environment scope:

| Variable | Development | Preview | Production |
|----------|:-----------:|:-------:|:----------:|
| `SOCIAL_MEDIA_DATABASE_URL` | ✅ | ✅ | ✅ |
| `SOCIAL_MEDIA_ENCRYPTION_KEY` | ✅ | ✅ | ✅ |
| `META_APP_ID` | ✅ | ✅ | ✅ |
| `META_APP_SECRET` | ✅ | ✅ | ✅ |
| `META_REDIRECT_URI` | ❌ | ✅ | ✅ |
| `TWILIO_*` or `WHATSAPP_*` | ✅ | ✅ | ✅ |
| `TIKTOK_*` | ✅ | ✅ | ✅ |
| `BLOB_READ_WRITE_TOKEN` | ✅ | ✅ | ✅ |

> **Note:** For `META_REDIRECT_URI` and `TIKTOK_REDIRECT_URI`, use different values for preview vs production to match your deployment URLs.

### Step 3: Redeploy

After adding all variables, trigger a new deployment:

```bash
vercel --prod
```

---

## 📝 Complete .env.local Template

Copy this to your `.env.local` file and fill in the values:

```bash
# ============================================
# SOCIAL MEDIA & MARKETING MODULE
# ============================================

# --- Database (Optional - uses main DB if not set) ---
SOCIAL_MEDIA_DATABASE_URL=

# --- Encryption ---
SOCIAL_MEDIA_ENCRYPTION_KEY=

# --- Meta (Facebook/Instagram) ---
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/social-media/oauth/meta/callback
META_WEBHOOK_VERIFY_TOKEN=

# --- WhatsApp via Twilio (Recommended) ---
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# --- WhatsApp via Meta (Alternative) ---
# WHATSAPP_BUSINESS_PHONE_NUMBER=
# WHATSAPP_BUSINESS_ACCOUNT_ID=
# WHATSAPP_ACCESS_TOKEN=
# WHATSAPP_CLOUD_API_PHONE_NUMBER_ID=
# WHATSAPP_CLOUD_API_ACCESS_TOKEN=

# --- TikTok (Optional) ---
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3000/api/social-media/oauth/tiktok/callback

# --- Media Storage ---
BLOB_READ_WRITE_TOKEN=

# --- Advanced Meta Features (Optional) ---
# META_PIXEL_ID=
# META_BUSINESS_ID=
# META_AD_ACCOUNT_ID=
```

---

## 🔐 Generating Encryption Key

Run this command to generate a secure encryption key:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Bun
bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
```

---

## ✅ Verification Checklist

After setting up environment variables, verify:

- [ ] App starts without errors
- [ ] Social Media dashboard loads at `/social-media-app`
- [ ] Channels page shows (even with mock data)
- [ ] Inbox page loads without errors
- [ ] Sales page displays products

### Testing Platform Connections

1. **Facebook/Instagram**: Click "Connect" on a Facebook channel
2. **WhatsApp**: Check that messages can be sent (if Twilio configured)
3. **TikTok**: Test OAuth flow if credentials are set

---

## 🆘 Troubleshooting

### "Invalid encryption key" error
- Ensure `SOCIAL_MEDIA_ENCRYPTION_KEY` is exactly 32 bytes when decoded from base64

### OAuth callback errors
- Verify `META_REDIRECT_URI` matches your domain exactly
- Check that the URI is whitelisted in Meta Developers console

### Database connection errors
- Confirm `SOCIAL_MEDIA_DATABASE_URL` uses `sslmode=require`
- If using the main database, leave `SOCIAL_MEDIA_DATABASE_URL` unset

---

## 📚 Related Documentation

- [Meta Developers - Quick Setup](./META_APP_QUICK_SETUP.md)
- [WhatsApp Business Setup](./WHATSAPP_BUSINESS_NON_META_SETUP.md)
- [Twilio WhatsApp Guide](./TWILIO_WHATSAPP_BUSINESS_COMPLETE_GUIDE.md)

---

*Last updated: January 2026*

