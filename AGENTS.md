# AGENTS.md

## Build/Dev/Lint Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite build (tsc -b && vite build)
npm run lint         # ESLint on entire project
npm run preview      # Preview production build
npx tsc --noEmit     # TypeScript type checking without build
```

No test framework is configured. Run `npm run build` before committing to verify TypeScript compiles.

## Project Structure

```
src/
├── pages/           # Route pages (CardapioAdminPage.tsx, DashboardPage.tsx, etc.)
├── components/      # Reusable components (Sidebar.tsx, Layout.tsx, etc.)
├── contexts/        # React contexts (AuthContext.tsx)
├── hooks/           # Custom hooks (useRealtime.ts)
├── lib/             # Utilities and clients (supabase.ts)
├── assets/          # Static assets
├── App.tsx          # Router setup
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Tech Stack

- **Framework**: React 19 + TypeScript 5.9
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4 (utility-first, inline classes)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Routing**: React Router v7
- **State**: useState, useCallback, useEffect (no Redux/Zustand)

## Code Style

### Components
- Default exports for pages and components
- Arrow functions for handlers, async functions for API calls
- Function components with hooks (no class components)
- One component per file, filename matches component name

```tsx
export default function ComponentName() {
  const [state, setState] = useState<Type>(initialValue)

  const handleAction = async () => {
    const { data, error } = await supabase.from('table').select('*')
    if (data) setState(data)
  }

  return <div className="tailwind-classes">...</div>
}
```

### Imports
- React hooks first, then external packages, then local imports
- No destructured imports from supabase (use `supabase.from(...)`)
```tsx
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
```

### TypeScript
- Interfaces for data shapes (not types)
- `any` is allowed (ESLint rule disabled)
- Strict mode enabled in tsconfig
- Use explicit types for state: `useState<Produto[]>([])`

### Styling
- Tailwind CSS classes only (no CSS modules)
- Inline styles with object syntax when needed: `style={{ aspectRatio: '4/5' }}`
- Colors: `#16181f` (bg), `#1a1a1a` (input), `#ff5722` (primary), `#ffc107` (accent)
- Material Symbols for icons: `<span className="material-symbols-outlined">icon_name</span>`

### Naming
- Portuguese for UI text and database fields
- camelCase for variables and functions
- PascalCase for components and interfaces
- Descriptive names: `editProduto`, `fetchCategorias`, `showModal`

### Error Handling
- `alert()` for user-facing errors (Portuguese messages)
- `console.error()` for developer debugging
- Supabase errors: check `error` from destructured response

### State Management
- Local state with `useState`
- Realtime updates via `useRealtime` hook
- Auth state via `useAuth` context

## Key Patterns

### Supabase Queries
```tsx
const { data, error } = await supabase.from('table').select('*').eq('field', value)
if (data) setItems(data)
if (error) console.error('Error:', error)
```

### Realtime Subscriptions
```tsx
useRealtime('table', () => fetchData())
```

### Protected Routes
Wrap admin pages with `<ProtectedRoute>` in App.tsx.

## Multi-Tenant Rules (CRITICAL)

> ⚠️ Never violate these rules. Every query MUST include tenant_id filter.

1. **Every Supabase query must include `.eq('tenant_id', tenantId)`**
2. **Never omit tenant_id in INSERTs - always include explicitly**
3. **Never mix data from different tenants**
4. `tenantId` comes from auth context - never from URL parameters

```tsx
// ✅ CORRECT - Always filter by tenant_id
const { data } = await supabase
  .from('pedidos')
  .select('*')
  .eq('tenant_id', tenantId)

// ✅ CORRECT - Always include tenant_id in INSERT
await supabase.from('pedidos').insert({
  tenant_id: tenantId,
  cliente_nome: 'João',
  // ...
})

// ❌ WRONG - Missing tenant_id filter
const { data } = await supabase.from('pedidos').select('*')
```

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Authenticated | Redirects to /dashboard |
| `/login` | Public | Login screen |
| `/dashboard` | Authenticated | KPIs dashboard |
| `/pedidos` | Authenticated | Kanban de pedidos |
| `/pdv` | Authenticated | Point of sale |
| `/cardapio` | **Public** | Online menu for customers |
| `/clientes` | Authenticated | CRM de clientes |
| `/estoque` | Authenticated | Stock control |
| `/financeiro` | Authenticated | Financial module |
| `/entrega` | Authenticated | Delivery management |
| `/agente-ia` | Authenticated | AI Agent (Atendant + Manager) |
| `/configuracoes` | Authenticated | Store settings |
| `/pedido/:numero` | **Public** | Order tracking |
| `/cozinha` | **Public** | KDS - Kitchen monitor |
| `/mesa/:numero` | **Public** | Menu via QR Code |
| `/motoboy` | **Public** | Delivery app (token auth) |

Public routes (`/cardapio`, `/pedido/:numero`, `/cozinha`, `/mesa/:numero`, `/motoboy`) have no sidebar or topbar.

## Order Status Flow

```
NOVO → EM_PREPARO → SAIU_PARA_ENTREGA → ENTREGUE
                                         ↘ CANCELADO (any stage)
```

| Status | Kanban Color |
|--------|--------------|
| novo | Blue |
| em_preparo | Orange |
| saiu_para_entrega | Purple |
| entregue | Green |
| cancelado | Red |

## Git Conventions

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Example: `git commit -m "fix: corrigir erro no cardápio online"`
- Run `npm run build` before pushing to verify TypeScript compiles

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository in Vercel
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Segredos server-only como `SUPABASE_SERVICE_ROLE_KEY` nao devem usar prefixo `VITE_` e nao podem ficar no frontend.

## ESLint Rules (Relaxed)

- `@typescript-eslint/no-explicit-any`: OFF
- `@typescript-eslint/no-unused-vars`: OFF
- `react-hooks/exhaustive-deps`: OFF
- `react-refresh/only-export-components`: WARN
