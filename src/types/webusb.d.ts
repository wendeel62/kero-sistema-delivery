/**
 * WebUSB API type augmentations for browsers that support it.
 * This extends the global Navigator interface so TypeScript
 * recognizes navigator.usb without requiring @types/webusb.
 */
interface USBDeviceFilter {
  vendorId?: number
  productId?: number
  classCode?: number
  subclassCode?: number
  protocolCode?: number
  serialNumber?: string
}

interface USBDevice {
  readonly vendorId: number
  readonly productId: number
  readonly productName: string
  readonly manufacturerName: string
  readonly serialNumber: string | null
  readonly configuration: USBConfiguration
  readonly configurations: USBConfiguration[]
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  releaseInterface(interfaceNumber: number): Promise<void>
  reset(): Promise<void>
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>
}

interface USBConfiguration {
  readonly configurationValue: number
  readonly interfaces: USBInterface[]
}

interface USBInterface {
  readonly interfaceNumber: number
  readonly alternate: USBAlternateInterface
  readonly alternates: USBAlternateInterface[]
}

interface USBAlternateInterface {
  readonly interfaceClass: number
  readonly interfaceSubclass: number
  readonly interfaceProtocol: number
  readonly endpoints: USBEndpoint[]
}

interface USBEndpoint {
  readonly endpointNumber: number
  readonly direction: 'in' | 'out'
  readonly type: 'bulk' | 'interrupt' | 'isochronous'
}

interface USBOutTransferResult {
  readonly status: USBTransferStatus
  readonly bytesWritten: number
}

interface USBInTransferResult {
  readonly status: USBTransferStatus
  readonly data: DataView
}

type USBTransferStatus = 'ok' | 'stall' | 'babble' | 'bus_error'

interface USBPermissionResult {
  readonly devices: USBDevice[]
}

interface USB {
  getDevices(): Promise<USBDevice[]>
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>
}

interface Navigator {
  readonly usb: USB
}

interface EventMap {
  connect: Event
  disconnect: Event
}

interface USBConnectionEvent extends Event {
  readonly device: USBDevice
}

declare function addEventListener(
  type: 'connect' | 'disconnect',
  listener: (ev: USBConnectionEvent) => void,
  options?: boolean | AddEventListenerOptions
): void
