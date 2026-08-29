import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, User, Trash2, Mail, MessageSquarePlus, Music2 } from 'lucide-react'
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface NasheedRequest {
  id: string
  title: string
  artist: string
  requestedBy: string
  email: string
  notes?: string
  status: 'pending' | 'fulfilled' | 'rejected'
  submittedAt: number
  reviewedAt?: number
}

type Filter = 'pending' | 'all' | 'fulfilled' | 'rejected'

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${colors[color] || colors.slate}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] font-medium mt-1 opacity-80">{label}</p>
    </div>
  )
}

export default function AdminNasheedRequests() {
  const [requests, setRequests] = useState<NasheedRequest[]>([])
  const [filter, setFilter] = useState<Filter>('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'nasheedRequests'), orderBy('submittedAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: NasheedRequest[] = []
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as NasheedRequest))
        setRequests(items)
        setLoading(false)
      },
      () => setLoading(false)
    )
    return () => unsubscribe()
  }, [])

  const stats = {
    pending: requests.filter((r) => r.status === 'pending').length,
    fulfilled: requests.filter((r) => r.status === 'fulfilled').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }

  const filtered = requests.filter((r) => (filter === 'all' ? true : r.status === filter))

  const markFulfilled = async (req: NasheedRequest) => {
    await updateDoc(doc(db, 'nasheedRequests', req.id), { status: 'fulfilled', reviewedAt: Date.now() })
  }

  const markRejected = async (req: NasheedRequest) => {
    await updateDoc(doc(db, 'nasheedRequests', req.id), { status: 'rejected', reviewedAt: Date.now() })
  }

  const remove = async (req: NasheedRequest) => {
    if (!window.confirm(`Delete request for "${req.title}"?`)) return
    await deleteDoc(doc(db, 'nasheedRequests', req.id))
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })

  return (
    <div id="nasheed-requests" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquarePlus size={20} className="text-fuchsia-600" />
            Nasheed Requests
            {stats.pending > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {stats.pending} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">User requests from the Nasheeds page</p>
        </div>
        <div className="flex gap-2">
          <StatPill label="Pending" value={stats.pending} color="amber" />
          <StatPill label="Done" value={stats.fulfilled} color="green" />
          <StatPill label="Rejected" value={stats.rejected} color="red" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {(['pending', 'all', 'fulfilled', 'rejected'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-fuchsia-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'fulfilled' ? 'done' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Loading requests…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          <Music2 size={28} className="mx-auto mb-2 opacity-30" />
          No {filter === 'all' ? '' : filter} requests.
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {filtered.map((req) => (
            <div
              key={req.id}
              className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      req.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : req.status === 'fulfilled'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {req.status}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(req.submittedAt)}</span>
                </div>
                <p className="font-semibold text-slate-800">{req.title}</p>
                <p className="text-sm text-violet-700 font-medium mt-0.5">{req.artist}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <User size={12} /> {req.requestedBy}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Mail size={12} /> {req.email}
                  </span>
                </div>
                {req.notes && (
                  <p className="mt-2 text-xs text-slate-600 bg-white border border-slate-100 rounded-lg px-3 py-2">
                    {req.notes}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
                {req.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => markFulfilled(req)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold"
                    >
                      <CheckCircle size={14} /> Mark done
                    </button>
                    <button
                      type="button"
                      onClick={() => markRejected(req)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(req)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
