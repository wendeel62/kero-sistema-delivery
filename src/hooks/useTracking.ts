import { useEffect } from 'react'
import { initMetaPixel, trackMetaEvent, initGA4, trackGA4Event, initUTMfy, getUTMParams } from '../lib/tracking'
import type { TrackingConfig } from '../types'

export function useTracking(config: TrackingConfig) {
  // Inicialização dos trackers
  useEffect(() => {
    if (config.meta_pixel_id) {
      initMetaPixel(config.meta_pixel_id)
    }

    if (config.ga4_measurement_id) {
      initGA4(config.ga4_measurement_id)
    }

    if (config.utmfy_token) {
      initUTMfy(config.utmfy_token)
    }
  }, [config.meta_pixel_id, config.ga4_measurement_id, config.utmfy_token])

  const trackPageView = () => {
    trackMetaEvent('PageView')
    trackGA4Event('page_view')
  }

  const trackViewContent = (produto_nome: string, preco?: number, categoria?: string) => {
    trackMetaEvent('ViewContent', {
      content_name: produto_nome,
      value: preco,
      currency: 'BRL',
      content_category: categoria
    })
    trackGA4Event('view_item', {
      item_name: produto_nome,
      price: preco,
      item_category: categoria,
      currency: 'BRL'
    })
  }

  const trackAddToCart = (produto_nome: string, preco?: number, quantidade?: number) => {
    trackMetaEvent('AddToCart', {
      content_name: produto_nome,
      value: preco,
      currency: 'BRL',
      quantity: quantidade
    })
    trackGA4Event('add_to_cart', {
      item_name: produto_nome,
      price: preco,
      currency: 'BRL',
      quantity: quantidade
    })
  }

  const trackInitiateCheckout = (valor_total: number, quantidade_itens: number) => {
    trackMetaEvent('InitiateCheckout', {
      value: valor_total,
      currency: 'BRL',
      num_items: quantidade_itens
    })
    trackGA4Event('begin_checkout', {
      value: valor_total,
      currency: 'BRL',
      num_items: quantidade_itens
    })
  }

  const trackPurchase = (valor_total: number, pedido_numero: number, forma_pagamento: string) => {
    const utmParams = getUTMParams()
    trackMetaEvent('Purchase', {
      value: valor_total,
      currency: 'BRL',
      order_id: pedido_numero,
      payment_method: forma_pagamento,
      ...utmParams
    })
    trackGA4Event('purchase', {
      value: valor_total,
      currency: 'BRL',
      transaction_id: String(pedido_numero),
      payment_type: forma_pagamento,
      ...utmParams
    })
  }

  return {
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase
  }
}