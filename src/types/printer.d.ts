/**
 * Ambient module declarations for @point-of-sale packages.
 *
 * These packages don't ship their own .d.ts files, so we declare
 * the module shapes here for TypeScript to use during compilation.
 *
 * The declarations match the ACTUAL runtime API of the installed versions:
 *   - @point-of-sale/webusb-receipt-printer v2.0.0
 *   - @point-of-sale/receipt-printer-encoder v3.0.3
 */

// ---------------------------------------------------------------------------
// @point-of-sale/webusb-receipt-printer  v2.0.0
// ---------------------------------------------------------------------------

declare module '@point-of-sale/webusb-receipt-printer' {
  /** Device metadata emitted on the "connected" event. */
  export interface PrinterDeviceInfo {
    type: 'usb'
    manufacturerName: string
    productName: string
    serialNumber: string | null
    vendorId: number
    productId: number
    language: string
    codepageMapping: string
  }

  /** Keys accepted by reconnect() to identify a previously-paired printer. */
  export interface PrinterIdentity {
    vendorId: number
    productId: number
    serialNumber?: string | null
  }

  /**
   * WebUSB receipt printer driver.
   *
   * Usage:
   *   const printer = new WebUSBReceiptPrinter()
   *   await printer.connect()           // prompts user to select device
   *   await printer.reconnect({ vendorId, productId }) // auto-reconnect saved device
   *   printer.addEventListener('connected', cb)
   *   printer.addEventListener('disconnected', cb)
   *   await printer.print(data)         // data: Uint8Array of ESC/POS commands
   *   await printer.disconnect()
   */
  export default class WebUSBReceiptPrinter {
    /** Prompt the user to select a USB receipt printer via browser dialog. */
    connect(): Promise<void>

    /** Reconnect to a previously-paired device without user interaction. */
    reconnect(identity: PrinterIdentity): Promise<void>

    /** Start listening for incoming data from the printer (status reports). */
    listen(): Promise<boolean>

    /** Send ESC/POS data to the printer. */
    print(data: Uint8Array): Promise<void>

    /** Close the USB connection and release the device. */
    disconnect(): Promise<void>

    /** Listen for printer lifecycle events: 'connected', 'disconnected', 'data'. */
    addEventListener(
      event: 'connected' | 'disconnected' | 'data',
      callback: (event: { detail?: PrinterDeviceInfo }) => void
    ): void
  }
}

// ---------------------------------------------------------------------------
// @point-of-sale/receipt-printer-encoder  v3.0.3
// ---------------------------------------------------------------------------

declare module '@point-of-sale/receipt-printer-encoder' {
  export type ReceiptPrinterEncoderLanguage = 'esc-pos' | 'star-prnt' | 'star-line'

  export interface ReceiptPrinterEncoderOptions {
    /** Number of columns — determines paper width (32=58mm, 42=80mm default). */
    columns?: number
    /** Alias for columns (accepted by the library for convenience). */
    width?: number
    /** Printer language protocol. Default: 'esc-pos'. */
    language?: ReceiptPrinterEncoderLanguage
    /** Printer model identifier (e.g. 'pos-5890'). Overrides columns/language. */
    printerModel?: string
    /** Codepage mapping name. Default: 'epson'. */
    codepageMapping?: string
    /** Image dithering mode. Default: 'column'. */
    imageMode?: 'column' | 'raster'
    /** Extra blank lines before cut. Default: 0. */
    feedBeforeCut?: number
    /** Line ending bytes. Default: '\n\r'. */
    newline?: string
    /** Error handling: 'strict' throws, 'relaxed' warns. Default: 'relaxed'. */
    errors?: 'strict' | 'relaxed'
  }

  /**
   * ESC/POS receipt encoder.
   *
   * Chains methods fluently, then call .encode() to get Uint8Array.
   *
   * Usage:
   *   const data = new ReceiptPrinterEncoder({ columns: 42 })
   *     .initialize()
   *     .align('center')
   *     .bold(true)
   *     .line('HELLO')
   *     .bold(false)
   *     .cut()
   *     .encode()
   */
  export default class ReceiptPrinterEncoder {
    constructor(options?: ReceiptPrinterEncoderOptions)

    initialize(): this
    text(value: string): this
    line(value: string): this
    newline(count?: number): this
    bold(enabled?: boolean): this
    underline(enabled?: boolean): this
    italic(enabled?: boolean): this
    invert(enabled?: boolean): this
    width(value: number): this
    height(value: number): this
    size(width: number, height?: number): this
    font(identifier: string): this
    align(alignment: 'left' | 'center' | 'right'): this
    codepage(name: string): this
    rule(options?: { style?: 'single' | 'double' | 'dashed'; width?: number }): this
    cut(type?: 'full' | 'partial'): this
    raw(data: number[]): this

    /** Return structured command objects (for advanced use). */
    commands(): Array<{ commands: Array<{ type: string; payload: number[] }>; height: number }>

    /** Encode all commands into a single Uint8Array ready for print(). */
    encode(): Uint8Array
  }
}
