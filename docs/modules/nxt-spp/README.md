# NXT-SPP: Supplier Inventory Portfolio System

[![Status](https://img.shields.io/badge/status-ready-green.svg)](https://shields.io/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-15.5-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/database-neon_postgresql-blue.svg)](https://neon.tech/)

A comprehensive three-layer architecture system for managing supplier price lists, product catalogs, inventory selections, and stock on hand reporting.

## Overview

NXT-SPP provides a complete solution for:
- **Price List Management**: Upload, validate, and merge supplier price lists
- **Product Catalog**: Maintain supplier product mappings and categorization
- **Inventory Selection**: Workflow for selecting products to stock (ISI)
- **Stock Reporting**: Real-time stock on hand tracking and reporting

## Architecture

```
SPP (Staging/Isolation)  →  CORE (Canonical Master Data)  →  SERVE (Read-Optimized Views)
Upload → Validate         SCD Type 2 Price Tracking        Fast Queries & Reporting
```

See [Architecture](../../architecture/README.md) for full system documentation.

## Quick Start

- **Prerequisites:** Node.js 18+, Neon PostgreSQL, env configured (see root [README](/README.md))
- **Dashboard:** `http://localhost:3000/nxt-spp`
- **API health:** `GET /api/health/database`

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](../../architecture/README.md) | System architecture and design |
| [Extraction Pipeline](../EXTRACTION_PIPELINE.md) | Pricelist extraction and imports |
| [Import runbooks](../imports/) | Stocktake and import guides |

## Key API Endpoints

### SPP Layer
- `POST /api/spp/upload` — Upload price list
- `POST /api/spp/validate` — Validate upload
- `POST /api/spp/merge` — Merge to CORE

### CORE Layer
- `GET /api/core/selections/active` — Get active selection
- `POST /api/core/selections/[id]/activate` — Activate selection
- `GET /api/core/selections/[id]/items` — Get selection items

### SERVE Layer
- `GET /api/serve/nxt-soh` — NXT Stock on Hand (selected items only)

## Database Schema (summary)

- **SPP:** pricelist_upload, pricelist_row
- **CORE:** supplier, category, product, supplier_product, price_history, inventory_selection, inventory_selected_item, stock_on_hand
- **SERVE:** materialized views for current prices and SOH

See [database/migrations](/database/migrations/README.md) for migration index.

## Version

1.0.0 · Production ready · Last updated 2025-10-06
