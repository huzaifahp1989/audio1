import React, { useEffect, useState } from 'react'
import { Upload, FileText, FileAudio, User, Mail, CheckCircle, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { uploadFileToBestStorage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useAuthModal } from '../context/AuthModalContext'
import { getMaxUploadBytes, formatMaxUploadLabel } from '../lib/uploadLimits'
import { trackEvent } from '../lib/analytics'
import { TALKS_TOPICS } from '../constants/categories'
import type { AudioCategory, NasheedLanguage } from '../types'

const SUBMISSION_CATEGORIES: { id: AudioCategory; label: string }[] = [
  { id: 'quran', label: 'Quran' },
  { id: 'nasheeds', label: 'Nasheeds' },
  { id: 'talks', label: 'Talks' },
]

function submissionCategoryFromQuery(value: string | null): AudioCategory {
  return SUBMISSION_CATEGORIES.find((option) => option.id === value)?.id ?? 'quran'
}

const ACCEPTED_AUDIO_TYPES = 'audio/*'

async function extractAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration)
      URL.revokeObjectURL(url)
    })
    audio.addEventListener('error', () => {
      resolve(undefined)
      URL.revokeObjectURL(url)
    })
    setTimeout(() => {
      resolve(undefined)
      URL.revokeObjectURL(url)
    }, 8000)
  })
}

export default function SubmitAudioPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const { openAuthModal } = useAuthModal()
  const isSignedIn = !!user
  const [name, setName] = useState(() => profile?.full_name || localStorage.getItem('submitName') || '')
  const [email, setEmail] = useState(() => user?.email || profile?.email || localStorage.getItem('submitEmail') || '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AudioCategory>(() => submissionCategoryFromQuery(searchParams.get('category')))
  const [reciter, setReciter] = useState('')
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState<NasheedLanguage | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name)
    if ((user?.email || profile?.email) && !email) {
      setEmail(user?.email || profile?.email || '')
    }
  }, [user, profile, name, email])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (selected) {
      if (!selected.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|opus|webm|flac)$/i.test(selected.name)) {
        setErrorMessage('Please choose a valid audio file.')
        setFile(null)
        setPreviewUrl(null)
        return
      }
      if (selected.size > getMaxUploadBytes(isSignedIn)) {
        setErrorMessage(`Audio file is too large. Max ${formatMaxUploadLabel(isSignedIn)}.`)
        setFile(null)
        setPreviewUrl(null)
        return
      }
      setErrorMessage('')
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
    } else {
      setFile(null)
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (!name.trim() || !email.trim() || !title.trim() || !reciter.trim() || !file) {
      setErrorMessage('Please complete all required fields and choose an audio file.')
      return
    }
    if (category === 'talks' && !topic) {
      setErrorMessage('Please choose a topic for your talk.')
      return
    }

    setSubmitting(true)
    try {
      localStorage.setItem('submitName', name.trim())
      localStorage.setItem('submitEmail', email.trim())

      const fileName = `user-submissions/${name.trim().replace(/\s+/g, '_')}-${Date.now()}-${file!.name}`
      const downloadUrl = await uploadFileToBestStorage(file!, fileName)
      const duration = await extractAudioDuration(file!)

      await addDoc(collection(db, 'userSubmissions'), {
        title: title.trim(),
        category,
        reciter: reciter.trim(),
        ...(category === 'talks' ? { topic } : {}),
        ...(category === 'nasheeds' && language ? { language } : {}),
        contributorName: name.trim(),
        email: email.trim(),
        submitterId: user?.id ?? null,
        description: description.trim(),
        audioUrl: downloadUrl,
        fileName,
        fileSize: file!.size,
        duration,
        submittedAt: Date.now(),
        status: 'pending',
      })
      trackEvent('submit_audio', { category, contributor: name.trim() })
      setSubmitted(true)
      setFile(null)
      setPreviewUrl(null)
      setTitle('')
      setDescription('')
      setReciter('')
      setTopic('')
      setLanguage('')
      setCategory('quran')
    } catch (error: unknown) {
      console.error('SubmitAudioPage error', error)
      const err = error as { message?: string; code?: string }
      const msg = err.message || ''
      if (msg.includes('permission') || err.code === 'permission-denied') {
        setErrorMessage(
          'Submission was blocked by Firestore security rules. Publish firestore.rules from this project in Firebase Console → Firestore → Rules.'
        )
      } else {
        setErrorMessage(msg || 'Unable to submit audio. Please try again later.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetSubmission = () => {
    setSubmitted(false)
    setErrorMessage('')
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Submit Your Audio</h1>
              <p className="mt-1 text-sm text-slate-500">
                Upload your Quran, nasheed, or talk. It will be approved by admin before going live.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isSignedIn && (
                <Link to="/my-submissions" className="text-sm font-semibold text-violet-700 hover:text-violet-900">
                  My submissions
                </Link>
              )}
              <div className="inline-flex items-center gap-2 rounded-3xl px-4 py-3 text-sm font-semibold bg-violet-50 text-violet-700">
                <Upload size={18} /> Pending review
              </div>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return
                  if (window.history.length > 1) navigate(-1)
                  else navigate('/')
                }}
                className="p-2 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isSignedIn && (
            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Create a free contributor account</p>
                <p className="mt-1 text-xs text-slate-600">Track your submissions and use your saved profile details next time.</p>
              </div>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Sign up or log in
              </button>
            </div>
          )}

          {submitted ? (
            <div className="mt-8 rounded-[1.75rem] border border-green-200 bg-green-50 p-4 text-center sm:mt-10 sm:p-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Submission received!
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Your audio is now in review. It will not appear on the site until an admin approves it at{' '}
                <strong>Admin → User Submissions</strong>.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={resetSubmission}
                  className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Submit another audio
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-submissions')}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View my submissions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) navigate(-1)
                    else navigate('/')
                  }}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Your name *</span>
                  <div className="mt-2 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <User size={18} className="text-slate-400" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full bg-transparent text-slate-900 outline-none"
                      placeholder="Name"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email *</span>
                  <div className="mt-2 flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Mail size={18} className="text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full bg-transparent text-slate-900 outline-none"
                      placeholder="Email"
                      required
                    />
                  </div>
                </label>
              </div>

              <div className={`grid gap-6 ${category === 'nasheeds' ? 'sm:grid-cols-2' : ''}`}>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    {category === 'quran' ? 'Reciter / Qari *' : category === 'nasheeds' ? 'Artist *' : 'Speaker *'}
                  </span>
                  <input
                    value={reciter}
                    onChange={(event) => setReciter(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                    placeholder={category === 'quran' ? 'Reciter name' : category === 'nasheeds' ? 'Artist name' : 'Speaker name'}
                    required
                  />
                </label>

                {category === 'nasheeds' && (
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Language</span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value as NasheedLanguage | '')}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                    >
                      <option value="">Select language (optional)</option>
                      <option value="english">English</option>
                      <option value="urdu">Urdu</option>
                      <option value="arabic">Arabic</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                )}

                {category === 'talks' && (
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Topic *</span>
                    <select
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                      required
                    >
                      <option value="">Choose a topic</option>
                      {TALKS_TOPICS.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Title *</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                    placeholder="Track title"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Category *</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as AudioCategory)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-violet-500"
                  >
                    {SUBMISSION_CATEGORIES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none focus:border-violet-500"
                  placeholder="Optional details for the admin"
                />
              </label>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Audio file *</span>
                  <div className="mt-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm">
                      <FileAudio size={30} />
                    </div>
                    <p className="text-sm text-slate-500">Upload MP3, WAV, WEBM, or other audio formats up to {formatMaxUploadLabel(isSignedIn)}.</p>
                    <input
                      type="file"
                      accept={ACCEPTED_AUDIO_TYPES}
                      onChange={handleFileChange}
                      className="mt-4 w-full text-sm text-slate-600"
                    />
                  </div>
                </label>

                {previewUrl ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{file?.name}</p>
                        <p className="text-xs text-slate-500">Preview your selected audio.</p>
                      </div>
                    </div>
                    <audio controls src={previewUrl} className="mt-4 w-full" />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    <p>No audio selected yet.</p>
                  </div>
                )}
              </div>

              {errorMessage ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-3xl bg-violet-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Upload size={16} />
                    Uploads are reviewed before publishing.
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-3xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:bg-slate-300"
                >
                  {submitting ? 'Uploading…' : 'Submit for review'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
