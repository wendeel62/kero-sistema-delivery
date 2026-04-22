# 01 - Correção de Queries sem Filtro de tenant_id

## Descrição do Problema

**Do Relatório de Auditoria:**
> Queries na aplicação que não possuem filtro de `tenant_id`. Estas queries podem retornar dados de outros tenants se o usuário tiver acesso, representando risco de segurança crítico para dados multi-tenant.

**Especificações Técnicas:**
- Diversas queries em `supabase/functions` e código React não filtram por `tenant_id`
- Não há validação que o usuário tem permissão para acessar os dados retornados
- Queries podem Ser executadas sem contexto de tenant válido

**Exemplos Identificados:**
- Queries em `supabase/functions/*/index.ts` sem filtro de tenant
- Chamadas no frontend que não passam tenant_id
- RPCs público que deveriam ser filtrados

---

## Impacto

### Por Que é Importante Corrigir

1. **SEGURANÇA CRÍTICA**: Vazamento de dados entre tenants é violação de privacidade
2. **Compliance**: Pode violar LGPD/GDPR se dados de clientes vazarem
3. **Confiança**: Perda de confiança se descoberto por clientes
4. **Legal**: Responsabilidade legal e multaspotenciais

### Risco se Não Corrigido

- **Severidade**: CRITICAL
- **Probabilidade**: Alta (já pode estar acontecendo)
- **Impacto Financeiro**: Multas + Perda de clientes + Processos

---

## Arquivos Afetados

### Principais (Identificados na Auditoria)

1. **Edge Functions**:
   - `supabase/functions/sync-gateway/index.ts`
   - `supabase/functions/admin-dashboard-data/index.ts`
   - `supabase/functions/debitar-estoque/index.ts`
   - (outras functions listadas no relatório)

2. **Código Frontend**:
   - `src/lib/supabase.ts`
   - `src/hooks/useTenant.ts`
   - Componentes que fazem queries diretas

3. **Database**:
   - Funções/RPCs sem filtro de tenant_id

---

## Solução Técnica

### Etapa 1: Identificar Todas as Queries

```bash
# Buscar patterns de queries sem tenant_id
grep -rn "from(" src/ --include="*.ts" | grep -v tenant_id
grep -rn "supabase.from" supabase/functions/ --include="*.ts"
```

### Etapa 2: Padronizar Filtro de Tenant

Criar função utilitária para extração de tenant_id:

```typescript
// src/lib/tenant-utils.ts
export function getTenantFilter(tenantId: string) {
  return { tenant_id: tenantId };
}

// OU usar contexto React
const { tenantId } = useTenant();
const query = supabase
  .from('tabela')
  .select('*')
  .eq('tenant_id', tenantId); // ✓ Obrigatório
```

### Etapa 3: Corrigir Cada Query

Para cada arquivo afetado:

1. Adicionar filtro `.eq('tenant_id', context.tenantId)`
2. Validar que tenantId existe antes da query
3. Adicionar erro claro se tenantId não fornecido

### Etapa 4: Validação Automática

Criar hook ou wrapper que bloqueia queries sem tenant:

```typescript
// src/hooks/useTenantQuery.ts
export function useTenantQuery(table: string) {
  const { tenantId } = useTenant();
  
  return (queryBuilder) => {
    if (!tenantId) throw new Error('Tentativa de query sem tenant_id');
    return queryBuilder.eq('tenant_id', tenantId);
  };
}
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] Todas as queries em Edge Functions possuem filtro de tenant_id
- [ ] Todas as queries no frontend passam tenant_id explícito
- [ ] Queries sem tenant_id retornam erro claro
- [ ] Teste de segurança: tentar acessar dados de outro tenant retorna vazio

### Teste de Segurança

```bash
# Após correção, testar que query sem tenant retorna erro
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.co/rest/v1/agentes?select=*" \
  # Deve retornar 400 ou dados vazios
```

### Checklist de Qualidade

- [ ] Código passa lint (`npm run lint`)
- [ ] Código passa typecheck (`npm run typecheck`)
- [ ] Testes existentes ainda passam
- [ ] Nenhuma regressão funcional

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Identificar todas as queries | 1 hora |
| Criar utilitários de tenant | 30 min |
| Corrigir Edge Functions | 2 horas |
| Corrigir código frontend | 1 hora |
| Testes e validação | 1 hora |
| **TOTAL** | **5.5 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `02_tenant_id_extraction.md` (extrair tenant_id corretamente)
- **Requer**: Contexto de tenant disponível no frontend

### unlockedBy

- Este item UNLOCKS: `04_n_plus_one_queries.md` (precisa de queries corretas primeiro)
- Este item UNLOCKS: `08_rls_policies.md` (precisa de queries corretas para RLS funcionar)

---

## Referências

- [Documentação Supabase - Filtering](https://supabase.com/docs/guides/api#filtering)
- [MD: Multi-tenant Architecture](./docs/multi-tenant.md)
- [RFC: Tenant Isolation](./docs/rfcs/tenant-isolation.md)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |