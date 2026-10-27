import React from 'react'
import { Eye, Search } from 'lucide-react'
import { formatViews } from '../lib/views'

interface CategoryHeroProps {
  /** Icon rendered inside the badge pill, e.g. `<Sparkles size={13} />` */
  icon: React.ReactNode
  /** Small label inside the badge, e.g. "Holy Quran" */
  badge: string
  title: string
  description: string
  /** Tailwind gradient stops, e.g. "from-emerald-600 via-teal-600 to-emerald-700" */
  gradient: string
  itemCount: number
  /** Singular noun for the count line, e.g. "recitation" */
  itemNoun: string
  totalPlays?: number
  /** Replaces the default "{count} {noun}s · N plays" row entirely. */
  stats?: React.ReactNode
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }
  /** Buttons rendered under the description */
  actions?: React.ReactNode
}

/**
 * Shared category page header. Keeps Quran / Nasheeds / Talks / Hadith / Dua /
 * Audiobooks visually consistent: same padding, type scale, stats row and
 * optional search field.
 */
export default function CategoryHero({
  icon,
  badge,
  title,
  description,
  gradient,
  itemCount,
  itemNoun,
  totalPlays,
  stats,
  search,
  actions,
}: CategoryHeroProps) {
  return (
    <section
      className={`relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-5 text-white shadow-xl sm:mb-8 sm:p-8`}
    >
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_35%)]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {icon} {badge}
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-md text-[13px] text-white/85 sm:text-sm">{description}</p>
          {stats ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75 sm:text-sm">
              {stats}
            </div>
          ) : (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75 sm:text-sm">
              <span>
                {itemCount} {itemNoun}
                {itemCount === 1 ? '' : 's'}
              </span>
              {typeof totalPlays === 'number' && (
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} />
                  {formatViews(totalPlays)} plays
                </span>
              )}
            </p>
          )}
        </div>

        {search && (
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              className="w-full rounded-2xl border-0 bg-white/95 py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        )}
      </div>

      {actions && <div className="relative mt-4 flex flex-wrap gap-2">{actions}</div>}
    </section>
  )
}
