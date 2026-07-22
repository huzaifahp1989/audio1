/** Shared offline audio-effect processors for Record + Kids Studio. */

export type AudioEffectType =
  | 'none'
  | 'echo'
  | 'bigEcho'
  | 'reverb'
  | 'robot'
  | 'chipmunk'
  | 'giant'
  | 'magic'
  | 'underwater'
  | 'radio'
  | 'chorus'
  | 'distortion'
  | 'telephone'
  | 'pitchUp'
  | 'pitchDown'
  | 'whisper'

export interface EffectMeta {
  id: AudioEffectType
  label: string
  emoji: string
  description: string
  /** Highlight in Kids Studio */
  kids?: boolean
}

export const EFFECTS: EffectMeta[] = [
  { id: 'none', label: 'Normal', emoji: '🎵', description: 'No effect', kids: true },
  { id: 'echo', label: 'Echo', emoji: '🔊', description: 'Classic bounce-back echo', kids: true },
  { id: 'bigEcho', label: 'Canyon', emoji: '🏔️', description: 'Big mountain echo', kids: true },
  { id: 'reverb', label: 'Cave', emoji: '🦇', description: 'Spacious cave reverb', kids: true },
  { id: 'robot', label: 'Robot', emoji: '🤖', description: 'Beep-boop robot voice', kids: true },
  { id: 'chipmunk', label: 'Chipmunk', emoji: '🐿️', description: 'High squeaky voice', kids: true },
  { id: 'giant', label: 'Giant', emoji: '👹', description: 'Deep rumbling voice', kids: true },
  { id: 'magic', label: 'Magic', emoji: '✨', description: 'Sparkly fairy shimmer', kids: true },
  { id: 'underwater', label: 'Underwater', emoji: '🐠', description: 'Bubbly ocean sound', kids: true },
  { id: 'radio', label: 'Space Radio', emoji: '📻', description: 'Old radio from space', kids: true },
  { id: 'chorus', label: 'Choir', emoji: '🎤', description: 'Many voices together', kids: true },
  { id: 'whisper', label: 'Whisper', emoji: '🤫', description: 'Soft quiet whisper', kids: true },
  { id: 'telephone', label: 'Telephone', emoji: '📞', description: 'Phone call sound' },
  { id: 'distortion', label: 'Distortion', emoji: '⚡', description: 'Crunchy electric sound' },
  { id: 'pitchUp', label: 'Pitch Up', emoji: '⬆️', description: 'Raise the pitch' },
  { id: 'pitchDown', label: 'Pitch Down', emoji: '⬇️', description: 'Lower the pitch' },
]

export const KIDS_EFFECTS = EFFECTS.filter((e) => e.kids)

function makeImpulseResponse(
  ctx: OfflineAudioContext | AudioContext,
  durationSec: number,
  decay: number
): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * durationSec)
  const ir = ctx.createBuffer(2, Math.max(1, len), ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return ir
}

function extraTailSeconds(effect: AudioEffectType): number {
  switch (effect) {
    case 'echo':
      return 2.5
    case 'bigEcho':
      return 4
    case 'reverb':
    case 'magic':
    case 'chorus':
      return 3
    default:
      return 0.2
  }
}

/**
 * Apply an offline effect to an AudioBuffer. Returns a new buffer.
 */
export async function applyEffectToBuffer(
  buffer: AudioBuffer,
  effect: AudioEffectType,
  intensity: number
): Promise<AudioBuffer> {
  if (effect === 'none') return buffer

  const sr = buffer.sampleRate
  const channels = buffer.numberOfChannels
  const i = Math.max(0.05, Math.min(1, intensity))
  const extra = extraTailSeconds(effect)
  const offCtx = new OfflineAudioContext(channels, buffer.length + Math.floor(extra * sr), sr)

  const makeSrc = (rate = 1) => {
    const s = offCtx.createBufferSource()
    s.buffer = buffer
    s.playbackRate.value = rate
    return s
  }

  if (effect === 'echo') {
    const delayTime = 0.18 + i * 0.28
    const feedback = 0.35 + i * 0.35
    const wetGain = 0.45 + i * 0.45

    const dry = offCtx.createGain()
    dry.gain.value = 1
    const wet = offCtx.createGain()
    wet.gain.value = wetGain
    const delay = offCtx.createDelay(2)
    delay.delayTime.value = delayTime
    const fb = offCtx.createGain()
    fb.gain.value = feedback

    const src = makeSrc()
    src.connect(dry)
    dry.connect(offCtx.destination)
    src.connect(delay)
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(wet)
    wet.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'bigEcho') {
    const delays = [0.35 + i * 0.15, 0.7 + i * 0.25, 1.15 + i * 0.35, 1.7 + i * 0.4]
    const dry = offCtx.createGain()
    dry.gain.value = 0.95
    const srcDry = makeSrc()
    srcDry.connect(dry)
    dry.connect(offCtx.destination)
    srcDry.start(0)

    delays.forEach((d, idx) => {
      const g = offCtx.createGain()
      g.gain.value = Math.pow(0.62, idx + 1) * (0.7 + i * 0.3)
      const s = makeSrc()
      s.connect(g)
      g.connect(offCtx.destination)
      s.start(d)
    })
  } else if (effect === 'reverb') {
    const conv = offCtx.createConvolver()
    conv.buffer = makeImpulseResponse(offCtx, 1 + i * 2.5, 1.4 + (1 - i) * 2.5)
    const wet = offCtx.createGain()
    wet.gain.value = 0.55 + i * 0.4
    const dry = offCtx.createGain()
    dry.gain.value = 1 - i * 0.35
    const src = makeSrc()
    src.connect(conv)
    conv.connect(wet)
    wet.connect(offCtx.destination)
    src.connect(dry)
    dry.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'robot') {
    // Ring-mod style robot: carrier oscillator * dry signal via GainNode modulation isn't
    // available offline easily — approximate with bandpass stack + delay slap + slight pitch.
    const bp1 = offCtx.createBiquadFilter()
    bp1.type = 'bandpass'
    bp1.frequency.value = 900 + i * 400
    bp1.Q.value = 4 + i * 6
    const bp2 = offCtx.createBiquadFilter()
    bp2.type = 'peaking'
    bp2.frequency.value = 1800
    bp2.Q.value = 8
    bp2.gain.value = 8 + i * 10
    const delay = offCtx.createDelay(0.05)
    delay.delayTime.value = 0.012 + i * 0.02
    const wet = offCtx.createGain()
    wet.gain.value = 0.7
    const dry = offCtx.createGain()
    dry.gain.value = 0.35
    const src = makeSrc(0.95 + i * 0.05)
    src.connect(bp1)
    bp1.connect(bp2)
    bp2.connect(delay)
    delay.connect(wet)
    wet.connect(offCtx.destination)
    src.connect(dry)
    dry.connect(offCtx.destination)
    // Extra metallic tap
    const tap = makeSrc(1.02)
    const tg = offCtx.createGain()
    tg.gain.value = 0.25 * i
    tap.connect(tg)
    tg.connect(offCtx.destination)
    src.start(0)
    tap.start(0.018)
  } else if (effect === 'chipmunk' || effect === 'pitchUp') {
    const rate = effect === 'chipmunk' ? 1.35 + i * 0.55 : 1 + i * 0.5
    const src = makeSrc(rate)
    src.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'giant' || effect === 'pitchDown') {
    const rate = effect === 'giant' ? Math.max(0.45, 0.72 - i * 0.22) : Math.max(0.5, 1 - i * 0.4)
    const src = makeSrc(rate)
    // Add rumble with low shelf
    const ls = offCtx.createBiquadFilter()
    ls.type = 'lowshelf'
    ls.frequency.value = 180
    ls.gain.value = 6 + i * 8
    src.connect(ls)
    ls.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'magic') {
    const dry = offCtx.createGain()
    dry.gain.value = 0.85
    const src = makeSrc(1.05 + i * 0.08)
    src.connect(dry)
    dry.connect(offCtx.destination)

    const hs = offCtx.createBiquadFilter()
    hs.type = 'highshelf'
    hs.frequency.value = 3500
    hs.gain.value = 8 + i * 10
    const delay = offCtx.createDelay(0.4)
    delay.delayTime.value = 0.08 + i * 0.12
    const wet = offCtx.createGain()
    wet.gain.value = 0.35 + i * 0.35
    const sparkle = makeSrc(1.12 + i * 0.15)
    sparkle.connect(hs)
    hs.connect(delay)
    delay.connect(wet)
    wet.connect(offCtx.destination)
    src.start(0)
    sparkle.start(0.04)
  } else if (effect === 'underwater') {
    const lp = offCtx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 600 + (1 - i) * 900
    lp.Q.value = 1
    const delay = offCtx.createDelay(0.2)
    delay.delayTime.value = 0.05 + i * 0.08
    const wet = offCtx.createGain()
    wet.gain.value = 0.5
    const src = makeSrc(0.92)
    src.connect(lp)
    lp.connect(offCtx.destination)
    lp.connect(delay)
    delay.connect(wet)
    wet.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'radio' || effect === 'telephone') {
    const hp = offCtx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = effect === 'radio' ? 400 + i * 200 : 300 + (1 - i) * 500
    const lp = offCtx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = effect === 'radio' ? 2800 - i * 400 : 3400 - (1 - i) * 1000
    const peaking = offCtx.createBiquadFilter()
    peaking.type = 'peaking'
    peaking.frequency.value = 1200
    peaking.Q.value = 2
    peaking.gain.value = effect === 'radio' ? 6 + i * 6 : 2
    const src = makeSrc()
    src.connect(hp)
    hp.connect(lp)
    lp.connect(peaking)
    peaking.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'chorus') {
    const dry = offCtx.createGain()
    dry.gain.value = 0.7
    const src = makeSrc()
    src.connect(dry)
    dry.connect(offCtx.destination)
    src.start(0)

    const voices = [
      { rate: 0.98 - i * 0.02, delay: 0.02, gain: 0.35 },
      { rate: 1.02 + i * 0.03, delay: 0.035, gain: 0.35 },
      { rate: 1.0, delay: 0.05 + i * 0.03, gain: 0.25 },
    ]
    for (const v of voices) {
      const s = makeSrc(v.rate)
      const g = offCtx.createGain()
      g.gain.value = v.gain
      s.connect(g)
      g.connect(offCtx.destination)
      s.start(v.delay)
    }
  } else if (effect === 'whisper') {
    const hp = offCtx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 800 + i * 600
    const g = offCtx.createGain()
    g.gain.value = 0.55 + (1 - i) * 0.25
    const src = makeSrc(1.02)
    src.connect(hp)
    hp.connect(g)
    g.connect(offCtx.destination)
    src.start(0)
  } else if (effect === 'distortion') {
    const ws = offCtx.createWaveShaper()
    const curve = new Float32Array(512)
    const k = 50 + i * 350
    for (let n = 0; n < 512; n++) {
      const x = (n * 2) / 512 - 1
      curve[n] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
    }
    ws.curve = curve
    ws.oversample = '4x'
    const src = makeSrc()
    src.connect(ws)
    ws.connect(offCtx.destination)
    src.start(0)
  } else {
    const src = makeSrc()
    src.connect(offCtx.destination)
    src.start(0)
  }

  return offCtx.startRendering()
}

/** Encode an AudioBuffer as a WAV Blob. */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const len = buffer.length * buffer.numberOfChannels * 2 + 44
  const ab = new ArrayBuffer(len)
  const view = new DataView(ab)
  const channels: Float32Array[] = []
  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i))
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + buffer.length * buffer.numberOfChannels * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, buffer.numberOfChannels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true)
  view.setUint16(32, buffer.numberOfChannels * 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, buffer.length * buffer.numberOfChannels * 2, true)
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]))
      view.setInt16(offset, s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

/**
 * Build a live Web Audio effect chain for headphones monitoring while recording.
 * Returns the input node to connect the mic source into, and cleanup helper.
 */
export function createLiveEffectChain(
  ctx: AudioContext,
  effect: AudioEffectType,
  intensity: number,
  destination: AudioNode
): { input: AudioNode; dispose: () => void } {
  const nodes: AudioNode[] = []
  const i = Math.max(0.05, Math.min(1, intensity))
  const input = ctx.createGain()
  nodes.push(input)

  const connectOut = (node: AudioNode) => {
    node.connect(destination)
  }

  if (effect === 'none') {
    connectOut(input)
  } else if (effect === 'echo' || effect === 'bigEcho') {
    const dry = ctx.createGain()
    dry.gain.value = 0.9
    const wet = ctx.createGain()
    wet.gain.value = effect === 'bigEcho' ? 0.55 + i * 0.35 : 0.4 + i * 0.45
    const delay = ctx.createDelay(2)
    delay.delayTime.value = effect === 'bigEcho' ? 0.4 + i * 0.35 : 0.18 + i * 0.28
    const fb = ctx.createGain()
    fb.gain.value = effect === 'bigEcho' ? 0.45 + i * 0.3 : 0.35 + i * 0.35
    input.connect(dry)
    dry.connect(destination)
    input.connect(delay)
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(wet)
    wet.connect(destination)
    nodes.push(dry, wet, delay, fb)
  } else if (effect === 'reverb' || effect === 'magic') {
    const conv = ctx.createConvolver()
    conv.buffer = makeImpulseResponse(ctx, 1.2 + i * 1.5, 2)
    const wet = ctx.createGain()
    wet.gain.value = 0.5 + i * 0.4
    const dry = ctx.createGain()
    dry.gain.value = 0.75
    input.connect(dry)
    dry.connect(destination)
    input.connect(conv)
    conv.connect(wet)
    wet.connect(destination)
    nodes.push(conv, wet, dry)
  } else if (effect === 'robot') {
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1000
    bp.Q.value = 6
    input.connect(bp)
    bp.connect(destination)
    nodes.push(bp)
  } else if (effect === 'underwater') {
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    input.connect(lp)
    lp.connect(destination)
    nodes.push(lp)
  } else if (effect === 'radio' || effect === 'telephone' || effect === 'whisper') {
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = effect === 'whisper' ? 1000 : 400
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = effect === 'whisper' ? 5000 : 2800
    input.connect(hp)
    hp.connect(lp)
    lp.connect(destination)
    nodes.push(hp, lp)
  } else if (effect === 'giant') {
    const ls = ctx.createBiquadFilter()
    ls.type = 'lowshelf'
    ls.frequency.value = 180
    ls.gain.value = 10
    input.connect(ls)
    ls.connect(destination)
    nodes.push(ls)
  } else if (effect === 'distortion') {
    const ws = ctx.createWaveShaper()
    const curve = new Float32Array(256)
    const k = 100 + i * 200
    for (let n = 0; n < 256; n++) {
      const x = (n * 2) / 256 - 1
      curve[n] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
    }
    ws.curve = curve
    input.connect(ws)
    ws.connect(destination)
    nodes.push(ws)
  } else {
    // chipmunk/chorus/pitch — live pitch needs AudioWorklet; pass through for monitor
    connectOut(input)
  }

  return {
    input,
    dispose: () => {
      for (const n of nodes) {
        try {
          n.disconnect()
        } catch {
          /* ignore */
        }
      }
    },
  }
}
