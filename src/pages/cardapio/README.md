# Cardápio Online - Refatoração

## Visão Geral

A página de Cardápio Online foi refatorada em componentes modulares e hooks reutilizáveis para melhor organização, testabilidade e manutenção.

## Estrutura

```
src/pages/cardapio/
├── index.ts                    # Exporta todos os componentes
├── types.ts                    # Tipos TypeScript compartilhados
├── useCarrinho.ts              # Hook do carrinho (estado + persistência)
├── useCardapioFilters.ts       # Hook de filtros e busca
├── ProdutoCard.tsx             # Card individual de produto
├── CatalogoProdutos.tsx        # Grid de produtos
├── CategoriaTabs.tsx           // Navegação por categorias
├── BuscaProdutos.tsx           // Barra de busca
├── CarrinhoSidebar.tsx         // Sidebar do carrinho
└── CheckoutModal.tsx           // Modal de checkout
```

## Componentes Principais

### 1. `useCarrinho` (Hook)

Gerencia o estado do carrinho com persistência no localStorage.

```typescript
const {
  cart,
  subtotal,
  total,
  cartCount,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart
} = useCarrinho(taxaEntrega)
```

**Funcionalidades:**
- Adicionar, remover, atualizar quantidade
- Persistência automática no localStorage
- Cálculo de subtotal e total
- Suporte a variações (tamanho, sabor, tipo de pizza)

### 2. `useCardapioFilters` (Hook)

Hook de filtros para busca e categoria.

```typescript
const {
  filtroCategoria,
  busca,
  filteredProdutos,
  setFiltroCategoria,
  setBusca,
  clearFiltros
} = useCardapioFilters(produtos, categorias)
```

### 3. `ProdutoCard`

Card individual de produto com:
- Lazy loading de imagem
- Zoom ao clicar
- Preço formatado
- Botão de adicionar rápido
- Estado de indisponível

### 4. `CatalogoProdutos`

Grid responsivo de produtos.
- 2 colunas (mobile)
- 3 colunas (tablet)
- 4 colunas (desktop)

### 5. `CategoriaTabs`

Navegação horizontal por categorias.
- Scroll suave
- Categoria ativa destacada
- Opção "Todos"

### 6. `BuscaProdutos`

Barra de busca com:
- Ícone de busca
- Limpar busca
- Foco destacado

### 7. `CarrinhoSidebar`

Sidebar deslizante do carrinho.
- Lista de itens com resumo
- Controles de quantidade
- Resumo de valores
- Botão de checkout

### 8. `CheckoutModal`

Modal de finalização de pedido.
- Passo 1: Dados do cliente
- Passo 2: Resumo e pagamento
- Seleção de forma de pagamento
- Campo de observações

## Uso

```typescript
import {
  useCarrinho,
  useCardapioFilters,
  ProdutoCard,
  CatalogoProdutos,
  CategoriaTabs,
  BuscaProdutos,
  CarrinhoSidebar,
  CheckoutModal
} from './cardapio'

export default function CardapioOnlinePage() {
  const {
    cart,
    subtotal,
    total,
    addToCart,
    removeFromCart
  } = useCarrinho()

  const {
    filteredProdutos,
    filtroCategoria,
    busca,
    setFiltroCategoria,
    setBusca
  } = useCardapioFilters(produtos, categorias)

  return (
    <div>
      <BuscaProdutos value={busca} onChange={setBusca} />
      <CategoriaTabs
        categorias={categorias}
        filtroAtivo={filtroCategoria}
        onSetFiltro={setFiltroCategoria}
      />
      <CatalogoProdutos
        produtos={filteredProdutos}
        onAddToCart={addToCart}
      />
      <CarrinhoSidebar
        isOpen={isOpen}
        onClose={onClose}
        cart={cart}
        subtotal={subtotal}
        total={total}
      />
    </div>
  )
}
```

## Lazy Loading de Imagens

Todas as imagens usam `loading="lazy"` nativo do HTML5:

```tsx
<img
  src={produto.imagem_url}
  alt={produto.nome}
  loading="lazy"
  className="..."
/>
```

## Separação de Responsabilidades

| Camada | Responsabilidade |
|--------|-----------------|
| `useCarrinho` | Estado local + persistência |
| `useCardapioFilters` | Filtros e busca |
| `ProdutoCard` | Visualização do produto |
| `CatalogoProdutos` | Layout em grid |
| `CarrinhoSidebar` | Estado do carrinho |
| `CheckoutModal` | Fluxo de pagamento |

## Vantagens

1. **Testabilidade**: Cada componente pode ser testado isoladamente
2. **Reutilização**: Componentes independentes
3. **Performance**: Lazy loading e memoização
4. **Manutenibilidade**: Código organizado e responsivo
5. **Acessibilidade**: Labels, roles e semantic HTML

## Próximos Passos

- [ ] Adicionar skeletons de loading
- [ ] Implementar virtualização para muitos produtos
- [ ] Adicionar suporte a PWA (offline)
- [ ] Otimizar imagens com WebP/AVIF
