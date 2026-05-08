# RELATÓRIO DE AUDITORIA COMPLETO - KERO
## Branch: imaginary-amaryllis | Data: 2026-05-07

---

## PARTE 1: SUMÁRIO EXECUTIVO

### Estado do Projeto
- **Build:** FALHANDO (35+ erros TypeScript)
- **Vulnerabilidades:** 35 (19 high, 15 moderate, 1 low)
- **Cobertura de Testes:** <5%
- **CI/CD:** Ausente
- **Total de arquivos TSX/TS:** 48
- **Total de páginas:** 18
- **Total de componentes:** ~27

### Classificação Geral
| Categoria | Status |
|-----------|--------|
| Arquitetura | ⚠️ Estrutura OK, mas acoplamentoalto |
| TypeScript | ❌ Build bloqueado |
| Segurança | ❌ Vulnerabilidades críticas |
| Testes | ❌ Cobertura insuficiente |
| Documentação | ⚠️ Básica, faltacompleta |
| CI/CD | ❌ Ausente |
| Observabilidade | ❌ Primitiva (console.log) |

---

## PARTE 2: ANÁLISE DETALHADA POR MÓDULO

### 2.1 LIB/ (Utilitários)

#### supabase.ts (ESSENCIAL)
```typescript
// Linhas 1-21
// Problema: Fallback com placeholder hardcoded permite inicializar sem credenciais
// Recomendação: Falhar explicitamente em vez de usar placeholders
```
**Veredito:** ESSENCIAL - Client Supabase, usado em todo lugar.

#### printReceipt.ts (ESSENCIAL)
```typescript
// Linhas 1-73
// Problemas:
// - 'pedido' tipado como 'any' (linha 5, 47)
// - Sem validação de entrada
// - Console.error em produção (linha 70)
```
**Veredito:** ESSENCIAL - Funcionalidade crítica de impressão.

#### tenant-utils.ts (ESSENCIAL)
```typescript
// Linhas 1-177
// 15 funções utilitárias para tenant
// Bom: JSDoc, tipos, error handling
// Problema: Duplicação com getTenantId() em pages
```
**Veredito:** ESSENCIAL - Abstrai lógica de multi-tenancy.

#### query-cache.ts (OPCIONAL)
```typescript
// Linhas 1-53
// Cache em memória manual
// Problema: React Query já faz cache, implementação redundante
```
**Veredito:** OPCIONAL - React Query já gerencia cache.

#### syncCliente.ts (ESSENCIAL)
```typescript
// Linhas 1-47
// Sync de clientes do pedido
// Problema: Lógica de perfil misturada (VIP, recorrente)
```
**Veredito:** ESSENCIAL - Funcionalidade de CRM básico.

#### tracking.ts (DEPRECADO)
```typescript
// Linhas 1-126
// DUPLICADO: Mesmo código existe em src/lib/tracking.ts
// Este arquivo tem console.log apenas
```
**Veredito:** REMOVER - Código duplicado e stub.

---

### 2.2 HOOKS/

#### useAuth.tsx (ESSENCIAL)
```typescript
// Linhas 1-160
// Problemas:
// - fetchRole com any implícito (linha 60, 96)
// - Sem cache de role
// - MFA verify usa any
```
**Veredito:** ESSENCIAL - Autenticação e RBAC.

#### useRealtime.ts (ESSENCIAL)
```typescript
// Linhas 1-123
// Problemas:
// - payload implícito 'any' (linha 70)
// - filterClauses declarado mas não usado (linha 52-55)
// - Channel naming com Date.now() causa leak
```
**Veredito:** ESSENCIAL - Realtime subscriptions.

#### useCozinha.ts (ESSENCIAL)
```typescript
// Linhas 1-195
// Problema: audioKDS import mas não usa hook de contexto
```
**Veredito:** ESSENCIAL - KDS da cozinha.

#### usePedidos.ts (ESSENCIAL)
```typescript
// Linhas 1-41
// Problema: useCallback com array vazio (linha 35)
```
**Veredito:** ESSENCIAL - Hook de pedidos.

#### useDashboard.ts (STUB)
```typescript
// Linhas 1-36
// Implementação vazia - só retorna estado
```
**Veredito:** OPCIONAL - Stub sem implementação real.

#### useAdminMetrics.ts (ESSENCIAL)
```typescript
// Linhas 1-71
// Admin dashboard metrics
```
**Veredito:** ESSENCIAL (para admin) - Caso contrário OPCIONAL.

#### useGlobalMetrics.ts (OPCIONAL)
```typescript
// Linhas 1-57
// Usa ADMIN_PROJECTS que tem só 1 projeto
// Só faz sentido com múltiplos tenants
```
**Veredito:** OPCIONAL para projeto único.

#### useMetasFaturamento.ts (ESSENCIAL)
```typescript
// Linhas 1-133
// Bom: tipagem, mutations, query invalidation
```
**Veredito:** ESSENCIAL - Metas de faturamento.

#### useThermalPrinter.ts (ESSENCIAL)
```typescript
// Linhas 1-139
// Problemas:
// - WebUSBReceiptPrinter sem tipos corretos
// - reconnect() e connect() não existem na API do pacote
// - localStorage para vendorId/productId (sensível?)
```
**Veredito:** ESSENCIAL - Impressão térmica.

#### tracking.ts (DEPRECADO)
```typescript
// Linhas 1-32
// Stub com console.log - não implementação real
```
**Veredito:** REMOVER - Stub abandonado.

---

### 2.3 CONTEXTS/

#### ToastContext.tsx (ESSENCIAL)
```typescript
// Linhas 1-63
// Bom: tipagem, useCallback otimizado
// Problema: hardcoded timeout de 4000ms
```
**Veredito:** ESSENCIAL - Sistema de notificações.

#### AuthContext.tsx (WRAPPER)
```typescript
// Linhas 1-4
// Apenas re-exporta de hooks/useAuth.tsx
```
**Veredito:** ESSENCIAL - API de consumo.

#### ThemeContext.tsx (ESSENCIAL)
```typescript
// Linhas 1-56
// Problema: Sempre força dark theme, toggle não funciona
```
**Veredito:** ESSENCIAL - Tema da UI.

#### MetaPeriodoContext.tsx (ESSENCIAL)
```typescript
// Linhas 1-26
// Simples mas necessário para Dashboard
```
**Veredito:** ESSENCIAL - Período de metas.

---

### 2.4 SCHEMAS/

#### index.ts (ESSENCIAL)
```typescript
// Central exportador - bem organizado
// Helpers validateData e apiResponseSchema são úteis
```
**Veredito:** ESSENCIAL - Centralização de schemas.

#### pedidoSchema.ts (ESSENCIAL)
```typescript
// Linhas 1-145
// Excelente: Zod validation completa
// Problema: telefone regex muito rígido
```
**Veredito:** ESSENCIAL - Validação de pedidos.

#### produtoSchema.ts (ESSENCIAL)
```typescript
// Bom: schemas separados para create/update/form
```
**Veredito:** ESSENCIAL - Validação de produtos.

#### clienteSchema.ts (ESSENCIAL)
```typescript
// Bom: validação completa
```
**Veredito:** ESSENCIAL - Validação de clientes.

#### Outros schemas (OPCIONAL)
```typescript
// ingredienteSchema, fornecedorSchema, cupomSchema, etc.
// Úteis mas podem não ser usados se funcionalidades incompletas
```
**Veredito:** OPCIONAL para funcionalidades não implementadas.

---

### 2.5 COMPONENTS/

#### ErrorBoundary.tsx (ESSENCIAL)
```typescript
// Linhas 1-54
// Problemas:
// - import { Component, ReactNode } - ReactNode deveria ser type import
// - process.env.NODE_ENV não existe no browser (linha 37)
```
**Veredito:** ESSENCIAL - Error handling global.

#### Toast.tsx (ESSENCIAL)
```typescript
// Linhas 1-43
// Bom: AnimatePresence, cores configuradas
```
**Veredito:** ESSENCIAL - UI de toasts.

#### Sidebar.tsx (ESSENCIAL)
```typescript
// Linhas 1-160
// Problema: window.innerWidth em render (linha 30) causa hydration mismatch
```
**Veredito:** ESSENCIAL - Navegação principal.

#### Layout.tsx (ESSENCIAL)
```typescript
// Linhas 1-34
// Importa FloatingAgentChat - funcional optional
```
**Veredito:** ESSENCIAL - Layout base.

#### ProductCard.tsx (ESSENCIAL)
```typescript
// Linhas 1-50
// Simples, usa tipos de página (não de src/types)
```
**Veredito:** ESSENCIAL - Cardápio online.

#### ProtectedRoute.tsx (ESSENCIAL)
```typescript
// Linhas 1-72
// Role-based access control
```
**Veredito:** ESSENCIAL - Segurança de rotas.

#### FloatingAgentChat.tsx (OPCIONAL)
```typescript
// Linhas 1-455
// CRÍTICO: 455 linhas, muito complexo
// action.type tem 'update_store_settings' etc que não existem em ActionPayload
// Problema TypeScript build erro 55+
```
**Veredito:** OPCIONAL - Chatbot IA, não essencial para operação.

#### AgentAvatar.tsx (OPCIONAL)
```typescript
// Linhas 1-72
// SVG hardcoded - decorative only
```
**Veredito:** OPCIONAL - Decorativo.

#### Topbar.tsx (ESSENCIAL)
```typescript
// Linhas 1-86
// Barra de busca, notificações, perfil
```
**Veredito:** ESSENCIAL - Header da app.

---

### 2.6 PAGES/ (Análise dos arquivos grandes)

#### CardapioAdminPage.tsx (1375 linhas) ❌ BLOATER
```typescript
// PROBLEMAS CRÍTICOS:
// 1. 1375 linhas - impossível manter
// 2. getTenantId() local de linhas 14-140 (deveria usar lib/tenant-utils)
// 3. 140 linhas só para extrair tenant_id de auth token
// 4. Múltiplos console.log de debug em produção (linhas 16, 19, 65, etc.)
// 5. Try/catch em JSON.parse sem tratamento adequado
// 6. sessionStorage遍历 de múltiplas chaves (linhas 79-99)
// 7. Sem lazy loading de estados (loading spinners)
// 8. Form large com useForm - campos mal tipados
```
**Veredito:** ESSENCIAL - Funcionalidade crítica. PRECISA REFATORAR.

#### DashboardPage.tsx (865 linhas) ❌ BLOATER
```typescript
// PROBLEMAS:
// 1. 865 linhas
// 2. getTenantId() duplicado (linhas 78-89)
// 3. useState excessivos (15+)
// 4. Linhas 531: 'eventos_jornada' Table type error
// 5. Recharts formatter type errors (linhas 678, 710)
```
**Veredito:** ESSENCIAL - Funcionalidade crítica. PRECISA REFATORAR.

#### PdvPage.tsx (807 linhas) ❌ BLOATER
```typescript
// PROBLEMAS:
// 1. 807 linhas
// 2. Lógica de estado muito complexa (50+ useState)
// 3. Mesa/pedido mixing
// 4. Sem separação de concerns
```
**Veredito:** ESSENCIAL - PDV crítico. PRECISA REFATORAR.

#### Other Pages - Resumo:
| Página | Linhas | Status |
|--------|--------|--------|
| PedidosPage.tsx | ~600 | ESSENCIAL - refatorar |
| CozinhaPage.tsx | ~300 | ESSENCIAL |
| CardapioOnlinePage.tsx | ~500 | ESSENCIAL |
| EstoquePage.tsx | ~400 | ESSENCIAL |
| FinanceiroPage.tsx | ~300 | ESSENCIAL |
| ConfiguracoesPage.tsx | ~500 | ESSENCIAL |
| MesaPage.tsx | ~300 | ESSENCIAL |
| EntregasPage.tsx | ~300 | ESSENCIAL |
| ClientesPage.tsx | ~400 | ESSENCIAL |
| LoginPage.tsx | ~200 | ESSENCIAL |
| MotoboyApp.tsx | ~300 | ESSENCIAL |
| PedidoStatusPage.tsx | ~200 | ESSENCIAL |
| MfaPage.tsx | ~150 | ESSENCIAL |
| MfaSetupPage.tsx | ~150 | ESSENCIAL |
| AdminLogin.tsx | ~100 | ESSENCIAL |
| AdminDashboard.tsx | ~200 | ESSENCIAL |
| WhatsappInboxPage.tsx | ~400 | ESSENCIAL |

---

### 2.7 UTILS/

#### audioKDS.ts (ESSENCIAL)
```typescript
// Linhas 1-46
// Web Audio API para sons do KDS
// Bom: verificação de AudioContext, resume se suspended
```
**Veredito:** ESSENCIAL - Feedback auditory.

---

### 2.8 TYPES/

#### index.ts (ESSENCIAL)
```typescript
// Definições de tipos - bom para IntelliSense
// UnifiedPedido usado em todo lugar
```
**Veredito:** ESSENCIAL.

---

### 2.9 CONSTANTS/

#### index.ts (ESSENCIAL)
```typescript
// 155 linhas de constantes
// Bom: organização, tipos
// OBS: ROLES aqui diferente de useAuth (motoboy, cozinha vs gerente, atendente)
```
**Veredito:** ESSENCIAL - Manter consistente com useAuth.

---

### 2.10 CONFIG/

#### adminProjects.ts (OPCIONAL)
```typescript
// Só 1 projeto hardcoded
// Admin dashboard só faz sentido com múltiplos
```
**Veredito:** OPCIONAL.

---

## PARTE 3: CLASSIFICAÇÃO ESSENCIAL VS OPCIONAL

### 3.1 ESSENCIAL (Crítico para operação)

#### Core
- [x] src/lib/supabase.ts - Client Supabase
- [x] src/lib/printReceipt.ts - Impressão
- [x] src/lib/tenant-utils.ts - Multi-tenancy
- [x] src/lib/syncCliente.ts - CRM básico
- [x] src/contexts/AuthContext.tsx - Auth API
- [x] src/contexts/ToastContext.tsx - Notificações
- [x] src/contexts/ThemeContext.tsx - Tema
- [x] src/contexts/MetaPeriodoContext.tsx - Períodos
- [x] src/hooks/useAuth.tsx - Auth hook
- [x] src/hooks/useRealtime.ts - Realtime
- [x] src/hooks/useCozinha.ts - KDS
- [x] src/hooks/usePedidos.ts - Pedidos
- [x] src/hooks/useMetasFaturamento.ts - Metas
- [x] src/hooks/useThermalPrinter.ts - Impressão
- [x] src/utils/audioKDS.ts - Áudio KDS

#### Components
- [x] src/components/ErrorBoundary/ - Error handling
- [x] src/components/Toast.tsx - UI
- [x] src/components/Sidebar.tsx - Navegação
- [x] src/components/Layout.tsx - Layout base
- [x] src/components/Topbar.tsx - Header
- [x] src/components/ProtectedRoute.tsx - RBAC rotas
- [x] src/components/ProductCard.tsx - Cardápio

#### Pages (TODAS essenciais, algumas precisam refatoração)
- [x] DashboardPage.tsx (refatorar - 865 linhas)
- [x] PdvPage.tsx (refatorar - 807 linhas)
- [x] CardapioAdminPage.tsx (refatorar - 1375 linhas)
- [x] PedidosPage.tsx (refatorar)
- [x] CardapioOnlinePage.tsx
- [x] CozinhaPage.tsx
- [x] EstoquePage.tsx
- [x] FinanceiroPage.tsx
- [x] ConfiguracoesPage.tsx
- [x] MesaPage.tsx
- [x] EntregasPage.tsx
- [x] ClientesPage.tsx
- [x] LoginPage.tsx
- [x] MotoboyApp.tsx
- [x] PedidoStatusPage.tsx

#### Schemas
- [x] src/schemas/index.ts - Central exports
- [x] src/schemas/pedidoSchema.ts
- [x] src/schemas/produtoSchema.ts
- [x] src/schemas/clienteSchema.ts
- [x] src/schemas/* (todos os outros são úteis)

#### Types/Constants
- [x] src/types/index.ts
- [x] src/constants/index.ts
- [x] src/config/adminProjects.ts

---

### 3.2 OPCIONAL (Secondary/Decorativo/Stub)

#### Components
- [ ] src/components/FloatingAgentChat.tsx (455 linhas - chatbot IA)
- [ ] src/components/AgentAvatar.tsx (SVG decorativo)

#### Hooks
- [ ] src/hooks/useDashboard.ts (stub vazio)
- [ ] src/hooks/useAdminMetrics.ts (sistema admin)
- [ ] src/hooks/useGlobalMetrics.ts (multi-tenant admin)
- [ ] src/lib/query-cache.ts (redundante com React Query)

#### Files
- [ ] src/hooks/tracking.ts (stub depreciado)
- [ ] src/lib/tracking.ts (pode manter se analytics for usado)

#### Pages
- [ ] src/pages/admin/AdminDashboard.tsx (sistema admin)
- [ ] src/pages/admin/AdminLogin.tsx (sistema admin)

#### Configs
- [ ] src/config/adminProjects.ts (admin multi-tenant)

---

### 3.3 DEPRECIADO/REMOVER

- [ ] src/hooks/tracking.ts - Stub com console.log apenas
- [ ] src/lib/tracking.ts - Duplicado, usar um ou outro
- [ ] src/contexts/AuthContext.tsx - Só re-exporta
- [ ] server/node_modules/ - node_modules no repo
- [ ] temp_*.txt, test_*.js, check_*.js - Arquivos temporários

---

## PARTE 4: PROBLEMAS CRÍTICOS

### 4.1 Build Quebrado (35+ erros TypeScript)

```typescript
// ERRO 1: ErrorBoundary - ReactNode type
import { Component, ReactNode } from 'react'  // ❌ ReactNode precisa ser type import

// ERRO 2: ErrorBoundary - process não existe
if (process.env.NODE_ENV === 'development')  // ❌ Não existe no browser

// ERRO 3: FloatingAgentChat - action types
case 'update_store_settings':  // ❌ Não existe em ActionPayload
case 'update_delivery_settings':  // ❌ Não existe em ActionPayload

// ERRO 4: useThermalPrinter - API inexistente
WebUSBReceiptPrinter.reconnect()  // ❌ Método não existe
WebUSBReceiptPrinter.connect()  // ❌ Método não existe

// ERRO 5: printReceipt - import errado
new ReceiptPrinterEncoder()  // ❌ Não é constructable

// ERRO 6: useRealtime - postgres_changes type
channel.on('postgres_changes', ...)  // ❌ Sobrecarga incorreta

// ERRO 7: CardapioAdminPage - getTenantId duplicado
// 140 linhas de parsing auth token - deveria ser lib

// ERRO 8: DashboardPage - Table type
Table = 'eventos_jornada'  // ❌ Não existe na union

// ERRO 9: ConfiguracoesPage - Config type missing props
meta_pixel_id não existe  // ❌ type Config incompleto

// ERRO 10: CardapioAdminPage - useForm getValues
form.getValues('nome')  // ❌ Tipo incompatível
```

### 4.2 Vulnerabilidades (npm audit)

| Dependência | Versão Atual | Vulnerabilidade | Severidade |
|-------------|--------------|-----------------|------------|
| axios | 1.6.0 | SSRF, Prototype Pollution | HIGH |
| vite | 8.0.1 | Path Traversal, Arbitrary File Read | HIGH |
| path-to-regexp | 4.0.0-6.2.2, 8.0.0-8.3.0 | ReDoS, DoS | HIGH |
| undici | <=6.23.0 | Unbounded Memory, CRLF Injection | HIGH |
| tar | <=7.5.10 | Arbitrary File Read/Write | HIGH |
| minimatch | 10.0.0-10.2.2 | ReDoS | HIGH |
| follow-redirects | <=1.15.11 | Header Leak | MODERATE |
| postcss | <8.5.10 | XSS | MODERATE |

### 4.3 Código Duplicado

1. **getTenantId()** - 3 cópias:
   - src/pages/CardapioAdminPage.tsx:14-140
   - src/pages/DashboardPage.tsx:78-89
   - src/pages/PdvPage.tsx (diferente)

2. **tracking.ts** - 2 versões:
   - src/lib/tracking.ts (completo)
   - src/hooks/tracking.ts (stub)

3. **auth/session parsing** - múltiplas variações

### 4.4 Code Smells

1. **Arquivos muito grandes:**
   - CardapioAdminPage.tsx: 1375 linhas
   - DashboardPage.tsx: 865 linhas
   - PdvPage.tsx: 807 linhas

2. **Console.log em produção:**
   - CardapioAdminPage.tsx: 10+ console.log
   - tracking.ts: console.log de debug
   - useCozinha.ts: console.error

3. **Any implícito:**
   - payload em callbacks
   - dados do Supabase sem tipagem
   - form state genérico

---

## PARTE 5: PLANO DE REFATORAÇÃO

### 5.1 Curto Prazo (1-2 semanas) - CRÍTICO

| # | Ação | Esforço | Prioridade |
|---|------|---------|------------|
| 1 | Corrigir TypeScript errors que bloqueiam build | 2 dias | CRÍTICA |
| 2 | npm audit fix para vulnerabilidades | 2 horas | CRÍTICA |
| 3 | Remover código duplicado getTenantId() | 4 horas | ALTA |
| 4 | Configurar @types/node para browser | 30 min | ALTA |
| 5 | Criar CI/CD com GitHub Actions | 1 dia | ALTA |

### 5.2 Médio Prazo (1 mês) - QUALIDADE

| # | Ação | Esforço | Prioridade |
|---|------|---------|------------|
| 6 | Refatorar CardapioAdminPage (1375 → ~400 linhas) | 1 semana | ALTA |
| 7 | Refatorar DashboardPage (865 → ~400 linhas) | 3 dias | ALTA |
| 8 | Refatorar PdvPage (807 → ~400 linhas) | 3 dias | ALTA |
| 9 | Habilitar ESLint rules progressivamente | 1 dia | MÉDIA |
| 10 | Remover console.log de debug | 2 horas | MÉDIA |
| 11 | Adicionar tipos para Supabase responses | 4 horas | MÉDIA |

### 5.3 Longo Prazo (2-3 meses) - OTIMIZAÇÃO

| # | Ação | Esforço | Prioridade |
|---|------|---------|------------|
| 12 | Cobertura de testes >70% | 2 semanas | ALTA |
| 13 | Lazy loading de páginas | 1 dia | MÉDIA |
| 14 | Implementar logging estruturado | 1 dia | MÉDIA |
| 15 | Remover FloatingAgentChat (se não usar) | 1 dia | BAIXA |
| 16 | Migrar para React Query v5 | 1 dia | BAIXA |

---

## PARTE 6: RECOMENDAÇÕES DE ENXUGAMENTO

### 6.1 Remoções Recomendadas

```bash
# Arquivos temporários
rm temp_*.txt test_*.js check_*.js

# Código duplicado
rm src/hooks/tracking.ts  # Manter src/lib/tracking.ts

# Context redundante
rm src/contexts/AuthContext.tsx  # Re-export, usar hooks/useAuth direto

# Node modules no repo
rm -rf server/node_modules/

# Deps não usadas (após verificar)
npm uninstall @point-of-sale/webusb-receipt-printer  # Se não usar
npm uninstall react-countup  # Se não usar
npm uninstall recharts  # Se dashboard não usar
```

### 6.2 Simplificações

1. **Unificar getTenantId()** - Usar tenant-utils.ts apenas
2. **Remover query-cache.ts** - React Query já faz cache
3. **Simplificar FloatingAgentChat** - Reduzir de 455 para ~200 linhas ou remover
4. **Consolidar tracking** - Um arquivo só (lib/tracking.ts)
5. **Admin dashboard** - Remover se não multi-tenant

### 6.3 Meta de Redução

| Métrica | Atual | Meta |
|---------|-------|------|
| Arquivos .ts/.tsx | 48 | 40 |
| Linhas por arquivo (média) | ~300 | <200 |
| Dependencies | 46 | 40 |
| Console.log de debug | 20+ | 0 |

---

## PARTE 7: CHECKLIST DE AÇÕES

### CRÍTICAS (Fazer agora)
- [ ] Corrigir 35+ TypeScript errors
- [ ] Executar npm audit fix
- [ ] Criar GitHub Actions CI
- [ ] Bloquear merge se build falhar

### ESSENCIAIS (Esta semana)
- [ ] Extrair getTenantId() para lib
- [ ] Remover console.log de produção
- [ ] Corrigir ErrorBoundary (type imports)
- [ ] Corrigir WebUSBReceiptPrinter types

### RECOMENDADAS (Este mês)
- [ ] Refatorar CardapioAdminPage
- [ ] Refatorar DashboardPage
- [ ] Refatorar PdvPage
- [ ] Habilitar ESLint rules gradualmente
- [ ] Adicionar testes unitários

### OPCIONAIS (将来 - Future)
- [ ] Remover FloatingAgentChat se não usar
- [ ] Simplificar admin dashboard
- [ ] Migrar para React Query v5
- [ ] Adicionar Sentry monitoring

---

**Auditoria completa em:** 2026-05-07
**Total de linhas auditadas:** ~8000+
**Arquivos analisados:** 50+
**Commits desde última auditoria:** 1 (ea83390)