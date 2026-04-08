# 🔧 Meta de Faturamento - Instruções de Setup

## ⚠️ Próximo Passo Necessário

A implementação foi concluída **90%**. Falta apenas executar uma migration SQL no banco de dados Supabase para adicionar as colunas necessárias.

## 📋 O que Fazer

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acesse sua conta Supabase:**
   - Vá para https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New Query"**

3. **Cole o SQL abaixo e execute:**

```sql
-- Migration: Add tenant_id and metas_faturamento to configuracoes
-- Data: 2026-04-07

ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS metas_faturamento JSONB DEFAULT '{"dia": null, "semana": null, "mes": null}';

-- Criar índice para tenant_id para melhor performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_tenant_id ON configuracoes(tenant_id);

-- Atualizar RLS policy para usar tenant_id
DROP POLICY IF EXISTS "Config visível para todos" ON configuracoes;
DROP POLICY IF EXISTS "Config editavel por auth" ON configuracoes;

CREATE POLICY "Config visible to tenant" ON configuracoes FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Config editable by tenant" ON configuracoes FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Config insertable by auth" ON configuracoes FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Config deletable by tenant" ON configuracoes FOR DELETE USING (tenant_id = auth.uid());
```

4. **Clique em "Run"**
   - A query deve executar sem erros
   - Se aparecer "Success" no final, está pronto!

### Opção 2: Via CLI do Supabase

Se você tem `supabase-cli` instalado:

```bash
cd "c:\Users\usuario\Desktop\Nova pasta"
supabase db push
```

---

## ✅ Após Executar a Migration

A funcionalidade estará completamente operacional:
- ✓ O formulário de meta aceitará valores
- ✓ Ao clicar "Salvar", os dados serão persistidos no banco
- ✓ A barra de progresso no Topbar mostrará dados em tempo real
- ✓ Os cards Realizado/Meta/Falta animarão corretamente

---

## 🐛 Se der erro ao executar a Migration

Se receber erro de "policy" ou similar, tente executar apenas a parte de ALTER TABLE:

```sql
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS metas_faturamento JSONB DEFAULT '{"dia": null, "semana": null, "mes": null}';

CREATE INDEX IF NOT EXISTS idx_configuracoes_tenant_id ON configuracoes(tenant_id);
```

Depois, remova manualmente as policies antigas em **Auth > Policies** e execute o CREATE POLICY.

---

## 📁 Arquivos Criados/Modificados

### Novos:
- `src/contexts/MetaPeriodoContext.tsx` — Contexto de período compartilhado
- `src/hooks/useMetasFaturamento.ts` — Hook React Query para metas
- `supabase/migrations/20260407_add_metas_faturamento.sql` — Migration SQL
- `execute-migration.ps1` — Script auxiliar para executar migration

### Modificados:
- `src/App.tsx` — Envolveu rotas privadas com MetaPeriodoProvider
- `src/components/Topbar.tsx` — Adicionou barra de progresso e resumo financeiro
- `src/pages/FinanceiroPage.tsx` — Adicionou card "Meta de Faturamento" no topo

---

## 🔍 Verificação Rápida

Após executar a migration, teste:

1. Acesse `/financeiro`
2. Clique em "Hoje" (pill de período)
3. Na célula "Meta", clique em "Definir meta"
4. Digite um valor ex. `500`
5. Clique fora do input
6. Deve aparecer "Salvo ✓"
7. Recarregue a página (F5) — o valor deve persistir

Se tudo funcionar, está 100% pronto! 🚀
