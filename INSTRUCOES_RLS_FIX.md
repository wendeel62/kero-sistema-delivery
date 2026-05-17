# 🚀 Instruções para Corrigir Erro RLS - PRODUTOS

## Problema
Erro ao criar produto: `new row violates row-level security policy for table "produtos"`

## Solução Imediata (2 minutos)

### Passo 1: Acessar Supabase Dashboard
1. Abra: **https://kmtjfapbooqzhysllrbe.supabase.co**
2. Faça login com sua conta

### Passo 2: SQL Editor
1. No menu lateral esquerdo, clique em **"SQL Editor"** (ícone de arquivo SQL)
2. Clique em **"New query"** ou **"SQL Editor"** novamente

### Passo 3: Executar SQL de Correção
1. Copie TODO o conteúdo do arquivo: `supabase/migrations/fix_rls_produtos.sql`
2. Cole no editor SQL
3. Clique no botão **"RUN ▼"** (canto inferior direito)
4. Aguarde a mensagem "Correção RLS aplicada com sucesso!"

### Passo 4: Testar
1. Volte para o sistema: `http://localhost:5173/cardapio-admin`
2. Clique em "Novo Produto"
3. Preencha e salve
4. ✅ Deve funcionar sem erro de RLS!

---

## O que a correção faz?

1. **Remove policies antigas** que causavam o erro
2. **Cria função `app.current_tenant_id()`** mais flexível que:
   - Lê o `tenant_id` do JWT
   - Consulta `user_roles` se não tiver no JWT
   - Fallback para `auth.uid()`
3. **Recreia policies** que permitem INSERT quando:
   - `tenant_id = auth.uid()` (usuário é o tenant), OU
   - Usuário é admin/editor do tenant
4. **Backfill** de `user_roles` para definir `tenant_id = user_id`

---

## Em Caso de Dúvidas

O arquivo completo está em: `supabase/migrations/fix_rls_produtos.sql`

Se preferir, pode colar este SQL diretamente no Supabase Dashboard.

---

## URLs Úteis
- Supabase Dashboard: https://kmtjfapbooqzhysllrbe.supabase.co
- Cardápio Admin: http://localhost:5173/cardapio-admin
