-- Migration: Add tenant_id and RLS to historico_agente
-- Fixes security issue: historico_agente table had no tenant isolation

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Create table if not exists (for projects that don't have it yet)
CREATE TABLE IF NOT EXISTS public.historico_agente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid DEFAULT auth.uid(),
  tipo text NOT NULL,
  descricao text,
  executado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add tenant_id column if table exists but column doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_agente'
  ) THEN
    ALTER TABLE public.historico_agente ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT auth.uid();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Table historico_agente does not exist yet - it will be created';
END $$;

-- Enable RLS
ALTER TABLE public.historico_agente ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_historico_agente_tenant_id ON public.historico_agente(tenant_id);

-- Drop existing policies if any (cleanup)
DROP POLICY IF EXISTS "historico_agente_tenant_select" ON public.historico_agente;
DROP POLICY IF EXISTS "historico_agente_tenant_insert" ON public.historico_agente;
DROP POLICY IF EXISTS "historico_agente_tenant_update" ON public.historico_agente;
DROP POLICY IF EXISTS "historico_agente_tenant_delete" ON public.historico_agente;

-- Create RLS policies for tenant isolation
CREATE POLICY "historico_agente_tenant_select" ON public.historico_agente
    FOR SELECT TO authenticated USING (tenant_id = app.current_tenant_id());

CREATE POLICY "historico_agente_tenant_insert" ON public.historico_agente
    FOR INSERT TO authenticated WITH CHECK (tenant_id = app.current_tenant_id());

CREATE POLICY "historico_agente_tenant_update" ON public.historico_agente
    FOR UPDATE TO authenticated USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

CREATE POLICY "historico_agente_tenant_delete" ON public.historico_agente
    FOR DELETE TO authenticated USING (tenant_id = app.current_tenant_id());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_agente TO authenticated;