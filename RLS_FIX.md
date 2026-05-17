# Correção RLS - Erro ao criar produtos

## Problema
Ao tentar criar um novo produto, o erro ocorre:
```
new row violates row-level security policy for table "produtos"
```

## Causa Raiz
A política RLS (Row-Level Security) na tabela `produtos` exige que o `tenant_id` do INSERT corresponda ao valor retornado por `app.current_tenant_id()`, mas:
1. A função `app.current_tenant_id()` só considera o claim `tenant_id` do JWT ou `auth.uid()`
2. O trigger `handle_new_user_role()` estava inserindo `tenant_id = NULL` em `user_roles`
3. O frontend passa `tenant_id = user.id`, mas a policy espera um valor específico

## Solução

### Opção 1: Automática (Recomendada)
1. Acesse a página de correção: `http://localhost:5173/fix-rls`
2. Clique em "Aplicar Correção Automática"
3. Aguarde a conclusão
4. Volte para `/cardapio-admin` e tente criar um produto

### Opção 2: Manual (Caso a automática falhe)
1. Acesse https://kmtjfapbooqzhysllrbe.supabase.co
2. Faça login no dashboard do Supabase
3. No menu lateral, clique em **SQL Editor**
4. Copie o conteúdo do arquivo `supabase/migrations/fix_rls_produtos.sql`
5. Cole no editor e clique em **Run**
6. Volte para o cardápio e tente criar um produto

## O que a correção faz

1. **Atualiza a função `app.current_tenant_id()`** para também consultar `user_roles.tenant_id`
2. **Cria novas policies** que permitem INSERT/UPDATE/DELETE quando:
   - `tenant_id = auth.uid()` (usuário é o tenant), OU
   - `tenant_id = app.current_tenant_id()` (policy original), OU
   - Usuário é admin/editor do tenant (via `user_roles`)
3. **Backfill** de `user_roles` para definir `tenant_id = user_id` onde for NULL

## Arquivos Modificados

- `src/pages/FixRLSPage.tsx` - Página de correção
- `src/App.tsx` - Rota `/fix-rls` adicionada
- `src/hooks/useCardapioAdmin.ts` - Validação defensiva de `tenantId`
- `supabase/migrations/fix_rls_produtos.sql` - SQL manual de backup

## Teste
Após aplicar a correção:
1. Vá para `/cardapio-admin`
2. Clique em "Novo Produto"
3. Preencha nome, descrição, preço
4. Selecione uma categoria
5. Clique em Salvar
6. ✅ Deve salvar sem erro de RLS

## Em caso de erro persistente

Execute este SQL manualmente no Supabase SQL Editor:

```sql
-- 1. Drop policies antigas
DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

-- 2. Nova policy de INSERT (mais permissiva)
CREATE POLICY produtos_tenant_insert ON public.produtos
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

-- 3. Backfill
UPDATE public.user_roles SET tenant_id = user_id WHERE tenant_id IS NULL;
```
