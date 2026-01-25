# Quick Start Guide: Booking Auto-Confirmation & Dashboard Controls

## 🚀 For Operations Staff

### Manual Booking Confirmations

**Location:** Operations Dashboard → Bookings Tab

1. **View Pending Bookings**
   - Click "Operations Dashboard" in navigation
   - Select "Bookings" tab
   - Look for bookings with status: "pending" or "pending_confirmation"

2. **Confirm a Booking**
   - Click the green "Confirm" button next to any pending booking
   - Booking status instantly changes to "confirmed"
   - Guest receives automatic notification (if enabled)

3. **Cart Checkout Orders**
   - Switch to "Cart Checkout Orders" tab
   - See grouped orders (multiple items from one guest)
   - Click "Confirm Order" to confirm all items at once
   - Individual items can also be confirmed separately

**Pro Tips:**
- ✅ Auto-confirmed bookings don't need manual action
- 🔍 Filter by status to focus on pending items
- 📊 Check-in dates help prioritize urgent bookings

---

## 💰 For Financial Staff

### Payment Management Workflow

**Location:** Financial Dashboard → All Bookings Tab

### Step 1: Request Payment

For confirmed bookings waiting for payment:

1. Find booking with:
   - Status: "Confirmed" ✅
   - Payment: "Pending" ⏱

2. Click **"Request Payment"** button
   - Payment status changes to "Requested"
   - Guest receives payment reminder (email/SMS)
   - Timestamp recorded for tracking

### Step 2: Mark as Paid

After guest completes payment:

1. Verify payment in your payment system (bank/MoMo/etc.)

2. Click **"Mark Paid"** button
   - Payment status changes to "Paid" ✅
   - Metrics update automatically
   - Guest can access booking details

**Payment Status Flow:**
```
pending → (Request Payment) → requested → (Mark Paid) → paid
```

**Pro Tips:**
- 📧 Use "Request Payment" to send professional reminders
- 💵 Always verify actual payment before clicking "Mark Paid"
- 📈 Check metrics dashboard for payment trends
- 📅 Use date filters to generate financial reports

---

## 🎯 For All Staff

### Understanding Auto-Confirmation

**What Gets Auto-Confirmed:**
- ✅ Properties: Available for selected dates (no conflicting bookings)
- ✅ Tours: Published and approved
- ✅ Packages: Status is "approved"
- ✅ Transport: Published vehicles

**What Needs Manual Review:**
- ❌ Properties with conflicting dates
- ❌ Unpublished items
- ❌ Special requests from guests
- ❌ Group bookings requiring quotes

### Guest Experience

**Auto-Confirmed Bookings:**
```
Guest submits booking
    ↓
System checks availability (instant)
    ↓
✅ Available → Status: "Confirmed" (green badge)
    ↓
Guest sees: "✓ Auto-Confirmed! Your booking has been automatically confirmed."
```

**Manual Review Required:**
```
Guest submits booking
    ↓
System checks availability
    ↓
❌ Not available or needs review → Status: "Pending" (yellow badge)
    ↓
Staff reviews and manually confirms
    ↓
Guest notified of confirmation
```

---

## 📊 Dashboard Overview

### Operations Dashboard

**Tabs:**
1. **Overview** - Quick stats and metrics
2. **Applications** - Host/guide applications
3. **Accommodations** - Property management
4. **Tours** - Tour package approvals
5. **Transport** - Vehicle listings
6. **Bookings** - Individual bookings ⭐
7. **Cart Checkout Orders** - Bulk orders ⭐

**Key Actions:**
- Approve/Reject applications
- Publish/Unpublish listings
- Confirm bookings (manual override)
- Review special requests

### Financial Dashboard

**Tabs:**
1. **Overview** - Revenue metrics
2. **All Bookings** - Payment management ⭐
3. **Cart Checkouts** - Bulk order payments
4. **Revenue by Currency** - Multi-currency breakdown

**Key Metrics:**
- Total Revenue
- Total Bookings
- Paid Bookings
- Pending Payments

**Key Actions:**
- Request payment from guests
- Mark bookings as paid
- Export financial reports (CSV)
- Filter by date range

---

## 🔧 Common Scenarios

### Scenario 1: Guest Can't Find Confirmation

**Problem:** Guest says they didn't receive confirmation

**Solution:**
1. Go to Operations Dashboard → Bookings
2. Search for guest email/name
3. Check booking status:
   - "Confirmed" = Auto-confirmed, check email filters
   - "Pending" = Needs manual confirmation (click "Confirm")
4. After confirming, notify guest directly

### Scenario 2: Payment Request Follow-up

**Problem:** Guest hasn't paid after request

**Solution:**
1. Go to Financial Dashboard → All Bookings
2. Filter by payment status: "Requested"
3. Check how long since request sent
4. After 3 days: Click "Request Payment" again (sends reminder)
5. After 7 days: Contact guest directly

### Scenario 3: Conflicting Dates

**Problem:** Two bookings for same property/dates

**Solution:**
1. System prevents this automatically for new bookings
2. If occurred (rare):
   - Go to Operations Dashboard → Bookings
   - Check check-in/check-out dates
   - Cancel one booking (first come, first served)
   - Contact second guest with alternatives

### Scenario 4: Bulk Cart Order with Mixed Items

**Problem:** Guest cart has 3 properties, only 2 available

**Automatic Behavior:**
- 2 available properties = Auto-confirmed ✅
- 1 unavailable property = Pending ⏱

**Your Action:**
1. Go to Cart Checkout Orders tab
2. Find order with "Mixed" status
3. Review unavailable item
4. Options:
   - Suggest alternative dates
   - Offer different property
   - Remove item and confirm rest
5. Communicate with guest

---

## 📱 Mobile Access

Both dashboards are mobile-responsive:

**Phone (Portrait):**
- Tables scroll horizontally
- Buttons stack vertically
- Filters collapse into dropdown

**Tablet (Landscape):**
- Full table view
- Side-by-side metrics
- Easy two-handed operation

**Best Practice:**
Use laptop/desktop for bulk operations, mobile for quick checks

---

## 🆘 Troubleshooting

### Auto-Confirmation Not Working

**Check:**
1. Is item published? (Properties/Tours/Transport)
2. Is package approved? (Tour Packages)
3. Are dates conflicting? (Properties)
4. Database connectivity (contact tech support)

### Payment Button Missing

**Reasons:**
- Booking not confirmed yet (confirm first)
- Payment already marked as paid
- Status is "cancelled" or "completed"

### Can't Confirm Booking

**Possible Issues:**
- Insufficient permissions (contact admin)
- Booking already confirmed
- Network connectivity
- Database error (check console logs)

---

## 📈 Best Practices

### Operations Team

✅ **Do:**
- Check pending bookings daily (morning routine)
- Prioritize bookings with check-in < 7 days
- Add notes for special requests
- Communicate with Financial team on payment issues

❌ **Don't:**
- Manually confirm without verifying availability
- Ignore pending bookings for >24 hours
- Confirm bookings with unpaid status (coordinate with Finance)

### Financial Team

✅ **Do:**
- Request payment within 24h of confirmation
- Verify actual payment before marking "Paid"
- Send reminders every 3 days for pending payments
- Export weekly reports for accounting

❌ **Don't:**
- Mark as paid without verification
- Send payment requests to cancelled bookings
- Skip payment request (assume guest will pay)

---

## 🔐 Security Notes

**Permissions:**
- Only staff members can access dashboards
- All actions are logged
- Can't delete bookings (only cancel)
- Payment status changes require staff role

**Data Privacy:**
- Guest information is confidential
- Don't share booking details publicly
- Use secure channels for guest communication

---

## 📞 Support

**Technical Issues:**
- Email: tech@merry360x.com
- Slack: #tech-support

**Policy Questions:**
- Email: operations@merry360x.com
- Slack: #operations

**Training:**
- New staff onboarding: Thursdays 10 AM
- Monthly refresher: First Monday of month

---

**Version:** 1.0.0  
**Last Updated:** January 27, 2026  
**Next Review:** March 1, 2026
