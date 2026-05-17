# Acessibilidade - Kero Delivery

## Visão Geral

O Kero Delivery segue as diretrizes WCAG 2.1 Nível AA para garantir acessibilidade a todos os usuários.

## Configuração Instalada

### 1. ESLint Plugin JSX A11y

```json
{
  "devDependencies": {
    "eslint-plugin-jsx-a11y": "^latest"
  }
}
```

### 2. Axe Core para Playwright

```json
{
  "devDependencies": {
    "@axe-core/playwright": "^latest"
  }
}
```

## Regras de Acessibilidade

### ESLint (eslint.config.js)

```javascript
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default tseslint.config({
  plugins: {
    'jsx-a11y': jsxA11y,
  },
  rules: {
    ...jsxA11y.configs.recommended.rules,
    'jsx-a11y/anchor-is-valid': ['error', {
      components: ['Link'],
      specialLink: ['hrefLeft', 'hrefRight'],
      aspects: ['invalidHref', 'preferButton'],
    }],
    'jsx-a11y/alt-text': ['error', {
      elements: ['img', 'object', 'area', 'input[type="image"]']
    }],
  },
})
```

## Testes Automatizados

### Testes E2E com Axe Core

```typescript
// tests/accessibility.test.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('Homepage deve ser acessível', async ({ page }) => {
  await page.goto('/')
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

### Executar Testes

```bash
# Testes de acessibilidade
npm run test:e2e

# Apenas testes de acessibilidade
npm run test:a11y
```

## Práticas Recomendadas

### 1. Imagens

```tsx
// ✅ Bom
<img src="logo.png" alt="Kero Delivery - Logo" />

// ✅ Imagem decorativa
<img src="pattern.png" alt="" role="presentation" />

// ❌ Ruim
<img src="logo.png" />
```

### 2. Botões

```tsx
// ✅ Bom
<button aria-label="Fechar modal">X</button>
<button aria-label="Buscar"><SearchIcon /></button>

// ❌ Ruim
<button><SearchIcon /></button>
```

### 3. Links

```tsx
// ✅ Bom
<a href="/produtos" aria-label="Ver produtos">Ver mais</a>
<Link to="/produtos">Ver produtos</Link>

// ❌ Ruim
<a href="#">Clique aqui</a>
```

### 4. Formulários

```tsx
// ✅ Bom
<label htmlFor="email">Email</label>
<input 
  id="email" 
  type="email" 
  required 
  aria-required="true"
  aria-describedby="email-help"
/>
<p id="email-help">Digite seu email de trabalho</p>

// ❌ Ruim
<input type="email" placeholder="Email" />
```

### 5. Modais

```tsx
// ✅ Bom
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-desc"
>
  <h2 id="modal-title">Título</h2>
  <p id="modal-desc">Descrição</p>
  <button autoFocus>Foco inicial</button>
</div>

// ❌ Ruim
<div className="modal">
  <h2>Título</h2>
  <p>Descrição</p>
</div>
```

### 6. Navegação

```tsx
// ✅ Bom
<nav aria-label="Menu principal">
  <ul>
    <li><a href="/" aria-current="page">Início</a></li>
    <li><a href="/pedidos">Pedidos</a></li>
  </ul>
</nav>

<main id="main-content">
  <h1>Conteúdo principal</h1>
</main>

// ❌ Ruim
<div>
  <a href="/">Início</a>
  <a href="/pedidos">Pedidos</a>
</div>
```

### 7. Tabelas

```tsx
// ✅ Bom
<table aria-label="Pedidos recentes">
  <caption>Pedidos dos últimos 7 dias</caption>
  <thead>
    <tr>
      <th scope="col">Pedido</th>
      <th scope="col">Cliente</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>#1234</td>
      <td>João Silva</td>
    </tr>
  </tbody>
</table>

// ❌ Ruim
<div>
  <div>Pedido</div>
  <div>Cliente</div>
  <div>#1234</div>
  <div>João Silva</div>
</div>
```

### 8. Loading

```tsx
// ✅ Bom
<div aria-busy="true" aria-live="polite">
  <span className="sr-only">Carregando...</span>
  <div className="spinner" />
</div>

// ❌ Ruim
<div className="spinner" />
```

## Atributos ARIA Comuns

| Atributo | Uso | Exemplo |
|----------|-----|---------|
| `aria-label` | Rótulo para elementos sem texto | `<button aria-label="Fechar">` |
| `aria-labelledby` | Referencia elemento com texto | `<div aria-labelledby="title">` |
| `aria-describedby` | Descrição adicional | `<input aria-describedby="help">` |
| `aria-live` | Região dinâmica | `<div aria-live="polite">` |
| `aria-expanded` | Estado de expansão | `<button aria-expanded="false">` |
| `aria-hidden` | Esconder de leitores | `<span aria-hidden="true">` |
| `aria-current` | Item atual | `<a aria-current="page">` |
| `aria-invalid` | Campo inválido | `<input aria-invalid="true">` |

## Landmarks

```tsx
// Estrura semântica
<header role="banner">
  <nav aria-label="Menu principal">...</nav>
</header>

<main id="main-content">
  <h1>Título</h1>
  <article>...</article>
</main>

<aside aria-label="Conteúdo relacionado">
  ...
</aside>

<footer role="contentinfo">
  ...
</footer>
```

## Cores e Contraste

### Requisitos WCAG AA

- **Texto normal**: 4.5:1
- **Texto grande**: 3:1
- **UI components**: 3:1

### Exemplo de Verificação

```tsx
// Use ferramentas como:
// - axe DevTools
// - Lighthouse Accessibility
// - Contrast Checker
```

## Teclado

### Navegação

```tsx
// Todos elementos interativos devem ser focáveis
<button>Click</button>
<a href="/link">Link</a>
<input type="text" />
select
textarea

// Custom focus management
useEffect(() => {
  elementRef.current?.focus()
}, [])
```

### Armadilha de Foco (Focus Trap)

```tsx
// Para modais e dialogs
function Modal() {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
      // Implementar focus trap
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      ...
    </div>
  )
}
```

## Ferramentas de Teste

### 1. axe DevTools

```bash
# Extensão do Chrome/Firefox
https://www.deque.com/axe/devtools/
```

### 2. Lighthouse

```bash
# No Chrome DevTools
# Lighthouse > Accessibility
```

### 3. Playwright + Axe

```bash
npm run test:e2e
```

### 4. Leitores de Tela

- NVDA (Windows) - Gratuito
- VoiceOver (macOS/iOS) - Gratuito
- JAWS (Windows) - Pago

## Checklist de Acessibilidade

### Antes de Commitar

- [ ] Imagens têm alt text
- [ ] Botões têm aria-label ou texto
- [ ] Links têm texto descritivo
- [ ] Formulários têm labels
- [ ] Cores têm contraste adequado
- [ ] Navegação por teclado funciona
- [ ] Modais têm aria-modal e foco trap
- [ ] Landmarks estão presentes
- [ ] Estados de loading têm aria-busy
- [ ] Erros têm aria-invalid e aria-describedby

### Testes Automatizados

```bash
# Rodar lint de acessibilidade
npm run lint

# Rodar testes E2E
npm run test:e2e

# Relatório de acessibilidade
npm run test:a11y:report
```

## Recursos

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [Deque University](https://dequeuniversity.com/)

## Exemplos Práticos

Veja [`src/utils/accessibility-examples.ts`](./src/utils/accessibility-examples.ts) para exemplos completos de código.

## Próximos Passos

1. ✅ Configurar ESLint plugin
2. ✅ Criar testes E2E
3. 📝 Revisar componentes existentes
4. 🔧 Corrigir violações encontradas
5. 📚 Treinar equipe
6. 🔄 Manter conformidade contínua
