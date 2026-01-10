-- Add staff role and host application flow
+
+-- Extend enum (safe if already applied)
+ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
+
+-- Host applications table
+CREATE TABLE IF NOT EXISTS public.host_applications (
+  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
+  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
+  status TEXT NOT NULL DEFAULT 'pending',
+  full_name TEXT,
+  phone TEXT,
+  business_name TEXT,
+  hosting_location TEXT,
+  about TEXT,
+  review_notes TEXT,
+  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
+  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
+  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
+);
+
+CREATE INDEX IF NOT EXISTS host_applications_user_id_idx ON public.host_applications(user_id);
+CREATE INDEX IF NOT EXISTS host_applications_status_idx ON public.host_applications(status);
+
+ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;
+
+-- Policies: applicants
+CREATE POLICY IF NOT EXISTS "Users can view own host applications"
+  ON public.host_applications FOR SELECT
+  USING (auth.uid() = user_id);
+
+CREATE POLICY IF NOT EXISTS "Users can insert own host applications"
+  ON public.host_applications FOR INSERT
+  WITH CHECK (auth.uid() = user_id);
+
+CREATE POLICY IF NOT EXISTS "Users can update own pending host applications"
+  ON public.host_applications FOR UPDATE
+  USING (auth.uid() = user_id AND status = 'pending');
+
+-- Policies: staff/admin reviewers
+CREATE POLICY IF NOT EXISTS "Staff and admins can view all host applications"
+  ON public.host_applications FOR SELECT
+  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
+
+CREATE POLICY IF NOT EXISTS "Staff and admins can update host applications"
+  ON public.host_applications FOR UPDATE
+  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
+
+-- Allow staff/admin to grant roles
+CREATE POLICY IF NOT EXISTS "Staff and admins can insert roles"
+  ON public.user_roles FOR INSERT
+  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
+
+-- updated_at trigger
+DO $$
+BEGIN
+  IF NOT EXISTS (
+    SELECT 1
+    FROM pg_trigger
+    WHERE tgname = 'update_host_applications_updated_at'
+  ) THEN
+    CREATE TRIGGER update_host_applications_updated_at
+      BEFORE UPDATE ON public.host_applications
+      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
+  END IF;
+END$$;
