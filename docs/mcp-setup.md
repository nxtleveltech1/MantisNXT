# MCP Setup (Cursor)

Cursor reads MCP config from **`.cursor/mcp.json`** (project) and `~/.cursor/mcp.json` (global). The project root `.mcp.json` is not used by Cursor.

## Xero MCP

To enable the Xero MCP in Cursor:

1. Create `.cursor/mcp.json` in the project root (this file is gitignored).
2. Add the Xero server config with your credentials from `.env.local`:

```json
{
  "mcpServers": {
    "xero": {
      "type": "stdio",
      "command": "npx.cmd",
      "args": ["-y", "@xeroapi/xero-mcp-server@latest"],
      "env": {
        "XERO_CLIENT_ID": "<from .env.local>",
        "XERO_CLIENT_SECRET": "<from .env.local>"
      }
    }
  }
}
```

- **Windows:** Use `"command": "npx.cmd"` (Node often isn't in PATH when Cursor spawns the process).
- **macOS/Linux:** Use `"command": "npx"` instead of `npx.cmd`.

3. Restart Cursor. The Xero MCP will appear under **Tools & MCP** (Ctrl+Shift+J).

The Xero MCP uses [Custom Connections](https://developer.xero.com/documentation/guides/oauth2/custom-connections/); ensure your Xero app supports it if needed.
