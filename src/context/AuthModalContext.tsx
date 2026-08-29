import React, { createContext, useContext } from 'react'
import type { AuthMode } from '../components/SignupModal'

interface AuthModalContextValue {
  openAuthModal: (mode?: AuthMode) => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({
  children,
  openAuthModal,
}: {
  children: React.ReactNode
  openAuthModal: (mode?: AuthMode) => void
}) {
  return (
    <AuthModalContext.Provider value={{ openAuthModal }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext)
  return ctx ?? { openAuthModal: () => {} }
}
