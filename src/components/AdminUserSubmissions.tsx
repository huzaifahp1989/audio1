import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, User, Trash2, Upload, Music2, Mail, Phone } from 'lucide-react'
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import type { UserSubmission } from '../types/kids'
import { db } from '../lib/firebase'
import { useAudioLibrary } from '../hooks/useAudioLibrary'

type Filter = 'pending' | 'all'

export default function AdminUserSubmissions() {
  const { refresh } = useAudioLibrary()
  const [submissions, setSubmissions] = useState<UserSubmission[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'userSubmissions'), orderBy('submittedAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: UserSubmission[] = []
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as UserSubmission))
        setSubmissions(items)
        setLoading(false)
        setLoadError('')
      },
      (error) => {
        console.error('[AdminUserSubmissions]', error)
        setLoading(false)
        setLoadError(
          error.message.includes('permission')
            ? 'Cannot load submissions — publish firestore.rules in Firebase Console.'
            : error.message
        )
      }
    )
    return () => unsubscribe()
  }, [])

  const pending = submissions.filter((s) => s.status === 'pending')
  const shown = filter === 'pending' ? pending : submissions

  const approve = async (submission: UserSubmission) => {
    await updateDoc(doc(db, 'userSubmissions', submission.id), {
      status: 'approved',
      reviewedAt: Date.now(),
    })
    await refresh()
  }

  const reject = async (submission: UserSubmission) => {
    await updateDoc(doc(db, 'userSubmissions', submission.id), {
      status: 'rejected',
      reviewedAt: Date.now(),
      rejectionReason: 'Rejected from admin dashboard',
    })
    await refresh()
  }

  const remove = async (submission: UserSubmission) => {
    if (!window.confirm(`Delete submission "${submission.title}"?`)) return
    await deleteDoc(doc(db, 'userSubmissions', submission.id))
    await refresh()
  }

  return (
    <div id="user-submissions" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload size={20} className="text-violet-600" />
            User Submissions
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {pending.length} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Uploads awaiting approval before they go live</p>
        </div>
        <Link
          to="/user-submissions-approval"
          className="text-sm font-semibold text-violet-600 hover:text-violet-800"
        >
          Open full review page →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['pending', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
              filter === f ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {f} {f === 'pending' ? `(${pending.length})` : `(${submissions.length})`}
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-6">Loading submissions…</p>
      ) : shown.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          <Music2 size={24} className="mx-auto mb-2 opacity-40" />
          No {filter} submissions.
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {shown.slice(0, 12).map((submission) => (
            <div
              key={submission.id}
              className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      submission.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : submission.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {submission.status}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{submission.category}</span>
                </div>
                <p className="font-semibold text-slate-800">{submission.title}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <User size={12} /> {submission.contributorName}
                  {submission.reciter ? ` · ${submission.reciter}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {submission.email && (
                    <span className="flex items-center gap-1"><Mail size={12} /> {submission.email}</span>
                  )}
                  {submission.mobile && (
                    <span className="flex items-center gap-1"><Phone size={12} /> {submission.mobile}</span>
                  )}
                </div>
                {submission.audioUrl && (
                  <audio src={submission.audioUrl} controls className="mt-2 w-full max-w-md h-8" />
                )}
              </div>
              {submission.status === 'pending' && (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => approve(submission)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(submission)}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(submission)}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold sm:self-start"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
