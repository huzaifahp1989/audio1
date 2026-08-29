export interface TrimSilenceOptions {
  thresholdDb?: number
  analysisWindowSize?: number
  analysisHopSize?: number
  padMs?: number
  trimLeading?: boolean
  trimTrailing?: boolean
}

export interface TrimSilenceResult {
  file: File
  trimmed: boolean
  trimmedLeadingSeconds: number
  trimmedTrailingSeconds: number
}

const BROWSER_SAFE_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
])

const DEFAULT_OPTIONS: Required<TrimSilenceOptions> = {
  thresholdDb: -42,
  analysisWindowSize: 1024,
  analysisHopSize: 512,
  padMs: 15,
  trimLeading: true,
  trimTrailing: false,
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44
  const arrayBuffer = new ArrayBuffer(length)
  const view = new DataView(arrayBuffer)
  const channels: Float32Array[] = []

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + buffer.length * buffer.numberOfChannels * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, buffer.numberOfChannels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true)
  view.setUint16(32, buffer.numberOfChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, buffer.length * buffer.numberOfChannels * 2, true)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

async function decodeAudioFile(file: File): Promise<{ context: AudioContext; buffer: AudioBuffer }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  try {
    const arrayBuffer = await file.arrayBuffer()
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    return { context: audioContext, buffer: decodedBuffer }
  } catch (error) {
    await audioContext.close()
    throw error
  }
}

function trimLeadingSilenceFromBuffer(
  audioContext: AudioContext,
  buffer: AudioBuffer,
  options?: TrimSilenceOptions,
): { buffer: AudioBuffer; trimmed: boolean; trimmedLeadingSeconds: number; trimmedTrailingSeconds: number } {
  const cfg = { ...DEFAULT_OPTIONS, ...options }
  const threshold = dbToLinear(cfg.thresholdDb)
  const length = buffer.length
  const channels: Float32Array[] = []

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    channels.push(buffer.getChannelData(ch))
  }

  let startIndex = 0
  let endIndex = length

  if (cfg.trimLeading) {
    for (let i = 0; i < length; i += cfg.analysisHopSize) {
      const windowEnd = Math.min(i + cfg.analysisWindowSize, length)
      let maxAmp = 0

      for (let s = i; s < windowEnd; s++) {
        for (let ch = 0; ch < channels.length; ch++) {
          const amp = Math.abs(channels[ch][s])
          if (amp > maxAmp) maxAmp = amp
        }
      }

      if (maxAmp >= threshold) {
        startIndex = i
        break
      }
    }
  }

  if (cfg.trimTrailing) {
    for (let i = length - cfg.analysisWindowSize; i >= 0; i -= cfg.analysisHopSize) {
      const windowStart = Math.max(0, i)
      const windowEnd = Math.min(i + cfg.analysisWindowSize, length)
      let maxAmp = 0

      for (let s = windowStart; s < windowEnd; s++) {
        for (let ch = 0; ch < channels.length; ch++) {
          const amp = Math.abs(channels[ch][s])
          if (amp > maxAmp) maxAmp = amp
        }
      }

      if (maxAmp >= threshold) {
        endIndex = windowEnd
        break
      }
    }
  }

  const padSamples = Math.floor((cfg.padMs / 1000) * buffer.sampleRate)
  const trimmedStart = cfg.trimLeading ? Math.max(0, startIndex - padSamples) : 0
  const trimmedEnd = cfg.trimTrailing ? Math.min(length, endIndex + padSamples) : length

  if (trimmedEnd <= trimmedStart) {
    return { buffer, trimmed: false, trimmedLeadingSeconds: 0, trimmedTrailingSeconds: 0 }
  }

  if (trimmedStart <= 0 && trimmedEnd >= length) {
    return { buffer, trimmed: false, trimmedLeadingSeconds: 0, trimmedTrailingSeconds: 0 }
  }

  const newLength = trimmedEnd - trimmedStart
  const trimmedBuffer = audioContext.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    trimmedBuffer.getChannelData(ch).set(buffer.getChannelData(ch).subarray(trimmedStart, trimmedEnd))
  }

  return {
    buffer: trimmedBuffer,
    trimmed: true,
    trimmedLeadingSeconds: trimmedStart / buffer.sampleRate,
    trimmedTrailingSeconds: (length - trimmedEnd) / buffer.sampleRate,
  }
}

export async function trimSilenceFromFile(
  file: File,
  options?: TrimSilenceOptions,
): Promise<TrimSilenceResult> {
  const { context: audioContext, buffer: decodedBuffer } = await decodeAudioFile(file)

  try {
    const { buffer, trimmed, trimmedLeadingSeconds, trimmedTrailingSeconds } = trimLeadingSilenceFromBuffer(audioContext, decodedBuffer, options)

    if (!trimmed) {
      return { file, trimmed: false, trimmedLeadingSeconds: 0, trimmedTrailingSeconds: 0 }
    }

    const wavBlob = audioBufferToWavBlob(buffer)
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    const trimmedFile = new File([wavBlob], `${baseName}-trimmed.wav`, { type: 'audio/wav' })

    return { file: trimmedFile, trimmed: true, trimmedLeadingSeconds, trimmedTrailingSeconds }
  } finally {
    await audioContext.close()
  }
}

export async function trimLeadingSilenceFromFile(
  file: File,
  options?: Omit<TrimSilenceOptions, 'trimLeading' | 'trimTrailing'>,
): Promise<TrimSilenceResult> {
  return trimSilenceFromFile(file, { ...options, trimLeading: true, trimTrailing: false })
}

export function shouldNormalizeAudioForPlayback(file: File): boolean {
  if (BROWSER_SAFE_AUDIO_TYPES.has(file.type)) return false
  return !/\.(mp3|wav|ogg|webm)$/i.test(file.name)
}

export async function normalizeAudioFileForPlayback(file: File): Promise<File> {
  if (!shouldNormalizeAudioForPlayback(file)) return file

  const { context: audioContext, buffer } = await decodeAudioFile(file)
  try {
    const wavBlob = audioBufferToWavBlob(buffer)
    const baseName = file.name.replace(/\.[^/.]+$/, '')
    return new File([wavBlob], `${baseName}.wav`, { type: 'audio/wav' })
  } finally {
    await audioContext.close()
  }
}
