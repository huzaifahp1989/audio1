/**
 * Transcribe audio using Web Speech API (free, browser-native)
 * Falls back to server-side OpenAI Whisper if Web Speech API is not available
 */

export interface TranscriptionResult {
  text: string
  success: boolean
  error?: string
}

/**
 * Check if Web Speech API is supported
 */
export function isWebSpeechSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

/**
 * Transcribe audio using Web Speech API
 * This is completely free and runs in the browser
 */
export function transcribeWithWebSpeech(
  onResult: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void
): { start: () => void; stop: () => void } {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    onError('Web Speech API not supported in this browser')
    return { start: () => {}, stop: () => {} }
  }

  const recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-US'

  let finalTranscript = ''

  recognition.onresult = (event: any) => {
    let interimTranscript = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' '
      } else {
        interimTranscript += transcript
      }
    }
    
    onResult(finalTranscript + interimTranscript, false)
  }

  recognition.onend = () => {
    onResult(finalTranscript.trim(), true)
  }

  recognition.onerror = (event: any) => {
    onError(event.error || 'Speech recognition error')
  }

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  }
}

/**
 * Transcribe audio file using server-side API (OpenAI Whisper)
 * Use this as fallback when Web Speech API is not available
 */
export async function transcribeAudio(audioFile: File): Promise<TranscriptionResult> {
  try {
    const formData = new FormData()
    formData.append('audio', audioFile)

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      return {
        text: '',
        success: false,
        error: error.error || 'Failed to transcribe audio',
      }
    }

    const data = await response.json()
    return {
      text: data.text || '',
      success: true,
    }
  } catch (error: any) {
    return {
      text: '',
      success: false,
      error: error.message || 'Network error during transcription',
    }
  }
}

/**
 * Check if transcription is supported for this file
 * - File must be audio
 * - File size must be under 25MB (Whisper limit)
 */
export function canTranscribe(file: File | null): boolean {
  if (!file) return false
  if (!file.type.startsWith('audio/')) return false
  if (file.size > 25 * 1024 * 1024) return false // 25MB limit
  return true
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
