# NXT-Mantis Supabase API Surface

This document lists all REST endpoints that Supabase will automatically expose for the NXT-Mantis database schema.

## Core Tables

### Organizations
- **GET** `/rest/v1/organization` - List organizations (RLS: user's org only)
- **PATCH** `/rest/v1/organization?id=eq.{id}` - Update organization (RLS: admin only)

### User Profiles
- **GET** `/rest/v1/profile` - List profiles in organization
- **POST** `/rest/v1/profile` - Create new profile (RLS: admin only)
- **PATCH** `/rest/v1/profile?id=eq.{id}` - Update profile (RLS: own profile or admin)
- **DELETE** `/rest/v1/profile?id=eq.{id}` - Delete profile (RLS: admin only)

### Audit Logs
- **GET** `/rest/v1/audit_log` - List audit logs (RLS: admin/ops_manager only)

## Supply Chain Management

### Suppliers
- **GET** `/rest/v1/supplier` - List suppliers
- **POST** `/rest/v1/supplier` - Create supplier (RLS: admin/ops_manager)
- **PATCH** `/rest/v1/supplier?id=eq.{id}` - Update supplier (RLS: admin/ops_manager)
- **DELETE** `/rest/v1/supplier?id=eq.{id}` - Delete supplier (RLS: admin/ops_manager)

### Inventory Items
- **GET** `/rest/v1/inventory_item` - List inventory items
- **POST** `/rest/v1/inventory_item` - Create inventory item
- **PATCH** `/rest/v1/inventory_item?id=eq.{id}` - Update inventory item
- **DELETE** `/rest/v1/inventory_item?id=eq.{id}` - Delete inventory item

### Purchase Orders
- **GET** `/rest/v1/purchase_order` - List purchase orders
- **POST** `/rest/v1/purchase_order` - Create purchase order
- **PATCH** `/rest/v1/purchase_order?id=eq.{id}` - Update purchase order
- **DELETE** `/rest/v1/purchase_order?id=eq.{id}` - Delete purchase order

### Purchase Order Items
- **GET** `/rest/v1/purchase_order_item` - List PO line items
- **POST** `/rest/v1/purchase_order_item` - Create PO line item
- **PATCH** `/rest/v1/purchase_order_item?id=eq.{id}` - Update PO line item
- **DELETE** `/rest/v1/purchase_order_item?id=eq.{id}` - Delete PO line item

## AI Workspace

### AI Conversations
- **GET** `/rest/v1/ai_conversation` - List AI conversations
- **POST** `/rest/v1/ai_conversation` - Create conversation (RLS: own conversations)
- **PATCH** `/rest/v1/ai_conversation?id=eq.{id}` - Update conversation (RLS: owner/ai_team)
- **DELETE** `/rest/v1/ai_conversation?id=eq.{id}` - Delete conversation (RLS: owner/ai_team)

### AI Messages
- **GET** `/rest/v1/ai_message` - List AI messages
- **POST** `/rest/v1/ai_message` - Create AI message
- **PATCH** `/rest/v1/ai_message?id=eq.{id}` - Update AI message
- **DELETE** `/rest/v1/ai_message?id=eq.{id}` - Delete AI message

### AI Datasets
- **GET** `/rest/v1/ai_dataset` - List datasets (RLS: public + own + ai_team)
- **POST** `/rest/v1/ai_dataset` - Create dataset (RLS: own creation)
- **PATCH** `/rest/v1/ai_dataset?id=eq.{id}` - Update dataset (RLS: creator/ai_team)
- **DELETE** `/rest/v1/ai_dataset?id=eq.{id}` - Delete dataset (RLS: creator/ai_team)

### AI Prompt Templates
- **GET** `/rest/v1/ai_prompt_template` - List templates (RLS: public + own + ai_team)
- **POST** `/rest/v1/ai_prompt_template` - Create template (RLS: own creation)
- **PATCH** `/rest/v1/ai_prompt_template?id=eq.{id}` - Update template (RLS: creator/ai_team)
- **DELETE** `/rest/v1/ai_prompt_template?id=eq.{id}` - Delete template (RLS: creator/ai_team)

## Customer Operations

### Customers
- **GET** `/rest/v1/customer` - List customers (RLS: role-based access)
- **POST** `/rest/v1/customer` - Create customer
- **PATCH** `/rest/v1/customer?id=eq.{id}` - Update customer (RLS: admin/ops_manager/cs_agent)
- **DELETE** `/rest/v1/customer?id=eq.{id}` - Delete customer (RLS: admin/ops_manager)

### Customer Interactions
- **GET** `/rest/v1/customer_interaction` - List interactions (RLS: assigned customers)
- **POST** `/rest/v1/customer_interaction` - Create interaction (RLS: cs roles)

### Support Tickets
- **GET** `/rest/v1/support_ticket` - List tickets (RLS: cs roles)
- **POST** `/rest/v1/support_ticket` - Create ticket (RLS: cs roles)
- **PATCH** `/rest/v1/support_ticket?id=eq.{id}` - Update ticket (RLS: assigned agent/manager)
- **DELETE** `/rest/v1/support_ticket?id=eq.{id}` - Delete ticket (RLS: admin/ops_manager)

### Ticket Comments
- **GET** `/rest/v1/ticket_comment` - List comments (RLS: ticket access)
- **POST** `/rest/v1/ticket_comment` - Create comment (RLS: ticket access)
- **PATCH** `/rest/v1/ticket_comment?id=eq.{id}` - Update comment (RLS: author)
- **DELETE** `/rest/v1/ticket_comment?id=eq.{id}` - Delete comment (RLS: author/admin)

## Integrations & Automation

### Integration Connectors
- **GET** `/rest/v1/integration_connector` - List connectors (RLS: admin/integrations)
- **POST** `/rest/v1/integration_connector` - Create connector (RLS: admin/integrations)
- **PATCH** `/rest/v1/integration_connector?id=eq.{id}` - Update connector (RLS: admin/integrations)
- **DELETE** `/rest/v1/integration_connector?id=eq.{id}` - Delete connector (RLS: admin/integrations)

### Data Imports
- **GET** `/rest/v1/data_import` - List imports (RLS: admin/ops_manager/integrations)
- **POST** `/rest/v1/data_import` - Create import (RLS: admin/integrations)
- **PATCH** `/rest/v1/data_import?id=eq.{id}` - Update import (RLS: admin/integrations)

### Automation Pipelines
- **GET** `/rest/v1/automation_pipeline` - List pipelines (RLS: admin/ops_manager/integrations)
- **POST** `/rest/v1/automation_pipeline` - Create pipeline (RLS: admin/integrations)
- **PATCH** `/rest/v1/automation_pipeline?id=eq.{id}` - Update pipeline (RLS: admin/integrations)
- **DELETE** `/rest/v1/automation_pipeline?id=eq.{id}` - Delete pipeline (RLS: admin/integrations)

### Pipeline Executions
- **GET** `/rest/v1/pipeline_execution` - List executions (RLS: pipeline access)
- **POST** `/rest/v1/pipeline_execution` - Create execution (RLS: admin/integrations)

### Integration Logs
- **GET** `/rest/v1/integration_log` - List logs (RLS: admin/ops_manager/integrations)

## Dashboards & Observability

### Dashboards
- **GET** `/rest/v1/dashboard` - List dashboards (RLS: public + own + privileged)
- **POST** `/rest/v1/dashboard` - Create dashboard (RLS: own creation)
- **PATCH** `/rest/v1/dashboard?id=eq.{id}` - Update dashboard (RLS: creator/admin)
- **DELETE** `/rest/v1/dashboard?id=eq.{id}` - Delete dashboard (RLS: creator/admin)

### Widgets
- **GET** `/rest/v1/widget` - List widgets (RLS: dashboard access)
- **POST** `/rest/v1/widget` - Create widget (RLS: dashboard access)
- **PATCH** `/rest/v1/widget?id=eq.{id}` - Update widget (RLS: dashboard access)
- **DELETE** `/rest/v1/widget?id=eq.{id}` - Delete widget (RLS: dashboard access)

### Widget Data Cache
- **GET** `/rest/v1/widget_data_cache` - List cached data (RLS: widget access)

### Notifications
- **GET** `/rest/v1/notification` - List notifications (RLS: own + system)
- **PATCH** `/rest/v1/notification?id=eq.{id}` - Mark as read (RLS: own notifications)
- **DELETE** `/rest/v1/notification?id=eq.{id}` - Delete notification (RLS: own notifications)

### System Metrics
- **GET** `/rest/v1/system_metric` - List metrics (RLS: org-scoped read)
- **POST** `/rest/v1/system_metric` - Create metric (RLS: admin/integrations)

### Dashboard Favorites
- **GET** `/rest/v1/dashboard_favorite` - List favorites (RLS: own favorites)
- **POST** `/rest/v1/dashboard_favorite` - Create favorite (RLS: own creation)
- **DELETE** `/rest/v1/dashboard_favorite?id=eq.{id}` - Remove favorite (RLS: own favorites)

### Dashboard Sharing
- **GET** `/rest/v1/dashboard_share` - List shares (RLS: shared by/with user)
- **POST** `/rest/v1/dashboard_share` - Create share (RLS: own dashboards)
- **DELETE** `/rest/v1/dashboard_share?id=eq.{id}` - Remove share (RLS: creator/admin)

### Alert Rules
- **GET** `/rest/v1/alert_rule` - List alert rules (RLS: admin/ops_manager)
- **POST** `/rest/v1/alert_rule` - Create alert rule (RLS: admin/ops_manager)
- **PATCH** `/rest/v1/alert_rule?id=eq.{id}` - Update alert rule (RLS: admin/ops_manager)
- **DELETE** `/rest/v1/alert_rule?id=eq.{id}` - Delete alert rule (RLS: admin/ops_manager)

## Read-Optimized Views

### Organization Views
- **GET** `/rest/v1/v_organization_overview` - Organization overview metrics
- **GET** `/rest/v1/v_user_profile` - User profiles with org details

### Supply Chain Views
- **GET** `/rest/v1/v_supply_chain_overview` - Supply chain dashboard metrics
- **GET** `/rest/v1/v_inventory_alerts` - Low stock and alerts

### Customer Operations Views
- **GET** `/rest/v1/v_customer_ops_overview` - Customer ops dashboard metrics

### AI Workspace Views
- **GET** `/rest/v1/v_ai_workspace_stats` - AI workspace statistics

### Activity Views
- **GET** `/rest/v1/v_recent_activity` - Recent activity across all modules

## RPC Functions

### Widget Operations
- **POST** `/rest/v1/rpc/get_widget_data` - Get widget data with caching
  ```json
  { "widget_id_param": "uuid" }
  ```

### Search Operations
- **POST** `/rest/v1/rpc/global_search` - Global search across entities
  ```json
  { "search_term": "string", "limit_param": 20 }
  ```

### Analytics Operations
- **POST** `/rest/v1/rpc/get_org_metrics` - Organization metrics for executive dashboard
  ```json
  { "days_back": 30 }
  ```

### Bulk Operations
- **POST** `/rest/v1/rpc/bulk_update_tickets` - Bulk update ticket status
  ```json
  {
    "ticket_ids": ["uuid1", "uuid2"],
    "new_status": "resolved",
    "assigned_to_id": "uuid"
  }
  ```

### Supply Chain Operations
- **POST** `/rest/v1/rpc/get_reorder_suggestions` - Get inventory reorder suggestions
  ```json
  {}
  ```

## Authentication & Authorization

All endpoints require authentication via Supabase Auth JWT tokens. The RLS policies enforce:

1. **Organization Isolation**: Users can only access data from their organization
2. **Role-Based Access**: Different roles have different permissions:
   - **admin**: Full access to org data
   - **ops_manager**: Supply chain and operations data
   - **ai_team**: AI workspace full access
   - **cs_agent**: Customer operations (assigned customers)
   - **exec**: Read-only access to dashboards and metrics
   - **integrations**: Integration and automation management

## Query Parameters

Supabase REST API supports rich querying:

### Filtering
- `?status=eq.active` - Exact match
- `?created_at=gte.2024-01-01` - Greater than or equal
- `?name=ilike.*tech*` - Case insensitive pattern match
- `?priority=in.(high,urgent)` - Multiple values

### Ordering
- `?order=created_at.desc` - Descending order
- `?order=name.asc,created_at.desc` - Multiple columns

### Limiting & Pagination
- `?limit=50` - Limit results
- `?offset=100` - Skip results (pagination)

### Selection
- `?select=id,name,status` - Select specific columns
- `?select=*,supplier(name)` - Include foreign key data
- `?select=id,name,tickets:support_ticket(*)` - Nested objects

### Example Queries

```bash
# Get active customers with recent tickets
GET /rest/v1/customer?status=eq.active&select=*,tickets:support_ticket!inner(*)&tickets.created_at=gte.2024-09-01

# Get low stock inventory items
GET /rest/v1/v_inventory_alerts?stock_status=eq.low_stock&order=quantity_on_hand.asc

# Get recent support tickets assigned to current user
GET /rest/v1/support_ticket?assigned_to=eq.{user_id}&created_at=gte.2024-09-01&order=created_at.desc

# Get dashboard with widgets
GET /rest/v1/dashboard?id=eq.{dashboard_id}&select=*,widgets:widget(*)

# Search customers by name or company
GET /rest/v1/customer?or=(name.ilike.*search*,company.ilike.*search*)
```

## Rate Limiting

Supabase applies default rate limiting:
- **Authenticated requests**: 100 requests per second per user
- **Anonymous requests**: 30 requests per second per IP
- **RPC functions**: 20 requests per second per user

For production usage, consider implementing application-level caching and request batching for optimal performance.