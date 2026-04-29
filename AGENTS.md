# Kero Project - Agent Configuration

This file defines the agents available in the Kero project for the Kilo CLI.

## Orchestration Mode - ATIVADO

This project has **orchestration mode activated**. Use these commands:

### Build Commands
- `*build {story-id}` - Execute full autonomous build cycle
- `*build-autonomous` - Start autonomous build loop
- `*build-resume` - Resume from last checkpoint

### Development Modes
- `*develop-yolo` - Autonomous development (no confirmation)
- `*develop-interactive` - Interactive development (default)
- `*execute-subtask` - Execute single subtask

### Execution Modes
- **ask** (default) - Confirm each step
- **auto** - Execute without confirmation  
- **explore** - Exploration mode without execution

Use `--auto` flag or `*yolo` prefix for autonomous execution.

## COMPORTAMENTOS DO AGENTE

The following agents are available and **ACTIVATED** for this project:

### 1. Architect Agent
- **Path**: .aiox-core/development/agents/architect.md
- **Fallback**: .codex/agents/architect.md
- **Purpose**: Software architecture and system design
- **Shortcut**: /architect, @architect
- **Expertise**: Hexagonal architecture, DDD, Clean Architecture, system design

### 2. Dev Agent  
- **Path**: .aiox-core/development/agents/dev.md
- **Fallback**: .codex/agents/dev.md
- **Purpose**: Full-stack development implementation
- **Shortcut**: /dev, @dev
- **Expertise**: React, TypeScript, Node.js, Supabase, testing

### 3. QA Agent
- **Path**: .aiox-core/development/agents/qa.md
- **Fallback**: .codex/agents/qa.md
- **Purpose**: Testing, quality assurance, and test coverage
- **Shortcut**: /qa, @qa
- **Expertise**: Vitest, React Testing Library, e2e testing, accessibility

### 4. PM Agent
- **Path**: .aiox-core/development/agents/pm.md
- **Fallback**: .codex/agents/pm.md
- **Purpose**: Project management and coordination
- **Shortcut**: /pm, @pm
- **Expertise**: Agile/Scrum, sprint planning, risk management

### 5. PO Agent
- **Path**: .aiox-core/development/agents/po.md
- **Fallback**: .codex/agents/po.md
- **Purpose**: Product ownership and backlog management
- **Shortcut**: /po, @po
- **Expertise**: Product management, user stories, prioritization

### 6. SM Agent
- **Path**: .aiox-core/development/agents/sm.md
- **Fallback**: .codex/agents/sm.md
- **Purpose**: Scrum mastery and team facilitation
- **Shortcut**: /sm, @sm
- **Expertise**: Scrum ceremonies, impediment removal, coaching

### 7. Analyst Agent
- **Path**: .aiox-core/development/agents/analyst.md
- **Fallback**: .codex/agents/analyst.md
- **Purpose**: Business and technical analysis
- **Shortcut**: /analyst, @analyst
- **Expertise**: Requirements gathering, process modeling, specifications

### 8. DevOps Agent
- **Path**: .aiox-core/development/agents/devops.md
- **Fallback**: .codex/agents/devops.md
- **Purpose**: Infrastructure, CI/CD, and deployment
- **Shortcut**: /devops, @devops
- **Expertise**: CI/CD pipelines, cloud infrastructure, monitoring

### 9. UX Design Expert Agent
- **Path**: .aiox-core/development/agents/ux-design-expert.md
- **Fallback**: .codex/agents/ux-design-expert.md
- **Purpose**: User experience design and accessibility
- **Shortcut**: /ux-design-expert, @ux-design-expert
- **Expertise**: UX research, wireframing, WCAG accessibility

### 10. Squad Creator Agent
- **Path**: .aiox-core/development/agents/squad-creator.md
- **Fallback**: .codex/agents/squad-creator.md
- **Purpose**: Multi-agent squad design and orchestration
- **Shortcut**: /squad-creator, @squad-creator
- **Expertise**: Multi-agent systems, team composition, workflows

### 11. Data Engineer Agent
- **Path**: .aiox-core/development/agents/data-engineer.md
- **Fallback**: .codex/agents/data-engineer.md
- **Purpose**: Database architecture and data modeling
- **Shortcut**: /data-engineer, @data-engineer
- **Expertise**: PostgreSQL, Supabase, schema design, query optimization

---

## Quality Gates

Run these commands before concluding any task:
- 
pm run lint - ESLint validation
- 
pm run typecheck - TypeScript check
- 
pm run build - Production build

---

## Skills Available

The following skills are also available:
- .kilo/skills/frontend-design/ - Production-grade frontend interfaces
- .kilo/skills/web-design-guidelines/ - Web UI best practices
- .kilo/skills/angular-component/ - Angular component patterns
- .kilo/skills/angular-di/ - Angular dependency injection
- .kilo/skills/create-pull-request/ - GitHub PR creation
- .kilo/skills/file-organizer/ - File organization
- .kilo/skills/skill-creator/ - Skill development guide

---

## Activation

To activate an agent, use the shortcut or type the agent name in the CLI.
All agents above are **ACTIVATED** and ready to use.

## Activation

To activate an agent, use the shortcut or type the agent name in the CLI.
All agents above are **ACTIVATED** and ready to use.

## Workflow Example

1. **Analyst** - Gather and analyze requirements
2. **Architect** - Design the solution
3. **UX Design Expert** - Design the interface
4. **Dev** - Implement the features
5. **QA** - Test and ensure quality
6. **DevOps** - Deploy to production


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
