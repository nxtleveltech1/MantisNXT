/**
 * ZAR Supplier Mock Data for South African Business Context
 * All amounts in South African Rand (ZAR)
 */

import { BEECategory, SAProvince } from "../currency/zar-formatter";

export const ZAR_SUPPLIER_DATA = [
  // Purged legacy suppliers; seeded with requested supplier names only
  { id: "SUP-1001", code: "BKPRC", name: "BK Percussion", status: "active" },
  { id: "SUP-1002", code: "BCELEC", name: "BC Electronics", status: "active" },
  { id: "SUP-1003", code: "LEGACY", name: "Legacy Brands", status: "active" },
  {
    id: "SUP-1004",
    code: "ALPHAT",
    name: "Alpha Technologies",
    status: "active",
  },
  { id: "SUP-1005", code: "MUSPOW", name: "Music Power", status: "active" },
  { id: "SUP-1006", code: "VIVAAF", name: "Viva Afrika", status: "active" },
  { id: "SUP-1007", code: "AUDIOL", name: "Audiolite", status: "active" },
  {
    id: "SUP-1008",
    code: "TURKMM",
    name: "Tuerk Multimedia",
    status: "active",
  },
  {
    id: "SUP-1009",
    code: "TURKTE",
    name: "Tuerk Technologies",
    status: "active",
  },
  { id: "SUP-1010", code: "SONINF", name: "Sonic Informed", status: "active" },
  {
    id: "SUP-1011",
    code: "STGAW",
    name: "Stage Audio Works",
    status: "active",
  },
  {
    id: "SUP-1012",
    code: "STGONE",
    name: "Stage One Distribution",
    status: "active",
  },
  {
    id: "SUP-1013",
    code: "YAMZA",
    name: "Yamaha Music South Africa",
    status: "active",
  },
  { id: "SUP-1014", code: "AVDIST", name: "AV Distribution", status: "active" },
  {
    id: "SUP-1015",
    code: "SENNZA",
    name: "Sennheiser South Africa",
    status: "active",
  },
  { id: "SUP-1016", code: "PLANET", name: "Planetworld", status: "active" },
  { id: "SUP-1017", code: "MDDIST", name: "MD Distribution", status: "active" },
  {
    id: "SUP-1018",
    code: "ROCKIT",
    name: "Rockit Distribution",
    status: "active",
  },
  { id: "SUP-1019", code: "RLTHDR", name: "Rolling Thunder", status: "active" },
  { id: "SUP-1020", code: "GLOMUS", name: "Global Music", status: "active" },
  { id: "SUP-1021", code: "AUDSURE", name: "Audiosure", status: "active" },
  {
    id: "SUP-1022",
    code: "APEXPR",
    name: "ApexPro Distribution",
    status: "active",
  },
];

export const ZAR_SUPPLIER_METRICS = {
  totalSuppliers: ZAR_SUPPLIER_DATA.length,
  activeSuppliers: ZAR_SUPPLIER_DATA.length,
  strategicPartners: 0,
  averageRating: 0,
  onTimeDelivery: 0,
  qualityScore: 0,
  totalSpend: 0,
  beeCompliantSpend: 0,
  localSupplierSpend: 0,
  averagePaymentDays: 0,
  suppliersByProvince: {},
  beeDistribution: {},
  riskDistribution: { low: 0, medium: 0, high: 0 },
  averageCreditLimit: 0,
  totalOutstanding: 0,
};
