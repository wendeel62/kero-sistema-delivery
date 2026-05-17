# 12 - Melhorar Estrutura de Pastas

## Descrição do Problema

**Do Relatório de Auditoria:**
> Estrutura de pastas não segue padrões consistentes. Dificuldade em encontrar arquivos, organização inconsistente entre módulos, e má distribuição de responsabilidades.

**Especificações Técnicas:**
- Estrutura plana ou desorganizada
- Arquivos em locations inesperados
- Falta de grouping por feature
- Nomeação inconsistente

---

## Impacto

### Por Que é Importante Corrigir

1. **DX**: Easy encontrar arquivos
2. **Onboarding**: Novos devs entendem mais rápido
3. **Manutenibilidade**: Estrutura clara

### Risco Não Corrigido

- **Severidade**: LOW
- **Probabilidade**: Média
- **Impacto**: Dívida técnica

---

## Solução Técnica

### Novo Padrão Sugerido

```
src/
├── app/                      # App principal (se React Router ou similar)
│   ├── routes/
│   │   ├── _index.tsx
│   │   ├── admin/
│   │   └── (auth)/
│
├── components/                # Componentes reutilizáveis
│   ├── ui/                  # Componentes base (Button, Input)
│   ├── forms/               # Formulários compostos
│   ├── tables/             # Tabelas genéricas
│   └── layout/              # Componentes de layout
│
├── features/                 # Features por domínio
│   ├── agentes/
│   │   ├── components/     # Componentes específicos
│   │   ├── hooks/         # Hooks específicos
│   │   ├── schemas/       # Zod schemas
│   │   └── api.ts         # Funções de API
│   ├── atendimento/
│   └── financeiro/
│
├── lib/                     # Utilitários
│   ├── supabase.ts
│   ├── api.ts
│   └── utils.ts
│
├── hooks/                   # Hooks globais
│   ├── useAuth.ts
│   ├── useTenant.ts
│   └── useRealtime.ts
│
├── constants/               # Constantes centralizadas
│   └── index.ts
│
├── types/                   # Tipos globais
│   └── index.ts
│
└── styles/                  # Estilos globais
    └── globals.css
```

### Passos de Migração

1. Criar nova estrutura
2. Mover arquivos gradualmente
3. Atualizar imports
4. Verificar que tudo funciona

---

## Critérios de Aceitação

### Verificação

- [ ] Estrutura segue padrão
- [ ] Imports atualizados
- [ ] Código funciona

---

## Tempo Estimado

| Tarefa | Tempo |
|--------|-------|
|Planejar| 1 hora|
|Executar migração| 4 horas|
|Testes| 1 hora|
| **TOTAL** | **6 horas** |

---

## Dependências

### Pré-Requisitos

- **Requer**: `10_component_breakdown.md`

---

## Histórico de Alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-04-17 | Criação inicial | Kero |