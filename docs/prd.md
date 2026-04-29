# Kero - Sistema de Gestão para Pizzarias e Restaurantes Product Requirements Document (PRD)

> **Versão:** 1.0
> **Data:** 2026-04-17
> **Status:** Em Desenvolvimento

---

## 1. Goals and Background Context

### 1.1 Goals

O Kero é um sistema SaaS completo de gestão para restaurantes, pizzarias e delivery que permite aos proprietários gerenciar suas operações de forma integrada e eficiente. Os objetivos principais incluem:

- **FR1：** Disponibilizar um ponto de venda (PDV) completo com suporte a variações de produtos, tamanhos e sabores para pizzarias
- **FR2：** Gerenciar cardápio digital público via QR Code para comandas de mesa
- **FR3:** Controlar pedidos em fluxo Kanban do recebimento até entrega/expedição
- **FR4：** Gerenciar clientes com programa de fidelidade e cupons de desconto
- **FR5：** Controlar estoque de ingredientes com cálculo automático de CMV via ficha técnica
- **FR6:** Integrar WhatsApp para receber pedidos automáticos via IA e chat em tempo real
- **FR7:** Fornecer dashboard financeiro com métricas, contas a pagar e gestão de caixa
- **FR8:** Permitir gestão de entregas com tracking em mapa realtime
- **FR9:** Oferecer interface Kitchen Display System (KDS) para displaying na cozinha
- **FR10:** Disponibilizar App PWA para entregadores (motoboys)

O sistema deve permitir que diferentes estabelecimentos (tenants) utilizem a plataforma simultaneamente com isolamento completo de dados via multi-tenant architecture.

### 1.2 Background Context

O mercado de pizzarias e delivery no Brasil apresenta necessidades específicas não totalmente atendidas por sistemas genéricos de Gestão Comercial. Pizzarias têm particularidades como: variações de tamanho (pequena, média, grande, família), sabores por tamanho, masa (tradicional, integral, catupiry), e necessidade de integração WhatsApp para recebimento de pedidos online que representam volume significativo de vendas.

O Kero surge para preencher essa lacuna oferecendo uma solução completa, integrada e de fácil uso que abrange todas as operações do estabelecimento: desde o penerimaan do pedido (PDV, WhatsApp, QR Code) passando pela produção (cozinha) até a entrega (motoboy app). O sistema utiliza Supabase como backend providing database, autenticação, realtime subscriptions e storage, Infrastructure as Code via Docker Compose para fácil deploy local, e React 18+ com TypeScript para frontend moderno e responsivo.

### 1.3 Change Log

| Date | Version | Description | Author |
|------|---------|------------|--------|
| 2026-04-17 | 1.0 | Initial PRD creation | Dev Agent |

---

## 2. Requirements

### 2.1 Functional

- **FR1:** O sistema deve permitir cadastro de categorias de produtos com nome, descrição, ordem de exibição e status ativo/inativo
- **FR2:** O sistema deve permitir cadastro de produtos com nome, descrição, categoria, imagem, preço base, variações de tamanho e sabores distintos por tamanho
- **FR3:** O sistema deve suportar produto com preço base e adicionais que modificam o valor final conforme tamanho selecionado
- **FR4:** O sistema deve criar pedidos vinculados a mesa (via QR Code) ou pedido online/WhatsApp com itens, variações e observações
- **FR5:** O sistema deve gerenciar fluxo de status de pedidos: novo > confirmado > em preparo > pronto > entregue > finalizado
- **FR6:** O sistema deve calcular automaticamente total do pedido conforme produtos, variações e adicionais selecionados
- **FR7:** O sistema deve permitir divisão de conta por itens entre clientes da mesa
- **FR8:** O sistema deve gerar QR Code para cada mesa que redireciona para cardápio digital público
- **FR9:** O sistema deve permitir cadastro de clientes com dados pessoais, histórico de pedidos, pontos de fidelidade acumulados
- **FR10:** O sistema deve aplicar cupons de desconto automaticamente validando elegibilidade (mínimo de pedidos, período)
- **FR11:** O sistema deve gerenciar cadastro de ingredientes com fornecedor padrão, unidade de medida, estoque mínimo
- **FR12:** O sistema deve registrar entradas de estoque com fornecedor, quantidade, lote e data de validade
- **FR13:** O sistema deve calcular custo médio de cada produto via ficha técnica vinculada aos ingredientes e quantidades usadas
- **FR14:** O sistema deve alertar quando ingrediente está abaixo do estoque mínimo
- **FR15:** O sistema deve enviar notificações via WhatsApp para o cliente quando pedido mudar de status
- **FR16:** O sistema deve receber pedidos via WhatsApp processados por IA que extrai itens e confirma valores
- **FR17:** O sistema deve exibir chat WhatsApp em tempo real com histórico de conversas
- **FR18:** O sistema deve registrar todas as movimentações de caixa (abertura, sangria, suprimento, fechamento)
- **FR19:** O sistema deve gestionar contas a pagar com vencimento, categoria, fornecedor e rateio
- **FR20:** O sistema deve exibir dashboard financeiro com receita, margem, fluxo de caixa
- **FR21:** O sistema deve gestionar entregas com assignment de motoboy, tracking por GPS, histórico de posições
- **FR22:** O sistema deve exibir mapa realtime com posição dos entregadores em aktif delivery
- **FR23:** O sistema deve disponibilizar interface Kitchen Display (KDS) com visualização de pedidos por fila de status
- **FR24:** O sistema deve emitir alerts sonoros na cozinha quando novo pedido entrar na fila
- **FR25:** O sistema deve permitir que motoboys atualizem status de entrega via app PWA
- **FR26:** O sistema deve permitir que clientes acompanhem status do pedido via link público
- **FR27:** O sistema deve permitir configuração de meta de faturamento por período (dia, semana, mês)
- **FR28:** O sistema deve comparar meta vs realizado e alertar quando abaixo do previsto
- **FR29:** O sistema deve suportar múltiplos estabelecimentos (tenants) com isolamento total de dados via tenant_id
- **FR30:** O sistema deve permitir gestão de usuários por tenant com papéis (admin, gerente, atendente, cozinha, entregador)
- **FR31:** O sistema deve suportar autenticação com email/senha e opcionalmente MFA via Google Authenticator
- **FR32:** O sistema deve fornecer área administrativa para gestores do SaaS visualizarem métricas de todos os tenants

### 2.2 Non Functional

- **NFR1:** Tempo de resposta das consultas ao banco de dados não deve exceder 200ms para 95% das requisições em horário de pico
- **NFR2:** O sistema deve suportar 50 usuários simultâneos por estabelecimento sem degradação perceptível
- **NFR3:** Todas as operações de escrita devem ser confirmadas antes de exibir feedback ao usuário (otimistic UI não se aplica a escritas)
- **NFR4:** Dados de clientes, pedidos e financeiros devem ser criptografados em repouso usando AES-256
- **NFR5:** Todas as tabelas com dados sensíveis devem ter Row Level Security (RLS) ativado filtrando por tenant_id
- **NFR6:** Tentativas de login incorretas devem ser limitadas a 5 tentativas comlockout de 15 minutos
- **NFR7:** Backup automático do banco de dados deve ocorrer a cada 6 horas retendo últimos 7 dias
- **NFR8:** O sistema deve ter taxa de disponibilidade mínima de 99.5% mensurada mensalmente
- **NFR9:** O frontend deve ser responsivo e funcional em dispositivosmobile a partir de 320px de largura
- **NFR10:** O WhatsApp deve suportar múltiplas instâncias com configuração por tenant via tabela configuracoes_whatsapp

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

O Kero oferece uma experiência de usuário focada em eficiência operacional. A interface prioriza ações rápidas no PDV com botões grandes e bem espaçados, feedback visual imediato via animações sutis, e organização por módulos distintos accessed via sidebar persistente. O tema dark mode com cores primarias red/orange foi chosen para reduzir fadiga visual em ambientes de baixa luminosidade (comandas noturnas). Para clientes acessando via smartphone (cardápio digital, tracking), a interface é minimalista e touch-friendly com foco na informação essencial.

### 3.2 Key Interaction Paradigms

1. **PDV (Ponto de Venda):** Interface otimizada para toque com categorias em carousel horizontal, produtos em grid, dialog deVariations com seleção por botões, totalização automática visível
2. **Kitchen Display:** Visualização em modo fullscreen com fontes grandes legíveis à distância, ordenação por tempo de entrada, toques para avançar status
3. **Mobile (Cardápio/Tracking):** Single column scrollable, botões de action fixed ao bottom, progress indicators claros
4. **Gestão (Dashboard/Admin):** Data-dense mas bem organizado com toolbars consistentes, filtros inline, bulk actions

### 3.3 Core Screens and Views

| Screen | Type | Publico | Descrição |
|--------|------|---------|-----------|
| LoginPage | Auth | No | Login email/senha com opção MFA |
| DashboardPage | Auth | No | KPIs, gráficos de vendas, funil |
| PedidosPage | Auth | No | Kanban de pedidos por status |
| PdvPage | Auth | No | Ponto de venda com variações |
| CardapioAdminPage | Auth | No | CRUD cardápio categorias e produtos |
| CardapioOnlinePage | Web | Yes | Cardápio digital público |
| MesaPage | Web | Yes | Cardápio via QR Code |
| ClientesPage | Auth | No | CRM com histórico e fidelidade |
| EstoquePage | Auth | No | Gestão ingredientes e fichas técnicas |
| FinanceiroPage | Auth | No | Dashboard financeiro e contas |
| EntregasPage | Auth | No | Mapa realtime e gestão motoboys |
| WhatsAppInboxPage | Auth | No | Chat WhatsApp em tempo real |
| WhatsAppOrdersPage | Auth | No | Pedidos recebidos via WhatsApp |
| CozinhaPage | Web | Yes | Kitchen Display System |
| PedidoStatusPage | Web | Yes | Tracking público de pedido |
| MotoboyPage | Web | Yes | App PWA para entregadores |
| ConfiguracoesPage | Auth | No | Configurações do estabelecimento |
| AdminDashboardPage | Auth (SaaS) | No | Dashboard admin multitenant |

### 3.4 Accessibility

O sistema deve cumplir com WCAG AA level. Isso inclui: contraste mínimo 4.5:1 para texto, suporte a keyboard navigation em todas as funcionalidades, labels adequados para leitores de tela, e estrutura semântica de headings. Para interfaces críticas (PDV, Cozinha) onde operadores podem necesitar de hands-free, devem haver atalhos de teclado documentados.

### 3.5 Branding

O sistema utiliza paleta de cores com primary red (#e53935) e secondary orange (#f57c00) adaptadas automatically ao dark mode do sistema. As animações de transição são suaves (200-300ms) usando Framer Motion. Não há guia de marca externo attached; o design system usa tokens TailwindCSS 4 existentes.

### 3.6 Target Device and Platforms

- **Web Responsive:** Desktop (1920x1080) e tablet (1024x768) - primary target para operações internas
- **Mobile Web:** Smartphone (320px-428px) - target para cardápio digital, tracking, e motoboy app
- **Cross-Platform:** PWA installable em Android/iOS para motoboys

---

## 4. Technical Assumptions

### 4.1 Repository Structure

**Monorepo** containing:

```
/src              # React frontend
/server           # Express backend (Railway)
/supabase         # Database migrations
/.kilo            # Kilo CLI config
docs/             # Documentação
```

A escolha monorepo foi feita para simplified deployment e porque frontend e backend são small o enough para não justificar polyrepo separation. O Supabase migrations são versionadas em SQL files sob supabase/migrations/.

### 4.2 Service Architecture

**Monolith** com Serverless functions dentro:

- Frontend: React 18 SPA served via Vercel
- API Layer: Express server no Railway expõe REST endpoints para sync operations
- Database: Supabase PostgreSQL 15 com Row Level Security
- Realtime: Supabase Realtime para subscriptions em mensagens_whatsapp, pedidos
- Cache: Redis paratemporary cache e rate limiting
- Auth: Supabase Auth with custom claims para tenant_id e roles
- Storage: Supabase Storage para imagens de produtos
- Queue/Workers: n8n no Docker para workflows async (webhooks WhatsApp)
- WhatsApp: Evolution API no Docker para Instance management e messaging

A escolha de monolith foi feita because todas as operações são database-centric e não justificam microservice decomposition. O Express server no Railway serve apenas como proxy para operações que requerem servidor stateful (sync controller, rate limiting).

### 4.3 Testing Requirements

**Unit + Integration Testing:**

- Testes unitários para utilities e hooks com Vitest
- Testes de integração para critical user flows (criar pedido, checkout) com React Testing Library
- Testes de API com Supertest para server routes
- Cobertura mínima: 70%

Não são necessários E2E testes Given que a verificação primária será feita via QA agent usando Playwright em browser real paracritical paths (checkout completo, fluxo WhatsApp).

### 4.4 Additional Technical Assumptions and Requests

- **Migration Strategy:** Todas as alterações de schema são versionadas em SQL migrations sob supabase/migrations/ com timestamp prefix e aplicadas via Supabase CLI
- **Environment Variables:** VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_EVOLUTION_API_URL, VITE_EVOLUTION_API_KEY
- **CI/CD:** GitHub Actions para lint (ESLint) + typecheck (TypeScript) + build; deploy automático via Vercel para frontend
- **Logging:** Structured JSON logging com pino no servidor; client-side errors capturados via Sentry (configured but not implemented)
- **Rate Limiting:** Implementado no Express server para Evolution API sync endpoints
- **Multi-Tenant Isolation:** CRÍTICO - Todas as queries devem filtrar por tenant_id extracted do JWT. Queries sem tenant_id filter são proibidas e rejeitadas em code review

---

## 5. Epic List

- **Epic 1:** Foundation & Core Infrastructure — Setup de projeto, Git, CI/CD, Supabase client, Auth, Theme, Docker Compose
- **Epic 2:** Módulos Core de Gestão — PDV, Cardápio Admin, Cardápio Online, Pedidos (Kanban), Mesas (QR Code)
- **Epic 3:** Gestão de Clientes & Programa de Fidelidade — Cadastro, histórico, cupons, pontos
- **Epic 4:** Estoque & Ficha Técnica — Ingredientes, entradas, calculo CMV
- **Epic 5:** Wha tsApp Integration — Inbox realtime, Orders receipts com IA
- **Epic 6:** Financeiro & Metas — Caixa, contas pagar, dashboard, metas faturamento
- **Epic 7:** Entregas & Logística — Mapa realtime, motoboy app
- **Epic 8:** Kitchen & Operações — KDS, operações do dia
- **Epic 9:** Admin SaaS — Dashboard multitenant

---

## 6. Epic Details

### Epic 1: Foundation & Core Infrastructure

**Epic 1 Goal:** Establish project setup, Git repository, CI/CD pipelines, Supabase client configuration, authentication system with MFA, theming support, and Docker Compose for local development infrastructure (Evolution API, n8n, PostgreSQL, Redis).

---

**Story 1.1: Project Setup & CI/CD**

As a **developer**, I want **the project to be set up with React, TypeScript, Vite, ESLint, and GitHub Actions workflow**, so that **we can start development with code quality gates and automated deployment**.

Acceptance Criteria:

1. Project created from React + TypeScript + Vite template
2. ESLint configured with React and TypeScript rules
3. GitHub Actions workflow runs lint, typecheck, and build on push
4. Vercel deploy configured for automatic deployment
5. package.json scripts include dev, build, lint, typecheck

---

**Story 1.2: Supabase Client & Environment**

As a **developer**, I want **the Supabase client to be configured with environment validation**, so that **the app fails fast with clear message when env vars are missing**.

Acceptance Criteria:

1. supabase.ts created with client initialization
2. Environment validation for required env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
3. Auth configuration with persistSession and autoRefreshToken
4. Clear error message displayed in dev mode when env missing

---

**Story 1.3: Authentication System**

As a **user**, I want **to authenticate with email and password**, so that **I can access the system securely**.

Acceptance Criteria:

1. Login page with email/password form
2. Signup page with email/password
3. Protected routes redirect to login when not authenticated
4. Session persistence across page reloads
5. Logout functionality clears session

---

**Story 1.4: MFA Setup**

As a **user**, I want **optional MFA via Google Authenticator**, so that **my account has an additional security layer**.

Acceptance Criteria:

1. MFA setup page generates QR code for Google Authenticator
2. MFA verification page validates 6-digit TOTP code
3. Login flow checks MFA when enabled
4. MFA can be disabled by admin

---

**Story 1.5: Theming (Dark/Light Mode)**

As a **user**, I want **to toggle between dark and light themes**, so that **I can work comfortably in different lighting conditions**.

Acceptance Criteria:

1. ThemeContext created with dark/light state
2. Persisted theme preference in localStorage
3. TailwindCSS dark mode tokens configured
4. Toggle button in topbar persists selection
5. Smooth transitions between themes

---

**Story 1.6: Toast Notifications**

As a **user**, I want **to receive feedback via toast notifications**, so that **I know the result of my actions**.

Acceptance Criteria:

1. ToastContext created with show/hide methods
2. Toast component with success/error/warning/info variants
3. Auto-dismiss after 4 seconds
4. Manual dismiss supported
5. Animate in/out with Framer Motion

---

**Story 1.7: Docker Compose Infrastructure**

As a **developer**, I want **Docker Compose setup for local development**, so that **I can run Evolution API, n8n, PostgreSQL, and Redis locally**.

Acceptance Criteria:

1. docker-compose.yml with services:
   - evolution_api (port 8085)
   - n8n (port 5678)
   - postgres (port 5432)
   - redis (port 6379)
2. Environment variables configured
3. Networks and volumes configured
4. README or docs for startup commands

---

### Epic 2: Módulos Core de Gestão

**Epic 2 Goal:** Deliver complete core management modules including PDV, Cardápio Admin, Cardápio Online, Pedidos Kanban, and Mesa QR Code system that allow basic restaurant operations from taking orders to viewing them in kitchen.

---

**Story 2.1: Cardápio Admin - Categorias**

As a **manager**, I want **to manage product categories**, so that **I can organize my menu**.

Acceptance Criteria:

1. List categories with name, description, order, active status
2. Create category with name, description, order
3. Edit category details
4. Delete category (only if no products linked)
5. Reorder categories via drag-and-drop

---

**Story 2.2: Cardápio Admin - Produtos**

As a **manager**, I want **to manage products**, so that **I can add items to my menu**.

Acceptance Criteria:

1. List products filtered by category
2. Create product with name, description, category, base price, image
3. Edit product details
4. Delete product (only if not in orders)
5. Support multiple price tiers per product (tamanhos)
6. Support sabores distinct por tamanho

---

**Story 2.3: PDV - Interface**

As an **attendant**, I want **to take orders in the PDV**, so that **I can register customer orders quickly**.

Acceptance Criteria:

1. Category carousel for filtering products
2. Product grid with images and prices
3. Product detail dialog showing variações
4. Size selection (P/M/G/F) with price adjustment
5. Flavor selection where applicable
6. Quantity controls
7. Add to order with one tap
8. Running total always visible
9. Clear/Submit order actions

---

**Story 2.4: Pedidos - Kanban**

As an **operator**, I want **to view and manage orders in Kanban**, so that **I can track order flow**.

Acceptance Columns:

1. Novo - novos pedidos recebidos
2.Confirmado - confirmados pelo atendente
3. Em Prep - em preparo na cozinha
4. Pronto - prontos para entrega
5. Entregue - entrega finalizada
6. Cancelado - pedidos cancelados

Acceptance Criteria:

1. Drag-and-drop between columns
2. Order card shows items count, total, table/customer
3. Click to view order details
4. Filter by date range
5. Filter by delivery/pickup

---

**Story 2.5: Cardápio Online**

As a **customer**, I want **to browse the menu online**, so that **I can view offerings before visiting**.

Acceptance Criteria:

1. Publicly accessible (no auth required)
2. Category tabs for navigation
3. Product cards with image, name, price
4. Add to cart functionality
5. Cart review before checkout
6. Checkout form (name, phone, address)
7. Submit creates pedido online

---

**Story 2.6: Mesa - QR Code**

As a **customer**, I want **to scan QR Code at my table**, so that **I can browse the menu and order**.

Acceptance Criteria:

1. Unique QR Code generated per mesa
2. QR Code redirects to /mesa/:numero
3. Mesa page shows cardápio online
4. Orders linked to mesa number
5. Running total visible to table

---

**Story 2.7: Divisão de Conta**

As a **customer**, I want **to split the bill**, so that **each person pays for what they ordered**.

Acceptance Criteria:

1. Mesa view shows each item ordered
2. Assign item to person (name)
3. Calculate individual totals
4. Generate payment summary per person

---

### Epic 3: Gestão de Clientes & Programa de Fidelidade

**Epic 3 Goal:** Enable customer management with profiles, order history, loyalty points accumulation, and discount coupons that drive customer retention.

---

**Story 3.1: Clientes - Cadastro**

As a **manager**, I want **to manage customer records**, so that **I can track customer data and history**.

Acceptance Criteria:

1. List all customers with search
2. Create customer (name, phone, email, address)
3. Edit customer details
4. View customer order history
5. Delete customer (soft delete)

---

**Story 3.2: Programa de Fidelidade**

As a **customer**, I want **to earn points on orders**, so that **I can redeem for discounts**.

Acceptance Criteria:

1. Points accumulation: 1 point per R$1 spent
2. Points balance visible in customer profile
3. Redemption: 100 points = R$10 discount
4. Points expiry after 12 months of inactivity

---

**Story 3.3: Cupons de Desconto**

As a **manager**, I want **to create discount coupons**, so that **I can run promotions**.

Acceptance Criteria:

1. Create coupon: code, discount %, minimum order, valid until
2. Validate coupon eligibility at checkout
3. Apply discount automatically
4. Track coupon usage

---

### Epic 4: Estoque & Ficha Técnica

**Epic 4 Goal:** Enable inventory management with ingredient tracking, supplier management, stock entries, and recipe costing via technical sheets that automatically calculate product margins.

---

**Story 4.1: Ingredientes**

As a **manager**, I want **to manage ingredients**, so that **I can track stock levels**.

Acceptance Criteria:

1. List ingredients with current stock
2. Create ingredient (name, unit, supplier, min stock)
3. Edit ingredient details
4. Alert when below min stock

---

**Story 4.2: Entradas de Estoque**

As a **manager**, I want **to register stock entries**, so that **I can replenish ingredients**.

Acceptance Criteria:

1. Register entry: ingredient, quantity, supplier, lot, expiry date
2. Update ingredient current stock
3. Entry history per ingredient

---

**Story 4.3: Ficha Técnica**

As a **manager**, I want **to create technical sheets**, so that **I can calculate product cost**.

Acceptance Criteria:

1. Link product to ingredients with quantities
2. Calculate total cost per product
3. Calculate markup percentage
4. Suggest sell price based on margin target

---

### Epic 5: WhatsApp Integration

**Epic 5 Goal:** Enable WhatsApp as sales channel with AI-powered order receipt, real-time inbox chat, and automated status notifications that keep customers informed.

---

**Story 5.1: WhatsApp Manager Config**

As an **admin**, I want **to configure WhatsApp instance**, so that **I can manage the phone number connection**.

Acceptance Criteria:

1. Generate QR Code for pairing
2. Show connection status (connected/disconnected)
3. Instance mapping to tenant via configuracoes_whatsapp table
4. Environment variables for Evolution API

---

**Story 5.2: WhatsApp Inbox**

As an **operator**, I want **to chat with customers via WhatsApp**, so that **I can provide support**.

Acceptance Criteria:

1. Real-time chat via Supabase Realtime
2. Message history per conversation
3. Send and receive messages
4. Typing indicators

---

**Story 5.3: WhatsApp Orders - IA**

As a **customer**, I want **to order via WhatsApp**, so that **I can place orders naturally through chat**.

Acceptance Criteria:

1. Customer sends message with order intent
2. IA parses items, quantities, variations
3. Confirmation message sent back
4. Order created in database on confirmation
5. Extract name, phone, address if delivery

---

**Story 5.4: Status Notifications**

As a **customer**, I want **to receive WhatsApp notifications**, so that **I know my order status**.

Acceptance Criteria:

1. Trigger notification on status change
2. Template message per status
3. Customer phone number required in pedido

---

### Epic 6: Financeiro & Metas

**Epic 6 Goal:** Provide complete financial management including cash movements, accounts payable, financial dashboard, and revenue goal tracking that helps owners understand business performance.

---

**Story 6.1: Caixa**

As an **operator**, I want **to manage cash movements**, so that **I can track cash flow daily**.

Acceptance Criteria:

1. Open shift with initial balance
2. Record sangria (withdrawal)
3. Record suprimento (deposit)
4. Close shift with final count
5. Daily cash report

---

**Story 6.2: Contas a Pagar**

As a **manager**, I want **to manage bills**, so that **I can track payables**.

Acceptance Criteria:

1. Create bill (description, amount, due date, supplier, category)
2. Mark as paid
3. Overdue alerts
4. Category filtering
5. Paid/unpaid summaries

---

**Story 6.3: Dashboard Financeiro**

As a **manager**, I want **to view financial metrics**, so that **I can understand business performance**.

Acceptance Criteria:

1. Today's revenue
2. This week/month comparison
3. Profit margin (if ficha técnica populated)
4. Cash flow chart
5. Top selling products

---

**Story 6.4: Metas de Faturamento**

As a **manager**, I want **to set revenue goals**, so that **I can track performance against targets**.

Acceptance Criteria:

1. Create meta: period (day/week/month), target amount
2. Dashboard shows progress vs target
3. Alert when below percentage

---

### Epic 7: Entregas & Logística

**Epic 7 Goal:** Enable delivery management with real-time map tracking, motoboy assignment, and driver app that optimizes delivery operations.

---

**Story 7.1: Mapa de Entregas**

As a **manager**, I want **to see delivery map**, so that **I can track active deliveries**.

Acceptance Criteria:

1. Map showing deliveries in progress
2. Motoboy locations via GPS
3. Delivery details on marker click
4. Active vs completed filtering

---

**Story 7.2: Motoboy Assignment**

As a **manager**, I want **to assign deliveries to drivers**, so that **orders get delivered**.

Acceptance Criteria:

1. List available motoboys
2. Manual assignment by drag or selection
3. Assignment triggers WhatsApp notification

---

**Story 7.3: Motoboy App (PWA)**

As a **motoboy**, I want **to receive and update delivery status**, so that **I can complete deliveries efficiently**.

Acceptance Criteria:

1. Login via simple code (4-digit)
2. See assigned active deliveries
3. One-tap status updates: picking up, delivering, delivered
4. Turn-by-turn navigation link

---

### Epic 8: Kitchen & Operações

**Epic 8 Goal:** Provide Kitchen Display System for kitchen staff and daily operations view that enables efficient order production workflow.

---

**Story 8.1: Kitchen Display (KDS)**

As a **kitchen operator**, I want **to see incoming orders**, so that **I can prepare them efficiently**.

Acceptance Criteria:

1. Fullscreen mode
2. Orders grouped by status (Novo, Em Prep, Pronto)
3. Timer showing time since order
4. Alert sound on new order
5. Touch to advance status
6. Large fonts readable at distance

---

**Story 8.2: Operações do Dia**

As a **manager**, I want **to view daily operations summary**, so that **I can monitor the day**.

Acceptance Criteria:

1. Orders count by status
2. Revenue today
3. Average preparation time
4. Top products today

---

### Epic 9: Admin SaaS

**Epic 9 Goal:** Provide multi-tenant admin dashboard for SaaS operators to manage all establishments and view aggregated metrics.

---

**Story 9.1: Admin Login**

As a **SaaS admin**, I want **to login to admin panel**, so that **I can manage tenants**.

Acceptance Criteria:

1. Separate /admin/login route
2. Admin credentials validated
3. Session separated from tenant users

---

**Story 9.2: Admin Dashboard**

As a **SaaS admin**, I want **to view all tenants**, so that **I can monitor SaaS health**.

Acceptance Criteria:

1. List all tenants with metrics
2. Active tenants count
3. Total orders today
4. Revenue today aggregated
5. Tenant registration date

---

**Story 9.3: Tenant Management**

As a **SaaS admin**, I want **to manage tenants**, so that **I can enable/disable tenants**.

Acceptance Criteria:

1. View tenant details
2. Suspend/activate tenant
3. View tenant metrics drill-down

---

## 7. Checklist Results Report

**[Checklist não executado - Pendente]**

Antes de prosseguir, executar o PM Checklist para validar o PRD completo e gerar o relatório.

---

## 8. Next Steps

### 8.1 UX Expert Prompt

```
@ux-design-expert

Criar a arquitetura de UI/UX para o sistema Kero (SaaS de gestão para pizzarias/restaurantes) baseada no PRD docs/prd.md.

Prioridades:
1. Design System com tokens (cores, tipografia, spacing)
2. Wireframes para as telas核心: PDV, Kitchen Display, Cardápio Online
3. Especificação de responsividade (mobile first para cardápio)
4. Animações e transições (Framer Motion)
5. Accessibility (WCAG AA)

Consulte docs/prd.md para requisitos completos.
```

### 8.2 Architect Prompt

```
@architect

Criar a arquitetura técnica para o sistema Kero (SaaS de gestão para pizzarias/restaurantes) baseada no PRD docs/prd.md.

Stack:
- Frontend: React 19 + TypeScript + Vite + TailwindCSS 4
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage)
- Infra: Docker (Evolution API + n8n) + Express (Railway)

Decisões necessárias:
1. Database schema completo (tables, relations, indexes)
2. RLS policies multi-tenant
3. API routes design
4. File structure
5. Security hardening

Consulte docs/prd.md para requisitos completos.
```

---

> **Fim do Documento**
> **PRD Version 1.0**