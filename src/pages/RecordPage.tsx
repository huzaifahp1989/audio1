import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Upload, RotateCcw, Scissors, SkipBack, SkipForward, Volume2, Headphones, Crop, Split, Eraser, ZoomIn, ZoomOut, Sparkles, CheckCircle, Save, FolderOpen, Trash2, Clock, ChevronRight, X, FileText, Wand2, RefreshCw } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useNavigate } from 'react-router-dom'
import {
  saveDraft,
  getAllDrafts,
  deleteDraft,
  savePendingRecorderUpload,
  getAllPendingRecorderUploads,
  deletePendingRecorderUpload,
  type RecordingDraft,
  type PendingRecorderUpload,
} from '../lib/indexedDb'
import { ALL_CATEGORIES_LIST, QURAN_RECITERS, NASHEED_ARTISTS, TALKS_SPEAKERS, TALKS_TOPICS, AUDIOBOOK_AUTHORS, HADITH_NARRATORS, UNCATEGORIZED_CATEGORY, formatCategoryLabel } from '../constants/categories'
import type { AudioCategory } from '../types'
import { submitUserRecordingForReview } from '../lib/storage'
import { trimSilenceFromFile } from '../lib/audioProcessing'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions'
import { transcribeAudio, canTranscribe } from '../lib/transcription'
import TranscriptionModal from '../components/TranscriptionModal'
import { useAuth } from '../context/AuthContext'
import { getMaxUploadBytes } from '../lib/uploadLimits'
import { trackEvent } from '../lib/analytics'

const RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]
const MICROPHONE_REQUEST_TIMEOUT_MS = 10000
type RecordingQuality = 'standard' | 'high'
const RECORDER_QUALITY_STORAGE_KEY = 'recorder_quality_preset'
const RECORDING_QUALITY_PRESETS: Record<RecordingQuality, { label: string; audioBitsPerSecond: number; description: string }> = {
  standard: { label: 'Standard', audioBitsPerSecond: 128000, description: 'Smaller files' },
  high: { label: 'High', audioBitsPerSecond: 256000, description: 'Best clarity' },
}

function createMediaRecorderWithFallback(
  stream: MediaStream,
  audioBitsPerSecond: number,
): { recorder: MediaRecorder; mimeType: string } {
  const supportedMimeType = RECORDER_MIME_TYPES.find((mime) => {
    if (typeof MediaRecorder.isTypeSupported !== 'function') return false
    return MediaRecorder.isTypeSupported(mime)
  })

  const attempts: MediaRecorderOptions[] = []
  if (supportedMimeType) {
    attempts.push({ mimeType: supportedMimeType, audioBitsPerSecond })
    attempts.push({ mimeType: supportedMimeType })
  }
  attempts.push({ audioBitsPerSecond })
  attempts.push({})

  for (const options of attempts) {
    try {
      const recorder = new MediaRecorder(stream, options)
      return {
        recorder,
        mimeType: recorder.mimeType || supportedMimeType || 'audio/webm',
      }
    } catch {
      // Try next option.
    }
  }

  throw new Error('MediaRecorder initialization failed')
}

async function requestMicrophoneStream(
  audioConstraints: MediaTrackConstraints | boolean,
  timeoutMs = MICROPHONE_REQUEST_TIMEOUT_MS,
): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      const timeoutError = new Error('Microphone request timed out')
      timeoutError.name = 'TimeoutError'
      reject(timeoutError)
    }, timeoutMs)

    navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      .then((stream) => {
        window.clearTimeout(timeoutId)
        resolve(stream)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function mapUploadError(error: unknown): string {
  const err = error as { code?: string; message?: string }
  const code = err?.code || ''
  if (code === 'storage/unauthorized') return 'Upload permission denied. Please check Firebase storage rules.'
  if (code === 'storage/retry-limit-exceeded') return 'Upload timed out. Check your connection and try again.'
  if (code === 'storage/canceled') return 'Upload was canceled.'
  if (code === 'storage/quota-exceeded') return 'Storage quota exceeded. Please contact admin.'
  if (err?.message) return err.message
  return 'Upload failed. Please try again.'
}

async function extractDurationFromFile(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.addEventListener('loadedmetadata', () => { resolve(audio.duration); URL.revokeObjectURL(url) })
    audio.addEventListener('error', () => { resolve(undefined); URL.revokeObjectURL(url) })
    setTimeout(() => { resolve(undefined); URL.revokeObjectURL(url) }, 8000)
  })
}

interface AudioQualityStats {
  peak: number
  rms: number
  clippedRatio: number
}

function analyzeAudioQuality(buffer: AudioBuffer): AudioQualityStats {
  const channelData = buffer.getChannelData(0)
  const step = Math.max(1, Math.floor(channelData.length / 120000))

  let peak = 0
  let sumSquares = 0
  let clipped = 0
  let count = 0

  for (let i = 0; i < channelData.length; i += step) {
    const sample = Math.abs(channelData[i])
    if (sample > peak) peak = sample
    sumSquares += sample * sample
    if (sample >= 0.995) clipped += 1
    count += 1
  }

  return {
    peak,
    rms: count ? Math.sqrt(sumSquares / count) : 0,
    clippedRatio: count ? clipped / count : 0,
  }
}

async function enhanceSpeechBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
  const stats = analyzeAudioQuality(buffer)
  const targetPeak = 0.89
  const gainValue = stats.peak > 0 ? Math.min(2.2, targetPeak / stats.peak) : 1

  const offCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  )
  const src = offCtx.createBufferSource()
  src.buffer = buffer

  const highPass = offCtx.createBiquadFilter()
  highPass.type = 'highpass'
  highPass.frequency.value = 80
  highPass.Q.value = 0.7

  const gain = offCtx.createGain()
  gain.gain.value = gainValue

  src.connect(highPass)
  highPass.connect(gain)
  gain.connect(offCtx.destination)
  src.start(0)

  return offCtx.startRendering()
}

function isOfflineUploadError(error: unknown): boolean {
  const message = ((error as { message?: string })?.message || '').toLowerCase()
  return (
    !navigator.onLine ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timed out') ||
    message.includes('timeout')
  )
}

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
  'kids-stories': '/kids-recordings', 'kids-quran': '/kids-recordings', 'kids-nasheeds': '/kids-recordings', 'kids-talks': '/kids-recordings',
  audiobooks: '/audiobooks', hadith: '/hadith', dua: '/dua',
}

function extractTitleFromFilename(filename: string): string {
  // Remove file extension
  const withoutExtension = filename.replace(/\.[^/.]+$/, '')
  
  // Replace underscores, dashes, and dots with spaces
  const withSpaces = withoutExtension.replace(/[_\-\.]+/g, ' ')
  
  // Remove common prefixes like numbers (01., 1., etc.)
  const withoutPrefixes = withSpaces.replace(/^\d+[\.\s\-_]*/i, '')
  
  // Clean up multiple spaces
  const cleaned = withoutPrefixes.replace(/\s+/g, ' ').trim()
  
  // Capitalize first letter of each word
  return cleaned.replace(/\b\w/g, char => char.toUpperCase())
}

function supportsTextContent(cat: AudioCategory): boolean {
  return cat === 'audiobooks' || cat === 'hadith' || cat === 'dua'
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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'record' | 'drafts'>('record')

  // Recording
  const [isRecording, setIsRecording] = useState(false)
  const [isStartingRecording, setIsStartingRecording] = useState(false)
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
  const [category, setCategory] = useState<AudioCategory>(UNCATEGORIZED_CATEGORY)
  const [reciter, setReciter] = useState('')
  const [customReciter, setCustomReciter] = useState('')
  const [topic, setTopic] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [trimLeadingSilenceOnUpload, setTrimLeadingSilenceOnUpload] = useState(false)
  const [trimTrailingSilenceOnUpload, setTrimTrailingSilenceOnUpload] = useState(false)
  const [uploadedCategory, setUploadedCategory] = useState<AudioCategory | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'published' | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [contributorName, setContributorName] = useState('')
  const [contributorEmail, setContributorEmail] = useState('')
  const [contributorMobile, setContributorMobile] = useState('')
  const [autoEnhanceAudio, setAutoEnhanceAudio] = useState(true)
  const [qualityHints, setQualityHints] = useState<string[]>([])
  const [pendingUploadCount, setPendingUploadCount] = useState(0)
  const [syncingPendingUploads, setSyncingPendingUploads] = useState(false)
  const [syncStatusMessage, setSyncStatusMessage] = useState('')

  // Transcription
  const [textContent, setTextContent] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionModalOpen, setTranscriptionModalOpen] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

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
  const lastAudioUiUpdateRef = useRef(0)
  const regionsPluginRef = useRef<any>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { refresh } = useAudioLibrary()

  // Live waveform data
  const [audioLevel, setAudioLevel] = useState(0)
  const [isAudioDetected, setIsAudioDetected] = useState(false)
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([])
  const [selectedMicId, setSelectedMicId] = useState('')
  const [isLoadingMics, setIsLoadingMics] = useState(false)
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>(() => {
    if (typeof window === 'undefined') return 'high'
    const stored = window.localStorage.getItem(RECORDER_QUALITY_STORAGE_KEY)
    return stored === 'standard' || stored === 'high' ? stored : 'high'
  })

  const loadMicrophones = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    setIsLoadingMics(true)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const mics = devices.filter((device) => device.kind === 'audioinput')
      setAvailableMics(mics)

      // Keep selected mic valid if hardware changed.
      setSelectedMicId((current) => {
        if (!mics.length) return ''
        if (!current) return mics[0].deviceId
        return mics.some((mic) => mic.deviceId === current) ? current : mics[0].deviceId
      })
    } catch (error) {
      console.warn('[Recording] Failed to list microphones', error)
      setAvailableMics([])
    } finally {
      setIsLoadingMics(false)
    }
  }

  const loadDraftList = async () => { setDrafts(await getAllDrafts()) }
  const loadPendingUploadCount = async () => {
    const pending = await getAllPendingRecorderUploads()
    setPendingUploadCount(pending.length)
  }

  const syncPendingUploads = async () => {
    const pending = await getAllPendingRecorderUploads()
    if (!pending.length) {
      setPendingUploadCount(0)
      return
    }

    setSyncingPendingUploads(true)
    setSyncStatusMessage('')

    let synced = 0
    for (const item of pending) {
      try {
        const retryFile = new File([item.blob], item.fileName, { type: item.mimeType })
        await submitUserRecordingForReview(
          retryFile,
          {
            title: item.metadata.title,
            category: item.metadata.category as AudioCategory,
            reciter: item.metadata.reciter,
            contributorName: item.metadata.contributorName,
            email: item.metadata.email,
            mobile: item.metadata.mobile,
            topic: item.metadata.topic,
            text: item.metadata.text,
            duration: item.metadata.duration,
          },
          { requireFirebaseStorage: true },
        )
        await deletePendingRecorderUpload(item.id)
        synced += 1
      } catch (error) {
        console.warn('[Recorder sync] Failed pending upload', item.id, error)
      }
    }

    await loadPendingUploadCount()
    if (synced > 0) {
      setSyncStatusMessage(`${synced} pending upload${synced > 1 ? 's' : ''} synced.`)
      refresh()
    }
    setSyncingPendingUploads(false)
  }

  useEffect(() => { loadDraftList() }, [])
  useEffect(() => { void loadPendingUploadCount() }, [])

  useEffect(() => {
    if (!user) return
    if (!contributorName.trim()) {
      setContributorName(user.email?.split('@')[0] || 'Contributor')
    }
    if (!contributorEmail.trim()) {
      setContributorEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    const onOnline = () => {
      void syncPendingUploads()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(RECORDER_QUALITY_STORAGE_KEY, recordingQuality)
  }, [recordingQuality])

  useEffect(() => {
    void loadMicrophones()

    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.addEventListener) return

    const handleDeviceChange = () => {
      void loadMicrophones()
    }

    mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [])

  useEffect(() => {
    if (!currentEdit) {
      setQualityHints([])
      return
    }
    const stats = analyzeAudioQuality(currentEdit.buffer)
    const hints: string[] = []
    if (stats.rms < 0.02) hints.push('Recording level looks low. Move closer to the mic.')
    if (stats.clippedRatio > 0.01) hints.push('Audio clipping detected. Reduce mic gain or step back slightly.')
    setQualityHints(hints)
  }, [currentEdit])

  const initAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed')
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  const stopAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    lastAudioUiUpdateRef.current = 0
    setAudioLevel(0)
    setIsAudioDetected(false)
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
    setUploadError('')
    setIsStartingRecording(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setUploadError('Microphone recording is not supported in this browser. Please use a modern browser like Chrome, Edge, or Firefox.')
      setIsStartingRecording(false)
      return
    }

    if (typeof MediaRecorder === 'undefined') {
      setUploadError('MediaRecorder is not available in this environment. Please open this app in an external browser to record audio.')
      setIsStartingRecording(false)
      return
    }

    if (!window.isSecureContext) {
      setUploadError('Microphone access requires a secure context. Open the app on localhost or HTTPS.')
      setIsStartingRecording(false)
      return
    }

    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (permission.state === 'denied') {
          setUploadError('Microphone permission is blocked. Enable microphone access in your browser settings.')
          setIsStartingRecording(false)
          return
        }
      }

      initAudioContext()

      const preferredConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: recordingQuality === 'high' ? { ideal: 2 } : { ideal: 1 },
        sampleRate: recordingQuality === 'high' ? { ideal: 48000 } : { ideal: 44100 },
        ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
      }

      let stream: MediaStream
      try {
        stream = await requestMicrophoneStream(preferredConstraints)
      } catch (error: any) {
        const fallbackAllowed = ['TimeoutError', 'AbortError', 'OverconstrainedError'].includes(error?.name || '')
        if (!fallbackAllowed) throw error
        stream = await requestMicrophoneStream(true, 6000)
      }
      void loadMicrophones()
      
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
        const now = performance.now()
        if (now - lastAudioUiUpdateRef.current >= 100) {
          setAudioLevel(avg)
          setIsAudioDetected(avg > 10)
          lastAudioUiUpdateRef.current = now
        }

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
      
      const targetBitrate = RECORDING_QUALITY_PRESETS[recordingQuality].audioBitsPerSecond
      const { recorder: mr, mimeType: selectedMimeType } = createMediaRecorderWithFallback(stream, targetBitrate)
      
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      mr.onstop = async () => {
        stopAudioVisualization()

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
      
      console.log('[Recording] Started with:', selectedMimeType, 'bitrate:', `${Math.round(targetBitrate / 1000)}kbps`)
      
    } catch (err: any) {
      stopAudioVisualization()
      console.error('[Recording] Error:', err)
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setUploadError('Microphone permission was denied. Allow microphone access for this page. If using VS Code preview, open in an external browser and try again.')
      } else if (name === 'NotFoundError') {
        setUploadError('No microphone device was found. Connect a microphone and try again.')
      } else if (name === 'NotReadableError') {
        setUploadError('Microphone is busy or unavailable. Close other apps using the mic and try again.')
      } else if (name === 'TimeoutError' || name === 'AbortError') {
        setUploadError('Microphone access took too long. Try again, close other apps using the mic, or open this page in an external browser.')
      } else {
        setUploadError('Could not start recording. Please check microphone permissions and try again.')
      }
    } finally {
      setIsStartingRecording(false)
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
    setUploadStatus(null); setSyncStatusMessage('')
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
    if (cat === 'audiobooks') return AUDIOBOOK_AUTHORS
    if (cat === 'hadith') return HADITH_NARRATORS
    return []
  }
  const reciters = getReciters(category)
  const showCustomReciter = reciter === 'Other' || reciters.length === 0

  // ── Teleprompter functions ─────────────────────────────────────────────────
  const [manualScrollMode, setManualScrollMode] = useState(false)

  const startPrompterScroll = () => {
    if (!prompterRef.current || isScrolling || manualScrollMode) return
    setIsScrolling(true)
    scrollIntervalRef.current = setInterval(() => {
      if (prompterRef.current) {
        prompterRef.current.scrollTop += prompterSpeed / 20
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

  // Auto-start/stop prompter with recording (only in auto mode)
  useEffect(() => {
    if (manualScrollMode) return // Don't auto-scroll in manual mode
    if (isRecording && showTeleprompter && prompterText.trim()) {
      startPrompterScroll()
    } else if (!isRecording) {
      stopPrompterScroll()
    }
    return () => stopPrompterScroll()
  }, [isRecording, showTeleprompter, manualScrollMode])

  useEffect(() => {
    return () => {
      stopAudioVisualization()
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current)
        scrollIntervalRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
      regionsPluginRef.current = null
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentEdit) {
      setUploadError('No audio to upload. Please record first.')
      return
    }

    setUploading(true)
    setUploadError('')
    setSyncStatusMessage('')

    try {
      let workingBuffer = currentEdit.buffer
      if (autoEnhanceAudio) {
        try {
          workingBuffer = await enhanceSpeechBuffer(currentEdit.buffer)
        } catch (error) {
          console.warn('[Recorder] auto-enhance failed, continuing with original audio', error)
        }
      }

      const wavBlob = audioBufferToWav(workingBuffer)
      const timestamp = Date.now()
      const safeTitle = (title || 'Recording').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
      const fileName = `${safeTitle}_${timestamp}.wav`
      let file = new File([wavBlob], fileName, { type: 'audio/wav' })

      if (!file.type.startsWith('audio/')) {
        throw new Error('Generated file is not recognized as audio. Please record again.')
      }

      // Optional silence trimming
      if (trimLeadingSilenceOnUpload || trimTrailingSilenceOnUpload) {
        try {
          const trimmed = await trimSilenceFromFile(file, {
            trimLeading: trimLeadingSilenceOnUpload,
            trimTrailing: trimTrailingSilenceOnUpload,
          })
          file = trimmed.file
        } catch {
          // keep original file if trim fails
        }
      }

      if (file.size > getMaxUploadBytes(!!user)) {
        throw new Error(`Recording is too large to upload. Please keep it under ${user ? '100MB' : '75MB'}.`)
      }

      const finalTitle = title.trim() || `Recording ${new Date().toLocaleString()}`
      const duration = await extractDurationFromFile(file)
      const adminCategory = UNCATEGORIZED_CATEGORY
      const effectiveReciter = contributorName.trim() || 'Contributor'

      const submissionPayload = {
        title: finalTitle,
        category: adminCategory,
        reciter: effectiveReciter,
        contributorName: contributorName.trim() || 'Contributor',
        email: contributorEmail.trim(),
        mobile: contributorMobile.trim(),
        duration,
      }

      await submitUserRecordingForReview(file, submissionPayload, { requireFirebaseStorage: true })
      setUploadStatus('pending')
      trackEvent('record_submission_pending', { category: adminCategory, reciter: effectiveReciter })

      // Refresh global track list so new upload is visible everywhere
      refresh()

      // Clean up draft in background — never blocks success
      if (loadedDraftId) {
        const draftId = loadedDraftId
        setLoadedDraftId(null)
        void deleteDraft(draftId).then(() => loadDraftList()).catch(() => {})
      }

      setShowUploadForm(false)
      setUploadedCategory(adminCategory)
    } catch (err: unknown) {
      console.error('[Upload] Error:', err)

      if (isOfflineUploadError(err)) {
        const duration = currentEdit.duration
        const fallbackTitle = title.trim() || `Recording ${new Date().toLocaleString()}`
        const effectiveReciter = contributorName.trim() || 'Contributor'
        const adminCategory = UNCATEGORIZED_CATEGORY
        const queuedFileName = `${fallbackTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${Date.now()}.wav`
        const queuedBlob = audioBufferToWav(currentEdit.buffer)

        const pendingUpload: PendingRecorderUpload = {
          id: crypto.randomUUID(),
          savedAt: Date.now(),
          fileName: queuedFileName,
          mimeType: 'audio/wav',
          blob: queuedBlob,
          metadata: {
            title: fallbackTitle,
            category: adminCategory,
            reciter: effectiveReciter,
            duration,
            contributorName: contributorName.trim() || 'Contributor',
            email: contributorEmail.trim(),
            mobile: contributorMobile.trim(),
          },
        }

        await savePendingRecorderUpload(pendingUpload)
        await loadPendingUploadCount()
        setUploadError('No internet right now. Your recording was safely queued and will sync when connection returns.')
      } else {
        setUploadError(mapUploadError(err))
      }
    } finally {
      setUploading(false)
    }
  }

  const canUndo = historyIndex > 0, canRedo = historyIndex < editHistory.length - 1

  // ── Transcription handler ────────────────────────────────────────────────
  const handleTranscribe = async () => {
    if (!currentEdit) return
    
    // Convert audio buffer to blob for transcription
    const wavBlob = audioBufferToWav(currentEdit.buffer)
    const file = new File([wavBlob], 'recording.wav', { type: 'audio/wav' })
    
    if (!canTranscribe(file)) {
      setUploadError('Audio file is too large for transcription (max 25MB)')
      return
    }
    
    setIsTranscribing(true)
    setTranscriptionModalOpen(true)
    setTranscriptionError(null)
    setTranscribedText('')
    
    const result = await transcribeAudio(file)
    
    if (result.success) {
      setTranscribedText(result.text)
    } else {
      setTranscriptionError(result.error || 'Transcription failed')
    }
    
    setIsTranscribing(false)
  }

  const handleApplyTranscription = (text: string) => {
    setTextContent(text)
  }

  // ── Upload success ────────────────────────────────────────────────────────
  if (uploadedCategory) {
    const catLabel = formatCategoryLabel(uploadedCategory)
    const nextRoute = CATEGORY_ROUTES[uploadedCategory] || '/'
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-lg sm:p-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={40} className="text-emerald-500" /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{uploadStatus === 'pending' ? 'Submitted for Review' : 'Uploaded!'}</h2>
          <p className="text-slate-500 mb-6">
            {uploadStatus === 'pending'
              ? `Your recording "${title}" is pending admin approval. The admin can add or change its category before it goes live.`
              : `Your recording "${title}" has been saved to ${catLabel}.`}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate(nextRoute)} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl">{uploadedCategory === UNCATEGORIZED_CATEGORY ? 'Back to Home' : `Go to ${catLabel} →`}</button>
            <button onClick={resetRecording} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl">Record Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        {pendingUploadCount > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-900">
                {pendingUploadCount} recording{pendingUploadCount > 1 ? 's' : ''} waiting to sync.
              </p>
              <button
                type="button"
                onClick={() => void syncPendingUploads()}
                disabled={syncingPendingUploads}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {syncingPendingUploads ? 'Syncing...' : 'Sync now'}
              </button>
            </div>
            {syncStatusMessage && <p className="mt-1 text-xs text-amber-700">{syncStatusMessage}</p>}
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 text-center shadow-sm">
          <p className="text-sm sm:text-base font-semibold text-slate-800">
            Share your talent by recording Quran, nasheeds. Best will be published on the app.
          </p>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3"><Mic size={28} className="text-violet-600" /></div>
          <h1 className="text-2xl font-bold text-slate-800">Record & Edit Audio</h1>
          <p className="text-slate-500 text-sm mt-1">Record, add effects, save drafts, and upload</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={() => setActiveTab('record')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors sm:px-5 ${activeTab === 'record' ? 'bg-violet-600 text-white shadow' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            <Mic size={16} /> Record & Edit
          </button>
          <button onClick={() => { setActiveTab('drafts'); loadDraftList() }} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors sm:px-5 ${activeTab === 'drafts' ? 'bg-violet-600 text-white shadow' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            <FolderOpen size={16} /> Saved Drafts {drafts.length > 0 && <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full text-xs">{drafts.length}</span>}
          </button>
        </div>

        {/* ── DRAFTS TAB ── */}
        {activeTab === 'drafts' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
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
                  <div key={draft.id} className={`relative flex flex-col items-stretch gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${loadedDraftId === draft.id ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300' : 'border-slate-200 bg-slate-50 hover:border-violet-200'}`}>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-lg">🎙️</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{draft.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:gap-3">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(draft.savedAt)}</span>
                        <span>{formatTime(draft.duration)}</span>
                        {draft.category && <span className="capitalize">{draft.category}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleLoadDraft(draft)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 sm:w-auto sm:py-1.5">
                      <ChevronRight size={14} /> {loadedDraftId === draft.id ? 'Loaded' : 'Load & Edit'}
                    </button>
                    <button onClick={() => handleDeleteDraft(draft.id)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:static">
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
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:p-6">
              {loadedDraftId && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700">
                  <FolderOpen size={14} /> Editing draft: <strong>{draftTitle}</strong>
                </div>
              )}

              {!audioBlob ? (
                <div className="text-center py-6">
                  <div className="max-w-md mx-auto mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Microphone</p>
                      <button
                        type="button"
                        onClick={() => void loadMicrophones()}
                        disabled={isLoadingMics || isRecording}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isLoadingMics ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                    </div>
                    <select
                      value={selectedMicId}
                      onChange={(e) => setSelectedMicId(e.target.value)}
                      disabled={isRecording || availableMics.length === 0}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {availableMics.length === 0 ? (
                        <option value="">No microphone detected</option>
                      ) : (
                        availableMics.map((mic, index) => (
                          <option key={mic.deviceId || `${mic.groupId}-${index}`} value={mic.deviceId}>
                            {mic.label || `Microphone ${index + 1}`}
                          </option>
                        ))
                      )}
                    </select>
                    <p className="mt-1.5 text-left text-xs text-slate-500">
                      Tip: if your mic is missing, allow microphone access once, then click refresh.
                    </p>

                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Recording quality</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(RECORDING_QUALITY_PRESETS) as Array<[RecordingQuality, (typeof RECORDING_QUALITY_PRESETS)[RecordingQuality]]>).map(([quality, preset]) => (
                          <button
                            key={quality}
                            type="button"
                            onClick={() => setRecordingQuality(quality)}
                            disabled={isRecording}
                            className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                              recordingQuality === quality
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-slate-200 bg-white hover:bg-slate-100'
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-800">{preset.label}</p>
                            <p className="text-xs text-slate-500">{preset.description} · {Math.round(preset.audioBitsPerSecond / 1000)}kbps</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

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
                            className="h-40 overflow-y-auto p-6 text-center cursor-text"
                            style={{
                              fontSize: `${prompterFontSize}px`,
                              lineHeight: '1.6',
                              color: 'white',
                              textShadow: '0 0 10px rgba(255,255,255,0.3)',
                              scrollBehavior: 'smooth'
                            }}
                          >
                            {prompterText}
                          </div>
                          {/* Prompter controls */}
                          <div className="flex items-center justify-center gap-3 p-3 bg-slate-900 border-t border-slate-700 flex-wrap">
                            <button
                              onClick={togglePrompterScroll}
                              disabled={manualScrollMode}
                              className={`p-2 rounded-lg ${manualScrollMode ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : isScrolling ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
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
                            <button
                              onClick={() => {
                                setManualScrollMode(!manualScrollMode)
                                if (isScrolling) stopPrompterScroll()
                              }}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                manualScrollMode 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                              title={manualScrollMode ? 'Manual scroll enabled' : 'Enable manual scroll'}
                            >
                              {manualScrollMode ? '✋ Manual' : '🤖 Auto'}
                            </button>
                            <div className="h-6 w-px bg-slate-700" />
                            <span className="text-xs text-slate-400">Speed:</span>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={prompterSpeed}
                              onChange={(e) => setPrompterSpeed(Number(e.target.value))}
                              disabled={manualScrollMode}
                              className={`w-24 ${manualScrollMode ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                  <div className="mb-6 text-4xl font-mono font-bold text-slate-800 sm:text-6xl">{formatTime(recordTime)}</div>

                  <div className="flex items-center justify-center gap-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isStartingRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                          isStartingRecording
                            ? 'bg-red-300 cursor-wait'
                            : 'bg-red-500 hover:bg-red-600 hover:scale-105'
                        }`}
                      >
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
                      <span className="text-xs text-slate-400 ml-2">({recordingQuality === 'high' ? '48kHz stereo' : '44.1kHz mono'}, {Math.round(RECORDING_QUALITY_PRESETS[recordingQuality].audioBitsPerSecond / 1000)}kbps)</span>
                    </div>
                  )}

                  {!isRecording && recordTime === 0 && (
                    <>
                      <p className="text-slate-500 text-sm mt-6">
                        {isStartingRecording ? 'Requesting microphone access...' : 'Click the microphone to start recording'}
                      </p>
                      <p className="text-slate-400 text-xs mt-2">You'll see a live waveform when audio is detected</p>
                      <button
                        onClick={() => setShowTeleprompter(!showTeleprompter)}
                        className={`mt-4 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showTeleprompter ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                      >
                        {showTeleprompter ? '📜 Hide Teleprompter' : '📜 Show Teleprompter'}
                      </button>
                    </>
                  )}

                  {uploadError && (
                    <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg max-w-xl mx-auto">
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Toolbar */}
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 sm:p-3">
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
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    <button onClick={() => wavesurferRef.current?.skip(-5)} className="p-2 text-slate-600 hover:text-violet-600"><SkipBack size={24} /></button>
                    <button onClick={() => wavesurferRef.current?.playPause()} className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white shadow-lg">
                      {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                    </button>
                    <button onClick={() => wavesurferRef.current?.skip(5)} className="p-2 text-slate-600 hover:text-violet-600"><SkipForward size={24} /></button>
                    <div className="hidden flex-1 sm:block" />
                    <Volume2 size={18} className="text-slate-400" />
                    <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => { const v = parseFloat(e.target.value); setVolume(v); wavesurferRef.current?.setVolume(v) }} className="w-24" />
                    <span className="w-full text-center text-sm font-mono text-slate-600 sm:w-auto">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>

                  {/* Effects */}
                  <div className="border border-violet-200 rounded-xl p-4 mb-5 bg-gradient-to-br from-violet-50 to-indigo-50">
                    <div className="flex items-center gap-2 mb-3"><Sparkles size={18} className="text-violet-600" /><h3 className="font-semibold text-slate-800 text-sm">Audio Effects</h3></div>
                    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-7">
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
                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <button onClick={resetRecording} className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium text-sm"><RotateCcw size={16} /> Start Over</button>
                    <button onClick={() => setShowDraftSave(true)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-medium text-sm border border-amber-200"><Save size={16} /> Save Draft</button>
                    <div className="hidden flex-1 sm:block" />
                    <button onClick={() => setShowUploadForm(true)} className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"><Upload size={16} /> Upload Recording</button>
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
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">This recording feature is mainly for ages 14 and above.</p>
                <p className="mt-1 text-sm text-emerald-800">You will also get a chance to win takeaway vouchers and Juice4Life prizes.</p>
                <p className="mt-2 text-sm text-slate-700">For children under 14, please visit the Kids Zone instead.</p>
                <button
                  type="button"
                  onClick={() => navigate('/kids-recordings')}
                  className="mt-3 inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                >
                  Go to Kids Zone
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-violet-400" placeholder="Enter a title" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Contributor name *</label>
                    <input
                      type="text"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Mobile number *</label>
                    <input
                      type="tel"
                      value={contributorMobile}
                      onChange={(e) => setContributorMobile(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm"
                      placeholder="e.g. 07123 456789"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Email address *</label>
                  <input
                    type="email"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm"
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={autoEnhanceAudio}
                    onChange={e => setAutoEnhanceAudio(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Auto noise reduction + loudness normalize</p>
                    <p className="text-xs text-slate-500">Applies gentle high-pass filtering and auto level normalization before upload.</p>
                  </div>
                </label>

                {qualityHints.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {qualityHints.map((hint) => (
                      <p key={hint}>• {hint}</p>
                    ))}
                  </div>
                )}

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={trimLeadingSilenceOnUpload}
                    onChange={e => setTrimLeadingSilenceOnUpload(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Remove leading silence</p>
                    <p className="text-xs text-slate-500">Cuts silent audio from the beginning before upload.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={trimTrailingSilenceOnUpload}
                    onChange={e => setTrimTrailingSilenceOnUpload(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Remove trailing silence</p>
                    <p className="text-xs text-slate-500">Cuts silent audio from the end before upload.</p>
                  </div>
                </label>
                {uploadError && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{uploadError}</div>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowUploadForm(false)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-sm">Cancel</button>
                  <button type="submit" disabled={uploading || !title.trim() || !contributorName.trim() || !contributorMobile.trim() || !contributorEmail.trim()} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white py-3 rounded-xl font-semibold text-sm">
                    {uploading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transcription Modal */}
        <TranscriptionModal
          isOpen={transcriptionModalOpen}
          onClose={() => setTranscriptionModalOpen(false)}
          onApply={handleApplyTranscription}
          initialText={transcribedText}
          isLoading={isTranscribing}
          error={transcriptionError}
          fileName="recording.wav"
          useWebSpeech={true}
        />
      </div>
    </div>
  )
}
