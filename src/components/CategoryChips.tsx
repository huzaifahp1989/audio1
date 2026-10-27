import React from 'react'

export interface CategoryChip {
  id: string
  label: string
  count?: number
  emoji?: string
}

interface CategoryChipsProps {
  label?: string
  options: CategoryChip[]
  value: string
  onChange: (id: string) => void
  /** Active chip classes; defaults to a neutral dark chip. */
  activeClass?: string
  className?: string
}

/**
 * Horizontal quick-filter chips used across category pages so users can switch
 * topic/language/series with one tap instead of a dropdown.
 */
export default function CategoryChips({
  label,
  options,
  value,
  onChange,
  activeClass = 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white',
  className = '',
}: CategoryChipsProps) {
  if (options.length <= 1) return null

  return (
    <div className={className}>
      {label && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">{label}</p>
      )}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {options.map((option) => {
          const active = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition ${
                active
                  ? activeClass
                  : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-[var(--theme-ink)]/25 hover:text-[var(--theme-ink)]'
              }`}
            >
              {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
              <span>{option.label}</span>
              {option.count !== undefined && option.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${active ? 'bg-white/25' : 'bg-[var(--theme-soft)]'}`}>
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
