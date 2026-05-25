-- Migracao: Criar tabelas faltantes referenciadas pelo admin-dashboard-data
--
-- A edge function admin-dashboard-data referencia as tabelas ai_usage_logs
-- e error_logs que nao existiam em nenhuma migration, causando warnings
-- no log da funcao.

-- ============================================================================
-- 1. ai_usage_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant ON public.ai_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs(created_at);

DROP POLICY IF EXISTS ai_usage_logs_tenant_select ON public.ai_usage_logs;
CREATE POLICY ai_usage_logs_tenant_select ON public.ai_usage_logs
    FOR SELECT TO authenticated
    USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- 2. error_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON public.error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON public.error_logs(created_at);

DROP POLICY IF EXISTS error_logs_tenant_select ON public.error_logs;
CREATE POLICY error_logs_tenant_select ON public.error_logs
    FOR SELECT TO authenticated
    USING (tenant_id = app.current_tenant_id());
