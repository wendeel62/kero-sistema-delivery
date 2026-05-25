// META PIXEL
export function initMetaPixel(pixelId: string): void {
  try {
    // Verificar se já foi inicializado
    if (document.querySelector(`[data-pixel-id="${pixelId}"]`)) {
      return
    }

    // Injetar script do Facebook Pixel
    const script = document.createElement('script')
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `
    script.setAttribute('data-pixel-id', pixelId)
    document.head.appendChild(script)
  } catch (error) {
    console.error('[KeroTracking] Erro ao inicializar Meta Pixel:', error)
  }
}

export function trackMetaEvent(event: string, params?: Record<string, unknown>): void {
  try {
    const w = window as unknown as Record<string, unknown>
    if (typeof window !== 'undefined' && w.fbq) {
      ;(w as unknown as Record<string, (method: string, event: string, params?: Record<string, unknown>) => void>).fbq('track', event, params)
    }
  } catch (error) {
    console.error('[KeroTracking] Erro ao trackear Meta event:', error)
  }
}

// GOOGLE ANALYTICS 4
export function initGA4(measurementId: string): void {
  try {
    // Verificar se já foi inicializado
    if (document.querySelector(`[data-ga4-id="${measurementId}"]`)) {
      return
    }

    // Inicializar dataLayer se não existir
    const w2 = window as unknown as Record<string, unknown>
    if (typeof window !== 'undefined' && !w2.dataLayer) {
      ;(w2 as unknown as Record<string, unknown[]>).dataLayer = []
    }

    // Injetar script gtag
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    script.setAttribute('data-ga4-id', measurementId)
    document.head.appendChild(script)

    // Configurar gtag
    const configScript = document.createElement('script')
    configScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `
    document.head.appendChild(configScript)
  } catch (error) {
    console.error('[KeroTracking] Erro ao inicializar GA4:', error)
  }
}

export function trackGA4Event(event: string, params?: Record<string, unknown>): void {
  try {
    const w3 = window as unknown as Record<string, unknown>
    if (typeof window !== 'undefined' && w3.gtag) {
      ;(w3 as unknown as Record<string, (method: string, event: string, params?: Record<string, unknown>) => void>).gtag('event', event, params)
    }
  } catch (error) {
    console.error('[KeroTracking] Erro ao trackear GA4 event:', error)
  }
}

// UTMfy
export function initUTMfy(token: string): void {
  try {
    // Verificar se já foi inicializado
    if (document.querySelector('[data-utmfy-token]')) {
      return
    }

    // Capturar parâmetros UTM da URL atual
    const urlParams = new URLSearchParams(window.location.search)
    const utmParams: Record<string, string> = {}

    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = urlParams.get(param)
      if (value) {
        utmParams[param] = value
      }
    })

    // Salvar no sessionStorage
    if (Object.keys(utmParams).length > 0) {
      sessionStorage.setItem('kero_utm_params', JSON.stringify(utmParams))
    }

    // Injetar script UTMfy (opcional - apenas para funcionalidades extras)
    const script = document.createElement('script')
    script.src = `https://cdn.utmfy.com/${token}.js`
    script.setAttribute('data-utmfy-token', token)
    document.head.appendChild(script)
  } catch (error) {
    console.error('[KeroTracking] Erro ao inicializar UTMfy:', error)
  }
}

export function getUTMParams(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem('kero_utm_params')
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('[KeroTracking] Erro ao obter UTM params:', error)
    return {}
  }
}