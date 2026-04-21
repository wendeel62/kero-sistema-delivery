# 07 - Setup de Testes Básicos

## Descrição do Problema

**Do Relatório de Auditoria:**
> O projeto não possui testes básicos configurados ou os testes existentes não cobrem funcionalidades críticas. Falta cobertura para edge cases e regressions. O setup de testing está incompleto ou desatualizado.

**Especificações Técnicas:**
- Vitest está configurado mas testes falham ou não existem
- Falta teste para queries, validações, utils
- Não há testes de integração para Edge Functions
- Falta mocks para Supabase

**Áreas sem Teste:**
- Utils e helpers
- Validações Zod
- Edge Functions
- Componentes críticos

---

## Impacto

### Por Que é Importante Corrigir

1. **Confiança**: Mudanças não quebram funcionalidades existentes
2. **Documentação**: Testes documentam comportamento esperado
3. **Refactoring**: Permite melhorias com segurança
4. **Onboarding**: Novos desenvolvedores entendem o código

### Risco se Não Corrigido

- **Severidade**: MEDIUM
- **Probabilidade**: Alta
- **Impacto**: Bugs não pegos antes de produção

---

## Arquivos Afetados

### Arquivos de Configuração

1. **Config**:
   - `vite.config.ts`
   - `vitest.config.ts` (criar)
   - `package.json`

2. **Testes existentes**:
   - `src/**/*.test.ts`
   - `src/**/*.spec.ts`

---

## Solução Técnica

### Etapa 1: Configurar Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### Etapa 2: Setup de Mocks

```typescript
// src/test/setup.ts
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpar componentes após cada teste
afterEach(() => {
  cleanup();
});

// Mock do Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  }))
}));

// Mock de window
global.window = global.window || {};
```

### Etapa 3: Criar Mocks Específicos

```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest';

export const mockSupabase = {
  from: vi.fn((table: string) => ({
    select: vi.fn().mockResolvedValue({ 
      data: table === 'agentes' ? mockAgentes : [], 
      error: null 
    }),
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockResolvedValue({ data: [], error: null }),
    delete: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockResolvedValue({ data: [], error: null })
  }))
};

export const mockAgentes = [
  { id: '1', nome: 'João', email: 'joao@teste.com', tenant_id: 'tenant-1' },
  { id: '2', nome: 'Maria', email: 'maria@teste.com', tenant_id: 'tenant-1' }
];
```

### Etapa 4: Testes de Utils

```typescript
// src/lib/tenant-utils.test.ts
import { describe, it, expect } from 'vitest';
import { extractTenantFromJWT, getTenantFilter } from './tenant-utils';
import { agentSchema } from './schemas';

describe('extractTenantFromJWT', () => {
  it('deve extrair tenant_id do JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRfaWQiOiJ0ZW5hbnQtMSJ9.signature';
    const result = extractTenantFromJWT(jwt);
    expect(result.tenant_id).toBe('tenant-1');
  });
  
  it('deve lançar erro para JWT inválido', () => {
    expect(() => extractTenantFromJWT('invalid')).toThrow();
  });
});

describe('agenteSchema', () => {
  it('deve validar agente válido', () => {
    const agente = { nome: 'João', email: 'joao@teste.com', cargo: 'atendente' };
    const result = agentSchema.safeParse(agente);
    expect(result.success).toBe(true);
  });
  
  it('deve rejeitar email inválido', () => {
    const agente = { nome: 'João', email: 'invalid', cargo: 'atendente' };
    const result = agentSchema.safeParse(agente);
    expect(result.success).toBe(false);
  });
});
```

### Etapa 5: Testes de Componentes

```typescript
// src/components/AgentesTable.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentesTable } from './AgentesTable';

describe('AgentesTable', () => {
  it('deve renderizar lista de agentes', () => {
    const agentes = [
      { id: '1', nome: 'João', email: 'joao@teste.com' },
      { id: '2', nome: 'Maria', email: 'maria@teste.com' }
    ];
    
    render(<AgentesTable agentes={agentes} />);
    
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });
  
  it('deve mostrar vazio se não há agentes', () => {
    render(<AgentesTable agentes={[]} />);
    expect(screen.getByText('Nenhum agente encontrado')).toBeInTheDocument();
  });
});
```

### Etapa 6: Script de Teste

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] `npm test` roda sem erros
- [ ] Testes de utils existem e passam
- [ ] Cobertura > 30%
- [ ] Mocks funcionando

### Execução

```bash
npm run test:run
npm run test:coverage
```

### Checklist de Qualidade

- [ ] Setup completo
- [ ] Testes são maintainables
- [ ] Mocks são reutilizáveis

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Configurar Vitest | 30 min |
| Criar setup/mocks | 1 hora |
| Testes de utils | 1.5 horas |
| Testes de componentes | 2 horas |
| **TOTAL** | **5 horas** |

---

## Dependências

### Pré-Requisitos

- Nenhum

### unlockedBy

- Complementa: `14_comprehensive_tests.md`

---

## Referências

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |