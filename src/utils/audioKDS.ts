const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  if (!audioContext) return
  
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.value = frequency
  oscillator.type = type
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration / 1000)
}

export const playNovoPedidoSound = () => {
  if (!audioContext) return
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  setTimeout(() => playTone(800, 100), 0)
  setTimeout(() => playTone(800, 100), 150)
}

export const playIniciarPreparoSound = () => {
  if (!audioContext) return
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  playTone(600, 80)
}

export const playProntoSound = () => {
  if (!audioContext) return
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  setTimeout(() => playTone(500, 150), 0)
  setTimeout(() => playTone(400, 150), 180)
}
