import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ContributorSummary {
  name: string
  count: number
}

interface ContributorGridProps {
  label: string
  items: ContributorSummary[]
  /** Currently filtered contributor, or "All" when unfiltered. */
  selected: string
  /** Passing "All" clears the filter — tapping the active card toggles it off. */
  onSelect: (name: string) => void
  /** Tailwind classes applied to the active card. */
  activeClass: string
  /** Cards shown before the "Show all" toggle appears. */
  initialCount?: number
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * One-tap browsing by person. Shows the contributors with the most tracks first
 * so the common case — "I want to hear this speaker/artist" — never needs a
 * dropdown. Tapping the active card clears the filter.
 */
export default function ContributorGrid({
  label,
  items,
  selected,
  onSelect,
  activeClass,
  initialCount = 8,
  className = '',
}: ContributorGridProps) {
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    [items]
  )

  if (sorted.length === 0) return null

  // Always reveal the active card, even if it ranks below the cut-off.
  const expanded = showAll || selected !== 'All'
  const visible = expanded ? sorted : sorted.slice(0, initialCount)
  const hasMore = sorted.length > initialCount

  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
          {label}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--theme-muted)] transition hover:text-[var(--theme-ink)]"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Show fewer' : `Show all ${sorted.length}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item) => {
          const active = item.name === selected
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelect(active ? 'All' : item.name)}
              aria-pressed={active}
              title={active ? `Clear ${item.name} filter` : `Show tracks by ${item.name}`}
              className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                active
                  ? activeClass
                  : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] hover:border-[var(--theme-ink)]/25'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-[var(--theme-soft)] text-[var(--theme-muted)]'
                }`}
              >
                {initials(item.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{item.name}</span>
                <span className={`block text-[11px] tabular-nums ${active ? 'text-white/80' : 'text-[var(--theme-muted)]'}`}>
                  {item.count} {item.count === 1 ? 'track' : 'tracks'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
