import React, { useState } from 'react'
import { Video, Search, Download, CheckCircle, AlertCircle, X, Music } from 'lucide-react'
import type { AudioCategory } from '../types'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import {
  ALL_CATEGORIES_LIST,
  QURAN_RECITERS,
  NASHEED_ARTISTS,
  TALKS_SPEAKERS,
  AUDIOBOOK_AUTHORS,
  HADITH_NARRATORS,
  TALKS_TOPICS,
  DUA_CATEGORIES,
} from '../constants/categories'
import {
  looksLikeYoutubeUrl,
  fetchYoutubeInfo,
  convertYoutubeToMp3,
  type YoutubeInfo,
} from '../lib/youtube'

function getRecitersForCategory(cat: AudioCategory): string[] {
  if (cat === 'quran') return QURAN_RECITERS
  if (cat === 'nasheeds') return NASHEED_ARTISTS
  if (cat === 'talks') return TALKS_SPEAKERS
  if (cat === 'audiobooks') return AUDIOBOOK_AUTHORS
  if (cat === 'hadith') return HADITH_NARRATORS
  return []
}

export default function YoutubeImportPanel() {
  const { importTrackFromUrl } = useAudioLibrary()

  const [url, setUrl] = useState('')
  const [info, setInfo] = useState<YoutubeInfo | null>(null)
  const [fetching, setFetching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [batchUrls, setBatchUrls] = useState('')
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<AudioCategory>('talks')
  const [reciter, setReciter] = useState('')
  const [customReciter, setCustomReciter] = useState('')
  const [topic, setTopic] = useState('')

  const reciters = getRecitersForCategory(category)
  const showCustom = reciters.length === 0 || reciter === 'Other'
  const effectiveReciter = (showCustom ? customReciter : reciter).trim()

  const resetForm = () => {
    setUrl('')
    setInfo(null)
    setTitle('')
    setCategory('talks')
    setReciter('')
    setCustomReciter('')
    setTopic('')
  }

  const handleFetch = async () => {
    if (!looksLikeYoutubeUrl(url) || fetching) return
    setFetching(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await fetchYoutubeInfo(url)
      setInfo(result)
      setTitle((prev) => prev.trim() || result.title)
    } catch (err: any) {
      setInfo(null)
      setError(err?.message || 'Could not fetch video details.')
    } finally {
      setFetching(false)
    }
  }

  const canImport =
    !!info &&
    !!title.trim() &&
    !!effectiveReciter &&
    !importing &&
    !(category === 'talks' && !topic) &&
    !(category === 'dua' && !topic)

  const handleImport = async () => {
    if (!canImport || !info) return
    setImporting(true)
    setError(null)
    setSuccess(null)
    try {
      const converted = await convertYoutubeToMp3(url)
      const ok = await importTrackFromUrl({
        audioUrl: converted.url,
        title: title.trim() || converted.title,
        category,
        reciter: effectiveReciter,
        topic: category === 'talks' || category === 'dua' ? topic : undefined,
        duration: converted.duration,
        fileName: converted.fileName,
        fileSize: converted.fileSize,
        mimeType: converted.contentType || 'audio/mpeg',
      })
      if (ok) {
        setSuccess(`Imported "${title.trim() || converted.title}" to the library.`)
        resetForm()
      } else {
        setError('The audio converted but saving to the library failed. Please try again.')
      }
    } catch (err: any) {
      setError(err?.message || 'Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleBatchImport = async () => {
    const urls = batchUrls.split(/\n/).map((l) => l.trim()).filter(looksLikeYoutubeUrl)
    if (urls.length === 0) {
      setError('Paste one YouTube URL per line.')
      return
    }
    if (!effectiveReciter) {
      setError('Choose a speaker/artist before batch import.')
      return
    }
    setImporting(true)
    setError(null)
    setSuccess(null)
    setBatchProgress({ done: 0, total: urls.length })
    let ok = 0
    for (let i = 0; i < urls.length; i++) {
      try {
        const meta = await fetchYoutubeInfo(urls[i])
        const converted = await convertYoutubeToMp3(urls[i])
        const imported = await importTrackFromUrl({
          audioUrl: converted.url,
          title: meta.title || converted.title,
          category,
          reciter: effectiveReciter,
          topic: category === 'talks' || category === 'dua' ? topic : undefined,
          duration: converted.duration,
          fileName: converted.fileName,
          fileSize: converted.fileSize,
          mimeType: converted.contentType || 'audio/mpeg',
        })
        if (imported) ok++
      } catch (err: any) {
        console.error('[batch youtube]', urls[i], err)
      }
      setBatchProgress({ done: i + 1, total: urls.length })
    }
    setImporting(false)
    setBatchProgress(null)
    setSuccess(`Batch complete: ${ok}/${urls.length} imported.`)
    setBatchUrls('')
  }

  const inputClass =
    'w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
  const labelClass = 'text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block'

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
        <Video size={14} className="mt-0.5 shrink-0" />
        <span>
          Paste a YouTube link, fetch the details, choose where it belongs, then import. The audio is converted to MP3
          on the server and added straight to your library.
        </span>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={15} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => setBatchMode(false)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!batchMode ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Single</button>
        <button type="button" onClick={() => setBatchMode(true)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${batchMode ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Batch URLs</button>
      </div>

      {batchMode ? (
        <div className="space-y-3">
          <label className={labelClass}>YouTube URLs (one per line)</label>
          <textarea
            value={batchUrls}
            onChange={(e) => setBatchUrls(e.target.value)}
            rows={6}
            placeholder="https://www.youtube.com/watch?v=…"
            className={inputClass}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={category} onChange={(e) => { setCategory(e.target.value as AudioCategory); setReciter(''); setCustomReciter(''); setTopic('') }} className={inputClass}>
              {ALL_CATEGORIES_LIST.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input type="text" placeholder="Speaker / artist *" value={customReciter || reciter} onChange={(e) => setCustomReciter(e.target.value)} className={inputClass} />
          </div>
          {batchProgress && (
            <p className="text-xs text-slate-500">Importing {batchProgress.done}/{batchProgress.total}…</p>
          )}
          <button type="button" onClick={handleBatchImport} disabled={importing} className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 text-white font-semibold py-3 rounded-xl text-sm">
            {importing ? 'Batch importing…' : 'Import all URLs'}
          </button>
        </div>
      ) : (
      <>
      {/* URL + fetch */}
      <div>
        <label className={labelClass}>YouTube URL *</label>
        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (info) setInfo(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleFetch()
              }
            }}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={!looksLikeYoutubeUrl(url) || fetching}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            {fetching ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Fetching
              </>
            ) : (
              <>
                <Search size={15} /> Fetch
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview + metadata form */}
      {info && (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {info.thumbnail ? (
              <img
                src={info.thumbnail}
                alt=""
                className="h-14 w-24 shrink-0 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="h-14 w-24 shrink-0 rounded-lg bg-slate-200 flex items-center justify-center">
                <Music size={18} className="text-slate-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{info.title || 'Untitled'}</p>
              {info.author && <p className="text-xs text-slate-500 mt-0.5 truncate">{info.author}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as AudioCategory)
                setReciter('')
                setCustomReciter('')
                setTopic('')
              }}
              className={inputClass}
            >
              {ALL_CATEGORIES_LIST.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {category === 'quran' ? 'Reciter' : category === 'nasheeds' ? 'Artist' : 'Speaker'} *
            </label>
            {reciters.length > 0 ? (
              <>
                <select value={reciter} onChange={(e) => setReciter(e.target.value)} className={inputClass}>
                  <option value="">-- Select --</option>
                  {reciters.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="Other">Other (type below)</option>
                </select>
                {reciter === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter name..."
                    value={customReciter}
                    onChange={(e) => setCustomReciter(e.target.value)}
                    className={`${inputClass} mt-2`}
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                placeholder="Enter name..."
                value={customReciter}
                onChange={(e) => setCustomReciter(e.target.value)}
                className={inputClass}
              />
            )}
          </div>

          {category === 'talks' && (
            <div>
              <label className={labelClass}>Topic *</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass}>
                <option value="">-- Select Topic --</option>
                {TALKS_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {category === 'dua' && (
            <div>
              <label className={labelClass}>Dua Category *</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass}>
                <option value="">-- Select Category --</option>
                {DUA_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            {importing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Converting & importing… (up to a minute)
              </>
            ) : (
              <>
                <Download size={16} /> Convert & Import to Library
              </>
            )}
          </button>
        </>
      )}
      </>
      )}
    </div>
  )
}
