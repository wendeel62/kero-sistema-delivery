# ⚠️ IMPORTANTE: Execução Manual Necessária

## Por que a automação não funcionou?

A API REST do Supabase **não permite** execução de comandos DDL (DROP/CREATE POLICY) por motivos de segurança. 

A única maneira de aplicar correções de RLS é via **SQL Editor** no dashboard do Supabase.

---

## ✅ Como Aplicar a Correção (2 minutos)

### Método 1: Via Dashboard Web (Recomendado)

1. **Acesse**: https://kmtjfapbooqzhysllrbe.supabase.co
2. **SQL Editor**: No menu lateral esquerdo, clique em **"SQL Editor"**
3. **Nova Query**: Clique em **"New query"** (se necessário)
4. **Copie o SQL**: 
   - Abra: `supabase/migrations/0001_fix_rls_produtos.sql`
   - Selecione tudo (Ctrl+A)
   - Copie (Ctrl+C)
5. **Cole e Execute**:
   - Cole no editor (Ctrl+V)
   - Clique em **"RUN ▼"** (canto inferior direito)
6. **Aguarde**: A execução deve levar menos de 5 segundos
7. **Verifique**: Deve aparecer "Correção RLS aplicada com sucesso!"

### Método 2: Via psql (Alternativa)

Se preferir usar linha de comando:

```bash
# Instale PostgreSQL client ou use psql
psql "postgresql://postgres.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/0001_fix_rls_produtos.sql
```

---

## 📋 Arquivos Disponíveis

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/0001_fix_rls_produtos.sql` | Migration SQL completa |
| `src/pages/FixRLSPage.tsx` | Página `/fix-rls` com instruções |
| `INSTRUCOES_RLS_FIX.md` | Instruções detalhadas |
| `RESUMO_CORRECAO.md` | Detalhes técnicos |
| `LEIA-ME-URGENTE.md` | Guia rápido |

---

## ✅ Validação Pós-Correção

Após executar o SQL, valide:

```sql
-- Verificar policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'produtos';

-- Deve retornar 4 policies
-- produtos_tenant_insert, select, update, delete
```

---

## 🚀 Próximos Passos

1. **Execute o SQL** no Supabase SQL Editor
2. **Valide** as 4 policies criadas
3. **Teste** criando um produto em `/cardapio-admin`
4. **Compartilhe** feedback se funcionou!

---

**Dúvidas?** Consulte `LEIA-ME-URGENTE.md` para instruções rápidas.
