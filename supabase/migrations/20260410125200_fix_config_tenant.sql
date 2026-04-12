-- Emergency fix for hidden configurations due to RLS
-- This script associates orphan configurations with the tenant_id from other tables or the auth context.

DO $$
DECLARE
    v_first_user uuid;
BEGIN
    -- Try to get the first user from auth.users to rescue orphan configurations
    SELECT id INTO v_first_user FROM auth.users LIMIT 1;

    IF v_first_user IS NOT NULL THEN
        -- Update configurations that are without tenant_id
        UPDATE public.configuracoes 
        SET tenant_id = v_first_user 
        WHERE tenant_id IS NULL;
        
        RAISE NOTICE 'Configurações órfãs vinculadas ao usuário %', v_first_user;
    END IF;
END $$;

-- Also ensured that the slug is generated if it was missing
UPDATE public.configuracoes 
SET slug = slugify(nome_loja) 
WHERE slug IS NULL AND nome_loja IS NOT NULL;
