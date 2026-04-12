# Projeto Kero (Nova Pizzaria) - Documentacao Tecnica

## Visao Geral do Projeto

| Atributo | Valor |
|----------|-------|
| **Nome** | Projeto Kero (Nova Pizzaria) |
| **Tipo** | Sistema de Gestao para Restaurantes/Pizzarias |
| **Frontend** | React 19 + TypeScript + Vite + TailwindCSS 4 |
| **Backend** | Supabase (PostgreSQL) |
| **Infraestrutura** | Docker (Evolution API + n8n) |

## Stack Tecnologica

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Linguagem**: TypeScript 5.9
- **Estilizacao**: TailwindCSS 4
- **Routing**: React Router DOM 7
- **Estado**: React Query 5
- **Charts**: Recharts 3
- **Animacoes**: Framer Motion 12
- **Icons**: Lucide React 1
- **Mapas**: Leaflet + React-Leaflet
- **CountUp**: React CountUp
- **Forms**: React Hook Form + Zod + @hookform/resolvers

### Backend
- **Database**: Supabase (PostgreSQL 15)
- **Auth**: Supabase Auth
- **API**: REST via Supabase REST API
- **Cache**: Redis

### Infraestrutura

#### Docker Compose
**Local development:**
```yaml
services:
  evolution_api:
    image: evoapicloud/evolution-api
    ports:
      - "8085:8080"
    environment:
      - DATABASE_ENABLED=true
      - REDIS_ENABLED=true
      - AUTHENTICATION_API_KEY=kero_api_key_2026
      - WEBHOOK_GLOBAL_URL=http://n8n:5678/webhook/evolution

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - N8N_BASIC_AUTH_ACTIVE=true

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine

networks:
  kero-network:
    driver: bridge

volumes:
  n8n_data:
  postgres_data:
```

#### Railway Deployment
- Express server em `server/` para API routes
- PostgreSQL e Redis no Railway
- Backend sync controller

### docker-compose.yml (Legado)

```yaml
services:
  evolution_api:
    image: evoapicloud/evolution-api
    ports:
      - "8085:8080"
    environment:
      - DATABASE_ENABLED=true
      - REDIS_ENABLED=true
      - AUTHENTICATION_API_KEY=kero_api_key_2026
      - WEBHOOK_GLOBAL_URL=http://n8n:5678/webhook/evolution

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - N8N_BASIC_AUTH_ACTIVE=true

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:alpine

networks:
  kero-network:
    driver: bridge

volumes:
  n8n_data:
  postgres_data:
```

## Historico de Mudancas

### 2026-04-07: Metas de Faturamento
- Adicionado sistema de metas de faturamento
- Tabelas para acompanhamento de metas por periodo

### 2026-04-10: Ajustes e Triggers
- Auto slug triggers para entidades
- Correcao config tenant_id
- RPCs publicos para operacoes sem autenticacao
- Historico agente por tenant

### 2026-04-11: Seguranca e Multi-Tenant
- Hardening de seguranca (20260401123000)
- Criptografia em repouso
- Sistema de auditoria completo
- Politica de senhas
- Multi-tenant RBAC

### 2026-04-12: WhatsApp Integration
- Setup Evolution API via Docker
- Configuracao de webhooks
- Geracao de QR Code
- Migration 20260412_fix_mensagens_whatsapp.sql
- Tabela configuracoes_whatsapp para mapeamento instance->tenant
- Realtime habilitado para mensagens_whatsapp
- N8N workflow documentado
- WhatsApp Inbox completo implementado

### 2026-04-12: Dark Theme & UI
- ThemeContext com suporte a dark mode
- Sistema de cores red/orange
- Animações suaves com Framer Motion
- Toast notifications (substitui alert())
- ToastContext para gerenciamento de toasts

### 2026-04-12: Admin SaaS
- rotas /admin isoladas do sistema principal
- AdminDashboard
- AdminLogin
- AdminGuard (protecao de rotas)
- AdminSidebar
- AdminLayout

### 2026-04-12: Server Backend
- Express server para Railway
- server/src/index.ts
- server/src/routes/sync.ts
- server/src/controllers/syncController.ts
- server/src/database/postgres.ts
- server/src/database/redis.ts

### 2026-04-12: CI/CD
- GitHub Actions para build e lintautomatico
- Workflow Vercel deploy
- Railway deployment config

## Status Atual

### Em Desenvolvimento
- Sistema de metas de faturamento (hook useMetasFaturamento)
- Metricsglobais (useGlobalMetrics)
- useCozinha para interface de cozinha
- useAdminMetrics para dashboard admin

### Pendente
- Webhook n8n integration (documentado, faltaconfigurar no n8n)
- Processamento automatico de pedidos via IA

## Ambiente

### Variaveis de Ambiente (.env.local)
```
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_EVOLUTION_API_URL=http://localhost:8085
VITE_EVOLUTION_API_KEY=kero_api_key_2026
```

### Comandos
```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Estrutura de Arquivos

```
src/
├── components/     # Componentes reutilizaveis
│   ├── admin/      # Componentes admin (AdminSidebar, AdminLayout, AdminGuard)
│   └── *.tsx       # Componentes gerais (Toast, Sidebar, Topbar, etc.)
├── contexts/       # React Contexts
│   ├── AuthContext.tsx    # Autenticacao
│   ├── ThemeContext.tsx    # Dark/Light theme
│   ├── ToastContext.tsx   # Toast notifications
│   └── MetaPeriodoContext.tsx # Metas por periodo
├── hooks/          # Custom hooks
│   ├── useRealtime.ts
│   ├── useMetasFaturamento.ts
│   ├── useGlobalMetrics.ts
│   ├── useAdminMetrics.ts
│   └── useCozinha.ts
├── lib/            # Utilitarios
│   ├── supabase.ts
│   └── syncCliente.ts
├── pages/          # Paginass
│   ├── admin/     # Paginass admin
│   └── *.tsx      # Paginass principais
├── services/        # Servicos (Evolution API)
├── App.tsx         # Componente raiz
└── main.tsx       # Entry point

server/            # Backend Express (Railway)
├── src/
│   ├── index.ts
│   ├── routes/sync.ts
│   ├── controllers/syncController.ts
│   └── database/
│       ├── postgres.ts
│       └── redis.ts

supabase/
├── migrations/     # Migrations SQL
└── config.toml     # Configuracao Supabase

docs/
├── stories/        # User stories
└── templates/     # Templates AIOX
```