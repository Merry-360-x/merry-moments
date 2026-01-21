# Quick Staff Role Assignment Guide

## 🚀 How to Assign Staff Roles Using Supabase

### Method 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/sql/new
   - Or navigate to: Your Project → SQL Editor → New Query

2. **Copy and paste** the contents of `assign-staff-roles.sql`

3. **Run the queries step by step:**
   - First: Run the SELECT query to see all users
   - Copy the `id` of the user you want to assign roles to
   - Replace `'USER_ID_HERE'` with the actual user ID
   - Run the INSERT statement for the role you want

4. **User must sign out and back in** to see the dashboard link

### Method 2: Using psql (Command Line)

If you have the database password:

```bash
# Get password from Supabase Dashboard: Settings → Database → Connection string
export PGPASSWORD='your-database-password'

psql -h db.uwgiostcetoxotfnulfm.supabase.co \
     -U postgres \
     -d postgres \
     -c "SELECT id, email FROM auth.users;"
```

### Quick Example

```sql
-- 1. Find your user
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- 2. Copy the id and assign role (replace the UUID)
INSERT INTO user_roles (user_id, role) 
VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'financial_staff');

-- 3. Verify
SELECT u.email, ur.role 
FROM user_roles ur 
JOIN auth.users u ON u.id = ur.user_id 
WHERE u.email = 'your@email.com';
```

### What Happens Next

After assigning a role:
1. User signs out
2. User signs back in
3. Click avatar (top right)
4. Dashboard link appears! 🎉

### Available Roles

- `financial_staff` → Financial Dashboard (💵)
- `operations_staff` → Operations Dashboard (⚙️)
- `customer_support` → Support Dashboard (💬)
- `admin` → All dashboards (🛡️)

---

**The SQL file `assign-staff-roles.sql` is ready to use in Supabase SQL Editor!**
