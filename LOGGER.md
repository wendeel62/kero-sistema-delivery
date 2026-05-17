# Logger - Utilitário de Logging

## Visão Geral

O utilitário de logging do Kero Delivery fornece:
- 📝 **Logs Estruturados**: Níveis de log (debug, info, warn, error)
- 🎯 **Contexto Adicional**: Metadados em cada log
- 🔒 **Segurança**: Dados sensíveis mascarados em produção
- 🎨 **Console Formatado**: Cores e formatação em desenvolvimento
- 📊 **Integração Sentry**: Erros enviados automaticamente em produção
- 🏷️ **Prefixos Personalizados**: Identifica origem dos logs

## Instalação

Já instalado como parte do projeto. Nenhum pacote adicional necessário.

## Uso Básico

```typescript
import { logger } from '@/utils/logger'

// Debug (apenas em desenvolvimento)
logger.debug('Carregando dados', { page: 'home' })

// Info (sempre visível)
logger.info('Usuário logado', { userId: '123' })

// Warn (atenção)
logger.warn('Tentativa de reconexão', { attempt: 3 })

// Error (envia para Sentry em produção)
logger.error('Falha na API', { error, endpoint: '/api/data' })
```

## Níveis de Log

| Nível | Quando Usar | Produção | Desenvolvimento |
|-------|-------------|----------|-----------------|
| `debug` | Debug detalhado | ❌ Oculto | ✅ Visível |
| `info` | Informações gerais | ✅ Visível | ✅ Visível |
| `warn` | Avisos, não críticos | ✅ Visível | ✅ Visível |
| `error` | Erros, falhas | ✅ Visível + Sentry | ✅ Visível + Sentry |

## Recursos

### 1. Logger com Prefixo Personalizado

```typescript
import { createLogger } from '@/utils/logger'

const apiLogger = createLogger('API')
const dbLogger = createLogger('Database')
const uiLogger = createLogger('UI')

apiLogger.info('Requisição iniciada')
// [API] [10:30:45] INFO - Requisição iniciada
```

### 2. Contexto Adicional

```typescript
logger.info('Pedido criado', {
  orderId: '123',
  userId: '456',
  total: 150.50,
  items: 3,
})
// [Kero] [10:30:45] INFO - Pedido criado
// {
//   "orderId": "123",
//   "userId": "456",
//   "total": 150.50,
//   "items": 3
// }
```

### 3. Configuração Personalizada

```typescript
import { logger } from '@/utils/logger'

logger.configure({
  prefix: 'MeuApp',
  minLevel: 'warn', // Apenas warn e error
  colors: true,
})
```

### 4. Integração com Sentry

Em produção, logs de erro são automaticamente enviados para o Sentry:

```typescript
// Em produção, este erro é enviado para o Sentry
logger.error('Falha crítica', { error, userId: '123' })
```

## Exemplos de Uso

### Em Hooks do React

```typescript
import { useEffect } from 'react'
import { createLogger } from '@/utils/logger'

const componentLogger = createLogger('ProductList')

export function ProductList() {
  useEffect(() => {
    componentLogger.info('Componente montado')
    return () => componentLogger.info('Componente desmontado')
  }, [])

  const handleAddToCart = (product: Product) => {
    componentLogger.info('Adicionou ao carrinho', {
      productId: product.id,
      name: product.name,
      price: product.price,
    })
  }

  return null
}
```

### Em Serviços de API

```typescript
import { createLogger } from '@/utils/logger'

const apiLogger = createLogger('ApiService')

export async function fetchProducts() {
  try {
    apiLogger.info('Buscando produtos')
    
    const response = await fetch('/api/products')
    const data = await response.json()
    
    apiLogger.info('Produtos carregados', { count: data.length })
    
    return data
  } catch (error) {
    apiLogger.error('Erro ao buscar produtos', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
```

### Em Fluxos de Negócio

```typescript
import { createLogger } from '@/utils/logger'

const orderLogger = createLogger('OrderFlow')

export async function finalizeOrder(order: Order) {
  const { id, userId, total } = order

  try {
    orderLogger.info('Iniciando finalização', { orderId: id, userId, total })

    // Validação
    orderLogger.info('Validando pedido', { orderId: id })
    await validateOrder(order)

    // Pagamento
    orderLogger.info('Processando pagamento', { orderId: id, total })
    await processPayment(order)

    // Confirmação
    orderLogger.info('Confirmando pedido', { orderId: id })
    await confirmOrder(order)

    orderLogger.info('Pedido finalizado', { orderId: id })
  } catch (error) {
    orderLogger.error('Erro na finalização', {
      orderId: id,
      error: error instanceof Error ? error : new Error(String(error)),
    })
    throw error
  }
}
```

### Em Middlewares

```typescript
import { createLogger } from '@/utils/logger'

const middlewareLogger = createLogger('Middleware')

export function loggingMiddleware() {
  return async (req: Request, res: Response, next: () => void) => {
    const start = Date.now()
    const { method, url } = req

    middlewareLogger.info(`${method} ${url} - Iniciando`)

    res.on('finish', () => {
      const duration = Date.now() - start
      middlewareLogger.info(`${method} ${url} - ${res.status} (${duration}ms)`)
    })

    try {
      await next()
    } catch (error) {
      middlewareLogger.error(`${method} ${url} - Erro`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
```

## Boas Práticas

### ✅ Faça

```typescript
// Use contexto significativo
logger.info('Ação do usuário', {
  userId: user.id,
  action: 'click_button',
  target: 'submit_order',
})

// Use níveis apropriados
logger.debug('Detalhes internos')     // Debug detalhado
logger.info('Evento normal')          // Informação geral
logger.warn('Atenção necessária')     // Aviso
logger.error('Falha ocorreu')         // Erro

// Use prefixes para identificação
const apiLogger = createLogger('API')
apiLogger.info('Requisição')
```

### ❌ Não Faça

```typescript
// ❌ Dados sensíveis
logger.info('Login', { password: '123456' })

// ❌ Mensagens genéricas
logger.error('Erro') // Sem contexto!

// ❌ Excesso de logs em loop
for (const item of items) {
  logger.debug('Processando', { item }) // Pode poluir o console
}

// ✅ Alternativa
logger.debug('Processando itens', { count: items.length, items: items.slice(0, 5) })
```

## Configuração

### Variáveis de Ambiente

```bash
# Nível mínimo de log
VITE_LOG_LEVEL=debug  # development
VITE_LOG_LEVEL=info   # production
```

### Configuração Inicial

```typescript
// main.tsx
import { logger } from '@/utils/logger'

logger.configure({
  prefix: 'Kero',
  minLevel: import.meta.env.DEV ? 'debug' : 'info',
  colors: import.meta.env.DEV,
})
```

## Saída do Console

### Desenvolvimento

```
[Kero] [10:30:45] DEBUG - Iniciando carregamento { page: 'home' }
[Kero] [10:30:46] INFO - Dados carregados { count: 100 }
[Kero] [10:30:47] WARN - Cache desatualizado { age: 3600 }
[Kero] [10:30:48] ERROR - Falha na API { error: 'Timeout' }
```

### Produção

```
[Kero] [10:30:47] WARN - Cache desatualizado
[Kero] [10:30:48] ERROR - Falha na API (enviado para Sentry)
```

## Logs Armazenados

Em produção, os logs são armazenados na sessionStorage:

```typescript
// Recuperar logs armazenados
const logs = logger.getStoredLogs()
console.log(logs)

// Limpar logs
logger.clearStoredLogs()
```

## Integrações

### Sentry

Logs de erro são automaticamente integrados com Sentry (se configurado).

### Performance

```typescript
// Medir tempo de operação
const start = performance.now()
// ... operação
const duration = performance.now() - start
logger.info('Operação concluída', { duration: `${duration.toFixed(2)}ms` })
```

## Troubleshooting

### Logs não aparecem

1. Verifique o nível mínimo configurado
2. Em produção, debug é ocultado por padrão
3. Verifique se `import.meta.env` está configurado

### Sentry não recebe erros

1. Verifique se DSN está configurado
2. Verifique se `import.meta.env.PROD` é true
3. Teste em ambiente de produção

## Arquivos Relacionados

- [`src/utils/logger.ts`](./src/utils/logger.ts) - Implementação principal
- [`src/utils/logger-examples.ts`](./src/utils/logger-examples.ts) - Exemplos de uso
- [`SENTRY_SETUP.md`](./SENTRY_SETUP.md) - Configuração do Sentry
