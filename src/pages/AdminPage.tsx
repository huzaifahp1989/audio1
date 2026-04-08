import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Shield, Upload, Trash2, LogOut, CheckCircle, AlertCircle, FileAudio, X, Layers, Pencil, Save, FolderOpen, Clock, ChevronRight, Play, FileText } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import type { BulkUploadItem, BulkUploadResult } from '../hooks/useAudioLibrary'
import { ADMIN_PASSWORD, ALL_CATEGORIES_LIST, QURAN_RECITERS, NASHEED_ARTISTS, TALKS_SPEAKERS, TALKS_TOPICS, AUDIOBOOK_AUTHORS, HADITH_NARRATORS, DUA_CATEGORIES } from '../constants/categories'
import type { AudioCategory } from '../types'
import type { AudioTrack } from '../types'
import { formatFileSize, formatDuration } from '../lib/storage'
import { getAllDrafts, deleteDraft, type RecordingDraft } from '../lib/indexedDb'

const SESSION_KEY = 'admin_authenticated'

function getRecitersForCategory(cat: AudioCategory): string[] {
  if (cat === 'quran') return QURAN_RECITERS
  if (cat === 'nasheeds') return NASHEED_ARTISTS
  if (cat === 'talks') return TALKS_SPEAKERS
  if (cat === 'audiobooks') return AUDIOBOOK_AUTHORS
  if (cat === 'hadith') return HADITH_NARRATORS
  return []
}

function supportsTextContent(cat: AudioCategory): boolean {
  return cat === 'audiobooks' || cat === 'hadith' || cat === 'dua'
}

// ── Login ──────────────────────────────────────────────────────────────────
function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onLogin()
    } else {
      setError('Incorrect password. Try again.')
      setPwd('')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Access</h1>
          <p className="text-slate-500 text-sm mt-2">Enter the admin password to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError('') }}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 transition-colors text-white font-semibold py-3 rounded-xl text-sm shadow-sm"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-slate-400 text-xs mt-6">Default password: admin123</p>
      </div>
    </div>
  )
}

// ── Bulk upload row ────────────────────────────────────────────────────────
interface BulkRow {
  id: string
  file: File
  title: string
  category: AudioCategory
  reciter: string
  customReciter: string
}

function BulkRowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: BulkRow
  onChange: (updated: BulkRow) => void
  onRemove: () => void
}) {
  const reciters = getRecitersForCategory(row.category)
  const showCustom = reciters.length === 0 || row.reciter === 'Other'
  const effectiveReciter = showCustom ? row.customReciter : row.reciter

  const set = (patch: Partial<BulkRow>) => onChange({ ...row, ...patch })

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <FileAudio size={14} className="text-violet-500 shrink-0" />
        <span className="text-xs text-slate-500 truncate font-medium">{row.file.name}</span>
        <span className="text-xs text-slate-400 ml-auto shrink-0">{formatFileSize(row.file.size)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Title *"
          value={row.title}
          onChange={(e) => set({ title: e.target.value })}
          className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-400 col-span-1 sm:col-span-1"
        />
        <select
          value={row.category}
          onChange={(e) => set({ category: e.target.value as AudioCategory, reciter: '', customReciter: '' })}
          className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-400"
        >
          {ALL_CATEGORIES_LIST.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {reciters.length > 0 ? (
          <select
            value={row.reciter}
            onChange={(e) => set({ reciter: e.target.value })}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-400"
          >
            <option value="">-- Reciter/Artist --</option>
            {reciters.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="Other">Other...</option>
          </select>
        ) : (
          <input
            type="text"
            placeholder="Speaker / Artist *"
            value={row.customReciter}
            onChange={(e) => set({ customReciter: e.target.value })}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-400"
          />
        )}
      </div>
      {row.reciter === 'Other' && (
        <input
          type="text"
          placeholder="Enter name..."
          value={row.customReciter}
          onChange={(e) => set({ customReciter: e.target.value })}
          className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-violet-400"
        />
      )}
      <p className="text-xs text-slate-400 hidden">Effective reciter: {effectiveReciter}</p>
    </div>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({
  track,
  onSave,
  onClose,
}: {
  track: AudioTrack
  onSave: (patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic'>>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(track.title)
  const [category, setCategory] = useState<AudioCategory>(track.category)
  const [reciter, setReciter] = useState(() => {
    const reciters = getRecitersForCategory(track.category)
    return reciters.includes(track.reciter) ? track.reciter : 'Other'
  })
  const [customReciter, setCustomReciter] = useState(() => {
    const reciters = getRecitersForCategory(track.category)
    return reciters.includes(track.reciter) ? '' : track.reciter
  })
  const [topic, setTopic] = useState(track.topic || '')

  const reciters = getRecitersForCategory(category)
  const showCustom = reciters.length === 0 || reciter === 'Other'
  const effectiveReciter = showCustom ? customReciter : reciter

  const handleCategoryChange = (cat: AudioCategory) => {
    setCategory(cat)
    setReciter('')
    setCustomReciter('')
    if (cat !== 'talks') setTopic('')
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !effectiveReciter.trim()) return
    const patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic'>> = { 
      title: title.trim(), 
      category, 
      reciter: effectiveReciter.trim() 
    }
    if (category === 'talks') {
      patch.topic = topic
    }
    onSave(patch)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Pencil size={16} className="text-violet-500" /> Edit Track
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
          <span className="font-medium text-slate-600">File:</span> {track.fileName} &nbsp;·&nbsp; {formatFileSize(track.fileSize)}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Category *</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as AudioCategory)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {ALL_CATEGORIES_LIST.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {category === 'quran' ? 'Reciter' : category === 'nasheeds' ? 'Artist' : 'Speaker'} *
            </label>
            {reciters.length > 0 ? (
              <>
                <select
                  value={reciter}
                  onChange={(e) => setReciter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">-- Select --</option>
                  {reciters.map((r) => <option key={r} value={r}>{r}</option>)}
                  <option value="Other">Other (type below)</option>
                </select>
                {reciter === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter name..."
                    value={customReciter}
                    onChange={(e) => setCustomReciter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 mt-2"
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                placeholder="Enter name..."
                value={customReciter}
                onChange={(e) => setCustomReciter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            )}
          </div>

          {/* Topic selector for Talks */}
          {category === 'talks' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Topic *</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                <option value="">-- Select Topic --</option>
                {TALKS_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || !effectiveReciter.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <Save size={15} /> Save Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Admin ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const { tracks, uploading, uploadError, uploadTrack, bulkUpload, deleteTrackById, editTrack } = useAudioLibrary()

  // Edit modal state
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null)

  // Drafts
  const [drafts, setDrafts] = useState<RecordingDraft[]>([])
  const [editingDraft, setEditingDraft] = useState<RecordingDraft | null>(null)
  const [draftEditTitle, setDraftEditTitle] = useState('')
  const [draftEditCategory, setDraftEditCategory] = useState<AudioCategory>('talks')
  const [draftEditReciter, setDraftEditReciter] = useState('')
  const [draftEditTopic, setDraftEditTopic] = useState('')
  const [savingDraftEdit, setSavingDraftEdit] = useState(false)

  const loadDrafts = useCallback(async () => { setDrafts(await getAllDrafts()) }, [])
  useEffect(() => { if (authed) loadDrafts() }, [authed])

  // Single upload state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<AudioCategory>('quran')
  const [reciter, setReciter] = useState('')
  const [customReciter, setCustomReciter] = useState('')
  const [topic, setTopic] = useState('')
  const [textContent, setTextContent] = useState('')
  const [success, setSuccess] = useState(false)
  const singleFileRef = useRef<HTMLInputElement>(null)

  // Bulk upload state
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkResults, setBulkResults] = useState<BulkUploadResult[] | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single')
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const reciters = getRecitersForCategory(category)
  const showCustom = reciters.length === 0 || reciter === 'Other'
  const effectiveReciter = showCustom ? customReciter : reciter

  // ── Single upload ──────────────────────────────────────────────────────
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const ok = await uploadTrack(file, { 
      title, 
      category, 
      reciter: effectiveReciter, 
      topic: category === 'talks' ? topic : category === 'dua' ? topic : undefined,
      text: supportsTextContent(category) ? textContent : undefined
    })
    if (ok) {
      setFile(null); setTitle(''); setCategory('quran'); setReciter(''); setCustomReciter(''); setTopic(''); setTextContent('')
      setSuccess(true)
      if (singleFileRef.current) singleFileRef.current.value = ''
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  // ── Bulk: add files ────────────────────────────────────────────────────
  const handleBulkFilesSelected = (files: FileList | null) => {
    if (!files) return
    const newRows: BulkRow[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      category: 'quran',
      reciter: '',
      customReciter: '',
    }))
    setBulkRows((prev) => [...prev, ...newRows])
    setBulkResults(null)
    if (bulkFileRef.current) bulkFileRef.current.value = ''
  }

  const handleBulkDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleBulkFilesSelected(e.dataTransfer.files)
  }, [])

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkRows.length === 0) return
    setBulkResults(null)
    setBulkProgress({ done: 0, total: bulkRows.length })

    const items: BulkUploadItem[] = bulkRows.map((r) => ({
      file: r.file,
      title: r.title,
      category: r.category,
      reciter: (r.reciter === 'Other' || getRecitersForCategory(r.category).length === 0)
        ? r.customReciter
        : r.reciter,
    }))

    const results = await bulkUpload(items, (done, total) => {
      setBulkProgress({ done, total })
    })

    setBulkResults(results)
    setBulkProgress(null)
    const allOk = results.every((r) => r.success)
    if (allOk) setBulkRows([])
    else setBulkRows((prev) => prev.filter((_, i) => !results[i].success))
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteTrackById(id)
  }

  const totalSize = tracks.reduce((acc, t) => acc + t.fileSize, 0)

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
            <Shield size={22} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">{tracks.length} tracks · {formatFileSize(totalSize)} used</p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false) }}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Upload panel ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Tab switcher */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload size={14} /> Single Upload
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'bulk'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers size={14} /> Bulk Upload
            </button>
          </div>

          {/* ── Single upload form ──────────────────────────────────── */}
          {activeTab === 'single' && (
            <>
              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4">
                  <CheckCircle size={16} /> File uploaded successfully!
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
                  <AlertCircle size={16} /> {uploadError}
                </div>
              )}

              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Audio File *</label>
                  <div
                    className="border-2 border-dashed border-slate-300 hover:border-violet-400 transition-colors rounded-xl p-5 text-center cursor-pointer bg-slate-50 hover:bg-violet-50"
                    onClick={() => singleFileRef.current?.click()}
                  >
                    {file ? (
                      <div className="flex items-center gap-3 justify-center">
                        <FileAudio size={20} className="text-violet-500" />
                        <div className="text-left">
                          <p className="text-sm text-slate-700 font-medium truncate max-w-xs">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Click to select audio file</p>
                        <p className="text-xs text-slate-400 mt-1">MP3, AAC, OGG, WAV, etc.</p>
                      </>
                    )}
                  </div>
                  <input ref={singleFileRef} type="file" accept="audio/*" className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Title *</label>
                  <input type="text" placeholder="e.g. Surah Al-Fatiha" value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Category *</label>
                  <select value={category}
                    onChange={(e) => { setCategory(e.target.value as AudioCategory); setReciter(''); setCustomReciter('') }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                    {ALL_CATEGORIES_LIST.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    {category === 'quran' ? 'Reciter' : category === 'nasheeds' ? 'Artist' : 'Speaker'} *
                  </label>
                  {reciters.length > 0 ? (
                    <>
                      <select value={reciter} onChange={(e) => setReciter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
                        <option value="">-- Select --</option>
                        {reciters.map((r) => <option key={r} value={r}>{r}</option>)}
                        <option value="Other">Other (type below)</option>
                      </select>
                      {reciter === 'Other' && (
                        <input type="text" placeholder="Enter name..." value={customReciter}
                          onChange={(e) => setCustomReciter(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 mt-2" />
                      )}
                    </>
                  ) : (
                    <input type="text" placeholder="Enter name..." value={customReciter}
                      onChange={(e) => setCustomReciter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                  )}
                </div>

                {/* Topic selector for Talks */}
                {category === 'talks' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Topic *</label>
                    <select value={topic} onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="">-- Select Topic --</option>
                      {TALKS_TOPICS.map((t) => (
                        <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Topic selector for Dua */}
                {category === 'dua' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Dua Category *</label>
                    <select value={topic} onChange={(e) => setTopic(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="">-- Select Category --</option>
                      {DUA_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Text content for Audiobooks, Hadith, and Dua */}
                {supportsTextContent(category) && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                      <FileText size={14} />
                      {category === 'audiobooks' ? 'Book Text / Transcript' : category === 'hadith' ? 'Hadith Text' : 'Dua Text (Arabic/Translation)'}
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder={
                        category === 'audiobooks' 
                          ? "Paste the book text or transcript here..." 
                          : category === 'hadith'
                          ? "Enter the hadith text here..."
                          : "Enter the dua in Arabic and/or translation..."
                      }
                      rows={6}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-y"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {textContent.length} characters
                    </p>
                  </div>
                )}

                <button type="submit" disabled={uploading || !file || (category === 'talks' && !topic) || (category === 'dua' && !topic)}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
                  {uploading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>Uploading...</>
                  ) : (<><Upload size={16} /> Upload Audio</>)}
                </button>
              </form>
            </>
          )}

          {/* ── Bulk upload form ─────────────────────────────────────── */}
          {activeTab === 'bulk' && (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-slate-300 hover:border-violet-400 transition-colors rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-violet-50"
                onClick={() => bulkFileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleBulkDrop}
              >
                <Layers size={28} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Click or drag & drop multiple audio files</p>
                <p className="text-xs text-slate-400 mt-1">MP3, AAC, OGG, WAV — select as many as you want</p>
              </div>
              <input ref={bulkFileRef} type="file" accept="audio/*" multiple className="hidden"
                onChange={(e) => handleBulkFilesSelected(e.target.files)} />

              {/* Results banner */}
              {bulkResults && (
                <div className="space-y-1.5">
                  {bulkResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                      r.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {r.success ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                      <span className="truncate font-medium">{r.fileName}</span>
                      {!r.success && <span className="ml-auto shrink-0">{r.error}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Progress */}
              {bulkProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Uploading…</span>
                    <span>{bulkProgress.done} / {bulkProgress.total}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rows */}
              {bulkRows.length > 0 && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {bulkRows.map((row, idx) => (
                    <BulkRowEditor
                      key={row.id}
                      row={row}
                      onChange={(updated) => setBulkRows((prev) => prev.map((r, i) => i === idx ? updated : r))}
                      onRemove={() => setBulkRows((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              )}

              {bulkRows.length > 0 && (
                <div className="flex gap-2">
                  <button type="submit" disabled={uploading}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
                    {uploading ? (
                      <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>Uploading {bulkProgress?.done ?? 0}/{bulkRows.length}…</>
                    ) : (<><Layers size={16} /> Upload All {bulkRows.length} Files</>)}
                  </button>
                  <button type="button" onClick={() => { setBulkRows([]); setBulkResults(null) }}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium">
                    Clear
                  </button>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ── Manage uploads ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h2 className="text-lg font-bold text-slate-800 mb-5">
            Manage Uploads
            <span className="ml-2 text-sm font-normal text-slate-400">({tracks.length})</span>
          </h2>

          {tracks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No uploads yet.</div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-sm shadow-sm">
                    {track.category === 'quran' ? '📖' : track.category === 'nasheeds' ? '🎵' : track.category === 'talks' ? '🎙️' : '⭐'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{track.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {track.reciter} · {ALL_CATEGORIES_LIST.find((c) => c.value === track.category)?.label}
                      {track.duration !== undefined ? ` · ${formatDuration(track.duration)}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{formatFileSize(track.fileSize)}</span>
                  <button
                    onClick={() => setEditingTrack(track)}
                    className="text-slate-400 hover:text-violet-500 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-violet-50"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(track.id, track.title)}
                    className="text-slate-400 hover:text-red-500 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingTrack && (
        <EditModal
          track={editingTrack}
          onSave={(patch) => {
            editTrack(editingTrack.id, patch)
            setEditingTrack(null)
          }}
          onClose={() => setEditingTrack(null)}
        />
      )}

      {/* ── Drafts Section ── */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen size={20} className="text-amber-500" /> Recording Drafts
            <span className="ml-1 text-sm font-normal text-slate-400">({drafts.length})</span>
          </h2>
          <button onClick={loadDrafts} className="text-xs text-slate-400 hover:text-slate-700 px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50">Refresh</button>
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-30" />
            No drafts saved yet. Use the Record page to save recordings as drafts.
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map(draft => (
              <div key={draft.id} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-lg">🎙️</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{draft.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(draft.savedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span>{Math.floor(draft.duration / 60)}:{String(Math.floor(draft.duration % 60)).padStart(2, '0')}</span>
                    {draft.category && <span className="capitalize bg-slate-100 px-2 py-0.5 rounded-full">{draft.category}</span>}
                    {draft.reciter && <span className="truncate max-w-[120px]">{draft.reciter}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingDraft(draft); setDraftEditTitle(draft.title); setDraftEditCategory((draft.category as AudioCategory) || 'talks'); setDraftEditReciter(draft.reciter || ''); setDraftEditTopic(draft.topic || '') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-600 hover:text-violet-600 text-xs font-medium rounded-lg transition-colors"
                    title="Edit draft metadata"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={async () => { if (!confirm(`Delete "${draft.title}"?`)) return; await deleteDraft(draft.id); loadDrafts() }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Draft Edit Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setEditingDraft(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Pencil size={16} className="text-amber-500" /> Edit Draft</h3>
              <button onClick={() => setEditingDraft(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Title</label>
                <input type="text" value={draftEditTitle} onChange={e => setDraftEditTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Category</label>
                <select value={draftEditCategory} onChange={e => { setDraftEditCategory(e.target.value as AudioCategory); setDraftEditReciter(''); setDraftEditTopic('') }} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400">
                  {ALL_CATEGORIES_LIST.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Speaker / Reciter</label>
                <input type="text" value={draftEditReciter} onChange={e => setDraftEditReciter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400" placeholder="Enter name" />
              </div>
              {draftEditCategory === 'talks' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Topic</label>
                  <select value={draftEditTopic} onChange={e => setDraftEditTopic(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400">
                    <option value="">-- Select Topic --</option>
                    {TALKS_TOPICS.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={async () => {
                  setSavingDraftEdit(true)
                  const { saveDraft } = await import('../lib/indexedDb')
                  await saveDraft({ ...editingDraft, title: draftEditTitle, category: draftEditCategory, reciter: draftEditReciter, topic: draftEditTopic })
                  await loadDrafts()
                  setEditingDraft(null)
                  setSavingDraftEdit(false)
                }}
                disabled={savingDraftEdit}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <Save size={15} /> {savingDraftEdit ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditingDraft(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
