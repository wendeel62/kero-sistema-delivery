# 04 - Correção de N+1 Queries

## Descrição do Problema

**Do Relatório de Auditoria:**
> O código apresenta problemas de N+1 queries, onde múltiplas requisições separadas são feitas para buscar dados relacionados em vez de JOINs ou queries otimizadas. Isso causa degradação significativa de performance, especialmente em listas grandes.

**Especificações Técnicas:**
- Componentes React fazem múltiplas queries em useEffect
- Não há uso de `.join()` ou `.contains()` do Supabase
- Dados que poderiam ser fetched together são buscados separadamente
- Falta uso de `.select()` com foreign tables

**Exemplos Identificados:**
- Lista de agentes com queries separadas para cada usuário
- Dashboard com múltiplas queries seqüenciais
- Componentes que fetcheiam dados em loop

---

## Impacto

### Por Que é Importante Corrigir

1. **Performance**: N+1 pode causar 10-100x mais queries que necessário
2. **Custo**: Mais queries = mais custos de Supabase/API
3. **UX**: Carregamento lento prejudica experiência
4. **Escalabilidade**: Sistema não escala com mais dados

### Risco se Não Corrigido

- **Severidade**: HIGH (para performance)
- **Probabilidade**: Alta
- **Impacto**: Sistema lento com poucos dados, impossibilidade de escalar

---

## Arquivos Afetados

### Áreas com N+1

1. **Pages**:
   - `src/pages/*.tsx` (dashboards, listas)
   - `src/pages/admin/*.tsx`

2. **Componentes**:
   - `src/components/**/*.tsx` (listas)
   - `src/components/Table/*.tsx`

3. **Hooks**:
   - `src/hooks/use*.ts`

---

## Solução Técnica

### Etapa 1: Identificar N+1

```bash
# Buscar patterns problemáticos
grep -rn "useEffect" src/ --include="*.tsx" -A5
grep -rn "forEach.*supabase" src/
grep -rn "map.*supabase" src/
```

### Etapa 2: Usar .select() com Relacionamentos

Configurar Supabase para usar foreign tables:

```typescript
// Supabase: config.toml
[db.postgres.extensions]
uuid-ossp = { version = "1.1" }

// Tabelas devem ter foreign keys adequadas
// e queries usam:
const { data } = await supabase
  .from('agentes')
  .select('*, usuarios!inner(nome, email)')
  .eq('tenant_id', tenantId);
```

### Etapa 3: Corrigir Componentes

**ANTES (N+1 problemático):**
```typescript
// Componente que faz uma query por item
useEffect(() => {
  const fetchAll = async () => {
    const { data: agentes } = await supabase.from('agentes').select('*');
    for (const agente of agentes) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('nome, email')
        .eq('id', agente.usuario_id)
        .single();
      agente.usuario = usuario;
    }
    setAgentes(agentes);
  };
  fetchAll();
}, []);
```

**DEPOIS (otimizado):**
```typescript
// Uma query com JOIN
useEffect(() => {
  const fetchAgentes = async () => {
    const { data, error } = await supabase
      .from('agentes')
      .select('*, usuarios!inner(nome, email, avatar_url)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    setAgentes(data || []);
  };
  fetchAgentes();
}, [tenantId]);
```

### Etapa 4: Usar RPC para Queries Complexas

Para queries muito complejas, criar RPC:

```sql
-- migrations/xxx_n_plus_one_fix.sql
CREATE OR REPLACE FUNCTION get_agentes_completos(p_tenant_id UUID)
RETURNS TABLE(
  id UUID,
  nome TEXT,
  email TEXT,
  tenant_id UUID,
  nome_usuario TEXT,
  stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.nome,
    a.email,
    a.tenant_id,
    u.nome as nome_usuario,
    json_build_object(
      'total_atendimentos', COUNT(at.id),
      'avaliacao_media', AVG(at.avaliacao)
    ) as stats
  FROM agentes a
  LEFT JOIN usuarios u ON u.id = a.usuario_id
  LEFT JOIN atendimentos at ON at.agente_id = a.id
  WHERE a.tenant_id = p_tenant_id
  GROUP BY a.id, u.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] Queries usam `.select()` com relacionamentos
- [ ] Não há loops fazendo queries individuais
- [ ] Queries complexas usam RPC
- [ ] Performance melhorou significativamente

### Teste de Performance

```bash
# Medir tempo de resposta
time curl "https://api.supabase.co/rest/v1/agentes?select=*"

# Com N+1: ~500ms por items
# Com JOIN: ~50ms independente do número
```

### Checklist de Qualidade

- [ ] Query count reduziu significativamente
- [ ] Tempo de carregamento melhorou
- [ ] Código mais limpo

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Identificar N+1 | 1 hora |
| Configurar foreign keys | 30 min |
| Corrigir queries | 2 horas |
| Criar RPCs | 1 hora |
| Testes | 30 min |
| **TOTAL** | **5 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `01_tenant_id_queries.md` (precisa de queries corretas)

### unlockedBy

- Complementa: `13_performance_optimization.md`

---

## Referências

- [Supabase - Relational Data](https://supabase.com/docs/guides/api#relational-data)
- [PostgreSQL - JOINs](https://www.postgresql.org/docs/current/sql-select.html#SQL-JOINs)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |