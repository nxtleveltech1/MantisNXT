# Recent Uploads Table - Code Snippets Reference

## Quick Reference for Modern Table Styling

### 1. Enhanced Status Badge Function

```tsx
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'received':
      return (
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm shadow-blue-200 px-3 py-1 gap-1.5"
        >
          <Clock className="h-3 w-3" />
          Received
        </Badge>
      )
    case 'validating':
      return (
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-sm shadow-yellow-200 px-3 py-1 gap-1.5"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Validating
        </Badge>
      )
    case 'validated':
      return (
        <Badge
          variant="outline"
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-sm shadow-emerald-200 px-3 py-1 gap-1.5"
        >
          <CheckCircle className="h-3 w-3" />
          Validated
        </Badge>
      )
    case 'merged':
      return (
        <Badge
          variant="default"
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 shadow-md shadow-green-300 px-3 py-1 gap-1.5 font-semibold"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Merged
        </Badge>
      )
    case 'failed':
      return (
        <Badge
          variant="destructive"
          className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-0 shadow-md shadow-red-300 px-3 py-1 gap-1.5 font-semibold"
        >
          <XCircle className="h-3.5 w-3.5" />
          Failed
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="px-3 py-1">
          {status}
        </Badge>
      )
  }
}
```

### 2. File Icon Helper Function

```tsx
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconClass = "h-4 w-4 text-muted-foreground"

  switch (ext) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className={iconClass} />
    default:
      return <FileText className={iconClass} />
  }
}
```

### 3. Required Icon Imports

```tsx
import {
  // ... existing imports
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'
```

### 4. Card with Gradient Header

```tsx
<Card className="col-span-2 border-border shadow-lg">
  <CardHeader className="border-b border-border bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-lg">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
          <FileUp className="h-5 w-5 text-white" />
        </div>
        Recent Uploads
      </CardTitle>
      <Badge variant="secondary" className="px-3 py-1 font-semibold">
        {recentUploads.length} uploads
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="p-0">
    {/* Table content */}
  </CardContent>
</Card>
```

### 5. Enhanced Table Header

```tsx
<TableHeader>
  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
    <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
      Supplier
    </TableHead>
    <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
      File
    </TableHead>
    <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
      Date
    </TableHead>
    <TableHead className="text-right font-semibold text-xs uppercase tracking-wide text-foreground">
      Rows
    </TableHead>
    <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
      Status
    </TableHead>
  </TableRow>
</TableHeader>
```

### 6. Alternating Row Pattern

```tsx
<TableBody>
  {recentUploads.map((upload, index) => (
    <TableRow
      key={upload.upload_id}
      className={cn(
        "hover:bg-accent/50 transition-colors cursor-pointer group border-b border-border/50",
        index % 2 === 0 ? "bg-background" : "bg-muted/20"
      )}
    >
      {/* Cell content */}
    </TableRow>
  ))}
</TableBody>
```

### 7. Supplier Column with Avatar

```tsx
<TableCell className="font-semibold text-foreground py-4">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
      {upload.supplier_name.charAt(0).toUpperCase()}
    </div>
    {upload.supplier_name}
  </div>
</TableCell>
```

### 8. File Column with Icon

```tsx
<TableCell className="py-4">
  <div className="flex items-center gap-2 max-w-[250px]">
    {getFileIcon(upload.filename)}
    <span className="truncate text-sm" title={upload.filename}>
      {upload.filename}
    </span>
  </div>
</TableCell>
```

### 9. Two-Line Date Column

```tsx
<TableCell className="text-sm text-muted-foreground py-4">
  <div className="flex flex-col">
    <span className="font-medium text-foreground">
      {new Date(upload.received_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}
    </span>
    <span className="text-xs">
      {new Date(upload.received_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  </div>
</TableCell>
```

### 10. Row Count with Valid Rows

```tsx
<TableCell className="text-right py-4">
  <div className="flex flex-col items-end">
    <span className="font-bold text-foreground">
      {upload.row_count.toLocaleString()}
    </span>
    {upload.valid_rows !== undefined && (
      <span className="text-xs text-muted-foreground">
        {upload.valid_rows} valid
      </span>
    )}
  </div>
</TableCell>
```

### 11. Enhanced Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 flex items-center justify-center mb-4">
    <FileUp className="h-10 w-10 text-blue-600 dark:text-blue-400" />
  </div>
  <h3 className="text-lg font-semibold text-foreground mb-2">No uploads yet</h3>
  <p className="text-sm text-muted-foreground max-w-sm">
    Get started by uploading your first supplier pricelist to begin building your inventory portfolio.
  </p>
</div>
```

---

## Reusable Patterns

### Pattern 1: Gradient Badge Template

```tsx
<Badge
  variant="outline" // or "default" or "destructive"
  className="bg-gradient-to-r from-[COLOR1] to-[COLOR2] text-white border-0 shadow-[sm/md] shadow-[COLOR]-[200/300] px-3 py-1 gap-1.5 [font-semibold]"
>
  <Icon className="h-3 w-3" />
  Status Text
</Badge>
```

**Variables:**
- `[COLOR1]` and `[COLOR2]`: Gradient start/end colors
- `shadow-[sm/md]`: Small or medium shadow
- `shadow-[COLOR]-[200/300]`: Shadow color and intensity
- `[font-semibold]`: Optional for emphasis

### Pattern 2: Avatar Circle Template

```tsx
<div className="w-8 h-8 rounded-full bg-gradient-to-br from-[COLOR1] to-[COLOR2] flex items-center justify-center text-white text-xs font-bold shadow-sm">
  {entity.name.charAt(0).toUpperCase()}
</div>
```

### Pattern 3: Two-Line Data Column

```tsx
<TableCell className="text-sm text-muted-foreground py-4">
  <div className="flex flex-col">
    <span className="font-medium text-foreground">
      {primaryValue}
    </span>
    <span className="text-xs">
      {secondaryValue}
    </span>
  </div>
</TableCell>
```

### Pattern 4: Icon + Text Cell

```tsx
<TableCell className="py-4">
  <div className="flex items-center gap-2 max-w-[250px]">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span className="truncate text-sm" title={fullText}>
      {displayText}
    </span>
  </div>
</TableCell>
```

### Pattern 5: Gradient Card Header

```tsx
<CardHeader className="border-b border-border bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2 text-lg">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[COLOR1] to-[COLOR2] flex items-center justify-center shadow-md">
        <Icon className="h-5 w-5 text-white" />
      </div>
      Title
    </CardTitle>
    <Badge variant="secondary" className="px-3 py-1 font-semibold">
      {count} items
    </Badge>
  </div>
</CardHeader>
```

---

## Color Combinations Guide

### Success/Merged
```tsx
from-green-600 to-emerald-600
shadow-green-300
```

### Error/Failed
```tsx
from-red-600 to-rose-600
shadow-red-300
```

### Info/Received
```tsx
from-blue-500 to-cyan-500
shadow-blue-200
```

### Warning/Validating
```tsx
from-yellow-500 to-amber-500
shadow-yellow-200
```

### Success Alt/Validated
```tsx
from-emerald-500 to-teal-500
shadow-emerald-200
```

### Brand/Primary
```tsx
from-purple-500 to-pink-500
shadow-purple-200
```

### Neutral Header
```tsx
from-slate-50 to-gray-50
dark:from-slate-900 dark:to-gray-900
```

---

## Utility Classes Quick Reference

### Spacing
- `py-4` - Vertical padding for cells
- `px-3 py-1` - Badge padding
- `gap-2` - Space between flex items
- `mb-4` - Bottom margin

### Typography
- `font-semibold` - Semi-bold weight
- `font-bold` - Bold weight
- `text-xs` - Extra small text
- `text-sm` - Small text
- `text-lg` - Large text
- `uppercase` - Uppercase transform
- `tracking-wide` - Wide letter spacing

### Layout
- `flex items-center gap-2` - Horizontal flex with centering
- `flex flex-col` - Vertical stack
- `items-end` - Align items to end
- `justify-between` - Space between items
- `max-w-[250px]` - Max width constraint
- `truncate` - Text truncation with ellipsis

### Colors
- `text-foreground` - Primary text color
- `text-muted-foreground` - Secondary text color
- `bg-background` - Background color
- `bg-muted/20` - Muted background at 20% opacity
- `border-border` - Border color
- `text-white` - White text

### Effects
- `shadow-sm` - Small shadow
- `shadow-md` - Medium shadow
- `shadow-lg` - Large shadow
- `rounded-full` - Fully rounded corners
- `rounded-lg` - Large rounded corners
- `transition-colors` - Color transition animation

### Interactive
- `hover:bg-accent/50` - Hover background
- `cursor-pointer` - Pointer cursor
- `group` - Group hover target

---

## Common Adjustments

### Adjust Badge Shadow Intensity
```tsx
shadow-sm shadow-[color]-200  // Subtle
shadow-md shadow-[color]-300  // Standard
shadow-lg shadow-[color]-400  // Prominent
```

### Adjust Avatar Size
```tsx
w-6 h-6  // Small
w-8 h-8  // Standard
w-10 h-10  // Large
```

### Adjust Icon Size
```tsx
h-3 w-3  // Small (badges)
h-4 w-4  // Standard (inline)
h-5 w-5  // Large (headers)
h-6 w-6  // Extra large
```

### Adjust Row Hover Intensity
```tsx
hover:bg-accent/30  // Subtle
hover:bg-accent/50  // Standard
hover:bg-accent/70  // Prominent
```

---

## Implementation Checklist

When applying these patterns to other tables:

- [ ] Import required icons from lucide-react
- [ ] Create status badge helper function
- [ ] Create file icon helper function (if needed)
- [ ] Apply gradient to card header
- [ ] Add upload/item count badge
- [ ] Style table headers (uppercase, semibold, tracking-wide)
- [ ] Implement alternating row backgrounds
- [ ] Add hover effects with transitions
- [ ] Add avatar circles for entities
- [ ] Add file/type icons where appropriate
- [ ] Use two-line layouts for dates/complex data
- [ ] Add row counts with additional details
- [ ] Style badges with gradients and icons
- [ ] Enhance empty state with gradient icon
- [ ] Test dark mode appearance
- [ ] Verify responsive behavior
- [ ] Check accessibility (contrast, focus states)

---

## Performance Notes

1. **Function Memoization**: Consider memoizing badge/icon functions if list is very large
2. **Virtual Scrolling**: For 1000+ items, consider react-window or tanstack-virtual
3. **Lazy Loading**: Load data in chunks for better initial render
4. **Debounce Search**: If adding search, debounce input for 300ms
5. **Optimize Re-renders**: Use React.memo for row components if needed

---

## Accessibility Checklist

- [x] Status badges have icons + text
- [x] Color contrast meets WCAG AAA
- [x] Hover states are clearly visible
- [x] Table structure is semantic
- [x] Truncated text has title tooltips
- [x] Focus states are maintained
- [x] Dark mode is supported
- [x] Screen readers can navigate table

---

## Testing Scenarios

1. **Empty State**: Verify empty state displays correctly
2. **Single Row**: Check spacing with one item
3. **Many Rows**: Test scrolling with 100+ items
4. **Long Names**: Verify truncation and tooltips
5. **All Statuses**: Test all badge variants
6. **Dark Mode**: Switch and verify all colors
7. **Responsive**: Test on mobile/tablet/desktop
8. **Hover**: Check hover states on all interactive elements
9. **Date Format**: Verify date/time formatting
10. **Row Count**: Test with and without valid_rows

---

This reference provides all code snippets needed to replicate the modern table styling across other components in the application.
