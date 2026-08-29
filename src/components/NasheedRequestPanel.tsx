import React, { useEffect, useState } from 'react'
import { MessageSquarePlus, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { NASHEED_ARTISTS } from '../constants/categories'

interface NasheedRequestPanelProps {
  defaultArtist?: string
  className?: string
}

export default function NasheedRequestPanel({ defaultArtist = '', className = '' }: NasheedRequestPanelProps) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [nasheedTitle, setNasheedTitle] = useState('')
  const [artist, setArtist] = useState(defaultArtist)
  const [customArtist, setCustomArtist] = useState('')
  const [name, setName] = useState(() => profile?.full_name || localStorage.getItem('submitName') || '')
  const [email, setEmail] = useState(() => user?.email || profile?.email || localStorage.getItem('submitEmail') || '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (defaultArtist && defaultArtist !== 'all') {
      setArtist(defaultArtist)
    }
  }, [defaultArtist])

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
    if (user?.email || profile?.email) setEmail(user?.email || profile?.email || '')
  }, [user, profile])

  const resolvedArtist = artist === 'Other' ? customArtist.trim() : artist

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nasheedTitle.trim() || !name.trim() || !email.trim()) {
      setError('Please enter the nasheed name, your name, and email.')
      return
    }
    if (!resolvedArtist) {
      setError('Please select or enter an artist.')
      return
    }

    setSubmitting(true)
    try {
      localStorage.setItem('submitName', name.trim())
      localStorage.setItem('submitEmail', email.trim())

      await addDoc(collection(db, 'nasheedRequests'), {
        title: nasheedTitle.trim(),
        artist: resolvedArtist,
        requestedBy: name.trim(),
        email: email.trim(),
        notes: notes.trim(),
        status: 'pending',
        submittedAt: Date.now(),
      })

      setSuccess(true)
      setNasheedTitle('')
      setNotes('')
      setCustomArtist('')
      if (!defaultArtist || defaultArtist === 'all') setArtist('')
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: unknown) {
      console.error('[NasheedRequest]', err)
      setError(err instanceof Error ? err.message : 'Could not submit request. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`rounded-2xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-violet-50 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
            <MessageSquarePlus size={18} className="text-fuchsia-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">Request a Nasheed</p>
            <p className="text-xs text-slate-600 truncate">Ask us to add a track or artist</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-500 shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-3 border-t border-fuchsia-100/80 pt-4">
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <CheckCircle size={16} /> Request sent — we&apos;ll review it soon!
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Nasheed title *</span>
            <input
              value={nasheedTitle}
              onChange={(e) => setNasheedTitle(e.target.value)}
              placeholder="e.g. Ya Nabi Salam Alayka"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Artist *</span>
            <select
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select artist…</option>
              {NASHEED_ARTISTS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          {artist === 'Other' && (
            <input
              value={customArtist}
              onChange={(e) => setCustomArtist(e.target.value)}
              placeholder="Artist name"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Your name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">Email *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Album, language, link, etc."
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm resize-none"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}
    </div>
  )
}
