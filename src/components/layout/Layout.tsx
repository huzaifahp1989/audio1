import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import MobileTabBar from './MobileTabBar'
import MobilePopMenu from './MobilePopMenu'
import PlaylistPanel from '../PlaylistPanel'
import GlobalPlayerBar from '../GlobalPlayerBar'
import SignupModal, { type AuthMode } from '../SignupModal'
import GlobalSearch from '../GlobalSearch'
import AppSidebar from './AppSidebar'
import { AuthModalProvider } from '../../context/AuthModalContext'
import { GlobalSearchProvider } from '../../context/GlobalSearchContext'

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
    <div className={`app-shell min-h-screen text-[var(--theme-ink)] ${isCarMode ? 'car-mode-shell' : ''}`}>
      {!isCarMode && <AppSidebar />}
      <div className={isCarMode ? 'min-h-screen' : 'min-h-screen lg:pl-64'}>
        {!isCarMode && <Header onAuthClick={openAuthModal} />}
        {!isCarMode && <MobileTabBar />}
        {!isCarMode && <GlobalPlayerBar />}
        <main className={isCarMode ? 'flex min-h-screen flex-col' : 'flex min-h-screen flex-col pb-8 shell-fade-up'}>
          <div className={isCarMode ? 'flex flex-1 flex-col' : 'flex-1 px-2 sm:px-3 md:px-4'}>
            <Outlet />
          </div>
          {!isCarMode && <PlaylistPanel />}
        </main>
        {!isCarMode && <MobilePopMenu />}
      </div>
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
