/**
 * ZAR Purchase Order Mock Data for South African Business Context
 * All amounts in South African Rand (ZAR)
 */

export const ZAR_PURCHASE_ORDER_DATA = [
  {
    id: "PO-001",
    number: "PO-2024-001",
    supplierId: "SUP-1011",
    supplierName: "Stage Audio Works",
    supplierCode: "STGAW",
    requisitionId: "REQ-001",
    title: "Office Equipment and Supplies",
    description: "Bulk purchase of office equipment and stationery for Q1 2024",
    category: "Office Supplies",
    priority: "medium",
    requestedBy: "John Smith",
    department: "Administration",
    costCenter: "CC-001",
    budgetCode: "ADMIN-2024-Q1",
    currency: "ZAR",
    subtotal: 285000, // R 285,000 (VAT exclusive)
    taxAmount: 42750, // R 42,750 (15% VAT)
    shippingAmount: 7500, // R 7,500 shipping
    discountAmount: 15000, // R 15,000 volume discount
    totalAmount: 320250, // R 320,250 (VAT inclusive)
    deliveryDate: "2024-02-15",
    deliveryLocation: "Johannesburg Main Office, Sandton",
    paymentTerms: "Net 30",
    status: "approved",
    approvalStatus: "approved",
    workflowStatus: "completed",
    createdDate: "2024-01-10",
    approvedDate: "2024-01-12",
    sentDate: "2024-01-15",
    acknowledgedDate: "2024-01-16",
    expectedDelivery: "2024-02-15",
    actualDelivery: null,
    lineItems: [
      {
        id: "POL-001",
        description: "Executive Desk Chairs (10 units)",
        quantity: 10,
        unitPrice: 4500, // R 4,500 per chair
        totalPrice: 45000, // R 45,000
        category: "Furniture",
      },
      {
        id: "POL-002",
        description: "Laptop Computers - Business Grade (8 units)",
        quantity: 8,
        unitPrice: 18500, // R 18,500 per laptop
        totalPrice: 148000, // R 148,000
        category: "Technology",
      },
    ],
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-01-16T14:30:00Z",
    createdBy: "user1",
    updatedBy: "user2",
  },
  {
    id: "PO-002",
    number: "PO-2024-002",
    supplierId: "SUP-1021",
    supplierName: "Audiosure",
    supplierCode: "AUDSURE",
    title: "Raw Materials for Production",
    description: "Steel and aluminum materials for manufacturing operations",
    category: "Raw Materials",
    priority: "high",
    requestedBy: "Maria Nkomo",
    department: "Production",
    costCenter: "CC-002",
    budgetCode: "PROD-2024-Q1",
    currency: "ZAR",
    subtotal: 850000, // R 850,000 (VAT exclusive)
    taxAmount: 127500, // R 127,500 (15% VAT)
    shippingAmount: 25000, // R 25,000 shipping
    discountAmount: 42500, // R 42,500 bulk discount (5%)
    totalAmount: 960000, // R 960,000 (VAT inclusive)
    deliveryDate: "2024-03-01",
    deliveryLocation: "Cape Town Manufacturing Plant, Epping",
    paymentTerms: "Net 45",
    status: "in_progress",
    approvalStatus: "approved",
    workflowStatus: "processing",
    createdDate: "2024-01-20",
    approvedDate: "2024-01-22",
    sentDate: "2024-01-25",
    acknowledgedDate: "2024-01-26",
    expectedDelivery: "2024-03-01",
    actualDelivery: null,
    lineItems: [
      {
        id: "POL-003",
        description: "Grade 304 Stainless Steel Sheets (50 units)",
        quantity: 50,
        unitPrice: 12500, // R 12,500 per sheet
        totalPrice: 625000, // R 625,000
        category: "Steel",
      },
      {
        id: "POL-004",
        description: "Aluminum Extrusion Profiles (200m)",
        quantity: 200,
        unitPrice: 1125, // R 1,125 per meter
        totalPrice: 225000, // R 225,000
        category: "Aluminum",
      },
    ],
    createdAt: "2024-01-20T10:30:00Z",
    updatedAt: "2024-01-26T16:45:00Z",
    createdBy: "user2",
    updatedBy: "user3",
  },
  {
    id: "PO-003",
    number: "PO-2024-003",
    supplierId: "SUP-1022",
    supplierName: "ApexPro Distribution",
    supplierCode: "APEXPR",
    title: "IT Infrastructure Upgrade",
    description: "Network equipment and server infrastructure for head office",
    category: "Technology",
    priority: "urgent",
    requestedBy: "Themba Mthembu",
    department: "IT",
    costCenter: "CC-003",
    budgetCode: "IT-2024-INFRA",
    currency: "ZAR",
    subtotal: 1250000, // R 1,250,000 (VAT exclusive)
    taxAmount: 187500, // R 187,500 (15% VAT)
    shippingAmount: 15000, // R 15,000 shipping
    discountAmount: 75000, // R 75,000 negotiated discount
    totalAmount: 1377500, // R 1,377,500 (VAT inclusive)
    deliveryDate: "2024-02-28",
    deliveryLocation: "Durban Head Office, Umhlanga",
    paymentTerms: "Net 60",
    status: "shipped",
    approvalStatus: "approved",
    workflowStatus: "shipping",
    createdDate: "2024-01-15",
    approvedDate: "2024-01-18",
    sentDate: "2024-01-20",
    acknowledgedDate: "2024-01-21",
    expectedDelivery: "2024-02-28",
    actualDelivery: null,
    lineItems: [
      {
        id: "POL-005",
        description: "Enterprise Network Switches (12 units)",
        quantity: 12,
        unitPrice: 45000, // R 45,000 per switch
        totalPrice: 540000, // R 540,000
        category: "Networking",
      },
      {
        id: "POL-006",
        description: "Server Rack Units (4 units)",
        quantity: 4,
        unitPrice: 177500, // R 177,500 per server
        totalPrice: 710000, // R 710,000
        category: "Servers",
      },
    ],
    createdAt: "2024-01-15T08:45:00Z",
    updatedAt: "2024-02-10T11:20:00Z",
    createdBy: "user3",
    updatedBy: "user1",
  },
  {
    id: "PO-004",
    number: "PO-2024-004",
    supplierId: "SUP-1015",
    supplierName: "Sennheiser South Africa",
    supplierCode: "SENNZA",
    title: "Vehicle Fleet Maintenance",
    description: "Quarterly vehicle servicing and parts replacement",
    category: "Fleet Management",
    priority: "medium",
    requestedBy: "Susan van der Merwe",
    department: "Fleet",
    costCenter: "CC-004",
    budgetCode: "FLEET-2024-Q1",
    currency: "ZAR",
    subtotal: 375000, // R 375,000 (VAT exclusive)
    taxAmount: 56250, // R 56,250 (15% VAT)
    shippingAmount: 5000, // R 5,000 delivery
    discountAmount: 18750, // R 18,750 service discount
    totalAmount: 417500, // R 417,500 (VAT inclusive)
    deliveryDate: "2024-02-20",
    deliveryLocation: "Multiple Fleet Service Centers",
    paymentTerms: "Net 30",
    status: "delivered",
    approvalStatus: "approved",
    workflowStatus: "completed",
    createdDate: "2024-01-25",
    approvedDate: "2024-01-27",
    sentDate: "2024-01-30",
    acknowledgedDate: "2024-01-31",
    expectedDelivery: "2024-02-20",
    actualDelivery: "2024-02-18",
    lineItems: [
      {
        id: "POL-007",
        description: "Vehicle Servicing (25 vehicles)",
        quantity: 25,
        unitPrice: 8500, // R 8,500 per service
        totalPrice: 212500, // R 212,500
        category: "Maintenance",
      },
      {
        id: "POL-008",
        description: "Tire Replacement Sets (15 sets)",
        quantity: 15,
        unitPrice: 10833, // R 10,833 per set
        totalPrice: 162500, // R 162,500
        category: "Parts",
      },
    ],
    createdAt: "2024-01-25T13:15:00Z",
    updatedAt: "2024-02-18T17:30:00Z",
    createdBy: "user4",
    updatedBy: "user4",
  },
];

export const ZAR_PURCHASE_ORDER_METRICS = {
  totalPurchaseOrders: 248,
  totalValue: 65500000, // R 65.5M total PO value
  averageProcessingTime: 3.2, // Days from creation to approval
  approvalRate: 97.8, // High approval rate
  onTimeDeliveryRate: 88.5, // Good delivery performance
  costSavings: 4200000, // R 4.2M in negotiated savings
  emergencyOrders: 12, // Urgent/emergency orders
  automatedOrders: 89.7, // Percentage automated
  beeCompliantOrders: 72.3, // BEE compliant suppliers
  localSupplierOrders: 91.2, // Local South African suppliers
  averageOrderValue: 264113, // R 264,113 average order
  budgetUtilization: 78.5, // Budget utilization percentage
};
