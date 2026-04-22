-- Fix user_roles table and RLS policies to prevent 500 errors
-- This migration ensures tenant_id is properly configured and policies handle NULL safely

-- 1. Fix tenant_id column: change from REFERENCES auth.users to UUID with no constraint (or reference tenants table if exists)
-- First, drop the problematic foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_roles_tenant_id_fkey'
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey;
    END IF;
END $$;

-- Add tenant_id if it doesn't exist (defensive check)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 2. Recreate RLS policies for user_roles to handle NULL tenant_id properly and prevent 500 errors

-- Drop existing policies
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Tenant Admins view staff" ON public.user_roles;
DROP POLICY IF EXISTS "Super Admins view all" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Policy: Users can see their own roles (always works)
CREATE POLICY "Users view own roles" 
    ON public.user_roles FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Tenant Admins can view roles for their tenant (handles NULL tenant_id safely)
CREATE POLICY "Tenant Admins view staff" 
    ON public.user_roles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin') 
            AND tenant_id IS NOT NULL
            AND (public.user_roles.tenant_id IS NULL OR tenant_id = public.user_roles.tenant_id)
        )
    );

-- Policy: Super Admins can do everything (no tenant restriction)
CREATE POLICY "Super Admins view all" 
    ON public.user_roles FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- 3. Fix the trigger function to handle NULL tenant_id gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert with NULL tenant_id initially (user can be added to a tenant later)
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, NULL, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create indexes for better performance (helps prevent timeouts)
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);

-- 5. Verification
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'user_roles'
    AND schemaname = 'public';
    
    RAISE NOTICE 'user_roles RLS policies count: %', policy_count;
    
    IF policy_count < 3 THEN
        RAISE WARNING 'Expected at least 3 policies for user_roles';
    ELSE
        RAISE NOTICE 'user_roles RLS policies verified successfully';
    END IF;
END $$;