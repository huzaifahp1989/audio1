import { Heart, HardDriveDownload, Home, Library, ListMusic, Mic, Music2, Radio, Search, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useGlobalSearch } from '../../context/GlobalSearchContext'

const PRIMARY_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/nasheeds', label: 'Discover', icon: Sparkles },
  { to: '/favorites', label: 'Liked Tracks', icon: Heart },
]

const LIBRARY_LINKS = [
  { to: '/quran', label: 'Quran', icon: Music2 },
  { to: '/talks', label: 'Talks', icon: Radio },
  { to: '/podcast', label: 'Podcasts', icon: Radio },
  { to: '/audiobooks', label: 'Audiobooks', icon: Library },
  { to: '/offline', label: 'Downloads', icon: HardDriveDownload },
]

export default function AppSidebar() {
  const location = useLocation()
  const { openSearch } = useGlobalSearch()

  const isActive = (to: string) => location.pathname === to

  return (
    <aside className="spotify-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-5 text-[var(--theme-ink)] lg:flex">
      <Link to="/" className="mb-8 flex items-center gap-3 px-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-md shadow-emerald-500/20">📖</span>
        <span className="text-lg font-bold tracking-tight text-[var(--theme-ink)]">
          Islamic<span className="text-emerald-600 dark:text-emerald-400">Audio</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {PRIMARY_LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-bold transition ${isActive(to) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-[var(--theme-muted)] hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]'}`}
          >
            <Icon size={21} fill={isActive(to) ? 'currentColor' : 'none'} />
            {label}
          </Link>
        ))}
        <button type="button" onClick={openSearch} className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left text-sm font-bold text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]">
          <Search size={21} /> Search
        </button>
      </nav>

      <div className="my-7 h-px bg-[var(--theme-border)]" />
      <div className="flex items-center justify-between px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)]">
        <span>Your library</span>
        <ListMusic size={16} />
      </div>
      <nav className="space-y-1">
        {LIBRARY_LINKS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={`flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(to) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-[var(--theme-muted)] hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]'}`}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-4 shadow-sm">
        <Mic size={18} className="mb-3 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-bold text-[var(--theme-ink)]">Make it yours</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--theme-muted)]">Record and share audio with the community.</p>
        <Link to="/record" className="mt-3 inline-flex text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">Open studio →</Link>
      </div>
    </aside>
  )
}
