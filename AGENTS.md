# Kero Project - Agent Configuration

This file defines the agents available in the Kero project for the Kilo CLI.

## COMPORTAMENTOS DO AGENTE

The following agents are available and **ACTIVATED** for this project:

### 1. Architect Agent
- **Path**: .kilo/agents/architect/AGENT.md
- **Purpose**: Software architecture and system design
- **Shortcut**: /architect, @architect
- **Expertise**: Hexagonal architecture, DDD, Clean Architecture, system design

### 2. Dev Agent  
- **Path**: .kilo/agents/dev/AGENT.md
- **Purpose**: Full-stack development implementation
- **Shortcut**: /dev, @dev
- **Expertise**: React, TypeScript, Node.js, Supabase, testing

### 3. QA Agent
- **Path**: .kilo/agents/qa/AGENT.md
- **Purpose**: Testing, quality assurance, and test coverage
- **Shortcut**: /qa, @qa
- **Expertise**: Vitest, React Testing Library, e2e testing, accessibility

### 4. PM Agent
- **Path**: .kilo/agents/pm/AGENT.md
- **Purpose**: Project management and coordination
- **Shortcut**: /pm, @pm
- **Expertise**: Agile/Scrum, sprint planning, risk management

### 5. PO Agent
- **Path**: .kilo/agents/po/AGENT.md
- **Purpose**: Product ownership and backlog management
- **Shortcut**: /po, @po
- **Expertise**: Product management, user stories, prioritization

### 6. SM Agent
- **Path**: .kilo/agents/sm/AGENT.md
- **Purpose**: Scrum mastery and team facilitation
- **Shortcut**: /sm, @sm
- **Expertise**: Scrum ceremonies, impediment removal, coaching

### 7. Analyst Agent
- **Path**: .kilo/agents/analyst/AGENT.md
- **Purpose**: Business and technical analysis
- **Shortcut**: /analyst, @analyst
- **Expertise**: Requirements gathering, process modeling, specifications

### 8. DevOps Agent
- **Path**: .kilo/agents/devops/AGENT.md
- **Purpose**: Infrastructure, CI/CD, and deployment
- **Shortcut**: /devops, @devops
- **Expertise**: CI/CD pipelines, cloud infrastructure, monitoring

### 9. UX Design Expert Agent
- **Path**: .kilo/agents/ux-design-expert/AGENT.md
- **Purpose**: User experience design and accessibility
- **Shortcut**: /ux-design-expert, @ux-design-expert
- **Expertise**: UX research, wireframing, WCAG accessibility

### 10. Squad Creator Agent
- **Path**: .kilo/agents/squad-creator/AGENT.md
- **Purpose**: Multi-agent squad design and orchestration
- **Shortcut**: /squad-creator, @squad-creator
- **Expertise**: Multi-agent systems, team composition, workflows

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

## Orchestration Mode

When a task requires multiple agents, use the orchestrator pattern:

### Orchestration Commands

- `*build {story-id}` - Execute full autonomous build cycle
- `*build-autonomous` - Start autonomous build loop
- `*build-resume` - Resume from last checkpoint
- `*develop-yolo` - Autonomous development (no confirmation)
- `*develop-interactive` - Interactive development (default)
- `*execute-subtask` - Execute single subtask

### Orchestration Workflow

1. **Orchestrate**: Use `/squad-creator` to design agent team
2. **Dispatch**: Agents execute in parallel when possible
3. **Coordinate**: Use `/pm` to track progress
4. **Verify**: Use `/qa` for quality checks
5. **Merge**: Combine results automatically

### Autonomous Execution

Enable autonomous mode by adding `--auto` or using `*yolo`:
- **ask** (default) - Confirm each step
- **auto** - Execute without confirmation  
- **explore** -探索 mode without execution

## Workflow Example

1. **Analyst** - Gather and analyze requirements
2. **Architect** - Design the solution
3. **UX Design Expert** - Design the interface
4. **Dev** - Implement the features
5. **QA** - Test and ensure quality
6. **DevOps** - Deploy to production

