export function encodeBase64(data: Uint8Array): string {
  const CHUNK_SIZE = 1024
  const chunks: string[] = []
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.subarray(i, Math.min(i + CHUNK_SIZE, data.length))
    let binary = ''
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j])
    }
    chunks.push(btoa(binary))
  }
  return chunks.join('')
}
