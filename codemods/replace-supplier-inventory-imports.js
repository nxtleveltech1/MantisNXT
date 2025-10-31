// jscodeshift codemod: replace legacy Supplier/Inventory imports and SQL strings

function replaceImports(j, root) {
  root.find(j.ImportDeclaration).forEach((path) => {
    const source = path.node.source.value
    if (source === '@/lib/api/suppliers') {
      path.node.source.value = '@/services/ssot/supplierService'
    }
  })

  // Replace SupplierAPI.* with ssot functions when possible
  root.find(j.MemberExpression, {
    object: { type: 'Identifier', name: 'SupplierAPI' },
  }).forEach((p) => {
    const prop = p.node.property.name
    const map = {
      getSupplierById: 'getSupplierById',
      updateSupplier: 'upsertSupplier',
      deleteSupplier: 'deactivateSupplier',
    }
    if (map[prop]) {
      j(p).replaceWith(j.identifier(map[prop]))
    }
  })
}

function replaceSqlLiterals(j, root) {
  root.find(j.Literal).forEach((p) => {
    if (typeof p.node.value === 'string') {
      const s = p.node.value
      const replaced = s
        .replace(/FROM\s+suppliers\b/gi, 'FROM public.suppliers')
        .replace(/JOIN\s+suppliers\b/gi, 'JOIN public.suppliers')
        .replace(/FROM\s+inventory_items\b/gi, 'FROM public.inventory_items')
        .replace(/JOIN\s+inventory_items\b/gi, 'JOIN public.inventory_items')
      if (replaced !== s) {
        p.node.value = replaced
      }
    }
  })
}

module.exports = function transformer(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  replaceImports(j, root)
  replaceSqlLiterals(j, root)
  return root.toSource({ quote: 'single' })
}
