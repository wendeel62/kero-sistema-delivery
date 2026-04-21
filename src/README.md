# src/ - Código Fonte do Projeto Kero

## Estrutura de Pastas

```
src/
├── app/                 # Configuração principal (Vite)
├── assets/              # Assets estáticos (imagens, ícones)
├── components/         # Componentes React reutilizáveis
│   ├── ErrorBoundary/  # Error boundaries
│   ├── admin/          # Componentes admin
│   ├── cozinha/        # Componentes cozinha
│   ├── Dashboard/     # Componentes Dashboard
│   ├── Pedidos/        # Componentes Pedidos
│   ├── Financeiro/    # Componentes Financeiro
│   ├── organisms/     # Componentes compostos
│   └── *.tsx          # Componentes genéricos
│
├── constants/          # Constantes centralizadas
│   └── index.ts
│
├── contexts/          # React Contexts
│   ├── AuthContext.tsx
│   ├── ToastContext.tsx
│   ├── ThemeContext.tsx
│   └── MetaPeriodoContext.tsx
│
├── hooks/             # Hooks customizados
│   ├── useAuth.tsx
│   ├── useRealtime.ts
│   ├── useDashboard.ts
│   ├── usePedidos.ts
│   └── *.ts
│
├── lib/              # Utilitários e configurações
│   ├── supabase.ts
│   ├── tenant-utils.ts
│   └── syncCliente.ts
│
├── pages/            # Páginas principais
│   ├── admin/       # Páginas admin
│   └── *.tsx
│
├── schemas/         # Schemas Zod
│   ├── index.ts
│   └── *.ts
│
├── test/            # Configuração de testes
│   ├── setup.ts
│   └── mocks/
│       └── supabase.ts
│
├── types/           # Tipos globais
│   └── index.ts
│
├── utils/           # Utilitários
│   └── audioKDS.ts
│
├── App.tsx          # Componente principal
├── main.tsx        # Entry point
└── index.css        # Estilos globais
```

## Convenções de Nomeação

- Componentes: PascalCase (ex: `DashboardPage.tsx`)
- Hooks: camelCase com prefixo `use` (ex: `useAuth.tsx`)
- Utilitários: camelCase (ex: `tenant-utils.ts`)
- Schemas: camelCase (ex: `produtoSchema.ts`)
- Tipos: PascalCase (ex: `UserRole`)

## Importação de Módulos

```typescript
// Componentes
import Button from '@/components/Button'

// Hooks
import { useAuth } from '@/hooks/useAuth'

// Schemas
import { produtoSchema } from '@/schemas'

// Constantes
import { ROLES } from '@/constants'
```

## Testes

- Arquivos de teste: `*.test.ts` ou `*.test.tsx`
- Mocks em: `src/test/mocks/`
- Setup em: `src/test/setup.ts`

---

*Atualizado: 2026-04-17*