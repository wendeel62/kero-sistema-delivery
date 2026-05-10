#!/usr/bin/env node
/**
 * Gera ícones PWA a partir do favicon.svg
 * Requer: npm install -D sharp
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svgPath = resolve(root, 'public', 'favicon.svg')
const outDir = resolve(root, 'public', 'icons')

if (!existsSync(svgPath)) {
  console.error('❌ favicon.svg não encontrado em public/')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgBuffer = readFileSync(svgPath)

async function generate() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(resolve(outDir, `icon-${size}x${size}.png`))
    console.log(`✅ icon-${size}x${size}.png gerado`)
  }

  // Ícone maskable (com padding de 40% para safe area)
  const maskableSize = 512
  const padding = Math.round(maskableSize * 0.1)
  const innerSize = maskableSize - padding * 2

  const innerPng = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: innerPng, left: padding, top: padding }])
    .png()
    .toFile(resolve(outDir, 'maskable-icon-512x512.png'))

  console.log('✅ maskable-icon-512x512.png gerado')
  console.log('\n🎉 Todos os ícones PWA foram gerados com sucesso!')
}

generate().catch(err => {
  console.error('❌ Erro ao gerar ícones:', err)
  process.exit(1)
})
