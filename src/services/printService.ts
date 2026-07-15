import qz from 'qz-tray'
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import { getCertPem, signData } from '../lib/qz-crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReceiptLine =
  | { type: 'text'; content: string; bold?: boolean; align?: 'left' | 'center' | 'right'; size?: 'normal' | 'large' }
  | { type: 'divider' }
  | { type: 'spacer' }
  | { type: 'cut' }

export interface OrderItem {
  quantidade: number
  nome: string
  variacao?: string
  adicionais?: string[]
  observacao?: string
  preco_unitario: number
}

export interface OrderData {
  numero: string
  cliente_nome: string
  cliente_telefone: string
  tipo_entrega: 'delivery' | 'retirada' | 'balcao'
  endereco?: string
  itens: Array<OrderItem>
  subtotal: number
  taxa_entrega: number
  desconto: number
  total: number
  forma_pagamento: string
  troco_para?: number
  estabelecimento_nome: string
  estabelecimento_endereco: string
  estabelecimento_telefone: string
}

// ---------------------------------------------------------------------------
// Retry + timeout helpers
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const PRINT_TIMEOUT_MS = 15_000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export async function connectPrinter(): Promise<void> {
  if (qz.websocket.isActive()) return
  try {
    qz.security.setSignatureAlgorithm('SHA256')
    qz.security.setCertificatePromise((resolve) => {
      resolve(getCertPem())
    })
    qz.security.setSignaturePromise((toSign, resolve) => {
      resolve(signData(toSign))
    })
    await qz.websocket.connect()
  } catch {
    throw new Error('QZ Tray recusou a conexão. Verifique as configurações de segurança.')
  }
}

export async function disconnectPrinter(): Promise<void> {
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect()
  }
}

export function isConnected(): boolean {
  return qz.websocket.isActive()
}

export async function getAvailablePrinters(): Promise<string[]> {
  try {
    return await qz.printers.find()
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// ESC/POS encoding — usa ReceiptPrinterEncoder (suporta caracteres brasileiros)
// ---------------------------------------------------------------------------

function encodeLines(lines: ReceiptLine[], columns: number): Uint8Array {
  const encoder = new ReceiptPrinterEncoder({
    columns,
    language: 'esc-pos',
    codepageMapping: 'epson',
  })

  for (const line of lines) {
    if (line.type === 'text') {
      if (line.align === 'center') encoder.align('center')
      else if (line.align === 'right') encoder.align('right')
      else encoder.align('left')

      if (line.bold) encoder.bold(true)

      if (line.size === 'large') encoder.size(2, 2)

      encoder.line(line.content)

      if (line.bold) encoder.bold(false)
      if (line.size === 'large') encoder.size(1, 1)
    } else if (line.type === 'divider') {
      encoder.rule({ style: 'dashed' })
    } else if (line.type === 'spacer') {
      encoder.newline()
    } else if (line.type === 'cut') {
      encoder.cut()
    }
  }

  return encoder.encode()
}

// ---------------------------------------------------------------------------
// Low-level: send raw bytes via QZ Tray
// ---------------------------------------------------------------------------

export async function printBytes(
  printerName: string,
  bytes: Uint8Array,
): Promise<void> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = qz.configs.create(printerName)
      await withTimeout(
        qz.print(config, [Array.from(bytes)]),
        PRINT_TIMEOUT_MS,
        'Timeout ao imprimir — impressora não respondeu',
      )
      return
    } catch (err) {
      lastError = err
      console.warn(`[KeroPrint] Tentativa ${attempt}/${MAX_RETRIES} falhou:`, err)
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
    }
  }
  throw lastError
}

// ---------------------------------------------------------------------------
// Convenience: encode OrderData to bytes, then print via QZ Tray
// ---------------------------------------------------------------------------

export function encodeOrderToBytes(
  order: OrderData,
  paperWidth: '80mm' | '58mm',
): Uint8Array {
  const lines = buildOrderReceipt(order, paperWidth)
  const columns = paperWidth === '80mm' ? 42 : 32
  return encodeLines(lines, columns)
}

export async function printReceipt(
  printerName: string,
  lines: ReceiptLine[],
  paperWidth: '80mm' | '58mm',
): Promise<void> {
  const columns = paperWidth === '80mm' ? 42 : 32
  const bytes = encodeLines(lines, columns)
  await printBytes(printerName, bytes)
}

// ---------------------------------------------------------------------------
// Receipt builder
// ---------------------------------------------------------------------------

export function buildOrderReceipt(order: OrderData, paperWidth: '80mm' | '58mm' = '80mm'): ReceiptLine[] {
  const lines: ReceiptLine[] = []
  const columns = paperWidth === '80mm' ? 42 : 32

  lines.push({ type: 'text', content: order.estabelecimento_nome, align: 'center', bold: true, size: 'large' })
  lines.push({ type: 'text', content: order.estabelecimento_endereco, align: 'center' })
  lines.push({ type: 'text', content: `Tel: ${order.estabelecimento_telefone}`, align: 'center' })
  lines.push({ type: 'divider' })

  lines.push({ type: 'text', content: `PEDIDO #${order.numero}`, align: 'center', bold: true })

  const now = new Date()
  const formattedDate = now.toLocaleDateString('pt-BR')
    + ' '
    + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  lines.push({ type: 'text', content: formattedDate, align: 'center' })
  lines.push({ type: 'divider' })

  lines.push({ type: 'text', content: `CLIENTE: ${order.cliente_nome}` })
  lines.push({ type: 'text', content: `TELEFONE: ${order.cliente_telefone}` })

  if (order.tipo_entrega === 'delivery' && order.endereco) {
    lines.push({ type: 'text', content: `ENDEREÇO: ${order.endereco}` })
  }
  lines.push({ type: 'divider' })

  for (const item of order.itens) {
    const nomePart = `${item.quantidade}x ${item.nome}${item.variacao ? ` - ${item.variacao}` : ''}`
    const precoPart = `R$ ${(item.preco_unitario * item.quantidade).toFixed(2)}`
    const maxNomeLen = columns - precoPart.length - 1
    const paddedNome = nomePart.length > maxNomeLen ? nomePart.slice(0, maxNomeLen - 3) + '...' : nomePart
    const spaces = ' '.repeat(Math.max(1, columns - paddedNome.length - precoPart.length))
    lines.push({ type: 'text', content: `${paddedNome}${spaces}${precoPart}` })

    if (item.adicionais && item.adicionais.length > 0) {
      for (const ad of item.adicionais) {
        lines.push({ type: 'text', content: `  + ${ad}` })
      }
    }

    if (item.observacao) {
      lines.push({ type: 'text', content: `  OBS: ${item.observacao}` })
    }
  }
  lines.push({ type: 'divider' })

  lines.push({ type: 'text', content: `SUBTOTAL: R$ ${order.subtotal.toFixed(2)}`, align: 'right' })

  if (order.taxa_entrega > 0) {
    lines.push({ type: 'text', content: `ENTREGA: R$ ${order.taxa_entrega.toFixed(2)}`, align: 'right' })
  }

  if (order.desconto > 0) {
    lines.push({ type: 'text', content: `DESCONTO: -R$ ${order.desconto.toFixed(2)}`, align: 'right' })
  }

  lines.push({ type: 'text', content: `TOTAL: R$ ${order.total.toFixed(2)}`, align: 'right', bold: true, size: 'large' })
  lines.push({ type: 'divider' })

  lines.push({ type: 'text', content: `PAGAMENTO: ${order.forma_pagamento}` })

  if (order.troco_para !== undefined) {
    lines.push({ type: 'text', content: `TROCO PARA: R$ ${order.troco_para.toFixed(2)}` })
    lines.push({ type: 'text', content: `TROCO: R$ ${(order.troco_para - order.total).toFixed(2)}` })
  }
  lines.push({ type: 'divider' })

  lines.push({ type: 'text', content: `/pedido/${order.numero}`, align: 'center' })
  lines.push({ type: 'text', content: 'Obrigado pela preferencia!', align: 'center' })
  lines.push({ type: 'spacer' })
  lines.push({ type: 'spacer' })
  lines.push({ type: 'spacer' })
  lines.push({ type: 'cut' })

  return lines
}
