# 06 - Correção do useRealtime

## Descrição do Problema

**Do Relatório de Auditoria:**
> O hook `useRealtime` não está sendo usado corretamente em diversos componentes, ou está implementado de forma que pode causar memory leaks e comportamentos inesperados.订阅 não são limpos adequadamente quando componentes desmontam.

**Especificações Técnicas:**
- `useRealtime` ou similar não faz cleanup adequado
- Múltiplas subscriptions para o mesmo canal
- Falta unsubscribe em unmount
-memory leaks em long-lived components
- Não há tratamento de reconexão

**Problemas Identificados:**
- Componentes que não limpam subscriptions
- Múltiplas conexões Realtime ativas
- Falta de throttle em atualizações frequentes
- Não tratamento de erros de conexão

---

## Impacto

### Por Que é Importante Corrigir

1. **Performance**: Memory leaks consomem memória gradualmente
2. **Estabilidade**: Conexões abandonadas podem causar erros
3. **Custo**: Conexões Realtime custam recursos do servidor
4. **UX**: Dados desatualizados ou duplicados na UI

### Risco se Não Corrigido

- **Severidade**: HIGH
- **Probabilidade**: Alta (acontece em uso prolongado)
- **Impacto**: UI freeze, alto consumo de memória

---

## Arquivos Afetados

### Áreas com useRealtime

1. **Componentes**:
   - `src/components/*/Table/*.tsx`
   - `src/components/Dashboard/*.tsx`
   - `src/components/Realtime*.tsx`

2. **Hooks**:
   - `src/hooks/useRealtime.ts`
   - `src/hooks/use*.ts`

---

## Solução Técnica

### Etapa 1: Criar Hook useRealtime Corrigido

```typescript
// src/hooks/useRealtime.ts
import { useEffect, useRef, useCallback } from 'react';
import { createClient, RealtimeChannel, RealtimePostgresChangesFilter } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  enabled?: boolean;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);
  
  // Cleanup adequado
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (options.enabled === false) {
      return cleanup;
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    // Configurar filtro
    const filter: RealtimePostgresChangesFilter = {
      event: '*',
      schema: 'public',
      table: options.table,
      filter: options.filter
    };
    
    // Criar canal
    const channel = supabase.channel(`realtime-${options.table}-${Date.now()}`)
      .on(
        'postgres_changes',
        filter,
        (payload) => {
          if (!mountedRef.current) return;
          
          const { eventType } = payload;
          if (eventType === 'INSERT' && options.onInsert) {
            options.onInsert(payload.new);
          } else if (eventType === 'UPDATE' && options.onUpdate) {
            options.onUpdate(payload.new);
          } else if (eventType === 'DELETE' && options.onDelete) {
            options.onDelete(payload.old);
          }
        }
      )
      .subscribe();
    
    channelRef.current = channel;
    
    // Cleanup no unmount
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [options.table, options.filter, options.enabled, cleanup]);
  
  return { cleanup };
}
```

### Etapa 2: Componente com Cleanup Correto

```typescript
// src/components/AgentesList.tsx
import { useState, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

export function AgentesList({ tenantId }: { tenantId: string }) {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  
  // Fetch inicial
  useEffect(() => {
    async function fetchAgentes() {
      const { data } = await supabase
        .from('agentes')
        .select('*')
        .eq('tenant_id', tenantId);
      setAgentes(data || []);
    }
    fetchAgentes();
  }, [tenantId]);
  
  // Realtime com cleanup automático
  useRealtime({
    table: 'agentes',
    filter: `tenant_id=eq.${tenantId}`,
    enabled: !!tenantId,
    onInsert: (newAgente) => {
      setAgentes(prev => [...prev, newAgente]);
    },
    onUpdate: (updatedAgente) => {
      setAgentes(prev => 
        prev.map(a => a.id === updatedAgente.id ? updatedAgente : a)
      );
    },
    onDelete: (deletedAgente) => {
      setAgentes(prev => prev.filter(a => a.id !== deletedAgente.id));
    }
  });
  
  // NÃO precisa de cleanup manual aqui
  // O hook faz automaticamente!
  
  return <AgentesTable data={agentes} />;
}
```

### Etapa 3: Evitar Múltiplas Subscriptions

```typescript
// Uso CORRETO - uma subscription por tabela por componente
useRealtime({
  table: 'agentes',
  filter: `tenant_id=eq.${tenantId}`,
  onInsert: handleInsert,
  onUpdate: handleUpdate,
  onDelete: handleDelete
});

// EVITAR - múltiplas subscriptions para a mesma tabela
useRealtime({ table: 'agentes', onInsert: handleInsert });
useRealtime({ table: 'agentes', onUpdate: handleUpdate }); // PROBLEMA!
```

### Etapa 4: Tratamento de Reconexão

```typescript
// Adicionar no hook
import { useState } from 'react';

export function useRealtimeWithRetry(options: UseRealtimeOptions) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // ... código anterior ...
  
  useEffect(() => {
    const channel = supabase.channel(...)
      .on('postgres_changes', filter, handler)
      .subscribe((status) => {
        setStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });
    
    // Reconectar automaticamente se desconectar
    const handleStatusChange = (status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setTimeout(() => {
          channel.subscribe();
        }, 3000); // Retry após 3s
      }
    };
    
    return cleanup;
  }, []);
  
  return { status };
}
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] useRealtime faz cleanup adequado em unmount
- [ ] Não há múltiplas subscriptions
- [ ] Tratamento de reconexão implementado
- [ ] Não há memory leaks em long-lived components

### Teste de Performance

```bash
# Verificar conexões ativas
# (via Dashboard do Supabase ou logs)
# Deve haver no máximo 1 por componente ativo
```

### Checklist de Qualidade

- [ ] Comportamento consistente
- [ ] Código limpo e simples
- [ ] Funciona em casos de borda

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Criar hook corrigido | 1 hora |
| Atualizar componentes | 2 horas |
| Testes de stress | 1 hora |
| Documentação | 30 min |
| **TOTAL** | **4.5 horas** |

---

## Dependências

### Pré-Requisitos

- Nenhum

### unlockedBy

- Complementa: `13_performance_optimization.md`

---

## Referências

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Hooks - Cleanup](https://react.dev/learn/lifecycle-of-effects)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |