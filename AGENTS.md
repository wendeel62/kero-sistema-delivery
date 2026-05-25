# Kero Delivery - Instrucoes para Agentes

## Dev Commands
- `npm run dev` — Vite dev server (porta 5173)
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — ESLint (inclui jsx-a11y, security, react-hooks)
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest (unit, jsdom)
- `npm run test:run` — Vitest modo CI
- `npm run test:e2e` — Playwright
- `npm run test:coverage` — Vitest com coverage v8
- `npm run deploy` — Vercel producao

## Quality Gate Order (CI pipeline)
lint -> typecheck -> build -> test (audit paralelo)

## Stack
- **Frontend**: React 19, Vite 8, TailwindCSS v4 via `@tailwindcss/vite` (sem PostCSS)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Servidor local**: Express em `server/` apenas para impressao termica
- **Auth**: Supabase Auth JWT + multi-tenant RBAC (`tenant_id` em `user_metadata`)
- **State**: TanStack React Query (staleTime: volateis 1min, intermediario 10min, estatico 24h)
- **Forms**: Zod (schemas em `src/schemas/`) + react-hook-form
- **PWA**: `vite-plugin-pwa` com service worker
- **Erros**: Sentry (via `VITE_SENTRY_DSN`)

## Path Aliases
`@/` -> `src/`, `@components/`, `@hooks/`, `@pages/`, `@contexts/`, `@utils/`, `@schemas/`, `@types/`

## Multi-tenant (obrigatorio)
Toda query RLS e consulta DEVE filtrar por `tenant_id`. Helpers em `src/lib/tenant-utils.ts`:
- `getCurrentTenantId()` — extrai de `user_metadata.tenant_id`
- `withTenantFilter()`, `secureMutationData()`, `canAccessResource()`

## Testes
- Unitarios: `src/**/*.test.{ts,tsx}`, jsdom, setup `src/test/setup.ts`
- Mock Supabase: `src/test/mocks/supabase.ts`
- E2E: Playwright (`npm run test:e2e:a11y` para acessibilidade)

## Supabase MCP
Ativo via `opencode.json` — projeto `kmtjfapbooqzhysllrbe`. Se expirar, rode `opencode mcp auth supabase`.

## Orchestration (AIOX / Kilo)
- `*build {story-id}` — ciclo autonomo completo
- `*develop-yolo` — modo auto sem confirmacao
- Trabalhe por stories em `docs/stories/`

## Skills (`.kilo/skills/`)
- `frontend-design/`, `web-design-guidelines/`, `angular-component/`, `angular-di/`
- `create-pull-request/`, `file-organizer/`, `skill-creator/`

---

<!-- AIOX-MANAGED SECTIONS -->
<!-- These sections are managed by AIOX. Edit content between markers carefully. -->
<!-- Your custom content above will be preserved during updates. -->

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga a Constitution em `.aiox-core/constitution.md`
2. Priorize `CLI First -> Observability Second -> UI Third`
3. Trabalhe por stories em `docs/stories/`
4. Nao invente requisitos fora dos artefatos existentes
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- Rode `npm run lint`
- Rode `npm run typecheck`
- Rode `npm test`
- Atualize checklist e file list da story antes de concluir
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Core framework: `.aiox-core/`
- CLI entrypoints: `bin/`
- Shared packages: `packages/`
- Tests: `tests/`
- Docs: `docs/`
<!-- AIOX-MANAGED-END: codebase -->

<!-- AIOX-MANAGED-START: commands -->
## Common Commands

- `npm run sync:ide`
- `npm run sync:ide:check`
- `npm run sync:skills:codex`
- `npm run sync:skills:codex:global` (opcional; neste repo o padrao e local-first)
- `npm run validate:structure`
- `npm run validate:agents`
<!-- AIOX-MANAGED-END: commands -->

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

Preferencia de ativacao no Codex CLI:
1. Use `/skills` e selecione `aiox-<agent-id>` vindo de `.codex/skills` (ex.: `aiox-architect`)
2. Se preferir, use os atalhos abaixo (`@architect`, `/architect`, etc.)

Interprete os atalhos abaixo carregando o arquivo correspondente em `.aiox-core/development/agents/` (fallback: `.codex/agents/`), renderize o greeting via `generate-greeting.js` e assuma a persona ate `*exit`:

- `@architect`, `/architect`, `/architect.md` -> `.aiox-core/development/agents/architect.md`
- `@dev`, `/dev`, `/dev.md` -> `.aiox-core/development/agents/dev.md`
- `@qa`, `/qa`, `/qa.md` -> `.aiox-core/development/agents/qa.md`
- `@pm`, `/pm`, `/pm.md` -> `.aiox-core/development/agents/pm.md`
- `@po`, `/po`, `/po.md` -> `.aiox-core/development/agents/po.md`
- `@sm`, `/sm`, `/sm.md` -> `.aiox-core/development/agents/sm.md`
- `@analyst`, `/analyst`, `/analyst.md` -> `.aiox-core/development/agents/analyst.md`
- `@devops`, `/devops`, `/devops.md` -> `.aiox-core/development/agents/devops.md`
- `@data-engineer`, `/data-engineer`, `/data-engineer.md` -> `.aiox-core/development/agents/data-engineer.md`
- `@ux-design-expert`, `/ux-design-expert`, `/ux-design-expert.md` -> `.aiox-core/development/agents/ux-design-expert.md`
- `@squad-creator`, `/squad-creator`, `/squad-creator.md` -> `.aiox-core/development/agents/squad-creator.md`
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`

## AIOX-Core Sync (Synkra v5.0.4)

Os agentes foram sincronizados do npm (Synkra/aiox-core@5.0.4). Os caminhos primary agora apontam para:
- **Primary**: `.aiox-core/development/agents/` (vindo do npm install)
- **Fallback**: `.codex/agents/` (backup local)
<!-- AIOX-MANAGED-END: shortcuts -->
