import React, { useEffect, useState, useRef } from 'react'
import { Mic, Square, User, BookOpen, CheckCircle, Clock, Send, Headphones, Volume2, ShieldCheck } from 'lucide-react'
import { KIDS_CATEGORIES } from '../types/kids'
import { db } from '../lib/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { uploadFileToBestStorage } from '../lib/storage'

const MAX_KIDS_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024
const KIDS_RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function createMediaRecorderWithFallback(stream: MediaStream): { recorder: MediaRecorder; mimeType: string } {
  const supportedMimeType = KIDS_RECORDER_MIME_TYPES.find((mime) => {
    if (typeof MediaRecorder.isTypeSupported !== 'function') return false
    return MediaRecorder.isTypeSupported(mime)
  })

  const attempts: MediaRecorderOptions[] = []
  if (supportedMimeType) {
    attempts.push({ mimeType: supportedMimeType, audioBitsPerSecond: 160000 })
    attempts.push({ mimeType: supportedMimeType })
  }
  attempts.push({ audioBitsPerSecond: 160000 })
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

function mapKidsUploadError(error: unknown): string {
  const err = error as { code?: string; message?: string }
  const code = err?.code || ''
  if (code === 'storage/unauthorized') return 'Upload permission denied. Please ask an admin for access.'
  if (code === 'storage/retry-limit-exceeded') return 'Upload timed out. Please check connection and try again.'
  if (code === 'storage/quota-exceeded') return 'Storage is full. Please try again later.'
  if (err?.message) return err.message
  return 'Failed to upload. Please try again.'
}

export default function KidsRecordPage() {
  const [username, setUsername] = useState(() => localStorage.getItem('kidsUsername') || '')
  const [hasUsername, setHasUsername] = useState(() => !!localStorage.getItem('kidsUsername'))
  const [audience, setAudience] = useState<'child' | 'adult'>('child')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [mosque, setMosque] = useState('')
  const [recitationDetails, setRecitationDetails] = useState('')
  const [recitationFrom, setRecitationFrom] = useState('')
  const [recitationTo, setRecitationTo] = useState('')
  const [readingAmount, setReadingAmount] = useState('')
  const [submissionDate, setSubmissionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [contactEmail, setContactEmail] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('quran')
  const [isPlaying, setIsPlaying] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const waveformFrameRef = useRef<number | null>(null)

  const stopWaveform = () => {
    if (waveformFrameRef.current !== null) cancelAnimationFrame(waveformFrameRef.current)
    waveformFrameRef.current = null
    void audioContextRef.current?.close()
    audioContextRef.current = null
  }

  useEffect(() => () => stopWaveform(), [])

  const startWaveform = (stream: MediaStream) => {
    const canvas = waveformRef.current
    if (!canvas) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.75
    audioContext.createMediaStreamSource(stream).connect(analyser)
    audioContextRef.current = audioContext
    const samples = new Uint8Array(analyser.frequencyBinCount)
    const context = canvas.getContext('2d')

    const draw = () => {
      if (!context) return
      analyser.getByteTimeDomainData(samples)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#ecfdf5'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.strokeStyle = '#065f46'
      context.lineWidth = 3
      context.beginPath()
      samples.forEach((sample, index) => {
        const x = (index / (samples.length - 1)) * canvas.width
        const y = (sample / 255) * canvas.height
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.stroke()
      waveformFrameRef.current = requestAnimationFrame(draw)
    }
    draw()
  }

  const handleSetUsername = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      localStorage.setItem('kidsUsername', username.trim())
      setHasUsername(true)
    }
  }

  const startRecording = async () => {
    setErrorMessage('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone recording is not supported in this browser. Please use Chrome, Edge, Firefox, or Safari.')
      return
    }

    if (typeof MediaRecorder === 'undefined') {
      setErrorMessage('MediaRecorder is not available in this environment. Open in a normal browser window.')
      return
    }

    if (!window.isSecureContext) {
      setErrorMessage('Microphone access needs HTTPS or localhost.')
      return
    }

    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (permission.state === 'denied') {
          setErrorMessage('Microphone permission is blocked. Enable it in browser settings.')
          return
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      })
      const { recorder: mediaRecorder, mimeType } = createMediaRecorderWithFallback(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      requestAnimationFrame(() => startWaveform(stream))

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err: any) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setErrorMessage('Microphone permission denied. Please allow microphone access and try again.')
      } else if (name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and retry.')
      } else if (name === 'NotReadableError') {
        setErrorMessage('Microphone is busy. Close other apps using it, then retry.')
      } else {
        setErrorMessage('Could not start recording. Please check microphone access and try again.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    stopWaveform()
    setIsRecording(false)
  }

  const handleSubmit = async () => {
    const parsedAge = Number(age)
    if (!audioBlob || !title.trim() || !city.trim() || !mosque.trim() || !recitationDetails.trim() || !recitationFrom.trim() || !recitationTo.trim() || !readingAmount.trim() || !submissionDate || !contactEmail.trim()) {
      setErrorMessage('Please complete all recording details before submitting.')
      return
    }
    if (!Number.isInteger(parsedAge) || parsedAge < 3 || parsedAge > 120) {
      setErrorMessage('Please enter a valid age between 3 and 120.')
      return
    }

    setErrorMessage('')

    if (audioBlob.size > MAX_KIDS_UPLOAD_SIZE_BYTES) {
      setErrorMessage('Recording is too large. Please keep uploads under 50MB.')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload to cloud storage with Firebase-first + server fallback for CORS issues.
      const fileName = `quran-submissions/${username}-${Date.now()}.webm`
      const uploadFile = new File([audioBlob], `${username}-${Date.now()}.webm`, {
        type: audioBlob.type || 'audio/webm',
      })
      const downloadUrl = await uploadFileToBestStorage(uploadFile, fileName)

      // Save to Firestore
      const submissionData = {
        title: title.trim(),
        category: 'quran',
        username: username.trim(),
        audience,
        age: parsedAge,
        city: city.trim(),
        mosque: mosque.trim(),
        recitationDetails: recitationDetails.trim(),
        recitationFrom: recitationFrom.trim(),
        recitationTo: recitationTo.trim(),
        readingAmount: readingAmount.trim(),
        submissionDate,
        contactEmail: contactEmail.trim(),
        audioUrl: downloadUrl,
        fileName,
        fileSize: audioBlob.size,
        duration: recordingTime,
        submittedAt: Date.now(),
        status: 'pending',
      }

      const submission = await addDoc(collection(db, 'quranSubmissions'), submissionData)

      void fetch('/api/recording-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'submission', submissionId: submission.id, ...submissionData }),
      }).then((response) => {
        if (!response.ok) console.warn('[Quran recording] Notification email was not sent')
      }).catch((error) => console.warn('[Quran recording] Notification request failed', error))

      setSubmitted(true)
    } catch (error: unknown) {
      console.error('Upload error:', error)
      setErrorMessage(mapKidsUploadError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setTitle('')
    setCategory('quran')
    setRecitationDetails('')
    setRecitationFrom('')
    setRecitationTo('')
    setReadingAmount('')
    setSubmitted(false)
    setRecordingTime(0)
    setErrorMessage('')
  }

  // Username setup screen
  if (!hasUsername) {
    return (
      <div className="min-h-screen bg-[#f3f0e8] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-900/10 bg-[#fffdf7] p-4 text-center shadow-xl sm:p-8">
          <div className="w-20 h-20 rounded-2xl bg-emerald-950 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <BookOpen size={38} className="text-amber-300" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Quran Recording</h1>
          <p className="text-slate-600 mb-6">
            Children and adults can submit a recitation for private feedback and review.
          </p>

          <form onSubmit={handleSetUsername}>
            <div className="mb-4">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                <User size={20} className="text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-slate-800"
                  placeholder="Your name"
                  maxLength={20}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-lg font-bold transition-colors"
            >
              Continue to recorder
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f3f0e8] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-900/10 bg-[#fffdf7] p-4 text-center shadow-xl sm:p-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-emerald-950 mb-2">Recitation received</h1>
          <p className="text-slate-600 mb-6">
            Your recording has been submitted for review. An admin will check it and publish it soon!
          </p>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-emerald-800 mb-2">
              <Clock size={18} />
              <span className="font-medium">Status: Pending Review</span>
            </div>
            <p className="text-sm text-emerald-700">
              Feedback will be sent to the email address provided.
            </p>
          </div>

          <button
            onClick={reset}
            className="w-full py-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-lg font-bold transition-colors"
          >
            Record another recitation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f0e8] py-10 px-4" style={{ backgroundImage: 'linear-gradient(rgba(6,78,59,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(6,78,59,0.035) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      <style>{`
        @keyframes marquee-scroll-kids {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track-kids {
          animation: marquee-scroll-kids 20s linear infinite;
        }
        .marquee-track-kids:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 overflow-hidden rounded-2xl bg-emerald-950 text-white shadow-xl">
          <div className="border-b border-white/10 px-6 py-7 sm:px-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-amber-300">Hifz & recitation review</p>
                <h1 className="text-3xl font-bold">Quran Recording Studio</h1>
                <p className="mt-2 max-w-xl text-sm text-emerald-100">Record your assigned portion and receive private, constructive feedback.</p>
              </div>
              <BookOpen size={38} className="shrink-0 text-amber-300" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
            <div className="flex items-center gap-2 bg-emerald-950 px-5 py-3 text-xs text-emerald-100"><Volume2 size={15} className="text-amber-300" /> Quiet room</div>
            <div className="flex items-center gap-2 bg-emerald-950 px-5 py-3 text-xs text-emerald-100"><Headphones size={15} className="text-amber-300" /> Listen before sending</div>
            <div className="flex items-center gap-2 bg-emerald-950 px-5 py-3 text-xs text-emerald-100"><ShieldCheck size={15} className="text-amber-300" /> Private review</div>
          </div>
        </header>

        {/* Header */}
        <div className="bg-[#fffdf7] border border-emerald-900/10 rounded-xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <User size={22} className="text-emerald-800" />
              </div>
              <div>
                <h1 className="font-bold text-slate-800">Quran recording for {username}</h1>
                <p className="text-sm text-slate-500">Free during the introductory period</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                localStorage.removeItem('kidsUsername')
                setHasUsername(false)
                setUsername('')
              }}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Change Name
            </button>
          </div>
        </div>

        {/* Recording Interface */}
        <div className="bg-[#fffdf7] border border-emerald-900/10 rounded-2xl shadow-lg p-6 mb-6">
          {!audioBlob ? (
            <div className="text-center py-12">
              <div className="mb-8">
                {isRecording ? (
                  <div className="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center mx-auto animate-pulse">
                    <Square size={48} className="text-white" />
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    aria-label="Start Quran recording"
                    className="w-32 h-32 rounded-full border-8 border-emerald-100 bg-emerald-900 hover:bg-emerald-950 flex items-center justify-center mx-auto transition-colors shadow-xl"
                  >
                    <Mic size={48} className="text-white" />
                  </button>
                )}
              </div>

              <div className={`mx-auto mb-6 max-w-xl overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-2 ${isRecording ? 'block' : 'hidden'}`}>
                <canvas ref={waveformRef} width={720} height={120} className="h-28 w-full" aria-label="Live microphone waveform" />
              </div>

              {isRecording ? (
                <>
                  <p className="text-3xl font-bold text-slate-800 mb-4">{formatTime(recordingTime)}</p>
                  <button
                    onClick={stopRecording}
                    className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold"
                  >
                    Stop Recording
                  </button>
                </>
              ) : (
                <p className="text-slate-500">Tap the microphone to start recording</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div className="bg-slate-50 rounded-xl p-4">
                <audio ref={audioRef} src={audioUrl || ''} className="w-full" controls />
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" aria-label="Who is recording?">
                  {(['child', 'adult'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAudience(option)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${audience === option ? 'bg-emerald-900 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Recitation title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Surah Al-Fatihah"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">What are you reciting? *</label>
                  <textarea value={recitationDetails} onChange={(e) => setRecitationDetails(e.target.value)} rows={3} maxLength={300} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" placeholder="Surah, ayah range, or portion being practised" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Reading from *</label>
                    <input value={recitationFrom} onChange={(e) => setRecitationFrom(e.target.value)} maxLength={100} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" placeholder="e.g. Al-Baqarah, ayah 1" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Reading to *</label>
                    <input value={recitationTo} onChange={(e) => setRecitationTo(e.target.value)} maxLength={100} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" placeholder="e.g. Al-Baqarah, ayah 5" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Amount being read *</label>
                  <input value={readingAmount} onChange={(e) => setReadingAmount(e.target.value)} maxLength={100} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" placeholder="e.g. 5 ayat, half a page, or 1 ruk'u" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Submission date *</label>
                  <input type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Age *</label>
                    <input type="number" min="3" max="120" value={age} onChange={(e) => setAge(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">City *</label>
                    <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Mosque attending *</label>
                  <input value={mosque} onChange={(e) => setMosque(e.target.value)} maxLength={120} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" placeholder="Mosque name or None" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Email for feedback *</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400" placeholder="name@example.com" />
                  {audience === 'child' && <p className="mt-1 text-xs text-slate-500">Use a parent or guardian email for a child.</p>}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setAudioBlob(null)
                      setAudioUrl(null)
                    }}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Re-record
                  </button>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!title.trim() || !recitationDetails.trim() || !recitationFrom.trim() || !recitationTo.trim() || !readingAmount.trim() || !submissionDate || !age || !city.trim() || !mosque.trim() || !contactEmail.trim() || isSubmitting}
                    className="flex-1 py-3 bg-emerald-900 hover:bg-emerald-950 disabled:bg-slate-300 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit for Review
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Info */}
        <div className="bg-emerald-950 border border-emerald-900 rounded-xl p-4">
          <p className="text-sm text-emerald-100">
            <strong className="text-amber-300">Review process:</strong> An admin will listen to the selected Quran portion and send feedback to the email provided.
          </p>
        </div>
      </div>
    </div>
  )
}
