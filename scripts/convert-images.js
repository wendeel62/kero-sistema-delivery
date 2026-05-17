/**
 * Script de Conversão de Imagens para WebP
 * 
 * Este script converte todas as imagens PNG, JPG e JPEG do projeto para o formato WebP,
 * que oferece melhor compressão com qualidade similar.
 * 
 * Uso:
 *   node scripts/convert-images.js
 * 
 * Instalação das dependências:
 *   npm install -D sharp glob
 */

import sharp from 'sharp'
import glob from 'glob'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

// Polyfill para __dirname em ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configurações
const config = {
  // Qualidade da conversão (0-100)
  quality: 80,
  
  // Padrões de busca para imagens
  patterns: [
    'src/assets/**/*.{png,jpg,jpeg}',
    'public/**/*.{png,jpg,jpeg}',
    'src/images/**/*.{png,jpg,jpeg}',
    'src/img/**/*.{png,jpg,jpeg}',
  ],
  
  // Diretórios a serem ignorados
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
  ],
}

// Estatísticas
const stats = {
  converted: 0,
  errors: 0,
  skipped: 0,
  originalSize: 0,
  optimizedSize: 0,
}

/**
 * Formata bytes para KB/MB
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Converte uma imagem para WebP
 */
async function convertToWebP(inputPath) {
  const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp')
  
  // Pula se já existir
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Ignorado (já existe): ${path.basename(inputPath)}`)
    stats.skipped++
    return
  }
  
  try {
    // Obtém tamanho original
    const originalSize = fs.statSync(inputPath).size
    stats.originalSize += originalSize
    
    // Converte para WebP
    await sharp(inputPath)
      .webp({
        quality: config.quality,
        effort: 4, // Nível de compressão (0-6)
      })
      .toFile(outputPath)
    
    // Obtém tamanho otimizado
    const optimizedSize = fs.statSync(outputPath).size
    stats.optimizedSize += optimizedSize
    stats.converted++
    
    // Calcula economia
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1)
    
    console.log(`✅ Convertido: ${path.basename(inputPath)} → ${path.basename(outputPath)}`)
    console.log(`   Original: ${formatBytes(originalSize)} → WebP: ${formatBytes(optimizedSize)} (${savings}% economia)`)
  } catch (error) {
    console.error(`❌ Erro ao converter ${inputPath}:`, error.message)
    stats.errors++
  }
}

/**
 * Gera resumo das estatísticas
 */
function printStats() {
  console.log('\n' + '='.repeat(50))
  console.log('📊 Resumo da Conversão')
  console.log('='.repeat(50))
  console.log(`✅ Convertidas: ${stats.converted}`)
  console.log(`⏭️  Ignoradas: ${stats.skipped}`)
  console.log(`❌ Erros: ${stats.errors}`)
  console.log(`📦 Tamanho original: ${formatBytes(stats.originalSize)}`)
  console.log(`📦 Tamanho otimizado: ${formatBytes(stats.optimizedSize)}`)
  
  if (stats.originalSize > 0) {
    const totalSavings = ((stats.originalSize - stats.optimizedSize) / stats.originalSize * 100).toFixed(1)
    console.log(`💾 Economia total: ${formatBytes(stats.originalSize - stats.optimizedSize)} (${totalSavings}%)`)
  }
  
  console.log('='.repeat(50))
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando conversão de imagens para WebP...\n')
  
  const startTime = Date.now()
  
  // Coleta todas as imagens
  const files = []
  
  for (const pattern of config.patterns) {
    const found = glob.sync(pattern, { ignore: config.ignore })
    files.push(...found)
  }
  
  if (files.length === 0) {
    console.log('Nenhuma imagem encontrada para converter.')
    return
  }
  
  console.log(`📸 Encontradas ${files.length} imagens para converter\n`)
  
  // Converte cada imagem
  for (const file of files) {
    const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
    await convertToWebP(fullPath)
  }
  
  // Imprime estatísticas
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  printStats()
  console.log(`⏱️  Tempo total: ${duration}s\n`)
  
  console.log('✨ Conversão concluída!')
  console.log('\n💡 Dica: Atualize as importações no código para usar as versões .webp')
  console.log('   Exemplo: import img from "./image.webp"')
}

// Executa
main().catch(console.error)
