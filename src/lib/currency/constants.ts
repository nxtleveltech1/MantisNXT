/**
 * South African Rand (ZAR) mock data with realistic amounts
 * All amounts are in ZAR for the South African business context
 */

// Realistic ZAR amounts for South African procurement
export const ZAR_MOCK_AMOUNTS = {
  // Invoice amounts (R 5,000 - R 500,000)
  INVOICE_SMALL: 12500,      // R 12,500
  INVOICE_MEDIUM: 85000,     // R 85,000
  INVOICE_LARGE: 275000,     // R 275,000
  INVOICE_VERY_LARGE: 485000, // R 485,000

  // Purchase Order amounts (R 10,000 - R 2,000,000)
  PO_SMALL: 25000,           // R 25,000
  PO_MEDIUM: 150000,         // R 150,000
  PO_LARGE: 650000,          // R 650,000
  PO_VERY_LARGE: 1850000,    // R 1,850,000

  // Contract amounts (R 50,000 - R 10,000,000 annual)
  CONTRACT_SMALL: 180000,    // R 180,000
  CONTRACT_MEDIUM: 750000,   // R 750,000
  CONTRACT_LARGE: 2500000,   // R 2,500,000
  CONTRACT_ENTERPRISE: 8500000, // R 8,500,000

  // Payment amounts (R 1,000 - R 1,500,000)
  PAYMENT_SMALL: 5500,       // R 5,500
  PAYMENT_MEDIUM: 45000,     // R 45,000
  PAYMENT_LARGE: 185000,     // R 185,000
  PAYMENT_VERY_LARGE: 1250000, // R 1,250,000

  // Budget allocations (millions)
  BUDGET_SMALL: 2500000,     // R 2.5M
  BUDGET_MEDIUM: 15000000,   // R 15M
  BUDGET_LARGE: 45000000,    // R 45M
  BUDGET_ENTERPRISE: 125000000, // R 125M
}

// South African supplier names for realistic context
export const SA_SUPPLIER_NAMES = [
  "Johannesburg Industrial Supplies",
  "Cape Town Manufacturing Co",
  "Durban Logistics Solutions",
  "Pretoria Tech Systems",
  "Eastern Cape Mining Supplies",
  "Western Cape Agricultural",
  "Mpumalanga Steel Works",
  "Limpopo Construction Materials",
  "Free State Electronics",
  "North West Transport Services",
  "Gauteng Business Solutions",
  "KwaZulu-Natal Processing",
  "Northern Cape Resources",
  "Sandton Office Supplies",
  "Centurion Equipment Hire",
  "Port Elizabeth Marine Supplies",
  "Bloemfontein Agricultural Services",
  "Polokwane Industrial Equipment",
  "Nelspruit Manufacturing",
  "Kimberley Mining Equipment"
]

// South African company registration numbers (mock format)
export const SA_COMPANY_NUMBERS = [
  "2018/123456/07",
  "2019/234567/07",
  "2020/345678/07",
  "2021/456789/07",
  "2022/567890/07",
  "2017/678901/07",
  "2016/789012/07",
  "2015/890123/07",
  "2014/901234/07",
  "2013/012345/07"
]

// South African VAT numbers (mock format)
export const SA_VAT_NUMBERS = [
  "4123456789",
  "4234567890",
  "4345678901",
  "4456789012",
  "4567890123",
  "4678901234",
  "4789012345",
  "4890123456",
  "4901234567",
  "4012345678"
]

// Typical South African business addresses
export const SA_BUSINESS_ADDRESSES = [
  {
    street: "123 Commissioner Street",
    city: "Johannesburg",
    province: "Gauteng",
    postalCode: "2001"
  },
  {
    street: "456 Long Street",
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001"
  },
  {
    street: "789 Smith Street",
    city: "Durban",
    province: "KwaZulu-Natal",
    postalCode: "4001"
  },
  {
    street: "321 Church Street",
    city: "Pretoria",
    province: "Gauteng",
    postalCode: "0001"
  },
  {
    street: "654 Market Street",
    city: "Port Elizabeth",
    province: "Eastern Cape",
    postalCode: "6001"
  }
]