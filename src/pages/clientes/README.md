# Clientes Page - Refatoração

## Visão Geral

A página de Clientes foi refatorada em componentes modulares com formulários separados da listagem, validação Zod e estrutura preparada para paginação server-side.

## Estrutura

```
src/pages/clientes/
├── index.ts                    # Exporta todos os componentes
├── types.ts                    # Tipos TypeScript
├── useClientes.ts              # Hook de gerenciamento
├── ClientesTable.tsx           # Tabela de listagem
├── ClienteForm.tsx             # Formulário de cadastro/edição
├── ClienteDetails.tsx          # Detalhes do cliente
├── ClienteHistorico.tsx        # Histórico de pedidos
├── ClientesFilters.tsx         # Filtros e busca
└── README.md                   # Documentação
```

## Componentes

### 1. `useClientes` (Hook)

Hook principal para gerenciamento de clientes.

```typescript
const {
  clientes,
  filteredClientes,
  loading,
  stats,
  filters,
  setSearchTerm,
  setFilterPerfil,
  refresh
} = useClientes(tenantId)
```

**Funcionalidades:**
- Carregamento de clientes
- Filtros combinados (busca + perfil)
- Estatísticas (total, VIP, recorrentes, novos)
- Memoização para performance

### 2. `ClientesTable`

Tabela de listagem de clientes.

**Props:**
- `clientes`: Lista de clientes
- `loading`: Estado de carregamento
- `onOpenDrawer`: Callback para abrir detalhes

**Features:**
- Badge de perfil colorido
- Avatar com inicial
- Links para ações rápidas
- Estados: loading, vazio

### 3. `ClienteForm`

Formulário de cadastro/edição com validação Zod.

**Recursos:**
- Validação em tempo real
- Máscaras de input (telefone, CEP)
- Busca de CEP automática
- Estados: salvando, erro, sucesso

### 4. `ClienteDetails`

Drawer lateral com detalhes completos.

**Seções:**
- Avatar e informações básicas
- Stats (pontos, cashback)
- Estatísticas de compra
- Observações editáveis
- Histórico de pedidos
- Ações rápidas (WhatsApp, etc)

### 5. `ClienteHistorico`

Histórico de pedidos do cliente.

**Features:**
- Lista de pedidos com data e valor
- Estado de loading
- Empty state

### 6. `ClientesFilters`

Filtros e barra de busca.

**Recursos:**
- Busca por nome/telefone
- Filtros de perfil (todos, novo, recorrente, VIP)
- Design responsivo

## Validação com Zod

O schema de validação está em `src/schemas/clienteSchema.ts`:

```typescript
import { z } from 'zod'

export const clienteSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional(),
  data_nascimento: z.string().optional(),
})
```

## Uso

```typescript
import {
  useClientes,
  ClientesTable,
  ClienteForm,
  ClienteDetails,
  ClientesFilters
} from './clientes'

export default function ClientesPage() {
  const {
    filteredClientes,
    loading,
    stats,
    filters,
    setSearchTerm,
    setFilterPerfil,
    refresh
  } = useClientes(tenantId)

  return (
    <div>
      <h1>Clientes</h1>
      
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="VIP" value={stats.vip} />
        <KpiCard label="Recorrentes" value={stats.recorrentes} />
        <KpiCard label="Novos" value={stats.novos} />
      </div>

      {/* Filtros */}
      <ClientesFilters
        searchTerm={filters.searchTerm}
        filterPerfil={filters.filterPerfil}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilterPerfil}
      />

      {/* Tabela */}
      <ClientesTable
        clientes={filteredClientes}
        loading={loading}
        onOpenDrawer={handleOpenDrawer}
      />
    </div>
  )
}
```

## Separação de Responsabilidades

| Componente | Responsabilidade |
|------------|-----------------|
| `useClientes` | Gerenciamento de estado e dados |
| `ClientesTable` | Listagem em tabela |
| `ClienteForm` | Formulários (criar/editar) |
| `ClienteDetails` | Visualização de detalhes |
| `ClientesFilters` | Filtros e busca |

## Próximos Passos

- [ ] Implementar paginação server-side
- [ ] Adicionar ordenação por colunas
- [ ] Exportar lista para CSV/Excel
- [ ] Bulk actions (excluir múltiplos)
- [ ] Filtros avançados (período, valor gasto)
