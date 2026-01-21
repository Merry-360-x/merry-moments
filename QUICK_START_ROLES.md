# Staff Role Assignment - Quick Start

## Interactive CLI Tool

Run this command to assign staff roles interactively:

```bash
# 1. Set your service role key (get from Supabase dashboard)
export SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# 2. Run the script
node assign-staff-role.mjs
```

## What It Does

1. **Lists all users** in your database
2. **Asks which user** you want to assign a role to
3. **Asks which staff role** to assign:
   - Financial Staff
   - Operations Staff  
   - Customer Support
   - All Staff Roles
4. **Assigns the role** automatically
5. **Shows confirmation** of what was assigned

## Example Session

```
🎯 Staff Role Assignment Tool

📋 Fetching users...

Available users:
────────────────────────────────────────────────────────────────────────────────
1. user1@example.com (ID: abc12345...)
2. user2@example.com (ID: def67890...)
3. admin@example.com (ID: ghi11121...)
────────────────────────────────────────────────────────────────────────────────

Enter user number: 1

✅ Selected: user1@example.com
📌 Current roles: None

🎭 Available Staff Roles:
1. Financial Staff (💵 Financial Dashboard)
2. Operations Staff (⚙️  Operations Dashboard)
3. Customer Support (💬 Support Dashboard)
4. All Staff Roles (Assign all three)

Select role to assign (1-4): 2

⏳ Assigning role(s)...

✅ Assigned: operations_staff

📌 Updated roles: operations_staff

✨ Done! User must sign out and back in to see the dashboard link.
```

## Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm/settings/api
2. Find "service_role" under "Project API keys"
3. Click "Reveal" and copy the key
4. **Keep it secret!** Don't commit it to Git

## Alternative: One-Line Assignment

If you prefer, you can also use the SQL method in `assign-staff-roles.sql`
