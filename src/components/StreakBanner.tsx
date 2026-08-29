import React from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { getListeningStreak } from '../lib/streaks'

export default function StreakBanner() {
  const streak = getListeningStreak()
  if (streak.current < 1 && streak.best < 2) return null

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/25 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow">
        <Trophy size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
          {streak.current > 0 ? `${streak.current}-day listening streak!` : 'Keep your streak going today'}
        </p>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
          Best streak: {streak.best} day{streak.best === 1 ? '' : 's'} · Listen daily to grow
        </p>
      </div>
      <Link to="/car" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
        Car mode →
      </Link>
    </div>
  )
}
