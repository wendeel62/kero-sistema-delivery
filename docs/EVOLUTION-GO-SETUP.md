# Integração WhatsApp - Kero com Evolution API Go

## Visão Geral

Este documento descreve a integração completa do WhatsApp no sistema Kero, utilizando:
- **Evolution API Go** - API leve para conexão WhatsApp
- **N8N** - Automação de webhooks
- **Frontend** - Página de conexão com QR Code

---

## 1. Configuração Docker Compose

O arquivo `docker-compose.yml` já está configurado com:

```yaml
evolution_api:
  image: atendai/evolution-go:latest
  ports:
    - "8085:8080"
  environment:
    - AUTHENTICATION_API_KEY=kero_api_key_2026
    - WEBHOOK_GLOBAL_URL=http://n8n:5678/webhook/evolution
```

### Variáveis de Ambiente (.env.local)

```env
VITE_EVOLUTION_API_URL=http://localhost:8085
VITE_EVOLUTION_API_KEY=kero_api_key_2026
```

---

## 2. Subir os Serviços

```bash
# Parar serviços anteriores (se houver)
docker-compose down

# Subir novos serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### Verificar se o Evolution API Go está funcionando:

```bash
curl http://localhost:8085/health
```

---

## 3. Configurar N8N Workflow

Acesse: http://localhost:5678 (credenciais: admin / kero_n8n_pass)

### Criar Workflow "Evolution Webhook Handler"

1. **Criar novo workflow** → nomear "Evolution Webhook Handler"
2. **Adicionar Webhook Node**:
   - HTTP Method: POST
   - Path: `evolution`
   - Response Mode: "Response"
3. **Adicionar Code Node (JavaScript)**:

```javascript
const body = $json.body;

// Verificar tipo de evento
const eventType = body.event;

// Filtrar apenas mensagens recebidas
if (body.message && !body.key?.fromMe) {
  const msg = body.message;
  
  // Extrair telefone
  const contatoTelefone = (body.key?.remoteJid || body.from || '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '');
  
  // Extrair mensagem
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
  
  // Nome do contato
  const contatoNome = body.pushName || contatoTelefone;
  
  return {
    contato_telefone: contatoTelefone,
    contato_nome: contatoNome,
    mensagem: mensagem,
    direcao: 'entrada',
    lida: false,
    instance_name: body.instanceName
  };
}

return null;
```

4. **Adicionar IF Node**:
   - Verificar se `contato_telefone` existe (não é null)
   
5. **Adicionar HTTP Request Node** (ramo true):
   - Method: POST
   - URL: `{{$env.SUPABASE_URL}}/rest/v1/mensagens_whatsapp`
   - Headers:
     - `apikey`: `{{$env.SUPABASE_ANON_KEY}}`
     - `Authorization`: `Bearer {{$env.SUPABASE_ANON_KEY}}`
     - `Content-Type`: `application/json`
     - `Prefer`: `return=minimal`
   - Body Content Type: JSON
   - Send Body: Automatically parsed

6. **Adicionar Switch Node** para direcionar por instance_name:
   - Se for instance de pedidos → redirecionar para API de pedidos
   - Se for instance de inbox → salvar no banco

7. **Adicionar Respond to Webhook Node**:
   - Status Code: 200
   - Body: `{ "received": true }`

### Ativar o Workflow
Clique no toggle no canto superior direito.

### Webhook URL
```
http://localhost:5678/webhook/evolution
```

---

## 4. Páginas do Frontend

### Rotas disponíveis:

| Rota | Descrição |
|------|-----------|
| `/whatsapp` | Caixa de entrada WhatsApp (mensagens) |
| `/whatsapp-conectar` | Página para escanear QR Code |
| `/whatsapp-pedidos` | Pedidos via WhatsApp (bot) |

### Sidebar atualizado:
- **WhatsApp** → Caixa de entrada (`/whatsapp`)
- **WP Conectar** → Conectar QR Code (`/whatsapp-conectar`)
- **WP Pedidos** → Bot de pedidos (`/whatsapp-pedidos`)

---

## 5. Como Conectar o WhatsApp

1. Acesse `/whatsapp-conectar` no menu lateral
2. Clique em "Conectar WhatsApp"
3. Escaneie o QR Code com seu celular
4. Aguarde a conexão (status muda para "Conectado")
5. Pronto! Agora pode usar o WhatsApp

---

## 6. Configuração de Database

A tabela `configuracoes_whatsapp` precisa ser populada:

```sql
INSERT INTO configuracoes_whatsapp (tenant_id, instance_name, status)
VALUES ('YOUR_TENANT_ID', 'kero_abc12345', 'connected');
```

---

## 7. Troubleshooting

### Evolution API não inicia
```bash
docker-compose logs evolution_api
```

### N8N não recebe webhooks
- Verificar se o workflow está ativado
- Verificar URL do webhook: `http://n8n:5678/webhook/evolution`

### Mensagens não aparecem no banco
- Verificar RLS na tabela `mensagens_whatsapp`
- Verificar se tenant_id está sendo enviado corretamente

### QR Code não aparece
- Verificar se o Evolution API está rodando
- Verificar variáveis de ambiente no docker-compose

---

## 8. Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|------------|
| POST | `/instance/create` | Criar nova instance |
| GET | `/instance/connectionState/{instanceName}` | Verificar status |
| GET | `/instance/qrCode/{instanceName}` | Obter QR Code |
| POST | `/instance/logout/{instanceName}` | Desconectar |
| GET | `/instance/fetchInstances` | Listar todas instances |
| POST | `/message/sendText/{instanceName}` | Enviar mensagem |