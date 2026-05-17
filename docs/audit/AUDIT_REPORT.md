# AUDIT_REPORT.md — Auditoria Técnica Completa do Kero

> **Data da Auditoria**: 2026-04-12  
> **Auditor**: Engenheiro Sênior QA  
> **Stack**: React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4 + Supabase + React Router v7 + React Query 5

---

## 1. ROTAS

### 1.1 Mapa de Rotas Declaradas em App.tsx

| Rota | Componente | Arquivo Existe? |
|------|-----------|----------------|
| /login | LoginPage | ✅ |
| /cardapio/:slug | CardapioOnlinePage | ✅ |
| /mesa/:numero | MesaPage | ✅ |
| /motoboy | MotoboyApp | ✅ |
| /pedido/:numero | PedidoStatusPage | ✅ |
| /cozinha | CozinhaPage | ✅ |
| /mfa-verify | MfaPage | ✅ |
| /admin/login | AdminLogin | ✅ |
| /admin | AdminDashboard | ✅ |
| / | DashboardPage | ✅ |
| /pedidos | PedidosPage | ✅ |
| /pdv | PdvPage | ✅ |
| /cardapio-admin | CardapioAdminPage | ✅ |
| /clientes | ClientesPage | ✅ |
| /estoque | EstoquePage | ✅ |
| /financeiro | FinanceiroPage | ✅ |
| /entregas | EntregasPage | ✅ |
| /whatsapp | WhatsappInboxPage | ✅ |
| /whatsapp-pedidos | WhatsAppOrdersPage | ✅ |
| /operacoes | OperacoesPage | ✅ |
| /agente-ia | AgenteIaPage | ✅ |
| /configuracoes | ConfiguracoesPage | ✅ |
| /mfa-setup | MfaSetupPage | ✅ |

### 1.2 Divergências
**Nenhuma** - Todos os componentes existem.

---

## 2. FALHAS CRÍTICAS MULTI-TENANT

### 2.1 Queries SEM Isolamento de tenant_id

> CRÍTICO: ~57 queries (47%) não filtram por tenant_id

#### ClientesPage.tsx (9 queries)
| Linha | Tabela | Problema |
|-------|--------|----------|
| 86 | configuracoes | SEM tenant_id |
| 91 | cupons | SEM tenant_id |
| 288 | configuracoes | SEM tenant_id |
| 371 | cupons | SEM tenant_id |
| 446 | cupons | SEM tenant_id |
| 448 | cupons | SEM tenant_id |
| 512 | clientes | SEM tenant_id |
| 659 | clientes | SEM tenant_id |
| 661 | clientes | SEM tenant_id |

#### CardapioAdminPage.tsx (20 queries)
- Linhas 52, 57, 60, 72, 94-95, 109, 198, 207, 219, 232, 238, 244, 256, 266-267, 282, 288, 493
- categorias, produtos, precos_tamanho, sabores - TODOS SEM tenant_id

#### EstoquePage.tsx
- Linhas 298, 361-386: ficha_tecnica e precos_tamanho SEM tenant_id adequado

#### PedidosPage.tsx
- Linha 330: clientes SEM tenant_id
- Linhas 405, 425: historico_status SEM tenant_id

#### WhatsAppOrdersPage.tsx
- ✅ CORRIGIDO: fetchPedidosAtivos + historicoRecente agora com tenant_id
- Linhas 275, 296: historico_agente SEM tenant_id (inserts)

#### OperacoesPage.tsx
- ✅ CORRIGIDO: fetchAtivos, historicoData, analiseData, relatoriosData, chatMutation, handleReenviarRelatorio - todas queries com tenant_id
- Linhas 323, 338: historico_agente SEM tenant_id (inserts)

### 2.2 Realtime SEM filtro de tenant_id

#### MesaPage.tsx
- Linha 74: itens_pedido SEM tenant_id

#### EntregasPage.tsx
- Linhas 219-222: 4 subscriptions (motoboys, entregas, pedidos, pedidos_online) SEM tenant_id

---

## 3. BUGS E RUNTIME

### 3.1 useEffect problemáticos
- ClientesPage.tsx:95 - funções como dependência
- CardapioAdminPage.tsx:81 - array vazio
- PdvPage.tsx:75 - sem re-fetch automática

### 3.2 Falta try/catch
- EstoquePage.tsx:361-402
- FinanceiroPage.tsx:27
- CardapioOnlinePage.tsx:159-179

---

## 4. DUPLICATAS

### 4.1 Interfaces duplicadas

| Interface | Arquivos |
|-----------|----------|
| Categoria | CardapioAdminPage, PdvPage, MesaPage |
| Produto | CardapioAdminPage, PdvPage, MesaPage, CardapioOnlinePage, DashboardPage |
| PrecoTamanho | CardapioAdminPage, PdvPage, MesaPage, CardapioOnlinePage |
| Sabor | CardapioAdminPage, PdvPage, MesaPage, CardapioOnlinePage |
| Mesa | PdvPage, MesaPage, DivisaoConta |
| ItemPedido | PdvPage, CardPedidoCozinha, DivisaoConta |
| Motoboy | MotoboyApp, EntregasPage, MapaEntregas |
| Ingrediente | EstoquePage, ingredienteSchema |
| Fornecedor | EstoquePage |

---

## 5. ÓRFÃOS

| Página | Rota | Status |
|--------|------|-------|
| WhatsAppOrdersPage.tsx | /whatsapp-pedidos | ✅ RESOLVIDO |
| OperacoesPage.tsx | /operacoes | ✅ RESOLVIDO |
| AgenteIaPage.tsx | /agente-ia | ✅ RESOLVIDO |

---

## 6. DÉBITO TÉCNICO

### 6.1 console.log
- 6 ocorrências (comentadas, OK)

### 6.2 alert()
- ClientesPage: 2
- CardapioAdminPage: 14
- PdvPage: 5
- OperacoesPage: 0 (convertido para toast)
- **Total: 22**

### 6.3 confirm()
- 1 ocorrência (CardapioAdminPage:281)

### 6.4 TODO/FIXME
- 0 ocorrências

---

## 7. PADRÕES VIOLADOS

### 7.1 Componentes >300 linhas

| Arquivo | Linhas |
|--------|--------|
| ClientesPage.tsx | 739 |
| CardapioAdminPage.tsx | 794 |
| EstoquePage.tsx | 745 |
| FinanceiroPage.tsx | 509 |
| PdvPage.tsx | 591 |
| PedidosPage.tsx | 939 |
| EntregasPage.tsx | 411 |
| WhatsappInboxPage.tsx | 452 |

### 7.2 React Query + useEffect paralelo
- WhatsappInboxPage.tsx
- PedidosPage.tsx
- WhatsAppOrdersPage.tsx
- OperacoesPage.tsx
- DashboardPage.tsx

---

## 8. RESUMO EXECUTIVO

### 8.1 Top 5 Arquivos Mais Problemáticos

| # | Arquivo | Problemas | Prioridade |
|---|--------|-----------|------------|
| 1 | ClientesPage.tsx | 9 queries sem tenant_id, 2 alert() | CRÍTICA |
| 2 | CardapioAdminPage.tsx | 20 queries sem tenant_id, 14 alert() | CRÍTICA |
| 3 | WhatsAppOrdersPage.tsx | 2 inserts sem tenant_id | CRÍTICA |
| 4 | OperacoesPage.tsx | 2 inserts sem tenant_id, 1 alert() | CRÍTICA |
| 5 | EstoquePage.tsx | 6+ queries sem tenant_id | MÉDIA |

### 8.2 Ordem de Prioridade

1. CardapioAdminPage.tsx - adicionar .eq(tenant_id)
2. ClientesPage.tsx - adicionar .eq(tenant_id)
3. WhatsAppOrdersPage.tsx / OperacoesPage.tsx - adicionar tenant_id
4. MesaPage.tsx / EntregasPage.tsx - adicionar filtro Realtime
5. EstoquePage.tsx - revisar isolamento

---

## 9. MÉTRICAS FINAIS

| Métrica | Valor |
|--------|-------|
| Total arquivos src/ | 57 |
| Total queries Supabase | 122 |
| Queries sem tenant_id | ~57 (47%) |
| Realtime subscriptions | 5 |
| Realtime sem tenant_id | 5 (100%) |
| Arquivos >300 linhas | 8 |
| alert() total | 23 |
| Interfaces duplicadas | 9 groups |

---

> Fim do Relatório de Auditoria - Nenhum arquivo modificado.
