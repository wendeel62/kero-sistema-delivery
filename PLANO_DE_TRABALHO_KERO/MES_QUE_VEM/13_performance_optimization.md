# 13 - Otimizações de Performance

## Descrição do Problema

**Do Relatório de Auditoria:**
> Diversas oportunidades de otimização de performance não exploradas. Queries não otimizadas, assets não compressionados, falta de caching, e carregamento de dados desnecessários.

**Especificações Técnicas:**
- Imagens grandes sem optimization
- Dados sendo transferidos innecesariamente
- Sem caching de queries
- Não há virtualização em listas grandes
- Bundle size pode ser reduzido

---

## Impacto

### Por Que é Importante Corrigir

1. **UX**: Carregamento mais rápido
2. **Custo**: Menor uso de bandwidth
3. **SEO**: Melhora no ranking

### Risco se Não Corrigido

- **Severidade**: MEDIUM
- **Probabilidade**: Média
- **Impacto**: UX ruim em conexões lentas

---

## Solução Técnica

### 1. Otimizar Imagens

```typescript
// Usar next/image ou similar
import { Image } from '@/components/ui/Image';

<Image
  src="/avatar.jpg"
  width={200}
  height={200}
  format="webp"
  quality={80}
/>
```

### 2. Virtualizar Listas

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

functionListaLonga({ items }) {
  const parentRef = useRef(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10
  });
  
  return (
    <div ref={parentRef} className="h-[500px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.key} style={{
            position: 'absolute',
            top: virtualRow.start,
            height: virtualRow.size
          }}>
            {items[virtualRow.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Implementar Cache

```typescript
// src/lib/query-cache.ts
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function getCached(key: string) {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setCache(key: string, data: any) {
  queryCache.set(key, { data, timestamp: Date.now() });
}
```

### 4. Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const DashboardLazy = lazy(() => import('@/features/dashboard/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardLazy />
    </Suspense>
  );
}
```

---

## Critérios de Aceitação

### Verificação

- [ ] Imagens otimizadas
- [ ] Listas virtualizadas
- [ ] Cache implementado
- [ ] Bundle menor

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Otimizar imagens | 2 horas |
| Virtualização | 2 horas |
| Cache | 2 horas |
| **TOTAL** | **6 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `04_n_plus_one_queries.md`
- **Requer**: `06_realtime_dependencies.md`

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |