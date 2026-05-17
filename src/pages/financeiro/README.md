# Financeiro Page - Refatoração

## Visão Geral

A página Financeiro foi refatorada em componentes modulares com clara separação entre:
- **Operacional**: Lançamentos do dia a dia
- **Analítico**: Relatórios e dashboards
- **Conciliação**: Integração bancária

## Estrutura

```
src/pages/financeiro/
├── index.ts                    # Exporta todos os componentes
├── types.ts                    # Tipos TypeScript
├── useLancamentos.ts           # Hook de lançamentos
├── useRelatorios.ts            # Hook de relatórios
├── RelatoriosFinanceiros.tsx   # Dashboard e relatórios
├── LancamentosForm.tsx         # Formulário de lançamentos
├── ConciliacaoBancaria.tsx     # Conciliação
├── FluxoCaixa.tsx              # Fluxo de caixa
├── ContasPagarReceber.tsx      # Contas
└── README.md                   # Documentação
```

## Separação de Responsabilidades

| Camada | Componente | Descrição |
|--------|------------|-----------|
| **Operacional** | `useLancamentos` | CRUD de lançamentos |
| **Operacional** | `LancamentosForm` | Formulários |
| **Operacional** | `ContasPagarReceber` | Gestão de contas |
| **Analítico** | `useRelatorios` | Cálculos e métricas |
| **Analítico** | `RelatoriosFinanceiros` | Dashboard |
| **Analítico** | `FluxoCaixa` | Projeções |
| **Conciliação** | `ConciliacaoBancaria` | Extratos |

## Funcionalidades Implementadas

### 1. Controle de Metas

```typescript
interface MetaFaturamento {
  periodo: 'dia' | 'semana' | 'mes'
  valor: number
  atingido: number
  percentual: number
}
```

### 2. Gestão de Contas

- Contas a pagar
- Contas a receber
- Parcelamento
- Vencimentos

### 3. Fluxo de Caixa

- Projeção diária/semanal/mensal
- Realizado vs Previsto
- Conciliação automática

## Uso

```typescript
import {
  useLancamentos,
  useRelatorios,
  RelatoriosFinanceiros,
  FluxoCaixa
} from './financeiro'

export default function FinanceiroPage() {
  const {
    filteredLancamentos,
    loading,
    addLancamento,
    baixarBaixa
  } = useLancamentos(tenantId)

  const {
    relatorio,
    fluxoCaixa
  } = useRelatorios(tenantId)

  return (
    <div>
      {/* Dashboard */}
      <RelatoriosFinanceiros
        relatorio={relatorio}
        loading={loading}
      />

      {/* Fluxo de Caixa */}
      <FluxoCaixa
        itens={fluxoCaixa}
        loading={loading}
      />
    </div>
  )
}
```

## Próximos Passos

- [ ] Integração com bancos (Open Finance)
- [ ] DRE gerencial completo
- [ ] Fluxo de caixa projetado
- [ ] Centro de custo
- [ ] Orçamento x Realizado
