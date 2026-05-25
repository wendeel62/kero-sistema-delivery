-- Migration: Fix vault table to store encrypted values
-- Date: 2026-05-21
-- Issue: vault.key_value was stored as plain TEXT (no encryption)
-- Fix: Migrate to encrypted BYTEA column using pgp_sym_encrypt

-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted column
ALTER TABLE public.vault
  ADD COLUMN IF NOT EXISTS key_value_encrypted BYTEA;

-- Add metadata columns for key management
ALTER TABLE public.vault
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create function to migrate existing plain-text values to encrypted
-- WARNING: This uses a hardcoded key for migration only. 
-- In production, use an application-level key from environment variables.
DO $$
DECLARE
  migration_key TEXT := current_setting('app.encryption_key', true);
  rec RECORD;
BEGIN
  IF migration_key IS NULL OR migration_key = '' THEN
    migration_key := 'CHANGE_ME_IN_PRODUCTION_' || md5(now()::text);
    RAISE WARNING 'app.encryption_key not set. Using generated key: %. Set it before running this migration in production.', migration_key;
  END IF;

  FOR rec IN SELECT id, key_value FROM public.vault WHERE key_value IS NOT NULL AND key_value != '' AND key_value_encrypted IS NULL LOOP
    UPDATE public.vault
    SET key_value_encrypted = pgp_sym_encrypt(rec.key_value, migration_key)
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Drop the plain-text column after migration
ALTER TABLE public.vault DROP COLUMN IF EXISTS key_value;

-- Rename encrypted column to key_value for API compatibility
ALTER TABLE public.vault RENAME COLUMN key_value_encrypted TO key_value;

-- Create helper view to decrypt values (only accessible with proper key)
CREATE OR REPLACE FUNCTION public.vault_get_value(vault_id UUID, encryption_key TEXT)
RETURNS TEXT AS $$
DECLARE
  encrypted_val BYTEA;
  decrypted_val TEXT;
BEGIN
  SELECT v.key_value INTO encrypted_val
  FROM public.vault v
  WHERE v.id = vault_id;

  IF encrypted_val IS NULL THEN
    RETURN NULL;
  END IF;

  decrypted_val := pgp_sym_decrypt(encrypted_val, encryption_key);
  RETURN decrypted_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to store encrypted values
CREATE OR REPLACE FUNCTION public.vault_set_value(
  p_tenant_id UUID,
  p_key_name TEXT,
  p_key_value TEXT,
  p_description TEXT,
  encryption_key TEXT
)
RETURNS UUID AS $$
DECLARE
  existing_id UUID;
  new_id UUID;
BEGIN
  SELECT v.id INTO existing_id
  FROM public.vault v
  WHERE v.key_name = p_key_name AND v.tenant_id = p_tenant_id;

  IF existing_id IS NOT NULL THEN
    UPDATE public.vault
    SET key_value = pgp_sym_encrypt(p_key_value, encryption_key),
        description = p_description,
        updated_at = now()
    WHERE id = existing_id;
    RETURN existing_id;
  ELSE
    INSERT INTO public.vault (tenant_id, key_name, key_value, description)
    VALUES (p_tenant_id, p_key_name, pgp_sym_encrypt(p_key_value, encryption_key), p_description)
    RETURNING id INTO new_id;
    RETURN new_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS for tenant isolation on vault
ALTER TABLE public.vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_tenant_select" ON public.vault;
CREATE POLICY "vault_tenant_select" ON public.vault
  FOR SELECT USING (tenant_id = auth.jwt()->>'tenant_id' OR tenant_id = auth.uid());

DROP POLICY IF EXISTS "vault_tenant_insert" ON public.vault;
CREATE POLICY "vault_tenant_insert" ON public.vault
  FOR INSERT WITH CHECK (tenant_id = auth.jwt()->>'tenant_id' OR tenant_id = auth.uid());

DROP POLICY IF EXISTS "vault_tenant_update" ON public.vault;
CREATE POLICY "vault_tenant_update" ON public.vault
  FOR UPDATE USING (tenant_id = auth.jwt()->>'tenant_id' OR tenant_id = auth.uid());

DROP POLICY IF EXISTS "vault_tenant_delete" ON public.vault;
CREATE POLICY "vault_tenant_delete" ON public.vault
  FOR DELETE USING (tenant_id = auth.jwt()->>'tenant_id' OR tenant_id = auth.uid());

-- Add index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_vault_tenant_id ON public.vault(tenant_id);
