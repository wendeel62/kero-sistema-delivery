# 11 - Implementar Error Boundaries

## Descrição do Problema

**Do Relatório de Auditoria:**
> A aplicação não possui Error Boundaries adequados. Qualquer erro em um componente pode causar tela branca da morte (white screen of death), prejudicando experiência do usuário e dificultando debug.

**Especificações Técnicas:**
- Falta Error Boundary global
- Falta Error Boundary por área
- Erros não são logados adequadamente
- Usuários não recebem feedback útil

---

## Impacto

### PorQue é Importante Corrigir

1. **UX**: Usuário vê mensagem amigável
2. **Debug**: Erros são logados
3. **Resiliência**: App não quebra completamente

### Risco se Não Corrigido

- **Severidade**: MEDIUM
- **Probabilidade**: Alta
- **Impacto**: Péssima experiência do usuário

---

## Solução Técnica

### Etapa 1: Error Boundary Global

```tsx
// src/components/ErrorBoundary/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou:', error, errorInfo);
    // Enviar para serviço de error tracking
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

### Etapa 2: UI de Erro

```tsx
// src/components/ErrorBoundary/ErrorFallback.tsx
interface ErrorFallbackProps {
  error: Error | null;
  resetError?: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="error-fallback">
      <h1>Algo deu errado</h1>
      <p>Pedimos desculpas pelo inconvenience. Tente novamente.</p>
      {process.env.NODE_ENV === 'development' && (
        <pre>{error?.message}</pre>
      )}
      {resetError && (
        <button onClick={resetError}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
```

### Etapa 3: Aplicar no App

```tsx
// src/App.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorFallback } from '@/components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Router />
    </ErrorBoundary>
  );
}
```

### Etapa 4: Error Boundaries Específicos

```tsx
// Dashboard pode ter seu próprio error boundary
<ErrorBoundary>
  <DashboardChart />
</ErrorBoundary>

// Área crítica
<ErrorBoundary fallback={<TabelaVazia message="Erro ao carregar dados" />}>
  <TabelaDados />
</ErrorBoundary>
```

---

## Critérios de Aceitação

### Verificação

- [ ] Error Boundary global implementado
- [ ] UI de erro amigável
- [ ] Erros são logados
- [ ] Botão de retry funciona

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Criar boundary | 1 hora |
| Criar UI | 1 hora |
| Aplicar no App | 1 hora |
| **TOTAL** | **3 horas** |

---

## Dependências

### Pré-Requisitos

- Nenhum

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |