# Sync Components Quick Reference

## Component Files

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| SyncPreview | `src/components/integrations/SyncPreview.tsx` | 350+ | Preview modal with tabs for New/Updated/Deleted items |
| ProgressTracker | `src/components/integrations/ProgressTracker.tsx` | 300+ | Real-time progress display with metrics |
| ActivityLog | `src/components/integrations/ActivityLog.tsx` | 400+ | Audit trail with filtering and export |
| useSyncManager | `src/hooks/useSyncManager.ts` | 70 | State management hook for sync operations |

## Integration Points

### WooCommerce Page
**File:** `K:\00Project\MantisNXT\src\app\integrations\woocommerce\page.tsx`

**Added Elements:**
```tsx
// Imports (line 17-20)
import SyncPreview from "@/components/integrations/SyncPreview";
import ProgressTracker from "@/components/integrations/ProgressTracker";
import ActivityLog from "@/components/integrations/ActivityLog";
import { useSyncManager } from "@/hooks/useSyncManager";

// State (line 101-102)
const syncManager = useSyncManager();
const [orgId, setOrgId] = useState<string>('org-default');

// Handlers (line 389-427)
const handlePreviewSync = (entityType: string) => { ... }
const handleSyncConfirmed = async (config: any) => { ... }

// UI Elements (line 687-696)
<div className="flex gap-2">
  <Button variant="outline" onClick={() => handlePreviewSync(entityType)}>
    <Eye className="mr-2 h-4 w-4" />
    Preview
  </Button>
  <Button onClick={() => handleSync(entityType)}>
    Start Sync
  </Button>
</div>

// Components (line 1030-1055)
<SyncPreview ... />
<ProgressTracker ... />
```

### Odoo Page
**File:** `K:\00Project\MantisNXT\src/app/integrations/odoo/page.tsx`

Same integration pattern as WooCommerce page.

## Usage Examples

### Using SyncPreview
```tsx
<SyncPreview
  isOpen={syncManager.state.isPreviewOpen}
  syncType="woocommerce"
  entityType={syncManager.state.currentEntityType || ''}
  onConfirm={(config) => handleSyncConfirmed({...config, entityType})}
  onCancel={() => syncManager.closePreview()}
/>
```

### Using ProgressTracker
```tsx
{syncManager.state.jobId && (
  <ProgressTracker
    jobId={syncManager.state.jobId}
    syncType="woocommerce"
    entityType={syncManager.state.currentEntityType || ''}
    isVisible={syncManager.state.isProgressVisible}
    onComplete={(status) => {
      syncManager.hideProgress();
      toast({ title: status === 'completed' ? 'Success' : 'Failed' });
    }}
    onCancel={() => syncManager.hideProgress()}
  />
)}
```

### Using ActivityLog
```tsx
<ActivityLog
  orgId="org-123"
  entityType="woocommerce"
/>
```

### Using useSyncManager
```tsx
const syncManager = useSyncManager();

// Open preview
syncManager.openPreview('woocommerce', 'products');

// Start progress tracking
syncManager.startProgress('job-123', 'woocommerce', 'products');

// Close preview
syncManager.closePreview();

// Hide progress
syncManager.hideProgress();

// Full reset
syncManager.resetSync();
```

## Key Props

### SyncPreview
```typescript
{
  isOpen: boolean;                               // Modal visibility
  syncType: 'woocommerce' | 'odoo';             // Integration type
  entityType: string;                            // Entity being synced
  onConfirm: (config: SyncConfig) => void;      // Sync confirmed
  onCancel: () => void;                          // User cancelled
}
```

### ProgressTracker
```typescript
{
  jobId: string;                                 // Sync job ID
  syncType: 'woocommerce' | 'odoo';             // Integration type
  entityType: string;                            // Entity being synced
  isVisible: boolean;                            // Display visibility
  onComplete?: (status: 'completed' | 'failed') => void;
  onCancel?: () => void;
}
```

### ActivityLog
```typescript
{
  orgId: string;                                 // Organization ID
  entityType?: string;                           // Filter by type
}
```

## API Endpoints (Expected Implementation)

### Preview Sync Data
```
POST /api/v1/integrations/sync/preview
Body: { syncType: 'woocommerce'|'odoo', entityType: string }
Response: { success: boolean, data: { newItems[], updatedItems[], deletedItems[], totalNew, totalUpdated, totalDeleted } }
```

### Get Sync Progress
```
GET /api/v1/integrations/sync/progress/[jobId]
Response: { success: boolean, data: { jobId, status, progress, processedCount, totalCount, currentItem, failedItems, ... } }
```

### Get Activity Logs
```
GET /api/v1/integrations/sync/activity?orgId={orgId}
Response: { success: boolean, data: ActivityLogEntry[] }
```

### Start Sync Orchestration
```
POST /api/v1/integrations/sync/orchestrate
Body: { jobId, syncType, entityType, includeNew, includeUpdated, includeDeleted, selectedIds? }
Response: { success: boolean, jobId, message }
```

## Common Workflows

### Complete Sync Flow
```tsx
1. User clicks Preview button
2. handlePreviewSync(entityType) → syncManager.openPreview()
3. SyncPreview modal opens, fetches preview data
4. User reviews and clicks Sync Selected
5. onConfirm() called → handleSyncConfirmed()
6. syncManager.startProgress() starts polling
7. ProgressTracker displays real-time updates
8. onComplete() fired when sync finishes
9. ActivityLog automatically updates (polls every 10s)
```

### Error Handling
```tsx
try {
  await startSync();
} catch (error) {
  toast({
    title: 'Sync Error',
    description: error.message,
    variant: 'destructive'
  });
  syncManager.resetSync();
}
```

## Performance Tips

1. **Memoization**: Components use React.memo for row items
2. **Pagination**: ActivityLog uses pagination (10/25/50 items)
3. **Polling**: 500ms for progress (smooth), 10s for activity (efficient)
4. **Search**: Client-side filtering for instant response
5. **Storage**: localStorage caches activity (1000 entries max per org)

## Testing Checklist

- [ ] Preview modal opens with correct data
- [ ] Can search and filter items in preview
- [ ] Can select/deselect items
- [ ] Progress tracker updates in real-time
- [ ] Activity log displays all sync operations
- [ ] Can filter activity by status/date/entity
- [ ] Can export activity to CSV
- [ ] Mobile responsive layout
- [ ] Dark mode support
- [ ] Keyboard navigation works
- [ ] Error states handle gracefully

## Troubleshooting

### Preview modal doesn't open
- Check `syncManager.state.isPreviewOpen`
- Verify `handlePreviewSync()` is called
- Check browser console for errors

### Progress tracker doesn't update
- Verify `jobId` is set correctly
- Check polling endpoint: `/api/v1/integrations/sync/progress/[jobId]`
- Look for network errors in DevTools

### Activity log doesn't show entries
- Check localStorage: `sync_activity_log_{orgId}`
- Verify API endpoint: `/api/v1/integrations/sync/activity`
- Check polling is working (DevTools Network tab)

## File Structure
```
src/
├── components/
│   └── integrations/
│       ├── SyncPreview.tsx      ← Preview modal
│       ├── ProgressTracker.tsx  ← Progress display
│       └── ActivityLog.tsx      ← Audit trail
├── hooks/
│   └── useSyncManager.ts        ← State hook
└── app/
    └── integrations/
        ├── woocommerce/
        │   └── page.tsx         ← WooCommerce integration
        └── odoo/
            └── page.tsx         ← Odoo integration
```

## Customization Points

### Styling
- All components use Tailwind CSS
- Edit colors in component className strings
- Supports dark mode (dark: prefix)

### Polling Intervals
- ProgressTracker: 500ms (line 84-87)
- ActivityLog: 10s (line 70)

### Storage Limits
- ActivityLog: 1000 entries per org (line 65)

### Table Pagination
- Default: 10 items per page
- Options: 10/25/50

## Dependencies Used
- React 19.1.1
- TypeScript 5.9.2
- shadcn/ui (Dialog, Tabs, Badge, Button, Card, Table, Input, Select)
- Radix UI (accessibility primitives)
- lucide-react (icons)
- Tailwind CSS 3.4.17
- date-fns (date formatting)

No additional dependencies required.
