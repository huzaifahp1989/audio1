import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'

interface GlobalSearchContextValue {
  open: boolean
  openSearch: () => void
  closeSearch: () => void
  toggleSearch: () => void
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const openSearch = useCallback(() => setOpen(true), [])
  const closeSearch = useCallback(() => setOpen(false), [])
  const toggleSearch = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      return (
        el.isContentEditable ||
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select'
      )
    }

    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.shiftKey) return
      if (isEditableTarget(e.target)) return
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const value = useMemo(
    () => ({ open, openSearch, closeSearch, toggleSearch }),
    [open, openSearch, closeSearch, toggleSearch],
  )

  return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>
}

export function useGlobalSearch() {
  const ctx = useContext(GlobalSearchContext)
  if (!ctx) throw new Error('useGlobalSearch must be used within GlobalSearchProvider')
  return ctx
}
