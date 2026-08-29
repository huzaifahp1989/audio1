import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolved, toggle } = useTheme()
  const isDark = resolved === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`inline-flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-2.5 py-2 text-[var(--theme-muted)] transition-colors hover:text-[var(--theme-brand)] ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {showLabel && <span className="text-sm font-semibold">{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  )
}
