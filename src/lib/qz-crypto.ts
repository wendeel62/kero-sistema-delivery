import forge from 'node-forge'

const LS_KEY_KEYPAIR = 'kero_qz_keypair'
const LS_KEY_CERT = 'kero_qz_cert'

interface StoredKeyPair {
  privateKeyPem: string
  publicKeyPem: string
}

let keyPair: forge.pki.rsa.KeyPair | null = null
let certPem: string | null = null

let initPromise: Promise<void> | null = null

function saveToStorage(privateKeyPem: string, publicKeyPem: string, cert: string): void {
  const stored: StoredKeyPair = { privateKeyPem, publicKeyPem }
  try {
    localStorage.setItem(LS_KEY_KEYPAIR, JSON.stringify(stored))
    localStorage.setItem(LS_KEY_CERT, cert)
  } catch {
    // Storage may be full or unavailable — proceed without persistence
  }
}

function loadFromStorage(): boolean {
  const raw = localStorage.getItem(LS_KEY_KEYPAIR)
  const storedCert = localStorage.getItem(LS_KEY_CERT)
  if (!raw || !storedCert) return false

  try {
    const { privateKeyPem, publicKeyPem } = JSON.parse(raw) as StoredKeyPair
    keyPair = {
      privateKey: forge.pki.privateKeyFromPem(privateKeyPem),
      publicKey: forge.pki.publicKeyFromPem(publicKeyPem),
    }
    certPem = storedCert
    return true
  } catch {
    try {
      localStorage.removeItem(LS_KEY_KEYPAIR)
      localStorage.removeItem(LS_KEY_CERT)
    } catch {
      // ignore
    }
    return false
  }
}

async function generateViaWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('./qz-crypto-worker.ts', import.meta.url), { type: 'module' })
    } catch {
      // Worker creation failed — fallback to sync generation (blocking)
      generateSync()
      resolve()
      return
    }

    const cleanup = () => {
      worker?.terminate()
      worker = null
    }

    worker.onmessage = (e: MessageEvent<{ type: string; privateKeyPem?: string; publicKeyPem?: string; certPem?: string; message?: string }>) => {
      const data = e.data
      if (data.type === 'success' && data.privateKeyPem && data.publicKeyPem && data.certPem) {
        try {
          keyPair = {
            privateKey: forge.pki.privateKeyFromPem(data.privateKeyPem),
            publicKey: forge.pki.publicKeyFromPem(data.publicKeyPem),
          }
          certPem = data.certPem
          saveToStorage(data.privateKeyPem, data.publicKeyPem, data.certPem)
        } catch {
          // Fallback to sync if importing PEM fails
          generateSync()
        }
        cleanup()
        resolve()
      } else if (data.type === 'error') {
        cleanup()
        // Fallback to sync if worker errors
        try {
          generateSync()
          resolve()
        } catch (err) {
          reject(err)
        }
      }
    }

    worker.onerror = () => {
      cleanup()
      try {
        generateSync()
        resolve()
      } catch (err) {
        reject(err)
      }
    }

    worker.postMessage({ type: 'generate' })
  })
}

function generateSync(): void {
  const freshKeyPair = forge.pki.rsa.generateKeyPair(2048)

  const cert = forge.pki.createCertificate()
  cert.publicKey = freshKeyPair.publicKey
  cert.serialNumber = '01'

  const now = new Date()
  cert.validity.notBefore = now
  cert.validity.notAfter = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000)

  const attrs = [{ name: 'commonName', value: 'Kero Delivery' }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(freshKeyPair.privateKey, forge.md.sha256.create())

  keyPair = freshKeyPair
  certPem = forge.pki.certificateToPem(cert)
  saveToStorage(
    forge.pki.privateKeyToPem(freshKeyPair.privateKey),
    forge.pki.publicKeyToPem(freshKeyPair.publicKey),
    certPem,
  )
}

async function lazyInit(): Promise<void> {
  // Fast path: already initialized
  if (keyPair && certPem) return

  // Try loading from storage (synchronous)
  if (loadFromStorage()) return

  // Mutex: prevent concurrent initialization (e.g. React StrictMode double-invoke)
  if (initPromise) return initPromise

  initPromise = generateViaWorker().catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}

export async function signDataAsync(toSign: string): Promise<string> {
  await lazyInit()
  if (!keyPair) throw new Error('[KeroPrint] Key pair not generated yet')
  const md = forge.md.sha256.create()
  md.update(toSign, 'utf8')
  const signature = keyPair.privateKey.sign(md)
  return forge.util.encode64(signature)
}

export async function getCertPemAsync(): Promise<string> {
  await lazyInit()
  if (!certPem) throw new Error('[KeroPrint] Certificate not generated yet')
  return certPem
}

export function isReady(): boolean {
  return keyPair !== null && certPem !== null
}
