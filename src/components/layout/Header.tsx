import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Music2, Mic2, Shield, Home, Mic, BookText, Scroll, Hand, GraduationCap, BarChart3, Radio, Smile, Upload, UserPlus, LogOut, LogIn, Heart, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useGlobalSearch } from '../../context/GlobalSearchContext'
import ThemeToggle from '../ThemeToggle'
import GlobalNoticeBell from '../GlobalNoticeBell'

interface HeaderProps {
  onAuthClick?: (mode: 'signup' | 'login') => void
}

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/quran', label: 'Quran', icon: BookOpen, activeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' },
  { to: '/nasheeds', label: 'Nasheeds', icon: Music2, activeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' },
  { to: '/talks', label: 'Talks', icon: Mic2, activeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' },
  { to: '/favorites', label: 'Favorites', icon: Heart, activeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20' },
  { to: '/podcast', label: 'Podcast', icon: Radio },
  { to: '/audiobooks', label: 'Audiobooks', icon: BookText },
  { to: '/hadith', label: 'Hadith', icon: Scroll },
  { to: '/dua', label: 'Dua', icon: Hand },
  { to: '/kids-recordings', label: 'Kids Recordings', icon: GraduationCap },
  { to: '/quran-recording', label: 'Quran Recording', icon: Smile },
  { to: '/submit-audio', label: 'Submit Audio', icon: Upload },
  { to: '/user-submissions-approval', label: 'Review Submissions', icon: Shield },
  { to: '/analytics', label: 'Stats', icon: BarChart3 },
  { to: '/record', label: 'Record', icon: Mic },
  { to: '/admin', label: 'Admin', icon: Shield },
]

export default function Header({ onAuthClick }: HeaderProps) {
  const location = useLocation()
  const { user, profile, loading, signOut } = useAuth()
  const { openSearch } = useGlobalSearch()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Account'

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('[Header] sign out failed', err)
    }
  }

  return (
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-3">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 px-2.5 shadow-[0_6px_24px_var(--theme-shadow)] backdrop-blur-md sm:h-16 sm:gap-4 sm:px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-base shadow-sm text-white">
            📖
          </div>
          <span className="font-bold text-[var(--theme-ink)] hidden sm:block tracking-wide">
            Islamic<span className="text-emerald-600 dark:text-emerald-400">Audio</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1 overflow-x-auto scrollbar-hide">
          {NAV_LINKS.map(({ to, label, icon: Icon, activeClass }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? activeClass ?? 'bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 border border-blue-200'
                    : 'text-[var(--theme-muted)] hover:text-[var(--theme-ink)] hover:bg-[var(--theme-soft)]'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={openSearch}
            className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2 text-sm text-[var(--theme-muted)] transition-colors hover:text-[var(--theme-brand)]"
            title="Search (Ctrl/Cmd + K)"
          >
            <Search size={16} />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden lg:inline rounded-md border border-[var(--theme-border)] px-1.5 py-0.5 text-[10px] font-semibold">Ctrl K</kbd>
          </button>
          <button
            onClick={openSearch}
            className="sm:hidden flex items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-2.5 py-2 text-[var(--theme-muted)]"
            aria-label="Search"
          >
            <Search size={16} />
          </button>
          <Link
            to="/favorites"
            className="md:hidden flex items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-2.5 py-2 text-[var(--theme-muted)] transition-colors hover:text-rose-600"
            aria-label="Favorites"
            title="Favorites"
          >
            <Heart size={16} />
          </Link>

          <GlobalNoticeBell compact />
          <ThemeToggle />

          {loading ? (
            <div className="h-9 w-24 rounded-xl bg-[var(--theme-soft)] animate-pulse" />
          ) : user ? (
            <>
              <span className="hidden sm:inline text-sm font-semibold text-[var(--theme-ink)] max-w-[140px] truncate">
                {displayName}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-[var(--theme-muted)] hover:text-[var(--theme-ink)] hover:bg-[var(--theme-soft)] rounded-xl font-semibold text-sm transition-all"
                title="Sign out"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onAuthClick?.('login')}
                className="flex items-center gap-2 px-3 py-2 text-[var(--theme-muted)] hover:text-[var(--theme-ink)] hover:bg-[var(--theme-soft)] rounded-xl font-semibold text-sm transition-all"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Log In</span>
              </button>
              <button
                onClick={() => onAuthClick?.('signup')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:from-blue-700 hover:to-sky-600 transition-all"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Sign Up</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
