import React, { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Music2, Mic2, Shield, Home, Mic, BookText, Scroll, Hand, GraduationCap, BarChart3, Radio, Smile, Heart } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/quran', label: 'Quran', icon: BookOpen, activeClass: 'bg-gradient-to-b from-blue-100 to-sky-100 text-blue-800' },
  { to: '/nasheeds', label: 'Nasheeds', icon: Music2, activeClass: 'bg-gradient-to-b from-blue-100 to-sky-100 text-blue-800' },
  { to: '/talks', label: 'Talks', icon: Mic2, activeClass: 'bg-gradient-to-b from-blue-100 to-sky-100 text-blue-800' },
  { to: '/favorites', label: 'Favorites', icon: Heart, activeClass: 'bg-gradient-to-b from-rose-100 to-pink-100 text-rose-800' },
  { to: '/podcast', label: 'Podcast', icon: Radio },
  { to: '/audiobooks', label: 'Books', icon: BookText },
  { to: '/hadith', label: 'Hadith', icon: Scroll },
  { to: '/dua', label: 'Dua', icon: Hand },
  { to: '/kids-recordings', label: 'Kids', icon: GraduationCap },
  { to: '/quran-recording', label: 'Quran', icon: Smile },
  { to: '/analytics', label: 'Stats', icon: BarChart3 },
  { to: '/record', label: 'Record', icon: Mic },
  { to: '/admin', label: 'Admin', icon: Shield },
]

export default function MobileTabBar() {
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view
  useEffect(() => {
    if (!scrollRef.current) return
    const activeEl = scrollRef.current.querySelector<HTMLElement>('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [location.pathname])

  return (
    <div className="md:hidden sticky top-[4.5rem] z-30 px-2 sm:px-3">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide gap-1 px-1.5 py-1.5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/95 shadow-sm"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TABS.map(({ to, label, icon: Icon, activeClass }) => {
          const active = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              data-active={active}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                active
                  ? activeClass ?? 'bg-gradient-to-b from-blue-100 to-sky-100 text-blue-800'
                  : 'text-[var(--theme-muted)] hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              <span className="leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
