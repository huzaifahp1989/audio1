import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, User, Clock, Trash2, Mail, MapPin, Building2 } from 'lucide-react'
import { KIDS_CATEGORIES, type KidsSubmission } from '../types/kids'
import { formatDuration } from '../lib/storage'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { db, storage, ref, deleteObject } from '../lib/firebase'
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore'

export default function KidsApprovalPage() {
  const [submissions, setSubmissions] = useState<KidsSubmission[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [publishAs, setPublishAs] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({})
  const [sendingFeedbackId, setSendingFeedbackId] = useState<string | null>(null)
  const { refresh } = useAudioLibrary()

  const normalizePublishCategory = (cat: string | undefined): string => {
    const v = String(cat || '').toLowerCase()
    if (v === 'quran') return 'quran'
    if (v === 'nasheed' || v === 'nasheeds') return 'nasheed'
    if (v === 'talk' || v === 'talks') return 'talks'
    if (v === 'story' || v === 'stories') return 'story'
    return 'story'
  }

  useEffect(() => {
    // Subscribe to Firestore updates
    const q = query(collection(db, 'quranSubmissions'), orderBy('submittedAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs: KidsSubmission[] = []
      snapshot.forEach((doc) => {
        subs.push({ id: doc.id, ...doc.data() } as KidsSubmission)
      })
      setSubmissions(subs)
      setPublishAs((prev) => {
        const next = { ...prev }
        subs.forEach((s) => {
          if (!next[s.id]) next[s.id] = normalizePublishCategory(s.category)
        })
        return next
      })
    })

    return () => unsubscribe()
  }, [])

  const handleApprove = async (submission: KidsSubmission) => {
    try {
      const docRef = doc(db, 'quranSubmissions', submission.id)
      const category = normalizePublishCategory(publishAs[submission.id] || submission.category)
      await updateDoc(docRef, {
        status: 'approved',
        reviewedAt: Date.now(),
        category,
      })
      refresh()
      alert(`Approved "${submission.title}" by ${submission.username}`)
    } catch (error) {
      console.error('Error approving:', error)
      alert('Failed to approve. Please try again.')
    }
  }

  const handleReject = async (submission: KidsSubmission) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const docRef = doc(db, 'quranSubmissions', submission.id)
      await updateDoc(docRef, {
        status: 'rejected',
        reviewedAt: Date.now(),
        rejectionReason
      })
      setRejectingId(null)
      setRejectionReason('')
      refresh()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Failed to reject. Please try again.')
    }
  }

  const handleDelete = async (submission: KidsSubmission) => {
    if (!confirm('Are you sure you want to delete this submission?')) return
    try {
      if (submission.fileName) {
        try {
          await deleteObject(ref(storage, submission.fileName))
        } catch (e) {
          console.error('Failed to delete submission audio from storage:', e)
        }
      }
      await deleteDoc(doc(db, 'quranSubmissions', submission.id))
      refresh()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete. Please try again.')
    }
  }

  const startEditTitle = (submission: KidsSubmission) => {
    setEditingId(submission.id)
    setTitleDraft(submission.title || '')
  }

  const cancelEditTitle = () => {
    setEditingId(null)
    setTitleDraft('')
  }

  const saveEditTitle = async (submission: KidsSubmission) => {
    const nextTitle = titleDraft.trim()
    if (!nextTitle) return
    try {
      await updateDoc(doc(db, 'quranSubmissions', submission.id), { title: nextTitle })
      setEditingId(null)
      setTitleDraft('')
      refresh()
    } catch (error) {
      console.error('Error updating title:', error)
      alert('Failed to update title. Please try again.')
    }
  }

  const handleSendFeedback = async (submission: KidsSubmission) => {
    const feedback = (feedbackDrafts[submission.id] ?? submission.feedback ?? '').trim()
    if (!feedback) {
      alert('Please write feedback first.')
      return
    }
    if (!submission.contactEmail) {
      alert('This submission does not have a feedback email address.')
      return
    }

    setSendingFeedbackId(submission.id)
    try {
      const feedbackSentAt = Date.now()
      await updateDoc(doc(db, 'quranSubmissions', submission.id), { feedback, feedbackSentAt })
      const response = await fetch('/api/recording-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          submissionId: submission.id,
          title: submission.title,
          username: submission.username,
          contactEmail: submission.contactEmail,
          feedback,
        }),
      })
      if (!response.ok) throw new Error('Email service did not accept the message')
      alert(`Feedback sent to ${submission.contactEmail}`)
    } catch (error) {
      console.error('Error sending feedback:', error)
      alert('Feedback was saved, but the email could not be sent. Check the email service configuration.')
    } finally {
      setSendingFeedbackId(null)
    }
  }

  const filteredSubmissions = submissions.filter((s) =>
    filter === 'all' ? true : s.status === filter
  )

  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === 'pending').length,
    approved: submissions.filter((s) => s.status === 'approved').length,
    rejected: submissions.filter((s) => s.status === 'rejected').length,
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quran Recording Reviews</h1>
          <p className="text-slate-500">Review recitations from children and adults</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-4">
          <StatCard label="Pending" value={stats.pending} color="amber" />
          <StatCard label="Approved" value={stats.approved} color="green" />
          <StatCard label="Rejected" value={stats.rejected} color="red" />
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-violet-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length > 0 ? (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => {
            const category = KIDS_CATEGORIES.find((c) => c.id === submission.category)

            return (
              <div
                key={submission.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Status Badge */}
                  <div
                    className={`self-start px-3 py-1 rounded-full text-xs font-medium ${
                      submission.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : submission.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {submission.status}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center">
                      <span className="text-2xl">{category?.emoji || '🎵'}</span>
                      {editingId === submission.id ? (
                        <div className="flex flex-col gap-2 flex-1 min-w-0 sm:flex-row sm:items-center">
                          <input
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Title"
                          />
                          <button
                            onClick={() => saveEditTitle(submission)}
                            className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium sm:w-auto"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditTitle}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm sm:w-auto"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-bold text-lg text-slate-800">{submission.title}</h3>
                          <button
                            onClick={() => startEditTitle(submission)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 self-start sm:self-auto"
                          >
                            Edit title
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 text-sm text-slate-500 mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {submission.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(submission.submittedAt)}
                      </span>
                      {submission.duration && (
                        <span>{formatDuration(submission.duration)}</span>
                      )}
                      {submission.submissionDate && <span>Chosen date: {submission.submissionDate}</span>}
                      {submission.age && <span>{submission.audience === 'adult' ? 'Adult' : 'Child'}, age {submission.age}</span>}
                      {submission.city && <span className="flex items-center gap-1"><MapPin size={14} /> {submission.city}</span>}
                      {submission.mosque && <span className="flex items-center gap-1"><Building2 size={14} /> {submission.mosque}</span>}
                      {submission.contactEmail && <span className="flex items-center gap-1"><Mail size={14} /> {submission.contactEmail}</span>}
                    </div>

                    {submission.recitationDetails && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <strong>Reciting:</strong> {submission.recitationDetails}
                        {(submission.recitationFrom || submission.recitationTo) && <p className="mt-1"><strong>Range:</strong> {submission.recitationFrom} to {submission.recitationTo}</p>}
                        {submission.readingAmount && <p className="mt-1"><strong>Amount:</strong> {submission.readingAmount}</p>}
                      </div>
                    )}

                    {/* Audio Player */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                      <audio
                        src={submission.audioUrl}
                        controls
                        className="w-full"
                      />
                    </div>

                    <div className="mb-4 rounded-xl border border-slate-200 p-4">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Feedback for the reciter</label>
                      <textarea
                        value={feedbackDrafts[submission.id] ?? submission.feedback ?? ''}
                        onChange={(e) => setFeedbackDrafts((previous) => ({ ...previous, [submission.id]: e.target.value }))}
                        placeholder="Add clear, encouraging feedback on the recitation..."
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        rows={3}
                        maxLength={2000}
                      />
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                          {submission.feedbackSentAt ? `Last sent ${formatDate(submission.feedbackSentAt)}` : 'Feedback is saved with the submission and emailed to the adult or guardian.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleSendFeedback(submission)}
                          disabled={sendingFeedbackId === submission.id || !submission.contactEmail}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Mail size={16} /> {sendingFeedbackId === submission.id ? 'Sending...' : 'Save & send feedback'}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    {submission.status === 'pending' && (
                      <>
                        {rejectingId === submission.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Why are you rejecting this?"
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                              rows={2}
                            />
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                onClick={() => handleReject(submission)}
                                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium sm:w-auto"
                              >
                                Confirm Reject
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null)
                                  setRejectionReason('')
                                }}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm sm:w-auto"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <span className="text-sm text-slate-500">Publish as:</span>
                              <select
                                value={publishAs[submission.id] || normalizePublishCategory(submission.category)}
                                onChange={(e) => setPublishAs((prev) => ({ ...prev, [submission.id]: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white sm:w-auto"
                              >
                                <option value="quran">Quran</option>
                                <option value="nasheed">Nasheeds</option>
                                <option value="story">Stories</option>
                                <option value="talks">Talks</option>
                              </select>
                            </div>
                            <button
                              onClick={() => handleApprove(submission)}
                              className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium sm:w-auto"
                            >
                              <CheckCircle size={18} />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(submission.id)}
                              className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium sm:w-auto"
                            >
                              <XCircle size={18} />
                              Reject
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {submission.status === 'rejected' && submission.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                        <strong>Rejection reason:</strong> {submission.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(submission)}
                    className="inline-flex items-center justify-center self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:self-auto sm:border-0 sm:p-2 sm:text-slate-400 sm:hover:text-red-500"
                  >
                    <Trash2 size={18} />
                    <span className="ml-2 sm:hidden">Delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50 rounded-2xl">
          <CheckCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">No {filter} submissions found.</p>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'amber' | 'green' | 'red'
}) {
  const colors = {
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  }

  return (
    <div className={`px-4 py-2 rounded-xl ${colors[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-sm ml-2">{label}</span>
    </div>
  )
}
