-- Create user_profiles to track security metadata
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_password_change TIMESTAMPTZ DEFAULT now() NOT NULL,
    password_rotation_days INTEGER DEFAULT 90 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

-- Trigger to create profile and role on signup (updating previous trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Profile
    INSERT INTO public.user_profiles (id, last_password_change)
    VALUES (NEW.id, now())
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- Function to check if password needs rotation
CREATE OR REPLACE FUNCTION public.needs_password_rotation(u_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_change TIMESTAMPTZ;
    rotation_period INTEGER;
BEGIN
    SELECT last_password_change, password_rotation_days INTO last_change, rotation_period
    FROM public.user_profiles
    WHERE id = u_id;
    
    RETURN (now() > last_change + (rotation_period || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
