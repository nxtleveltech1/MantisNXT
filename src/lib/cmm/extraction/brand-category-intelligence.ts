// Simplified version - can be enhanced later
export function extractBrandIntelligently(
  brandColumnValue?: string,
  description?: string,
  productName?: string,
  sku?: string
): string | undefined {
  // If brand is provided directly, use it (but validate it's not a SKU)
  if (brandColumnValue && brandColumnValue.length > 2 && !/^[A-Z0-9-]+$/.test(brandColumnValue)) {
    return brandColumnValue
  }

  // Try to extract from description
  const text = (description || productName || "").toLowerCase()
  const commonBrands = [
    "turbosound", "yamaha", "bose", "shure", "jbl", "qsc", "mackie", "peavey",
    "fender", "gibson", "martin", "taylor", "ibanez", "epiphone", "squier",
    "roland", "korg", "casio", "kawai", "steinway", "bosendorfer",
    "pearl", "tama", "dw", "ludwig", "zildjian", "sabian", "meinl"
  ]

  for (const brand of commonBrands) {
    if (text.includes(brand)) {
      return brand.charAt(0).toUpperCase() + brand.slice(1)
    }
  }

  return brandColumnValue
}

