# Xero "No connections found" — Fix

## What "Connection management" shows

The Xero Developer Portal **Connection management** page lists connections created when users complete the OAuth flow in your app. If it shows "No connections found", no one has finished "Connect to Xero" yet.

## How to create a connection

1. Open **https://nxtdotx.online/integrations/xero**
2. In the header, select **NXT DOTX** in the org switcher (not Financial Demo Org)
3. Click **Connect to Xero**
4. Sign in to Xero (if needed) and approve the app
5. You’ll be redirected back to the app
6. The connection will appear under Connection management in the Xero Developer Portal

## If you see "No organization selected"

- The org switcher must show NXT DOTX before you click Connect
- If it only shows "Financial Demo Org", NXT DOTX may not be in the database — run `bun scripts/database/add-nxt-dotx-org.ts`
- Refresh the page after selecting NXT DOTX

## Xero MCP vs app connections

- **App:** Uses OAuth. Connections are created when users click "Connect to Xero".
- **Xero MCP:** Uses Custom Connections, which need a separate app type in Xero. NXT LEVEL TECH is an OAuth app, so the MCP will keep failing until you either:
  - Create a new Xero app with "Custom connection" type (paid), or
  - Use a Bearer Token from an existing OAuth connection (short-lived, manual refresh)
