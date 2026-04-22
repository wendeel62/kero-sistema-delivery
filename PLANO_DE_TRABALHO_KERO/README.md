# Plano de Trabalho Kero - Auditoria e Correções

## Visão Geral

Este plano de trabalho documenta as correções necessárias baseadas no relatório de auditoria técnica do projeto Kero. O plano está organizado por prioridade temporal para garantir que os problemas mais críticos sejam corrigidos primeiro, minimizando riscos de segurança e estabilidade.

### Escopo do Projeto

- **Tipo**: Aplicação full-stack com Supabase (Backend + Edge Functions)
- **Stack**: React, TypeScript, Supabase, Edge Functions, RBAC multi-tenant
- **Status Atual**: Em produção com dividas técnicas identificadas

---

## Metodologia

### Ordem de Priorização

A ordem das correções foi determinada por:

1. **Severidade do Impacto**: Problemas de segurança ( vazamento de dados entre tenants) são PRIORIDADE ABSOLUTA
2. **Dependências Técnicas**: Algumas correções dependem de outras para funcionar
3. **Esforço de Implementação**: Correções menores que desbloqueiam outras maiores
4. **Tempo Estimado**: Balancear entre correções rápidas (vitória early) e mudanças maiores

### Estrutura de Prioridades

| Prioridade | Prazo | Tipo de Correção | Risco se Não Corrigido |
|------------|-------|-------------------|----------------------|
| CRÍTICA | HOJE | Segurança multi-tenant | Vazamento de dados |
| ALTA | ESTA SEMANA | Performance/Validação | Degradação + Dados Inválidos |
| MÉDIA | PRÓXIMA SEMANA | Manutenibilidade | Dívida técnica acumulada |
| BAIXA | MÊS QUE VEM | Otimização | Custo de servidor |

---

## Checklist de Saúde do Projeto

### Pré-Correções (Execute Antes de Iniciar)

```bash
# Verificar integridade atual
npm run lint
npm run typecheck
npm test

# Verificar RLS atual
supabase postgres dump | grep "CREATE POLICY"

# Verificar Edge Functions
supabase functions list
```

### Pós-Correções (Execute Após Concluir)

```bash
# Executar suite completa
npm run lint && npm run typecheck && npm test

# Verificar políticas RLS
supabase postgres dump | grep -A5 "CREATE POLICY" | head -50

# Testar queries com tenant_id
# (documentado em cada arquivo de correção)
```

---

## Como Acompanhar Progresso

### Arquivo de Tracking

O arquivo `TRACKING/progresso.md` deve ser atualizado:

1. **Diariamente**: Após completar cada item de HOJE
2. **Semanalmente**: Resumo do progresso na sexta-feira
3. **Após cada Milestone**: Quando completar uma pasta inteira

### Checklist de Verificação

Use `TRACKING/checklist.md` para:

- [ ] Marcar itens completados
- [ ] Documentar blockers encontrados
- [ ] Registrar tempo real vs estimado
- [ ] Identificar dependências novas

---

## Como Reportar Bugs Durante Correções

### Se Encontrar um Novo Bug

1. **Documente imediatamente** no formato:
   ```markdown
   ### BUG ENCONTRADO: [Título]
   - **Data**: YYYY-MM-DD
   - **Arquivo**: caminho/para/arquivo
   - **Descrição**: O que aconteceu
   - **Steps to Reproduce**:
     1. Faça isso
     2. Faça aquilo
   - **Severity**: Critical | High | Medium | Low
   ```

2. **Classifique**:
   - **CRITICAL**: Bloqueia produção, dados podem ser perdidos
   - **HIGH**: Funcionalidade principal quebrada
   - **MEDIUM**: Workaround disponível mas não ideal
   - **LOW**: Inconveniência menor

3. **Decida**:
   - Corrigir imediatamente se CRITICAL
   - Adicionar à lista apropiada se não for crítico
   - Documentar para revisões futuras

### Quando Reportar

- Após completar cada arquivo de correção
- Antes de começar uma nova correção se blocker encontrado
- No final de cada dia de trabalho

---

## Estrutura do Plano

```
PLANO_DE_TRABALHO_KERO/
├── README.md                    # Este arquivo
├── HOJE/                        # CRÍTICO - Segurança multi-tenant
│   ├── 01_tenant_id_queries.md
│   ├── 02_tenant_id_extraction.md
│   └── 03_edge_functions_admin.md
├── ESTA_SEMANA/                 # ALTA - Performance + Validação
│   ├── 04_n_plus_one_queries.md
│   ├── 05_zod_validation.md
│   ├── 06_realtime_dependencies.md
│   ├── 07_tests_setup.md
│   └── 08_rls_policies.md
├── PROXIMA_SEMANA/              # MÉDIA - Manutenibilidade
│   ├── 09_constants_file.md
│   ├── 10_component_breakdown.md
│   ├── 11_error_boundaries.md
│   └── 12_folder_structure.md
├── MES_QUE_VEM/                 # BAIXA - Otimização
│   ├── 13_performance_optimization.md
│   ├── 14_comprehensive_tests.md
│   └── 15_documentation_update.md
└── TRACKING/
    ├── progresso.md
    └── checklist.md
```

---

## Quick Start

### Para Começar HOJE

1. Leia `HOJE/01_tenant_id_queries.md`
2. Execute as correções de queries sem filtro
3. Marque progresso em `TRACKING/checklist.md`
4. Repita para os próximos arquivos

### Pré-Requisitos

- Node.js 18+
- Supabase CLI instalado
- Acesso ao projeto Supabase
- Credenciais configuradas

---

## Contato e Suporte

Para dúvidas sobre este plano:
1. Consulte o arquivo específico da correção
2. Verifique `TRACKING/checklist.md` para status atual
3. Documente bugs encontrados no formato acima

---

*Última atualização: 2026-04-17*
*Versão: 1.0*