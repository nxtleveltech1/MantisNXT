// @ts-nocheck

import { extractBrandIntelligently } from "./extraction/brand-category-intelligence"

export interface ParsedProduct {
  sku: string
  description: string
  brand?: string
  seriesRange?: string // Series (Range) field
  price?: number
  cost?: number
  stockType?: string
  supplier?: string
}

export interface ParseResult {
  products: ParsedProduct[]
  supplier: string | null
  format: string
  errors: string[]
  totalLines: number
  validLines: number
}

export function parseSupplierText(
  text: string,
  supplierHint?: string
): ParseResult {
  const lines = text
    .trim()
    .split("\n")
    .filter((line) => line.trim())
  const errors: string[] = []
  const products: ParsedProduct[] = []
  let detectedSupplier = supplierHint || null
  let detectedFormat = "unknown"

  if (lines.length === 0) {
    throw new Error("No data found in text")
  }

  // Detect format and supplier from content
  const firstLine = lines[0]
  let separator = ","

  if (firstLine.includes("|")) {
    separator = "|"
    detectedFormat = "pipe-separated"
  } else if (firstLine.includes("\t")) {
    separator = "\t"
    detectedFormat = "tab-separated"
  } else if (firstLine.includes(";")) {
    separator = ";"
    detectedFormat = "semicolon-separated"
  } else if (firstLine.includes(",")) {
    separator = ","
    detectedFormat = "comma-separated"
  } else {
    separator = /\s{2,}/ // Multiple spaces
    detectedFormat = "space-separated"
  }

  // Auto-detect supplier from content
  if (!detectedSupplier) {
    const textLower = text.toLowerCase()
    if (textLower.includes("yamaha") || textLower.includes("ymh-")) {
      detectedSupplier = "yamaha"
    } else if (textLower.includes("acme") || textLower.includes("acm-")) {
      detectedSupplier = "acme-corp"
    } else if (textLower.includes("tech") || textLower.includes("tsl-")) {
      detectedSupplier = "tech-solutions"
    }
  }

  // Parse each line
  lines.forEach((line, index) => {
    try {
      const fields =
        typeof separator === "string"
          ? line.split(separator)
          : line.split(separator)
      const trimmedFields = fields.map((f) => f.trim())

      if (trimmedFields.length < 2) {
        errors.push(
          `Line ${index + 1}: Insufficient fields (minimum 2 required)`
        )
        return
      }

      // Extract fields based on common patterns
      const sku = trimmedFields[0]
      const description = trimmedFields[1]
      let brandColumnValue: string | undefined
      let seriesRange: string | undefined
      let price: number | undefined
      let cost: number | undefined
      let stockType: string | undefined

      // Try to find brand, series, price, and other fields in remaining fields
      for (let i = 2; i < trimmedFields.length; i++) {
        const field = trimmedFields[i]

        // Check if it's a price (contains numbers and possibly currency symbols)
        const priceMatch = field.match(/[\d,]+\.?\d*/)
        if (priceMatch && !price) {
          const numericValue = Number.parseFloat(
            priceMatch[0].replace(/,/g, "")
          )
          if (!isNaN(numericValue) && numericValue > 0) {
            price = numericValue
            continue
          }
        }

        // Check if it's a stock type
        const stockTypes = [
          "stock",
          "preorder",
          "backorder",
          "discontinued",
          "available",
          "unavailable",
        ]
        if (stockTypes.some((type) => field.toLowerCase().includes(type))) {
          stockType = field.toLowerCase().includes("stock")
            ? "stock"
            : field.toLowerCase()
          continue
        }

        // If we have price but not cost, this might be cost
        if (price && !cost && priceMatch) {
          const numericValue = Number.parseFloat(
            priceMatch[0].replace(/,/g, "")
          )
          if (
            !isNaN(numericValue) &&
            numericValue > 0 &&
            numericValue < price
          ) {
            cost = numericValue
          }
        }
      }

      // Intelligent brand extraction - prevents SKU from being used as brand
      // Try to extract brand and series from description if not found in separate fields
      // Common patterns: "Brand Series Model" or "Brand: Series Model"
      const descriptionLower = description.toLowerCase()
      if (!brandColumnValue || !seriesRange) {
        // Try to detect brand from common brand names in description
        const commonBrands = [
          "turbosound",
          "yamaha",
          "bose",
          "shure",
          "jbl",
          "qsc",
          "mackie",
          "peavey",
        ]
        for (const commonBrand of commonBrands) {
          if (descriptionLower.includes(commonBrand)) {
            if (!brandColumnValue)
              brandColumnValue =
                commonBrand.charAt(0).toUpperCase() + commonBrand.slice(1)
          }
        }

        // Try to extract series range - look for patterns like "Milan", "Series Name", etc.
        // This is a simple heuristic - can be enhanced with more sophisticated parsing
        const seriesPatterns = [
          /([A-Z][a-z]+)\s+(M-\d+|M\d+)/i, // "Milan M-12" pattern
          /([A-Z][a-z]+)\s+Series/i, // "Milan Series" pattern
        ]
        for (const pattern of seriesPatterns) {
          const match = description.match(pattern)
          if (match && match[1] && !seriesRange) {
            seriesRange = match[1]
            break
          }
        }
      }

      // Also check if brand or series are in separate columns (if we have enough fields)
      if (trimmedFields.length >= 4) {
        // Common column order: SKU, Description, Brand, Series, Price, ...
        const pricePattern = /[\d,]+\.?\d*/
        if (
          !brandColumnValue &&
          trimmedFields[2] &&
          !pricePattern.test(trimmedFields[2])
        ) {
          brandColumnValue = trimmedFields[2]
        }
        if (
          !seriesRange &&
          trimmedFields[3] &&
          !pricePattern.test(trimmedFields[3])
        ) {
          seriesRange = trimmedFields[3]
        }
      }

      // Use intelligent brand extraction
      const brand = extractBrandIntelligently(
        brandColumnValue,
        description,
        undefined, // productName not available in text parsing
        sku
      )

      if (!sku || !description) {
        errors.push(
          `Line ${index + 1}: Missing required fields (SKU and description)`
        )
        return
      }

      products.push({
        sku,
        description,
        brand,
        seriesRange,
        price,
        cost,
        stockType: stockType || "stock",
        supplier: detectedSupplier || undefined,
      })
    } catch (error) {
      errors.push(
        `Line ${index + 1}: ${
          error instanceof Error ? error.message : "Parse error"
        }`
      )
    }
  })

  return {
    products,
    supplier: detectedSupplier,
    format: detectedFormat,
    errors,
    totalLines: lines.length,
    validLines: products.length,
  }
}

