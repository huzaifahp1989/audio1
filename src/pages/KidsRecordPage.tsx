import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Headphones,
  Volume2,
} from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { KIDS_CATEGORIES } from '../constants/categories'
import type { AudioCategory } from '../types'
import {
  KIDS_EFFECTS,
  applyEffectToBuffer,
  audioBufferToWav,
  createLiveEffectChain,
  type AudioEffectType,
} from '../lib/audioEffects'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

type StudioPhase = 'ready' | 'recording' | 'review'

export default function KidsRecordPage() {
  const navigate = useNavigate()
  const { uploadTrack, uploadError: hookError } = useAudioLibrary()

  const [phase, setPhase] = useState<StudioPhase>('ready')
  const [recordTime, setRecordTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [activeEffect, setActiveEffect] = useState<AudioEffectType>('echo')
  const [intensity, setIntensity] = useState(0.55)
  const [liveMonitor, setLiveMonitor] = useState(true)
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [history, setHistory] = useState<AudioBuffer[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [applying, setApplying] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Upload
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<AudioCategory>('kids-stories')
  const [speaker, setSpeaker] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploaded, setUploaded] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const liveChainRef = useRef<{ dispose: () => void } | null>(null)
  const animRef = useRef<number | null>(null)
  const playSrcRef = useRef<AudioBufferSourceNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const effectRef = useRef(activeEffect)
  const intensityRef = useRef(intensity)
  const monitorRef = useRef(liveMonitor)

  useEffect(() => {
    effectRef.current = activeEffect
  }, [activeEffect])
  useEffect(() => {
    intensityRef.current = intensity
  }, [intensity])
  useEffect(() => {
    monitorRef.current = liveMonitor
  }, [liveMonitor])

  useEffect(() => {
    return () => {
      stopEverything()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ensureCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioCtxRef.current
  }

  const stopEverything = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animRef.current) cancelAnimationFrame(animRef.current)
    liveChainRef.current?.dispose()
    liveChainRef.current = null
    playSrcRef.current?.stop()
    playSrcRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
  }

  const startRecording = async () => {
    setUploadError('')
    try {
      const ctx = ensureCtx()
      if (ctx.state === 'suspended') await ctx.resume()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      streamRef.current = stream

      const micSource = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.75

      // Destination for MediaRecorder (dry mic, always clean capture)
      const recordDest = ctx.createMediaStreamDestination()
      micSource.connect(recordDest)
      micSource.connect(analyser)

      // Live headphones monitor with selected effect
      liveChainRef.current?.dispose()
      if (monitorRef.current) {
        const chain = createLiveEffectChain(
          ctx,
          effectRef.current,
          intensityRef.current,
          ctx.destination
        )
        micSource.connect(chain.input)
        liveChainRef.current = chain
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const draw = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        setAudioLevel(sum / dataArray.length)

        const canvas = canvasRef.current
        if (canvas) {
          const g = canvas.getContext('2d')
          if (g) {
            const { width, height } = canvas
            g.clearRect(0, 0, width, height)
            const barW = (width / dataArray.length) * 2.2
            let x = 0
            for (let i = 0; i < dataArray.length; i++) {
              const h = (dataArray[i] / 255) * height
              const grad = g.createLinearGradient(0, height, 0, height - h)
              grad.addColorStop(0, '#f59e0b')
              grad.addColorStop(1, '#f97316')
              g.fillStyle = grad
              g.fillRect(x, height - h, barW, h)
              x += barW + 1
            }
          }
        }
        animRef.current = requestAnimationFrame(draw)
      }
      draw()

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      let mime = 'audio/webm'
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          mime = m
          break
        }
      }

      const mr = new MediaRecorder(recordDest.stream, {
        mimeType: mime,
        audioBitsPerSecond: 192000,
      })
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        if (animRef.current) cancelAnimationFrame(animRef.current)
        liveChainRef.current?.dispose()
        liveChainRef.current = null
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setAudioLevel(0)

        const blob = new Blob(chunksRef.current, { type: mime })
        const ab = await blob.arrayBuffer()
        const decoded = await ensureCtx().decodeAudioData(ab.slice(0))
        setBuffer(decoded)
        setHistory([decoded])
        setHistoryIndex(0)
        setPhase('review')
      }

      mr.start(100)
      setPhase('recording')
      setIsPaused(false)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000)
    } catch (err) {
      console.error(err)
      setUploadError('Microphone access denied. Please allow the mic and try again.')
    }
  }

  const togglePause = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (isPaused) {
      mr.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000)
    } else {
      mr.pause()
      setIsPaused(true)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setIsPaused(false)
  }

  const reset = () => {
    stopEverything()
    setPhase('ready')
    setBuffer(null)
    setHistory([])
    setHistoryIndex(-1)
    setRecordTime(0)
    setIsPlaying(false)
    setShowUpload(false)
    setUploaded(false)
    setUploadError('')
    setTitle('')
  }

  const stopPlayback = () => {
    try {
      playSrcRef.current?.stop()
    } catch {
      /* ignore */
    }
    playSrcRef.current = null
    setIsPlaying(false)
  }

  const playBuffer = async (buf: AudioBuffer) => {
    stopPlayback()
    const ctx = ensureCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.onended = () => {
      setIsPlaying(false)
      playSrcRef.current = null
    }
    playSrcRef.current = src
    src.start(0)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (isPlaying) stopPlayback()
    else if (buffer) playBuffer(buffer)
  }

  const handleApplyEffect = async () => {
    if (!buffer || activeEffect === 'none') return
    setApplying(true)
    stopPlayback()
    try {
      const next = await applyEffectToBuffer(buffer, activeEffect, intensity)
      const nh = history.slice(0, historyIndex + 1)
      nh.push(next)
      setHistory(nh)
      setHistoryIndex(nh.length - 1)
      setBuffer(next)
      await playBuffer(next)
    } catch (e) {
      console.error(e)
      setUploadError('Could not apply that effect. Try another one!')
    } finally {
      setApplying(false)
    }
  }

  const undo = () => {
    if (historyIndex <= 0) return
    stopPlayback()
    const i = historyIndex - 1
    setHistoryIndex(i)
    setBuffer(history[i])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!buffer || !title.trim() || !speaker.trim()) return
    setUploading(true)
    setUploadError('')
    try {
      const wav = audioBufferToWav(buffer)
      const safe = title.trim().replace(/[^a-z0-9]+/gi, '_').slice(0, 30)
      const file = new File([wav], `${safe}_${Date.now()}.wav`, { type: 'audio/wav' })
      const ok = await uploadTrack(file, {
        title: title.trim(),
        category,
        reciter: speaker.trim(),
      })
      if (ok) {
        setUploaded(true)
        setShowUpload(false)
      } else {
        setUploadError(hookError || 'Upload failed. Please try again.')
      }
    } catch (err: any) {
      setUploadError(err?.message || hookError || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const effectMeta = KIDS_EFFECTS.find((f) => f.id === activeEffect)
  const levelPct = Math.min(100, Math.round((audioLevel / 80) * 100))

  if (uploaded) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Awesome recording!</h1>
        <p className="text-slate-500 mb-8">
          “{title}” is saved in Kids Audio.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            Record another
          </button>
          <button
            onClick={() => navigate(`/kids?tab=${category}`)}
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            Back to Kids
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          to="/kids"
          className="mt-1 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300"
          aria-label="Back to Kids"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md text-2xl">
              🎙️
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Kids Studio</h1>
              <p className="text-slate-500 text-sm">Record your voice · add echo & fun effects</p>
            </div>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {uploadError}
        </div>
      )}

      {/* Effect picker — always visible so kids can choose before/after record */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-amber-500" />
          <h2 className="font-bold text-slate-800">Fun Voice Effects</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {KIDS_EFFECTS.map((fx) => (
            <button
              key={fx.id}
              type="button"
              onClick={() => setActiveEffect(fx.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-center transition-all ${
                activeEffect === fx.id
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-500 text-white shadow-lg scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="text-xl leading-none">{fx.emoji}</span>
              <span className="text-xs font-semibold leading-tight">{fx.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{effectMeta?.description}</p>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Strength</span>
          <input
            type="range"
            min="0.15"
            max="1"
            step="0.05"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="flex-1 accent-amber-500"
          />
          <span className="text-xs text-slate-600 w-10 text-right">{Math.round(intensity * 100)}%</span>
        </div>

        {phase !== 'review' && (
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={liveMonitor}
              onChange={(e) => setLiveMonitor(e.target.checked)}
              className="rounded border-slate-300 accent-amber-500"
            />
            <Headphones size={14} className="text-amber-500" />
            Hear effect live while recording (use headphones)
          </label>
        )}
      </section>

      {/* Record / Review stage */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 sm:p-6 mb-6">
        {phase !== 'review' ? (
          <>
            <canvas
              ref={canvasRef}
              width={640}
              height={100}
              className="w-full h-24 rounded-2xl bg-slate-50 mb-4"
            />

            <div className="flex items-center justify-center gap-2 mb-2">
              <Volume2 size={14} className="text-slate-400" />
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden max-w-xs">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-75"
                  style={{ width: `${phase === 'recording' ? levelPct : 0}%` }}
                />
              </div>
            </div>

            <div className="text-center font-mono text-4xl sm:text-5xl font-bold text-slate-800 mb-6">
              {formatTime(recordTime)}
            </div>

            <div className="flex items-center justify-center gap-4">
              {phase === 'ready' && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-orange-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  aria-label="Start recording"
                >
                  <Mic size={40} />
                </button>
              )}

              {phase === 'recording' && (
                <>
                  <button
                    type="button"
                    onClick={togglePause}
                    className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50"
                    aria-label={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? <Play size={24} className="ml-0.5" /> : <Pause size={24} />}
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-rose-500 text-white shadow-xl shadow-rose-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform animate-pulse"
                    aria-label="Stop recording"
                  >
                    <Square size={32} fill="currentColor" />
                  </button>
                </>
              )}
            </div>

            <p className="text-center text-sm text-slate-500 mt-5">
              {phase === 'ready' && 'Tap the mic, then try Echo, Robot, or Chipmunk!'}
              {phase === 'recording' &&
                (isPaused
                  ? 'Paused — tap play to continue'
                  : liveMonitor
                    ? `Listening with ${effectMeta?.label}… tap stop when done`
                    : 'Recording… tap stop when done')}
            </p>
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-sm font-semibold text-amber-600 mb-1">Your recording</p>
              <p className="font-mono text-3xl font-bold text-slate-800">
                {formatTime(buffer?.duration || 0)}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 mb-5">
              <button
                type="button"
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg flex items-center justify-center"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleApplyEffect}
              disabled={applying || activeEffect === 'none'}
              className="w-full mb-3 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md"
            >
              {applying
                ? 'Sprinkling magic…'
                : activeEffect === 'none'
                  ? 'Pick an effect above'
                  : `Apply ${effectMeta?.emoji} ${effectMeta?.label}`}
            </button>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-medium disabled:opacity-40"
              >
                <RotateCcw size={15} /> Undo
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
              >
                Record again
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md"
            >
              <Upload size={18} /> Save to Kids Audio
            </button>
          </>
        )}
      </section>

      {/* Quick tips */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 text-sm text-amber-900/80 space-y-1">
        <p className="font-semibold text-amber-800 mb-1">Tips for the best sound</p>
        <p>• Use headphones if “hear effect live” is on (avoids speaker feedback)</p>
        <p>• Echo & Canyon sound great for story time</p>
        <p>• You can stack effects — apply one, then another</p>
        <p>• Tap Undo if you don’t like a change</p>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Save your recording</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My funny story"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                  Your name
                </label>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="Amina"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                  Category
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {KIDS_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                        category === c.id
                          ? `bg-gradient-to-r ${c.color} text-white border-transparent shadow`
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{c.emoji}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {(uploadError || hookError) && (
                <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  {uploadError || hookError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !title.trim() || !speaker.trim()}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white py-3 rounded-xl font-semibold text-sm"
                >
                  {uploading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
