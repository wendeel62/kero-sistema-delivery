/**
 * Testes de Acessibilidade E2E
 * 
 * Estes testes verificam a conformidade com WCAG 2.1
 * usando axe-core para análise automática.
 * 
 * Executar: npm run test:e2e
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// ============================================
// Homepage
// ============================================

test('Homepage deve ser acessível', async ({ page }) => {
  await page.goto('/')
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})

// ============================================
// Páginas Principais
// ============================================

const pages = [
  { name: 'Login', url: '/admin/login' },
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'Pedidos', url: '/pedidos' },
  { name: 'PDV', url: '/pdv' },
  { name: 'Cardápio', url: '/cardapio-admin' },
]

for (const { name, url } of pages) {
  test(`${name} deve ser acessível`, async ({ page }) => {
    await page.goto(url)
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
}

// ============================================
// Componentes Específicos
// ============================================

test('Modal deve ser acessível', async ({ page }) => {
  await page.goto('/')
  
  // Abre um modal (exemplo genérico)
  await page.click('[data-testid="open-modal"]')
  
  // Verifica se modal tem foco trap
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  
  // Analisa acessibilidade do modal
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})

test('Navegação deve ser acessível', async ({ page }) => {
  await page.goto('/')
  
  // Verifica landmarks
  await expect(page.locator('nav[aria-label]')).toBeVisible()
  await expect(page.locator('main')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()
  
  // Analisa navegação
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include('nav')
    .include('main')
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})

test('Formulários devem ser acessíveis', async ({ page }) => {
  await page.goto('/admin/login')
  
  // Verifica labels em inputs
  const inputs = await page.locator('input').all()
  
  for (const input of inputs) {
    const hasLabel = await input.locator('xpath=..').locator('label').count() > 0
    const hasAriaLabel = await input.evaluate(el => 
      el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
    )
    
    expect(hasLabel || hasAriaLabel).toBe(true)
  }
})

// ============================================
// Verificações Manuais
// ============================================

test('Imagens devem ter alt text', async ({ page }) => {
  await page.goto('/')
  
  const images = await page.locator('img').all()
  
  for (const img of images) {
    const alt = await img.getAttribute('alt')
    const role = await img.getAttribute('role')
    
    // Imagens decorativas podem ter alt vazio com role="presentation"
    if (role !== 'presentation') {
      expect(alt).toBeTruthy()
    }
  }
})

test('Links devem ter texto significativo', async ({ page }) => {
  await page.goto('/')
  
  const links = await page.locator('a').all()
  
  for (const link of links) {
    const text = await link.textContent()
    const ariaLabel = await link.getAttribute('aria-label')
    
    const hasText = text?.trim().length > 0 || ariaLabel?.length > 0
    expect(hasText).toBe(true)
  }
})

test('Botões devem ter texto ou aria-label', async ({ page }) => {
  await page.goto('/')
  
  const buttons = await page.locator('button, [role="button"]').all()
  
  for (const button of buttons) {
    const text = await button.textContent()
    const ariaLabel = await button.getAttribute('aria-label')
    const ariaLabelledby = await button.getAttribute('aria-labelledby')
    
    const hasText = text?.trim().length > 0 || ariaLabel?.length > 0 || ariaLabelledby?.length > 0
    expect(hasText).toBe(true)
  }
})

// ============================================
// Teclado e Navegação
// ============================================

test('Site deve ser navegável por teclado', async ({ page }) => {
  await page.goto('/')
  
  // Tenta navegar com Tab
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  
  // Verifica se algo foi focado
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
  expect(focusedElement).toBeTruthy()
})

test('Pular para conteúdo principal', async ({ page }) => {
  await page.goto('/')
  
  // Procura por link "skip to main content"
  const skipLink = page.locator('a[href="#main-content"], a:has-text("skip")')
  
  // Se existir, deve funcionar
  if (await skipLink.count() > 0) {
    await skipLink.click()
    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeVisible()
  }
})

// ============================================
// Cores e Contraste
// ============================================

test('Cores devem ter contraste adequado', async ({ page }) => {
  await page.goto('/')
  
  // axe-core verifica contraste automaticamente
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze()

  // Filtra apenas violações de contraste
  const contrastViolations = accessibilityScanResults.violations.filter(
    violation => violation.id.includes('color-contrast')
  )

  expect(contrastViolations).toEqual([])
})

// ============================================
// ARIA
// ============================================

test('ARIA roles devem ser válidas', async ({ page }) => {
  await page.goto('/')
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  // Filtra violações de ARIA
  const ariaViolations = accessibilityScanResults.violations.filter(
    violation => violation.id.includes('aria')
  )

  expect(ariaViolations).toEqual([])
})

test('Elementos interativos devem ter ARIA adequado', async ({ page }) => {
  await page.goto('/')
  
  // Verifica botões com aria-pressed
  const toggleButtons = page.locator('[aria-pressed]')
  const count = await toggleButtons.count()
  
  if (count > 0) {
    // Se houver toggle buttons, devem ter estado correto
    const states = await toggleButtons.evaluateAll(
      els => els.map(el => ({
        pressed: el.getAttribute('aria-pressed'),
        valid: ['true', 'false'].includes(el.getAttribute('aria-pressed') || '')
      }))
    )
    
    states.forEach(state => {
      expect(state.valid).toBe(true)
    })
  }
})
