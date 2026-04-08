import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Music2, Mic2, Star, Shield, Home, Menu, X, Mic, BookText, Scroll, Hand } from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/quran', label: 'Quran', icon: BookOpen },
  { to: '/nasheeds', label: 'Nasheeds', icon: Music2 },
  { to: '/talks', label: 'Talks', icon: Mic2 },
  { to: '/audiobooks', label: 'Audiobooks', icon: BookText },
  { to: '/hadith', label: 'Hadith', icon: Scroll },
  { to: '/dua', label: 'Dua', icon: Hand },
  { to: '/kids', label: 'Kids', icon: Star },
  { to: '/record', label: 'Record', icon: Mic },
  { to: '/admin', label: 'Admin', icon: Shield },
]

export default function Header() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-16 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-base shadow-sm">
            📖
          </div>
          <span className="font-bold text-slate-800 hidden sm:block">
            Islamic<span className="text-violet-600">Audio</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-2 text-slate-500 hover:text-slate-800"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  active ? 'text-violet-700 bg-violet-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
