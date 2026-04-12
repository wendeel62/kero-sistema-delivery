-- 1. Add super_admin role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- 2. Add tenant_id to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id);

-- 3. Adjust constraints: A user can reach multiple tenants with different roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_tenant_role_unique UNIQUE(user_id, tenant_id);

-- 4. Update RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Policy: Users can see their own roles in specific tenant contexts
CREATE POLICY "Users view own roles" 
    ON public.user_roles FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Tenant Admins can view roles for their tenant staff
CREATE POLICY "Tenant Admins view staff" 
    ON public.user_roles FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin' AND tenant_id = public.user_roles.tenant_id
        )
    );

-- Policy: Super Admins can do everything
CREATE POLICY "Super Admins view all" 
    ON public.user_roles FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- 5. Update helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(t_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'super_admin') AND (tenant_id = t_id OR role = 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to handle new user role (automatic admin of their own tenant)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Initial user is admin of their own tenant_id
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.id, NEW.id, 'admin');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
