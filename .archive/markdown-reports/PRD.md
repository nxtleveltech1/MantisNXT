Product Overview

Unified inventory and supplier management platform built on Next.js/TypeScript/PostgreSQL to consolidate supplier pricelists, selection, and stock workflows in a single NXT-SPP experience.
Targets operations teams needing accurate stock visibility, procurement teams managing supplier portfolios, and finance stakeholders tracking cost efficiency.
Goals

Deliver a single source of truth for supplier catalogs, pricing, and stock positions.
Streamline pricelist ingestion/validation to reduce manual errors and cycle time.
Enforce business rules (single active selection) while keeping historical context for analytics.
Provide real-time dashboards and APIs that support downstream systems and reporting.
Key Features

Supplier Pricelist Management: guided upload, automated validation, merge into canonical models with audit trails.
Inventory Selection Interface: compare supplier offerings, activate selections, enforce single-active-selection logic.
Stock on Hand Reporting: real-time SERVE-layer views, KPI dashboards, alerts on threshold breaches.
Analytics & History: multi-supplier price history, trend analysis, downloadable reports.
API Layer: REST endpoints for selections, pricelists, stock metrics; authentication and error handling baked in.
Integration Scripts: CLI workflows for schema setup, data seeding, verification to support deployments and migrations.
Personas & Use Cases

Inventory Manager: curate active product mix, monitor stock levels, react to supply issues.
Procurement Analyst: import supplier files, validate deltas, negotiate using price history intelligence.
Finance Controller: review cost trends, confirm compliance with purchasing policies, support audits.
IT/Platform Engineer: maintain data pipelines, expose APIs to ERP/WMS, monitor performance SLAs.
User Experience

Web UI at /nxt-spp with tabbed navigation for dashboard, selections, stock reports.
Upload wizard with validation feedback, error resolution tips, and re-submission support.
Selection workspace with filtering, comparison tables, approval workflows.
Dashboard cards for KPIs, charts for trends, drill-down to item-level details.
Role-based access: granular permissions for upload, activation, approval, reporting.
System Architecture

Frontend: Next.js app with React components, Tailwind styling, client-side caching for responsiveness.
Backend: API routes backed by layered PostgreSQL schemas (SPP staging, CORE normalized, SERVE reporting views) plus Prisma/ORM if applicable.
Integrations: CLI scripts (npm run integration:*) orchestrate ETL, schema verification, and data seeding; optional Playwright/automation MCP hooks.
Infrastructure: Docker compose for dev/prod parity, environment-based configuration, monitoring endpoints for health and query metrics.
Success Metrics

Pricelist processing time (upload → active) reduced by X%.
Data accuracy: <1% validation failure rate post-automation.
Stock visibility: percentage of SKUs with real-time status (target >98%).
User adoption: weekly active operations/procurement users, time-on-task reductions.
System reliability: API error rate <0.1%, p95 query latency <500ms.
Release Milestones

Milestone 1 (Foundations): Schema setup, core upload/validation pipeline, baseline dashboard.
Milestone 2 (Selection Workflow): Selection UI, business rules enforcement, API endpoints.
Milestone 3 (Reporting & Analytics): Stock reports, KPI dashboards, historical pricing.
Milestone 4 (Operational Hardening): Performance optimization, monitoring, role-based access, documentation.
Risks & Mitigations

Data quality from suppliers → enforce strict validation, provide remediation tooling.
Performance at scale → maintain indexing strategy, monitor via /api/health/query-metrics.
Change management for legacy users → migration scripts, redirects, training materials.
Security/compliance → audit logging, access controls, secure credential handling.
Open Questions

Confirm integration touchpoints with external ERP/WMS systems and required SLAs.
Determine approval workflows (single vs multi-step) and audit requirements.
Define retention policies for historical pricelist data and selection archives.
Clarify automated testing strategy (unit/integration/e2e) and ownership.
Next Steps

Validate personas and success metrics with stakeholders.
Prioritize feature backlog against milestones and capacity.
Align testing/monitoring strategy (including TestSprite MCP, Playwright) with dev teams.