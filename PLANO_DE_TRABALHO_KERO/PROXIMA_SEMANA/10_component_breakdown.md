# 10 - Quebrar Componentes Grandes

## Descrição do Problema

**Do Relatório de Auditoria:**
> Componentes muito grandes que делают múltiplas responsabilidades. Falta de composição, sulit réutilização, e dificuldade de manutenção e teste.

**Especificações Técnicas:**
- Arquivos > 500 linhas
- Múltiplas responsabilidades no mesmo componente
- Código duplicado entre componentes
- Components aninhados demais

**Componentes Afetados:**
- Pages complexas
- Componentes UI genéricos
- Componentes de formulário

---

## Impacto

### Por Que é Importante Corrigir

1. **Manutenibilidade**: Components menores são mais fáciles de entender
2. **Testabilidade**: Componentes pequenos têm testes mais fáceis
3. **Reutilização**: Componentes compartilháveis
4. **Performance**: Re-render menos

### Risco se Não Corrigido

- **Severidade**: MEDIUM
- **Probabilidade**: Alta
- **Impacto**: Dívida técnica

---

## Solução Técnica

### Etapa 1: Identificar Componentes Grandes

```bash
# Listar por tamanho
wc -l src/**/**/*.tsx | sort -rn | head -20

# Exemplo de componente grande:
# Dashboard.tsx - 800 linhas
# FormPage.tsx - 600 linhas
```

### Etapa 2: Aplicar Padrão

**ANTES (componente grande):**
```tsx
// Dashboard.tsx - 800 linhas
export function Dashboard() {
  const [filtros, setFiltros] = useState({...});
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... 100 linhas de state
  
  useEffect(() => {
    // Fetch dados
    // Processar dados
    // Calcular métricas
  }, []);
  
  // ... 200 linhas de lógica
  
  return (
    <div>
      {/* Header */}
      <header>...</header>
      
      {/* Filtros */}
      <div className="filtros">...</div>
      
      {/* Métricas */}
      <div className="metricas">...</div>
      
      {/* Tabela */}
      <table>...</table>
      
      {/* Modal */}
      <Modal>...</Modal>
    </div>
  );
}
```

**DEPOIS (quebrado):**
```
src/
  components/
    Dashboard/
      Dashboard.tsx          # Apenas composição
      DashboardHeader.tsx     # Header isolated
      FiltrosPanel.tsx        # Filtros isolated
      MetricasGrid.tsx        # Grid de métricas
      TabelaDados.tsx         # Tabela isolated
      ModalDetalhe.tsx        # Modal isolated
      useDashboard.ts        # Lógica isolada em hook
      useDashboardData.ts    # Fetch isolado
```

### Etapa 3: Criar Hooks para Lógica

```typescript
// useDashboard.ts
export function useDashboard(tenantId: string) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({});
  
  // Lógica de fetch
  const fetchDados = async () => {...};
  
  // Lógica de filtragem
  const aplicarFiltros = (filtros) => {...};
  
  // Computed values
  const metricas = useMemo(() => {...}, [dados]);
  
  return {
    dados,
    loading,
    filtros,
    setFiltros,
    metricas,
    fetchDados,
    aplicarFiltros
  };
}
```

### Etapa 4: Criar Componentes Atômicos

```tsx
// MetricasGrid.tsx
interface Metrica {
  label: string;
  value: number;
  trend?: number;
}

interface MetricasGridProps {
  metricas: Metrica[];
}

export function MetricasGrid({ metricas }: MetricasGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {metricas.map(metrica => (
        <MetricaCard key={metrica.label} {...metrica} />
      ))}
    </div>
  );
}

// MetricaCard.tsx
export function MetricaCard({ label, value, trend }: Metrica) {
  return (
    <div className="card">
      <span className="label">{label}</span>
      <span className="value">{formatCurrency(value)}</span>
      {trend && <TrendBadge value={trend} />}
    </div>
  );
}
```

---

## Critérios de Aceitação

### Verificação

- [ ] Nenhum componente > 300 linhas
- [ ] Componentes reutilizáveis
- [ ] Hooks para lógica
- [ ] Testáveis

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Identificar | 1 hora |
| Quebrar componentes | 6 horas |
| Testar | 1 hora |
| **TOTAL** | **8 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `07_tests_setup.md` ( testes ajudam)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |