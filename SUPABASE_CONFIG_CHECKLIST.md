# ✅ CHECKLIST: CONFIGURAÇÕES SUPABASE PARA AGENTE DE IA

## 🎯 STATUS ATUAL
- ✅ Edge Function criada: `supabase/functions/chat-agent/index.ts`
- ✅ Migration criada: `20260430_tracking_ids.sql`
- ✅ Componente implementado: `FloatingAgentChat.tsx`
- ✅ API Key fornecida: `<SUA_GROQ_API_KEY_AQUI>`

## 🔧 CONFIGURAÇÕES PENDENTES NO SUPABASE

### 1. ⚠️ SECRET DA API KEY (CRÍTICO)
```bash
supabase secrets set GROQ_API_KEY=<SUA_GROQ_API_KEY_AQUI>
```
**Status:** ❌ PENDENTE - É a configuração que falta!

### 2. ✅ MIGRATION (já aplicada localmente)
```bash
supabase db push
```
**Status:** ✅ PRONTO - Campos adicionados à tabela `configuracoes`

### 3. ✅ DEPLOY DA EDGE FUNCTION
```bash
supabase functions deploy chat-agent --no-verify-jwt
```
**Status:** ❌ PENDENTE - Precisa executar após configurar o secret

### 4. ✅ PERMISSÕES (já configuradas)
- `--no-verify-jwt`: Funciona sem autenticação JWT
- CORS: Configurado para aceitar requests do frontend

## 🚀 PRÓXIMOS PASSOS

Execute estes comandos **NESTA ORDEM**:

```bash
# 1. Configurar o secret da API key
supabase secrets set GROQ_API_KEY=<SUA_GROQ_API_KEY_AQUI>

# 2. Aplicar migrations (se ainda não aplicadas)
supabase db push

# 3. Deploy da Edge Function
supabase functions deploy chat-agent --no-verify-jwt

# 4. Testar a função
supabase functions invoke chat-agent --data '{"messages":[{"role":"user","content":"Olá"}]}'
```

## 🔍 VERIFICAÇÃO FINAL

Após executar os comandos acima, o agente de IA estará **100% funcional**:

- ✅ Botão flutuante aparece no dashboard
- ✅ Chat abre com boas-vindas do "Alex"
- ✅ Mensagens são enviadas para Groq API
- ✅ Respostas chegam em português brasileiro
- ✅ Tracking de eventos (Meta Pixel, GA4, UTMfy)

## 📊 RESUMO

**🎯 CONFIGURAÇÃO QUE FALTA: SECRET DA GROQ API KEY**

Todos os outros componentes estão prontos. É só executar os comandos do Supabase e o agente de IA estará funcionando!