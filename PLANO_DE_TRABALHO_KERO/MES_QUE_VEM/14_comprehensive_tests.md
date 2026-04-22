# 14 - Testes Abrangentes

## Descrição do Problema

**Do Relatório de Auditoria:**
> Cobertura de testes insuficiente. Funcionalidades críticas não têm testes, edge cases não são tratados, e ausência de testes de integração.

---

## Impacto

1. **Confiança**: Mudanças não quebram funcionalidades
2. **Documentação**: Testes documentam comportamento
3. **Refactoring**: Permite melhorias seguras

### Risco Não Corrigido

- **Severidade**: LOW
- **Impacto**: Bugs em produção

---

## Solução Técnica

### 1. Testes de Integração para APIs

```typescript
// tests/api/agentes.test.ts
describe('API - Agentes', () => {
  it('deve criar agente', async () => {
    const response = await fetch('/api/agentes', {
      method: 'POST',
      body: JSON.stringify({ nome: 'João', email: 'joao@teste.com' })
    });
    expect(response.status).toBe(201);
  });
  
  it('deve retornar erro para email inválido', async () => {
    const response = await fetch('/api/agentes', {
      method: 'POST',
      body: JSON.stringify({ nome: 'João', email: 'invalid' })
    });
    expect(response.status).toBe(400);
  });
});
```

### 2. Testes E2E

```typescript
// tests/e2e/login.test.ts
describe('E2E - Login', () => {
  it('deve fazer login com credenciais válidas', async () => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@teste.com');
    await page.fill('[name="password"]', 'senha123');
    await page.click('[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### 3. Testes de Performance

```typescript
// tests/performance/load.test.ts
import { chromium } from 'playwright';

test('tempo de carregamento < 3s', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const start = Date.now();
  await page.goto('/dashboard');
  const time = Date.now() - start;
  
  expect(time).toBeLessThan(3000);
});
```

---

## Critérios de Aceitação

- [ ] Cobertura > 70%
- [ ] Testes de integração passing
- [ ] Testes E2E configurados

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Testes de API | 4 horas |
| Testes E2E | 6 horas |
| **TOTAL** | **10 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `07_tests_setup.md`

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |