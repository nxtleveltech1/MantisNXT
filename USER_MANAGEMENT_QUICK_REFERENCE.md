# User Management - Quick Reference Guide

## Component Usage

### UserTable
```typescript
import { UserTable } from '@/components/admin/users/UserTable'

<UserTable
  data={users}
  onDelete={(user) => handleDelete(user)}
  onToggleStatus={(user) => toggleStatus(user)}
  onBulkAction={(users, action) => handleBulk(users, action)}
/>
```

### UserFilters
```typescript
import { UserFilters } from '@/components/admin/users/UserFilters'

const [filters, setFilters] = useState<UserFilterState>({
  search: '',
  role: 'all',
  department: 'all',
  status: 'all',
  createdFrom: undefined,
  createdTo: undefined,
})

<UserFilters
  departments={departments}
  filters={filters}
  onFiltersChange={setFilters}
  onReset={() => setFilters(initialState)}
/>
```

## Routes

| URL | Page |
|-----|------|
| `/admin/users` | User list with filtering |
| `/admin/users/[id]` | User profile details |
| `/admin/users/[id]/roles` | Role assignment |
| `/admin/users/bulk` | Bulk operations |

## CSV Import Format

```csv
name,email,role,department,phone,password,id_number,employment_equity
John Doe,john@example.co.za,user,Sales,+27 11 123 4567,Password123!,8001015009087,white
```

### Valid Roles:
- `super_admin`
- `admin`
- `manager`
- `user`
- `viewer`

### Valid Employment Equity:
- `african`
- `coloured`
- `indian`
- `white`
- `other`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + K` | Focus search |
| `Enter` | Submit form |
| `Escape` | Cancel/Close |
| `Space` | Toggle checkbox |
| `Tab` | Navigate fields |

## Accessibility

- All forms have proper labels
- Error messages are announced to screen readers
- Keyboard navigation fully supported
- Focus management in modals
- ARIA attributes on interactive elements

## Performance Tips

1. **Filtering**: Client-side filtering up to 1000 users
2. **Pagination**: 10 users per page by default
3. **Export**: CSV export handled client-side
4. **Bulk Operations**: Process in batches of 50

## Common Tasks

### Add New User
1. Click "Add User" button
2. Fill in required fields
3. Select role
4. Click "Create User"

### Bulk Import
1. Download CSV template
2. Fill in user data
3. Upload CSV file
4. Review validation results
5. Confirm import

### Change User Role
1. Navigate to user profile
2. Go to "Roles" tab
3. Select new role
4. Set effective date
5. Save changes

### Deactivate Multiple Users
1. Select users with checkboxes
2. Click "Deactivate" in bulk actions bar
3. Confirm action

## Error Messages

| Code | Message | Solution |
|------|---------|----------|
| EMAIL_EXISTS | Email already in use | Use different email |
| INVALID_ROLE | Invalid role value | Use valid role from list |
| PERMISSION_DENIED | Insufficient permissions | Contact administrator |
| VALIDATION_ERROR | Form validation failed | Check error messages |

## Development

### Run in development:
```bash
npm run dev
```

### Type checking:
```bash
npm run type-check
```

### Accessibility audit:
```bash
npm run test:accessibility
```

## Need Help?

- Check `PHASE2_USER_MANAGEMENT_IMPLEMENTATION.md` for detailed documentation
- Review `src/types/auth.ts` for type definitions
- See `src/lib/auth/validation.ts` for validation rules
