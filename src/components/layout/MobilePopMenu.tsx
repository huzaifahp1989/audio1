import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Music2, Mic2, Shield, Home, Mic, BookText, Scroll, Hand, GraduationCap, BarChart3, Radio, Smile, LayoutGrid, X, Upload, Heart } from 'lucide-react'
import ThemeToggle from '../ThemeToggle'

const MENU_ITEMS = [
  { to: '/', label: 'Home', icon: Home, color: 'bg-violet-100 text-violet-700' },
  { to: '/quran', label: 'Quran', icon: BookOpen, color: 'bg-emerald-100 text-emerald-700' },
  { to: '/nasheeds', label: 'Nasheeds', icon: Music2, color: 'bg-blue-100 text-blue-700' },
  { to: '/talks', label: 'Talks', icon: Mic2, color: 'bg-blue-100 text-blue-700' },
  { to: '/favorites', label: 'Favorites', icon: Heart, color: 'bg-rose-100 text-rose-700' },
  { to: '/podcast', label: 'Podcast', icon: Radio, color: 'bg-orange-100 text-orange-700' },
  { to: '/audiobooks', label: 'Audiobooks', icon: BookText, color: 'bg-teal-100 text-teal-700' },
  { to: '/hadith', label: 'Hadith', icon: Scroll, color: 'bg-amber-100 text-amber-700' },
  { to: '/dua', label: 'Dua', icon: Hand, color: 'bg-lime-100 text-lime-700' },
  { to: '/kids-recordings', label: 'Kids Recordings', icon: GraduationCap, color: 'bg-cyan-100 text-cyan-700' },
  { to: '/quran-recording', label: 'Quran Recording', icon: Smile, color: 'bg-rose-100 text-rose-700' },
  { to: '/submit-audio', label: 'Submit Audio', icon: Upload, color: 'bg-violet-100 text-violet-700' },
  { to: '/analytics', label: 'Stats', icon: BarChart3, color: 'bg-indigo-100 text-indigo-700' },
  { to: '/record', label: 'Record', icon: Mic, color: 'bg-red-100 text-red-700' },
  { to: '/admin', label: 'Admin', icon: Shield, color: 'bg-slate-100 text-slate-700' },
]

export default function MobilePopMenu() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      {/* FAB trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className={`md:hidden fixed bottom-36 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform ${open ? 'opacity-0 pointer-events-none' : ''}`}
      >
        <LayoutGrid size={22} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom-sheet popup */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--theme-border)]">
          <div className="w-10 h-1 rounded-full bg-[var(--theme-brand)]/50 absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="font-semibold text-[var(--theme-ink)] text-base">Navigation</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-full hover:bg-[var(--theme-soft)] text-[var(--theme-muted)]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Grid of pages */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          <div className="grid grid-cols-3 gap-3">
            {MENU_ITEMS.map(({ to, label, icon: Icon, color }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
                    active
                      ? 'border-[var(--theme-brand)] bg-[var(--theme-soft)] shadow-sm'
                      : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)]/70 hover:bg-[var(--theme-soft)]'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${color}`}>
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${active ? 'text-[var(--theme-brand)]' : 'text-[var(--theme-ink)]'}`}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
