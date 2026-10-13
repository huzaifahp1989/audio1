import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Upload, Trash2, LogOut, CheckCircle, AlertCircle, FileAudio, X, Layers, Pencil, Save, FolderOpen, Clock, ChevronRight, Play, FileText, Sparkles, Eye, Move, Scissors, Smile, MessageSquarePlus, Video } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import type { BulkUploadItem, BulkUploadResult } from '../hooks/useAudioLibrary'
import { ADMIN_PASSWORD, ADMIN_CATEGORY_OPTIONS, ALL_CATEGORIES_LIST, QURAN_RECITERS, NASHEED_ARTISTS, TALKS_SPEAKERS, TALKS_TOPICS, AUDIOBOOK_AUTHORS, HADITH_NARRATORS, DUA_CATEGORIES, formatCategoryLabel } from '../constants/categories'
import type { AudioCategory, PlaylistAdTargetCategory } from '../types'
import type { AudioTrack, AdAudioTrack } from '../types'
import {
  formatFileSize,
  formatDuration,
  replaceTrackAudioInCloud,
  uploadAdAudioToCloud,
  getAllAdAudioTracks,
  deleteAdAudioFromCloud,
  updateAdAudioTrackInCloud,
  getAdminStorageConfig,
  saveAdminStorageConfig,
  type AdminStorageTarget,
} from '../lib/storage'
import { getAllDrafts, deleteDraft, type RecordingDraft } from '../lib/indexedDb'
import { transcribeAudio, canTranscribe } from '../lib/transcription'
import { trimSilenceFromFile } from '../lib/audioProcessing'
import TranscriptionModal from '../components/TranscriptionModal'
import AdminNasheedRequests from '../components/AdminNasheedRequests'
import AdminUserSubmissions from '../components/AdminUserSubmissions'
import YoutubeImportPanel from '../components/YoutubeImportPanel'
import { useAuth } from '../context/AuthContext'
import { setAdminAdAudioTracks } from '../lib/playlistQueue'

const SESSION_KEY = 'admin_authenticated'
const PLAYLIST_AD_CATEGORY_OPTIONS: { value: PlaylistAdTargetCategory; label: string }[] = [
  { value: 'quran', label: 'Quran' },
  { value: 'nasheeds', label: 'Nasheeds' },
  { value: 'talks', label: 'Talks' },
]
const DEFAULT_AD_TARGET_CATEGORIES: PlaylistAdTargetCategory[] = ['quran', 'nasheeds', 'talks']
const CUSTOM_CATEGORY_VALUE = '__custom__'

function sortAdAudioTracks(items: AdAudioTrack[]) {
  return [...items].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return b.uploadedAt - a.uploadedAt
  })
}

function extractTitleFromFilename(filename: string): string {
  // Remove file extension
  const withoutExtension = filename.replace(/\.[^/.]+$/, '')
  
  // Replace underscores, dashes, and dots with spaces
  const withSpaces = withoutExtension.replace(/[_\-\.]+/g, ' ')
  
  // Remove common prefixes like numbers (01., 1., etc.)
  const withoutPrefixes = withSpaces.replace(/^\d+[\.\s\-_]*/i, '')
  
  // Clean up multiple spaces
  const cleaned = withoutPrefixes.replace(/\s+/g, ' ').trim()
  
  // Capitalize first letter of each word
  return cleaned.replace(/\b\w/g, char => char.toUpperCase())
}

function isToday(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

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

async function extractDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.addEventListener('loadedmetadata', () => { resolve(audio.duration); URL.revokeObjectURL(url) })
    audio.addEventListener('error', () => { resolve(undefined); URL.revokeObjectURL(url) })
    setTimeout(() => { resolve(undefined); URL.revokeObjectURL(url) }, 8000)
  })
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
  const hasBuiltInCategory = ADMIN_CATEGORY_OPTIONS.some((option) => option.value === track.category)
  const [title, setTitle] = useState(track.title)
  const [category, setCategory] = useState<AudioCategory>(hasBuiltInCategory ? track.category : CUSTOM_CATEGORY_VALUE)
  const [customCategory, setCustomCategory] = useState(hasBuiltInCategory ? '' : track.category)
  const [reciter, setReciter] = useState(() => {
    const reciters = getRecitersForCategory(track.category)
    return reciters.includes(track.reciter) ? track.reciter : 'Other'
  })
  const [customReciter, setCustomReciter] = useState(() => {
    const reciters = getRecitersForCategory(track.category)
    return reciters.includes(track.reciter) ? '' : track.reciter
  })
  const [topic, setTopic] = useState(track.topic || '')

  const effectiveCategory = category === CUSTOM_CATEGORY_VALUE ? customCategory.trim() : category
  const reciters = getRecitersForCategory(effectiveCategory)
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
    if (!title.trim() || !effectiveCategory.trim()) return
    const patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic'>> = { 
      title: title.trim(), 
      category: effectiveCategory, 
    }
    if (effectiveReciter.trim()) {
      patch.reciter = effectiveReciter.trim()
    }
    if (effectiveCategory === 'talks') {
      patch.topic = topic
    }
    onSave(patch)
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" 
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
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
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Category *</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as AudioCategory)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {ADMIN_CATEGORY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value={CUSTOM_CATEGORY_VALUE}>Custom category…</option>
            </select>
            {category === CUSTOM_CATEGORY_VALUE && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter a new category"
                className="w-full mt-2 bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            )}
            {category === CUSTOM_CATEGORY_VALUE && customCategory.trim() && (
              <p className="mt-1 text-xs text-slate-500">Will be saved as {formatCategoryLabel(customCategory.trim())}.</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {effectiveCategory === 'quran' ? 'Reciter' : effectiveCategory === 'nasheeds' ? 'Artist' : 'Speaker'} *
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
          {effectiveCategory === 'talks' && (
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
              disabled={!title.trim()}
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
  const navigate = useNavigate()
  const adminParams = new URLSearchParams(window.location.search)
  const nasheedBulkMode = adminParams.get('upload') === 'nasheeds'
  const requestedTab = adminParams.get('tab')
  const { user } = useAuth()
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const { tracks, uploading, uploadError, uploadTrack, bulkUpload, deleteTrackById, editTrack, refresh } = useAudioLibrary()

  // Edit modal state
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null)

  // Move category modal state
  const [movingTrack, setMovingTrack] = useState<AudioTrack | null>(null)
  const [newCategory, setNewCategory] = useState<AudioCategory>('quran')

  // Drafts
  const [drafts, setDrafts] = useState<RecordingDraft[]>([])
  const [editingDraft, setEditingDraft] = useState<RecordingDraft | null>(null)
  const [draftEditTitle, setDraftEditTitle] = useState('')
  const [draftEditCategory, setDraftEditCategory] = useState<AudioCategory>('talks')
  const [draftEditReciter, setDraftEditReciter] = useState('')
  const [draftEditTopic, setDraftEditTopic] = useState('')
  const [savingDraftEdit, setSavingDraftEdit] = useState(false)

  const loadDrafts = useCallback(async () => { setDrafts(await getAllDrafts()) }, [])
  useEffect(() => { if (authed || user) loadDrafts() }, [authed, user, loadDrafts])
  useEffect(() => {
    if (user) {
      setAuthed(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }
  }, [user])

  // Single upload state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<AudioCategory>('quran')
  const [reciter, setReciter] = useState('')
  const [customReciter, setCustomReciter] = useState('')
  const [topic, setTopic] = useState('')
  const [textContent, setTextContent] = useState('')
  const [storyImage, setStoryImage] = useState<File | null>(null)
  const [storyImagePreviewUrl, setStoryImagePreviewUrl] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const singleFileRef = useRef<HTMLInputElement>(null)
  const storyImageFileRef = useRef<HTMLInputElement>(null)
  const [adAudioTracks, setAdAudioTracks] = useState<AdAudioTrack[]>([])
  const [adAudioFile, setAdAudioFile] = useState<File | null>(null)
  const [adAudioTitle, setAdAudioTitle] = useState('')
  const [adAudioSponsorHref, setAdAudioSponsorHref] = useState('https://traeadvert8pia.vercel.app/')
  const [adAudioTargetCategories, setAdAudioTargetCategories] = useState<PlaylistAdTargetCategory[]>(DEFAULT_AD_TARGET_CATEGORIES)
  const [adAudioUploading, setAdAudioUploading] = useState(false)
  const [adAudioError, setAdAudioError] = useState<string | null>(null)
  const [adAudioSuccess, setAdAudioSuccess] = useState(false)
  const adAudioFileRef = useRef<HTMLInputElement>(null)

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionModalOpen, setTranscriptionModalOpen] = useState(false)
  const [transcribedText, setTranscribedText] = useState('')
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

  // Bulk upload state
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [bulkResults, setBulkResults] = useState<BulkUploadResult[] | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'youtube'>(
    requestedTab === 'youtube' ? 'youtube' : nasheedBulkMode ? 'bulk' : 'single',
  )
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const reciters = getRecitersForCategory(category)
  const showCustom = reciters.length === 0 || reciter === 'Other'
  const effectiveReciter = showCustom ? customReciter : reciter

  useEffect(() => {
    if (category !== 'kids-stories') {
      setStoryImage(null)
      if (storyImageFileRef.current) storyImageFileRef.current.value = ''
    }
  }, [category])

  useEffect(() => {
    if (!storyImage) {
      setStoryImagePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(storyImage)
    setStoryImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [storyImage])

  const syncAdAudioTracks = useCallback((items: AdAudioTrack[]) => {
    const sorted = sortAdAudioTracks(items)
    setAdAudioTracks(sorted)
    setAdminAdAudioTracks(sorted)
  }, [])

  const loadAdAudioTracks = useCallback(async () => {
    try {
      const items = await getAllAdAudioTracks()
      syncAdAudioTracks(items)
    } catch (error) {
      console.error('[AdminPage] Failed to load ad audio tracks:', error)
    }
  }, [syncAdAudioTracks])

  useEffect(() => {
    if (authed || user) void loadAdAudioTracks()
  }, [authed, user, loadAdAudioTracks])

  // ── Single upload ──────────────────────────────────────────────────────
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    const ok = await uploadTrack(file, { 
      title, 
      category, 
      reciter: effectiveReciter, 
      topic: category === 'talks' ? topic : category === 'dua' ? topic : undefined,
      text: supportsTextContent(category) ? textContent : undefined,
      imageFile: category === 'kids-stories' ? storyImage ?? undefined : undefined,
      autoTrimLeadingSilence: true,
      autoTrimTrailingSilence: true,
    })
    if (ok) {
      setFile(null); setTitle(''); setCategory('quran'); setReciter(''); setCustomReciter(''); setTopic(''); setTextContent(''); setStoryImage(null)
      setSuccess(true)
      if (singleFileRef.current) singleFileRef.current.value = ''
      if (storyImageFileRef.current) storyImageFileRef.current.value = ''
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  // ── Bulk: add files ────────────────────────────────────────────────────
  const handleBulkFilesSelected = (files: FileList | null) => {
    if (!files) return
    const newRows: BulkRow[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      title: extractTitleFromFilename(f.name),
      category: nasheedBulkMode ? 'nasheeds' : 'quran',
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

    const results = await bulkUpload(
      items,
      (done, total) => {
        setBulkProgress({ done, total })
      },
      { autoTrimLeadingSilence: true, autoTrimTrailingSilence: true }
    )

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

  const handleAdAudioSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adAudioFile) return

    setAdAudioError(null)
    setAdAudioSuccess(false)
    setAdAudioUploading(true)

    try {
      const duration = await extractDuration(adAudioFile)
      await uploadAdAudioToCloud(adAudioFile, {
        title: adAudioTitle.trim() || extractTitleFromFilename(adAudioFile.name),
        sponsorHref: adAudioSponsorHref.trim() || undefined,
        duration,
        sortOrder: adAudioTracks.length,
        targetCategories: adAudioTargetCategories,
      })
      await loadAdAudioTracks()
      setAdAudioFile(null)
      setAdAudioTitle('')
      setAdAudioSponsorHref('https://traeadvert8pia.vercel.app/')
      setAdAudioTargetCategories(DEFAULT_AD_TARGET_CATEGORIES)
      if (adAudioFileRef.current) adAudioFileRef.current.value = ''
      setAdAudioSuccess(true)
      setTimeout(() => setAdAudioSuccess(false), 3000)
    } catch (error: any) {
      setAdAudioError(error?.message || 'Could not upload ad audio.')
    } finally {
      setAdAudioUploading(false)
    }
  }

  const handleDeleteAdAudio = async (track: AdAudioTrack) => {
    if (!window.confirm(`Delete ad audio "${track.title}"? This cannot be undone.`)) return
    await deleteAdAudioFromCloud(track)
    await loadAdAudioTracks()
  }

  const handleToggleAdAudioActive = async (track: AdAudioTrack) => {
    const nextTrack = { ...track, active: track.active === false }
    syncAdAudioTracks(adAudioTracks.map((item) => item.id === track.id ? nextTrack : item))
    try {
      await updateAdAudioTrackInCloud(track.id, { active: nextTrack.active })
    } catch (error: any) {
      setAdAudioError(error?.message || 'Could not update ad audio status.')
      await loadAdAudioTracks()
    }
  }

  const handleToggleAdAudioTarget = async (track: AdAudioTrack, target: PlaylistAdTargetCategory) => {
    const currentTargets = track.targetCategories?.length ? track.targetCategories : DEFAULT_AD_TARGET_CATEGORIES
    const nextTargets = currentTargets.includes(target)
      ? currentTargets.filter((item) => item !== target)
      : [...currentTargets, target]

    if (nextTargets.length === 0) {
      setAdAudioError('Each ad audio clip must target at least one playlist.')
      return
    }

    const nextTrack = { ...track, targetCategories: nextTargets }
    syncAdAudioTracks(adAudioTracks.map((item) => item.id === track.id ? nextTrack : item))
    try {
      await updateAdAudioTrackInCloud(track.id, { targetCategories: nextTargets })
    } catch (error: any) {
      setAdAudioError(error?.message || 'Could not update ad audio categories.')
      await loadAdAudioTracks()
    }
  }

  const handleMoveAdAudioTrack = async (trackId: string, direction: 'up' | 'down') => {
    const index = adAudioTracks.findIndex((track) => track.id === trackId)
    if (index < 0) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= adAudioTracks.length) return

    const reordered = [...adAudioTracks]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    const normalized = reordered.map((track, orderIndex) => ({ ...track, sortOrder: orderIndex }))
    syncAdAudioTracks(normalized)

    try {
      await Promise.all(normalized.map((track) =>
        updateAdAudioTrackInCloud(track.id, { sortOrder: track.sortOrder }),
      ))
    } catch (error: any) {
      setAdAudioError(error?.message || 'Could not reorder ad audio clips.')
      await loadAdAudioTracks()
    }
  }

  const totalSize = tracks.reduce((acc, t) => acc + t.fileSize, 0)

  // ── Migration: Add views to existing tracks ─────────────────────────────
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<string | null>(null)
  const [trimmingToday, setTrimmingToday] = useState(false)
  const [trimTodayResult, setTrimTodayResult] = useState<string | null>(null)
  const [trimTodayErrors, setTrimTodayErrors] = useState<string[]>([])
  const [storageTarget, setStorageTarget] = useState<AdminStorageTarget>(() => getAdminStorageConfig().target)
  const [googleDriveWebhookUrl, setGoogleDriveWebhookUrl] = useState(() => getAdminStorageConfig().googleDriveWebhookUrl || '')
  const [oneDriveWebhookUrl, setOneDriveWebhookUrl] = useState(() => getAdminStorageConfig().oneDriveWebhookUrl || '')
  const [storageConfigMessage, setStorageConfigMessage] = useState<string | null>(null)

  const handleMigrateViews = async () => {
    if (!confirm('This will add views=0 to all tracks that don\'t have a views field. Continue?')) return
    
    setMigrating(true)
    setMigrationResult(null)
    
    try {
      const response = await fetch('/api/migrate-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: 'admin123' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMigrationResult(`✅ ${data.message}`)
        // Refresh tracks to get updated data
        await refresh()
      } else {
        setMigrationResult(`❌ Error: ${data.error}`)
      }
    } catch (err: any) {
      setMigrationResult(`❌ Failed: ${err.message}`)
    } finally {
      setMigrating(false)
    }
  }

  const handleTrimTodayTracks = async () => {
    const todayTracks = tracks.filter((t) => isToday(t.uploadedAt))
    if (todayTracks.length === 0) {
      setTrimTodayResult('No tracks uploaded today.')
      return
    }

    if (!window.confirm(`Trim leading and trailing silence for ${todayTracks.length} track(s) uploaded today?`)) return

    setTrimmingToday(true)
    setTrimTodayResult(null)
    setTrimTodayErrors([])

    let processed = 0
    let trimmed = 0
    let failed = 0
    const errors: string[] = []

    try {
      for (const track of todayTracks) {
        try {
          if (!track.audioUrl) {
            throw new Error('Missing audio URL')
          }

          const response = await fetch(track.audioUrl, { cache: 'no-store', mode: 'cors' })
          if (!response.ok) {
            throw new Error(`Download failed (${response.status})`)
          }

          const blob = await response.blob()
          const sourceFile = new File([blob], track.fileName, { type: blob.type || track.mimeType || 'audio/wav' })
          const trimmedResult = await trimSilenceFromFile(sourceFile, { trimLeading: true, trimTrailing: true })

          if (!trimmedResult.trimmed) {
            processed++
            continue
          }

          const uploadFile = new File([trimmedResult.file], track.fileName, { type: 'audio/wav' })
          const duration = await extractDuration(uploadFile)
          await replaceTrackAudioInCloud(track, uploadFile, duration)
          processed++
          trimmed++
        } catch (err: any) {
          console.error('[Trim today tracks] Failed for track:', track.id, err)
          failed++
          errors.push(`${track.title}: ${err?.message || 'Unknown error'}`)
        }
      }

      await refresh()
      setTrimTodayResult(`Processed ${processed}/${todayTracks.length}. Trimmed ${trimmed}. Failed ${failed}.`)
      setTrimTodayErrors(errors.slice(0, 5))
    } finally {
      setTrimmingToday(false)
    }
  }

  const handleSaveStorageConfig = (e: React.FormEvent) => {
    e.preventDefault()
    saveAdminStorageConfig({
      target: storageTarget,
      googleDriveWebhookUrl: googleDriveWebhookUrl.trim(),
      oneDriveWebhookUrl: oneDriveWebhookUrl.trim(),
    })
    setStorageConfigMessage('Storage destination saved. New uploads will use this target.')
    window.setTimeout(() => setStorageConfigMessage(null), 2600)
  }

  // ── Transcription handler ────────────────────────────────────────────────
  const handleTranscribe = async () => {
    if (!file || !canTranscribe(file)) return
    
    setIsTranscribing(true)
    setTranscriptionModalOpen(true)
    setTranscriptionError(null)
    setTranscribedText('')
    
    const result = await transcribeAudio(file)
    
    if (result.success) {
      setTranscribedText(result.text)
    } else {
      setTranscriptionError(result.error || 'Transcription failed')
    }
    
    setIsTranscribing(false)
  }

  const handleApplyTranscription = (text: string) => {
    setTextContent(text)
  }

  if (!authed && !user) return <LoginGate onLogin={() => setAuthed(true)} />

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 sm:items-center">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
            <Shield size={22} className="text-violet-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">{tracks.length} tracks · {formatFileSize(totalSize)} used</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end xl:gap-3">
          <button
            onClick={handleTrimTodayTracks}
            disabled={trimmingToday}
            className="flex w-full items-center justify-center gap-2 text-emerald-700 hover:text-emerald-800 text-sm transition-colors bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
          >
            {trimmingToday ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Trimming Today...
              </>
            ) : (
              <>
                <Scissors size={15} /> Trim Today's Tracks
              </>
            )}
          </button>
          <button
            onClick={handleMigrateViews}
            disabled={migrating}
            className="flex w-full items-center justify-center gap-2 text-amber-600 hover:text-amber-700 text-sm transition-colors bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-100 disabled:opacity-50"
          >
            {migrating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Migrating...
              </>
            ) : (
              <>
                <Eye size={15} /> Add Views Counter
              </>
            )}
          </button>
          <button
            onClick={() => document.getElementById('storage-settings')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex w-full items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm transition-colors bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-100"
          >
            <Save size={15} /> Storage Settings
          </button>
          <button
            onClick={() => document.getElementById('user-submissions')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex w-full items-center justify-center gap-2 text-violet-600 hover:text-violet-700 text-sm transition-colors bg-violet-50 border border-violet-200 px-3 py-2 rounded-lg hover:bg-violet-100"
          >
            <Upload size={15} /> User Submissions
          </button>
          <button
            onClick={() => document.getElementById('nasheed-requests')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex w-full items-center justify-center gap-2 text-fuchsia-600 hover:text-fuchsia-700 text-sm transition-colors bg-fuchsia-50 border border-fuchsia-200 px-3 py-2 rounded-lg hover:bg-fuchsia-100"
          >
            <MessageSquarePlus size={15} /> Nasheed Requests
          </button>
          <button
            onClick={() => navigate('/quran-recordings-approval')}
            className="flex w-full items-center justify-center gap-2 text-pink-600 hover:text-pink-700 text-sm transition-colors bg-pink-50 border border-pink-200 px-3 py-2 rounded-lg hover:bg-pink-100"
          >
            <Smile size={15} /> Kids Approval
          </button>
          <button
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false) }}
            className="flex w-full items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {trimTodayResult && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} />
            <p className="text-sm font-medium">{trimTodayResult}</p>
            <button
              onClick={() => { setTrimTodayResult(null); setTrimTodayErrors([]) }}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
          {trimTodayErrors.length > 0 && (
            <ul className="mt-3 text-xs text-emerald-800 space-y-1 list-disc ml-5">
              {trimTodayErrors.map((err, idx) => (
                <li key={`${err}-${idx}`}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Migration Result Message */}
      {migrationResult && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          migrationResult.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {migrationResult.startsWith('✅') ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p className="text-sm font-medium">{migrationResult}</p>
          <button 
            onClick={() => setMigrationResult(null)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div id="storage-settings" className="mb-8 bg-white border border-indigo-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Upload Storage Destination</h2>
        <p className="text-sm text-slate-500 mb-4">
          Choose where admin uploads are stored: Firebase Storage, Google Drive, or OneDrive.
        </p>

        <form onSubmit={handleSaveStorageConfig} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Destination</label>
            <select
              value={storageTarget}
              onChange={(e) => setStorageTarget(e.target.value as AdminStorageTarget)}
              className="w-full md:max-w-sm bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="firebase">Firebase Storage (default)</option>
              <option value="google-drive">Google Drive</option>
              <option value="onedrive">OneDrive</option>
            </select>
          </div>

          {storageTarget === 'google-drive' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Google Drive Upload Webhook URL</label>
              <input
                type="url"
                value={googleDriveWebhookUrl}
                onChange={(e) => setGoogleDriveWebhookUrl(e.target.value)}
                placeholder="https://your-google-drive-upload-endpoint"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                required
              />
              <p className="text-xs text-slate-400 mt-1">Endpoint should accept multipart form-data and return JSON with a public file URL in url.</p>
            </div>
          )}

          {storageTarget === 'onedrive' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">OneDrive Upload Webhook URL</label>
              <input
                type="url"
                value={oneDriveWebhookUrl}
                onChange={(e) => setOneDriveWebhookUrl(e.target.value)}
                placeholder="https://your-onedrive-upload-endpoint"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                required
              />
              <p className="text-xs text-slate-400 mt-1">Endpoint should accept multipart form-data and return JSON with a public file URL in url.</p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl sm:w-auto"
            >
              Save Storage Settings
            </button>
            {storageConfigMessage && <span className="text-sm text-emerald-700">{storageConfigMessage}</span>}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Upload panel ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* Tab switcher */}
          <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex w-full items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload size={14} /> Single Upload
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex w-full items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'bulk'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers size={14} /> Bulk Upload
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`flex w-full items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'youtube'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Video size={14} /> YouTube
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
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Auto trim enabled: leading and trailing silence are removed from uploaded audio.
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Audio File *</label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                      file 
                        ? 'border-violet-400 bg-violet-50' 
                        : 'border-slate-300 hover:border-violet-400 bg-slate-50 hover:bg-violet-50'
                    }`}
                    onClick={() => singleFileRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const droppedFile = e.dataTransfer.files?.[0]
                      if (droppedFile && droppedFile.type.startsWith('audio/')) {
                        setFile(droppedFile)
                        if (!title) {
                          setTitle(extractTitleFromFilename(droppedFile.name))
                        }
                      }
                    }}
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
                        <p className="text-sm text-slate-500">Click or drag & drop audio file</p>
                        <p className="text-xs text-slate-400 mt-1">MP3, AAC, OGG, WAV, etc.</p>
                      </>
                    )}
                  </div>
                  <input ref={singleFileRef} type="file" accept="audio/*" className="hidden"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0] ?? null
                      setFile(selectedFile)
                      // Auto-fill title from filename if title is empty
                      if (selectedFile && !title) {
                        setTitle(extractTitleFromFilename(selectedFile.name))
                      }
                    }} />
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} />
                        {category === 'audiobooks' ? 'Book Text / Transcript' : category === 'hadith' ? 'Hadith Text' : 'Dua Text (Arabic/Translation)'}
                      </label>
                      {file && canTranscribe(file) && (
                        <button
                          type="button"
                          onClick={handleTranscribe}
                          disabled={isTranscribing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all"
                        >
                          {isTranscribing ? (
                            <>
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Transcribing...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Generate from Audio
                            </>
                          )}
                        </button>
                      )}
                    </div>
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

                {category === 'kids-stories' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Story Image (Optional)</label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        storyImage
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50'
                      }`}
                      onClick={() => storyImageFileRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const droppedImage = e.dataTransfer.files?.[0]
                        if (droppedImage && droppedImage.type.startsWith('image/')) {
                          setStoryImage(droppedImage)
                        }
                      }}
                    >
                      {storyImage ? (
                        <div className="flex items-center gap-3 justify-center">
                          <img
                            src={storyImagePreviewUrl || ''}
                            alt="Story preview"
                            className="w-12 h-12 rounded-lg object-cover border border-amber-200"
                          />
                          <div className="text-left">
                            <p className="text-sm text-slate-700 font-medium truncate max-w-xs">{storyImage.name}</p>
                            <p className="text-xs text-slate-400">{formatFileSize(storyImage.size)}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <FolderOpen size={20} className="text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Click or drag & drop image</p>
                          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={storyImageFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setStoryImage(e.target.files?.[0] ?? null)}
                    />
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
                <div className="flex flex-col gap-2 sm:flex-row">
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium sm:w-auto">
                    Clear
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ── YouTube import ───────────────────────────────────────── */}
          {activeTab === 'youtube' && <YoutubeImportPanel />}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Ad Audio</h2>
              <p className="text-sm text-slate-500">Upload sponsor clips used between playlist tracks.</p>
            </div>
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
              {adAudioTracks.length} clips
            </span>
          </div>

          {adAudioSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle size={16} /> Ad audio uploaded successfully.
            </div>
          )}
          {adAudioError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} /> {adAudioError}
            </div>
          )}

          <form onSubmit={handleAdAudioSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Ad Audio File *</label>
              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  adAudioFile
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50'
                }`}
                onClick={() => adAudioFileRef.current?.click()}
              >
                {adAudioFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileAudio size={20} className="text-amber-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-700">{adAudioFile.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(adAudioFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <FileAudio size={24} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">Click to choose an ad audio file</p>
                    <p className="text-xs text-slate-400 mt-1">MP3, WAV, M4A, OGG, AAC, WEBM</p>
                  </>
                )}
              </div>
              <input
                ref={adAudioFileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null
                  setAdAudioFile(nextFile)
                  if (nextFile && !adAudioTitle) {
                    setAdAudioTitle(extractTitleFromFilename(nextFile.name))
                  }
                }}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Ad Title *</label>
              <input
                type="text"
                value={adAudioTitle}
                onChange={(e) => setAdAudioTitle(e.target.value)}
                placeholder="Sponsored break title"
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Sponsor Link</label>
              <input
                type="url"
                value={adAudioSponsorHref}
                onChange={(e) => setAdAudioSponsorHref(e.target.value)}
                placeholder="https://traeadvert8pia.vercel.app/"
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Play In</label>
              <div className="flex flex-wrap gap-2">
                {PLAYLIST_AD_CATEGORY_OPTIONS.map(({ value, label }) => {
                  const selected = adAudioTargetCategories.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAdAudioTargetCategories((current) => (
                          current.includes(value)
                            ? current.filter((item) => item !== value)
                            : [...current, value]
                        ))
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border border-amber-300 bg-amber-100 text-amber-800'
                          : 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-slate-400">Choose which playlists can use this ad clip.</p>
            </div>

            <button
              type="submit"
              disabled={adAudioUploading || !adAudioFile || !adAudioTitle.trim() || adAudioTargetCategories.length === 0}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              {adAudioUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading ad audio...
                </>
              ) : (
                <>
                  <Upload size={16} /> Upload Ad Audio
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            {adAudioTracks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                No ad audio clips uploaded yet.
              </div>
            ) : (
              adAudioTracks.map((track, index) => (
                <div key={track.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">Ad</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">{track.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          track.active === false ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {track.active === false ? 'Inactive' : 'Active'}
                        </span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Priority {index + 1}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-400 mt-1">
                        {track.duration !== undefined ? `${formatDuration(track.duration)} · ` : ''}
                        {formatFileSize(track.fileSize)}
                        {` · Heard ${track.heardCount ?? 0} times`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {PLAYLIST_AD_CATEGORY_OPTIONS.map(({ value, label }) => {
                          const selected = (track.targetCategories?.length ? track.targetCategories : DEFAULT_AD_TARGET_CATEGORIES).includes(value)
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => handleToggleAdAudioTarget(track, value)}
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                                selected
                                  ? 'border border-amber-300 bg-amber-100 text-amber-800'
                                  : 'border border-slate-200 bg-white text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveAdAudioTrack(track.id, 'up')}
                        disabled={index === 0}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAdAudioTrack(track.id, 'down')}
                        disabled={index === adAudioTracks.length - 1}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAdAudioActive(track)}
                        className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${
                          track.active === false
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {track.active === false ? 'Activate' : 'Pause'}
                      </button>
                      {track.sponsorHref ? (
                        <a
                          href={track.sponsorHref}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-200 text-center"
                        >
                          Link
                        </a>
                      ) : null}
                      <button
                        onClick={() => handleDeleteAdAudio(track)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete ad audio"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Manage uploads ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden lg:col-span-2">
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
                  className="flex flex-col gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors group sm:flex-row sm:items-center"
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
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-slate-400 shrink-0">{formatFileSize(track.fileSize)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingTrack(track)}
                        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-violet-500 transition-colors shrink-0 px-3 py-2 rounded-lg border border-slate-200 hover:bg-violet-50 sm:border-0 sm:p-1.5"
                        title="Edit"
                      >
                        <Pencil size={15} />
                        <span className="text-xs sm:hidden">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(track.id, track.title)}
                        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors shrink-0 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 sm:border-0 sm:p-1.5"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                        <span className="text-xs sm:hidden">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminUserSubmissions />
      <AdminNasheedRequests />

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
        <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
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
              <div key={draft.id} className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-colors group sm:flex-row sm:items-center">
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
                <div className="flex flex-col gap-2 shrink-0 sm:flex-row sm:items-center">
                  <button
                    onClick={() => { setEditingDraft(draft); setDraftEditTitle(draft.title); setDraftEditCategory((draft.category as AudioCategory) || 'talks'); setDraftEditReciter(draft.reciter || ''); setDraftEditTopic(draft.topic || '') }}
                    className="flex w-full items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-600 hover:text-violet-600 text-xs font-medium rounded-lg transition-colors sm:w-auto"
                    title="Edit draft metadata"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={async () => { if (!confirm(`Delete "${draft.title}"?`)) return; await deleteDraft(draft.id); loadDrafts() }}
                    className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-slate-500 border border-red-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors sm:w-auto sm:border-0 sm:px-1.5"
                    title="Delete draft"
                  >
                    <Trash2 size={15} />
                    <span className="text-xs sm:hidden">Delete</span>
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

      {/* Transcription Modal */}
      <TranscriptionModal
        isOpen={transcriptionModalOpen}
        onClose={() => setTranscriptionModalOpen(false)}
        onApply={handleApplyTranscription}
        initialText={transcribedText}
        isLoading={isTranscribing}
        error={transcriptionError}
        fileName={file?.name || ''}
        audioFile={file}
        useWebSpeech={true}
      />
    </div>
  )
}
