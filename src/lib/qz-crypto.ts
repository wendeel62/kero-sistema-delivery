import forge from 'node-forge'

const LS_KEY_KEYPAIR = 'kero_qz_keypair'
const LS_KEY_CERT = 'kero_qz_cert'

let keyPair: forge.pki.rsa.KeyPair | null = null
let certPem: string | null = null

function saveToStorage(): void {
  if (!keyPair) return
  const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey)
  const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey)
  localStorage.setItem(LS_KEY_KEYPAIR, JSON.stringify({ privateKeyPem, publicKeyPem }))
  if (certPem) localStorage.setItem(LS_KEY_CERT, certPem)
}

function loadFromStorage(): boolean {
  const raw = localStorage.getItem(LS_KEY_KEYPAIR)
  const storedCert = localStorage.getItem(LS_KEY_CERT)
  if (!raw || !storedCert) return false

  try {
    const { privateKeyPem, publicKeyPem } = JSON.parse(raw)
    keyPair = {
      privateKey: forge.pki.privateKeyFromPem(privateKeyPem),
      publicKey: forge.pki.publicKeyFromPem(publicKeyPem),
    }
    certPem = storedCert
    return true
  } catch {
    localStorage.removeItem(LS_KEY_KEYPAIR)
    localStorage.removeItem(LS_KEY_CERT)
    return false
  }
}

function lazyInit(): void {
  if (keyPair && certPem) return
  if (loadFromStorage()) return

  keyPair = forge.pki.rsa.generateKeyPair(2048)

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

  certPem = forge.pki.certificateToPem(cert)
  saveToStorage()
}

export function signData(toSign: string): string {
  lazyInit()
  if (!keyPair) throw new Error('[KeroPrint] Key pair not generated yet')
  const md = forge.md.sha256.create()
  md.update(toSign, 'utf8')
  const signature = keyPair.privateKey.sign(md)
  return forge.util.encode64(signature)
}

export function getCertPem(): string {
  lazyInit()
  return certPem!
}
