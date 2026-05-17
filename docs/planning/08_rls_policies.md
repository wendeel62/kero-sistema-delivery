# 08 - Verificação e Correção de RLS Policies

## Descrição do Problema

**Do Relatório de Auditoria:**
> As políticas de Row Level Security (RLS) não estão corretamente configuradas ou estão desatualizadas. Algumas tabelas não possuem policies, outras têm policies muito permissivas, e há inconsistências entre as políticas e a aplicação.

**Especificações Técnicas:**
- Algumas tabelas não têm RLS habilitado
- Policies permitem SELECT sem verificação de tenant
- INSERT/UPDATE não validam ownership
- DELETE permite exclusão sem verificação
- Policies não cobrem todas as operações

**Tabelas Afetadas:**
- Tabelas recently criadas podem não ter RLS
- Tabelas com dados sensíveis podem ter políticas fracas

---

## Impacto

### Por Que é Importante Corrigir

1. **Segurança**: RLS é última linha de defesa
2. **Compliance**: Necessário para LGPD/GDPR
3. **Defesa em profundidade**: Camada extra de proteção

### Risco se Não Corrigido

- **Severidade**: HIGH
- **Probabilidade**: Média
- **Impacto**: Acesso não autorizado a dados

---

## Arquivos Afetados

### Configuração de Banco

1. **Migrações**:
   - `supabase/migrations/*.sql`
   - Policies em `supabase/functions/`

2. **Tabelas**:
   - Todas as tabelas do schema public

---

## Solução Técnica

### Etapa 1: Listar Tabelas e Policies Atuais

```bash
# Listar todas as tabelas
supabase postgres query -c "
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY tablename;
"

# Listar policies atuais
supabase postgres query -c "
  SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
"
```

### Etapa 2: Habilitar RLS em Todas as Tabelas

```sql
-- migrations/xxx_enable_rls_all_tables.sql

-- Habilitar RLS em todas as tabelas que não têm
ALTER TABLE public.agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
-- ... todas as tabelas
```

### Etapa 3: Criar Policies Adequadas

```sql
-- migrations/xxx_rls_policies.sql

-- Agentes: apenas usuários do mesmo tenant
CREATE POLICY "Agentes podem ver próprios dados" ON public.agentes
  FOR SELECT
  USING (tenant_id = (
    SELECT tenant_id FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Agentes podem inserir próprios dados" ON public.agentes
  FOR INSERT
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Agentes podem atualizar próprios dados" ON public.agentes
  FOR UPDATE
  USING (tenant_id = (
    SELECT tenant_id FROM auth.users WHERE id = auth.uid()
  ))
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Agentes podem deletar próprios dados" ON public.agentes
  FOR DELETE
  USING (tenant_id = (
    SELECT tenant_id FROM auth.users WHERE id = auth.uid()
  ));
```

### Etapa 4: Policies para Admin

```sql
-- Políticas administrativas
CREATE POLICY "Admin pode ver todos os agentes" ON public.agentes
  FOR SELECT
  TO admin, super_admin
  USING (
    tenant_id IN (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Super admin pode fazer tudo" ON public.agentes
  FOR ALL
  TO super_admin
  USING (true)
  WITH CHECK (true);
```

### Etapa 5: Políticas para Operations Específicas

```sql
-- Políticas para métricas (podem ser mais flexíveis)
CREATE POLICY "Métricas visíveis para todos do tenant" ON public.metricas
  FOR SELECT
  USING (tenant_id = (
    SELECT tenant_id FROM auth.users WHERE id = auth.uid()
  ));

-- Políticas mais restritivas para dados sensíveis
CREATE POLICY "Apenas admins veem Billing" ON public.faturamento
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
    AND role IN ('admin', 'super_admin')
  );
```

### Etapa 6: Verificar e Testar

```bash
# Verificar se RLS está ativo
supabase postgres query -c "
  SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' AND rowsecurity = true;
"

# Testar política (como usuário não-auth)
psql "postgresql://anon:anon@project.supabase.co" -c "
  SELECT * FROM public.agentes;
  -- Deve retornar vazio
"
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] Todas as tabelas têm RLS habilitado
- [ ] Cada tabela tem policies para SELECT, INSERT, UPDATE, DELETE
- [ ] Policies verificam tenant_id
- [ ] Usuários só veem dados do próprio tenant

### Teste de Segurança

```bash
# Tentar accessing sem auth
psql "postgresql://anon:..." -c "SELECT * FROM agentes"
# Result: vazio ou erro

# Tentar accessing outro tenant
psql "postgresql://user1:..." -c "SELECT * FROM agentes WHERE tenant_id = 'tenant-2'"
# Result: vazio ( mesmo que dados existam)
```

### Checklist de Qualidade

- [ ] RLS consistente
- [ ] Policies eficientes
- [ ] Testadas e documentadas

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Audit atual | 1 hora |
| Habilitar RLS | 1 hora |
| Criar policies | 2 horas |
| Testar | 1 hora |
| **TOTAL** | **5 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `01_tenant_id_queries.md`
- **Requer**: `03_edge_functions_admin.md`

### unlockedBy

- Complementa: `13_performance_optimization.md`

---

## Referências

- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-row-security.html)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |