/**
 * ZAR Dashboard Mock Data for South African Business Context
 * All amounts in South African Rand (ZAR)
 */

import { SAProvince } from "../currency/zar-formatter";

export const ZAR_DASHBOARD_STATS = {
  totalSuppliers: 22,
  activeSuppliers: 22,
  strategicPartners: 0,
  avgRating: 0,
  onTimeDelivery: 0,
  qualityScore: 0,
};

export const ZAR_DASHBOARD_SUPPLIERS = [
  {
    name: "Yamaha Music South Africa",
    rating: 0,
    status: "active",
    category: "",
    totalSpend: 0,
    beeLevel: 0,
    province: SAProvince.GAUTENG,
  },
  {
    name: "Sennheiser South Africa",
    rating: 0,
    status: "active",
    category: "",
    totalSpend: 0,
    beeLevel: 0,
    province: SAProvince.GAUTENG,
  },
  {
    name: "Stage Audio Works",
    rating: 0,
    status: "active",
    category: "",
    totalSpend: 0,
    beeLevel: 0,
    province: SAProvince.GAUTENG,
  },
  {
    name: "Audiosure",
    rating: 0,
    status: "active",
    category: "",
    totalSpend: 0,
    beeLevel: 0,
    province: SAProvince.GAUTENG,
  },
  {
    name: "ApexPro Distribution",
    rating: 0,
    status: "active",
    category: "",
    totalSpend: 0,
    beeLevel: 0,
    province: SAProvince.GAUTENG,
  },
];

export const ZAR_DASHBOARD_ACTIVITIES = [
  {
    title: "BEE Certificate Renewed",
    description: "Cape Town Manufacturing Co - Level 2 BEE certificate renewed",
    time: "2h ago",
    priority: "medium",
    amount: 8500000,
    type: "compliance",
  },
  {
    title: "Payment Overdue",
    description: "Durban Logistics Solutions - R 317,250 payment overdue",
    time: "4h ago",
    priority: "high",
    amount: 317250,
    type: "payment",
  },
  {
    title: "New BEE Supplier Onboarded",
    description: "Limpopo Agricultural Services - Level 1 BEE approved",
    time: "6h ago",
    priority: "low",
    amount: 0,
    type: "onboarding",
  },
  {
    title: "Large Purchase Order",
    description: "Johannesburg Industrial Supplies - R 1.2M PO approved",
    time: "8h ago",
    priority: "medium",
    amount: 1200000,
    type: "purchase_order",
  },
  {
    title: "VAT Return Submitted",
    description: "Q4 2023 VAT return - R 3.8M VAT claimed",
    time: "1d ago",
    priority: "low",
    amount: 3800000,
    type: "vat",
  },
];

export const ZAR_FINANCIAL_SUMMARY = {
  totalAnnualSpend: 125000000, // R 125M
  monthlySpend: 10416667, // R 10.42M average monthly
  quarterlySpend: 31250000, // R 31.25M quarterly
  outstandingPayables: 12500000, // R 12.5M
  vatRecoverable: 3825000, // R 3.825M
  earlyPaymentSavings: 750000, // R 750K
  beeCompliantSpend: 81250000, // R 81.25M (65%)
  localSupplierSpend: 109375000, // R 109.375M (87.5%)
  averagePaymentDays: 28.5,
  creditUtilization: 0.73, // 73%
};

export const ZAR_PROCUREMENT_METRICS = {
  totalPurchaseOrders: 1247,
  poValue: 65500000, // R 65.5M
  averagePoValue: 52517, // R 52,517
  emergencyOrders: 45, // 3.6%
  onTimeDelivery: 91.2,
  costSavings: 4200000, // R 4.2M
  contractCompliance: 94.8,
  supplierPerformance: 4.4,
  automationRate: 89.7,
};

export const ZAR_BEE_METRICS = {
  level1Suppliers: 28, // 11.3%
  level2Suppliers: 34, // 13.8%
  level3Suppliers: 41, // 16.6%
  level4Suppliers: 52, // 21.1%
  level5AndAbove: 92, // 37.2%
  beeSpendTarget: 80000000, // R 80M target (64%)
  beeSpendActual: 81250000, // R 81.25M actual (65%)
  beeSpendVariance: 1250000, // R 1.25M over target
  blackOwnedSpend: 45000000, // R 45M (36%)
  womenOwnedSpend: 28125000, // R 28.125M (22.5%)
  youthOwnedSpend: 15625000, // R 15.625M (12.5%)
};

export const ZAR_PROVINCIAL_SPEND = {
  [SAProvince.GAUTENG]: 45000000, // R 45M (36%)
  [SAProvince.WESTERN_CAPE]: 26250000, // R 26.25M (21%)
  [SAProvince.KWAZULU_NATAL]: 18750000, // R 18.75M (15%)
  [SAProvince.EASTERN_CAPE]: 11250000, // R 11.25M (9%)
  [SAProvince.MPUMALANGA]: 8750000, // R 8.75M (7%)
  [SAProvince.LIMPOPO]: 6250000, // R 6.25M (5%)
  [SAProvince.FREE_STATE]: 3750000, // R 3.75M (3%)
  [SAProvince.NORTH_WEST]: 2500000, // R 2.5M (2%)
  [SAProvince.NORTHERN_CAPE]: 2500000, // R 2.5M (2%)
};

export const ZAR_QUARTERLY_TRENDS = {
  Q1_2023: {
    spend: 28750000, // R 28.75M
    suppliers: 235,
    beeCompliance: 62.5,
    onTimePayment: 88.2,
  },
  Q2_2023: {
    spend: 30625000, // R 30.625M
    suppliers: 241,
    beeCompliance: 64.1,
    onTimePayment: 89.7,
  },
  Q3_2023: {
    spend: 32187500, // R 32.1875M
    suppliers: 244,
    beeCompliance: 65.8,
    onTimePayment: 90.8,
  },
  Q4_2023: {
    spend: 33437500, // R 33.4375M
    suppliers: 247,
    beeCompliance: 67.2,
    onTimePayment: 91.5,
  },
};

export const ZAR_CURRENCY_EXCHANGE = {
  baseCurrency: "ZAR",
  exchangeRates: {
    USD: 0.0533, // 1 ZAR = 0.0533 USD
    EUR: 0.0486, // 1 ZAR = 0.0486 EUR
    GBP: 0.0417, // 1 ZAR = 0.0417 GBP
  },
  importSpend: {
    USD: 6250000, // R 6.25M imports from USD
    EUR: 3125000, // R 3.125M imports from EUR
    GBP: 1875000, // R 1.875M imports from GBP
  },
  exchangeRisk: "medium",
  hedgingCoverage: 0.75, // 75% hedged
};
