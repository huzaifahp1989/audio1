import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import MobileTabBar from './MobileTabBar'
import MobilePopMenu from './MobilePopMenu'
import PlaylistPanel from '../PlaylistPanel'
import SignupModal, { type AuthMode } from '../SignupModal'
import GlobalSearch from '../GlobalSearch'
import { AuthModalProvider } from '../../context/AuthModalContext'
import { GlobalSearchProvider } from '../../context/GlobalSearchContext'
import GlobalPlayerBar from '../GlobalPlayerBar'

export default function Layout() {
  const location = useLocation()
  const isCarMode = location.pathname === '/car'
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')

  const openAuthModal = (mode: AuthMode = 'signup') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  return (
    <GlobalSearchProvider>
    <AuthModalProvider openAuthModal={openAuthModal}>
    <div className={`app-shell min-h-screen text-[var(--theme-ink)] flex flex-col ${isCarMode ? 'car-mode-shell' : ''}`}>
      {!isCarMode && <Header onAuthClick={openAuthModal} />}
      {!isCarMode && <MobileTabBar />}
      <main className={isCarMode ? 'flex-1 flex flex-col min-h-0' : 'flex-1 pb-32 shell-fade-up flex flex-col'}>
        <div className={isCarMode ? 'flex-1 flex flex-col min-h-0' : 'flex-1 px-2 sm:px-3 md:px-4'}>
          <Outlet />
        </div>
        {!isCarMode && <PlaylistPanel />}
      </main>
      {!isCarMode && <MobilePopMenu />}
      {!isCarMode && <GlobalPlayerBar />}
      <GlobalSearch />
      <SignupModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
    </AuthModalProvider>
    </GlobalSearchProvider>
  )
}
