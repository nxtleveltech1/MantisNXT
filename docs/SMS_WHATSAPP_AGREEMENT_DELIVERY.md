# SMS/WhatsApp Agreement Delivery

This feature allows sending rental agreements to customers via SMS or WhatsApp for digital signature acceptance.

## Overview

When a rental reservation is created, customers can receive the agreement for signing through:
- **SMS**: Standard text message with signing link
- **WhatsApp**: Rich formatted message with signing link

The customer clicks the link, reviews the terms and conditions, draws their signature, and submits electronically.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Reservation    │────▶│  MessagingService │────▶│  Twilio API      │
│  Detail Page    │     │  (SMS/WhatsApp)   │     │                  │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  agreement_      │
                        │  deliveries      │
                        │  (tracking DB)   │
                        └──────────────────┘
                                │
                                ▼
┌─────────────────┐     ┌──────────────────┐
│  Customer       │◀────│  Public Signing  │
│  (Phone)        │     │  Page            │
└─────────────────┘     └──────────────────┘
```

## Components

### 1. MessagingService (`src/lib/services/messaging/`)
- Handles SMS and WhatsApp delivery via Twilio
- Manages signing tokens and delivery tracking
- Formats phone numbers to E.164 format

### 2. SendAgreementDialog (`src/components/rentals/SendAgreementDialog.tsx`)
- UI for selecting delivery channel (SMS/WhatsApp)
- Shows delivery history with status tracking
- Allows resending if needed

### 3. Public Signing Page (`src/app/sign/[id]/page.tsx`)
- Mobile-friendly agreement viewing
- Touch-enabled signature pad
- Terms acceptance checkboxes
- Secure token-based access

### 4. API Routes
- `POST /api/rentals/reservations/[id]/agreement/send` - Send agreement
- `GET /api/rentals/reservations/[id]/agreement/send` - Get delivery history
- `GET /api/sign/[id]/verify` - Verify signing token
- `POST /api/sign/[id]/submit` - Submit signature

## Environment Variables

Add the following to your `.env.local`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+27xxxxxxxxx  # SMS sender number
TWILIO_WHATSAPP_NUMBER=+27xxxxxxxxx  # WhatsApp sender number
```

### Getting Twilio Credentials

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token from the Console Dashboard
3. Purchase a phone number for SMS
4. For WhatsApp, join the [Twilio Sandbox](https://www.twilio.com/console/sms/whatsapp/sandbox) or apply for a WhatsApp Business API number

## Database Migration

Run the migration to create required tables:

```sql
-- Run from: database/migrations/0041_agreement_delivery_tracking.sql
```

This creates:
- `rentals.agreement_deliveries` - Tracks delivery attempts and signing status
- Adds signature columns to `rentals.rental_agreements`
- `core.messaging_settings` - Org-specific messaging configuration

## Usage

### Sending an Agreement

1. Navigate to a reservation detail page
2. Go to the "Agreement" tab
3. Click "Send Agreement"
4. Choose SMS or WhatsApp
5. Enter/verify the phone number
6. Click "Send"

### Customer Flow

1. Customer receives SMS/WhatsApp with link
2. Clicks link to open signing page
3. Reviews rental details and equipment list
4. Reads Terms and Conditions (must check acceptance)
5. Reads Liability Waiver (must check acceptance)
6. Draws signature on canvas
7. Clicks "Sign & Submit Agreement"
8. Sees confirmation screen

### Tracking Status

The delivery history shows:
- **Pending**: Message queued
- **Sent**: Message delivered to carrier
- **Delivered**: Message delivered to phone
- **Viewed**: Customer opened the signing link
- **Signed**: Customer completed signing
- **Failed**: Delivery failed
- **Expired**: Link expired (7 days)

## Security

- Signing tokens are cryptographically random (32 chars)
- Tokens expire after 7 days
- IP address and user agent recorded with signature
- One-time signing (can't sign again after submitted)
- HTTPS required for signing page

## Customization

### Message Templates

Customize messages in `MessagingService.ts`:
- `composeSmsAgreementMessage()` - SMS template
- `composeWhatsAppAgreementMessage()` - WhatsApp template

### Expiration Period

Default is 7 days. Modify in:
- `MessagingService.ts` - Token expiration check
- Migration file - `expires_at` calculation

### Org-Specific Settings

Organizations can override Twilio credentials via `core.messaging_settings` table or organization settings JSON.

## Testing

### Test Mode

For development without Twilio:
1. Don't set TWILIO_* environment variables
2. Endpoints will return "not configured" error
3. Use the public signing page directly: `/sign/{reservationId}?token={generate_test_token}`

### Manual Token Generation

For testing the signing page:

```sql
INSERT INTO rentals.agreement_deliveries (
  agreement_id, reservation_id, channel, phone_number,
  signing_token, signing_url, status, sent_at
) VALUES (
  'your-agreement-id', 'your-reservation-id', 'sms', '+27821234567',
  'TEST_TOKEN_123', '/sign/your-reservation-id?token=TEST_TOKEN_123', 'sent', NOW()
);
```

## Future Enhancements

- [ ] Email delivery channel
- [ ] PDF attachment in WhatsApp
- [ ] Reminder notifications for unsigned agreements
- [ ] Webhook integration for signature events
- [ ] Multi-signer workflows (company + customer)
- [ ] Template library for different agreement types


