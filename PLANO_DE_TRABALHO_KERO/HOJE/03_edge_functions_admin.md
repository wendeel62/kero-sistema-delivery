# 03 - Validação Multi-Tenant nas Edge Functions

## Descrição do Problema

**Do Relatório de Auditoria:**
> As Edge Functions do Supabase não possuem validação consistente de multi-tenant. Muitas functions permitem acesso sem verificar se o tenant_id do usuário corresponde aos dados sendo acessados, ou realizam operações administrativas sem validação de role apropriada.

**Especificações Técnicas:**
- Admin functions não verificam se caller é realmente admin
- Non-admin functions não verificam acesso ao tenant específico
- Há functions expostas sem autenticação necessária
- Falta rate limiting apropriado
- Não há logging de tentativas de acesso suspeito

**Functions Afetadas:**
- `admin-dashboard-data/index.ts`
- `sync-gateway/index.ts`
- Funções de administrativo em geral

---

## Impacto

### Por Que é Importante Corrigir

1. **Segurança**: Impede que usuários acessem dados de outros tenants
2. **Auditoria**: Permite rastrear quem fez o que
3. **Controle**: Garante que apenas admins fazem operações administrativas
4. **compliance**: Necessário para compliance LGPD/GDPR

### Risco se Não Corrigido

- **Severidade**: CRITICAL
- **Probabilidade**: Alta
- **Impacto**: Acesso não autorizado a dados sensíveis

---

## Arquivos Afetados

### Arquivos a Corrigir

1. **Todas Edge Functions administrativas**:
   - `supabase/functions/admin-dashboard-data/index.ts`
   - `supabase/functions/sync-gateway/index.ts`
   - Qualquer function com operações de escrita

2. **Utils**:
   - `supabase/functions/utils/` (criar se não existir)

---

## Solução Técnica

### Etapa 1: Middleware de Validação

Criar middleware reutilizável:

```typescript
// supabase/functions/utils/auth.ts
import { jwtverify } from 'jsr:@supabase/functions-js/edge-runtime.d.ts';

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
}

export async function validateAuth(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Missing authorization header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await jwtverify(token, Deno.env.get('SUPABASE_JWT_SECRET')!);
  
  if (error || !data.sub) {
    throw new Error('UNAUTHORIZED: Invalid token');
  }
  
  return {
    userId: data.sub as string,
    tenantId: data.tenant_id as string,
    role: data.role as string,
    permissions: (data.permissions as string[]) || []
  };
}

export function requireRole(auth: AuthContext, allowedRoles: string[]): void {
  if (!allowedRoles.includes(auth.role)) {
    throw new Error(`FORBIDDEN: Required roles are ${allowedRoles.join(', ')}, got ${auth.role}`);
  }
}

export function requireTenantAccess(auth: AuthContext, targetTenantId: string): void {
  if (auth.tenantId !== targetTenantId && auth.role !== 'super_admin') {
    throw new Error('FORBIDDEN: Cannot access data from other tenant');
  }
}
```

### Etapa 2: Aplicar em Cada Function

```typescript
// Exemplo: admin-dashboard-data/index.ts
Deno.serve(async (req) => {
  try {
    // 1. Validar autenticação
    const auth = await validateAuth(req);
    
    // 2. Verificar role de admin
    requireRole(auth, ['admin', 'super_admin']);
    
    // 3. Log da operação
    console.log(`Admin ${auth.userId} from tenant ${auth.tenantId} accessed dashboard`);
    
    // 4. Processar requisição
    const { tenant_id } = await req.json();
    
    // 5. Verificar acesso ao tenant
    if (tenant_id && tenant_id !== auth.tenantId) {
      requireTenantAccess(auth, tenant_id);
    }
    
    // ... lógica da function
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('UNAUTHORIZED') ? 401 : 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### Etapa 3: Rate Limiting

```typescript
// supabase/functions/utils/rate-limit.ts
// Simples rate limiting em memória (para produção, usar Redis/externo)

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000): void {
  const now = Date.now();
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  
  if (record.count >= maxRequests) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
  
  record.count++;
}
```

### Etapa 4: Logging de Auditoria

```typescript
// supabase/functions/utils/audit.ts
export async function logAudit(
  action: string,
  auth: AuthContext,
  details: Record<string, unknown>
): Promise<void> {
  // Inserir em tabela de audit_log
  // Isso deve ser assíncrono para não bloquear a resposta
}
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] TODAS as Edge Functions usam `validateAuth`
- [ ] Functions administrativas verificam role de admin
- [ ] Acesso entre tenants é bloqueado
- [ ] Rate limiting está implementado
- [ ] Operações são logadas para auditoria

### Teste de Segurança

```bash
# Tentar acessar sem auth
curl "https://api.supabase.co/functions/v1/admin-dashboard"
# Result: 401

# Tentar acessar como non-admin
curl -H "Authorization: Bearer $USER_TOKEN" \
  "https://api.supabase.co/functions/v1/admin-dashboard"
# Result: 403

# Tentar acessar outro tenant
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"tenant_id": "outro_tenant"}' \
  "https://api.supabase.co/functions/v1/admin-dashboard"
# Result: 403
```

### Checklist de Qualidade

- [ ] Todas functions passam pelo middleware
- [ ] Erros são padronizados
- [ ] Logging funciona

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Criar middleware de auth | 1 hora |
| Aplicar em admin functions | 1 hora |
| Aplicar em outras functions | 2 horas |
| Rate limiting | 30 min |
| Logging | 30 min |
| Testes | 1 hora |
| **TOTAL** | **6 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `02_tenant_id_extraction.md` (precisa de extração)
- **Requer**: `01_tenant_id_queries.md` (precisa de queries corretas)

### unlockedBy

- Este item é PRÉ-REQUISITO para: `08_rls_policies.md`

---

## Referências

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [MD: Security Best Practices](./docs/security.md)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |