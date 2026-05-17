# Estrutura de Testes - Kero Delivery

## Visão Geral

Este documento descreve a estrutura de testes implementada para os hooks críticos do projeto Kero Delivery.

## Configuração

### Dependências de Teste
- **Vitest**: Framework de testes
- **Testing Library React**: Para renderização e testes de componentes React
- **React Query**: Para gerenciamento de estado assíncrono

### Scripts do Package.json
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Configuração do Vitest (vitest.config.ts)
```typescript
{
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
  }
}
```

## Estrutura de Arquivos

```
src/
├── hooks/
│   ├── __tests__/
│   │   ├── useCardapioProducts.test.tsx
│   │   ├── useDashboardKpis.test.tsx
│   │   ├── usePdv.test.tsx
│   │   ├── usePdvState.test.ts
│   │   ├── useRealtime.test.ts
│   │   ├── useSalesKpis.test.tsx
│   │   └── useTracking.test.ts
│   ├── cardapio/
│   │   └── useCardapioProducts.ts
│   ├── usePdv.ts
│   ├── usePdvState.ts
│   ├── useDashboardKpis.ts
│   ├── useSalesKpis.ts
│   ├── useRealtime.ts
│   └── useTracking.ts
├── test/
│   └── setup.ts
└── schemas/
    ├── index.test.ts
    ├── pedidoSchema.test.ts
    ├── clienteSchema.test.ts
    └── produtoSchema.test.ts
```

## Hooks Testados

### 1. useCardapioProducts
**Localização**: `src/hooks/cardapio/useCardapioProducts.ts`

**Funcionalidades**:
- CRUD de produtos do cardápio
- Gerenciamento de preços por tamanho
- Busca e filtros
- Sincronização em tempo real

**Casos de Teste**:
- Estado inicial vazio
- Carregamento de produtos com sucesso
- Tratamento de erro na requisição
- Busca de preços por produto
- Exclusão de produto
- Adição/remoção de preços
- Comportamento sem tenantId

**Cobertura**: 10 testes

### 2. useSalesKpis
**Localização**: `src/hooks/useSalesKpis.ts`

**Funcionalidades**:
- KPIs de vendas (faturamento, total de pedidos, ticket médio)
- Cálculo de receita dos últimos 7 dias
- Formatação de moeda

**Casos de Teste**:
- Estado inicial com valores padrão
- KPI data com 5 indicadores
- Formatação de moeda correta
- Busca de KPIs com sucesso
- Tratamento de erro
- Status de carregamento

**Cobertura**: 8 testes

### 3. useDashboardKpis
**Localização**: `src/hooks/useDashboardKpis.ts`

**Funcionalidades**:
- Combinação de múltiplos hooks de KPIs
- SalesKpis, CustomerKpis, ProductKpis, DeliveryKpis, FinancialKpis
- Dados de funil em tempo real
- Controle de loja (abertura/fechamento)

**Casos de Teste**:
- Retorno de tenantId
- KPIs combinados
- SalesKpis, CustomerKpis, ProductKpis, DeliveryKpis, FinancialKpis
- KPI data para cards
- Funil de dados
- Receita data
- Métodos de controle
- Status de carregamento
- Formatação de moeda

**Cobertura**: 16 testes

### 4. usePdv
**Localização**: `src/hooks/usePdv.ts`

**Funcionalidades**:
- Hook principal do PDV (Ponto de Venda)
- Gerenciamento de carrinho
- Controle de mesas
- Filtros e busca
- Tipos de pedido (balcão, entrega, mesa)

**Casos de Teste**:
- Retorno de pedidoAtualRef
- Dados iniciais vazios
- Estado do carrinho
- Filtros
- Tipo de pedido padrão
- Status de salvamento
- Status online
- Adição de itens
- Métodos de ação
- Status e métodos de mesa
- Métodos de variação
- TenantId
- getStatusColor

**Cobertura**: 17 testes

### 5. usePdvState
**Localização**: `src/hooks/usePdvState.ts`

**Funcionalidades**:
- Gerenciamento de estado do PDV
- Carrinho de compras
- Modal de variações
- Filtros
- Controle de mesas
- Pedido

**Casos de Teste**:
- Estado inicial para carrinho
- Estado inicial para variações modal
- Estado inicial para filtros
- Estado inicial para mesa
- Estado inicial para pedido
- Adição de item ao carrinho
- Incremento de quantidade
- Remoção de item
- Limpeza de carrinho
- Abertura de modal de variações
- Atualização de filtros
- Atualização de estado do pedido
- Atualização de estado da mesa
- CartPulse ao adicionar item

**Cobertura**: 14 testes

### 6. useRealtime
**Localização**: `src/hooks/useRealtime.ts`

**Funcionalidades**:
- Sincronização em tempo real via Supabase
- Inscrição em múltiplas tabelas
- Callbacks para eventos de INSERT, UPDATE, DELETE
- Tratamento de erro e retry

**Casos de Teste**:
- Não criação de canal sem configs
- Criação de canal com filtro
- Criação de canal sem filtro
- Callback de evento
- Inscrição no canal
- Múltiplos configs

**Cobertura**: 6 testes

### 7. useTracking
**Localização**: `src/hooks/useTracking.ts`

**Funcionalidades**:
- Rastreamento de eventos (Meta Pixel, GA4, UTM)
- PageView, ViewContent, AddToCart, InitiateCheckout, Purchase

**Casos de Teste**:
- Inicialização do Meta Pixel
- Inicialização do GA4
- Inicialização do UTMfy
- Retorno de métodos de tracking
- Rastreamento de page view
- Rastreamento de visualização de conteúdo
- Rastreamento de adição ao carrinho
- Rastreamento de início de checkout
- Rastreamento de compra com UTM
- Não inicialização sem configuração

**Cobertura**: 10 testes

## Padrões de Teste

### Mock do Supabase
```typescript
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))
```

### Wrapper de Teste com QueryClient
```typescript
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

### Estrutura de Teste Padrão
```typescript
describe('useHookName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve descrever o comportamento', async () => {
    const { result } = renderHook(() => useHookName(), {
      wrapper: createWrapper(),
    })

    expect(result.current.value).toBe(expected)
  })
})
```

## Cobertura de Testes Alvo

A meta é **>80% de cobertura** nos hooks críticos:

### Hooks Críticos (Prioridade Alta)
- ✅ useCardapioProducts - 10 testes
- ✅ useSalesKpis - 8 testes
- ✅ useDashboardKpis - 16 testes
- ✅ usePdv - 17 testes
- ✅ usePdvState - 14 testes

### Hooks Secundários (Prioridade Média)
- ✅ useRealtime - 6 testes
- ✅ useTracking - 10 testes

### Próximos Passos Sugeridos
1. useCustomerKpis
2. useProductKpis
3. useDeliveryKpis
4. useFinancialKpis
5. usePdvApi
6. usePdvUI
7. usePdvOffline

## Executando os Testes

```bash
# Todos os testes
npm run test

# Testes em modo watch
npm run test

# Testes com coverage
npm run test:coverage

# Testes em modo UI
npm run test:ui

# Testes uma única vez
npm run test:run
```

## Boas Práticas

1. **Nomes Descritivos**: Use `deve + comportamento esperado`
2. **Mocks Appropriados**: Mocke dependências externas (Supabase, APIs)
3. **Teste Isolado**: Cada teste deve ser independente
4. **Aguardar Assíncrono**: Use `waitFor` e `act` quando necessário
5. **Limpeza**: Use `beforeEach` para limpar mocks entre testes

## Tips

- Para hooks que usam React Query, sempre envolva com `QueryClientProvider`
- Para hooks que usam contexto, crie wrappers customizados
- Use `vi.fn()` para mockar funções e verificar chamadas
- Use `beforeEach` para limpar mocks entre testes
- Para testes assíncronos, retorne a promise ou use `async/await`

## Recursos Adicionais

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/react)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
