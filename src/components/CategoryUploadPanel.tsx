import React, { useRef, useState } from 'react'

import { Upload, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react'

import { addDoc, collection } from 'firebase/firestore'

import { useAuth } from '../context/AuthContext'

import { useAudioLibrary } from '../hooks/useAudioLibrary'

import { db } from '../lib/firebase'

import { uploadFileToBestStorage } from '../lib/storage'

import {

  QURAN_RECITERS,

  NASHEED_ARTISTS,

  TALKS_SPEAKERS,

  TALKS_TOPICS,

  AUDIOBOOK_AUTHORS,

  HADITH_NARRATORS,

  DUA_CATEGORIES,

} from '../constants/categories'

import { getMaxUploadBytes, formatMaxUploadLabel } from '../lib/uploadLimits'

import type { AudioCategory } from '../types'



interface CategoryUploadPanelProps {

  category: AudioCategory

  className?: string

}



function contributorOptions(category: AudioCategory): string[] {

  switch (category) {

    case 'quran':

    case 'kids-quran':

      return QURAN_RECITERS

    case 'nasheeds':

    case 'kids-nasheeds':

      return NASHEED_ARTISTS

    case 'talks':

    case 'kids-talks':

      return TALKS_SPEAKERS

    case 'audiobooks':

      return AUDIOBOOK_AUTHORS

    case 'hadith':

      return HADITH_NARRATORS

    default:

      return ['Community Contributor', 'Other']

  }

}



function contributorLabel(category: AudioCategory): string {

  if (category === 'nasheeds' || category === 'kids-nasheeds') return 'Artist'

  if (category === 'talks' || category === 'kids-talks') return 'Speaker'

  if (category === 'audiobooks') return 'Author'

  if (category === 'hadith') return 'Narrator'

  if (category === 'dua') return 'Reciter'

  return 'Reciter'

}



function needsTopic(category: AudioCategory): boolean {

  return category === 'talks' || category === 'kids-talks' || category === 'dua'

}



function requiresAdminApproval(category: AudioCategory): boolean {

  return category === 'nasheeds' || category === 'talks'

}



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



export default function CategoryUploadPanel({ category, className = '' }: CategoryUploadPanelProps) {

  const { user, profile, loading: authLoading } = useAuth()

  const { uploadTrack, uploading, uploadError } = useAudioLibrary()

  const fileRef = useRef<HTMLInputElement>(null)



  const [open, setOpen] = useState(false)

  const [file, setFile] = useState<File | null>(null)

  const [title, setTitle] = useState('')

  const [reciter, setReciter] = useState('')

  const [customReciter, setCustomReciter] = useState('')

  const [topic, setTopic] = useState('')

  const [success, setSuccess] = useState(false)

  const [localError, setLocalError] = useState('')



  if (authLoading || !user) return null



  const needsApproval = requiresAdminApproval(category)

  const maxBytes = getMaxUploadBytes(true)

  const options = contributorOptions(category)

  const resolvedReciter = reciter === 'Other' ? customReciter.trim() : reciter



  const resetForm = () => {

    setFile(null)

    setTitle('')

    setReciter('')

    setCustomReciter('')

    setTopic('')

    setLocalError('')

    if (fileRef.current) fileRef.current.value = ''

  }



  const handleFileChange = (selected: File | null) => {

    setLocalError('')

    setSuccess(false)

    if (!selected) {

      setFile(null)

      return

    }

    if (!selected.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|opus|webm|flac)$/i.test(selected.name)) {

      setLocalError('Please choose a valid audio file.')

      setFile(null)

      return

    }

    if (selected.size > maxBytes) {

      setLocalError(`File is too large. Max ${formatMaxUploadLabel(true)} for signed-in uploads.`)

      setFile(null)

      return

    }

    setFile(selected)

    if (!title.trim()) {

      const base = selected.name.replace(/\.[^/.]+$/, '').replace(/[_\-\.]+/g, ' ').trim()

      if (base) setTitle(base.replace(/\b\w/g, (c) => c.toUpperCase()))

    }

  }



  const handleSubmit = async (event: React.FormEvent) => {

    event.preventDefault()

    setLocalError('')

    setSuccess(false)



    if (!file || !title.trim()) {

      setLocalError('Choose an audio file and enter a title.')

      return

    }

    if (!resolvedReciter) {

      setLocalError(`Please select or enter a ${contributorLabel(category).toLowerCase()}.`)

      return

    }

    if (needsTopic(category) && !topic) {

      setLocalError('Please select a topic/category.')

      return

    }



    try {

      if (needsApproval) {

        const contributorName = profile?.full_name || user.email?.split('@')[0] || 'Contributor'

        const email = user.email || profile?.email || ''

        const topicLabel =

          category === 'dua'

            ? DUA_CATEGORIES.find((item) => item.id === topic)?.label

            : TALKS_TOPICS.find((item) => item.id === topic)?.label



        const descriptionParts = [

          `${contributorLabel(category)}: ${resolvedReciter}`,

          topicLabel ? `Topic: ${topicLabel}` : '',

        ].filter(Boolean)



        const fileName = `user-submissions/${contributorName.replace(/\s+/g, '_')}-${Date.now()}-${file.name}`

        const downloadUrl = await uploadFileToBestStorage(file, fileName)

        const duration = await extractAudioDuration(file)



        const submissionData: Record<string, unknown> = {

          title: title.trim(),

          category,

          contributorName,

          email,

          reciter: resolvedReciter,

          description: descriptionParts.join(' · '),

          audioUrl: downloadUrl,

          fileName,

          fileSize: file.size,

          duration,

          submittedAt: Date.now(),

          status: 'pending',

        }

        if (needsTopic(category) && topic) {

          submissionData.topic = topic

        }

        await addDoc(collection(db, 'userSubmissions'), submissionData)



        setSuccess(true)

        resetForm()

        setTimeout(() => setSuccess(false), 5000)

        return

      }



      const ok = await uploadTrack(file, {

        title: title.trim(),

        category,

        reciter: resolvedReciter,

        topic: needsTopic(category) ? topic : undefined,

      })



      if (ok) {

        setSuccess(true)

        resetForm()

        setTimeout(() => setSuccess(false), 4000)

      }

    } catch (err: unknown) {

      console.error('[CategoryUploadPanel]', err)

      setLocalError(err instanceof Error ? err.message : 'Upload failed. Try again.')

    }

  }



  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Signed in'



  return (

    <div className={`rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-amber-50 ${className}`}>

      <button

        type="button"

        onClick={() => setOpen((value) => !value)}

        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"

      >

        <div className="flex items-center gap-3 min-w-0">

          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">

            <Upload size={18} className="text-teal-700" />

          </div>

          <div className="min-w-0">

            <p className="text-sm font-bold text-slate-800">

              {needsApproval ? 'Submit for review' : 'Upload to this page'}

            </p>

            <p className="text-xs text-slate-600 truncate">

              Signed in as {displayName} · up to {formatMaxUploadLabel(true)}

              {needsApproval ? ' · admin approval required' : ''}

            </p>

          </div>

        </div>

        {open ? <ChevronUp size={18} className="text-slate-500 shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}

      </button>



      {open && (

        <form onSubmit={handleSubmit} className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3 border-t border-teal-100/80 pt-4">

          {success && (

            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">

              <CheckCircle size={16} />

              {needsApproval

                ? 'Submitted for admin review — we\'ll publish it once approved!'

                : 'Published successfully!'}

            </div>

          )}

          {(localError || uploadError) && (

            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">

              <AlertCircle size={16} /> {localError || uploadError}

            </div>

          )}



          {needsApproval && (

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">

              Your upload will not appear publicly until an admin approves it.

            </p>

          )}



          <label className="block">

            <span className="text-xs font-semibold text-slate-600">Title *</span>

            <input

              value={title}

              onChange={(e) => setTitle(e.target.value)}

              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"

              placeholder="Track title"

            />

          </label>



          <label className="block">

            <span className="text-xs font-semibold text-slate-600">{contributorLabel(category)} *</span>

            <select

              value={reciter}

              onChange={(e) => setReciter(e.target.value)}

              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"

            >

              <option value="">Select…</option>

              {options.map((option) => (

                <option key={option} value={option}>{option}</option>

              ))}

            </select>

          </label>



          {reciter === 'Other' && (

            <input

              value={customReciter}

              onChange={(e) => setCustomReciter(e.target.value)}

              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"

              placeholder={`Custom ${contributorLabel(category).toLowerCase()}`}

            />

          )}



          {needsTopic(category) && (

            <label className="block">

              <span className="text-xs font-semibold text-slate-600">

                {category === 'dua' ? 'Dua category' : 'Topic'} *

              </span>

              <select

                value={topic}

                onChange={(e) => setTopic(e.target.value)}

                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"

              >

                <option value="">Select…</option>

                {(category === 'dua' ? DUA_CATEGORIES : TALKS_TOPICS).map((item) => (

                  <option key={item.id} value={item.id}>{item.label}</option>

                ))}

              </select>

            </label>

          )}



          <div className="flex flex-col sm:flex-row gap-2">

            <button

              type="button"

              onClick={() => fileRef.current?.click()}

              className="flex-1 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"

            >

              {file ? file.name : 'Choose audio file'}

            </button>

            <button

              type="submit"

              disabled={uploading}

              className="rounded-xl bg-gradient-to-r from-teal-600 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"

            >

              {uploading ? 'Uploading…' : needsApproval ? 'Submit for review' : 'Publish'}

            </button>

          </div>



          <input

            ref={fileRef}

            type="file"

            accept="audio/*"

            className="hidden"

            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}

          />

        </form>

      )}

    </div>

  )

}


