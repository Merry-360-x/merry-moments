# Host Dashboard & Tours Test Suite

Automated test script for verifying host dashboard and tour functionality.

## Test Coverage

✅ **Database Schema Tests**
- Tours table structure and queries
- Tour packages table and status validation
- Profiles table with tour guide fields
- Properties, vehicles, routes, and bookings tables

✅ **Query Tests**
- Published tours filtering
- Approved tour packages filtering
- Search functionality (title, location)
- Category filtering
- Image field validation

✅ **Data Integrity Tests**
- Status enum validation (tour_packages: draft, pending_approval, approved, rejected, archived)
- Payment status validation (pending, paid, failed, refunded)
- Numeric field validation (prices, durations)
- Array field structure (images, gallery_images, categories)

## Running Tests

### Quick Run
```bash
SUPABASE_ANON_KEY=your_anon_key node test-host-dashboard.mjs
```

### With Environment Variables
```bash
export SUPABASE_ANON_KEY=your_anon_key
node test-host-dashboard.mjs
```

### Getting Your Anon Key
1. Go to Supabase Dashboard → Settings → API
2. Copy the "anon" / "public" key
3. Use it in the command above

## Test Results

**Latest Run:** 19 passed, 0 failed

### Key Findings
- ✅ 3 approved tour packages in database
- ✅ All status values are valid
- ✅ Image fields properly structured
- ✅ Search functionality working
- ✅ Payment status tracking operational

### Known Limitations
- Profile joins may fail due to PostgREST schema cache
- Frontend uses separate queries as workaround (intentional design)

## Adding New Tests

Edit `test-host-dashboard.mjs` and add:

```javascript
test('Your test name', async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('columns')
    .limit(5);
  
  if (error) throw new Error(`Query failed: ${error.message}`);
  // Add assertions here
});
```

## CI/CD Integration

Add to GitHub Actions or Vercel:

```yaml
- name: Run Host Tests
  env:
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  run: node test-host-dashboard.mjs
```
