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
        try { ws.close() } catch { /* ignore */ }
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
  const probes = PROBE_PORTS.map(port => probePort(port))

  const timeout = new Promise<QzDetectStatus>((resolve) => {
    setTimeout(() => resolve({ status: 'nao_executando' }), PROBE_TIMEOUT_MS)
  })

  const result = await Promise.race([timeout, ...probes])

  if (result.status !== 'nao_executando') return result

  const settled = await Promise.allSettled(probes)
  const firstNonTimeout = settled.find(
    (r): r is PromiseFulfilledResult<QzDetectStatus> =>
      r.status === 'fulfilled' && r.value.status !== 'nao_executando'
  )
  if (firstNonTimeout) return firstNonTimeout.value

  return { status: 'nao_executando' }
}
