declare module 'qz-tray' {
  interface QZConfig {
    branding: undefined
    prefs: {
      printer: string | null
      copies: number
      color: boolean
      duplex: boolean
      landscape: boolean
      paperSize: null
      dpi: number
    }
    margins: {
      top: number
      bottom: number
      left: number
      right: number
    }
  }

  interface QZWebSocket {
    connect(): Promise<void>
    disconnect(): Promise<void>
    isActive(): boolean
    setPromiseType(promiseType: 'promise'): void
  }

  interface QZPrinters {
    find(): Promise<string[]>
  }

  interface QZConfigs {
    create(printer: string, options?: Partial<QZConfig['prefs']>): QZConfig
  }

  interface QZSecurity {
    setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void
    setCertificatePromise(fn: (resolve: (cert: string) => void) => void): void
    setSignaturePromise(fn: (toSign: string, resolve: (signature: string) => void) => void): void
  }

  interface QZ {
    websocket: QZWebSocket
    printers: QZPrinters
    configs: QZConfigs
    security: QZSecurity
    print(config: QZConfig, data: number[][]): Promise<void>
  }

  declare const qz: QZ
  export default qz
}
