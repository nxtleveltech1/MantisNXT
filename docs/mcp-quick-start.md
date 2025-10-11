# MCP Tools - Quick Start Guide

A concise reference for using MCP (Model Context Protocol) servers in MantisNXT.

## Quick Commands

### Discover All Available Servers
```javascript
mcp_MCP_DOCKER_discover_service({ limit: 50 })
```

### Discover by Capability
```javascript
// Documentation servers
mcp_MCP_DOCKER_discover_service({ capability: "documentation" })

// Development tools
mcp_MCP_DOCKER_discover_service({ capability: "software-development" })

// Machine Learning
mcp_MCP_DOCKER_discover_service({ capability: "machine-learning" })
```

### Call a Tool
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "server-name",
  tool: "tool-name",
  args: { /* tool-specific arguments */ }
})
```

---

## Available Servers (12 Total)

### 📚 Documentation
1. **astro-docs-mcp** - Astro framework docs
2. **cloudflare-docs-mcp** - Cloudflare services docs
3. **openzeppelin-solidity** - Solidity smart contracts
4. **openzeppelin-cairo** - Cairo smart contracts

### 🛠️ Development
5. **gitmcp** - Git operations & code search
6. **semgrep** - Security scanning (check availability)

### 🤖 AI & ML
7. **huggingface-mcp** - Models, datasets, inference

### 🔍 Knowledge & Search
8. **deepwiki** - RAG-powered knowledge queries
9. **llm-text** - Text processing & analysis

### 🎯 Specialized
10. **manifold** - Prediction markets
11. **find-a-domain** - Domain availability
12. **remote-mcp** - MCP server discovery

---

## Common Use Cases

### 🔍 Search Documentation
```javascript
// Astro
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "content collections" }
})

// Cloudflare
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: { query: "workers KV" }
})
```

### 🤖 Find ML Models
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "sentiment analysis", limit: 10 }
})
```

### 🔐 Get Smart Contract Code
```javascript
// Solidity ERC20
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-erc20",
  args: { query: "mintable token" }
})

// Cairo ERC721
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-cairo",
  tool: "cairo-erc721",
  args: { query: "NFT with metadata" }
})
```

### 💡 Ask Knowledge Questions
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "deepwiki",
  tool: "ask_question",
  args: { question: "React performance tips", wiki_id: "react-docs" }
})
```

### 🌐 Check Domain Availability
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: { domain: "myproject.com" }
})
```

### 📈 Search Prediction Markets
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "manifold",
  tool: "search-markets",
  args: { query: "AI", limit: 10 }
})
```

### 🔍 Search Code Repositories
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "search_generic_code",
  args: { query: "authentication middleware", repo: "owner/repo" }
})
```

---

## Tool Reference by Server

### astro-docs-mcp
- `search_astro_docs` - Search Astro documentation

### cloudflare-docs-mcp
- `search_cloudflare_documentation` - Search docs
- `migrate_pages_to_workers_guide` - Migration guides

### openzeppelin-solidity
- `solidity-erc20` - ERC20 tokens
- `solidity-erc721` - NFTs
- `solidity-erc1155` - Multi-tokens
- `solidity-stablecoin` - Stablecoins
- `solidity-rwa` - Real World Assets
- `solidity-account` - Account abstraction
- `solidity-governor` - Governance
- `solidity-custom` - Custom queries

### openzeppelin-cairo
- `cairo-erc20` - ERC20 tokens
- `cairo-erc721` - NFTs
- `cairo-erc1155` - Multi-tokens
- `cairo-account` - Account abstraction
- `cairo-multisig` - Multisig wallets
- `cairo-governor` - Governance
- `cairo-vesting` - Token vesting
- `cairo-custom` - Custom queries

### huggingface-mcp
- `hf_whoami` - User info
- `space_search` - Search Spaces
- `model_search` - Search models
- `paper_search` - Search papers
- `dataset_search` - Search datasets
- `hub_repo_details` - Repo details
- `hf_doc_search` - Search docs
- `hf_doc_fetch` - Fetch docs
- `gr1_flux1_schnell_infer` - FLUX.1 inference

### gitmcp
- `match_common_libs_owner_repo_mapping` - Match libraries
- `fetch_generic_documentation` - Fetch docs
- `search_generic_documentation` - Search docs
- `search_generic_code` - Search code
- `fetch_generic_url_content` - Fetch URLs

### deepwiki
- `read_wiki_structure` - Get wiki structure
- `read_wiki_contents` - Read wiki pages
- `ask_question` - RAG-powered Q&A

### llm-text
- `llms.txt-file` - Process llms.txt files
- `git` - Git text analysis

### manifold
- `search-markets` - Search markets
- `get-market` - Get market details
- `get-user` - Get user info
- `get-bets` - Get bets
- `search-users` - Search users

### find-a-domain
- `check_domain` - Check availability
- `list_tlds` - List TLDs

### remote-mcp
- `ListRemoteMCPServers` - Discover servers

---

## Tips

✅ **DO:**
- Use `discover_service` to check server status first
- Be specific in queries for better results
- Cache documentation results when possible
- Use appropriate tools for the task

❌ **DON'T:**
- Assume all servers are always available
- Make excessive rapid requests (rate limiting)
- Use production credentials for testing

---

## Need More Details?

See the full reference: [mcp-tools-reference.md](./mcp-tools-reference.md)

---

**Last Updated:** October 11, 2025










