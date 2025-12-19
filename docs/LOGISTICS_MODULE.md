# Logistics Management Module

## Overview

The Logistics Management Module provides comprehensive courier and delivery management functionality integrated into the MantisNXT platform. It supports multiple courier service providers, real-time cost calculations, delivery tracking, inventory allocation, and dropshipping workflows.

## Features

### Core Functionality

- **Multi-Courier Provider Support**: Integrate with multiple courier services (PostNet, FastWay, CourierGuy, DHL)
- **Real-Time Cost Calculation**: Get instant quotes from multiple providers when creating quotations/sales orders
- **Delivery Management**: Complete CRUD operations for deliveries with status tracking
- **Live Tracking**: Real-time delivery status updates via Server-Sent Events (SSE)
- **Inventory Allocation**: Automatic inventory reservation/release for deliveries
- **Dropshipping Support**: Detect and handle dropshipping workflows
- **Route Planning**: Optimize delivery routes with Google Maps integration

### Integration Points

- **Quotations**: Add delivery options during quotation creation
- **Sales Orders**: Automatic delivery creation and inventory allocation
- **Inventory**: Reserve/release stock when deliveries are created/cancelled
- **Customers**: Link deliveries to customer records

## Architecture

### Database Schema

The module uses the following main tables:

- `courier_providers`: Courier service provider configurations
- `deliveries`: Main delivery records
- `delivery_items`: Items included in each delivery
- `delivery_cost_quotes`: Cost quotes from multiple providers
- `delivery_status_history`: Tracking history for deliveries
- `delivery_inventory_allocations`: Links deliveries to inventory allocations
- `quotation_delivery_options`: Delivery options for quotations
- `sales_order_delivery_options`: Delivery options for sales orders

See `migrations/0228_logistics_module.sql` for complete schema.

### Service Layer

#### DeliveryService
- CRUD operations for deliveries
- Automatic inventory reservation/release
- Delivery number generation

#### CourierProviderService
- Manage courier provider configurations
- API credential encryption

#### DeliveryCostService
- Real-time cost calculation from multiple providers
- Quote comparison and selection

#### DeliveryTrackingService
- Poll provider APIs for status updates
- Update delivery status history
- Customer notifications (placeholder)

#### DropshippingService
- Detect dropshipping scenarios
- Supplier notification handling

### API Routes

All routes are under `/api/v1/logistics/`:

- `GET/POST /deliveries` - List/create deliveries
- `GET/PUT/DELETE /deliveries/[id]` - Get/update/delete delivery
- `PUT /deliveries/[id]/status` - Update delivery status
- `GET/POST /deliveries/[id]/track` - Get tracking info / poll provider
- `GET/POST /courier-providers` - List/create courier providers
- `POST /delivery-costs/quote` - Get cost quotes from providers
- `GET /service-tiers` - List available service tiers
- `GET/POST /websocket` - SSE endpoint for real-time updates

### UI Components

All components are in `src/components/logistics/`:

- `DeliverySelector` - Select delivery options in quotations/sales orders
- `CostComparison` - Compare quotes from multiple providers
- `LiveTracking` - Real-time delivery tracking display
- `CourierMapAdvanced` - Google Maps integration with courier locations
- `DeliveryRoutePlanner` - Route planning and optimization
- `DeliveryStatusWidget` - Live delivery status widget
- `LiveMetrics` - Real-time operational metrics
- `DropshippingIndicator` - Visual indicator for dropshipping items

### Pages

All pages are under `/logistics/`:

- `/logistics/dashboard` - Main logistics dashboard
- `/logistics/deliveries` - List all deliveries
- `/logistics/deliveries/new` - Create new delivery
- `/logistics/couriers` - Courier management
- `/logistics/routes` - Route planning
- `/logistics/tracking/[trackingNumber]` - Track specific delivery

## Usage

### Adding Delivery to Quotation

1. When creating a quotation, use the `DeliverySelector` component
2. Enter delivery address
3. Select service tier (standard/express/urgent)
4. System fetches quotes from all active courier providers
5. Select preferred provider and quote
6. Delivery cost is added as a line item to the quotation

### Creating Delivery from Sales Order

1. When creating a sales order with delivery options:
   - Delivery record is automatically created
   - Inventory is reserved (unless dropshipping)
   - Delivery is linked to the sales order

### Tracking Deliveries

1. Use the tracking page: `/logistics/tracking/[trackingNumber]`
2. Or use the `LiveTracking` component with a delivery ID
3. Real-time updates via SSE connection

### Managing Courier Providers

1. Navigate to `/logistics/couriers` (or configure via API)
2. Add courier provider with API credentials
3. Provider will be available for quotes and shipments

## Courier Provider Integration

### Adding a New Provider

1. Create a new client class extending `BaseCourierClient`:
   ```typescript
   export class NewProviderClient extends BaseCourierClient {
     async getQuote(request: CourierQuoteRequest): Promise<CourierQuoteResponse> {
       // Implement provider-specific quote logic
     }
     async createShipment(delivery: Delivery): Promise<CourierShipmentResponse> {
       // Implement shipment creation
     }
     async trackShipment(trackingNumber: string): Promise<CourierTrackingResponse> {
       // Implement tracking
     }
     // ... other required methods
   }
   ```

2. Register in `CourierProviderClients/index.ts`:
   ```typescript
   case 'newprovider':
     return new NewProviderClient(providerId, providerCode, apiCredentials, apiEndpoint);
   ```

3. Add provider to database via API or directly

### Provider API Requirements

Each provider client must implement:
- `getQuote()` - Get cost quote for delivery
- `createShipment()` - Create shipment/booking
- `trackShipment()` - Track shipment status
- `cancelShipment()` - Cancel shipment
- `validateCredentials()` - Validate API credentials

## Real-Time Updates

The module uses Server-Sent Events (SSE) for real-time updates:

- **Endpoint**: `/api/v1/logistics/websocket`
- **Client Hook**: `useWebSocket` in `src/hooks/useWebSocket.ts`
- **Polling**: Automatic polling every 5 seconds for active deliveries
- **Filtering**: Can filter by `deliveryId` for specific delivery updates

### Using the WebSocket Hook

```typescript
const { isConnected, lastMessage, sendMessage } = useWebSocket(
  '/api/v1/logistics/websocket',
  {
    deliveryId: 'optional-delivery-id',
    onMessage: (message) => {
      // Handle updates
    },
  }
);
```

## Inventory Allocation

### Automatic Allocation

When a delivery is created:
1. System checks if delivery is dropshipping
2. If not dropshipping, reserves inventory for all delivery items
3. Updates `inventory_item.reserved_qty`
4. Creates `delivery_inventory_allocations` links
5. Creates stock movement records

### Release on Cancellation

When a delivery is cancelled or deleted:
1. System releases all reserved inventory
2. Updates `inventory_item.reserved_qty`
3. Deletes `delivery_inventory_allocations` links
4. Creates stock movement records

## Dropshipping

### Detection

The system automatically detects dropshipping when:
- Products have suppliers configured
- No inventory allocations exist for those products

### Workflow

1. Delivery is marked as `is_dropshipping = true`
2. Supplier shipping address is used as pickup address
3. Inventory allocation is skipped
4. Supplier notification is triggered (placeholder for implementation)

## Testing

### Manual Testing Checklist

- [ ] Create delivery from quotation
- [ ] Create delivery from sales order
- [ ] View delivery list
- [ ] Update delivery status
- [ ] Track delivery
- [ ] Get cost quotes
- [ ] Cancel delivery (verify inventory release)
- [ ] Dropshipping detection
- [ ] Real-time updates via SSE

### API Testing

Use the API routes directly or via Postman/curl:

```bash
# Get deliveries
curl http://localhost:3000/api/v1/logistics/deliveries

# Get cost quote
curl -X POST http://localhost:3000/api/v1/logistics/delivery-costs/quote \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Johannesburg",
    "destination": "Cape Town",
    "weight_kg": 5,
    "dimensions": {"length": 30, "width": 20, "height": 15},
    "service_tier": "standard"
  }'
```

## Migration Notes

The module was migrated from a standalone implementation. Key changes:

1. **Database**: Integrated with MantisNXT schema (organization, users, etc.)
2. **API**: Follows MantisNXT API patterns (`/api/v1/` structure)
3. **Components**: Adapted to use MantisNXT UI components
4. **Services**: Integrated with existing services (inventory, sales)
5. **WebSocket**: Converted to SSE for Next.js compatibility

## Future Enhancements

- [ ] Real customer notification system (email/SMS)
- [ ] Advanced route optimization algorithms
- [ ] Courier driver mobile app integration
- [ ] Automated label printing
- [ ] Returns management
- [ ] Delivery analytics and reporting
- [ ] Multi-warehouse support
- [ ] International shipping support

## Support

For issues or questions, refer to:
- API documentation: `/api/v1/logistics/*` routes
- Component usage: See component files in `src/components/logistics/`
- Database schema: `migrations/0228_logistics_module.sql`




