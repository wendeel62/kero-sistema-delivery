/**
 * @description Testes para o hook useTracking
 * @hook useTracking - Rastreamento de eventos (Meta Pixel, GA4, UTM)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTracking } from '../useTracking'
import {
  initMetaPixel,
  trackMetaEvent,
  initGA4,
  trackGA4Event,
  initUTMfy,
  getUTMParams,
} from '../../lib/tracking'

vi.mock('../../lib/tracking', () => ({
  initMetaPixel: vi.fn(),
  trackMetaEvent: vi.fn(),
  initGA4: vi.fn(),
  trackGA4Event: vi.fn(),
  initUTMfy: vi.fn(),
  getUTMParams: vi.fn(),
}))

describe('useTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve inicializar Meta Pixel quando configurado', () => {
    const config = {
      meta_pixel_id: '123456789',
      ga4_measurement_id: '',
      utmfy_token: '',
    }

    renderHook(() => useTracking(config))

    expect(initMetaPixel).toHaveBeenCalledWith('123456789')
  })

  it('deve inicializar GA4 quando configurado', () => {
    const config = {
      meta_pixel_id: '',
      ga4_measurement_id: 'G-XXXXXXXXXX',
      utmfy_token: '',
    }

    renderHook(() => useTracking(config))

    expect(initGA4).toHaveBeenCalledWith('G-XXXXXXXXXX')
  })

  it('deve inicializar UTMfy quando configurado', () => {
    const config = {
      meta_pixel_id: '',
      ga4_measurement_id: '',
      utmfy_token: 'abc123',
    }

    renderHook(() => useTracking(config))

    expect(initUTMfy).toHaveBeenCalledWith('abc123')
  })

  it('deve retornar metodos de tracking', () => {
    const config = {
      meta_pixel_id: '',
      ga4_measurement_id: '',
      utmfy_token: '',
    }

    const { result } = renderHook(() => useTracking(config))

    expect(result.current.trackPageView).toBeDefined()
    expect(result.current.trackViewContent).toBeDefined()
    expect(result.current.trackAddToCart).toBeDefined()
    expect(result.current.trackInitiateCheckout).toBeDefined()
    expect(result.current.trackPurchase).toBeDefined()
  })

  it('deve rastrear page view', () => {
    const config = {
      meta_pixel_id: '123456789',
      ga4_measurement_id: 'G-XXXXXXXXXX',
      utmfy_token: '',
    }

    const { result } = renderHook(() => useTracking(config))

    result.current.trackPageView()

    expect(trackMetaEvent).toHaveBeenCalledWith('PageView')
    expect(trackGA4Event).toHaveBeenCalledWith('page_view')
  })

  it('deve rastrear visualizacao de conteudo', () => {
    const config = {
      meta_pixel_id: '123456789',
      ga4_measurement_id: 'G-XXXXXXXXXX',
      utmfy_token: '',
    }

    const { result } = renderHook(() => useTracking(config))

    result.current.trackViewContent('Pizza Margherita', 50, 'Pizzas')

    expect(trackMetaEvent).toHaveBeenCalledWith('ViewContent', {
      content_name: 'Pizza Margherita',
      value: 50,
      currency: 'BRL',
      content_category: 'Pizzas',
    })

    expect(trackGA4Event).toHaveBeenCalledWith('view_item', {
      item_name: 'Pizza Margherita',
      price: 50,
      item_category: 'Pizzas',
      currency: 'BRL',
    })
  })

  it('deve rastrear adicionao ao carrinho', () => {
    const config = {
      meta_pixel_id: '123456789',
      ga4_measurement_id: 'G-XXXXXXXXXX',
      utmfy_token: '',
    }

    const { result } = renderHook(() => useTracking(config))

    result.current.trackAddToCart('Pizza Margherita', 50, 2)

    expect(trackMetaEvent).toHaveBeenCalledWith('AddToCart', {
      content_name: 'Pizza Margherita',
      value: 50,
      currency: 'BRL',
      quantity: 2,
    })

    expect(trackGA4Event).toHaveBeenCalledWith('add_to_cart', {
      item_name: 'Pizza Margherita',
      price: 50,
      currency: 'BRL',
      quantity: 2,
    })
  })

  it('deve rastrear inicio de checkout', () => {
    const config = {
      meta_pixel_id: '123456789',
      ga4_measurement_id: 'G-XXXXXXXXXX',
      utmfy_token: '',
    }

    const { result } = renderHook(() => useTracking(config))

    result.current.trackInitiateCheckout(150, 3)

    expect(trackMetaEvent).toHaveBeenCalledWith('InitiateCheckout', {
      value: 150,
      currency: 'BRL',
      num_items: 3,
    })

    expect(trackGA4Event).toHaveBeenCalledWith('begin_checkout', {
      value: 150,
      currency: 'BRL',
      num_items: 3,
    })
  })

  it('deve rastrear compra com parametros UTM', () => {
    vi.mocked(getUTMParams).mockReturnValue({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'summer_sale',
    })

    const config = {
      meta_pixel_id: '123456789',
      ga4_measurement_id: 'G-XXXXXXXXXX',
      utmfy_token: '',
    }

    const { result } = renderHook(() => useTracking(config))

    result.current.trackPurchase(200, 12345, 'credit_card')

    expect(trackMetaEvent).toHaveBeenCalledWith('Purchase', {
      value: 200,
      currency: 'BRL',
      order_id: 12345,
      payment_method: 'credit_card',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'summer_sale',
    })

    expect(trackGA4Event).toHaveBeenCalledWith('purchase', {
      value: 200,
      currency: 'BRL',
      transaction_id: '12345',
      payment_type: 'credit_card',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'summer_sale',
    })
  })

  it('nao deve inicializar trackers sem configuracao', () => {
    const config = {
      meta_pixel_id: '',
      ga4_measurement_id: '',
      utmfy_token: '',
    }

    renderHook(() => useTracking(config))

    expect(initMetaPixel).not.toHaveBeenCalled()
    expect(initGA4).not.toHaveBeenCalled()
    expect(initUTMfy).not.toHaveBeenCalled()
  })
})
