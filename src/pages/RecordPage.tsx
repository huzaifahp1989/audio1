import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Upload, RotateCcw, Scissors, SkipBack, SkipForward, Volume2, Headphones, Crop, Split, Eraser, ZoomIn, ZoomOut, Sparkles, CheckCircle, Save, FolderOpen, Trash2, Clock, ChevronRight, X } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useNavigate } from 'react-router-dom'
import { saveDraft, getAllDrafts, deleteDraft, type RecordingDraft } from '../lib/indexedDb'
import { ALL_CATEGORIES_LIST, QURAN_RECITERS, NASHEED_ARTISTS, TALKS_SPEAKERS, TALKS_TOPICS } from '../constants/categories'
import type { AudioCategory } from '../types'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions'

const RECORDER_USERNAME = 'recorder'
const RECORDER_PASSWORD = 'record123'

type AudioEffectType = 'none' | 'echo' | 'reverb' | 'distortion' | 'pitchUp' | 'pitchDown' | 'telephone'

const EFFECTS: { id: AudioEffectType; label: string; emoji: string }[] = [
  { id: 'none', label: 'None', emoji: '🎵' },
  { id: 'echo', label: 'Echo', emoji: '🔊' },
  { id: 'reverb', label: 'Reverb', emoji: '🏛️' },
  { id: 'distortion', label: 'Distortion', emoji: '⚡' },
  { id: 'pitchUp', label: 'Pitch Up', emoji: '⬆️' },
  { id: 'pitchDown', label: 'Pitch Down', emoji: '⬇️' },
  { id: 'telephone', label: 'Telephone', emoji: '📞' },
]

const CATEGORY_ROUTES: Record<string, string> = {
  quran: '/quran', nasheeds: '/nasheeds', talks: '/talks',
  'kids-stories': '/kids', 'kids-quran': '/kids', 'kids-nasheeds': '/kids',
}

interface AudioEdit { buffer: AudioBuffer; duration: number }

function formatTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

export default function RecordPage() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [activeTab, setActiveTab] = useState<'record' | 'drafts'>('record')

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // Editing
  const [editHistory, setEditHistory] = useState<AudioEdit[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentEdit, setCurrentEdit] = useState<AudioEdit | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [zoom, setZoom] = useState(50)
  const [volume, setVolume] = useState(1)
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null)
  const [hasRegion, setHasRegion] = useState(false)

  // Effects
  const [activeEffect, setActiveEffect] = useState<AudioEffectType>('none')
  const [effectIntensity, setEffectIntensity] = useState(0.5)
  const [applyingEffect, setApplyingEffect] = useState(false)

  // Draft
  const [drafts, setDrafts] = useState<RecordingDraft[]>([])
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [showDraftSave, setShowDraftSave] = useState(false)
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null)

  // Upload
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<AudioCategory>('talks')
  const [reciter, setReciter] = useState('')
  const [customReciter, setCustomReciter] = useState('')
  const [topic, setTopic] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedCategory, setUploadedCategory] = useState<AudioCategory | null>(null)
  const [uploadError, setUploadError] = useState('')

  // Teleprompter
  const [showTeleprompter, setShowTeleprompter] = useState(false)
  const [prompterText, setPrompterText] = useState('')
  const [prompterSpeed, setPrompterSpeed] = useState(50)
  const [isScrolling, setIsScrolling] = useState(false)
  const [prompterFontSize, setPrompterFontSize] = useState(24)
  const prompterRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionsPluginRef = useRef<any>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { uploadTrack, uploadError: hookError } = useAudioLibrary()

  // Live waveform data
  const [audioLevel, setAudioLevel] = useState(0)
  const [isAudioDetected, setIsAudioDetected] = useState(false)

  const loadDraftList = async () => { setDrafts(await getAllDrafts()) }
  useEffect(() => { if (authenticated) loadDraftList() }, [authenticated])

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === RECORDER_USERNAME && password === RECORDER_PASSWORD) { setAuthenticated(true); setAuthError('') }
    else setAuthError('Invalid username or password')
  }

  const initAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed')
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  const applyEffectToBuffer = async (buffer: AudioBuffer, effect: AudioEffectType, intensity: number): Promise<AudioBuffer> => {
    const sr = buffer.sampleRate
    const extraSeconds = effect === 'echo' ? 3 : effect === 'reverb' ? 3 : 0
    const offCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length + Math.floor(extraSeconds * sr),
      sr
    )

    // Helper: create source
    const makeSrc = (buf: AudioBuffer, offset = 0) => {
      const s = offCtx.createBufferSource()
      s.buffer = buf
      if (effect === 'pitchUp') s.playbackRate.value = 1 + intensity * 0.5
      if (effect === 'pitchDown') s.playbackRate.value = Math.max(0.5, 1 - intensity * 0.4)
      return s
    }

    if (effect === 'echo') {
      // Dry signal
      const dry = offCtx.createGain()
      dry.gain.value = 1
      const srcDry = makeSrc(buffer)
      srcDry.connect(dry)
      dry.connect(offCtx.destination)
      srcDry.start(0)

      // Echo taps — multiple copies at increasing delays with decreasing volume
      const delayTime = 0.2 + intensity * 0.3  // 0.2s – 0.5s
      const decayFactor = 0.55 + intensity * 0.15  // 0.55 – 0.7
      const numTaps = 4
      for (let tap = 1; tap <= numTaps; tap++) {
        const tapGain = offCtx.createGain()
        tapGain.gain.value = Math.pow(decayFactor, tap) * intensity
        const tapSrc = makeSrc(buffer)
        tapSrc.connect(tapGain)
        tapGain.connect(offCtx.destination)
        tapSrc.start(delayTime * tap)
      }

    } else if (effect === 'reverb') {
      const conv = offCtx.createConvolver()
      const irLen = Math.floor(sr * (1 + intensity * 2))
      const ir = offCtx.createBuffer(2, irLen, sr)
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch)
        for (let i = 0; i < irLen; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 1.5 + (1 - intensity) * 3)
        }
      }
      conv.buffer = ir
      const wet = offCtx.createGain(); wet.gain.value = 0.6 + intensity * 0.4
      const dry = offCtx.createGain(); dry.gain.value = 1 - intensity * 0.3
      const src = makeSrc(buffer)
      src.connect(conv); conv.connect(wet); wet.connect(offCtx.destination)
      src.connect(dry); dry.connect(offCtx.destination)
      src.start(0)

    } else if (effect === 'distortion') {
      const ws = offCtx.createWaveShaper()
      const curve = new Float32Array(512)
      const k = 50 + intensity * 350
      for (let i = 0; i < 512; i++) {
        const x = (i * 2) / 512 - 1
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x))
      }
      ws.curve = curve; ws.oversample = '4x'
      const src = makeSrc(buffer)
      src.connect(ws); ws.connect(offCtx.destination); src.start(0)

    } else if (effect === 'pitchUp' || effect === 'pitchDown') {
      const src = makeSrc(buffer)
      src.connect(offCtx.destination); src.start(0)

    } else if (effect === 'telephone') {
      const hp = offCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300 + (1 - intensity) * 500
      const lp = offCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400 - (1 - intensity) * 1000
      const src = makeSrc(buffer)
      src.connect(hp); hp.connect(lp); lp.connect(offCtx.destination); src.start(0)

    } else {
      const src = makeSrc(buffer)
      src.connect(offCtx.destination); src.start(0)
    }

    return offCtx.startRendering()
  }

  const handleApplyEffect = async () => {
    if (!currentEdit || activeEffect === 'none') return
    setApplyingEffect(true)
    try { saveEdit(await applyEffectToBuffer(currentEdit.buffer, activeEffect, effectIntensity)); setActiveEffect('none') }
    catch (e) { console.error(e) }
    finally { setApplyingEffect(false) }
  }

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      initAudioContext()
      
      // High quality audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,        // Disable for better quality
          noiseSuppression: false,        // Disable for better quality  
          autoGainControl: false,         // Disable for consistent levels
          sampleRate: 48000,              // High sample rate
          channelCount: 2,                // Stereo recording
        }
      })
      
      // Set up audio analysis for visualization
      const ctx = audioContextRef.current!
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyserRef.current = analyser
      sourceRef.current = source
      
      // Start visualization loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const draw = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate average level
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const avg = sum / dataArray.length
        setAudioLevel(avg)
        setIsAudioDetected(avg > 10)
        
        // Draw on canvas if available
        const canvas = canvasRef.current
        if (canvas) {
          const ctx2d = canvas.getContext('2d')
          if (ctx2d) {
            const width = canvas.width
            const height = canvas.height
            ctx2d.fillStyle = '#f1f5f9'
            ctx2d.fillRect(0, 0, width, height)
            
            const barWidth = (width / dataArray.length) * 2.5
            let x = 0
            for (let i = 0; i < dataArray.length; i++) {
              const barHeight = (dataArray[i] / 255) * height
              const gradient = ctx2d.createLinearGradient(0, height, 0, height - barHeight)
              gradient.addColorStop(0, '#8b5cf6')
              gradient.addColorStop(1, '#a78bfa')
              ctx2d.fillStyle = gradient
              ctx2d.fillRect(x, height - barHeight, barWidth, barHeight)
              x += barWidth + 1
            }
          }
        }
        
        animationRef.current = requestAnimationFrame(draw)
      }
      draw()
      
      // Use best available MIME type for quality
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ]
      let selectedMimeType = 'audio/webm'
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime
          break
        }
      }
      
      const mr = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 256000,  // High bitrate for quality
      })
      
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      mr.onstop = async () => {
        // Stop visualization
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null }
        setAudioLevel(0)
        setIsAudioDetected(false)
        
        // Create blob with proper MIME type
        const blob = new Blob(audioChunksRef.current, { type: selectedMimeType })
        console.log('[Recording] Created blob:', blob.size, 'bytes, type:', selectedMimeType)
        setAudioBlob(blob)
        await loadAudioForEditing(blob)
      }
      
      mr.start(100)
      setIsRecording(true)
      setIsPaused(false)
      timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000)
      
      console.log('[Recording] Started with:', selectedMimeType, 'bitrate: 256kbps')
      
    } catch (err: any) {
      console.error('[Recording] Error:', err)
      setUploadError('Microphone access denied or not available. Please check permissions.')
    }
  }

  const loadAudioForEditing = async (blob: Blob) => {
    initAudioContext()
    const ctx = audioContextRef.current!
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer())
    const edit: AudioEdit = { buffer: buf, duration: buf.duration }
    setCurrentEdit(edit); setEditHistory([edit]); setHistoryIndex(0); setDuration(buf.duration)
    initWaveform(buf)
  }

  const initWaveform = (buf: AudioBuffer) => {
    if (!waveformContainerRef.current) return
    wavesurferRef.current?.destroy()
    const rp = RegionsPlugin.create(); regionsPluginRef.current = rp
    const ws = WaveSurfer.create({
      container: waveformContainerRef.current, waveColor: '#8b5cf6', progressColor: '#6d28d9',
      cursorColor: '#1e293b', cursorWidth: 2, barWidth: 2, barGap: 1, barRadius: 2, height: 150, normalize: true, plugins: [rp]
    })
    ws.loadBlob(audioBufferToWav(buf)); wavesurferRef.current = ws
    ws.on('ready', () => { setDuration(ws.getDuration()); ws.zoom(zoom) })
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()))
    ws.on('play', () => setIsPlaying(true)); ws.on('pause', () => setIsPlaying(false)); ws.on('finish', () => setIsPlaying(false))
    rp.on('region-created', (r: any) => { setSelectedRegion({ start: r.start, end: r.end }); setHasRegion(true); rp.getRegions().forEach((x: any) => { if (x.id !== r.id) x.remove() }) })
    rp.on('region-updated', (r: any) => setSelectedRegion({ start: r.start, end: r.end }))
    rp.on('region-removed', () => { setSelectedRegion(null); setHasRegion(false) })
  }

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const len = buffer.length * buffer.numberOfChannels * 2 + 44
    const ab = new ArrayBuffer(len); const view = new DataView(ab)
    const channels: Float32Array[] = []; for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i))
    const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)) }
    ws(0, 'RIFF'); view.setUint32(4, 36 + buffer.length * buffer.numberOfChannels * 2, true)
    ws(8, 'WAVE'); ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
    view.setUint16(22, buffer.numberOfChannels, true); view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true)
    view.setUint16(32, buffer.numberOfChannels * 2, true); view.setUint16(34, 16, true)
    ws(36, 'data'); view.setUint32(40, buffer.length * buffer.numberOfChannels * 2, true)
    let offset = 44
    for (let i = 0; i < buffer.length; i++) for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i])); view.setInt16(offset, s * 0x7FFF, true); offset += 2
    }
    return new Blob([ab], { type: 'audio/wav' })
  }

  // ── Edit ops ──────────────────────────────────────────────────────────────
  const saveEdit = (buf: AudioBuffer) => {
    const ne: AudioEdit = { buffer: buf, duration: buf.duration }
    const nh = editHistory.slice(0, historyIndex + 1); nh.push(ne)
    setEditHistory(nh); setHistoryIndex(nh.length - 1); setCurrentEdit(ne); setDuration(buf.duration); initWaveform(buf)
  }
  const createRegion = () => {
    if (!wavesurferRef.current || !regionsPluginRef.current) return
    const t = wavesurferRef.current.getCurrentTime()
    regionsPluginRef.current.clearRegions()
    regionsPluginRef.current.addRegion({ start: t, end: Math.min(t + 5, wavesurferRef.current.getDuration()), color: 'rgba(139,92,246,0.3)', drag: true, resize: true })
  }
  const cutAudioBuffer = async (buf: AudioBuffer, s: number, e: number): Promise<AudioBuffer> => {
    const ctx = audioContextRef.current!; const sr = buf.sampleRate; const s1 = Math.floor(s * sr), s2 = Math.floor(e * sr)
    const nb = ctx.createBuffer(buf.numberOfChannels, buf.length - (s2 - s1), sr)
    for (let ch = 0; ch < buf.numberOfChannels; ch++) { const od = buf.getChannelData(ch), nd = nb.getChannelData(ch); nd.set(od.subarray(0, s1), 0); nd.set(od.subarray(s2), s1) }
    return nb
  }
  const extractAudioBuffer = async (buf: AudioBuffer, s: number, e: number): Promise<AudioBuffer> => {
    const ctx = audioContextRef.current!; const sr = buf.sampleRate; const s1 = Math.floor(s * sr), s2 = Math.floor(e * sr)
    const nb = ctx.createBuffer(buf.numberOfChannels, s2 - s1, sr)
    for (let ch = 0; ch < buf.numberOfChannels; ch++) nb.getChannelData(ch).set(buf.getChannelData(ch).subarray(s1, s2))
    return nb
  }
  const clearRegions = () => { regionsPluginRef.current?.clearRegions(); setSelectedRegion(null); setHasRegion(false) }
  const undo = () => { if (historyIndex <= 0) return; const i = historyIndex - 1; setHistoryIndex(i); setCurrentEdit(editHistory[i]); setDuration(editHistory[i].duration); initWaveform(editHistory[i].buffer); clearRegions() }
  const redo = () => { if (historyIndex >= editHistory.length - 1) return; const i = historyIndex + 1; setHistoryIndex(i); setCurrentEdit(editHistory[i]); setDuration(editHistory[i].duration); initWaveform(editHistory[i].buffer); clearRegions() }
  const togglePauseRecording = () => {
    const r = mediaRecorderRef.current; if (!r) return
    if (isPaused) { r.resume(); setIsPaused(false); timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000) }
    else { r.pause(); setIsPaused(true); if (timerRef.current) clearInterval(timerRef.current) }
  }
  const stopRecording = () => {
    const r = mediaRecorderRef.current
    if (r && r.state !== 'inactive') { r.stop(); r.stream.getTracks().forEach(t => t.stop()) }
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false); setIsPaused(false)
  }
  const resetRecording = () => {
    wavesurferRef.current?.destroy(); setAudioBlob(null); setCurrentEdit(null); setEditHistory([]); setHistoryIndex(-1)
    setRecordTime(0); setSelectedRegion(null); setHasRegion(false); setActiveEffect('none')
    setShowUploadForm(false); setUploadedCategory(null); setUploadError(''); setLoadedDraftId(null)
    audioChunksRef.current = []
  }
  const handleZoom = (d: number) => { const nz = Math.max(10, Math.min(200, zoom + d)); setZoom(nz); wavesurferRef.current?.zoom(nz) }

  // ── Draft save/load ───────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!currentEdit) return
    setSavingDraft(true)
    try {
      const blob = audioBufferToWav(currentEdit.buffer)
      const id = loadedDraftId || crypto.randomUUID()
      const draft: RecordingDraft = {
        id, title: draftTitle || `Draft ${formatDate(Date.now())}`,
        savedAt: Date.now(), duration: currentEdit.duration, blob,
        category, reciter: reciter === 'Other' ? customReciter : reciter, topic,
      }
      await saveDraft(draft)
      await loadDraftList()
      setLoadedDraftId(id)
      setShowDraftSave(false)
    } finally { setSavingDraft(false) }
  }

  const handleLoadDraft = async (draft: RecordingDraft) => {
    resetRecording()
    setDraftTitle(draft.title); setTitle(draft.title)
    if (draft.category) setCategory(draft.category as AudioCategory)
    if (draft.reciter) setReciter(draft.reciter)
    if (draft.topic) setTopic(draft.topic)
    setLoadedDraftId(draft.id)
    setAudioBlob(draft.blob)
    await loadAudioForEditing(draft.blob)
    setActiveTab('record')
  }

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft?')) return
    await deleteDraft(id)
    await loadDraftList()
    if (loadedDraftId === id) setLoadedDraftId(null)
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const getReciters = (cat: AudioCategory) => {
    if (cat === 'quran') return QURAN_RECITERS
    if (cat === 'nasheeds') return NASHEED_ARTISTS
    if (cat === 'talks') return TALKS_SPEAKERS
    return []
  }
  const reciters = getReciters(category)
  const showCustomReciter = reciter === 'Other' || reciters.length === 0

  // ── Teleprompter functions ─────────────────────────────────────────────────
  const startPrompterScroll = () => {
    if (!prompterRef.current || isScrolling) return
    setIsScrolling(true)
    scrollIntervalRef.current = setInterval(() => {
      if (prompterRef.current) {
        prompterRef.current.scrollTop += prompterSpeed / 20
        // Auto-stop at bottom
        if (prompterRef.current.scrollTop >= prompterRef.current.scrollHeight - prompterRef.current.clientHeight - 10) {
          stopPrompterScroll()
        }
      }
    }, 50)
  }

  const stopPrompterScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    setIsScrolling(false)
  }

  const togglePrompterScroll = () => {
    if (isScrolling) stopPrompterScroll()
    else startPrompterScroll()
  }

  // Auto-start/stop prompter with recording
  useEffect(() => {
    if (isRecording && showTeleprompter && prompterText.trim()) {
      startPrompterScroll()
    } else if (!isRecording) {
      stopPrompterScroll()
    }
    return () => stopPrompterScroll()
  }, [isRecording, showTeleprompter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentEdit) {
      setUploadError('No audio to upload. Please record first.')
      return
    }
    
    setUploading(true)
    setUploadError('')
    
    try {
      // Convert edited audio to WAV for consistent upload format
      const wavBlob = audioBufferToWav(currentEdit.buffer)
      console.log('[Upload] WAV blob created:', wavBlob.size, 'bytes')
      
      // Create file with proper name
      const timestamp = Date.now()
      const safeTitle = (title || 'Recording').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
      const fileName = `${safeTitle}_${timestamp}.wav`
      const file = new File([wavBlob], fileName, { type: 'audio/wav' })
      
      const effectiveReciter = reciter === 'Other' ? customReciter : reciter
      
      console.log('[Upload] Uploading:', fileName, 'to category:', category)
      
      const ok = await uploadTrack(file, {
        title: title || `Recording ${new Date().toLocaleString()}`,
        category,
        reciter: effectiveReciter || 'Unknown Speaker',
        topic: category === 'talks' ? topic : undefined,
      })
      
      if (ok) {
        console.log('[Upload] Success!')
        setUploadedCategory(category)
        if (loadedDraftId) {
          await deleteDraft(loadedDraftId)
          await loadDraftList()
        }
        setShowUploadForm(false)
      } else {
        setUploadError(hookError || 'Upload failed. Please try again.')
      }
    } catch (err: any) {
      console.error('[Upload] Error:', err)
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const canUndo = historyIndex > 0, canRedo = historyIndex < editHistory.length - 1

  // ── Auth screen ───────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4"><Mic size={28} className="text-violet-600" /></div>
            <h1 className="text-2xl font-bold text-slate-800">Audio Recorder</h1>
            <p className="text-slate-500 text-sm mt-2">Record, edit and save audio drafts</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" placeholder="Username" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" placeholder="Password" />
            {authError && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{authError}</div>}
            <button type="submit" className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl">Access Recorder</button>
          </form>
          <p className="text-center text-slate-400 text-xs mt-6">Default: recorder / record123</p>
        </div>
      </div>
    )
  }

  // ── Upload success ────────────────────────────────────────────────────────
  if (uploadedCategory) {
    const catLabel = ALL_CATEGORIES_LIST.find(c => c.value === uploadedCategory)?.label || uploadedCategory
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} className="text-emerald-500" /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Uploaded!</h2>
          <p className="text-slate-500 mb-6">Your recording "<strong>{title}</strong>" has been saved to <strong>{catLabel}</strong>.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate(CATEGORY_ROUTES[uploadedCategory])} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl">Go to {catLabel} →</button>
            <button onClick={resetRecording} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl">Record Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3"><Mic size={28} className="text-violet-600" /></div>
          <h1 className="text-2xl font-bold text-slate-800">Record & Edit Audio</h1>
          <p className="text-slate-500 text-sm mt-1">Record, add effects, save drafts, and upload</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('record')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'record' ? 'bg-violet-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Mic size={16} /> Record & Edit
          </button>
          <button onClick={() => { setActiveTab('drafts'); loadDraftList() }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'drafts' ? 'bg-violet-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <FolderOpen size={16} /> Saved Drafts {drafts.length > 0 && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full text-xs">{drafts.length}</span>}
          </button>
        </div>

        {/* ── DRAFTS TAB ── */}
        {activeTab === 'drafts' && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FolderOpen size={18} className="text-violet-500" /> Saved Drafts ({drafts.length})</h2>
            {drafts.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No drafts saved yet</p>
                <p className="text-sm mt-1">Record audio and click "Save Draft" to save for later</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${loadedDraftId === draft.id ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300' : 'border-slate-200 hover:border-violet-200 bg-slate-50'}`}>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-lg">🎙️</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{draft.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(draft.savedAt)}</span>
                        <span>{formatTime(draft.duration)}</span>
                        {draft.category && <span className="capitalize">{draft.category}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleLoadDraft(draft)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0">
                      <ChevronRight size={14} /> {loadedDraftId === draft.id ? 'Loaded' : 'Load & Edit'}
                    </button>
                    <button onClick={() => handleDeleteDraft(draft.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECORD TAB ── */}
        {activeTab === 'record' && (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
              {loadedDraftId && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700">
                  <FolderOpen size={14} /> Editing draft: <strong>{draftTitle}</strong>
                </div>
              )}

              {!audioBlob ? (
                <div className="text-center py-6">
                  {/* Teleprompter */}
                  {showTeleprompter && (
                    <div className="mb-6 bg-black rounded-xl border-2 border-slate-700 overflow-hidden">
                      {!prompterText ? (
                        <div className="p-4">
                          <textarea
                            value={prompterText}
                            onChange={(e) => setPrompterText(e.target.value)}
                            placeholder="Paste your script here..."
                            className="w-full h-32 bg-slate-900 text-white p-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => { if (prompterText.trim()) setShowTeleprompter(true) }}
                              disabled={!prompterText.trim()}
                              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 text-white text-sm rounded-lg"
                            >
                              Start Teleprompter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            ref={prompterRef}
                            className="h-40 overflow-hidden p-6 text-center"
                            style={{
                              fontSize: `${prompterFontSize}px`,
                              lineHeight: '1.6',
                              color: 'white',
                              textShadow: '0 0 10px rgba(255,255,255,0.3)',
                            }}
                          >
                            {prompterText}
                          </div>
                          {/* Prompter controls */}
                          <div className="flex items-center justify-center gap-3 p-3 bg-slate-900 border-t border-slate-700">
                            <button
                              onClick={togglePrompterScroll}
                              className={`p-2 rounded-lg ${isScrolling ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                              title={isScrolling ? 'Pause' : 'Play'}
                            >
                              {isScrolling ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <button
                              onClick={() => prompterRef.current && (prompterRef.current.scrollTop = 0)}
                              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                              title="Reset to top"
                            >
                              <RotateCcw size={18} />
                            </button>
                            <div className="h-6 w-px bg-slate-700" />
                            <span className="text-xs text-slate-400">Speed:</span>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={prompterSpeed}
                              onChange={(e) => setPrompterSpeed(Number(e.target.value))}
                              className="w-24"
                            />
                            <div className="h-6 w-px bg-slate-700" />
                            <span className="text-xs text-slate-400">Size:</span>
                            <button
                              onClick={() => setPrompterFontSize(s => Math.max(16, s - 2))}
                              className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs"
                            >
                              A-
                            </button>
                            <button
                              onClick={() => setPrompterFontSize(s => Math.min(48, s + 2))}
                              className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs"
                            >
                              A+
                            </button>
                            <div className="h-6 w-px bg-slate-700" />
                            <button
                              onClick={() => { setPrompterText(''); setShowTeleprompter(false) }}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800"
                              title="Clear text"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Live waveform visualization */}
                  {(isRecording || isPaused) && (
                    <div className="mb-6">
                      <div className="relative w-full max-w-md mx-auto h-32 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={128}
                          className="w-full h-full"
                        />
                        {/* Audio level indicator */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-75 ${isAudioDetected ? 'bg-green-500' : 'bg-slate-400'}`}
                              style={{ width: `${Math.min(100, (audioLevel / 255) * 100 * 2)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${isAudioDetected ? 'text-green-600' : 'text-slate-400'}`}>
                            {isAudioDetected ? 'Audio detected' : 'No audio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-5xl sm:text-6xl font-mono font-bold text-slate-800 mb-6">{formatTime(recordTime)}</div>

                  <div className="flex items-center justify-center gap-4">
                    {!isRecording ? (
                      <button onClick={startRecording} className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                        <Mic size={32} className="text-white" />
                      </button>
                    ) : (
                      <>
                        <button onClick={togglePauseRecording} className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 flex items-center justify-center transition-colors">
                          {isPaused ? <Play size={24} className="text-white ml-1" /> : <Pause size={24} className="text-white" />}
                        </button>
                        <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-slate-800 hover:bg-slate-900 flex items-center justify-center transition-colors">
                          <Square size={28} className="text-white" />
                        </button>
                      </>
                    )}
                  </div>

                  {isRecording && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <span className="text-slate-500 text-sm">{isPaused ? 'Paused' : 'Recording...'}</span>
                      <span className="text-xs text-slate-400 ml-2">(48kHz stereo, 256kbps)</span>
                    </div>
                  )}

                  {!isRecording && recordTime === 0 && (
                    <>
                      <p className="text-slate-500 text-sm mt-6">Click the microphone to start recording</p>
                      <p className="text-slate-400 text-xs mt-2">You'll see a live waveform when audio is detected</p>
                      <button
                        onClick={() => setShowTeleprompter(!showTeleprompter)}
                        className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showTeleprompter ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                      >
                        {showTeleprompter ? '📜 Hide Teleprompter' : '📜 Show Teleprompter'}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
                    <button onClick={() => { regionsPluginRef.current?.clearRegions(); const t = wavesurferRef.current?.getCurrentTime() ?? 0; regionsPluginRef.current?.addRegion({ start: t, end: Math.min(t+5, wavesurferRef.current?.getDuration()??0), color:'rgba(139,92,246,0.3)', drag:true, resize:true }) }} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"><Crop size={16} /> Select</button>
                    <button onClick={() => currentEdit && selectedRegion && cutAudioBuffer(currentEdit.buffer, selectedRegion.start, selectedRegion.end).then(b => { saveEdit(b); clearRegions() })} disabled={!hasRegion} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><Scissors size={16} /> Cut</button>
                    <button onClick={() => currentEdit && selectedRegion && extractAudioBuffer(currentEdit.buffer, selectedRegion.start, selectedRegion.end).then(b => { saveEdit(b); clearRegions() })} disabled={!hasRegion} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><Crop size={16} /> Trim</button>
                    <button onClick={() => currentEdit && selectedRegion && cutAudioBuffer(currentEdit.buffer, selectedRegion.start, selectedRegion.end).then(b => { saveEdit(b); clearRegions() })} disabled={!hasRegion} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"><Eraser size={16} /> Delete</button>
                    <button onClick={() => { if (!wavesurferRef.current) return; const t = wavesurferRef.current.getCurrentTime(); regionsPluginRef.current?.clearRegions(); regionsPluginRef.current?.addRegion({ start: t, end: Math.min(t+0.1, wavesurferRef.current.getDuration()), color:'rgba(239,68,68,0.5)' }) }} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"><Split size={16} /> Split</button>
                    <div className="w-px h-8 bg-slate-300 mx-1" />
                    <button onClick={undo} disabled={!canUndo} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><RotateCcw size={16} /> Undo</button>
                    <button onClick={redo} disabled={!canRedo} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><RotateCcw size={16} className="scale-x-[-1]" /> Redo</button>
                    <div className="flex-1" />
                    <button onClick={() => handleZoom(-20)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><ZoomOut size={18} /></button>
                    <button onClick={() => handleZoom(20)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><ZoomIn size={18} /></button>
                  </div>

                  {selectedRegion && <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700 font-medium">Selected: {formatTime(selectedRegion.start)} – {formatTime(selectedRegion.end)} ({formatTime(selectedRegion.end - selectedRegion.start)})</div>}

                  <div ref={waveformContainerRef} className="w-full bg-slate-50 rounded-xl border border-slate-200 mb-4" style={{ minHeight: '150px' }} />

                  {/* Playback */}
                  <div className="flex items-center gap-4 mb-5">
                    <button onClick={() => wavesurferRef.current?.skip(-5)} className="p-2 text-slate-600 hover:text-violet-600"><SkipBack size={24} /></button>
                    <button onClick={() => wavesurferRef.current?.playPause()} className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white shadow-lg">
                      {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                    </button>
                    <button onClick={() => wavesurferRef.current?.skip(5)} className="p-2 text-slate-600 hover:text-violet-600"><SkipForward size={24} /></button>
                    <div className="flex-1" />
                    <Volume2 size={18} className="text-slate-400" />
                    <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); wavesurferRef.current?.setVolume(v) }} className="w-24" />
                    <span className="text-sm font-mono text-slate-600">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>

                  {/* Effects */}
                  <div className="border border-violet-200 rounded-xl p-4 mb-5 bg-gradient-to-br from-violet-50 to-indigo-50">
                    <div className="flex items-center gap-2 mb-3"><Sparkles size={18} className="text-violet-600" /><h3 className="font-semibold text-slate-800 text-sm">Audio Effects</h3></div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
                      {EFFECTS.map(fx => (
                        <button key={fx.id} onClick={() => setActiveEffect(fx.id)} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${activeEffect === fx.id ? 'bg-violet-600 border-violet-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50'}`} title={fx.label}>
                          <span className="text-base">{fx.emoji}</span><span className="truncate w-full text-center leading-tight">{fx.label}</span>
                        </button>
                      ))}
                    </div>
                    {activeEffect !== 'none' && (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs text-slate-500 w-16 shrink-0">Intensity</span>
                          <input type="range" min="0.1" max="1" step="0.05" value={effectIntensity} onChange={e => setEffectIntensity(parseFloat(e.target.value))} className="flex-1" />
                          <span className="text-xs text-slate-600 w-8 text-right">{Math.round(effectIntensity * 100)}%</span>
                        </div>
                        <button onClick={handleApplyEffect} disabled={applyingEffect} className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold py-2.5 rounded-xl text-sm">
                          {applyingEffect ? 'Applying...' : `Apply ${EFFECTS.find(f => f.id === activeEffect)?.label}`}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={resetRecording} className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium text-sm"><RotateCcw size={16} /> Start Over</button>
                    <button onClick={() => setShowDraftSave(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-medium text-sm border border-amber-200"><Save size={16} /> Save Draft</button>
                    <div className="flex-1" />
                    <button onClick={() => setShowUploadForm(true)} className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm"><Upload size={16} /> Upload Recording</button>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-amber-800 mb-2"><Headphones size={16} className="inline mr-1" /> Tips</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-sm text-amber-700">
                <div>• Save Draft to come back and edit later</div>
                <div>• Select effect → adjust intensity → Apply</div>
                <div>• Use Undo if you don't like a change</div>
                <div>• Drafts are stored locally on this device</div>
              </div>
            </div>
          </>
        )}

        {/* Save Draft Modal */}
        {showDraftSave && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Save size={18} className="text-amber-500" /> Save Draft</h3>
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Draft Name</label>
                <input type="text" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder={`Draft ${formatDate(Date.now())}`} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDraftSave(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm">Cancel</button>
                <button onClick={handleSaveDraft} disabled={savingDraft} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white py-3 rounded-xl font-semibold text-sm">
                  {savingDraft ? 'Saving...' : loadedDraftId ? 'Update Draft' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Form Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Upload Recording</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-violet-400" placeholder="Enter a title" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Category *</label>
                  <select value={category} onChange={e => { setCategory(e.target.value as AudioCategory); setReciter(''); setTopic('') }} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm">
                    {ALL_CATEGORIES_LIST.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                {reciters.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Speaker / Artist *</label>
                    <select value={reciter} onChange={e => setReciter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm">
                      <option value="">-- Select --</option>
                      {reciters.map(r => <option key={r} value={r}>{r}</option>)}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
                {showCustomReciter && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Name *</label>
                    <input type="text" value={customReciter} onChange={e => setCustomReciter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" required />
                  </div>
                )}
                {category === 'talks' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Topic *</label>
                    <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm" required>
                      <option value="">-- Select Topic --</option>
                      {TALKS_TOPICS.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                    </select>
                  </div>
                )}
                {(uploadError || hookError) && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{uploadError || hookError}</div>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowUploadForm(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm">Cancel</button>
                  <button type="submit" disabled={uploading || !title || (reciters.length > 0 && !reciter && !customReciter) || (category === 'talks' && !topic)} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white py-3 rounded-xl font-semibold text-sm">
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
