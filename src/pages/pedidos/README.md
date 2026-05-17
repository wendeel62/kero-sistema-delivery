# Pedidos Page - Componentes Modulares

## Visão Geral

A página de Pedidos foi refatorada em componentes menores e mais gerenciáveis, seguindo boas práticas de React e mantendo o código abaixo de 200 linhas por arquivo.

## Estrutura de Arquivos

```
src/pages/pedidos/
├── index.ts                    # Exporta todos os componentes
├── usePedidosFilters.ts        # Hook de filtros
├── PedidosList.tsx             # Lista de pedidos (Kanban)
├── PedidoFilters.tsx           # Filtros e busca
├── PedidoModal.tsx             # Modal de detalhes
├── PedidoStatusBadge.tsx       # Badge de status
├── PedidoActions.tsx           # Ações do pedido
├── PedidosEmptyState.tsx       # Estados vazio/loading
└── README.md                   # Esta documentação
```

## Componentes

### 1. `usePedidosFilters` (Hook)

Hook personalizado para gerenciar filtros de pedidos.

```typescript
const {
  filtroData,
  dataInicio,
  dataFim,
  busca,
  filteredPedidos,
  setFiltroData,
  setBusca,
  getDateRange
} = usePedidosFilters(pedidos)
```

**Funcionalidades:**
- Filtro por período (hoje, ontem, semana, mês, personalizado)
- Busca por nome, telefone ou número
- Intervalo de datas personalizado
- Limpeza de filtros

### 2. `PedidosList`

Lista de pedidos em formato Kanban com 5 colunas de status.

**Props:**
- `pedidos`: Array de pedidos
- `onAdvance`: Callback para avançar status
- `onCancel`: Callback para cancelar
- `onView`: Callback para visualizar
- `onPrint`: Callback para imprimir (opcional)
- `isLoading`: Estado de carregamento

**Features:**
- Virtualização por coluna
- Scroll horizontal suave
- Contador de pedidos por coluna
- Design responsivo

### 3. `PedidoFilters`

Barra de filtros e busca.

**Props:**
- `filtroData`: Período selecionado
- `dataInicio`, `dataFim`: Datas personalizadas
- `busca`: Termo de busca
- `onSetFiltroData`: Setter de período
- `onSetBusca`: Setter de busca

### 4. `PedidoModal`

Modal de detalhes do pedido (slide-out).

**Props:**
- `pedido`: Pedido selecionado
- `onClose`: Callback de fechar
- `onAdvance`: Callback de avançar
- `expanded`: Estado expandido

### 5. `PedidoStatusBadge`

Badge de status reutilizável.

**Props:**
- `status`: Status do pedido
- `size`: sm | md | lg
- `showLabel`: Exibir rótulo

**Status disponíveis:**
- `novo`: Azul
- `em_preparo`: Laranja
- `saiu_entrega`: Roxo
- `entregue`: Verde
- `cancelado`: Vermelho

### 6. `PedidoActions`

Botões de ação do pedido.

**Props:**
- `pedido`: Pedido atual
- `onAdvance`: Avançar status
- `onCancel`: Cancelar
- `onView`: Visualizar
- `onPrint`: Imprimir

### 7. `PedidosEmptyState`

Estados vazio e loading.

**Componentes:**
- `PedidosEmptyState`: Mensagem de vazio
- `LoadingState`: Spinner de carregamento
- `LoadingCard`: Skeleton de card

## Uso no PedidosPage.tsx

```typescript
import {
  PedidosList,
  PedidoFilters,
  PedidoModal,
  usePedidosFilters
} from './pedidos'

export default function PedidosPage() {
  const {
    filtroData,
    dataInicio,
    dataFim,
    busca,
    setFiltroData,
    setBusca
  } = usePedidosFilters(pedidos)

  return (
    <div>
      <header>
        <h1>Pedidos</h1>
        <PedidoFilters
          filtroData={filtroData}
          busca={busca}
          onSetFiltroData={setFiltroData}
          onSetBusca={setBusca}
        />
      </header>

      <PedidosList
        pedidos={pedidos}
        onAdvance={handleAdvance}
        onCancel={handleCancel}
        onView={handleView}
      />

      <PedidoModal
        pedido={selectedPedido}
        onClose={() => setSelectedPedido(null)}
        onAdvance={handleAdvance}
      />
    </div>
  )
}
```

## Vantagens da Refatoração

| Antes | Depois |
|-------|--------|
| 1083 linhas em 1 arquivo | ~200 linhas por componente |
| Difícil de testar | Componentes testáveis isoladamente |
| Lógica misturada | Responsabilidades separadas |
| Reaproveitamento difícil | Componentes reutilizáveis |

## Testes

Cada componente pode ser testado isoladamente:

```typescript
import { render, screen } from '@testing-library/react'
import { PedidoStatusBadge } from './PedidoStatusBadge'

test('renderiza status novo corretamente', () => {
  render(<PedidoStatusBadge status="novo" />)
  expect(screen.getByText('Novo')).toBeInTheDocument()
})
```

## Boas Práticas

1. **Componentes puros**: Todos usam `memo` quando aplicável
2. **Types explícitos**: Interfaces bem definidas
3. **Hooks customizados**: Lógica separada da UI
4. **Acessibilidade**: Labels e roles apropriados
5. **Responsividade**: Mobile-first

## Próximos Passos

- [ ] Adicionar virtualização real (react-window)
- [ ] Implementar drag-and-drop
- [ ] Adicionar atalhos de teclado
- [ ] Otimizar re-renders com useMemo
