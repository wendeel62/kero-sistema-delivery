# 🚨 INSTRUÇÕES - Correção RLS (Versão Simplificada)

## ⚡ Método Rápido (1 minuto)

### Opção 1: Usar o arquivo "bloco_unico" (RECOMENDADO)

1. **Acesse**: https://kmtjfapbooqzhysllrbe.supabase.co

2. **Vá para SQL Editor**:
   - Menu lateral → **SQL Editor**

3. **Copie o arquivo**:
   - Abra: `supabase/migrations/0001_fix_rls_produtos_bloco_unico.sql`
   - Selecione tudo (Ctrl+A)
   - Copie (Ctrl+C)

4. **Cole e Execute**:
   - Cole no SQL Editor
   - Clique **RUN ▼** (canto inferior direito)
   - ✅ Pronto!

---

## 📋 O Que Acontece

O SQL faz:
1. Dropa policies antigas (em bloco DO)
2. Cria função `app.current_tenant_id()` atualizada
3. Cria novas policies para `produtos`, `categorias`, `precos_tamanho`
4. Backfill de `user_roles`
5. Exibe mensagem de sucesso

---

## ✅ Validação

Após executar, rode este SQL para validar:

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'produtos';
```

Deve retornar 4 policies.

---

## 🆘 Se Der Erro

### "EXPLAIN only works on a single SQL statement"
**Problema**: Você selecionou apenas parte do SQL ou usou o arquivo errado.

**Solução**: 
- Use o arquivo `0001_fix_rls_produtos_bloco_unico.sql`
- Copie **TODO** o conteúdo (Ctrl+A)
- Não use o arquivo antigo com múltiplos statements separados

### "policy already exists"
**Solução**: Ignore, a policy já foi criada.

### "function already exists"
**Solução**: Ignore, a função já existe.

---

**Arquivos**:
- `0001_fix_rls_produtos_bloco_unico.sql` ← **USE ESTE!**
- `0001_fix_rls_produtos.sql` ← Antigo (vários statements, não use)
