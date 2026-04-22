# Kero - Sistema de Gestão para Lanchonetes

## Visão Geral

Kero é um sistema completo de gestão para lanchonetes e restaurantes, desenvolvido com React, TypeScript, Supabase e Edge Functions. Inclui PDV, Dashboard, Controle de Estoque, Financeiro, Cardápio Online e mais.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Estado**: React Query + Context API
- **Autenticação**: Supabase Auth (JWT + RBAC multi-tenant)
- **Testes**: Vitest + React Testing Library

## Funcionalidades

- 📊 Dashboard com métricas em tempo real
- 🏪 PDV (Ponto de Venda)
- 📦 Controle de Estoque
- 💰 Financeiro
- 🛒 Cardápio Online
- 📱 Entregas
- 👨‍🍳 Área da Cozinha
- ⚙️ Configurações

## Getting Started

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Executar testes
npm run test

# Build para produção
npm run build
```

## Estrutura do Projeto

```
src/
├── components/    # Componentes React
├── contexts/     # React Contexts
├── hooks/        # Hooks customizados
├── lib/          # Utilitários
├── pages/        # Páginas
├── schemas/      # Zod schemas
├── constants/   # Constantes
└── test/         # Testes
```

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Documentação

- [src/README.md](./src/README.md) - Estrutura do código
- [PLANO_DE_TRABALHO_KERO/](./PLANO_DE_TRABALHO_KERO/) - Plano de correções

## Licença

MIT