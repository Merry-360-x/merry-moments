# Staff Roles Documentation

This document outlines the three distinct staff roles in the Merry360x platform, their responsibilities, access permissions, and feature differentiation.

## Role Overview

The platform has **three specialized staff roles**, each with specific dashboards and capabilities:

1. **Financial Staff** - Revenue and payment management
2. **Operations Staff** - Content approval and operations management  
3. **Customer Support Staff** - User assistance and ticket management

---

## 1. Financial Staff Role

**Dashboard:** `FinancialStaffDashboard.tsx`

### Primary Responsibilities
- Monitor revenue and financial metrics across all currencies
- Track booking payments and status
- Generate financial reports
- View transaction history

### Key Features
- **Revenue Metrics**
  - Total revenue across all currencies
  - Revenue breakdown by currency
  - Paid vs pending payments tracking
  
- **Booking Financial Data**
  - View all bookings with payment status
  - Filter by payment status (paid, pending, cancelled)
  - Export financial data (CSV/PDF)
  
- **Access Level**
  - Read-only access to booking financial data
  - Cannot modify booking status
  - Cannot access user support tickets
  - Cannot approve/reject host applications

### Dashboard Sections
1. **Overview Tab**: Revenue cards, payment statistics
2. **Bookings Tab**: All bookings with financial details
3. **Revenue Tab**: Revenue breakdown by currency, payment methods

---

## 2. Operations Staff Role

**Dashboard:** `OperationsStaffDashboard.tsx`

### Primary Responsibilities
- Review and approve/reject host applications
- Manage property, tour, and transport listings
- Monitor content quality and compliance
- Oversee operational workflows

### Key Features
- **Host Application Management**
  - View pending host applications
  - Approve or reject applications
  - Add review notes for applicants
  - Track application status
  
- **Content Management**
  - Review properties before publishing
  - Review tour packages before publishing
  - Manage transport service listings
  - Toggle publish/unpublish status
  
- **Booking Operations**
  - View booking details
  - Monitor check-in/check-out dates
  - Track special requests
  
- **Access Level**
  - Full CRUD on host applications (approve, reject, notes)
  - Publish/unpublish content (properties, tours, transport)
  - Read access to bookings
  - Cannot access financial metrics
  - Cannot manage support tickets

### Dashboard Sections
1. **Overview Tab**: Application stats, content metrics
2. **Applications Tab**: Host application queue
3. **Accommodations Tab**: Property listings management
4. **Tours Tab**: Tour package management
5. **Transport Tab**: Transport service management
6. **Bookings Tab**: Operational booking overview

---

## 3. Customer Support Staff Role

**Dashboard:** `CustomerSupportDashboard.tsx`

### Primary Responsibilities
- Assist users with platform issues
- Manage support tickets and inquiries
- Monitor user accounts
- Provide customer service

### Key Features
- **User Management**
  - View all registered users
  - Search users by name/email
  - Monitor user registration trends
  - View user account details (read-only)
  
- **Support Ticket System**
  - View all support tickets
  - Filter by status (open, closed, pending)
  - Prioritize urgent tickets
  - Respond to user inquiries
  
- **Metrics Tracking**
  - Total users count
  - Open tickets count
  - High priority issues
  - New user registrations
  
- **Access Level**
  - Read access to user profiles
  - Full access to support tickets (create, update, resolve)
  - Cannot access financial data
  - Cannot approve/reject applications
  - Cannot publish/unpublish content

### Dashboard Sections
1. **Overview Tab**: User stats, ticket metrics
2. **Users Tab**: User directory with search
3. **Tickets Tab**: Support ticket queue (high priority, open, resolved)

---

## Access Control Matrix

| Feature | Financial | Operations | Customer Support |
|---------|-----------|------------|------------------|
| Revenue Metrics | ✅ Full | ❌ None | ❌ None |
| Payment Status | ✅ View | ❌ None | ❌ None |
| Host Applications | ❌ None | ✅ Approve/Reject | ❌ None |
| Content Publishing | ❌ None | ✅ Full | ❌ None |
| Booking Details | ✅ Financial Only | ✅ Operational | ❌ None |
| User Profiles | ❌ None | ❌ None | ✅ Read-Only |
| Support Tickets | ❌ None | ❌ None | ✅ Full |
| Financial Exports | ✅ Full | ❌ None | ❌ None |

---

## Role Assignment

Staff roles are assigned via the `profiles` table in Supabase:

```sql
-- Check user's staff role
SELECT user_role FROM profiles WHERE user_id = '<user_id>';

-- Possible values:
-- 'financial_staff'
-- 'operations_staff'
-- 'customer_support_staff'
-- 'admin' (has access to all dashboards)
```

### Assigning Roles

**Via Admin Dashboard:**
1. Navigate to Admin Dashboard → Users tab
2. Find the user
3. Update their `user_role` field
4. User will have access to their designated dashboard on next login

**Via SQL:**
```sql
UPDATE profiles 
SET user_role = 'financial_staff' 
WHERE user_id = '<user_id>';
```

---

## Dashboard URLs

- **Financial Staff**: `/financial-staff-dashboard`
- **Operations Staff**: `/operations-staff-dashboard`
- **Customer Support**: `/customer-support-dashboard`
- **Admin**: `/admin-dashboard` (all-access)

---

## Security & Privacy

### Data Isolation
- Each dashboard queries only data relevant to its role
- Financial staff cannot see support tickets
- Support staff cannot see financial data
- Operations staff focus on content approval only

### Row-Level Security (RLS)
All dashboards respect Supabase RLS policies ensuring:
- Staff can only access data within their role scope
- Sensitive financial data is protected
- User privacy is maintained

### Audit Trail
All staff actions should be logged:
- Host application approvals/rejections
- Content publishing changes
- Support ticket responses
- (Future enhancement: Activity logs table)

---

## Best Practices

### For Financial Staff
- Review payment anomalies daily
- Generate monthly revenue reports
- Monitor currency exchange impacts
- Flag suspicious transactions

### For Operations Staff
- Process host applications within 1-3 business days
- Review content for quality and compliance
- Maintain consistent approval standards
- Document rejection reasons clearly

### For Customer Support
- Respond to high-priority tickets within 2 hours
- Escalate technical issues to operations/admin
- Maintain professional communication
- Document common issues for knowledge base

---

## Future Enhancements

### Planned Features
1. **Role-based notifications** (email alerts for new tickets, pending applications)
2. **Activity logging** (track all staff actions)
3. **Performance metrics** (ticket resolution time, approval rates)
4. **Collaborative tools** (inter-role communication, case escalation)
5. **Advanced reporting** (custom date ranges, export formats)
6. **Bulk operations** (approve multiple applications, batch ticket responses)

### Role Expansion
Consider adding specialized roles:
- **Marketing Staff**: Campaign management, analytics
- **Content Moderator**: Review user-generated content (stories, reviews)
- **Quality Assurance**: Test new features, bug reporting

---

## Troubleshooting

### User can't access dashboard
1. Verify `user_role` in profiles table
2. Check authentication status
3. Ensure user has completed profile setup
4. Clear browser cache/cookies

### Missing data in dashboard
1. Check RLS policies are correctly configured
2. Verify database permissions
3. Check query filters (date ranges, status filters)
4. Review browser console for errors

### Permission errors
1. Confirm user role matches dashboard URL
2. Verify Supabase policies allow read/write
3. Check if user's session is valid
4. Re-authenticate if necessary

---

## Contact & Support

For issues related to staff dashboards or role management:
- **Technical Issues**: Contact system admin
- **Access Problems**: Submit ticket to customer support
- **Feature Requests**: Email product team

---

*Last Updated: January 2025*
*Platform Version: Production (merry360x.com)*
