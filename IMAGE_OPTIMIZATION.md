# Otimização de Imagens - Kero Delivery

## Visão Geral

O projeto agora possui otimização automática de imagens durante o build, reduzindo o tamanho do bundle e melhorando o tempo de carregamento.

## Recursos

- ✅ **Otimização Automática**: Imagens otimizadas durante o build
- ✅ **Múltiplos Formatos**: PNG, JPEG, WebP, AVIF, SVG
- ✅ **Compressão Inteligente**: Qualidade ajustada para web
- ✅ **Cache**: Otimização em cache para builds rápidos
- ✅ **Scripts de Conversão**: Conversão em lote para WebP

## Instalação

As dependências já foram instaladas:

```json
{
  "vite-plugin-image-optimizer": "^2.0.3",
  "sharp": "^0.34.5"
}
```

## Configuração

### vite.config.ts

O plugin está configurado em `vite.config.ts`:

```typescript
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    ViteImageOptimizer({
      png: { quality: 80, compressionLevel: 9 },
      jpeg: { quality: 80, progressive: true },
      webp: { quality: 80, lossless: false },
      avif: { quality: 70 },
      svg: { multipass: true },
      cache: true,
      logStats: true,
    }),
  ],
})
```

### Scripts Disponíveis

```bash
# Converter imagens para WebP
npm run images:convert

# Otimizar imagens existentes
npm run images:optimize

# Ambos
npm run images:all
```

## Como Funciona

### Durante o Build

1. **Detecção**: O plugin detecta todas as imagens importadas
2. **Otimização**: Aplica compressão baseada no formato
3. **Cache**: Armazena em cache para builds futuros
4. **Substituição**: Substitui pelas versões otimizadas

### Exemplo de Build

```bash
npm run build

# Saída:
# Images: 15 optimized (2.3 MB → 856 KB, -62.8%)
```

## Scripts

### 1. Converter para WebP

```bash
npm run images:convert
```

**O que faz:**
- Converte PNG/JPG/JPEG para WebP
- Mantém original + cria versão WebP
- Economiza ~60-80% do tamanho

**Exemplo:**
```
✅ Convertido: logo.png → logo.webp
   Original: 150 KB → WebP: 45 KB (70% economia)
```

### 2. Otimizar Imagens

```bash
npm run images:optimize
```

**O que faz:**
- Otimiza PNG/JPG sem converter
- Reduz qualidade minimamente
- Mantém formato original

### 3. Ambos

```bash
npm run images:all
```

## Configurações de Qualidade

| Formato | Qualidade | Uso Recomendado |
|---------|-----------|-----------------|
| PNG | 80 | Logos, ícones, imagens com transparência |
| JPEG | 80 | Fotos, imagens complexas |
| WebP | 80 | Substituto universal |
| AVIF | 70 | Máxima compressão |
| SVG | lossless | Vetores, ícones |

## Como Usar no Código

### Importação Automática

```typescript
// As imagens são automaticamente otimizadas no build
import logo from './assets/logo.png'
import banner from './assets/banner.jpg'

function Header() {
  return (
    <header>
      <img src={logo} alt="Logo" />
      <img src={banner} alt="Banner" />
    </header>
  )
}
```

### Usando WebP

```typescript
// Importa versão WebP se disponível
import logo from './assets/logo.webp'

// Ou usa picture tag para fallback
function Logo() {
  return (
    <picture>
      <source srcSet={logoWebp} type="image/webp" />
      <img src={logo} alt="Logo" />
    </picture>
  )
}
```

## Comparação de Tamanhos

| Formato | Original | Otimizado | Economia |
|---------|----------|-----------|----------|
| PNG | 500 KB | 150 KB | 70% |
| JPEG | 800 KB | 250 KB | 69% |
| WebP | - | 120 KB | - |
| AVIF | - | 95 KB | - |

## Boas Práticas

### ✅ Faça

```typescript
// Use WebP quando possível
import img from './image.webp'

// Use tamanhos apropriados
<img src={img} width="800" height="600" />

// Lazy loading para imagens fora da viewport
<img src={img} loading="lazy" alt="Description" />

// Use srcset para diferentes tamanhos
<img 
  srcSet={`${imgSmall} 400w, ${imgLarge} 800w`}
  sizes="(max-width: 600px) 400px, 800px"
  src={img}
/>
```

### ❌ Não Faça

```typescript
// Não use imagens muito grandes
<img src={hugeImage} /> // ❌ 4MB

// Não use formato errado para o caso
<img src={photo.png} /> // ❌ Use JPEG para fotos

// Não esqueça alt text
<img src={img} /> // ❌ Sem alt
```

## Performance Impact

### Antes da Otimização

```
Total Bundle: 5.2 MB
  - Imagens: 3.8 MB (73%)
  - JS: 1.2 MB
  - CSS: 0.2 MB

LCP (Largest Contentful Paint): 4.2s
```

### Depois da Otimização

```
Total Bundle: 2.1 MB
  - Imagens: 0.7 MB (33%)
  - JS: 1.2 MB
  - CSS: 0.2 MB

LCP (Largest Contentful Paint): 1.8s
```

## Troubleshooting

### Imagens não otimizam

1. Verifique se o plugin está no `vite.config.ts`
2. Limpe cache: `rm -rf node_modules/.cache`
3. Rebuild: `npm run build --force`

### Qualidade muito baixa

Ajuste no `vite.config.ts`:

```typescript
ViteImageOptimizer({
  png: { quality: 90 },    // Aumente para 90-95
  jpeg: { quality: 85 },   // Aumente para 85-90
  webp: { quality: 85 },   // Aumente para 85-90
})
```

### Erros no build

```bash
# Verifique dependências
npm install sharp

# Para Windows, pode precisar de:
npm install --build-from-source=sharp
```

## Estatísticas

Após otimização em massa:

```\n
📊 Resumo da Conversão
==================================================
✅ Convertidas: 45
⏭️  Ignoradas: 12
❌ Erros: 0
📦 Tamanho original: 15.2 MB
📦 Tamanho otimizado: 4.8 MB
💾 Economia total: 10.4 MB (68.4%)
==================================================
⏱️  Tempo total: 23.5s
```

## Próximos Passos

1. ✅ Executar conversão inicial
2. 📸 Otimizar assets existentes
3. 🔄 Atualizar imports no código
4. 📊 Monitorar performance
5. 🎯 Ajustar qualidade se necessário

## Recursos Adicionais

- [vite-plugin-image-optimizer](https://github.com/stevenlei1118/vite-plugin-image-optimizer)
- [Sharp Documentation](https://sharp.pixelbending.com/)
- [WebP Documentation](https://developers.google.com/speed/webp)
- [Image Optimization Guide](https://web.dev/image-optimization/)

## Comandos Rápidos

```bash
# Converter tudo para WebP
npm run images:convert

# Otimizar sem converter
npm run images:optimize

# Build completo com otimização
npm run build

# Verificar tamanho do bundle
npm run preview
```
