# MCP Tools Reference Guide

**Last Updated:** October 11, 2025  
**Total MCP Servers Available:** 12

This document provides a comprehensive reference for all available MCP (Model Context Protocol) servers accessible through the mcp_docker integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Documentation Servers](#documentation-servers)
3. [Development Tools](#development-tools)
4. [Machine Learning & AI](#machine-learning--ai)
5. [Knowledge & Search](#knowledge--search)
6. [Specialized Tools](#specialized-tools)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

---

## Overview

MCP servers provide specialized capabilities through a unified interface. Use `mcp_MCP_DOCKER_discover_service` to discover servers and `mcp_MCP_DOCKER_call_service` to invoke their tools.

### General Usage Pattern

```javascript
// 1. Discover servers by capability
mcp_MCP_DOCKER_discover_service({
  capability: "documentation", // or omit to list all
  limit: 10
})

// 2. Call a specific tool on a server
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: {
    query: "your search query"
  }
})
```

---

## Documentation Servers

### 1. Astro Docs MCP
**Server Name:** `astro-docs-mcp`  
**URL:** https://mcp.docs.astro.build/mcp  
**Capabilities:** documentation, astro, web-framework, technical-docs

#### Tools:
- **`search_astro_docs`** - Search Astro framework documentation

**Use Case:** Building with Astro framework, looking up API references, understanding Astro concepts.

---

### 2. Cloudflare Docs MCP
**Server Name:** `cloudflare-docs-mcp`  
**URL:** https://docs.mcp.cloudflare.com/sse  
**Capabilities:** documentation, search, cloudflare, technical-docs

#### Tools:
- **`search_cloudflare_documentation`** - Search Cloudflare documentation
- **`migrate_pages_to_workers_guide`** - Get migration guides for Cloudflare Pages to Workers

**Use Case:** Working with Cloudflare services, CDN configuration, Workers, Pages, R2, D1, etc.

---

### 3. OpenZeppelin Solidity
**Server Name:** `openzeppelin-solidity`  
**URL:** https://mcp.openzeppelin.com/contracts/solidity/mcp  
**Capabilities:** software-development, blockchain, solidity, smart-contracts

#### Tools:
- **`solidity-erc20`** - ERC20 token contracts and patterns
- **`solidity-erc721`** - ERC721 NFT contracts
- **`solidity-erc1155`** - ERC1155 multi-token contracts
- **`solidity-stablecoin`** - Stablecoin contract patterns
- **`solidity-rwa`** - Real World Asset tokenization
- **`solidity-account`** - Account abstraction patterns
- **`solidity-governor`** - Governance contract patterns
- **`solidity-custom`** - Custom contract queries

**Use Case:** Building Ethereum smart contracts, implementing token standards, DeFi applications.

---

### 4. OpenZeppelin Cairo
**Server Name:** `openzeppelin-cairo`  
**URL:** https://mcp.openzeppelin.com/contracts/cairo/mcp  
**Capabilities:** software-development, blockchain, cairo, smart-contracts

#### Tools:
- **`cairo-erc20`** - ERC20 token contracts for Cairo
- **`cairo-erc721`** - ERC721 NFT contracts for Cairo
- **`cairo-erc1155`** - ERC1155 multi-token contracts
- **`cairo-account`** - Account abstraction for Starknet
- **`cairo-multisig`** - Multisig wallet patterns
- **`cairo-governor`** - Governance contracts
- **`cairo-vesting`** - Token vesting contracts
- **`cairo-custom`** - Custom contract queries

**Use Case:** Building on Starknet, Cairo smart contract development, Layer 2 solutions.

---

## Development Tools

### 5. GitMCP
**Server Name:** `gitmcp`  
**URL:** https://gitmcp.io/docs  
**Capabilities:** software-development, git, version-control

#### Tools:
- **`match_common_libs_owner_repo_mapping`** - Match library names to GitHub repositories
- **`fetch_generic_documentation`** - Fetch documentation from repositories
- **`search_generic_documentation`** - Search through documentation
- **`search_generic_code`** - Search code repositories
- **`fetch_generic_url_content`** - Fetch content from URLs

**Use Case:** Repository analysis, finding library documentation, code search across projects.

---

### 6. Semgrep
**Server Name:** `semgrep`  
**URL:** https://mcp.semgrep.ai/sse  
**Capabilities:** software-development, security, code-analysis, scanning

**Status:** Server temporarily unavailable - check status before use.

**Use Case:** Static code analysis, security vulnerability scanning, code quality checks.

---

## Machine Learning & AI

### 7. Hugging Face MCP
**Server Name:** `huggingface-mcp`  
**URL:** https://hf.co/mcp  
**Capabilities:** machine-learning, models, datasets, nlp, computer-vision, software-development

#### Tools:
- **`hf_whoami`** - Get current user information
- **`space_search`** - Search Hugging Face Spaces
- **`model_search`** - Search for ML models
- **`paper_search`** - Search research papers
- **`dataset_search`** - Search datasets
- **`hub_repo_details`** - Get repository details
- **`hf_doc_search`** - Search Hugging Face documentation
- **`hf_doc_fetch`** - Fetch specific documentation
- **`gr1_flux1_schnell_infer`** - Run inference with FLUX.1 model

**Use Case:** Finding ML models, datasets, research papers, running inference, building AI applications.

---

## Knowledge & Search

### 8. DeepWiki
**Server Name:** `deepwiki`  
**URL:** https://mcp.deepwiki.com/sse  
**Capabilities:** rag, knowledge, search, documentation

#### Tools:
- **`read_wiki_structure`** - Get the structure of a wiki
- **`read_wiki_contents`** - Read wiki page contents
- **`ask_question`** - Ask questions using RAG (Retrieval-Augmented Generation)

**Use Case:** Deep knowledge queries, RAG-powered Q&A, accessing structured documentation.

---

### 9. LLM Text
**Server Name:** `llm-text`  
**URL:** https://mcp.llmtxt.dev/sse  
**Capabilities:** data-analysis, text-processing, nlp

#### Tools:
- **`llms.txt-file`** - Process and analyze llms.txt files
- **`git`** - Git repository text analysis

**Use Case:** Text analysis, processing documentation files, analyzing repository content.

---

## Specialized Tools

### 10. Manifold Markets
**Server Name:** `manifold`  
**URL:** https://api.manifold.markets/v0/mcp  
**Capabilities:** forecasting, prediction-markets, probability

#### Tools:
- **`search-markets`** - Search prediction markets
- **`get-market`** - Get details of a specific market
- **`get-user`** - Get user information
- **`get-bets`** - Get betting information
- **`search-users`** - Search for users

**Use Case:** Prediction markets, probability forecasting, market analysis, research.

---

### 11. Find a Domain
**Server Name:** `find-a-domain`  
**URL:** https://api.findadomain.dev/mcp  
**Capabilities:** domain, productivity, search, availability

#### Tools:
- **`check_domain`** - Check domain name availability
- **`list_tlds`** - List available top-level domains

**Use Case:** Domain name search, checking availability, finding suitable domain names for projects.

---

### 12. Remote MCP
**Server Name:** `remote-mcp`  
**URL:** https://mcp.remote-mcp.com  
**Capabilities:** mcp-directory, discovery, testing

#### Tools:
- **`ListRemoteMCPServers`** - Discover and list other MCP servers

**Use Case:** Discovering new MCP servers, testing MCP capabilities, exploring the ecosystem.

---

## Usage Examples

### Example 1: Searching Astro Documentation

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: {
    query: "how to use content collections"
  }
})
```

### Example 2: Finding a Hugging Face Model

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: {
    query: "sentiment analysis",
    limit: 10
  }
})
```

### Example 3: Checking Domain Availability

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: {
    domain: "myawesomeproject.com"
  }
})
```

### Example 4: Getting OpenZeppelin Solidity ERC20 Contract

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-erc20",
  args: {
    query: "mintable and burnable token"
  }
})
```

### Example 5: RAG Query with DeepWiki

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "deepwiki",
  tool: "ask_question",
  args: {
    question: "What are the best practices for React performance optimization?",
    wiki_id: "react-docs"
  }
})
```

### Example 6: Searching Cloudflare Documentation

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: {
    query: "workers KV storage"
  }
})
```

### Example 7: Searching Prediction Markets

```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "manifold",
  tool: "search-markets",
  args: {
    query: "AI development",
    limit: 10
  }
})
```

---

## Best Practices

### 1. Discovery First
Always use `discover_service` to check available servers before making tool calls. Server availability may change.

### 2. Error Handling
Some servers may be temporarily unavailable (like Semgrep). Check the discovery results for status information.

### 3. Appropriate Tool Selection
- Use **documentation servers** for API references and guides
- Use **Hugging Face MCP** for ML model discovery and inference
- Use **GitMCP** for code and documentation search
- Use **DeepWiki** for deep knowledge queries with RAG
- Use **OpenZeppelin** servers for blockchain contract patterns

### 4. Fallback Strategies
If a server is unavailable, check for alternatives:
- Use `get_alternative` to find backup servers
- Use `remote-mcp` to discover new servers
- Multiple servers may offer similar capabilities

### 5. Efficient Queries
- Be specific in your search queries
- Use appropriate limits to avoid overwhelming responses
- Combine multiple tool calls when needed for comprehensive results

### 6. Security Considerations
- Review code from OpenZeppelin contracts before deployment
- Use Semgrep (when available) for security scanning
- Validate external data and API responses

### 7. Rate Limiting
Be mindful of rate limits on external services. If you encounter rate limiting:
- Space out requests
- Cache results when possible
- Use batch operations when available

---

## Quick Reference: Server by Use Case

| Use Case | Recommended Server | Primary Tools |
|----------|-------------------|---------------|
| Web Framework Docs | `astro-docs-mcp` | `search_astro_docs` |
| Cloud Services | `cloudflare-docs-mcp` | `search_cloudflare_documentation` |
| Smart Contracts (Solidity) | `openzeppelin-solidity` | `solidity-erc20`, `solidity-erc721` |
| Smart Contracts (Cairo) | `openzeppelin-cairo` | `cairo-erc20`, `cairo-account` |
| ML Models & Datasets | `huggingface-mcp` | `model_search`, `dataset_search` |
| Code Search | `gitmcp` | `search_generic_code` |
| Deep Knowledge Q&A | `deepwiki` | `ask_question` |
| Domain Names | `find-a-domain` | `check_domain` |
| Prediction Markets | `manifold` | `search-markets` |
| MCP Discovery | `remote-mcp` | `ListRemoteMCPServers` |
| Text Analysis | `llm-text` | `llms.txt-file` |
| Security Scanning | `semgrep` | (check availability) |

---

## Troubleshooting

### Server Not Responding
1. Use `discover_service` to check current status
2. Try `get_alternative` to find backup servers
3. Wait and retry if server is temporarily down

### Tool Not Found
1. Verify tool name matches exactly (case-sensitive)
2. Use `discover_service` with the capability filter to see available tools
3. Check if the server was recently updated

### Unexpected Results
1. Review the tool's expected argument structure
2. Ensure all required arguments are provided
3. Check if the query needs to be more specific

---

## Additional Resources

- **MCP Official Documentation:** Learn about the Model Context Protocol
- **mcp_docker Integration:** For server management and deployment
- **Server URLs:** Each server has its own documentation (see URLs above)

---

## Maintenance Notes

- This document should be updated when new servers are added
- Check server availability periodically
- Update tool descriptions as APIs evolve
- Add new usage examples as patterns emerge

---

**Generated by:** MCP Discovery Tool  
**Repository:** MantisNXT  
**Workspace:** K:\00Project\MantisNXT










