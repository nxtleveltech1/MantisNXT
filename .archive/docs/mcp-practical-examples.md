# MCP Practical Examples

Real-world scenarios and workflows using MCP servers.

---

## Table of Contents

1. [Web Development Workflows](#web-development-workflows)
2. [Blockchain Development](#blockchain-development)
3. [Machine Learning Projects](#machine-learning-projects)
4. [Documentation Research](#documentation-research)
5. [Project Planning](#project-planning)
6. [Multi-Server Workflows](#multi-server-workflows)

---

## Web Development Workflows

### Scenario 1: Building an Astro Site with Cloudflare Deployment

**Goal:** Learn about Astro content collections and deploy to Cloudflare Pages

```javascript
// Step 1: Research Astro content collections
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "content collections tutorial" }
})

// Step 2: Learn about Cloudflare Pages deployment
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: { query: "deploy astro to pages" }
})

// Step 3: Check domain availability for your site
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: { domain: "myastrosite.dev" }
})
```

### Scenario 2: Setting Up Cloudflare Workers with KV Storage

```javascript
// Step 1: Learn about Workers
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: { query: "workers getting started" }
})

// Step 2: Learn about KV storage
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: { query: "workers KV storage API" }
})

// Step 3: Get migration guide if coming from Pages
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "migrate_pages_to_workers_guide",
  args: {}
})
```

---

## Blockchain Development

### Scenario 3: Creating an ERC20 Token with Governance

**Goal:** Build a mintable ERC20 token with governance features

```javascript
// Step 1: Get basic ERC20 implementation
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-erc20",
  args: { query: "mintable and pausable token" }
})

// Step 2: Add governance features
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-governor",
  args: { query: "token voting governance" }
})

// Step 3: Research best practices
mcp_MCP_DOCKER_call_service({
  serverName: "deepwiki",
  tool: "ask_question",
  args: { 
    question: "What are the security best practices for ERC20 tokens with governance?",
    wiki_id: "ethereum-security"
  }
})
```

### Scenario 4: Building an NFT Marketplace on Starknet

**Goal:** Create NFT contracts and marketplace logic on Starknet using Cairo

```javascript
// Step 1: Get Cairo ERC721 implementation
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-cairo",
  tool: "cairo-erc721",
  args: { query: "NFT with royalties" }
})

// Step 2: Implement marketplace account
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-cairo",
  tool: "cairo-account",
  args: { query: "account with marketplace functions" }
})

// Step 3: Add multisig for admin functions
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-cairo",
  tool: "cairo-multisig",
  args: { query: "multisig wallet for NFT marketplace" }
})
```

### Scenario 5: Real World Asset Tokenization

```javascript
// Step 1: Get RWA tokenization pattern
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-rwa",
  args: { query: "real estate tokenization with compliance" }
})

// Step 2: Add account abstraction for users
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-account",
  args: { query: "account abstraction for RWA investors" }
})

// Step 3: Research regulatory considerations
mcp_MCP_DOCKER_call_service({
  serverName: "deepwiki",
  tool: "ask_question",
  args: { 
    question: "What are the regulatory requirements for tokenizing real estate?",
    wiki_id: "blockchain-regulations"
  }
})
```

---

## Machine Learning Projects

### Scenario 6: Finding and Using a Sentiment Analysis Model

**Goal:** Find a pre-trained model for sentiment analysis and use it

```javascript
// Step 1: Search for sentiment analysis models
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "sentiment analysis", limit: 10 }
})

// Step 2: Get details about a specific model
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "hub_repo_details",
  args: { repo_id: "distilbert-base-uncased-finetuned-sst-2-english" }
})

// Step 3: Search for relevant research papers
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "paper_search",
  args: { query: "sentiment analysis transformers", limit: 5 }
})

// Step 4: Find a suitable dataset for fine-tuning
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "dataset_search",
  args: { query: "sentiment analysis dataset", limit: 10 }
})
```

### Scenario 7: Building an Image Generation Application

**Goal:** Create an app that generates images using FLUX.1

```javascript
// Step 1: Search for image generation models
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "flux image generation", limit: 5 }
})

// Step 2: Generate an image using FLUX.1
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "gr1_flux1_schnell_infer",
  args: { 
    prompt: "a futuristic city at sunset, cyberpunk style, highly detailed",
    width: 1024,
    height: 768
  }
})

// Step 3: Check domain for your app
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: { domain: "aiartgenerator.app" }
})
```

### Scenario 8: Research ML Papers and Find Implementation

**Goal:** Research a specific ML technique and find implementations

```javascript
// Step 1: Search for papers on the topic
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "paper_search",
  args: { query: "vision transformers ViT", limit: 10 }
})

// Step 2: Find model implementations
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "vision transformer ViT", limit: 10 }
})

// Step 3: Search for code examples
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "search_generic_code",
  args: { 
    query: "vision transformer implementation pytorch"
  }
})
```

---

## Documentation Research

### Scenario 9: Learning a New Framework Comprehensively

**Goal:** Deep dive into Astro framework from basics to advanced

```javascript
// Step 1: Get started with basics
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "getting started tutorial" }
})

// Step 2: Learn about content collections
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "content collections" }
})

// Step 3: Advanced patterns
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "server-side rendering SSR" }
})

// Step 4: Ask specific questions
mcp_MCP_DOCKER_call_service({
  serverName: "deepwiki",
  tool: "ask_question",
  args: { 
    question: "What are the performance benefits of Astro compared to Next.js?",
    wiki_id: "web-frameworks"
  }
})
```

### Scenario 10: Researching Library Documentation

**Goal:** Find and read documentation for a specific library

```javascript
// Step 1: Match library to repository
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "match_common_libs_owner_repo_mapping",
  args: { library: "react-query" }
})

// Step 2: Fetch documentation
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "fetch_generic_documentation",
  args: { 
    owner: "tanstack",
    repo: "query",
    path: "docs"
  }
})

// Step 3: Search specific topics
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "search_generic_documentation",
  args: { 
    query: "optimistic updates",
    owner: "tanstack",
    repo: "query"
  }
})
```

---

## Project Planning

### Scenario 11: Researching Feasibility of a Prediction Market

**Goal:** Understand prediction markets before building one

```javascript
// Step 1: Search existing markets
mcp_MCP_DOCKER_call_service({
  serverName: "manifold",
  tool: "search-markets",
  args: { query: "cryptocurrency", limit: 20 }
})

// Step 2: Get details on popular markets
mcp_MCP_DOCKER_call_service({
  serverName: "manifold",
  tool: "get-market",
  args: { market_id: "example-market-id" }
})

// Step 3: Study betting patterns
mcp_MCP_DOCKER_call_service({
  serverName: "manifold",
  tool: "get-bets",
  args: { market_id: "example-market-id", limit: 50 }
})

// Step 4: Get smart contract patterns
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-custom",
  args: { query: "prediction market smart contract" }
})
```

### Scenario 12: Domain Research for New Project

**Goal:** Find the perfect domain for your project

```javascript
// Step 1: List available TLDs
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "list_tlds",
  args: {}
})

// Step 2: Check multiple domain options
const domains = ["myproject.com", "myproject.dev", "myproject.ai", "myproject.io"];
for (const domain of domains) {
  mcp_MCP_DOCKER_call_service({
    serverName: "find-a-domain",
    tool: "check_domain",
    args: { domain }
  })
}
```

---

## Multi-Server Workflows

### Scenario 13: Full Stack DApp Development Workflow

**Goal:** Research and build a complete DApp with frontend and smart contracts

```javascript
// Step 1: Research smart contract patterns
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-erc721",
  args: { query: "NFT with marketplace functionality" }
})

// Step 2: Search for similar implementations
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "search_generic_code",
  args: { query: "NFT marketplace react web3" }
})

// Step 3: Learn about Astro for static site generation
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "web3 integration" }
})

// Step 4: Plan Cloudflare deployment
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: { query: "deploy dapp to pages" }
})

// Step 5: Check domain availability
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: { domain: "mynftmarketplace.eth" }
})
```

### Scenario 14: AI-Powered Content Platform

**Goal:** Build a platform that generates content using AI and serves it on a fast site

```javascript
// Step 1: Find text generation models
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "text generation gpt", limit: 10 }
})

// Step 2: Find image generation for featured images
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "stable diffusion image generation", limit: 5 }
})

// Step 3: Research Astro for content management
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "content collections with dynamic data" }
})

// Step 4: Learn about Cloudflare R2 for image storage
mcp_MCP_DOCKER_call_service({
  serverName: "cloudflare-docs-mcp",
  tool: "search_cloudflare_documentation",
  args: { query: "R2 storage API" }
})

// Step 5: Process and analyze content
mcp_MCP_DOCKER_call_service({
  serverName: "llm-text",
  tool: "llms.txt-file",
  args: { content: "sample generated content" }
})

// Step 6: Check domain
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: { domain: "aicontentcreator.io" }
})
```

### Scenario 15: Security-First Smart Contract Development

**Goal:** Build and audit smart contracts with security best practices

```javascript
// Step 1: Get secure contract template
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-erc20",
  args: { query: "secure pausable mintable token with access control" }
})

// Step 2: Run security analysis (when available)
mcp_MCP_DOCKER_call_service({
  serverName: "semgrep",
  tool: "scan_solidity_contract",
  args: { contract_code: "your contract code here" }
})

// Step 3: Research security best practices
mcp_MCP_DOCKER_call_service({
  serverName: "deepwiki",
  tool: "ask_question",
  args: { 
    question: "What are common vulnerabilities in ERC20 contracts and how to prevent them?",
    wiki_id: "smart-contract-security"
  }
})

// Step 4: Search for audit reports
mcp_MCP_DOCKER_call_service({
  serverName: "gitmcp",
  tool: "search_generic_documentation",
  args: { query: "openzeppelin security audit reports" }
})
```

---

## Tips for Complex Workflows

### 1. Sequential vs. Parallel Calls
- **Sequential:** When results from one call inform the next
- **Parallel:** When calls are independent (faster execution)

### 2. Error Handling
Always check if a server is available before building a workflow around it:
```javascript
// Check server status first
mcp_MCP_DOCKER_discover_service({ capability: "security" })
```

### 3. Caching Results
Store frequently accessed documentation locally to reduce API calls:
- Save smart contract templates
- Cache model information
- Store documentation search results

### 4. Combining Results
Use multiple servers to get comprehensive information:
- Documentation servers for theory
- Code search for implementation examples
- RAG/DeepWiki for specific questions
- ML servers for practical applications

### 5. Fallback Strategies
If a server is unavailable:
```javascript
// Try alternative
mcp_MCP_DOCKER_get_alternative({ failed_server: "semgrep" })

// Or discover alternatives
mcp_MCP_DOCKER_discover_service({ capability: "security" })
```

---

## Common Patterns

### Pattern 1: Learn → Search → Implement
1. Learn from documentation (astro-docs, cloudflare-docs)
2. Search for examples (gitmcp, huggingface)
3. Get implementation patterns (openzeppelin, deepwiki)

### Pattern 2: Research → Validate → Deploy
1. Research market/feasibility (manifold, deepwiki)
2. Validate domain/uniqueness (find-a-domain)
3. Get deployment guides (cloudflare-docs)

### Pattern 3: Find → Analyze → Integrate
1. Find models/code (huggingface, gitmcp)
2. Analyze security/quality (semgrep, deepwiki)
3. Get integration guides (astro-docs, cloudflare-docs)

---

## Advanced Use Cases

### Use Case: Building a Documentation Aggregator
Combine multiple documentation sources for comprehensive learning materials.

### Use Case: Smart Contract Factory
Generate various types of smart contracts based on user requirements using OpenZeppelin servers.

### Use Case: AI Research Assistant
Use Hugging Face + DeepWiki + GitMCP to research ML topics comprehensively.

### Use Case: Web3 Market Analysis
Use Manifold for prediction data + OpenZeppelin for contract patterns + GitMCP for implementation examples.

---

**Need help with a specific workflow?** Refer to:
- [mcp-tools-reference.md](./mcp-tools-reference.md) - Full tool documentation
- [mcp-quick-start.md](./mcp-quick-start.md) - Quick command reference

---

**Last Updated:** October 11, 2025  
**Project:** MantisNXT










