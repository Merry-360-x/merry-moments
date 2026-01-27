# How to See Refund Amounts on Dashboards

## ✅ Refund Display Locations

### 1. **Admin Dashboard** - Bookings Tab
**Path:** `/admin` → Bookings tab

**Where to look:**
- In the **bookings table**, look at the "Amount" column
- For cancelled paid bookings, you'll see:
  ```
  100 USD
  ↩ Refund: 75 USD
  ```
- The refund amount appears in **yellow text** below the total price

**Bonus - Details Dialog:**
- Click "Details" button on any cancelled paid booking
- Scroll to "Refund Information" section (yellow alert box)
- Shows refund amount, percentage, policy type, and explanation

### 2. **Operations Staff Dashboard**
**Path:** `/staff` → Overview tab

**Where to look:**
- Same as Admin Dashboard - in the bookings table "Amount" column
- Refund appears below total price for cancelled paid bookings
- Also available in the booking details dialog

### 3. **Financial Staff Dashboard**  
**Path:** `/financial` → Bookings tab

**Where to look:**
- In the bookings table, "Amount" column
- Refund displays inline for cancelled paid bookings:
  ```
  $100 USD
  ↩ Refund: $50 USD
  ```

## 🧪 Testing - How to Create a Cancelled Paid Booking

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to your project → Table Editor → `bookings`
3. Find any booking with `payment_status = 'paid'`
4. Click to edit that row
5. Change `status` to `'cancelled'`
6. Save changes
7. Refresh your dashboard - you should now see the refund amount!

### Option 2: Via SQL Editor

```sql
-- Find a paid booking
SELECT id, total_price, currency, status, payment_status, check_in
FROM bookings
WHERE payment_status = 'paid'
LIMIT 5;

-- Pick one booking ID and cancel it
UPDATE bookings
SET status = 'cancelled'
WHERE id = 'YOUR-BOOKING-ID-HERE';

-- Verify it worked
SELECT id, total_price, currency, status, payment_status
FROM bookings
WHERE id = 'YOUR-BOOKING-ID-HERE';
```

### Option 3: Create Test Cancelled Booking (Script)

Run the included script:
```bash
node check-cancelled-bookings.mjs
```

This will:
- Check for existing cancelled paid bookings
- If none found, automatically cancel one paid booking for testing
- Show you the booking ID to look for

## 🔍 Verification Checklist

After creating a cancelled paid booking:

✅ **Admin Dashboard:**
- [ ] Navigate to `/admin`
- [ ] Click "Bookings" tab
- [ ] Find the cancelled booking in the table
- [ ] Verify yellow "↩ Refund: XX USD" text appears below amount
- [ ] Click "Details" button
- [ ] Scroll down to see "💰 Refund Information" section

✅ **Operations Dashboard:**
- [ ] Navigate to `/staff`
- [ ] Check "Recent Bookings" section on Overview
- [ ] Or check specific bookings tables
- [ ] Verify refund amount displays

✅ **Financial Dashboard:**
- [ ] Navigate to `/financial`
- [ ] Click "Bookings" tab
- [ ] Find cancelled paid booking
- [ ] Verify refund shows inline

## 📊 What You Should See

### Main Table Display
```
┌──────────────────┬──────────────────┬─────────┐
│ Booking ID       │ Amount           │ Status  │
├──────────────────┼──────────────────┼─────────┤
│ abc123...        │ 100 USD          │ Paid    │
│                  │ ↩ Refund: 50 USD │ [Cancel]│
└──────────────────┴──────────────────┴─────────┘
```

### Details Dialog (Admin/Staff)
```
┌─────────────────────────────────────────────┐
│ 💰 Refund Information                       │
├─────────────────────────────────────────────┤
│ ⚠️                                           │
│   Refund Amount:        50 USD              │
│   Refund Percentage:    50%                 │
│   Policy Type:          [fair]              │
│   ────────────────────────────────────────  │
│   Fair: 50% refund (2-6 days notice)       │
└─────────────────────────────────────────────┘
```

## ❓ Troubleshooting

### "I don't see any refund amounts"

**Check:**
1. ✅ Do you have bookings with BOTH:
   - `status = 'cancelled'` **AND**
   - `payment_status = 'paid'`

2. ✅ Are you looking in the right place?
   - Admin Dashboard → Bookings tab → Amount column
   - Not just the details dialog!

3. ✅ Did you refresh the page after cancelling a booking?

4. ✅ Check browser console for errors (F12)

### "Refund amount seems wrong"

The refund depends on:
- **Cancellation policy** (from property/tour)
- **Days until check-in** (calculated from today)

Example:
- Property with "Fair" policy
- Check-in is 10 days away
- Fair policy: 100% refund if 7+ days → **100% refund**

If check-in was only 3 days away:
- Fair policy: 50% refund if 2-6 days → **50% refund**

### "How do I see what policy a property/tour has?"

**Via Supabase:**
```sql
-- Check property cancellation policy
SELECT id, title, cancellation_policy
FROM properties
WHERE id = 'PROPERTY-ID';

-- Check tour cancellation policy  
SELECT id, title, cancellation_policy_type
FROM tour_packages
WHERE id = 'TOUR-ID';
```

## 🎯 Quick Test Example

1. Go to Supabase → `bookings` table
2. Find a booking where:
   - `payment_status = 'paid'`
   - `check_in` is in the future (next week works great)
3. Change `status` to `'cancelled'`
4. Save
5. Go to Admin Dashboard → Bookings tab
6. **You should immediately see** the refund amount!

## 📝 Notes

- Refunds calculate **automatically** when:
  - Status is "cancelled"
  - Payment status is "paid"
  - Check-in date is valid

- Refund appears **in real-time** - no page refresh needed after initial load

- For **bulk orders** (multiple bookings with same order_id):
  - Each booking shows its individual refund
  - Total refund = sum of all bookings in the order

- **No database migration needed** - everything works in the frontend!

---

**Still not seeing refunds?** Check that:
1. You're logged in with admin or staff role
2. The booking truly has both `cancelled` status AND `paid` payment_status
3. Browser console (F12) doesn't show errors
4. You're looking in the Amount column of the bookings table, not just the dialog
