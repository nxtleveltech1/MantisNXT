# Analytics Sources (Internal Reference)

Metric-to-API mapping for platform analytics. Use this to trace where numbers come from and avoid conflicting definitions.

## Live Dashboard (Home)

| Metric | API | Notes |
|--------|-----|--------|
| Active Suppliers, Preferred, Total Suppliers | `GET /api/dashboard_metrics` | From `core.supplier` (active filter) and `core.supplier_performance` |
| Total Inventory Value | `GET /api/dashboard_metrics` | `core.stock_on_hand` JOIN `core.supplier_product` WHERE `is_active = true`; value = `SUM(qty * COALESCE(unit_cost, 0))` |
| Stock Alerts, Low Stock, Out of Stock | `GET /api/dashboard_metrics` | Counts from `core.stock_on_hand` (qty thresholds) |
| Supplier Products (catalog count) | `GET /api/dashboard_metrics` | `COUNT(*)` from `core.supplier_product` WHERE `is_active = true` |
| Total Sales, Order Count, Avg Order Value, In-Store/Online | `GET /api/sales/analytics?channel=...&startDate=&endDate=` | `sales_orders` (+ optional date range from dashboard time selector) |
| Products by Category | `GET /api/dashboard/inventory-by-category?range=` | `core.stock_on_hand` + category; `range` = today \| week \| month |
| Stock Alerts (widget list) | `GET /api/dashboard/stock-alerts` | Critical/warning counts and list from SOH + reorder points |
| Product Distribution by Location | `GET /api/dashboard/location-analytics` | Per-location product count and value from `core.stock_on_hand` |

## Analytics Page (Real-Time Analytics Dashboard)

| Metric | API | Notes |
|--------|-----|--------|
| KPIs, realTimeMetrics, performanceTrends | `GET /api/analytics/dashboard` | Cached. Inventory value uses same scope as dashboard_metrics (active supplier products only). |

## SPP / Supplier Portfolio

| Metric | API | Notes |
|--------|-----|--------|
| Total suppliers, supplier_products, selected_inventory_value, etc. | `GET /api/spp/dashboard/metrics` | Selection-scoped; different from main dashboard “Supplier Products” (full catalog count). |

## Consistency Rules

- **Inventory value:** Both `/api/dashboard_metrics` and `/api/analytics/dashboard` use: SOH joined to `core.supplier_product` with `is_active = true`, value = `SUM(qty * COALESCE(unit_cost, 0))` (or `SUM(total_value)` where the column exists).
- **Supplier products count (main dashboard):** Full catalog count from `core.supplier_product` WHERE `is_active = true`. SPP dashboard may show selection-specific counts.
