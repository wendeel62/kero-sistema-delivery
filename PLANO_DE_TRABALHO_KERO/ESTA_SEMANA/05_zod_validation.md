# 05 - Implementação de Validação de Dados com Zod

## Descrição do Problema

**Do Relatório de Auditoria:**
> Falta validação rigorosa de dados em diversas partes da aplicação. Dados são aceitos e processados sem validação de schema ou tipo, levando a dados inválidos no banco e erros emruntime. O Zod está instalado mas subutilizado.

**Especificações Técnicas:**
- Zod está em package.json mas não é usado consistentemente
- Input de usuários não é validado antes de enviar ao banco
- Respostas da API não são validadas (confiança excessiva em dados)
- Não há validação de type em Edge Functions inputs
- Falta schema de validação para DTOs

**Pontos de Falta:**
- Formulários sem validação Zod
- Edge Functions recebem qualquer input
- Dados do banco não são validados ao ler

---

## Impacto

### Por Que é Importante Corrigir

1. **Integridade**: Dados inválidos não entram no banco
2. ** Segurança**: Previne SQL injection, XSS (devem ser sanitizados)
3. **Debugging**: Erros claros em vez de crashes
4. **DX**: Validação automática = menos código manual

### Risco se Não Corrigido

- **Severidade**: HIGH
- **Probabilidade**: Alta
- **Impacto**: Dados corruptos, erros difíciles de debugar

---

## Arquivos Afetados

### Áreas com Falta de Validação

1. **Forms**:
   - `src/components/forms/*.tsx`
   - `src/pages/*/Form.tsx`

2. **Edge Functions**:
   - `supabase/functions/*/index.ts`

3. **Hooks**:
   - `src/hooks/use*.ts`

---

## Solução Técnica

### Etapa 1: Criar Schemas Centralizados

```typescript
// src/schemas/index.ts
import { z } from 'zod';

// Schema base
export const idSchema = z.string().uuid();

export const emailSchema = z.string().email();

// Agente schema
export const agenteSchema = z.object({
  nome: z.string().min(2).max(100),
  email: emailSchema,
  telefone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  cargo: z.enum(['atendente', 'admin', 'gerente']),
  ativo: z.boolean().default(true)
});

export const agenteCreateSchema = agenteSchema.omit({ ativo: true });
export const agenteUpdateSchema = agenteSchema.partial();

// Tenant schema
export const tenantSchema = z.object({
  nome: z.string().min(2).max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  plano: z.enum(['free', 'pro', 'enterprise']),
  max_usuarios: z.number().int().positive()
});
```

### Etapa 2: Validar Input de Forms

```typescript
// src/components/forms/AgenteForm.tsx
import { agenteCreateSchema } from '@/schemas';

export function AgenteForm() {
  const form = useForm({
    resolver: zodResolver(agenteCreateSchema)
  });
  
  const onSubmit = form.handleSubmit(async (data) => {
    // data já está validado!
    await createAgente(data);
  });
}
```

### Etapa 3: Validar Edge Functions

```typescript
// supabase/functions/create-agente/index.ts
import { z } from 'zod';

const createAgenteSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  cargo: z.enum(['atendente', 'admin', 'gerente'])
});

Deno.serve(async (req) => {
  const body = await req.json();
  
  // Validar input
  const result = createAgenteSchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({
      error: 'VALIDATION_ERROR',
      details: result.error.flatten()
    }), { status: 400 });
  }
  
  const { nome, email, cargo } = result.data;
  // ...continuar com criação
});
```

### Etapa 4: Validar Resposta da API

```typescript
// src/lib/api-utils.ts
import { agenteSchema } from '@/schemas';

export async function fetchAgentes() {
  const { data, error } = await supabase.from('agentes').select('*');
  
  if (error) throw error;
  
  // Validar dados recebidos
  const result = z.array(agenteSchema).safeParse(data);
  if (!result.success) {
    console.error('Dados inválidos do banco:', result.error);
    throw new Error('INVALID_DATA from database');
  }
  
  return result.data;
}
```

### Etapa 5: Wrapper para Validação Automática

```typescript
// src/lib/with-validation.ts
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error.message}`);
    }
    return result.data;
  };
}

// Uso
const validateAgente = withValidation(agenteSchema);
const agente = validateAgente(dbResult);
```

---

## Critérios de Aceitação

### Verificação de Correção

- [ ] Todos os inputs de forms são validados com Zod
- [ ] Todas as Edge Functions validam input
- [ ] Dados do banco são validados ao ler
- [ ] Erros de validação são user-friendly

### Teste de Segurança

```bash
# Tentar enviar dados inválidos
curl -X POST "https://api.supabase.co/functions/v1/create-agente" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nome": "x", "email": "invalid"}'
# Result: 400 com erros claros
```

### Checklist de Qualidade

- [ ] Schemas centralizados em um lugar
- [ ] Reutilização entre form e API
- [ ] Mensagens de erro úteis

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
| Criar schemas base | 1 hora |
| Aplicar em forms | 1.5 horas |
| Aplicar em Edge Functions | 1.5 horas |
| Validar dados do banco | 1 hora |
| **TOTAL** | **5 horas** |

---

## Dependências

### Pré-Requisitos

- Nenhum

### unlockedBy

- Complementa: `07_tests_setup.md` (validação ajuda em testes)

---

## Referências

- [Zod Documentation](https://zod.dev/)
- [React Hook Form + Zod](https://react-hook-form.com/docs/useform#resolver)

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |