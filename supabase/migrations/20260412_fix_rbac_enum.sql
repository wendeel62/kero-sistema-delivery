-- Fix RBAC enum: add missing roles to user_role enum
DO $$ 
BEGIN 
    ALTER TYPE user_role ADD VALUE 'super_admin'; 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN 
    ALTER TYPE user_role ADD VALUE 'consultor'; 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN 
    ALTER TYPE user_role ADD VALUE 'motoboy'; 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN 
    ALTER TYPE user_role ADD VALUE 'cozinha'; 
EXCEPTION 
    WHEN duplicate_object THEN NULL; 
END $$;
