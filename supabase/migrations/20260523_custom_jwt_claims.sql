-- Migracao: Criar hook de Custom JWT Claims para garantir tenant_id no JWT.
--
-- Este hook garante que TODO JWT emitido contenha a claim `tenant_id`
-- no nivel raiz do payload, permitindo que:
--   1. app.current_tenant_id() resolva via auth.jwt() ->> 'tenant_id' (step 1)
--   2. useTenantId() no frontend leia de user.user_metadata.tenant_id
--
-- IMPORTANTE: Apos aplicar esta migration, e necessario ativar o hook no
-- Supabase Dashboard: Authentication > Settings > JWT Hook > selecionar
-- "public.custom_jwt_claims" e salvar.

CREATE OR REPLACE FUNCTION public.custom_jwt_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  uid uuid;
BEGIN
  claims := event->'claims';

  uid := (event->>'user_id')::uuid;

  IF uid IS NOT NULL THEN
    claims := claims || jsonb_build_object(
      'tenant_id', (
        SELECT COALESCE(ur.tenant_id::text, uid::text)
        FROM public.user_roles ur
        WHERE ur.user_id = uid
        LIMIT 1
      )
    );
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$$;
