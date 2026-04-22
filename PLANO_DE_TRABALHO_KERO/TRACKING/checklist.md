# Checklist de Verificação

*Use este checklist para verificar completude das correções*

---

## Pré-Correções (Execute Antes de Iniciar)

### Saúde do Projeto
- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm test` passa sem erros
- [ ] Build funciona: `npm run build`

### Banco de Dados
- [ ] Supabase conectado
- [ ] Tabelas existem
- [ ] RLS policies verificadas

### Variáveis de Ambiente
- [ ] `.env` configurado corretamente
- [ ] `SUPABASE_URL` definido
- [ ] `SUPABASE_ANON_KEY` definido

---

## HOJE - CRÍTICA

### 01_tenant_id_queries.md
- [ ] Todas as queries identificadas
- [ ] Filtro de tenant_id adicionado em Edge Functions
- [ ] Filtro de tenant_id adicionado no frontend
- [ ] Queries sem tenant retornam erro claro
- [ ] Teste de segurança passando
- [ ]Código passa lint e typecheck

### 02_tenant_id_extraction.md
- [ ] Fonte de verdade padronizada (JWT)
- [ ] Hook `useTenant()` correto
- [ ] Edge Functions extraem do JWT corretamente
- [ ] Validação implementada
- [ ] Erros claros

### 03_edge_functions_admin.md
- [ ] Middleware de auth implementado
- [ ] Todas functions usam middleware
- [ ] Verificação de role implementada
- [ ] Rate limiting implementado
- [ ] Logging implementado

---

## ESTA SEMANA - ALTA

### 04_n_plus_one_queries.md
- [ ] Todas as N+1 identificadas
- [ ] Foreign keys configuradas
- [ ] Queries usam `.select()` com JOINs
- [ ] RPCs criados para queries complexas
- [ ] Performance melhorada

### 05_zod_validation.md
- [ ] Schemas centralizados criados
- [ ] Forms_validam com Zod
- [ ] Edge Functions validam input
- [ ] Dados do banco são validados
- [ ] Erros user-friendly

### 06_realtime_dependencies.md
- [ ] Hook `useRealtime()` corrigido
- [ ] Cleanup adequado implementado
- [ ] Múltiplas subscriptions evitadas
- [ ] Tratamento de reconexão
- [ ] Sem memory leaks

### 07_tests_setup.md
- [ ] Vitest configurado
- [ ] Mocks funcionando
- [ ] Testes de utils existentes
- [ ] Testes de componentes existentes
- [ ] Cobertura > 30%

### 08_rls_policies.md
- [ ] Todas tabelas com RLS
- [ ] Policies para todas operações
- [ ] Policies verificam tenant_id
- [ ] Teste de segurança passando

---

## PRÓXIMA SEMANA - MÉDIA

### 09_constants_file.md
- [ ] Arquivo central criado
- [ ] Valores hardcoded substituídos
- [ ] Consistência verificada

### 10_component_breakdown.md
- [ ] Componentes > 300 linhas quebrados
- [ ] Hooks para lógica
- [ ] Componentes reutilizáveis

### 11_error_boundaries.md
- [ ] Error Boundary global implementado
- [ ] UI de erro amigável
- [ ] Erros são logados
- [ ] Botão de retry funciona

### 12_folder_structure.md
- [ ] Estrutura mengikuti padrão
- [ ] Imports atualizados
- [ ] Código funciona

---

## MÊS QUE VEM - BAIXA

### 13_performance_optimization.md
- [ ] Imagens otimizadas
- [ ] Listas virtualizadas
- [ ] Cache implementado
- [ ] Bundle menor

### 14_comprehensive_tests.md
- [ ] Cobertura > 70%
- [ ] Testes de integração passing
- [ ] Testes E2E configurados

### 15_documentation_update.md
- [ ] README atualizado
- [ ] Documentação técnica existente
- [ ] ADRs criados

---

## Pós-Correções (Execute Ao Finalizar)

### Teste de Segurança
- [ ] Tentar acessar sem auth retorna erro
- [ ] Tentar acessar outro tenant retorna vazio
- [ ] Tentar acessar como non-admin retorna 403

### Performance
- [ ] Queries estão usando índices
- [ ] Tempo de resposta < 500ms
- [ ] Sem N+1 queries

### Saúde Final
- [ ] `npm run lint` passa
- [ ] `npm run typecheck` passa
- [ ] `npm test` passa
- [ ] `npm run build` funciona
- [ ] Deploy funciona

---

## Como Usar Este Checklist

1. **Antes de cada item**: Marque como "-" ouwait para iniciar
2. **Durante o item**: Mantenha como "IN PROGRESS"
3. **Ao completar**: Marque como "[x]"
4. **Se blocker**: Documente blockers.em `progresso.md`

---

## Referências

- Relatório de Auditoria
- Arquivos de implementação em `PLANO_DE_TRABALHO_KERO/`
- Tracking de progresso em `TRACKING/progresso.md`