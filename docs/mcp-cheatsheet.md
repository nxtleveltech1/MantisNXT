# MCP Tools Cheatsheet

Ultra-quick reference for MCP server tools. One-liners and essential commands only.

---

## Discovery Commands

```javascript
// List all servers
mcp_MCP_DOCKER_discover_service({ limit: 50 })

// Find by capability
mcp_MCP_DOCKER_discover_service({ capability: "documentation" })
mcp_MCP_DOCKER_discover_service({ capability: "machine-learning" })
mcp_MCP_DOCKER_discover_service({ capability: "blockchain" })

// Get alternative server
mcp_MCP_DOCKER_get_alternative({ failed_server: "server-name" })
```

---

## Server Quick Reference

### astro-docs-mcp
```javascript
call_service({ serverName: "astro-docs-mcp", tool: "search_astro_docs", args: { query: "content collections" }})
```

### cloudflare-docs-mcp
```javascript
call_service({ serverName: "cloudflare-docs-mcp", tool: "search_cloudflare_documentation", args: { query: "workers" }})
call_service({ serverName: "cloudflare-docs-mcp", tool: "migrate_pages_to_workers_guide", args: {} })
```

### openzeppelin-solidity
```javascript
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-erc20", args: { query: "mintable" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-erc721", args: { query: "NFT" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-erc1155", args: { query: "multi-token" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-stablecoin", args: { query: "USDC" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-rwa", args: { query: "real estate" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-account", args: { query: "abstraction" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-governor", args: { query: "voting" }})
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-custom", args: { query: "custom" }})
```

### openzeppelin-cairo
```javascript
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-erc20", args: { query: "token" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-erc721", args: { query: "NFT" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-erc1155", args: { query: "multi" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-account", args: { query: "account" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-multisig", args: { query: "multisig" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-governor", args: { query: "governance" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-vesting", args: { query: "vesting" }})
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-custom", args: { query: "custom" }})
```

### huggingface-mcp
```javascript
call_service({ serverName: "huggingface-mcp", tool: "hf_whoami", args: {} })
call_service({ serverName: "huggingface-mcp", tool: "model_search", args: { query: "sentiment", limit: 10 }})
call_service({ serverName: "huggingface-mcp", tool: "dataset_search", args: { query: "text", limit: 10 }})
call_service({ serverName: "huggingface-mcp", tool: "paper_search", args: { query: "transformers", limit: 5 }})
call_service({ serverName: "huggingface-mcp", tool: "space_search", args: { query: "demo", limit: 10 }})
call_service({ serverName: "huggingface-mcp", tool: "hub_repo_details", args: { repo_id: "org/model" }})
call_service({ serverName: "huggingface-mcp", tool: "hf_doc_search", args: { query: "pipeline" }})
call_service({ serverName: "huggingface-mcp", tool: "gr1_flux1_schnell_infer", args: { prompt: "image", width: 1024, height: 768 }})
```

### gitmcp
```javascript
call_service({ serverName: "gitmcp", tool: "match_common_libs_owner_repo_mapping", args: { library: "react" }})
call_service({ serverName: "gitmcp", tool: "fetch_generic_documentation", args: { owner: "org", repo: "repo" }})
call_service({ serverName: "gitmcp", tool: "search_generic_documentation", args: { query: "API" }})
call_service({ serverName: "gitmcp", tool: "search_generic_code", args: { query: "function" }})
call_service({ serverName: "gitmcp", tool: "fetch_generic_url_content", args: { url: "https://..." }})
```

### deepwiki
```javascript
call_service({ serverName: "deepwiki", tool: "read_wiki_structure", args: { wiki_id: "wiki" }})
call_service({ serverName: "deepwiki", tool: "read_wiki_contents", args: { wiki_id: "wiki", page_id: "page" }})
call_service({ serverName: "deepwiki", tool: "ask_question", args: { question: "How does...", wiki_id: "wiki" }})
```

### llm-text
```javascript
call_service({ serverName: "llm-text", tool: "llms.txt-file", args: { content: "text" }})
call_service({ serverName: "llm-text", tool: "git", args: { repo_url: "https://..." }})
```

### manifold
```javascript
call_service({ serverName: "manifold", tool: "search-markets", args: { query: "AI", limit: 10 }})
call_service({ serverName: "manifold", tool: "get-market", args: { market_id: "id" }})
call_service({ serverName: "manifold", tool: "get-user", args: { username: "user" }})
call_service({ serverName: "manifold", tool: "get-bets", args: { market_id: "id", limit: 50 }})
call_service({ serverName: "manifold", tool: "search-users", args: { query: "name" }})
```

### find-a-domain
```javascript
call_service({ serverName: "find-a-domain", tool: "check_domain", args: { domain: "example.com" }})
call_service({ serverName: "find-a-domain", tool: "list_tlds", args: {} })
```

### remote-mcp
```javascript
call_service({ serverName: "remote-mcp", tool: "ListRemoteMCPServers", args: {} })
```

---

## Common Patterns

### Search Documentation
```javascript
// Astro
call_service({ serverName: "astro-docs-mcp", tool: "search_astro_docs", args: { query: "..." }})

// Cloudflare
call_service({ serverName: "cloudflare-docs-mcp", tool: "search_cloudflare_documentation", args: { query: "..." }})

// Hugging Face
call_service({ serverName: "huggingface-mcp", tool: "hf_doc_search", args: { query: "..." }})
```

### Search Code/Models
```javascript
// Code
call_service({ serverName: "gitmcp", tool: "search_generic_code", args: { query: "..." }})

// ML Models
call_service({ serverName: "huggingface-mcp", tool: "model_search", args: { query: "...", limit: 10 }})

// Datasets
call_service({ serverName: "huggingface-mcp", tool: "dataset_search", args: { query: "...", limit: 10 }})
```

### Get Smart Contracts
```javascript
// Solidity
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-erc20", args: { query: "..." }})

// Cairo
call_service({ serverName: "openzeppelin-cairo", tool: "cairo-erc20", args: { query: "..." }})
```

---

## Server by Capability

| Capability | Servers |
|------------|---------|
| documentation | astro-docs-mcp, cloudflare-docs-mcp, openzeppelin-* |
| software-development | gitmcp, semgrep, openzeppelin-*, huggingface-mcp |
| machine-learning | huggingface-mcp |
| blockchain | openzeppelin-solidity, openzeppelin-cairo |
| knowledge | deepwiki |
| search | astro-docs-mcp, cloudflare-docs-mcp, find-a-domain |
| text-processing | llm-text |
| forecasting | manifold |
| domain | find-a-domain |
| security | semgrep |
| mcp-directory | remote-mcp |

---

## URLs

```
astro-docs-mcp:          https://mcp.docs.astro.build/mcp
cloudflare-docs-mcp:     https://docs.mcp.cloudflare.com/sse
openzeppelin-solidity:   https://mcp.openzeppelin.com/contracts/solidity/mcp
openzeppelin-cairo:      https://mcp.openzeppelin.com/contracts/cairo/mcp
huggingface-mcp:         https://hf.co/mcp
gitmcp:                  https://gitmcp.io/docs
deepwiki:                https://mcp.deepwiki.com/sse
llm-text:                https://mcp.llmtxt.dev/sse
manifold:                https://api.manifold.markets/v0/mcp
find-a-domain:           https://api.findadomain.dev/mcp
semgrep:                 https://mcp.semgrep.ai/sse
remote-mcp:              https://mcp.remote-mcp.com
```

---

## One-Line Examples

```javascript
// Search Astro docs
call_service({ serverName: "astro-docs-mcp", tool: "search_astro_docs", args: { query: "SSR" }})

// Find sentiment model
call_service({ serverName: "huggingface-mcp", tool: "model_search", args: { query: "sentiment", limit: 5 }})

// Get ERC20 contract
call_service({ serverName: "openzeppelin-solidity", tool: "solidity-erc20", args: { query: "mintable" }})

// Check domain
call_service({ serverName: "find-a-domain", tool: "check_domain", args: { domain: "example.com" }})

// Search markets
call_service({ serverName: "manifold", tool: "search-markets", args: { query: "tech", limit: 10 }})

// Ask question
call_service({ serverName: "deepwiki", tool: "ask_question", args: { question: "What is...", wiki_id: "wiki" }})

// Search code
call_service({ serverName: "gitmcp", tool: "search_generic_code", args: { query: "auth middleware" }})

// Generate image
call_service({ serverName: "huggingface-mcp", tool: "gr1_flux1_schnell_infer", args: { prompt: "sunset", width: 1024, height: 768 }})
```

---

## Status Check

```javascript
// Check specific capability
discover_service({ capability: "security" })

// List all with status
discover_service({ limit: 50 })

// Find alternative
get_alternative({ failed_server: "semgrep" })
```

---

**Full docs:** [README.md](./README.md) | [Reference](./mcp-tools-reference.md) | [Quick Start](./mcp-quick-start.md) | [Examples](./mcp-practical-examples.md)










