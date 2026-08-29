import React, { useState, useRef, useEffect } from 'react'
import { X, Check, Loader2, FileText, AlertCircle, Mic, Square, Volume2 } from 'lucide-react'
import { isWebSpeechSupported, transcribeWithWebSpeech, transcribeAudio } from '../lib/transcription'

interface TranscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (text: string) => void
  initialText: string
  isLoading: boolean
  error: string | null
  fileName: string
  audioFile?: File | null
  useWebSpeech?: boolean
}

export default function TranscriptionModal({
  isOpen,
  onClose,
  onApply,
  initialText,
  isLoading: externalLoading,
  error: externalError,
  fileName,
  audioFile,
  useWebSpeech = true,
}: TranscriptionModalProps) {
  const [text, setText] = useState(initialText)
  const [isRecording, setIsRecording] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [useServerFallback, setUseServerFallback] = useState(false)
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null)

  const webSpeechAvailable = isWebSpeechSupported()
  const showWebSpeechOption = useWebSpeech && webSpeechAvailable && !useServerFallback

  useEffect(() => {
    setText(initialText)
  }, [initialText])

  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false)
      setLocalError(null)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isOpen])

  const handleStartWebSpeech = () => {
    setLocalError(null)
    setText('')
    setIsRecording(true)

    recognitionRef.current = transcribeWithWebSpeech(
      (newText, isFinal) => {
        setText(newText)
        if (isFinal) {
          setIsRecording(false)
        }
      },
      (error) => {
        setLocalError(error)
        setIsRecording(false)
      }
    )

    recognitionRef.current.start()
  }

  const handleStopWebSpeech = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
  }

  const handleUseServerFallback = () => {
    setUseServerFallback(true)
    setLocalError(null)
    if (audioFile) {
      handleServerTranscribe()
    }
  }

  const handleServerTranscribe = async () => {
    if (!audioFile) return
    
    setIsTranscribing(true)
    setLocalError(null)
    
    const result = await transcribeAudio(audioFile)
    
    if (result.success) {
      setText(result.text)
    } else {
      setLocalError(result.error || 'Transcription failed')
    }
    
    setIsTranscribing(false)
  }

  const handleApply = () => {
    onApply(text)
    onClose()
  }

  const handleClose = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
    onClose()
  }

  if (!isOpen) return null

  const isLoading = externalLoading || isTranscribing
  const error = externalError || localError

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <FileText size={20} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Transcription</h3>
              <p className="text-sm text-slate-500 truncate max-w-xs">{fileName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={48} className="text-violet-500 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Transcribing audio...</p>
              <p className="text-sm text-slate-400 mt-1">This may take a moment</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <p className="text-red-600 font-medium">Transcription failed</p>
              <p className="text-sm text-slate-500 mt-1 text-center max-w-md">{error}</p>
              {!useServerFallback && audioFile && (
                <button
                  onClick={handleUseServerFallback}
                  className="mt-4 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Try Server Transcription
                </button>
              )}
            </div>
          ) : showWebSpeechOption && !text ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
                <Mic size={32} className="text-violet-600" />
              </div>
              <p className="text-slate-700 font-medium text-center">Use Free Web Speech API</p>
              <p className="text-sm text-slate-500 mt-2 text-center max-w-md">
                Click the button below and play your audio. The browser will transcribe it in real-time.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={handleStartWebSpeech}
                  disabled={isRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
                >
                  {isRecording ? (
                    <>
                      <Volume2 size={18} className="animate-pulse" />
                      Listening... Click Stop when done
                    </>
                  ) : (
                    <>
                      <Mic size={18} />
                      Start Transcription
                    </>
                  )}
                </button>
                
                {isRecording && (
                  <button
                    onClick={handleStopWebSpeech}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all"
                  >
                    <Square size={18} />
                    Stop & Save
                  </button>
                )}
                
                {audioFile && (
                  <button
                    onClick={handleUseServerFallback}
                    className="text-sm text-slate-400 hover:text-violet-600 underline"
                  >
                    Or use server transcription (requires API key)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700">
                Edit the transcription before applying:
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Transcription will appear here..."
                rows={12}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-y font-mono leading-relaxed"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{text.length} characters</span>
                <span>{showWebSpeechOption ? 'Powered by Web Speech API (Free)' : 'Powered by OpenAI Whisper'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isRecording}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {text && !isLoading && (
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
            >
              <Check size={16} />
              Apply Transcription
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
