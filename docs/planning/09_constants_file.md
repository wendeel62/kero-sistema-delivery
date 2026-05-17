# 09 - Arquivo de Constantes Centralizado

## Descrição do Problema

**Do Relatório de Auditoria:**
> Constantes estão distribuídas em múltiplos arquivos sem organização centralizada. Valores duplicados, inconsistências, e dificuldade em manter consistência quando valores mudam.

**Especificações Técnicas:**
- Strings como 'admin', 'atendente', etc. hardcoded em vários lugares
- Valores de configuração em arquivos diferentes
- Números mágicos sem объяснение
- URLs de API分散 em múltiplos arquivos

**Pontos Afetados:**
- Código React
- Edge Functions
- Configurações

---

## Impacto

### Por Que é Importante Corrigir

1. **Manutenibilidade**: Mudar um valor em um lugar
2. **Consistência**: Garante mesmos valores em todo lugar
3. **DX**: Easy de encontrar e modificar configurações

### Risco se Não Corrigido

- **Severidade**: LOW (para estabilidade)
- **Probabilidade**: Alta
- **Impacto**: Dívida técnica, dificuldade de manutenção

---

## Arquivos Afetados

### Onde Constantes Estão

1. **Frontend**:
   - `src/**/*.tsx`
   - `src/**/*.ts`

2. **Edge Functions**:
   - `supabase/functions/**/*.ts`

---

## Solução Técnica

### Etapa 1: Criar Arquivo Central

```typescript
// src/constants/index.ts

// ==========================================
// ROLES E PERMISSIONS
// ==========================================
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  GERENTE: 'gerente',
  ATENDENTE: 'atendente',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_hierarchY = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.GERENTE]: 2,
  [ROLES.ATENDENTE]: 1,
} as const;

// ==========================================
// PLANOS
// ==========================================
export const PLANOS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const PLAN_LIMITS = {
  [PLANOS.FREE]: { maxUsuarios: 5, maxAgentes: 2 },
  [PLANOS.PRO]: { maxUsuarios: 50, maxAgentes: 20 },
  [PLANOS.ENTERPRISE]: { maxUsuarios: -1, maxAgentes: -1 },
} as const;

// ==========================================
// STATUS
// ==========================================
export const STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
  PENDENTE: 'pendente',
  CANCELADO: 'cancelado',
} as const;

// ==========================================
// CONFIGURAÇÕES DE API
// ==========================================
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// ==========================================
// CONFIGURAÇÕES DE UI
// ==========================================
export const UI_CONFIG = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEBOUNCE_MS: 300,
  TOAST_DURATION_MS: 5000,
} as const;

// ==========================================
// ERROR MESSAGES
// ==========================================
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Você não tem permissão para acessar este recurso',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Dados inválidos',
  SERVER_ERROR: 'Erro no servidor. Tente novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
} as const;
```

### Etapa 2: Usar nos Componentes

```typescript
// ANTES
const role = user.role === 'admin' || user.role === 'super_admin';

// DEPOIS
import { ROLES, ROLE_hierarchY } from '@/constants';

const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.role);
```

### Etapa 3: Exportar para Edge Functions

```typescript
// supabase/functions/utils/constants.ts
// Copiar as constantes relevantes para cá
// (Edge Functions não podem importar do código frontend)

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  // ...
};
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] Arquivo central existe em `src/constants/`
- [ ] Valores hardcoded substituídos por constantes
- [ ] Consistência verificada

### Checklist

- [ ]Código mais limpo
- [ ] Easier de manter

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Criar arquivo | 1 hora |
| Substituir valores | 2 horas |
| Verificar | 1 hora |
| **TOTAL** | **4 horas** |

---

## Dependências

### Pré-Requisitos

- Nenhum

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |