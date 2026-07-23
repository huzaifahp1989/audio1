import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mic, Square, Play, Pause, RotateCcw, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { KIDS_CATEGORIES } from '../constants/categories'
import type { AudioCategory } from '../types'
import { audioBufferToWav } from '../lib/audioEffects'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

type Phase = 'form' | 'ready' | 'recording' | 'review' | 'done'

export default function KidsRecordPage() {
  const navigate = useNavigate()
  const { uploadTrack, uploadError: hookError } = useAudioLibrary()

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [category, setCategory] = useState<AudioCategory>('kids-stories')
  const [phase, setPhase] = useState<Phase>('form')
  const [recordTime, setRecordTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animRef = useRef<number | null>(null)
  const playSrcRef = useRef<AudioBufferSourceNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    return () => stopEverything()
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
    try { playSrcRef.current?.stop() } catch { /* ignore */ }
    playSrcRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* ignore */ }
    }
    setIsPlaying(false)
    setAudioLevel(0)
  }

  const drawMeter = () => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const data = new Uint8Array(analyser.frequencyBinCount)
    const loop = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      setAudioLevel(Math.min(100, Math.round(rms * 220)))

      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.beginPath()
      const slice = canvas.width / data.length
      for (let i = 0; i < data.length; i++) {
        const x = i * slice
        const y = ((data[i] / 255) * canvas.height)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
  }

  const startRecording = async () => {
    setUploadError('')
    try {
      const ctx = ensureCtx()
      if (ctx.state === 'suspended') await ctx.resume()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser
      drawMeter()

      chunksRef.current = []
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        if (animRef.current) cancelAnimationFrame(animRef.current)
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const arrayBuf = await blob.arrayBuffer()
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0))
        setBuffer(decoded)
        setPhase('review')
        setIsPaused(false)
      }

      recorder.start(200)
      setPhase('recording')
      setRecordTime(0)
      setIsPaused(false)
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000)
    } catch (err: any) {
      console.error(err)
      setUploadError(err?.message || 'Could not access the microphone. Please allow mic permission.')
    }
  }

  const togglePause = () => {
    const rec = mediaRecorderRef.current
    if (!rec || phase !== 'recording') return
    if (rec.state === 'recording') {
      rec.pause()
      setIsPaused(true)
      if (timerRef.current) clearInterval(timerRef.current)
    } else if (rec.state === 'paused') {
      rec.resume()
      setIsPaused(false)
      timerRef.current = setInterval(() => setRecordTime((t) => t + 1), 1000)
    }
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  const stopPlayback = () => {
    try { playSrcRef.current?.stop() } catch { /* ignore */ }
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
    src.start()
    setIsPlaying(true)
  }

  const resetRecording = () => {
    stopEverything()
    setBuffer(null)
    setRecordTime(0)
    setPhase('ready')
    setUploadError('')
  }

  const handleStartForm = (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError('')
    const ageNum = parseInt(age, 10)
    if (!name.trim()) {
      setUploadError('Please enter your name.')
      return
    }
    if (!age.trim() || Number.isNaN(ageNum) || ageNum < 3 || ageNum > 16) {
      setUploadError('Please enter an age between 3 and 16.')
      return
    }
    setPhase('ready')
  }

  const handleSave = async () => {
    if (!buffer) return
    setUploading(true)
    setUploadError('')
    try {
      const wav = audioBufferToWav(buffer)
      const safe = name.trim().replace(/[^a-z0-9]+/gi, '_').slice(0, 24)
      const file = new File([wav], `${safe}_${Date.now()}.wav`, { type: 'audio/wav' })
      const ageNum = parseInt(age, 10)
      const ok = await uploadTrack(file, {
        title: `${name.trim()}'s recording`,
        category,
        reciter: name.trim(),
        topic: `Age ${ageNum}`,
        source: 'kids-studio',
      })
      if (ok) {
        stopEverything()
        setPhase('done')
      } else {
        setUploadError(hookError || 'Upload failed. Please try again.')
      }
    } catch (err: any) {
      setUploadError(err?.message || hookError || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const levelPct = Math.min(100, audioLevel)

  if (phase === 'done') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Saved!</h1>
        <p className="text-slate-500 mb-8">
          “{name.trim()}’s recording” is now in Kids Audio.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => {
              setName('')
              setAge('')
              setBuffer(null)
              setRecordTime(0)
              setPhase('form')
              setUploadError('')
            }}
            className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            Record another
          </button>
          <button
            type="button"
            onClick={() => navigate('/kids-recordings?tab=recorded')}
            className="px-5 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            View recordings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24">
      <div className="flex items-start gap-3 mb-6">
        <Link
          to="/kids-recordings"
          className="mt-1 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-amber-600 hover:border-amber-300"
          aria-label="Back to Kids"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kids Record</h1>
          <p className="text-slate-500 text-sm">Simple recording · name & age</p>
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {uploadError}
        </div>
      )}

      {phase === 'form' && (
        <form onSubmit={handleStartForm} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 sm:p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Your name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amina"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-400"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Age *</label>
            <input
              type="number"
              inputMode="numeric"
              min={3}
              max={16}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 8"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Category</label>
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
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl"
          >
            Continue to record
          </button>
        </form>
      )}

      {phase !== 'form' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{name}</p>
              <p className="text-xs text-slate-500">Age {age} · {KIDS_CATEGORIES.find((c) => c.id === category)?.label}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopEverything()
                setBuffer(null)
                setPhase('form')
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 border border-slate-200 rounded-lg"
            >
              Edit info
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={640}
            height={100}
            className="w-full h-24 rounded-2xl bg-slate-50 mb-4"
          />

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
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

            {phase === 'review' && buffer && (
              <>
                <button
                  type="button"
                  onClick={resetRecording}
                  className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50"
                  aria-label="Record again"
                >
                  <RotateCcw size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => (isPlaying ? stopPlayback() : playBuffer(buffer))}
                  className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
                  aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={uploading}
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white font-semibold text-sm"
                >
                  {uploading ? 'Saving…' : 'Save'}
                </button>
              </>
            )}
          </div>

          {phase === 'ready' && (
            <p className="text-center text-sm text-slate-500 mt-5">Tap the mic to start recording</p>
          )}
          {phase === 'recording' && (
            <p className="text-center text-sm text-rose-600 mt-5 font-medium">
              {isPaused ? 'Paused' : 'Recording…'}
            </p>
          )}
          {phase === 'review' && (
            <p className="text-center text-sm text-slate-500 mt-5">Play it back, then save — or record again</p>
          )}
        </div>
      )}
    </div>
  )
}
