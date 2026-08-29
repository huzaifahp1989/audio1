import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, User, Clock, Trash2, Mail, Phone } from 'lucide-react'
import type { UserSubmission } from '../types/kids'
import { formatDuration } from '../lib/storage'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { db, storage, ref, deleteObject } from '../lib/firebase'
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore'
import { Navigate } from 'react-router-dom'
import { useAdminAccess } from '../hooks/useAdminAccess'
import { ADMIN_CATEGORY_OPTIONS, formatCategoryLabel, UNCATEGORIZED_CATEGORY } from '../constants/categories'

const CUSTOM_CATEGORY_VALUE = '__custom__'

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
  }
  return (
    <div className={`rounded-2xl ${colorMap[color] || colorMap.amber} px-4 py-3 text-sm`}>
      <p className="font-semibold">{value}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  )
}

export default function UserSubmissionsApprovalPage() {
  const { hasAccess, loading: authLoading } = useAdminAccess()
  const [submissions, setSubmissions] = useState<UserSubmission[]>([])
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryDraft, setCategoryDraft] = useState('')
  const [customCategoryDraft, setCustomCategoryDraft] = useState('')
  const { refresh } = useAudioLibrary()

  useEffect(() => {
    const q = query(collection(db, 'userSubmissions'), orderBy('submittedAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const subs: UserSubmission[] = []
        snapshot.forEach((d) => {
          subs.push({ id: d.id, ...d.data() } as UserSubmission)
        })
        setSubmissions(subs)
        setLoadError('')
      },
      (error) => {
        console.error('[UserSubmissions] listener failed', error)
        setLoadError(
          error.message.includes('permission')
            ? 'Cannot load submissions — check Firestore security rules for userSubmissions.'
            : `Failed to load submissions: ${error.message}`
        )
      }
    )

    return () => unsubscribe()
  }, [])

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center text-slate-500 text-sm">
        Loading…
      </div>
    )
  }

  if (!hasAccess) {
    return <Navigate to="/admin" replace />
  }

  const handleApprove = async (submission: UserSubmission) => {
    try {
      const docRef = doc(db, 'userSubmissions', submission.id)
      await updateDoc(docRef, {
        status: 'approved',
        reviewedAt: Date.now(),
      })
      refresh()
      alert(`Approved "${submission.title}" by ${submission.contributorName}`)
    } catch (error) {
      console.error('Error approving:', error)
      alert('Failed to approve. Please try again.')
    }
  }

  const handleReject = async (submission: UserSubmission) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const docRef = doc(db, 'userSubmissions', submission.id)
      await updateDoc(docRef, {
        status: 'rejected',
        reviewedAt: Date.now(),
        rejectionReason,
      })
      setRejectingId(null)
      setRejectionReason('')
      refresh()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Failed to reject. Please try again.')
    }
  }

  const handleDelete = async (submission: UserSubmission) => {
    if (!confirm('Are you sure you want to delete this submission?')) return
    try {
      if (submission.fileName) {
        try {
          await deleteObject(ref(storage, submission.fileName))
        } catch (e) {
          console.error('Failed to delete submission audio from storage:', e)
        }
      }
      await deleteDoc(doc(db, 'userSubmissions', submission.id))
      refresh()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete. Please try again.')
    }
  }

  const startEditTitle = (submission: UserSubmission) => {
    setEditingId(submission.id)
    setTitleDraft(submission.title || '')
  }

  const cancelEditTitle = () => {
    setEditingId(null)
    setTitleDraft('')
  }

  const saveEditTitle = async (submission: UserSubmission) => {
    const nextTitle = titleDraft.trim()
    if (!nextTitle) return
    try {
      await updateDoc(doc(db, 'userSubmissions', submission.id), { title: nextTitle })
      setEditingId(null)
      setTitleDraft('')
      refresh()
    } catch (error) {
      console.error('Error updating title:', error)
      alert('Failed to update title. Please try again.')
    }
  }

  const startEditCategory = (submission: UserSubmission) => {
    const hasBuiltInCategory = ADMIN_CATEGORY_OPTIONS.some((option) => option.value === submission.category)
    setEditingCategoryId(submission.id)
    setCategoryDraft(hasBuiltInCategory ? submission.category : CUSTOM_CATEGORY_VALUE)
    setCustomCategoryDraft(hasBuiltInCategory ? '' : submission.category)
  }

  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setCategoryDraft('')
    setCustomCategoryDraft('')
  }

  const saveEditCategory = async (submission: UserSubmission) => {
    const nextCategory = (categoryDraft === CUSTOM_CATEGORY_VALUE ? customCategoryDraft : categoryDraft).trim() || UNCATEGORIZED_CATEGORY
    try {
      await updateDoc(doc(db, 'userSubmissions', submission.id), { category: nextCategory })
      setEditingCategoryId(null)
      setCategoryDraft('')
      setCustomCategoryDraft('')
      refresh()
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category. Please try again.')
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
          <h1 className="text-2xl font-bold text-slate-800">User Submissions</h1>
          <p className="text-slate-500">Review and approve user-submitted audio</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-4">
          <StatCard label="Pending" value={stats.pending} color="amber" />
          <StatCard label="Approved" value={stats.approved} color="green" />
          <StatCard label="Rejected" value={stats.rejected} color="red" />
        </div>
      </div>

      {loadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

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
          {filteredSubmissions.map((submission) => (
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
                  {/* Title Edit */}
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
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
                        {submission.status === 'pending' && (
                          <button
                            onClick={() => startEditTitle(submission)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 self-start sm:self-auto"
                          >
                            Edit title
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-3 text-sm text-slate-500 mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    {editingCategoryId === submission.id ? (
                      <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center">
                        <select
                          value={categoryDraft}
                          onChange={(e) => setCategoryDraft(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white sm:w-auto"
                        >
                          {ADMIN_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                          <option value={CUSTOM_CATEGORY_VALUE}>Custom category…</option>
                        </select>
                        {categoryDraft === CUSTOM_CATEGORY_VALUE && (
                          <input
                            value={customCategoryDraft}
                            onChange={(e) => setCustomCategoryDraft(e.target.value)}
                            placeholder="New category"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm sm:w-auto"
                          />
                        )}
                        <button
                          onClick={() => saveEditCategory(submission)}
                          className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium sm:w-auto"
                        >
                          Save category
                        </button>
                        <button
                          onClick={cancelEditCategory}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                          {formatCategoryLabel(submission.category || UNCATEGORIZED_CATEGORY)}
                        </span>
                        {submission.status === 'pending' && (
                          <button
                            onClick={() => startEditCategory(submission)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 self-start"
                          >
                            Edit category
                          </button>
                        )}
                      </>
                    )}
                    {submission.reciter && (
                      <span className="text-slate-600">Artist/Speaker: {submission.reciter}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {submission.contributorName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      {submission.email}
                    </span>
                    {submission.mobile && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {submission.mobile}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(submission.submittedAt)}
                    </span>
                    {submission.duration && (
                      <span>{formatDuration(submission.duration)}</span>
                    )}
                  </div>

                  {/* Description */}
                  {submission.description && (
                    <p className="text-sm text-slate-600 mb-4 bg-slate-50 rounded-lg p-3">{submission.description}</p>
                  )}

                  {/* Audio Player */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <audio
                      src={submission.audioUrl}
                      controls
                      className="w-full"
                    />
                  </div>

                  {/* Actions */}
                  {submission.status === 'pending' && (
                    <>
                      {rejectingId === submission.id ? (
                        <div className="space-y-3 mb-4">
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
                        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:flex-wrap sm:items-center">
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

                  {/* Rejection Reason */}
                  {submission.status === 'rejected' && submission.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                      <strong>Rejection reason:</strong> {submission.rejectionReason}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(submission)}
                    className="w-full px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium sm:w-auto"
                  >
                    <Trash2 size={16} className="inline mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500">No {filter} submissions found.</p>
        </div>
      )}
    </div>
  )
}
