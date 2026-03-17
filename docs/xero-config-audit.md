# Xero Config & Setup — End-to-End Audit

**Audit date:** Via Xero MCP + codebase review

---

## 1. Xero MCP Status

| Check | Status |
|-------|--------|
| MCP connected | OK |
| Server responds | OK |
| API calls | **FAIL** — "Failed to get Xero token" |

**Cause:** The Xero MCP uses **Custom Connections**, not OAuth redirect. Client ID + secret alone are not enough; a Custom Connection must be created in the Xero Developer Portal and linked to a Xero organisation.

**Fix:** [Custom Connections setup](https://developer.xero.com/documentation/guides/oauth2/custom-connections/)

1. Xero Developer Portal → NXT LEVEL TECH app → Configuration
2. Create a Custom Connection
3. Link it to the Xero organisation (e.g. NXT DOTX)
4. Required scopes: `accounting.settings.read`, `accounting.contacts`, `accounting.transactions`

---

## 2. App Xero Integration (OAuth Flow)

| Component | Status | Notes |
|-----------|--------|-------|
| `XERO_CLIENT_ID` | Set | From .env.local / Vercel |
| `XERO_CLIENT_SECRET` | Set | From .env.local / Vercel |
| `NEXT_PUBLIC_APP_URL` | Set | `https://nxtdotx.online` |
| `XERO_WEBHOOK_KEY` | Set | For webhook verification |
| OAuth callback | OK | `{APP_URL}/api/xero/callback` |
| Webhook delivery | OK | `{APP_URL}/api/xero/webhooks` |
| Scopes | OK | openid, profile, email, offline_access, accounting.* |
| Token storage | OK | `xero_connections` table, encrypted |
| Org isolation | OK | Per `org_id` (NXT DOTX, Financial Demo Org) |

---

## 3. Auth Flows (Two Different Paths)

| Flow | Used by | Auth method |
|------|---------|-------------|
| **OAuth redirect** | App (Connect button) | User authorises in browser; tokens stored in DB |
| **Custom Connections** | Xero MCP | Admin creates connection in Portal; client credentials only |

The app uses OAuth. The MCP uses Custom Connections. They are separate. To use the MCP, you must set up a Custom Connection in the Portal.

---

## 4. Org Switcher & `org_id`

- `org_id` is **not** a Vercel env var
- It is the app org UUID (e.g. `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` for NXT DOTX)
- Stored in `localStorage` by the org switcher
- Xero APIs receive it via `?org_id=` or `X-Org-Id` header
- `org-changed` event triggers re-fetch on Xero pages when org changes

---

## 5. Checklist for Full Xero Setup

- [x] XERO_CLIENT_ID, XERO_CLIENT_SECRET in Vercel
- [x] XERO_WEBHOOK_KEY in Vercel
- [x] NEXT_PUBLIC_APP_URL = https://nxtdotx.online
- [x] OAuth redirect URI in Xero app config
- [x] Webhook delivery URL in Xero app config
- [ ] **Custom Connection** in Xero Portal (for MCP)
- [ ] User has clicked "Connect to Xero" in app (for OAuth tokens per org)
- [ ] NXT DOTX org selected in header when using Xero pages

---

## 6. Next Steps

1. **For MCP:** Create a Custom Connection in the Xero Developer Portal for the NXT LEVEL TECH app.
2. **For app:** Ensure NXT DOTX is selected in the org switcher, then use "Connect to Xero" on `/integrations/xero` to complete OAuth.
3. **Verify:** After Custom Connection is set up, run `list-organisation-details` or `list-contacts` via the Xero MCP again.
