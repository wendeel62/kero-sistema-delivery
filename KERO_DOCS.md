# KERO - Sistema de Gestão para Restaurantes/Bares/Delivery

> Documentação técnica do projeto - Versão 1.0
> Última atualização: 2026-04-12

## Visão Geral

**KERO** é um SaaS completo de gestão para restaurantes, bares e delivery, construído com:
- **Frontend**: React 19 + TypeScript 5.9 + Vite 8
- **Estilização**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Roteamento**: React Router v7

---

## Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis
│   ├── CategoryFilters.tsx
│   ├── DivisaoConta.tsx
│   ├── Layout.tsx
│   ├── MapaEntregas.tsx
│   ├── NpsWidget.tsx
│   ├── ProductCard.tsx
│   ├── ProtectedRoute.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── Toast.tsx
│   ├── ConfigToggle.tsx
│   ├── ConfigInputField.tsx
│   └── WhatsAppManager.tsx (placeholder)
├── components/admin/ # Componentes Admin
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx
│   └── AdminGuard.tsx
├── contexts/        # React Contexts
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx   # Dark/Light theme
│   ├── ToastContext.tsx    # Toast notifications
│   └── MetaPeriodoContext.tsx
├── hooks/           # Hooks Customizados
│   ├── useRealtime.ts
│   ├── useEvolution.ts
│   ├── useMetasFaturamento.ts
│   ├── useGlobalMetrics.ts
│   ├── useAdminMetrics.ts
│   └── useCozinha.ts
├── lib/             # Utilitários e clientes
│   ├── supabase.ts      # Cliente Supabase com validação de env
│   └── syncCliente.ts  # Sincronização de clientes
├── services/        # Integrações externas
│   └── evolutionApi.ts # Evolution API (WhatsApp)
├── pages/           # Páginas da aplicação
│   ├── DashboardPage.tsx
│   ├── PedidosPage.tsx
│   ├── PdvPage.tsx
│   ├── CardapioAdminPage.tsx
│   ├── CardapioOnlinePage.tsx
│   ├── MesaPage.tsx
│   ├── ClientesPage.tsx
│   ├── EstoquePage.tsx
│   ├── FinanceiroPage.tsx
│   ├── EntregasPage.tsx
│   ├── WhatsappInboxPage.tsx
│   ├── WhatsAppOrdersPage.tsx
│   ├── ConfiguracoesPage.tsx
│   ├── OperacoesPage.tsx
│   ├── CozinhaPage.tsx
│   └── ... (mais páginas)
├── pages/admin/     # Páginas Admin SaaS
│   ├── AdminDashboard.tsx
│   └── AdminLogin.tsx
├── App.tsx          # Rotas da aplicação
└── main.tsx         # Entry point

server/              # Backend Express (Railway)
├── src/
│   ├── index.ts
│   ├── routes/sync.ts
│   ├── controllers/syncController.ts
│   └── database/
│       ├── postgres.ts
│       └── redis.ts
```

---

## Funcionalidades Implementadas

### Módulos Completos

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Dashboard | ✅ | KPIs drag-and-drop, gráficos, funil de vendas |
| Pedidos (Kanban) | ✅ | Fluxo completo de pedidos com filtros |
| PDV | ✅ | Ponto de venda com variações de produtos |
| Cardápio Admin | ✅ | CRUD de categorias, produtos, preços |
| Cardápio Online | ✅ | Menu digital público com checkout |
| Gestão de Mesas | ✅ | Comanda via QR Code |
| Clientes (CRM) | ✅ | Perfis, programa fidelidade, cupons |
| Estoque | ✅ | Insumos, fornecedores, entradas |
| Entregas | ✅ | Mapa realtime, gestão motoboys |
| WhatsApp Inbox | ✅ | Chat em tempo real com Realtime |
| WhatsApp Orders | ✅ | Pedidos via WhatsApp com IA |
| Financeiro | ✅ | Dashboard, contas a pagar, caixa |
| Login/Auth | ✅ | Autenticação Supabase + MFA |
| Motoboy App | ✅ | App PWA para entregadores |
| Pedido Status | ✅ | Acompanhamento público |
| Operações | ✅ | Operações do dia |
| Admin SaaS | ✅ | Dashboard admin para gestores |
| Cozinha | ✅ | Monitor Kitchen Display |

### Placeholders (Fase 2)

- **WhatsAppManager**: Componente placeholder para gestão WhatsApp
- **Ficha Técnica**: UI de placeholder no EstoquePage

---

## Banco de Dados

### Tabelas Principais

```
configuracoes, categorias, produtos, precos_tamanho, sabores,
mesas, pedidos, itens_pedido, pedidos_online, clientes,
cupons, fornecedores, ingredientes, entradas_estoque,
ficha_tecnica, caixa, sangrias_caixa, contas_pagar,
motoboys, entregas, historico_status, notificacoes,
mensagens_whatsapp, configuracoes_whatsapp, user_roles,
metas_faturamento, historico_agente
```

### Políticas RLS

Todas as tabelas possuem Row Level Security (RLS) configurado com filtragem por `tenant_id`.

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

O arquivo `src/lib/supabase.ts` inclui validação que会在缺少环境变量时显示错误提示。

---

## Correções Realizadas (v1.0)

### 1. DashboardPage.tsx
- ✅ Removida interface `FunnelData` duplicada

### 2. MesaPage.tsx
- ✅ Corrigida criação de pedido: agora cria primeiro o pedido em `pedidos` e depois insere itens em `itens_pedido`
- ✅ Adicionado tratamento de erros com feedback visual
- ✅ Adicionado estado para exibir erros

### 3. supabase.ts
- ✅ Adicionada validação de variáveis de ambiente
- ✅ Adicionadas opções de auth (persistSession, autoRefreshToken)

### 4. Console Debug
- ✅ Removidos 16 console.log de debug em produção

---

## Novas Implementações (v1.1)

### 1. Sistema de Tema (Dark/Light)
- ✅ ThemeContext com suporte a dark mode
- ✅ Cores red/orange para tema escuro
- ✅ Animações suaves com Framer Motion

### 2. Toast Notifications
- ✅ ToastContext para gerenciamento de toasts
- ✅ Componente Toast para exibir notificações
- ✅ Substitui todos os alert() do código

### 3. Admin SaaS (/admin)
- ✅ Rotas isoladas em /admin/*
- ✅ AdminDashboard - Dashboard administrativo
- ✅ AdminLogin - Página de login admin
- ✅ AdminGuard - Proteção de rotas
- ✅ AdminLayout - Layout administrativo
- ✅ AdminSidebar - Sidebar administrativa

### 4. Server Backend (Railway)
- ✅ Express server em server/
- ✅ Rotas de sync com Evolution API
- ✅ Cliente PostgreSQL
- ✅ Cliente Redis

### 5. WhatsApp Integration
- ✅ Tabela configuracoes_whatsapp
- ✅ Realtime habilitado
- ✅ Migration 20260412_fix_mensagens_whatsapp.sql
- ✅ N8N webhook workflow documentado

### 6. Novas Pages
- ✅ OperacoesPage - Operações do dia
- ✅ WhatsAppOrdersPage - Pedidos via WhatsApp
- ✅ WhatsAppOrdersPage (interface alternativa)

### 7. Novos Componentes
- ✅ ConfigToggle - Toggle de configuração
- ✅ ConfigInputField - Campo de input para config
- ✅ WhatsAppManager (placeholder para Fase 2)

### 8. Novos Hooks
- ✅ useMetasFaturamento - Metas de faturamento
- ✅ useGlobalMetrics - Métricas globais
- ✅ useAdminMetrics - Métricas admin
- ✅ useCozinha - Interface cozinha

---

## Pendências e Melhorias (Fase 2)

### Alta Prioridade
1. Implementar Ficha Técnica (vincular produtos a insumos, cálculo automático de CMV) - Placeholder existe

### Concluído Recently (Moved from Fase 2)
- ✅ Adicionar gráficos ao Financeiro (recharts configurado)
- ✅ Integrar Evolution API (WhatsApp inbox implementado)
- ✅ Migrar para React Query (configurado)
- ✅ Substituir alert() por sistema de toast (ToastContext implementado)
- ✅ Adicionar validação Zod (Zod configurado)

### Baixa Prioridade (Fase 2)
2. Testes E2E (Playwright/Cypress)
3. PWA (Service Worker)
4. Internacionalização (i18n)
5. WhatsApp sending (enviar mensagens)

---

## Rotas da Aplicação

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/login` | Público | Login/Cadastro |
| `/mfa-verify` | Público | Verificação MFA |
| `/mfa-setup` | Auth | Configuração MFA |
| `/dashboard` | Auth | Dashboard KPIs |
| `/pedidos` | Auth | Kanban de pedidos |
| `/pdv` | Auth | Ponto de venda |
| `/cardapio-admin` | Auth | Admin cardápio |
| `/cardapio` | **Público** | Cardápio online |
| `/clientes` | Auth | CRM |
| `/estoque` | Auth | Controle estoque |
| `/financeiro` | Auth | Módulo financeiro |
| `/entregas` | Auth | Gestão entregas |
| `/whatsapp` | Auth | WhatsApp Inbox |
| `/configuracoes` | Auth | Configurações |
| `/operacoes` | Auth | Operações do dia |
| `/pedido/:numero` | **Público** | Acompanhamento pedido |
| `/cozinha` | **Público** | Monitor Kitchen |
| `/mesa/:numero` | **Público** | Cardápio via QR |
| `/motoboy` | **Público** | App entregador |
| `/admin/login` | Admin | Login Admin SaaS |
| `/admin/*` | Admin | Dashboard Admin SaaS |

---

## Padrões de Código

### Multi-Tenant (CRÍTICO)
```tsx
// ✅ CORRETO
const { data } = await supabase
  .from(pedidos)
  .select(*)
  .eq(tenant_id, tenantId)

// ❌ ERRADO
const { data } = await supabase.from(pedidos).select(*)
```

### Estado em Tempo Real
```tsx
useRealtime(pedidos, fetchData)
```

---

## Tech Stack

- React 19
- TypeScript 5.9
- Vite 8
- Tailwind CSS 4
- Supabase
- React Router v7
- React Query 5
- date-fns
- Framer Motion 12
- Recharts 3
- Lucide React 1
- Leaflet + React-Leaflet
- React CountUp
- React Hook Form + Zod
- Express (server/ backend)
- PostgreSQL + Redis
- Axios

---

## Autores

Desenvolvido pela equipe Synkra/AIOX

---

## Licença

Proprietário - Todos os direitos reservados

