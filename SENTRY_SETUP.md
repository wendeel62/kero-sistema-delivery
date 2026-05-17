# Sentry - Configuração e Uso

## Visão Geral

O [Sentry](https://sentry.io/) foi integrado ao Kero Delivery para:
- 🐛 **Rastreamento de Erros**: Captura automática de erros em produção
- ⚡ **Monitoramento de Performance**: Medição de tempo de carregamento e transações
- 🎥 **Session Replay**: Gravação de sessões para debugging (com privacidade)
- 📊 **Breadcrumbs**: Trilha de navegação e ações do usuário

## Instalação

As dependências já foram instaladas:
```json
{
  "@sentry/react": "^latest",
  "@sentry/tracing": "^latest"
}
```

## Configuração

### 1. Variáveis de Ambiente

Adicione ao seu `.env` (copie do `.env.example`):

```bash
# Sentry DSN (obrigatório)
# Obtenha em: Project Settings > Client Keys (DSN)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Sentry Environment
SENTRY_ENVIRONMENT=development  # development, staging, production

# Sample Rates
SENTRY_TRACES_SAMPLE_RATE=1.0           # 100% das transações
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1  # 10% das sessões
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0 # 100% dos erros
```

### 2. Inicialização (main.tsx)

O Sentry já está configurado em `src/main.tsx`:

```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

### 3. Error Boundary

O App está envolvido com `Sentry.ErrorBoundary`:

```tsx
<Sentry.ErrorBoundary
  fallback={(error, { resetError }) => (
    <ErrorFallback error={error} resetError={resetError} />
  )}
>
  <App />
</Sentry.ErrorBoundary>
```

## Como Usar

### Hook useSentry

Importe o hook para interagir com o Sentry:

```typescript
import { useSentry } from '@/lib/sentry/useSentry'

function MyComponent() {
  const { 
    addBreadcrumb, 
    captureError, 
    setTag, 
    startSpan 
  } = useSentry()

  const handleAction = async () => {
    // Adiciona breadcrumb
    addBreadcrumb('Usuário clicou em botão', { 
      buttonId: 'submit',
      timestamp: Date.now()
    })

    // Inicia span de performance
    const span = startSpan('processData')
    
    try {
      // Sua lógica aqui
      await processData()
    } catch (error) {
      // Captura erro com contexto
      captureError(error, {
        tags: { section: 'checkout' },
        extras: { data: someData }
      })
    } finally {
      span?.end()
    }
  }

  return <button onClick={handleAction}>Ação</button>
}
```

### Breadcrumbs

Adicione trilhas de navegação e ações:

```typescript
import { addBreadcrumb } from '@/lib/sentry'

// Navegação
addBreadcrumb('Navegou para /pedidos', { 
  category: 'navigation' 
})

// Ação do usuário
addBreadcrumb('Adicionou produto ao carrinho', {
  category: 'action',
  data: { productId: '123', quantity: 2 }
})

// API call
addBreadcrumb('Requisição API iniciada', {
  category: 'http',
  data: { url: '/api/pedidos', method: 'POST' }
})
```

### Tags e Contexto

Adicione tags para filtragem:

```typescript
import { setSentryScope } from '@/lib/sentry'

// Define usuário
setSentryScope({
  user: {
    id: 'user-123',
    email: 'user@example.com',
    username: 'joao.silva'
  },
  tags: {
    section: 'pedidos',
    feature: 'checkout'
  },
  extras: {
    cartTotal: 150.50,
    itemsCount: 3
  }
})
```

### Performance

Meça performance de operações:

```typescript
import { startTransaction } from '@/lib/sentry'

async function loadDashboard() {
  const transaction = startTransaction('Load Dashboard', 'navigation')
  
  try {
    const data = await fetchDashboardData()
    return data
  } finally {
    transaction?.end()
  }
}
```

## Recursos

### Error Boundary Personalizado

O componente `ErrorFallback` em `main.tsx` fornece:
- UI amigável de erro
- Botão para tentar novamente
- Exibição do erro em desenvolvimento
- Link para página inicial

### Session Replay

O Session Replay grava a sessão do usuário com:
- ✅ Máscara de texto (privacidade)
- ✅ Bloqueio de mídia
- ✅ Ativação apenas em erros (10% das sessões)

### Performance Monitoring

Métricas automáticas:
- ⏱️ Tempo de carregamento inicial
- 🔄 Navegação entre rotas
- 🌐 Requisições HTTP
- 💾 Operações de banco de dados

### Auto-Contexto

O Sentry automaticamente captura:
- 📱 Dispositivo e navegador
- 🌍 Localização (se disponível)
- 🔗 URL e referrer
- ⏰ Timestamp preciso

## Boas Práticas

### ✅ Faça
```typescript
// Adicione contexto relevante
captureError(error, {
  tags: { section: 'checkout' },
  extras: { step: 'payment' }
})

// Use breadcrumbs para trilha
addBreadcrumb('Usuário preencheu formulário')

// Monitore performance
const span = startSpan('Process Payment')
```

### ❌ Não Faça
```typescript
// Não capture dados sensíveis
addBreadcrumb('Senha: 123456') // ❌

// Não use em desenvolvimento sem necessidade
if (import.meta.env.DEV) {
  console.log('Debug info') // ✅
}
```

## Dashboard Sentry

Acesse o dashboard em: https://sentry.io

### Filtros Úteis
- `is:unresolved` - Erros não resolvidos
- `level:error` - Apenas erros
- `environment:production` - Produção
- `release:1.0.0` - Versão específica

### Alertas

Configure alertas para:
- 📈 Aumento repentino de erros
- 🔥 Erros críticos
- 📉 Queda de performance

## Troubleshooting

### Erro não aparece no Sentry

1. Verifique se o DSN está correto
2. Verifique se `environment` está configurado
3. No desenvolvimento, eventos são logados no console
4. Verifique filtros de `ignoreErrors`

### Session Replay não grava

1. Verifique `replaysSessionSampleRate`
2. Confirme que o navegador suporta
3. Verifique permissões de privacidade

### Performance impact

- Ajuste `tracesSampleRate` para menos de 1.0 em produção
- Use `replaysSessionSampleRate` baixo (0.1 = 10%)

## Links Úteis

- [Documentação Oficial](https://docs.sentry.io/platforms/javascript/)
- [React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/replays/)

## Próximos Passos

1. ✅ Configurar DSN no `.env`
2. ✅ Testar em desenvolvimento
3. ✅ Implementar em produção
4. 📊 Configurar dashboards
5. 🔔 Configurar alertas
6. 👥 Treinar equipe
