# 🚀 Kero WhatsApp - Sistema Multi-tenant

Sistema completo de WhatsApp multi-tenant com Evolution API, PostgreSQL, Socket.io e React UI.

## 📋 Status do Projeto

### ✅ Concluído
- **Banco de Dados**: PostgreSQL com RLS (Row Level Security)
- **API Backend**: Node.js + Express com autenticação Evolution API
- **Socket.io**: Servidor para comunicação em tempo real
- **UI React**: Interface moderna e responsiva
- **Docker**: Ambiente containerizado completo

### 🟡 Funcionalidades Implementadas
- ✅ Criar dispositivos WhatsApp
- ✅ Listar dispositivos por tenant
- ✅ Verificar status de conexão
- ✅ UI para gerenciamento de dispositivos
- ✅ Comunicação Socket.io
- ✅ Webhooks da Evolution API
- ✅ Estrutura multi-tenant com RLS

### ❌ Próximos Passos
- 🔄 Implementar QR code automático
- 🔄 Conexão automática do dispositivo
- 🔄 Envio de mensagens
- 🔄 Recebimento de mensagens
- 🔄 Gerenciamento de conversas

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp UI   │    │  WhatsApp API   │    │   Evolution API │
│    (React)      │◄──►│  (Node.js)      │◄──►│   (Go)          │
│   Port: 3002    │    │   Port: 3000    │    │   Port: 8085    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Socket.io     │    │   PostgreSQL    │
                    │   Port: 3001    │◄──►│   Port: 5432    │
                    └─────────────────┘    └─────────────────┘
                                             │
                                             ▼
                                       ┌─────────────────┐
                                       │     Redis       │
                                       │   Port: 6379    │
                                       └─────────────────┘
```

## 🚀 Como Usar

### 1. Iniciar Sistema
```bash
# Na raiz do projeto
docker compose up -d
```

### 2. Verificar Status
```bash
docker ps
# Deve mostrar todos os containers rodando
```

### 3. Acessar Interfaces
- **WhatsApp UI**: http://localhost:3002
- **WhatsApp API**: http://localhost:3000
- **Evolution API**: http://localhost:8085

### 4. Testar API

#### Criar Dispositivo
```bash
curl -X POST http://localhost:3000/api/whatsapp/devices \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "9139ddd7-e3db-4beb-b8f9-aabc55e47b8e", "device_name": "Meu WhatsApp"}'
```

#### Listar Dispositivos
```bash
curl http://localhost:3000/api/whatsapp/devices?tenant_id=9139ddd7-e3db-4beb-b8f9-aabc55e47b8e
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Evolution API (v2 Official)
- `AUTHENTICATION_API_KEY`: Chave de API (padrão: kero_api_key_2026)
- `DATABASE_CONNECTION_URI`: URI PostgreSQL (padrão: postgresql://kero:kero_pass@postgres:5432/evolution_v2)
- `WEBHOOK_GLOBAL_URL`: URL do webhook (padrão: http://whatsapp-api:3000/webhook/evolution)

#### WhatsApp API
- `DB_HOST`: Host PostgreSQL (padrão: postgres)
- `DB_USER`: Usuário DB (padrão: kero)
- `DB_PASSWORD`: Senha DB (padrão: kero_pass)
- `EVO_HOST`: Host Evolution API (padrão: evolution_api)
- `EVO_PORT`: Porta Evolution API (padrão: 8080)
- `EVO_API_KEY`: Chave API Evolution (padrão: kero_api_key_2026)

#### UI Server
- `PORT`: Porta do servidor UI (padrão: 3002)

## 📊 Estrutura do Banco

### Tabelas Principais
- `whatsapp.tenants`: Tenants do sistema
- `whatsapp.devices`: Dispositivos WhatsApp
- `whatsapp.conversations`: Conversas
- `whatsapp.messages`: Mensagens
- `whatsapp.contacts`: Contatos

### Segurança
- **Row Level Security (RLS)**: Dados isolados por tenant
- **JWT-like tokens**: Autenticação baseada em tenant_id
- **API Keys**: Autenticação Evolution API

## 🐛 Troubleshooting

### Container não inicia
```bash
# Verificar logs
docker logs <container_name>

# Recriar container
docker compose up -d --force-recreate <service_name>
```

### API retorna erro
```bash
# Verificar conectividade
curl http://localhost:3000/api/health
curl http://localhost:3000/api/whatsapp/devices?tenant_id=9139ddd7-e3db-4beb-b8f9-aabc55e47b8e
```

### Evolution API não responde
```bash
# Verificar se está rodando
curl http://localhost:8085/
```

## 🎯 Próximas Implementações

1. **QR Code Automático**
   - Implementar endpoint correto na Evolution API
   - Polling automático do QR code
   - Interface para escanear QR

2. **Mensagens**
   - Envio de mensagens via API
   - Recebimento via webhook
   - Histórico de conversas

3. **Interface Completa**
   - Chat em tempo real
   - Gerenciamento de contatos
   - Grupos e broadcasts

4. **Produção**
   - Logs estruturados
   - Métricas e monitoramento
   - Backup automático

## 📝 Notas Técnicas

- **Multi-tenant**: Isolamento completo por tenant_id
- **Webhooks**: Evolution API → WhatsApp API → Socket.io
- **Real-time**: Socket.io para atualizações instantâneas
- **Escalabilidade**: PostgreSQL com índices otimizados
- **Segurança**: RLS + validação de tenant_id

---

**Kero WhatsApp** - Sistema robusto e escalável para WhatsApp Business! 🚀