-- =============================================
-- MIGRATION: 20260412_fix_mensagens_whatsapp.sql
-- Corrige schema da tabela mensagens_whatsapp
-- =============================================

-- 0. Criar tabela de configuração do WhatsApp (mapeia instance -> tenant_id)
CREATE TABLE IF NOT EXISTS public.configuracoes_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES auth.users(id) NOT NULL,
  instance_name text NOT NULL,
  phone_number text,
  status text DEFAULT 'disconnected',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, instance_name)
);

-- RLS para configuracoes_whatsapp
ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_whatsapp_tenant_select" ON public.configuracoes_whatsapp;
CREATE POLICY "config_whatsapp_tenant_select" ON public.configuracoes_whatsapp
FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

DROP POLICY IF EXISTS "config_whatsapp_tenant_insert" ON public.configuracoes_whatsapp;
CREATE POLICY "config_whatsapp_tenant_insert" ON public.configuracoes_whatsapp
FOR INSERT TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

DROP POLICY IF EXISTS "config_whatsapp_tenant_update" ON public.configuracoes_whatsapp;
CREATE POLICY "config_whatsapp_tenant_update" ON public.configuracoes_whatsapp
FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1));

-- 1. Adicionar campos que faltam (sem alterar os existentes)
ALTER TABLE mensagens_whatsapp 
ADD COLUMN IF NOT EXISTS mensagem text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2. Migra dados de 'conteudo' para 'mensagem' se mensagem ainda for null
UPDATE mensagens_whatsapp 
SET mensagem = conteudo 
WHERE mensagem IS NULL AND conteudo IS NOT NULL;

-- 3. Corrigir o CHECK da coluna direção para usar 'entrada'/'saida'
-- Primeiro, atualizar os valores existentes
UPDATE mensagens_whatsapp 
SET direcao = 'entrada' 
WHERE direcao = 'recebida';

UPDATE mensagens_whatsapp 
SET direcao = 'saida' 
WHERE direcao = 'enviada';

-- Recriar o check constraint
ALTER TABLE mensagens_whatsapp 
DROP CONSTRAINT IF EXISTS mensagens_whatsapp_direcao_check;

ALTER TABLE mensagens_whatsapp 
ADD CONSTRAINT mensagens_whatsapp_direcao_check 
CHECK (direcao IN ('entrada', 'saida'));

-- 4. Criar índice composto otimizado para consultas de conversas
DROP INDEX IF EXISTS idx_mensagens_tenant_telefone_created;
CREATE INDEX idx_mensagens_tenant_telefone_created 
ON mensagens_whatsapp(tenant_id, contato_telefone, created_at DESC);

-- 5. Garantir que created_at existe e tem valor default
ALTER TABLE mensagens_whatsapp 
ALTER COLUMN created_at SET DEFAULT now();

-- 6. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp;

-- 7. Atualizar políticas RLS para usar tenant_id de user_roles
-- Função para obter o tenant_id do usuário atual via user_roles
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  tenant_uuid uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Busca o tenant_id do usuário em user_roles
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_roles
  WHERE user_id = current_user_id
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$;

-- Política de SELECT - filtra por tenant_id do usuário em user_roles
DROP POLICY IF EXISTS "Users can manage suas mensagens" ON mensagens_whatsapp;
DROP POLICY IF EXISTS "mensagens_whatsapp_tenant_select" ON mensagens_whatsapp;

CREATE POLICY "mensagens_whatsapp_tenant_select" ON mensagens_whatsapp
FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant_id());

-- Política de UPDATE
DROP POLICY IF EXISTS "mensagens_whatsapp_tenant_update" ON mensagens_whatsapp;

CREATE POLICY "mensagens_whatsapp_tenant_update" ON mensagens_whatsapp
FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Política de INSERT
DROP POLICY IF EXISTS "mensagens_whatsapp_tenant_insert" ON mensagens_whatsapp;

CREATE POLICY "mensagens_whatsapp_tenant_insert" ON mensagens_whatsapp
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Política de DELETE
DROP POLICY IF EXISTS "mensagens_whatsapp_tenant_delete" ON mensagens_whatsapp;

CREATE POLICY "mensagens_whatsapp_tenant_delete" ON mensagens_whatsapp
FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant_id());