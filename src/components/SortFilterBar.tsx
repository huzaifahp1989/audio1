import React from 'react'
import { ArrowUpDown } from 'lucide-react'
import { SORT_LABELS, type SortOption } from '../lib/trackSort'

interface SortFilterBarProps {
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  count?: number
  label?: string
  compact?: boolean
}

export default function SortFilterBar({ sort, onSortChange, count, label = 'tracks', compact = false }: SortFilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
      {count !== undefined && (
        <span className={`${compact ? 'text-[10px] sm:text-[11px]' : 'text-xs'} text-[var(--theme-muted)]`}>
          {count} {label}
        </span>
      )}
      <label className={`ml-auto flex items-center gap-1.5 ${compact ? 'text-[10px] sm:text-[11px]' : 'text-xs'} text-[var(--theme-muted)]`}>
        <ArrowUpDown size={compact ? 12 : 14} />
        <span className="sr-only sm:not-sr-only">Sort</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className={`rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] ${compact ? 'px-2 py-1 text-[11px]' : 'px-2 py-1.5 text-xs'} font-medium text-[var(--theme-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-brand)]/30`}
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
            <option key={key} value={key}>{SORT_LABELS[key]}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
