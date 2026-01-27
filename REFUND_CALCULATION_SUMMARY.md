# Refund Calculation Feature - Implementation Summary

## Overview
Implemented automatic refund calculation for cancelled paid bookings based on cancellation policies. The system calculates refund amounts considering the cancellation policy type and days remaining until check-in.

## Features Implemented

### 1. Refund Calculation Library (`src/lib/refund-calculator.ts`)

**Cancellation Policies Supported:**
- **Flexible**: 100% refund if 1+ days notice, 0% otherwise
- **Moderate/Standard**: 100% refund (5+ days), 50% refund (3-4 days), 0% (< 3 days)
- **Strict**: 100% refund (14+ days), 50% refund (7-13 days), 0% (< 7 days)
- **Fair**: 100% refund (7+ days), 50% refund (2-6 days), 0% (< 2 days)
- **Non-refundable**: 0% refund always
- **Multiday Private**: Same as strict policy

**Functions:**
- `calculateBookingRefund(bookingId)`: Calculate refund for single booking
- `calculateBulkOrderRefund(orderId)`: Calculate total refund for bulk orders
- `getRefundInfo(bookingId, orderId)`: Smart function that handles both types

**Refund Calculation Logic:**
1. Fetches booking details (check-in date, total price, currency)
2. Calculates days until check-in
3. Retrieves cancellation policy from property/tour
4. Applies appropriate refund percentage based on policy + days
5. Returns refund amount, percentage, policy type, and description

### 2. Admin Dashboard Integration

**Location:** [src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx)

**Changes:**
- Added refund state: `refundInfo`
- Calculate refund when booking details dialog opens
- Display refund section after payment information
- Shows:
  - Refund amount in booking currency
  - Refund percentage
  - Policy type badge
  - Explanation of why this percentage applies

**Visual Design:**
- Yellow alert box with warning icon
- Clear formatting with labels and values
- Tooltip-style description of policy

### 3. Staff Dashboard (Operations) Integration

**Location:** [src/pages/StaffDashboard.tsx](src/pages/StaffDashboard.tsx)

**Changes:**
- Same refund calculation on booking details view
- Identical display to Admin Dashboard
- Helps operations staff understand refund requirements

### 4. Financial Staff Dashboard Integration

**Location:** [src/pages/FinancialStaffDashboard.tsx](src/pages/FinancialStaffDashboard.tsx)

**Changes:**
- Added `RefundDisplay` component
- Shows refund inline in bookings table for cancelled paid bookings
- Format: "↩ Refund: XX USD" below the total price
- Hover tooltip shows percentage and policy

**RefundDisplay Component:**
- Lightweight component that loads refund info asynchronously
- Only renders for cancelled + paid bookings
- Uses `useEffect` to fetch refund on mount

### 5. Database Migration (Optional)

**File:** `supabase/migrations/20260127000001_add_refund_calculation.sql`

**Function:** `calculate_refund_amount(booking_id_param UUID)`

**Purpose:** PostgreSQL function for server-side refund calculation

**Note:** Can be applied manually via Supabase SQL Editor if needed

## How It Works

### Example Scenarios

**Scenario 1: Property with "Fair" Policy**
- Total Price: $100 USD
- Check-in: 10 days from now
- Policy: Fair (7+ days = 100% refund)
- **Refund: $100 USD (100%)**

**Scenario 2: Tour with "Strict" Policy**
- Total Price: €200 EUR
- Check-in: 5 days from now
- Policy: Strict (7-13 days = 50% refund)
- **Refund: €0 EUR (0%)** - Less than 7 days notice

**Scenario 3: Bulk Order (Multiple Items)**
- Property booking: $50 USD (flexible, 100% refund)
- Tour booking: $100 USD (moderate, 50% refund)
- Transport booking: $25 USD (standard, 100% refund)
- **Total Refund: $175 USD**

### Bulk Order Handling

For orders with multiple bookings (same `order_id`):
1. Calculates refund for each booking individually
2. Sums all refund amounts
3. Calculates average refund percentage
4. Shows "bulk" as policy type with item count

## Dashboard Display

### Admin Dashboard & Operations Staff
```
┌──────────────────────────────────────────┐
│ 💰 Refund Information                    │
├──────────────────────────────────────────┤
│ ⚠️                                        │
│   Refund Amount:           $75.00 USD    │
│   Refund Percentage:       75%           │
│   Policy Type:             [fair]        │
│   ─────────────────────────────────────  │
│   Fair: 50% refund (2-6 days notice)    │
└──────────────────────────────────────────┘
```

### Financial Staff Dashboard (Table)
```
┌──────────┬────────┬─────────────┬────────┐
│ ID       │ Guest  │ Amount      │ Status │
├──────────┼────────┼─────────────┼────────┤
│ abc123.. │ John D │ $100 USD    │ ✓ Paid │
│          │        │ ↩ Refund:   │        │
│          │        │   $50 USD   │        │
└──────────┴────────┴─────────────┴────────┘
```

## Testing

### Manual Testing Steps

1. **Create a test cancelled paid booking:**
   ```sql
   -- Via Supabase SQL Editor
   UPDATE bookings 
   SET status = 'cancelled', payment_status = 'paid'
   WHERE id = 'your-booking-id';
   ```

2. **Check Admin Dashboard:**
   - Navigate to Bookings tab
   - Click "Details" on the cancelled booking
   - Verify refund section appears with correct amount

3. **Check Operations Dashboard:**
   - Same as above in Staff Dashboard

4. **Check Financial Dashboard:**
   - Navigate to Bookings tab
   - Find cancelled paid booking in table
   - Verify refund amount shows below total price

### Test Script

**File:** `test-refund-calculation.mjs`

**Usage:**
```bash
node test-refund-calculation.mjs
```

**Output:**
- Lists all bookings with their policies
- Shows days until check-in
- Calculates refund for cancelled paid bookings
- Displays refund amount and percentage

## Configuration

### Adding New Cancellation Policies

Edit `src/lib/refund-calculator.ts`:

```typescript
const REFUND_POLICIES = {
  // ... existing policies
  custom_policy: [
    { minDays: 30, refundPct: 100, description: 'Full refund (30+ days notice)' },
    { minDays: 14, refundPct: 75, description: '75% refund (14-29 days notice)' },
    { minDays: 7, refundPct: 50, description: '50% refund (7-13 days notice)' },
    { minDays: 0, refundPct: 25, description: '25% refund (< 7 days notice)' }
  ]
};
```

### Policy Tiers Explanation

- **minDays**: Minimum days before check-in for this tier
- **refundPct**: Percentage of total price to refund (0-100)
- **description**: Human-readable explanation shown to staff

Rules are evaluated from highest minDays to lowest. First matching rule applies.

## Files Changed

1. `src/lib/refund-calculator.ts` - New refund calculation library
2. `src/pages/AdminDashboard.tsx` - Added refund display to booking details
3. `src/pages/StaffDashboard.tsx` - Added refund display to booking details
4. `src/pages/FinancialStaffDashboard.tsx` - Added inline refund display in table
5. `supabase/migrations/20260127000001_add_refund_calculation.sql` - Optional DB function
6. `apply-refund-migration.mjs` - Script to apply migration (optional)
7. `test-refund-calculation.mjs` - Test script

## Benefits

✅ **Automated**: No manual calculation needed
✅ **Accurate**: Based on exact cancellation policies
✅ **Transparent**: Shows policy type and explanation
✅ **Consistent**: Same logic across all dashboards
✅ **Flexible**: Supports multiple policy types
✅ **Multi-currency**: Works with USD, EUR, RWF, etc.
✅ **Bulk-aware**: Handles cart orders correctly

## Future Enhancements

1. **Automated Refund Processing**: Trigger actual refunds via payment gateway
2. **Refund History**: Track refund requests and completions
3. **Email Notifications**: Notify guests of refund amounts
4. **Custom Policies**: Support property-specific custom policies from URL
5. **Refund Reports**: Generate financial reports for refunded bookings
6. **Partial Refunds**: Manual adjustment of calculated refund amounts

## Deployment Notes

- ✅ Code pushed to repository (commit: 81185b5)
- ⚠️ Database migration available but not applied (apply manually if needed)
- ✅ Works immediately in frontend without migration
- ✅ No breaking changes to existing functionality
- ✅ Backward compatible with all booking types

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify booking has `payment_status = 'paid'` and `status = 'cancelled'`
3. Confirm property/tour has valid cancellation policy
4. Check that `check_in` date is valid
5. Review test script output for calculation logic

---

**Implementation Date:** January 27, 2025
**Version:** 1.0
**Status:** ✅ Complete and Deployed
