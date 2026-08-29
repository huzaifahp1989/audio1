import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Square, Play, Pause, Users, Link as LinkIcon, Copy, Check, Volume2, VolumeX, Phone, PhoneOff, Download, Save, Edit3, Scissors, RotateCcw, ChevronRight, Clock, X, Headphones } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import WaveSurfer from 'wavesurfer.js'
import { saveDraft } from '../lib/indexedDb'

interface Participant {
  id: string
  name: string
  isHost: boolean
  isMuted: boolean
  stream?: MediaStream
  audioLevel: number
}

interface RecordingSession {
  hostTrack: Blob | null
  guestTrack: Blob | null
  mixedTrack: Blob | null
  duration: number
  startedAt: number
  endedAt: number | null
}

const LIVE_RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function createMediaRecorderWithFallback(stream: MediaStream): MediaRecorder {
  const supportedMimeType = LIVE_RECORDER_MIME_TYPES.find((mime) => {
    if (typeof MediaRecorder.isTypeSupported !== 'function') return false
    return MediaRecorder.isTypeSupported(mime)
  })

  const attempts: MediaRecorderOptions[] = []
  if (supportedMimeType) {
    attempts.push({ mimeType: supportedMimeType, audioBitsPerSecond: 192000 })
    attempts.push({ mimeType: supportedMimeType })
  }
  attempts.push({ audioBitsPerSecond: 192000 })
  attempts.push({})

  for (const options of attempts) {
    try {
      return new MediaRecorder(stream, options)
    } catch {
      // Try the next option.
    }
  }

  throw new Error('MediaRecorder initialization failed')
}

function stopRecorder(recorder: MediaRecorder | null): Promise<void> {
  if (!recorder || recorder.state === 'inactive') {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const onStop = () => {
      recorder.removeEventListener('stop', onStop)
      resolve()
    }
    recorder.addEventListener('stop', onStop)
    recorder.stop()
  })
}

export default function LiveRecordingPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [isHost, setIsHost] = useState(true)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [roomLink, setRoomLink] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [showEditor, setShowEditor] = useState(false)
  const [recordingSession, setRecordingSession] = useState<RecordingSession | null>(null)
  const [editingMode, setEditingMode] = useState(false)
  
  // Audio refs
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const guestRecorderRef = useRef<MediaRecorder | null>(null)
  const hostChunksRef = useRef<Blob[]>([])
  const guestChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    const link = `${window.location.origin}/live/${roomId || crypto.randomUUID()}`
    setRoomLink(link)
    initializeLocalStream()
    
    return () => {
      cleanup()
    }
  }, [roomId])

  const initializeLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      })
      localStreamRef.current = stream
      
      // Add host participant
      setParticipants([{
        id: 'host',
        name: 'You (Host)',
        isHost: true,
        isMuted: false,
        stream,
        audioLevel: 0
      }])

      // Setup WebRTC for guest connection
      setupPeerConnection(stream)
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }

  const setupPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    
    peerConnectionRef.current = pc
    
    // Add local stream
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })
    
    // Handle remote stream (guest)
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
      }
      
      // Add guest participant
      setParticipants(prev => [...prev, {
        id: 'guest',
        name: 'Guest',
        isHost: false,
        isMuted: false,
        stream: remoteStream,
        audioLevel: 0
      }])
    }
  }

  const startRecording = async () => {
    if (!localStreamRef.current) return
    
    hostChunksRef.current = []
    guestChunksRef.current = []
    
    // Record host audio
    const hostRecorder = createMediaRecorderWithFallback(localStreamRef.current)
    hostRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) hostChunksRef.current.push(e.data)
    }
    hostRecorder.start(100)
    mediaRecorderRef.current = hostRecorder
    
    // Record guest audio if connected
    if (remoteAudioRef.current?.srcObject) {
      const guestRecorder = createMediaRecorderWithFallback(remoteAudioRef.current.srcObject as MediaStream)
      guestRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) guestChunksRef.current.push(e.data)
      }
      guestRecorder.start(100)
      guestRecorderRef.current = guestRecorder
    } else {
      guestRecorderRef.current = null
    }
    
    setIsRecording(true)
    setRecordingSession({
      hostTrack: null,
      guestTrack: null,
      mixedTrack: null,
      duration: 0,
      startedAt: Date.now(),
      endedAt: null
    })
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
  }

  const stopRecording = async () => {
    await Promise.all([
      stopRecorder(mediaRecorderRef.current),
      stopRecorder(guestRecorderRef.current),
    ])
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    setIsRecording(false)
    
    // Create blobs from chunks
    const hostBlob = new Blob(hostChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' })
    const guestBlob = guestChunksRef.current.length > 0 
      ? new Blob(guestChunksRef.current, { type: guestRecorderRef.current?.mimeType || 'audio/webm' })
      : null
    
    setRecordingSession(prev => prev ? {
      ...prev,
      hostTrack: hostBlob,
      guestTrack: guestBlob,
      endedAt: Date.now(),
      duration: recordingTime
    } : null)
    
    setShowEditor(true)
    setRecordingTime(0)
  }

  const mixAudioTracks = async () => {
    if (!recordingSession?.hostTrack) return
    
    // Create audio context for mixing
    const audioContext = new AudioContext()
    
    // Decode host audio
    const hostArrayBuffer = await recordingSession.hostTrack.arrayBuffer()
    const hostBuffer = await audioContext.decodeAudioData(hostArrayBuffer)
    
    // Create mixed buffer
    const mixedBuffer = audioContext.createBuffer(
      2, // stereo
      hostBuffer.length,
      hostBuffer.sampleRate
    )
    
    // Copy host audio to both channels
    for (let channel = 0; channel < 2; channel++) {
      const mixedData = mixedBuffer.getChannelData(channel)
      const hostData = hostBuffer.getChannelData(0)
      
      for (let i = 0; i < hostBuffer.length; i++) {
        mixedData[i] = hostData[i] * 0.7 // Host at 70% volume
      }
    }
    
    // Add guest audio if available
    if (recordingSession.guestTrack) {
      const guestArrayBuffer = await recordingSession.guestTrack.arrayBuffer()
      const guestBuffer = await audioContext.decodeAudioData(guestArrayBuffer)
      
      for (let channel = 0; channel < 2; channel++) {
        const mixedData = mixedBuffer.getChannelData(channel)
        const guestData = guestBuffer.getChannelData(0)
        
        for (let i = 0; i < Math.min(mixedBuffer.length, guestBuffer.length); i++) {
          mixedData[i] += guestData[i] * 0.7 // Guest at 70% volume
        }
      }
    }
    
    // Convert back to blob
    const mixedBlob = await audioBufferToBlob(mixedBuffer)
    
    setRecordingSession(prev => prev ? {
      ...prev,
      mixedTrack: mixedBlob
    } : null)
    
    return mixedBlob
  }

  const audioBufferToBlob = async (buffer: AudioBuffer): Promise<Blob> => {
    const audioContext = new AudioContext()
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    )
    
    const source = offlineContext.createBufferSource()
    source.buffer = buffer
    source.connect(offlineContext.destination)
    source.start()
    
    const renderedBuffer = await offlineContext.startRendering()
    
    // Convert to WAV format
    const wavData = audioBufferToWav(renderedBuffer)
    return new Blob([wavData], { type: 'audio/wav' })
  }

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * 2 * buffer.numberOfChannels
    const arrayBuffer = new ArrayBuffer(44 + length)
    const view = new DataView(arrayBuffer)
    const channels: Float32Array[] = []
    
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }
    
    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, buffer.numberOfChannels, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * 2 * buffer.numberOfChannels, true)
    view.setUint16(32, buffer.numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length, true)
    
    // Write interleaved data
    const offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        view.setInt16(offset + (i * buffer.numberOfChannels + channel) * 2, sample * 0x7FFF, true)
      }
    }
    
    return arrayBuffer
  }

  const saveToDrafts = async () => {
    const mixedBlob = recordingSession?.mixedTrack || await mixAudioTracks()
    if (!mixedBlob) return
    
    const file = new File([mixedBlob], `podcast-recording-${Date.now()}.wav`, { type: 'audio/wav' })
    
    await saveDraft({
      id: crypto.randomUUID(),
      title: `Podcast Recording ${new Date().toLocaleString()}`,
      blob: mixedBlob,
      duration: recordingSession?.duration || 0,
      category: 'talks',
      reciter: 'Podcast Host',
      savedAt: Date.now(),
    })
    
    navigate('/record')
  }

  const downloadRecording = () => {
    const blob = recordingSession?.mixedTrack || recordingSession?.hostTrack
    if (!blob) return
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `podcast-recording-${Date.now()}.wav`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
      setParticipants(prev => prev.map(p => 
        p.isHost ? { ...p, isMuted: !isMuted } : p
      ))
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(roomLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    if (guestRecorderRef.current && guestRecorderRef.current.state !== 'inactive') guestRecorderRef.current.stop()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) peerConnectionRef.current.close()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-violet-500'
          }`}>
            {isRecording ? <Square size={20} /> : <Mic size={20} />}
          </div>
          <div>
            <h1 className="font-bold">{editingMode ? 'Edit Recording' : 'Podcast Recording'}</h1>
            <p className="text-xs text-slate-400">
              {isRecording ? `Recording... ${formatTime(recordingTime)}` : 
               showEditor ? 'Recording complete' : 
               'Ready to record'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRecording && !showEditor && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium"
            >
              <LinkIcon size={16} />
              Invite Guest
            </button>
          )}
          
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium"
            >
              <Square size={16} />
              Stop
            </button>
          ) : showEditor ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingMode(!editingMode)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium"
              >
                <Edit3 size={16} />
                {editingMode ? 'Done Editing' : 'Edit'}
              </button>
              <button
                onClick={saveToDrafts}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
              >
                <Save size={16} />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium"
            >
              <Mic size={16} />
              Record
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {!showEditor ? (
          <>
            {/* Participants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`relative p-6 rounded-2xl border-2 ${
                    participant.isHost ? 'bg-violet-900/30 border-violet-500' : 'bg-emerald-900/30 border-emerald-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                      participant.isHost ? 'bg-violet-500' : 'bg-emerald-500'
                    }`}>
                      {participant.name[0]}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{participant.name}</h3>
                      <p className="text-sm text-slate-400">
                        {participant.isHost ? 'Host' : 'Guest'}
                        {participant.isMuted && ' • Muted'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {participant.isMuted ? (
                        <VolumeX size={20} className="text-red-400" />
                      ) : (
                        <div className="flex gap-0.5">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full transition-all ${
                                isRecording ? 'bg-green-400 animate-pulse' : 'bg-slate-600'
                              }`}
                              style={{ 
                                height: `${12 + Math.random() * 16}px`,
                                animationDelay: `${i * 0.1}s`
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {participants.length === 1 && (
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center">
                  <div className="text-center">
                    <Users size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-slate-500">Waiting for guest...</p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="mt-3 text-violet-400 hover:text-violet-300 text-sm"
                    >
                      Send invitation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isRecording ? <Square size={32} /> : <Mic size={32} />}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Editor */}
            <div className="bg-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Recording Editor</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>

              {/* Waveform */}
              <div 
                ref={waveformRef}
                className="h-32 bg-slate-900 rounded-xl mb-4"
              />

              {/* Playback controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full">
                  <RotateCcw size={20} />
                </button>
                <button className="p-4 bg-violet-600 hover:bg-violet-700 rounded-full">
                  <Play size={24} />
                </button>
                <button className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full">
                  <Scissors size={20} />
                </button>
              </div>

              {/* Track info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-1">Host Track</p>
                  <p className="font-medium">{recordingSession?.hostTrack ? '✓ Recorded' : '—'}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-1">Guest Track</p>
                  <p className="font-medium">{recordingSession?.guestTrack ? '✓ Recorded' : '—'}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-sm text-slate-400 mb-1">Duration</p>
                  <p className="font-medium">{formatTime(recordingSession?.duration || 0)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white text-slate-900 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Invite Guest</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-slate-600 mb-4">
              Share this link with your guest to join the recording session:
            </p>

            <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl mb-4">
              <input
                type="text"
                value={roomLink}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={copyLink}
                className="flex items-center gap-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> Guest will be able to join and record audio with you in real-time.
              </p>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}
