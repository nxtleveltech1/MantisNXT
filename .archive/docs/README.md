# MCP Tools Documentation

Welcome to the MCP (Model Context Protocol) tools documentation for MantisNXT. This documentation covers all available MCP servers, their capabilities, and how to use them effectively.

---

## 📚 Documentation Index

### 1. [MCP Tools Reference Guide](./mcp-tools-reference.md)
**Comprehensive documentation for all 12 MCP servers**

- Complete server listings with URLs and capabilities
- Detailed tool descriptions and parameters
- Usage examples for each server
- Best practices and troubleshooting
- Quick reference tables

**Use this when:** You need detailed information about a specific server or tool.

---

### 2. [MCP Quick Start Guide](./mcp-quick-start.md)
**Concise reference for quick lookups**

- Quick command reference
- Common use cases with code snippets
- Tool reference organized by server
- Essential tips and best practices

**Use this when:** You need to quickly find the syntax for a specific operation.

---

### 3. [MCP Practical Examples](./mcp-practical-examples.md)
**Real-world workflows and scenarios**

- Web development workflows
- Blockchain development scenarios
- Machine learning projects
- Documentation research patterns
- Multi-server workflows
- Common patterns and advanced use cases

**Use this when:** You want to see how to combine multiple tools for real projects.

---

## 🚀 Quick Start

### Discover Available Servers
```javascript
mcp_MCP_DOCKER_discover_service({ limit: 50 })
```

### Call a Tool
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "server-name",
  tool: "tool-name",
  args: { /* arguments */ }
})
```

---

## 🎯 Available MCP Servers (12 Total)

| Server | Capability | Primary Use |
|--------|------------|-------------|
| [astro-docs-mcp](#astro-docs-mcp) | Documentation | Astro framework |
| [cloudflare-docs-mcp](#cloudflare-docs-mcp) | Documentation | Cloudflare services |
| [openzeppelin-solidity](#openzeppelin-solidity) | Blockchain | Solidity contracts |
| [openzeppelin-cairo](#openzeppelin-cairo) | Blockchain | Cairo contracts |
| [huggingface-mcp](#huggingface-mcp) | Machine Learning | Models & datasets |
| [gitmcp](#gitmcp) | Development | Git & code search |
| [deepwiki](#deepwiki) | Knowledge | RAG queries |
| [llm-text](#llm-text) | Text Analysis | Text processing |
| [manifold](#manifold) | Forecasting | Prediction markets |
| [find-a-domain](#find-a-domain) | Productivity | Domain search |
| [semgrep](#semgrep) | Security | Code scanning |
| [remote-mcp](#remote-mcp) | Discovery | MCP directory |

---

## 📖 Common Use Cases

### 🌐 Web Development
- **Astro Sites:** Use `astro-docs-mcp` for framework docs
- **Cloudflare Deploy:** Use `cloudflare-docs-mcp` for deployment guides
- **Domain Search:** Use `find-a-domain` to find available domains

→ See [Practical Examples: Web Development](./mcp-practical-examples.md#web-development-workflows)

### 🔐 Blockchain & Smart Contracts
- **Solidity (Ethereum):** Use `openzeppelin-solidity` for contract patterns
- **Cairo (Starknet):** Use `openzeppelin-cairo` for Layer 2 contracts
- **Security:** Use `semgrep` for code analysis (when available)

→ See [Practical Examples: Blockchain](./mcp-practical-examples.md#blockchain-development)

### 🤖 AI & Machine Learning
- **Find Models:** Use `huggingface-mcp` to search models and datasets
- **Run Inference:** Use `huggingface-mcp` for image generation with FLUX.1
- **Research Papers:** Search ML research papers and implementations

→ See [Practical Examples: Machine Learning](./mcp-practical-examples.md#machine-learning-projects)

### 📚 Research & Documentation
- **Deep Q&A:** Use `deepwiki` for RAG-powered knowledge queries
- **Code Search:** Use `gitmcp` to search code repositories
- **Text Analysis:** Use `llm-text` for text processing

→ See [Practical Examples: Documentation](./mcp-practical-examples.md#documentation-research)

---

## 🎓 Learning Path

### Beginner
1. Start with [Quick Start Guide](./mcp-quick-start.md)
2. Try basic examples (search documentation, check domains)
3. Experiment with single-server calls

### Intermediate
1. Review [Full Reference](./mcp-tools-reference.md)
2. Explore [Practical Examples](./mcp-practical-examples.md)
3. Combine multiple servers in workflows

### Advanced
1. Build multi-server workflows
2. Create custom patterns for your use cases
3. Implement error handling and fallback strategies

---

## 🔍 Finding the Right Tool

### By Task Type

**Need Documentation?**
- Framework docs → `astro-docs-mcp`
- Cloud services → `cloudflare-docs-mcp`
- Smart contracts → `openzeppelin-solidity` or `openzeppelin-cairo`

**Building Smart Contracts?**
- Ethereum/Solidity → `openzeppelin-solidity`
- Starknet/Cairo → `openzeppelin-cairo`
- Security scanning → `semgrep`

**Working with AI/ML?**
- Find models → `huggingface-mcp` (model_search)
- Find datasets → `huggingface-mcp` (dataset_search)
- Research papers → `huggingface-mcp` (paper_search)
- Image generation → `huggingface-mcp` (gr1_flux1_schnell_infer)

**Need Information?**
- Deep questions → `deepwiki` (ask_question)
- Code examples → `gitmcp` (search_generic_code)
- Text analysis → `llm-text`

**Planning a Project?**
- Domain names → `find-a-domain`
- Market research → `manifold`
- Discover new tools → `remote-mcp`

---

## 💡 Pro Tips

### ✅ Best Practices

1. **Check Availability First**
   ```javascript
   mcp_MCP_DOCKER_discover_service({ capability: "your-capability" })
   ```

2. **Be Specific in Queries**
   - ❌ "token" 
   - ✅ "mintable ERC20 token with pause functionality"

3. **Use Multiple Sources**
   - Combine documentation + code search + Q&A for comprehensive results

4. **Cache Common Results**
   - Save frequently used contract templates
   - Store documentation snippets locally

5. **Handle Errors Gracefully**
   ```javascript
   // Get alternatives if a server fails
   mcp_MCP_DOCKER_get_alternative({ failed_server: "server-name" })
   ```

### ⚡ Performance Tips

- Use parallel calls when requests are independent
- Limit results to what you actually need
- Cache responses for repeated queries
- Check server status before building complex workflows

---

## 🛠️ Troubleshooting

### Common Issues

**Server Not Available**
- Check status with `discover_service`
- Use `get_alternative` to find backup servers
- Some servers may be temporarily down (e.g., `semgrep`)

**Unexpected Results**
- Verify tool name and arguments match exactly
- Make queries more specific
- Check the full reference documentation

**Rate Limiting**
- Space out requests
- Use caching
- Check if batch operations are available

---

## 📊 Server Status

| Server | Status | Notes |
|--------|--------|-------|
| astro-docs-mcp | ✅ Active | - |
| cloudflare-docs-mcp | ✅ Active | - |
| openzeppelin-solidity | ✅ Active | - |
| openzeppelin-cairo | ✅ Active | - |
| huggingface-mcp | ✅ Active | - |
| gitmcp | ✅ Active | - |
| deepwiki | ✅ Active | - |
| llm-text | ✅ Active | - |
| manifold | ✅ Active | - |
| find-a-domain | ✅ Active | - |
| semgrep | ⚠️ Check | May be unavailable |
| remote-mcp | ✅ Active | - |

*Status last checked: October 11, 2025*

---

## 🔗 Quick Links

- [Full Reference Guide](./mcp-tools-reference.md) - Complete documentation
- [Quick Start](./mcp-quick-start.md) - Fast reference
- [Practical Examples](./mcp-practical-examples.md) - Real-world workflows

---

## 📝 Document Structure

```
docs/
├── README.md                      # This file - main index
├── mcp-tools-reference.md         # Complete reference guide
├── mcp-quick-start.md             # Quick reference
└── mcp-practical-examples.md      # Real-world examples
```

---

## 🤝 Contributing

When adding new servers or examples:
1. Update all three main documentation files
2. Add entries to this README index
3. Test all examples before documenting
4. Include error handling in complex workflows

---

## 📅 Changelog

### October 11, 2025
- Initial documentation created
- Discovered and documented 12 MCP servers
- Created comprehensive reference, quick start, and examples
- Established documentation structure

---

## 📮 Support

For issues with:
- **MCP Servers:** Check server-specific documentation (see URLs in reference guide)
- **Integration:** Review troubleshooting section
- **Examples:** See practical examples document

---

**Project:** MantisNXT  
**Workspace:** K:\00Project\MantisNXT  
**Documentation Version:** 1.0.0  
**Last Updated:** October 11, 2025

---

## Quick Examples

### Example 1: Search Astro Docs
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "astro-docs-mcp",
  tool: "search_astro_docs",
  args: { query: "content collections" }
})
```

### Example 2: Find ML Model
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "huggingface-mcp",
  tool: "model_search",
  args: { query: "sentiment analysis", limit: 10 }
})
```

### Example 3: Get Smart Contract
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "openzeppelin-solidity",
  tool: "solidity-erc20",
  args: { query: "mintable pausable token" }
})
```

### Example 4: Check Domain
```javascript
mcp_MCP_DOCKER_call_service({
  serverName: "find-a-domain",
  tool: "check_domain",
  args: { domain: "myproject.dev" }
})
```

---

**Ready to get started?** Pick a guide above and dive in! 🚀
