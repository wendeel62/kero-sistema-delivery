# CI/CD - KERO Project

## Visão Geral

Este projeto utiliza **GitHub Actions** para automação de CI/CD (Integração Contínua e Deploy Contínuo).

---

## Workflows Disponíveis

### 1. CI (Continuous Integration)

**Arquivo:** `.github/workflows/ci.yml`

**Gatilhos:**
- Push nas branches: `main`, `master`, `develop`, `imaginary-amaryllis`
- Pull Requests para as mesmas branches

**Jobs:**

| Job | Nome | Descrição | Status |
|-----|------|-----------|--------|
| `lint` | Lint | Validação ESLint | ⚠️ Warning (não bloqueia) |
| `typecheck` | TypeScript Check | Validação de tipos TypeScript | ⚠️ Warning (não bloqueia) |
| `build` | Build | Build de produção com Vite | ✅ Obrigatório |
| `test` | Test | Execução de testes com Vitest | ⚠️ Warning (não bloqueia) |
| `audit` | Security Audit | Verificação de vulnerabilidades npm | ⚠️ Warning (não bloqueia) |

**Artefatos Gerados:**
- `dist/` - Build de produção (retido por 7 dias)
- `coverage/` - Relatório de cobertura de testes (retido por 7 dias)

---

### 2. Deploy

**Arquivo:** `.github/workflows/deploy.yml`

**Gatilhos:**
- Push na branch `main` ou `master` (deploy de produção)
- Pull Requests (deploy de preview)

**Ambientes:**
- **Preview:** Deploy automático para PRs (opcional, requer Vercel)
- **Production:** Deploy automático após merge na main

---

## Configuração

### Variáveis de Ambiente (Secrets)

Para habilitar o deploy automático, configure as seguintes secrets no repositório:

```bash
# Necessário para deploy Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### Como Adicionar Secrets

1. Acesse o repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Adicione cada secret individualmente

---

## Badge de Status

Adicione este badge no README.md para mostrar o status do CI:

```markdown
[![CI](https://github.com/SEU_USUARIO/kero/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU_USUARIO/kero/actions/workflows/ci.yml)
```

---

## Execução Local

Antes de push, é recomendado rodar localmente:

```bash
# Instalar dependências
npm install

# Lint
npm run lint

# Type check
npm run typecheck

# Build
npm run build

# Testes
npm run test:run

# Audit
npm audit
```

---

## Solução de Problemas

### Build Falhando

Verifique os logs no GitHub Actions:
1. Acesse a aba **Actions** no repositório
2. Clique no workflow falho
3. Expanda o job com erro
4. Verifique a mensagem de erro específica

### Falso Positivo no Lint

Se o ESLint estiver falhando sem motivo aparente:
```bash
# Limpar cache do ESLint
rm -rf node_modules/.cache/eslint
npm run lint
```

### Timeouts

Se os jobs estão com timeout:
- Aumente o `timeout-minutes` no arquivo YAML
- Verifique se há processos travando (ex: watch mode)

---

## Personalização

### Adicionar Novo Job

```yaml
jobs:
  meu-novo-job:
    name: Meu Job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Meu comando aqui"
```

### Mudar Node Version

Altere em `.github/workflows/ci.yml`:
```yaml
with:
  node-version: '22'  # Versão desejada
```

### Adicionar Notificação

Exemplo com Slack:
```yaml
- name: Slack Notification
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Build status: ${{ job.status }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Melhores Práticas

1. **Sempre rode localmente antes de push**
2. **Mantenha secrets seguras** - nunca commitar `.env` ou chaves
3. **Revise logs de erro** antes de pedir ajuda
4. **Use branches** para features, nunca commit direto na main
5. **Rebase/merge** da main antes de criar PR

---

## Links Úteis

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel GitHub Integration](https://vercel.com/docs/concepts/git/monorepos#github)

---

**Última Atualização:** 2026-05-07  
**Responsável:** Senior Software Engineer
