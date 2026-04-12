# WhatsApp Inbox - Kero Implementation Guide

## Overview

This document describes how to complete the WhatsApp Inbox implementation after the frontend and database migrations are deployed.

## PASSO 1 - Database Migration ✅ COMPLETO

A migration was created at `supabase/migrations/20260412_fix_mensagens_whatsapp.sql` that:

1. Creates `configuracoes_whatsapp` table to map Evolution instance names to tenant_id
2. Adds missing columns (`mensagem`, `created_at`) to `mensagens_whatsapp`
3. Updates direction values from 'recebida'/'enviada' to 'entrada'/'saida'
4. Creates composite index on `(tenant_id, contato_telefone, created_at DESC)`
5. Enables Realtime for `mensagens_whatsapp` table
6. Creates RLS policies filtering by tenant_id from user_roles table

**To apply the migration manually:**

1. Access Supabase SQL Editor
2. Copy and execute the contents of `supabase/migrations/20260412_fix_mensagens_whatsapp.sql`
3. Register at least one WhatsApp instance for your tenant:

```sql
INSERT INTO configuracoes_whatsapp (tenant_id, instance_name, status)
VALUES ('YOUR_TENANT_ID', 'Kero', 'connected');
```

## PASSO 2 - N8N Workflow Setup

Access N8N at http://localhost:5678 (credentials: admin/kero_n8n_pass)

### Creating the Workflow

1. **Create new workflow**: Click "+" button, name it "Evolution Webhook Handler"
2. **Add Webhook Node**:
   - HTTP Method: POST
   - Path: `evolution`
   - Response Mode: "Response"
   - Delete the authentication field (leave empty)
3. **Add Code Node (JavaScript)**:
   - Connect it to the Webhook node
   - Code:
   ```javascript
   const body = $json.body;
   const msg = body.message || {};
   
   // Extract phone number (remove @s.whatsapp.net)
   const contatoTelefone = (body.key?.remoteJid || body.from || '').replace('@s.whatsapp.net', '').replace('@g.us', '');
   
   // Extract message content
   let mensagem = '';
   if (msg.conversation) {
     mensagem = msg.conversation;
   } else if (msg.extendedTextMessage?.text) {
     mensagem = msg.extendedTextMessage.text;
   } else if (msg.imageMessage) {
     mensagem = '[Imagem]';
   } else if (msg.videoMessage) {
     mensagem = '[Vídeo]';
   } else if (msg.documentMessage) {
     mensagem = '[Arquivo]';
   } else {
     mensagem = '[Mídia]';
   }
   
   // Get push name or fallback to phone
   const contatoNome = body.pushName || contatoTelefone;
   
   // Direction (fromMe: true = sent by us, false = received)
   const direcao = body.key?.fromMe ? 'saida' : 'entrada';
   
   return {
     contato_telefone: contatoTelefone,
     contato_nome: contatoNome,
     mensagem: mensagem,
     direcao: direcao,
     lida: false
   };
   ```
4. **Add HTTP Request Node**:
   - Method: POST
   - URL: `${SUPABASE_URL}/rest/v1/mensagens_whatsapp`
   - Headers:
     - `apikey`: `YOUR_SUPABASE_ANON_KEY`
     - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
     - `Content-Type`: `application/json`
     - `Prefer`: `return=minimal`
   - Body Content Type: JSON
   - Send Body: Automatically parsed from previous node
5. **Add Respond to Webhook Node**:
   - Status Code: 200
   - Body: `{ "received": true }`

### Activating the Workflow

1. Click the toggle switch in the top-right corner to activate
2. The webhook URL will be: `http://localhost:5678/webhook/evolution`

### Verify Docker Configuration

The `docker-compose.yml` should have these settings for Evolution API:

```yaml
environment:
  - WEBHOOK_GLOBAL_ENABLED=true
  - WEBHOOK_GLOBAL_URL=http://n8n:5678/webhook/evolution
  - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
```

These settings are already configured in the existing docker-compose.yml.

## PASSO 3 - Frontend Implementation ✅ COMPLETO

The `WhatsappInboxPage.tsx` has been implemented with:

- **Two-column layout**: Conversations list on left, active chat on right
- **Conversations list**: Fetches last 200 messages, groups by phone number on frontend
- **Unread badges**: Counts unread incoming messages per contact
- **Search bar**: Filters conversations by name or phone
- **Chat view**: Shows messages as bubbles, aligned by direction
- **Mark as read**: When selecting a contact, marks all incoming messages as read
- **Realtime**: Listens for INSERT events and invalidates queries
- **Auto-scroll**: Scrolls to bottom when messages change

## PASSO 4 - Build Verification ✅ COMPLETO

`npm run build` passes successfully.

## Important Notes

1. **Multi-tenant filtering**: All Supabase queries filter by tenant_id using the `get_current_tenant_id()` function
2. **No GROUP BY**: Conversation grouping is done on frontend as required
3. **No new libraries**: Using existing dependencies (React Query, Supabase client, date-fns)
4. **Sending disabled**: The input field shows a placeholder message; only receiving is implemented
5. **Realtime requires authentication**: The frontend uses Supabase client which handles auth automatically

## Testing the Integration

1. Apply the database migration in Supabase
2. Register a WhatsApp instance for your tenant
3. Start N8N and create the workflow as described above
4. Ensure docker-compose services are running
5. Send a WhatsApp message to the connected number
6. Verify the message appears in the inbox

## Troubleshooting

- **Messages not appearing**: Check N8N workflow is active, verify Evolution API webhook URL points to `http://n8n:5678/webhook/evolution`
- **RLS errors**: Ensure user has a record in `user_roles` table with correct tenant_id
- **Realtime not working**: Verify `supabase_realtime` publication includes `mensagens_whatsapp` table