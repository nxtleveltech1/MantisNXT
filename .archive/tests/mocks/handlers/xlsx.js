import { http, HttpResponse } from 'msw'

// Mock XLSX processing data
const mockXlsxData = {
  headers: ['Supplier Name', 'Brand', 'Category', 'SKU', 'Description', 'Price', 'VAT Rate', 'Stock Qty'],
  rows: [
    ['Acme Corp', 'Acme', 'Electronics', 'ACME-001', 'Acme Widget Pro', 99.99, 15, 50],
    ['Beta Ltd', 'Beta', 'Hardware', 'BETA-002', 'Beta Tool Set', 149.50, 20, 25],
    ['Gamma Inc', 'Gamma', 'Software', 'GAMMA-003', 'Gamma Software License', 299.00, 0, 100],
    ['Delta Corp', 'Delta', 'Office Supplies', 'DELTA-004', 'Delta Paper Pack', 19.99, 15, 200],
    ['Epsilon Ltd', 'Epsilon', 'Electronics', 'EPSILON-005', 'Epsilon Cable Set', 49.99, 15, 75]
  ]
}

export const xlsxHandlers = [
  // Mock XLSX upload processing
  http.post('/api/xlsx/process', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return HttpResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock validation results
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [
        {
          row: 2,
          field: 'price',
          value: 149.50,
          message: 'Price seems high for this category',
          suggestion: 'Verify pricing with supplier'
        }
      ],
      cleanedData: mockXlsxData.rows.map((row, index) => ({
        supplier_name: row[0],
        brand: row[1],
        category: row[2],
        sku: row[3],
        description: row[4],
        price: row[5],
        vat_rate: row[6],
        stock_qty: row[7]
      })),
      summary: {
        total: mockXlsxData.rows.length,
        valid: mockXlsxData.rows.length,
        invalid: 0,
        duplicates: 0,
        emptyRows: 0
      }
    }

    return HttpResponse.json({
      success: true,
      data: validationResult,
      message: 'XLSX file processed successfully'
    })
  }),

  // Mock semantic mapping generation
  http.post('/api/xlsx/semantic-mapping', async ({ request }) => {
    const { headers } = await request.json()

    // Simulate AI mapping logic
    const mappings = []
    const requiredFields = ['supplier_name', 'brand', 'category', 'sku', 'description', 'price', 'vat_rate', 'stock_qty']

    for (const field of requiredFields) {
      const header = headers.find(h =>
        h.toLowerCase().includes(field.replace('_', ' ').replace('_', ''))
      )
      if (header) {
        mappings.push({
          sourceField: header,
          targetField: field,
          confidence: 0.95,
          isRequired: true
        })
      }
    }

    return HttpResponse.json({
      success: true,
      data: {
        mappings,
        confidence: mappings.length / requiredFields.length,
        suggestions: mappings.length < requiredFields.length ?
          [`Missing mappings for ${requiredFields.length - mappings.length} required fields`] : []
      }
    })
  }),

  // Mock bulk data validation
  http.post('/api/xlsx/validate', async ({ request }) => {
    const { data, mappings } = await request.json()

    const errors = []
    const warnings = []
    const cleanedData = []

    data.forEach((row, index) => {
      const cleanedRow = {}
      let hasErrors = false

      for (const [targetField, sourceField] of Object.entries(mappings)) {
        const value = row[sourceField]

        if (!value || value.toString().trim() === '') {
          errors.push({
            row: index + 2,
            field: targetField,
            value,
            message: `Required field '${targetField}' is missing`,
            severity: 'error'
          })
          hasErrors = true
        } else {
          switch (targetField) {
            case 'price':
            case 'vat_rate':
              const numValue = parseFloat(value)
              if (isNaN(numValue) || numValue < 0) {
                errors.push({
                  row: index + 2,
                  field: targetField,
                  value,
                  message: `Invalid ${targetField} value`,
                  severity: 'error'
                })
                hasErrors = true
              } else {
                cleanedRow[targetField] = numValue
              }
              break
            case 'stock_qty':
              const stockValue = parseInt(value)
              if (isNaN(stockValue) || stockValue < 0) {
                warnings.push({
                  row: index + 2,
                  field: targetField,
                  value,
                  message: 'Invalid stock quantity',
                  suggestion: 'Should be a positive integer'
                })
                cleanedRow[targetField] = 0
              } else {
                cleanedRow[targetField] = stockValue
              }
              break
            default:
              cleanedRow[targetField] = value.toString().trim()
          }
        }
      }

      if (!hasErrors) {
        cleanedData.push(cleanedRow)
      }
    })

    return HttpResponse.json({
      success: true,
      data: {
        isValid: errors.length === 0,
        errors,
        warnings,
        cleanedData,
        summary: {
          total: data.length,
          valid: cleanedData.length,
          invalid: data.length - cleanedData.length,
          duplicates: 0,
          emptyRows: 0
        }
      }
    })
  })
]