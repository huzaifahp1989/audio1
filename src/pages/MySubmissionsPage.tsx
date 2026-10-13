import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, FileAudio, Upload } from 'lucide-react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useAuthModal } from '../context/AuthModalContext'
import { db } from '../lib/firebase'
import { formatCategoryLabel } from '../constants/categories'
import { formatDuration } from '../lib/storage'
import type { UserSubmission } from '../types/kids'

const STATUS_STYLES: Record<UserSubmission['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
}

export default function MySubmissionsPage() {
  const { user, loading: authLoading } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [submissions, setSubmissions] = useState<UserSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setSubmissions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const submissionsQuery = query(
      collection(db, 'userSubmissions'),
      where('submitterId', '==', user.id)
    )
    const unsubscribe = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((submission) => ({ id: submission.id, ...submission.data() }) as UserSubmission)
          .sort((first, second) => second.submittedAt - first.submittedAt)
        setSubmissions(items)
        setError('')
        setLoading(false)
      },
      (loadError) => {
        console.error('[MySubmissions] failed to load', loadError)
        setError('Unable to load your submissions. Please try again later.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [authLoading, user?.id])

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--theme-brand)]">Contributor area</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--theme-ink)] sm:text-3xl">My submissions</h1>
          <p className="mt-2 text-sm text-[var(--theme-muted)]">Check review status for audio you have submitted.</p>
        </div>
        <Link
          to="/submit-audio"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--theme-brand)] px-4 py-2 text-sm font-semibold text-white"
        >
          <Upload size={16} /> Submit audio
        </Link>
      </header>

      {authLoading || loading ? (
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 text-sm text-[var(--theme-muted)]">
          Loading submissions…
        </div>
      ) : !user ? (
        <section className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6">
          <p className="font-semibold text-[var(--theme-ink)]">Sign in to view your submissions</p>
          <p className="mt-1 text-sm text-[var(--theme-muted)]">New uploads are linked to your contributor account.</p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--theme-brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            Log in or sign up
          </button>
        </section>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      ) : submissions.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] p-8 text-center">
          <FileAudio size={28} className="mx-auto text-[var(--theme-muted)]" />
          <p className="mt-3 font-semibold text-[var(--theme-ink)]">No submissions yet</p>
          <p className="mt-1 text-sm text-[var(--theme-muted)]">Your Quran, Nasheed, and Talk uploads will appear here.</p>
        </section>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <article key={submission.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-[var(--theme-ink)]">{submission.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--theme-muted)]">
                    <span className="rounded-full bg-[var(--theme-soft)] px-2.5 py-1">
                      {formatCategoryLabel(submission.category)}
                    </span>
                    {submission.reciter && <span>{submission.reciter}</span>}
                    {submission.topic && <span>{submission.topic}</span>}
                    {submission.language && <span>{submission.language}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} /> {new Date(submission.submittedAt).toLocaleDateString()}
                    </span>
                    {submission.duration && <span>{formatDuration(submission.duration)}</span>}
                  </div>
                </div>
                <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[submission.status] || STATUS_STYLES.pending}`}>
                  {submission.status || 'pending'}
                </span>
              </div>
              {submission.rejectionReason && (
                <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                  Review note: {submission.rejectionReason}
                </p>
              )}
              <audio src={submission.audioUrl} controls preload="none" className="mt-4 w-full" />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}