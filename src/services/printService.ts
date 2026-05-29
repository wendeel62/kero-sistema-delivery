import qz from 'qz-tray'

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
// Connection
// ---------------------------------------------------------------------------

export async function connectPrinter(): Promise<void> {
  if (qz.websocket.isActive()) return
  try {
    await qz.websocket.connect()
  } catch {
    throw new Error('QZ Tray não encontrado. Verifique se o programa está instalado e em execução.')
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
// ESC/POS helpers
// ---------------------------------------------------------------------------

function stringToBytes(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code <= 0xFF) {
      bytes.push(code)
    } else if (code === 0x2013 || code === 0x2014) {
      bytes.push(0x2D)
    } else {
      bytes.push(0x3F)
    }
  }
  return bytes
}

function buildEscPosCommands(lines: ReceiptLine[], columns: number): number[][] {
  const commands: number[][] = []

  commands.push([0x1B, 0x40])

  for (const line of lines) {
    if (line.type === 'text') {
      if (line.align === 'center') commands.push([0x1B, 0x61, 0x01])
      else if (line.align === 'right') commands.push([0x1B, 0x61, 0x02])
      else commands.push([0x1B, 0x61, 0x00])

      if (line.bold) commands.push([0x1B, 0x45, 0x01])
      if (line.size === 'large') commands.push([0x1D, 0x21, 0x11])

      commands.push(stringToBytes(line.content))
      commands.push([0x0A])

      if (line.size === 'large') commands.push([0x1D, 0x21, 0x00])
      if (line.bold) commands.push([0x1B, 0x45, 0x00])
    } else if (line.type === 'divider') {
      commands.push(stringToBytes('-'.repeat(columns)))
      commands.push([0x0A])
    } else if (line.type === 'spacer') {
      commands.push([0x0A])
    } else if (line.type === 'cut') {
      commands.push([0x1D, 0x56, 0x00])
    }
  }

  return commands
}

export async function printReceipt(
  printerName: string,
  lines: ReceiptLine[],
  paperWidth: '80mm' | '58mm',
): Promise<void> {
  const config = qz.configs.create(printerName)
  const columns = paperWidth === '80mm' ? 42 : 32
  const commands = buildEscPosCommands(lines, columns)
  await qz.print(config, commands)
}

// ---------------------------------------------------------------------------
// Receipt builder
// ---------------------------------------------------------------------------

export function buildOrderReceipt(order: OrderData): ReceiptLine[] {
  const lines: ReceiptLine[] = []

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
    const paddedNome = nomePart.length > 32 ? nomePart.slice(0, 29) + '...' : nomePart
    const spaces = ' '.repeat(Math.max(1, 42 - paddedNome.length - precoPart.length))
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
  lines.push({ type: 'text', content: 'Obrigado pela preferência!', align: 'center' })
  lines.push({ type: 'spacer' })
  lines.push({ type: 'spacer' })
  lines.push({ type: 'spacer' })
  lines.push({ type: 'cut' })

  return lines
}
