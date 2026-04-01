-- =============================================
-- TABELA: mensagens_whatsapp
-- Execute no Supabase SQL Editor
-- =============================================

-- 1. CRIAR TABELA
CREATE TABLE mensagens_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES auth.users(id) NOT NULL,
  contato_telefone text NOT NULL,
  contato_nome text,
  direcao text NOT NULL CHECK (direcao IN ('recebida', 'enviada')),
  conteudo text NOT NULL,
  midia_url text,
  midia_tipo text,
  twilio_message_sid text UNIQUE,
  pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  lida boolean DEFAULT false,
  agente_respondeu boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. ÍNDICES
CREATE INDEX idx_mensagens_tenant ON mensagens_whatsapp(tenant_id);
CREATE INDEX idx_mensagens_telefone ON mensagens_whatsapp(contato_telefone);
CREATE INDEX idx_mensagens_created ON mensagens_whatsapp(created_at DESC);

-- 3. RLS
ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage suas mensagens" ON mensagens_whatsapp;
CREATE POLICY "mensagens_whatsapp_tenant_select" ON mensagens_whatsapp
FOR SELECT TO authenticated
USING (tenant_id = auth.uid());

CREATE POLICY "mensagens_whatsapp_tenant_insert" ON mensagens_whatsapp
FOR INSERT TO authenticated
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "mensagens_whatsapp_tenant_update" ON mensagens_whatsapp
FOR UPDATE TO authenticated
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "mensagens_whatsapp_tenant_delete" ON mensagens_whatsapp
FOR DELETE TO authenticated
USING (tenant_id = auth.uid());

-- 4. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp;
