import forge from 'node-forge'

export type WorkerRequest = { type: 'generate' }
export type WorkerResponse =
  | { type: 'success'; privateKeyPem: string; publicKeyPem: string; certPem: string }
  | { type: 'error'; message: string }

self.onmessage = (_e: MessageEvent<WorkerRequest>) => {
  try {
    const keyPair = forge.pki.rsa.generateKeyPair(2048)

    const cert = forge.pki.createCertificate()
    cert.publicKey = keyPair.publicKey
    cert.serialNumber = '01'

    const now = new Date()
    cert.validity.notBefore = now
    cert.validity.notAfter = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000)

    const attrs = [{ name: 'commonName', value: 'Kero Delivery' }]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.sign(keyPair.privateKey, forge.md.sha256.create())

    const response: WorkerResponse = {
      type: 'success',
      privateKeyPem: forge.pki.privateKeyToPem(keyPair.privateKey),
      publicKeyPem: forge.pki.publicKeyToPem(keyPair.publicKey),
      certPem: forge.pki.certificateToPem(cert),
    }
    ;(self as unknown as Worker).postMessage(response)
  } catch (err) {
    const response: WorkerResponse = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error generating certificate',
    }
    ;(self as unknown as Worker).postMessage(response)
  }
}
