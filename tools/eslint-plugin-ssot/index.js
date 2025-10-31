module.exports = {
  rules: {
    'no-legacy-supplier-inventory': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Forbid direct access to legacy suppliers/inventory tables. Use SSOT services or public views.',
          recommended: true,
        },
        schema: [],
      },
      create(context) {
        const banned = [
          /\bFROM\s+suppliers\b/i,
          /\bJOIN\s+suppliers\b/i,
          /\bINSERT\s+INTO\s+suppliers\b/i,
          /\bUPDATE\s+suppliers\b/i,
          /\bDELETE\s+FROM\s+suppliers\b/i,
          /\bINSERT\s+INTO\s+inventory_items\b/i,
          /\bUPDATE\s+inventory_items\b/i,
          /\bDELETE\s+FROM\s+inventory_items\b/i,
        ]
        function checkString(value, node) {
          if (typeof value !== 'string') return
          // Allow schema-qualified replacements
          if (/public\.suppliers/i.test(value) || /public\.inventory_items/i.test(value)) return
          for (const re of banned) {
            if (re.test(value)) {
              context.report({ node, message: 'SSOT violation: use canonical SSOT services or schema-qualified public views (public.suppliers/public.inventory_items).' })
              break
            }
          }
        }
        return {
          Literal(node) {
            checkString(node.value, node)
          },
          TemplateLiteral(node) {
            const raw = node.quasis.map(q => q.value.raw).join('')
            checkString(raw, node)
          },
        }
      }
    }
  }
}

