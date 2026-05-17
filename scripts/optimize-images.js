#!/usr/bin/env node

/**
 * Otimizador de Imagens em Lote
 * 
 * Otimiza todas as imagens do projeto sem converter para WebP.
 * Útil para reduzir tamanho de arquivos existentes.
 * 
 * Uso:
 *   node scripts/optimize-images.js
 */

import sharp from 'sharp'
import glob from 'glob'
import path from 'path'
import fs from 'fs'

const config = {
  png: { compressionLevel: 9, adaptiveFiltering: true },
  jpeg: { quality: 80, progressive: true, mozjpeg: true },
  jpg: { quality: 80, progressive: true, mozjpeg: true },
}

const stats = {
  processed: 0,
  errors: 0,
  saved: 0,
}

async function optimizeImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase()
  const outputPath = inputPath + '.optimized' + ext
  
  try {
    const originalSize = fs.statSync(inputPath).size
    let pipeline = sharp(inputPath)
    
    if (ext === '.png') {
      pipeline = pipeline.png(config.png)
    } else if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg(config.jpeg)
    }
    
    await pipeline.toFile(outputPath)
    
    const optimizedSize = fs.statSync(outputPath).size
    const savings = originalSize - optimizedSize
    
    if (savings > 0) {
      // Substitui original pelo otimizado
      fs.renameSync(outputPath, inputPath)
      stats.saved += savings
      console.log(`✅ Otimizado: ${path.basename(inputPath)} (${(savings / 1024).toFixed(1)} KB economizados)`)
    } else {
      fs.unlinkSync(outputPath)
      console.log(`⏭️  Mantido: ${path.basename(inputPath)} (otimização não benéfica)`)
    }
    
    stats.processed++
  } catch (error) {
    console.error(`❌ Erro em ${inputPath}:`, error.message)
    stats.errors++
    try { fs.unlinkSync(outputPath) } catch {}
  }
}

async function main() {
  console.log('🚀 Otimizando imagens...\n')
  
  const files = glob.sync('src/assets/**/*.{png,jpg,jpeg}', {
    ignore: ['node_modules/**', 'dist/**', 'build/**']
  })
  
  if (files.length === 0) {
    console.log('Nenhuma imagem encontrada.')
    return
  }
  
  for (const file of files) {
    await optimizeImage(path.join(process.cwd(), file))
  }
  
  console.log('\n📊 Resumo:')
  console.log(`  Processadas: ${stats.processed}`)
  console.log(`  Erros: ${stats.errors}`)
  console.log(`  Total economizado: ${(stats.saved / 1024).toFixed(1)} KB`)
}

main().catch(console.error)
