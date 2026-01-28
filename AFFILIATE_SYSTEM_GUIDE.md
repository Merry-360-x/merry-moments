# Affiliate Marketing System Setup Guide

## Overview
The affiliate marketing system allows users to earn 20% commission on Merry360x's 10% platform fee for the first 5 bookings made through each operator they refer.

### Commission Structure
- **Platform Commission**: 10% of booking value
- **Affiliate Commission**: 20% of platform commission
- **Earnings Per Booking**: 20% × 10% = 2% of booking value
- **Limit**: First 5 bookings per referred operator

### Example Earnings
```
Booking Value: 1,000,000 RWF
Platform Commission (10%): 100,000 RWF
Affiliate Earns (20%): 20,000 RWF

Per Operator (5 bookings): 100,000 RWF
10 Operators: 1,000,000 RWF
```

## Database Setup

### Step 1: Apply Migration
Go to your Supabase Dashboard → SQL Editor and run the migration file:
`supabase/migrations/20260128000000_create_affiliate_system.sql`

This creates:
1. **affiliates** table - Affiliate accounts with codes and earnings
2. **affiliate_referrals** table - Tracks referred operators
3. **affiliate_commissions** table - Individual commission records
4. **affiliate_payouts** table - Payout requests and payments

### Step 2: Automatic Commission Tracking
The system automatically tracks commissions via a database trigger:
- Triggered when booking status changes to 'confirmed' or 'completed'
- Checks if the host was referred by an affiliate
- Only processes first 5 bookings per referral
- Calculates and records commission automatically

## How to Use

### For Affiliates
1. Visit `/affiliate` to create affiliate account
2. Get unique referral link (e.g., `merry360x.com/host-signup?ref=ABC12345`)
3. Share link with tour operators
4. Track earnings in dashboard
5. Request payouts when threshold is met

### For Operators (Hosts)
1. Register via affiliate link with `?ref=CODE` parameter
2. Get approved as host
3. Start receiving bookings
4. Affiliate earns on first 5 bookings automatically

### For Admin/Finance Staff
- View all affiliates and payouts in admin dashboard
- Approve/process payout requests
- Monitor referral performance
- Track commission calculations

## Features

### Affiliate Portal (`/affiliate`)
- Dashboard with earnings overview
- Total, pending, and paid earnings
- Referral tracking (active/completed status)
- Commission history
- Shareable affiliate links
- Payout request system

### Automatic Tracking
- Referral recorded when operator signs up with affiliate code
- Commission calculated on each booking automatically
- Status updates (active → completed after 5 bookings)
- Duplicate prevention (one commission per booking)

### Security & Permissions
- Row Level Security (RLS) enabled on all tables
- Affiliates can only view their own data
- Staff can view all affiliate data
- Only finance staff can process payouts

## Database Schema

### affiliates
- id, user_id, affiliate_code (unique 8-char code)
- total_earnings, pending_earnings, paid_earnings
- status (active/suspended/banned)

### affiliate_referrals
- id, affiliate_id, referred_user_id (the operator)
- bookings_count (0-5)
- total_commission_earned
- status (active/completed/inactive)

### affiliate_commissions
- id, affiliate_id, referral_id, booking_id
- booking_value, platform_commission, affiliate_commission
- commission_rate (default 20%)
- status (pending/approved/paid/cancelled)

### affiliate_payouts
- id, affiliate_id, amount, currency
- payment_method, payment_details
- status (pending/processing/completed/failed)

## Testing

### Test Scenario
1. Create affiliate account → get code (e.g., TEST1234)
2. Register new operator with link: `/host-signup?ref=TEST1234`
3. Approve operator application
4. Create 5 test bookings for that operator
5. Verify commissions appear in affiliate dashboard
6. After 5th booking, referral status → "completed"
7. Additional bookings from same operator → no commission

## Configuration

### Platform Commission Rate
Default: 10% (configured in trigger function)
To change: Update `v_platform_commission_rate` in `track_affiliate_commission()`

### Affiliate Commission Rate
Default: 20% of platform commission
To change: Update `v_affiliate_commission_rate` in trigger function

### Booking Limit
Default: 5 bookings per referral
To change: Update condition `ar.bookings_count < 5` in trigger

## Support

For questions or issues:
- Check Supabase logs for trigger errors
- Verify RLS policies if access issues
- Contact support@merry360x.com
