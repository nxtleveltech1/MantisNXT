# WooCommerce Integration - Quick Reference

## Page Overview
**File:** `K:\00Project\MantisNXT\src\app\integrations\woocommerce\page.tsx`
**Route:** `/integrations/woocommerce`
**Lines:** 943

---

## Features Implemented

### 1. Real-Time Sync Progress
Each sync operation shows:
- **Live progress bar** - Visual indicator with percentage
- **Item counter** - "Processing 45/100 items..."
- **ETA calculation** - Estimated time remaining
- **Statistics tracking** - Created/Updated/Failed counts
- **Status indicators** - Idle/Syncing/Completed/Error

### 2. Sync History
- **Complete audit trail** - Last 50 sync operations
- **Detailed metrics** - Process counts, duration, timestamps
- **Status tracking** - Success/Partial/Failed
- **Persistent storage** - Saved in localStorage
- **Professional table** - Sortable, formatted data

### 3. Visual States

#### Idle State
- Large icon in circle
- "Ready to Sync" message
- "Start Sync" button (primary color)

#### Syncing State
- Animated progress bar
- Large percentage display (75%)
- Live counters (45/100)
- ETA with clock icon
- Color-coded stats boxes
- "Syncing..." button (blue, disabled)

#### Completed State
- Green checkmark with pulse animation
- Success message
- Duration display
- Final statistics (created/updated/failed)
- "Sync Again" button (green)

#### Error State
- Red X icon
- Error message
- "Retry Sync" button (red)

---

## Color Coding System

### Status Colors
- **Green (#10b981)** - Success, items created
- **Blue (#3b82f6)** - In progress, items updated
- **Red (#ef4444)** - Errors, failed items
- **Yellow/Amber (#f59e0b)** - Warnings, not connected

### Gradients
- **Primary Actions** - Blue to Purple (#2563eb → #7c3aed)
- **Header** - Purple to Blue gradient
- **Success** - Green tones
- **Error** - Red tones

---

## Component Breakdown

### Header Card
```
┌─────────────────────────────────────────────────┐
│ [Icon] WooCommerce Store              [Badge]  │
│        https://your-store.com                   │
└─────────────────────────────────────────────────┘
```
- Gradient background (purple/blue)
- Large icon in frosted glass
- Connection status badge

### Sync Cards (3 columns)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Products   │  │    Orders    │  │  Customers   │
│              │  │              │  │              │
│  [Progress]  │  │  [Progress]  │  │  [Progress]  │
│              │  │              │  │              │
│ [Statistics] │  │ [Statistics] │  │ [Statistics] │
│              │  │              │  │              │
│ [Sync Button]│  │ [Sync Button]│  │ [Sync Button]│
└──────────────┘  └──────────────┘  └──────────────┘
```
- Responsive grid (3 cols on desktop, stacked on mobile)
- Individual sync controls
- State-based styling

### Statistics Display
```
┌─────────┬─────────┬─────────┐
│Created  │Updated  │ Failed  │
│   24    │   156   │    3    │
└─────────┴─────────┴─────────┘
```
- Color-coded boxes
- Large, bold numbers
- Background gradients

### Sync History Table
```
┌────────────────────────────────────────────────────┐
│ Entity | Status | Time | Stats | Duration        │
├────────────────────────────────────────────────────┤
│ [Icon] Products │ ✓ Success │ 2:45 PM │ ... │ 12s│
│ [Icon] Orders   │ ⚠ Partial │ 2:30 PM │ ... │ 8s │
└────────────────────────────────────────────────────┘
```
- Professional formatting
- Hover effects
- Empty state with helpful message

---

## User Actions

### "Sync All Entities" Button
- Syncs products, orders, and customers sequentially
- Shows overall progress
- Located at top of sync tab

### Individual "Sync Now" Buttons
- One per entity type (Products/Orders/Customers)
- Context-aware labels:
  - Idle: "Start Sync"
  - Syncing: "Syncing..."
  - Completed: "Sync Again"
  - Error: "Retry Sync"

### "Test Connection" Button
- Validates WooCommerce credentials
- Updates connection status badge
- Located in Configuration tab

### "Save Configuration" Button
- Stores WooCommerce settings
- Gradient styled for prominence
- Located in Configuration tab

---

## Tabs

### 1. Sync & Operations (Default)
- Main sync interface
- Real-time progress tracking
- Sync All button
- Entity-specific sync cards

### 2. Configuration
- Store URL input
- Consumer Key input
- Consumer Secret input
- Test Connection button
- Save Configuration button

### 3. Settings
- Auto Sync Products toggle
- Import Orders toggle
- Sync Customers toggle
- Sync Frequency dropdown

### 4. Sync History
- Complete audit log
- Filterable table
- Performance metrics
- Empty state when no history

---

## Responsive Breakpoints

### Mobile (< 640px)
- Single column layout
- Stacked buttons
- Simplified header

### Tablet (640px - 768px)
- 2-column grid for cards
- Side-by-side buttons

### Desktop (> 768px)
- 3-column grid for cards
- Full table layout
- Expanded header

---

## Dark Mode Support

All components automatically adapt:
- Gradient backgrounds have dark variants
- Text colors adjust for contrast
- Icons maintain visibility
- Borders and shadows adapt

---

## Data Flow

### Sync Process
1. User clicks "Start Sync"
2. State changes to "syncing"
3. Progress bar initializes
4. API request sent to `/api/v1/integrations/woocommerce/sync/{entity}`
5. Progress updates in real-time
6. On completion:
   - State changes to "completed"
   - Stats displayed
   - History entry saved to localStorage
7. On error:
   - State changes to "error"
   - Error message displayed
   - History entry saved with error

### Configuration Save
1. User enters credentials
2. Clicks "Test Connection" (optional)
3. API validates connection
4. User clicks "Save Configuration"
5. API saves to database
6. Config ID returned
7. State updated with saved config

---

## Error Handling

### Connection Errors
- Red badge in header
- Warning card on sync tab
- Disabled sync buttons
- Clear error messages

### Sync Errors
- Red error card in sync cards
- Error message displayed
- "Retry Sync" button shown
- Error logged in history

### Validation Errors
- Toast notifications
- Form field validation
- Helpful error messages

---

## Performance Considerations

### Optimizations
- Number formatting with `toLocaleString()`
- Conditional rendering based on state
- localStorage for history (fast, local)
- Debounced API calls
- Progress calculation memoization

### Best Practices
- Keep history to last 50 entries
- Clear old localStorage entries
- Use loading states for all async operations
- Provide immediate visual feedback

---

## Accessibility Features

- Semantic HTML structure
- ARIA labels on icons
- Keyboard navigation support
- High contrast colors
- Focus indicators
- Screen reader friendly text
- Descriptive button labels
- Status announcements

---

## Testing Checklist

- [ ] Test idle state display
- [ ] Test sync initiation
- [ ] Verify progress updates
- [ ] Check ETA calculation
- [ ] Confirm statistics tracking
- [ ] Test completion state
- [ ] Test error handling
- [ ] Verify history persistence
- [ ] Test configuration save
- [ ] Test connection validation
- [ ] Check mobile layout
- [ ] Verify dark mode
- [ ] Test "Sync All" functionality
- [ ] Verify empty states
- [ ] Test all button states

---

## API Endpoints Used

### GET `/api/v1/integrations/woocommerce`
Fetches current configuration

### POST/PUT `/api/v1/integrations/woocommerce`
Saves configuration

### POST `/api/v1/integrations/woocommerce/test`
Tests connection

### POST `/api/v1/integrations/woocommerce/sync/products`
Syncs products

### POST `/api/v1/integrations/woocommerce/sync/orders`
Syncs orders

### POST `/api/v1/integrations/woocommerce/sync/customers`
Syncs customers

---

## LocalStorage Keys

### `woo_sync_history`
Stores array of sync history entries
```json
[
  {
    "id": "products-1234567890",
    "entityType": "products",
    "status": "success",
    "timestamp": "2025-11-03T14:30:00.000Z",
    "processed": 150,
    "created": 24,
    "updated": 126,
    "failed": 0,
    "duration": 12000
  }
]
```

---

## Troubleshooting

### Sync Not Starting
1. Check connection status badge
2. Verify configuration is saved
3. Test connection
4. Check browser console for errors

### Progress Not Updating
1. Check network tab for API responses
2. Verify sync endpoint is returning data
3. Check for JavaScript errors
4. Ensure state updates are working

### History Not Saving
1. Check localStorage quota
2. Verify JSON serialization
3. Check browser privacy settings
4. Test localStorage availability

---

## Maintenance Notes

### Adding New Entity Types
1. Add to `ENTITY_ICONS` constant
2. Add to `ENTITY_LABELS` constant
3. Add to sync progress state initialization
4. Create sync endpoint
5. Add to type definitions

### Updating Styles
- All Tailwind classes are inline
- Gradients use CSS custom properties
- Colors follow design system
- Spacing uses consistent scale

### Future Enhancements
- Real-time WebSocket updates
- Batch operations with queue
- Advanced filtering in history
- Export history to CSV
- Retry failed items only
- Scheduled sync operations
- Webhook integration
- Multi-store support
