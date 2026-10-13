import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Music2, Mic2, ArrowRight, BookText, Scroll, Hand, GraduationCap, Heart, Flame, History, Clock, Search, Sparkles, Wand2, ClipboardList, Check, Sparkle } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useGlobalSearch } from '../context/GlobalSearchContext'
import TrackCard from '../components/TrackCard'
import ContinueListeningCard from '../components/ContinueListeningCard'
import DailyPickCard from '../components/DailyPickCard'
import StreakBanner from '../components/StreakBanner'
import { loadRecentlyPlayed, loadProgressMap, resolveRecent } from '../lib/recentlyPlayed'
import { getDailyPick, getRecommendedForYou } from '../lib/recommendations'

interface ContinueEntry {
  track: AudioTrack
  position: number
  duration: number
  updatedAt: number
}

const HERO_CATEGORIES = [
  {
    to: '/quran',
    label: 'Quran',
    desc: 'Holy recitations by world-renowned reciters',
    icon: BookOpen,
    gradient: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    border: 'border-sky-200 dark:border-sky-500/20',
    text: 'text-sky-700 dark:text-sky-300',
  },
  {
    to: '/nasheeds',
    label: 'Nasheeds',
    desc: 'Beautiful Islamic vocal performances',
    icon: Music2,
    gradient: 'from-violet-500 to-indigo-600',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/20',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    to: '/talks',
    label: 'Talks',
    desc: 'Inspiring lectures and khutbahs',
    icon: Mic2,
    gradient: 'from-sky-500 to-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    to: '/favorites',
    label: 'Favorites',
    desc: 'Your saved nasheeds and talks',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    to: '/audiobooks',
    label: 'Audiobooks',
    desc: 'Islamic books with text support',
    icon: BookText,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    to: '/hadith',
    label: 'Hadith',
    desc: 'Collections with full text',
    icon: Scroll,
    gradient: 'from-emerald-600 to-green-700',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    text: 'text-emerald-800 dark:text-emerald-300',
  },
  {
    to: '/dua',
    label: 'Dua',
    desc: 'Daily adhkar and supplications',
    icon: Hand,
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    border: 'border-teal-200 dark:border-teal-500/20',
    text: 'text-teal-700 dark:text-teal-300',
  },
  {
    to: '/kids-recordings',
    label: 'Kids Recordings',
    desc: "Kids' approved recordings",
    icon: GraduationCap,
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
  },
]

function SectionHeading({ icon: Icon, title, accent }: { icon: React.ElementType; title: string; accent: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--theme-ink)]">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent}`}>
        <Icon size={17} />
      </span>
      {title}
    </h2>
  )
}

export default function HomePage() {
  const { tracks, loading } = useAudioLibrary()
  const { openSearch } = useGlobalSearch()
  const [survey, setSurvey] = useState({
    favoriteCategory: 'quran',
    nasheedLanguage: '',
    quranReciter: '',
    nasheedArtist: '',
    talksSpeaker: '',
  })
  const [surveySubmitted, setSurveySubmitted] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('audio-library-survey-submitted') === 'true'
  })

  const recent = tracks.slice(0, 6)

  const latestUploads = useMemo(() => {
    return [...tracks]
      .sort((a, b) => b.uploadedAt - a.uploadedAt)
      .slice(0, 6)
  }, [tracks])

  const trending = useMemo(() => {
    return [...tracks]
      .filter((t) => (t.votes || 0) > 0 || (t.views || 0) > 0)
      .sort((a, b) => (b.votes || 0) - (a.votes || 0) || (b.views || 0) - (a.views || 0))
      .slice(0, 6)
  }, [tracks])

  const recentlyPlayed = useMemo(() => {
    const snaps = loadRecentlyPlayed()
    return snaps.map((s) => resolveRecent(s, tracks)).slice(0, 6)
  }, [tracks])

  const continueListening = useMemo<ContinueEntry[]>(() => {
    const map = loadProgressMap()
    const snaps = loadRecentlyPlayed()
    return Object.entries(map)
      .map(([id, entry]) => {
        const snap = snaps.find((s) => s.id === id)
        const track = tracks.find((t) => t.id === id) ?? (snap ? resolveRecent(snap, tracks) : null)
        return track ? { track, position: entry.position, duration: entry.duration, updatedAt: entry.updatedAt } : null
      })
      .filter((v): v is ContinueEntry => v !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8)
  }, [tracks])

  const continueTracks = continueListening.map((c) => c.track)

  const dailyPick = useMemo(() => getDailyPick(tracks), [tracks])
  const recommended = useMemo(() => getRecommendedForYou(tracks, 6), [tracks])

  const surveyOptions = useMemo(() => {
    const unique = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean) as string[])].sort()
    const nasheeds = tracks.filter((track) => track.category === 'nasheeds')
    return {
      languages: unique(nasheeds.map((track) => track.language)).length > 0
        ? unique(nasheeds.map((track) => track.language))
        : ['arabic', 'urdu', 'english', 'other'],
      reciters: unique(tracks.filter((track) => track.category === 'quran').map((track) => track.reciter)),
      artists: unique(nasheeds.map((track) => track.reciter)),
      speakers: unique(tracks.filter((track) => track.category === 'talks').map((track) => track.reciter)),
    }
  }, [tracks])

  const handleSurveySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    localStorage.setItem('audio-library-survey', JSON.stringify(survey))
    localStorage.setItem('audio-library-survey-submitted', 'true')
    setSurveySubmitted(true)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:py-10">

      <StreakBanner />

      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-700 p-6 text-center shadow-xl shadow-emerald-950/15 sm:mb-12 sm:p-10 md:p-14">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:mb-6 sm:px-4 sm:text-sm">
            <span>📖</span> Islamic Audio Library
          </div>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl">
            Listen to the Voice of <span className="bg-gradient-to-r from-emerald-200 to-teal-100 bg-clip-text text-transparent">Islam</span>
          </h1>
          <p className="mx-auto mb-6 max-w-xl text-base text-emerald-50/90 sm:mb-8 sm:text-lg">
            Explore Quran recitations, nasheeds, Islamic talks and children's audio — all in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/quran"
              className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-emerald-50 transition font-bold px-6 py-3 rounded-2xl shadow-lg shadow-black/10"
            >
              Start Listening <ArrowRight size={18} />
            </Link>
            <button
              onClick={openSearch}
              className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white hover:bg-white/25 transition font-semibold px-6 py-3 rounded-2xl backdrop-blur-md"
            >
              <Search size={18} /> Search library
            </button>
            <Link
              to="/favorites"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/15 px-6 py-3 font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
            >
              <Heart size={18} /> Favorites
            </Link>
          </div>
        </div>
      </div>

      {/* Latest Uploads section */}
      {latestUploads.length > 0 && (
        <section className="mb-12">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Sparkle size={18} />
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-[var(--theme-ink)]">Latest Uploads</h2>
              </div>
              <p className="text-xs sm:text-sm text-[var(--theme-muted)] mt-1 ml-10">
                Fresh audio uploaded to the collection
              </p>
            </div>
            <Link
              to="/admin"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Upload audio <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestUploads.map((track, index) => (
              <TrackCard
                key={`latest-${track.id}`}
                track={track}
                tracks={latestUploads}
                index={index}
                showNameOnTop
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">Start here</p>
              <h2 className="mt-1 text-2xl font-bold text-[var(--theme-ink)]">What are you in the mood for?</h2>
            </div>
            <Sparkles className="mt-1 text-amber-500" size={22} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {HERO_CATEGORIES.slice(0, 3).map(({ to, label, desc, icon: Icon, gradient }) => (
              <Link key={to} to={to} className="group rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-soft)]/60 p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
                <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                  <Icon size={19} />
                </span>
                <h3 className="font-bold text-[var(--theme-ink)]">{label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">{desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-300">Explore <ArrowRight size={13} /></span>
              </Link>
            ))}
          </div>
        </div>
        <Link to="/kids-recordings" className="group relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-[var(--theme-surface-2)]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/50 dark:bg-amber-500/10" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"><GraduationCap size={24} /></span>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">For young listeners</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--theme-ink)]">Visit Kids Zone</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--theme-muted)]">Stories, Quran, and nasheeds selected for children.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">Open Kids Zone <ArrowRight size={17} className="transition group-hover:translate-x-1" /></span>
          </div>
        </Link>
      </section>

      <section className="mb-12 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-sm dark:border-emerald-500/20 dark:from-emerald-950/25 dark:via-[var(--theme-surface-2)] dark:to-sky-950/20 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md"><ClipboardList size={21} /></span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Shape the library</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--theme-ink)]">Tell us what you love listening to</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--theme-muted)]">A few quick answers help us highlight better audio for everyone.</p>
          </div>
          {surveySubmitted ? (
            <div className="flex min-h-32 flex-1 items-center justify-center rounded-2xl border border-emerald-200 bg-white/70 p-6 text-center dark:border-emerald-500/20 dark:bg-[var(--theme-surface-2)]/70">
              <div><Check className="mx-auto mb-2 text-emerald-600" size={28} /><p className="font-bold text-[var(--theme-ink)]">Thanks for sharing your favorites.</p><button type="button" onClick={() => setSurveySubmitted(false)} className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">Update answers</button></div>
            </div>
          ) : (
            <form onSubmit={handleSurveySubmit} className="grid flex-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[var(--theme-ink)]">What do you hear most?
                <select value={survey.favoriteCategory} onChange={(event) => setSurvey({ ...survey, favoriteCategory: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2.5 font-normal text-[var(--theme-ink)] outline-none focus:border-emerald-500">
                  <option value="quran">Quran</option><option value="nasheeds">Nasheeds</option><option value="talks">Talks</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-[var(--theme-ink)]">Favorite nasheed language
                <select value={survey.nasheedLanguage} onChange={(event) => setSurvey({ ...survey, nasheedLanguage: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2.5 font-normal capitalize text-[var(--theme-ink)] outline-none focus:border-emerald-500"><option value="">Choose one</option>{surveyOptions.languages.map((language) => <option key={language} value={language}>{language}</option>)}</select>
              </label>
              <label className="text-sm font-semibold text-[var(--theme-ink)]">Quran reciter you like
                <select value={survey.quranReciter} onChange={(event) => setSurvey({ ...survey, quranReciter: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2.5 font-normal text-[var(--theme-ink)] outline-none focus:border-emerald-500"><option value="">Choose one</option>{surveyOptions.reciters.map((name) => <option key={name} value={name}>{name}</option>)}</select>
              </label>
              <label className="text-sm font-semibold text-[var(--theme-ink)]">Nasheed artist you like
                <select value={survey.nasheedArtist} onChange={(event) => setSurvey({ ...survey, nasheedArtist: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2.5 font-normal text-[var(--theme-ink)] outline-none focus:border-emerald-500"><option value="">Choose one</option>{surveyOptions.artists.map((name) => <option key={name} value={name}>{name}</option>)}</select>
              </label>
              <label className="text-sm font-semibold text-[var(--theme-ink)] sm:col-span-2">Talk speaker you like
                <select value={survey.talksSpeaker} onChange={(event) => setSurvey({ ...survey, talksSpeaker: event.target.value })} className="mt-1.5 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2.5 font-normal text-[var(--theme-ink)] outline-none focus:border-emerald-500"><option value="">Choose one</option>{surveyOptions.speakers.map((name) => <option key={name} value={name}>{name}</option>)}</select>
              </label>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:col-span-2">Save my answers <Check size={16} /></button>
            </form>
          )}
        </div>
      </section>

      {/* Loading skeletons */}
      {loading && tracks.length === 0 && (
        <section className="mb-12">
          <div className="h-6 w-40 rounded-lg skeleton mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl skeleton" />
            ))}
          </div>
        </section>
      )}

      {/* Continue listening */}
      {continueListening.length > 0 && (
        <section className="mb-12">
          <SectionHeading icon={Clock} title="Continue listening" accent="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {continueListening.map((c, index) => (
              <ContinueListeningCard
                key={c.track.id}
                track={c.track}
                position={c.position}
                duration={c.duration}
                list={continueTracks}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {/* Daily pick */}
      {dailyPick && (
        <section className="mb-12">
          <DailyPickCard track={dailyPick} allTracks={tracks} />
        </section>
      )}

      {/* Recommended for you */}
      {recommended.length > 0 && (
        <section className="mb-12">
          <SectionHeading icon={Wand2} title="Recommended for you" accent="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((track, index) => (
              <TrackCard key={`rec-${track.id}`} track={track} tracks={recommended} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section className="mb-12">
          <SectionHeading icon={Flame} title="Trending now" accent="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((track, index) => (
              <TrackCard key={track.id} track={track} tracks={trending} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mb-12">
        <SectionHeading icon={BookOpen} title="Browse Categories" accent="bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HERO_CATEGORIES.map(({ to, label, desc, icon: Icon, gradient, bg, border, text }) => (
            <Link
              key={to}
              to={to}
              className={`group relative overflow-hidden rounded-2xl ${bg} border ${border} p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className={`font-bold ${text} text-lg mb-1`}>{label}</h3>
              <p className="text-[var(--theme-muted)] text-sm leading-relaxed">{desc}</p>
              <ArrowRight
                size={16}
                className="absolute bottom-4 right-4 text-[var(--theme-muted)] opacity-40 group-hover:opacity-80 transition-opacity"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Recently played (local) */}
      {recentlyPlayed.length > 0 && (
        <section className="mb-12">
          <SectionHeading icon={History} title="Recently played" accent="bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentlyPlayed.map((track, index) => (
              <TrackCard key={`recent-${track.id}`} track={track} tracks={recentlyPlayed} index={index} />
            ))}
          </div>
        </section>
      )}

      {!loading && tracks.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[var(--theme-border)] rounded-2xl bg-[var(--theme-soft)]/50">
          <p className="text-[var(--theme-muted)]">No audio uploaded yet.</p>
          <Link to="/admin" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block font-medium">
            Go to Admin to upload audio →
          </Link>
        </div>
      )}
    </div>
  )
}
