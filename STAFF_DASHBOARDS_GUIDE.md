# Staff Dashboard Separation Guide

## Overview

Your staff dashboard has been separated into three specialized dashboards based on role:

1. **Financial Staff Dashboard** (`/financial-dashboard`)
   - Revenue metrics
   - Bookings and payments
   - Financial data only

2. **Operations Staff Dashboard** (`/operations-dashboard`)
   - Host applications management
   - Approve/reject applications
   - Property, tour, and transport listings management
   - Onboarding oversight

3. **Customer Support Dashboard** (`/support-dashboard`)
   - User management and search
   - Support ticket system (ready for tickets table)
   - Customer queries and issues

## Assigning Staff Roles

To assign a user to one of the new staff roles, you need to add a row to the `user_roles` table in Supabase.

### Step 1: Get the User ID

First, find the user's ID from the Supabase Auth dashboard or the `profiles` table.

### Step 2: Assign the Role

Run one of the following SQL commands in the Supabase SQL Editor:

#### Financial Staff
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('user-uuid-here', 'financial_staff');
```

#### Operations Staff
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('user-uuid-here', 'operations_staff');
```

#### Customer Support
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('user-uuid-here', 'customer_support');
```

### Step 3: User Logs In

Once the role is assigned, the user needs to:
1. Sign out and sign back in (or refresh the page)
2. Navigate to their dashboard from the user menu

The appropriate dashboard link will automatically appear in their dropdown menu.

## Dashboard Features

### Financial Dashboard
- **Metrics Cards**: Total revenue, total bookings, paid bookings, pending payments
- **Overview Tab**: Recent paid bookings and pending payments tables
- **Bookings Tab**: Complete booking history with status, amount, and currency
- **Revenue Tab**: Revenue breakdown by currency

### Operations Dashboard
- **Metrics Cards**: Pending applications, active properties, active tours, transport listings
- **Overview Tab**: Pending applications with approve/reject actions
- **Applications Tab**: Complete application history with management actions
- **Accommodations Tab**: All property listings with status
- **Tours Tab**: All tour packages with approval status
- **Transport Tab**: All transport options with status

### Customer Support Dashboard
- **Metrics Cards**: Total users, open tickets, high priority tickets, new users this week
- **Overview Tab**: Recent users and open support tickets
- **Users Tab**: Searchable user list with name and email filtering
- **Tickets Tab**: Support ticket system (placeholder - needs support_tickets table)

## Support Tickets Table (Optional)

To enable the support ticket system, create a `support_tickets` table:

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Support staff can view all tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('customer_support', 'admin')
    )
  );

CREATE POLICY "Support staff can update tickets"
  ON support_tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('customer_support', 'admin')
    )
  );
```

## Admin Access

Users with the `admin` role can access ALL dashboards:
- Original staff dashboard (`/staff`)
- Financial dashboard (`/financial-dashboard`)
- Operations dashboard (`/operations-dashboard`)
- Support dashboard (`/support-dashboard`)
- Admin dashboard (`/admin`)

## Role Combinations

A user can have multiple roles. For example:
```sql
-- User with both operations and customer support roles
INSERT INTO user_roles (user_id, role) VALUES ('uuid', 'operations_staff');
INSERT INTO user_roles (user_id, role) VALUES ('uuid', 'customer_support');
```

Both dashboard links will appear in their menu.

## Navigation

Staff members will see their dashboard link in:
1. **Desktop**: User dropdown menu (top right)
2. **Mobile**: Mobile menu (hamburger icon)

The link text will be:
- "Financial Dashboard" for financial staff
- "Operations Dashboard" for operations staff  
- "Support Dashboard" for customer support

## Deployment Status

✅ All dashboards deployed to production: https://merry360x.com
✅ Database migration applied
✅ Roles system configured
✅ Navigation updated

Ready to use!
