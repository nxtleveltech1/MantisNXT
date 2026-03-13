# Xero MCP Setup (Cursor / AI) — Optional local use

**Production** uses the in-app Xero integration only (OAuth and webhooks at your app URL, e.g. `https://nxtdotx.online`). See [XERO_INTEGRATION_GUIDE.md](./XERO_INTEGRATION_GUIDE.md).

This guide is for **optional local use**: adding the Xero MCP server so Cursor (or AI agents) can call Xero via MCP tools. The MCP server uses a **local** OAuth callback and is **not** included in the project’s committed MCP config (no localhost in production config).

## Purpose

- **App (production)**: Xero is used via the MantisNXT app (callback and webhooks at `NEXT_PUBLIC_APP_URL`, e.g. `https://nxtdotx.online/api/xero/callback` and `/api/xero/webhooks`).
- **Cursor/AI (optional, local)**: If you add the Xero MCP server locally, you can call Xero from the IDE using a local callback URL (see below).

## Prerequisites (for local MCP only)

- **Node.js 18+**
- **Xero Developer app** with an additional redirect URI for local use: `http://localhost:3333/callback` (add in [Xero Developer Portal](https://developer.xero.com/app/manage) if you want to use MCP).
- **Credentials**: Client ID and Client Secret from the Xero app.

## Environment Variables

Set these where Cursor/MCP loads env (e.g. shell profile, or Cursor MCP config env). **Do not commit secrets.**

| Variable | Required | Description |
|----------|----------|-------------|
| `XERO_CLIENT_ID` | Yes | OAuth 2.0 Client ID from Xero Developer Portal |
| `XERO_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret |
| `XERO_REDIRECT_URI` | Yes (for MCP) | Use `http://localhost:3333/callback` only when running the MCP server locally |
| `XERO_SCOPES` | No | Space-separated scopes (default in config is full set below) |
| `XERO_STATE` | No | Optional state; config uses `cursor-xero-mcp` |

Example (for reference only; use env, not a committed file):

```bash
# Xero MCP (Cursor) – set in shell or Cursor MCP env
export XERO_CLIENT_ID=your_client_id
export XERO_CLIENT_SECRET=your_client_secret
export XERO_REDIRECT_URI=http://localhost:3333/callback   # local MCP only
```

## OAuth Flow

1. Start Cursor (or run the MCP server manually with `npx @xeroapi/xero-mcp-server`).
2. When a Xero MCP tool is first used, the server will require authorization.
3. Open the auth URL (the server may print it, or use the URL in the “Authorization” section below).
4. Sign in to Xero and approve the app.
5. Xero redirects to your local callback (e.g. `http://localhost:3333/callback`); the MCP server must be listening there to receive the code and exchange it for tokens.
6. Tokens are stored in `~/.xero/tokens.json`. Keep this file secure and out of version control.

### Authorization URL (for manual OAuth)

```
https://login.xero.com/identity/connect/authorize
?response_type=code
&client_id=YOUR_CLIENT_ID
&redirect_uri=http://localhost:3333/callback   # local MCP only
&scope=<SCOPES>
&state=cursor-xero-mcp
```

Replace `YOUR_CLIENT_ID` and `<SCOPES>` with your client ID and the same scope string used in config.

## Scopes

The project MCP config uses a **full scope** set so all documented capabilities (accounting, inventory, reports, payroll, etc.) are available. If you edit `.mcp.json` or `.claude/mcp-config.json`, use a single line, space-separated.

**Full scope string** (already in config):

```
offline_access openid profile email
accounting.transactions accounting.transactions.read
accounting.invoices accounting.invoices.read
accounting.contacts accounting.contacts.read
accounting.banktransactions accounting.banktransactions.read
accounting.journals.read accounting.reports.read
accounting.settings accounting.settings.read
accounting.attachments accounting.attachments.read
accounting.budgets.read
files files.read
assets assets.read
projects projects.read
payroll.employees payroll.payruns payroll.payslip payroll.settings payroll.timesheets payroll.leaveapplications
```

### Minimal scope (optional)

If you only need accounting and inventory (no payroll/files), you can use a reduced set:

```
offline_access openid profile email
accounting.transactions accounting.transactions.read
accounting.invoices accounting.invoices.read
accounting.contacts accounting.contacts.read
accounting.settings accounting.settings.read
accounting.reports.read accounting.journals.read
```

Set this as `XERO_SCOPES` in the server `env` if you restrict scopes.

## Token Storage

- **Location**: `~/.xero/tokens.json`
- **Security**: Do not commit this file. Add to `.gitignore` if any tool could expose the repo.
- **Refresh**: The server uses `offline_access` to obtain a refresh token; it can renew access without re-prompting until the refresh is revoked or expires.

## Handshake / Test

1. **Env set**: Ensure `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, and `XERO_REDIRECT_URI` are set.
2. **Run server** (optional): `npx @xeroapi/xero-mcp-server` — confirm it starts and (when used) listens on the callback port.
3. **In Cursor**: Use a Xero MCP tool (e.g. list organisation details or list invoices) and complete OAuth if prompted.
4. **Success**: Tool returns data from your Xero tenant(s).

## MCP Config Location (local only)

The project’s committed config (`.mcp.json` / `.claude/mcp-config.json`) does **not** include the Xero MCP server (production has no localhost). To use Xero MCP locally:

- Add a `xero` server entry to your **user** MCP config (e.g. `~/.cursor/mcp.json`) or to a local copy of the project config, with:
  - `command`: `npx`, `args`: `["-y", "@xeroapi/xero-mcp-server@latest"]`
  - `env`: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` (e.g. `http://localhost:3333/callback`), `XERO_SCOPES`, `XERO_STATE` (optional).

## Disabling the Xero MCP Server

- Remove the `xero` entry from your local MCP config, or omit `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` so the server is not used.

## Example Use Cases (AI workflows)

Once the MCP is connected, agents can use the server’s tools for:

- **Inventory**: List items, quantities, valuation; low-stock style checks (via Xero API/MCP tools, not literal SQL).
- **Reporting**: Profit & loss, balance sheet, cash flow (using report tools where available).
- **AR**: List invoices, filter by status/due date to identify overdue receivables.
- **Contacts**: List customers/suppliers, sync with app data as needed.

These are usage patterns for the AI; the repo does not ship agent code. Tool names and parameters are defined by `@xeroapi/xero-mcp-server` (e.g. `list-organisation-details`, `list-invoices`, `list-contacts`, `list-items`).

## Network Allowlist

The server talks to Xero; ensure outbound access is allowed to:

- `login.xero.com`
- `identity.xero.com`
- `api.xero.com`

## References

- [Xero Developer Portal](https://developer.xero.com/app/manage)
- [@xeroapi/xero-mcp-server](https://www.npmjs.com/package/@xeroapi/xero-mcp-server) (npm)
- In-app Xero integration: [XERO_INTEGRATION_GUIDE.md](./XERO_INTEGRATION_GUIDE.md)
