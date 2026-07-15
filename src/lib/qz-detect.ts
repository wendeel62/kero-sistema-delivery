export type QzDetectStatus =
  | { status: 'rodando' }
  | { status: 'nao_executando' }
  | { status: 'certificado_recusado'; detail: string }
  | { status: 'incompativel'; detail: string }

const PROBE_TIMEOUT_MS = 3000
const PROBE_PORTS = [8181, 8282, 8383, 8484, 8182, 8283, 8384, 8485]

async function probePort(port: number): Promise<QzDetectStatus> {
  return new Promise((resolve) => {
    const url = `ws://localhost:${port}`
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.onclose = null
        ws.onerror = null
        try { ws.close() } catch { /* ignore */ }
        resolve({ status: 'nao_executando' })
      }
    }, PROBE_TIMEOUT_MS)

    const ws = new WebSocket(url)
    ws.onopen = () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        ws.close()
        resolve({ status: 'rodando' })
      }
    }
    ws.onerror = () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve({ status: 'nao_executando' })
      }
    }
    ws.onclose = (evt) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        if (evt.code === 1006 && evt.reason) {
          resolve({ status: 'certificado_recusado', detail: evt.reason })
        } else if (evt.code === 4003) {
          resolve({ status: 'incompativel', detail: evt.reason || 'Versão incompatível do QZ Tray' })
        } else {
          resolve({ status: 'nao_executando' })
        }
      }
    }
  })
}

export async function detectQzTray(): Promise<QzDetectStatus> {
  for (const port of PROBE_PORTS) {
    const result = await probePort(port)
    if (result.status !== 'nao_executando') return result
  }
  return { status: 'nao_executando' }
}
