# Estoque Page - Refatoração

## Visão Geral

A página de Estoque foi refatorada em componentes modulares com suporte a:
- Controle de lote e validade
- Múltiplos depósitos
- Relatórios de giro de estoque
- Alertas automáticos

## Estrutura

```
src/pages/estoque/
├── index.ts                    # Exporta todos os componentes
├── types.ts                    # Tipos TypeScript
├── useEstoque.ts               # Hook de gerenciamento
├── useMovimentacoes.ts         # Hook de movimentações
├── ProdutosEstoque.tsx         # Lista de produtos
├── EstoqueAlertas.tsx          # Alertas de estoque
├── EstoqueMovimentacoes.tsx    # Histórico
├── ProdutoForm.tsx             # Formulário
├── CategoriasEstoque.tsx       # Gestão de categorias
└── README.md                   # Documentação
```

## Funcionalidades Implementadas

### 1. Controle de Lote e Validade

```typescript
interface Ingrediente {
  // ... outros campos
  lote?: string
  validade?: string
}

interface MovimentacaoEstoque {
  // ... outros campos
  lote?: string
  validade?: string
}
```

### 2. Múltiplos Depósitos

```typescript
interface Deposito {
  id: string
  tenant_id: string
  nome: string
  endereco?: string
  responsavel?: string
  telefone?: string
  ativo: boolean
}

interface MovimentacaoEstoque {
  // ... outros campos
  deposito_id?: string
  deposito_origem?: string
  deposito_destino?: string
}
```

### 3. Relatórios de Giro de Estoque

- Entrada de mercadorias
- Saída por produção
- Ajustes de inventário
- Perdas e validades

## Uso

```typescript
import {
  useEstoque,
  useMovimentacoes,
  ProdutosEstoque,
  EstoqueAlertas
} from './estoque'

export default function EstoquePage() {
  const {
    filteredIngredientes,
    loading,
    stats,
    filters,
    setFilter,
    refresh
  } = useEstoque(tenantId)

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="Crítico" value={stats.critico} />
        <KpiCard label="Baixo" value={stats.baixo} />
        <KpiCard label="Valor" value={stats.valor_total} />
      </div>

      {/* Alertas */}
      <EstoqueAlertas ingredientes={filteredIngredientes} />

      {/* Lista de produtos */}
      <ProdutosEstoque
        ingredientes={filteredIngredientes}
        loading={loading}
        onEdit={handleEdit}
        onEntry={handleEntry}
      />
    </div>
  )
}
```

## Próximos Passos

- [ ] Implementar código de barras/QR Code
- [ ] Integração com notas fiscais
- [ ] Previsão de demanda
- [ ] Ponto de pedido automático
- [ ] Curva ABC de produtos
