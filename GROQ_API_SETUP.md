# Configuração da API Key da Groq para o Agente de IA Kero

## API Key Recebida
```
<SUA_GROQ_API_KEY_AQUI>
```

## Como Configurar no Supabase

Execute este comando no terminal do seu projeto:

```bash
supabase secrets set GROQ_API_KEY=<SUA_GROQ_API_KEY_AQUI>
```

## Após Configurar o Secret

1. Deploy da Edge Function:
```bash
supabase functions deploy chat-agent --no-verify-jwt
```

2. Testar se está funcionando:
```bash
supabase functions invoke chat-agent --data '{"messages":[{"role":"user","content":"Olá"}]}'
```

## Status da Implementação

✅ Edge Function criada: `supabase/functions/chat-agent/index.ts`
✅ Componente FloatingAgentChat implementado
✅ Integração com cardápio online
✅ Widget restrito ao sistema interno
✅ System prompt configurado para "Alex"

## Próximos Passos

Após configurar o secret GROQ_API_KEY no Supabase:

1. Fazer deploy da função
2. Testar o chat agent no dashboard
3. Verificar se as respostas estão funcionando corretamente

## Verificação da API Key

A chave fornecida parece válida (formato correto gsk_...). Uma vez configurada como secret do Supabase, o agente de IA estará totalmente funcional.