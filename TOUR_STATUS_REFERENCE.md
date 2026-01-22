# Tour Package Status Values

## Allowed Status Values
Based on database constraint in `tour_packages` table:

- **draft** - Tour is being created/edited (default)
- **pending_approval** - Tour submitted for review
- **approved** - Tour is live and bookable
- **rejected** - Tour rejected by admin
- **archived** - Tour archived/inactive

## Usage

### Submit Tour (Make Live)
```typescript
status: 'approved'  // ✅ Correct
status: 'published' // ❌ Wrong - violates constraint
```

### Save Draft
```typescript
status: 'draft'  // ✅ Correct
```

## Database Constraint
```sql
CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'archived'))
```
