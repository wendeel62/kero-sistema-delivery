import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { Configuracoes } from '../types/index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Simplified item structure expected in pedido.itens for receipt rendering. */
export interface PedidoItem {
  qtd: number | string
  nome: string
  variacao?: string
  obs?: string
}

/** Subset of UnifiedPedido used for receipt generation. */
export interface ReceiptPedido {
  numero: string | number
  created_at: string
  canal?: string
  cliente_nome?: string
  cliente_telefone?: string
  total: number | string
  forma_pagamento?: string
  itens?: PedidoItem[]
}

// ---------------------------------------------------------------------------
// buildReceipt — generates ESC/POS bytes for a thermal receipt
// ---------------------------------------------------------------------------

export function buildReceipt(
  pedido: ReceiptPedido,
  config: Configuracoes,
  largura: 58 | 80
): Uint8Array | null {
  try {
    const colunas = largura === 80 ? 42 : 32

    const encoder = new ReceiptPrinterEncoder({
      columns: colunas,
      language: 'esc-pos',
      codepageMapping: 'epson',
    })

    const pad = (left: string, right: string) => {
      const spaces = colunas - left.length - right.length
      return left + ' '.repeat(Math.max(1, spaces)) + right
    }

    encoder
      .initialize()
      .align('center')
      .bold(true)
      .line(config.nome_loja?.toUpperCase() || 'KERO DELIVERY')
      .bold(false)
      .line(config.endereco || '')
      .line(config.telefone || '')
      .rule()
      .align('center')
      .bold(true)
      .line(`PEDIDO #${String(pedido.numero).padStart(4, '0')}`)
      .bold(false)
      .align('left')
      .line(pad('Data:', new Date(pedido.created_at).toLocaleDateString('pt-BR')))
      .line(pad('Hora:', new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })))
      .line(pad('Canal:', pedido.canal || ''))
      .rule({ style: 'dashed' })
      .bold(true)
      .line('CLIENTE')
      .bold(false)
      .line(pad('Nome:', pedido.cliente_nome || ''))
      .line(pad('Tel:', pedido.cliente_telefone || ''))
      .rule({ style: 'dashed' })
      .bold(true)
      .line('ITENS DO PEDIDO')
      .bold(false)

    for (const item of pedido.itens || []) {
      encoder.line(`${item.qtd}x ${item.nome}`)
      if (item.variacao) encoder.line(`  -> ${item.variacao}`)
      if (item.obs) encoder.line(`  Obs: ${item.obs}`)
    }

    encoder
      .rule({ style: 'dashed' })
      .bold(true)
      .line(pad('TOTAL:', `R$ ${Number(pedido.total).toFixed(2)}`))
      .bold(false)
      .line(pad('Pagamento:', pedido.forma_pagamento || ''))
      .rule({ style: 'dashed' })
      .align('center')
      .line('Obrigado pela preferencia!')
      .line('Volte sempre :)')
      .size(2, 2)
      .line('Powered by Kero')
      .size(1, 1)
      .cut()

    return encoder.encode()
  } catch (error) {
    console.error('[KeroPrint] Erro ao montar cupom:', error)
    return null
  }
}
