# 02 - Correção da Extração de tenant_id

## Descrição do Problema

**Do Relatório de Auditoria:**
> A extração de `tenant_id` não está consistentemente implementada em toda a aplicação. Em alguns pontos, o tenant_id é extraído do JWT, em outros do contexto React, e há casos onde não é validado. Esta inconsistência pode levar a erros de segurança e dados incorretos.

**Especificações Técnicas:**
- `useTenant()` hook pode retornar null em casos não esperados
- Não há validação que o tenant_id do JWT corresponde ao tenant_id solicitado
- Em Edge Functions, tenant_id é extraído de formas diferentes
- Falta fallback adequado quando tenant_id não está disponível

**Pontos de Extração Identificados:**
- `src/hooks/useTenant.ts` - extrai do contexto
- Edge Functions - extraem do JWT claims
- RPCs - extraem via `auth.jwt()` ou parâmetros

---

## Impacto

### Por Que é Importante Corrigir

1. **Consistência**: Garante que mesmo tenant_id é usado em toda a aplicação
2. **Segurança**: Impede que um usuário malicioso use tenant_id diferente do JWT
3. **Confiabilidade**: Código não quebra quando tenant_id é null

### Risco se Não Corrigido

- **Severidade**: CRITICAL
- **Probabilidade**: Média (pode causar erros em edge cases)
- **Impacto**: Dados potencialmente associados ao tenant errado

---

## Arquivos Afetados

### Arquivos Principais

1. **Hooks**:
   - `src/hooks/useTenant.ts`
   - `src/hooks/useAuth.ts`

2. **Edge Functions**:
   - `supabase/functions/*/index.ts` (todas)
   - `supabase/functions/utils/tenant.ts` (a criar)

3. **Contexto**:
   - `src/contexts/AuthContext.tsx`
   - `src/contexts/TenantContext.tsx` (se existir)

---

## Solução Técnica

### Etapa 1: Padronizar Fonte de Verdade

O tenant_id deve vir EXCLUSIVAMENTE do JWT. Esta é a única fonte confiável.

```typescript
// src/lib/tenant-utils.ts
export interface TenantClaims {
  tenant_id: string;
  role: string;
  permissions: string[];
}

export function extractTenantFromJWT(jwt: string): TenantClaims {
  const payload = JSON.parse(atob(jwt.split('.')[1]));
  return {
    tenant_id: payload.tenant_id,
    role: payload.role,
    permissions: payload.permissions || []
  };
}
```

### Etapa 2: Criar Hookpadronizado

```typescript
// src/hooks/useTenant.ts
import { useAuth } from './useAuth';

export function useTenant() {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  const token = getAccessToken(user);
  const claims = extractTenantFromJWT(token);
  
  return {
    tenantId: claims.tenant_id,
    role: claims.role,
    permissions: claims.permissions,
    isAdmin: claims.role === 'admin' || claims.role === 'super_admin'
  };
}
```

### Etapa 3: Edge Functions

```typescript
// supabase/functions/utils/tenant.ts
import { jwtverify } from 'jsr:@supabase/functions-js/edge-runtime.d.ts';

export async function getTenantFromRequest(request: Request): Promise<TenantContext> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await jwtverify(token, Deno.env.get('SUPABASE_JWT_SECRET')!);
  
  if (error || !data.tenant_id) {
    throw new Error('Invalid token: missing tenant_id');
  }
  
  return {
    tenantId: data.tenant_id as string,
    role: data.role as string,
    userId: data.sub as string
  };
}
```

### Etapa 4: Validação em Todas as Edge Functions

Cada Edge Function deve chamar `getTenantFromRequest` no início:

```typescript
// Exemplo em qualquer Edge Function
Deno.serve(async (req) => {
  const tenant = await getTenantFromRequest(req);
  
  // tenant.tenantId é a fonte de verdade
  // NÃO use req.tenantId do corpo da requisição!
});
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] `useTenant()` sempre retorna tenant_id válido ou lança erro
- [ ] Edge Functions extraem tenant_id do JWT, não do body/request
- [ ] Tentativas de bypass (passar tenant_id no body) são bloqueadas
- [ ] Erros são claros e indicam o problema

### Teste de Segurança

```bash
# Tentar usar tenant_id diferentes do JWT
# Deve ser bloqueado
curl -X POST "https://api.supabase.co/functions/v1/endpoint" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"tenant_id": "outro_tenant_id"}'
# Result: erro 403
```

### Checklist de Qualidade

- [ ] Código passa lint
- [ ] Código passa typecheck
- [ ] Comportamento consistente em todo lugar
- [ ] Erros são helpful

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Analisar código atual | 30 min |
| Criar utilitários centralizados | 1 hora |
| Corrigir useTenant hook | 1 hora |
| Corrigir Edge Functions | 2 horas |
| Validação | 30 min |
| **TOTAL** | **5 horas** |

---

## Dependências

### Pré-Requisitos

- Nenhum (item independente)

### unlockedBy

- Requerido por: `01_tenant_id_queries.md` (precisa de extração correta primeiro)
- Requerido por: `03_edge_functions_admin.md`

---

## Referências

- [Supabase JWT Structure](https://supabase.com/docs/guides/auth/jwt)
- [Edge Functions Auth](https://supabase.com/docs/guides/functions/auth)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |