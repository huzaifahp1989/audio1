import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { trackPageView, identifyUser, trackEvent } from './lib/analytics'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { AudioPlayerProvider } from './context/AudioPlayerContext'
import { AudioLibraryProvider } from './hooks/useAudioLibrary'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import QuranPage from './pages/QuranPage'
import NasheedsPage from './pages/NasheedsPage'
import TalksPage from './pages/TalksPage'
import FavoritesPage from './pages/FavoritesPage'
import AdminPage from './pages/AdminPage'
import RecordPage from './pages/RecordPage'
import SubmitAudioPage from './pages/SubmitAudioPage'
import UserSubmissionsApprovalPage from './pages/UserSubmissionsApprovalPage'
import MySubmissionsPage from './pages/MySubmissionsPage'
import AudiobookPage from './pages/AudiobookPage'
import HadithPage from './pages/HadithPage'
import DuaPage from './pages/DuaPage'
import KidsLearningPage from './pages/KidsLearningPage'
import AnalyticsPage from './pages/AnalyticsPage'
import PodcastPage from './pages/PodcastPage'
import QuranRecordingPage from './pages/QuranRecordingPage'
import KidsApprovalPage from './pages/KidsApprovalPage'
import TrackPage from './pages/TrackPage'
import SpeakerPage from './pages/SpeakerPage'
import CarModePage from './pages/CarModePage'
import { registerNativeCapabilities } from './capNative'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/quran': 'Quran',
  '/nasheeds': 'Nasheeds',
  '/talks': 'Talks',
  '/favorites': 'Favorites',
  '/admin': 'Admin',
  '/record': 'Record',
  '/audiobooks': 'Audiobooks',
  '/hadith': 'Hadith',
  '/dua': 'Dua',
  '/kids-recordings': 'Kids',
  '/analytics': 'Stats',
  '/podcast': 'Podcast',
  '/quran-recording': 'Quran Recording',
  '/quran-recordings-approval': 'Quran Recording Reviews',
  '/submit-audio': 'Submit Audio',
  '/user-submissions-approval': 'Submissions Approval',
  '/car': 'Car Mode',
}

function pageTitleForPath(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/track/')) return 'Track'
  if (pathname.startsWith('/speaker/')) return 'Speaker'
  return document.title || 'Islamic Audio'
}

function AppShell() {
  const location = useLocation()
  const { user } = useAuth()
  const startedRef = useRef(false)

  // Page view on every route (path + search)
  useEffect(() => {
    const path = `${location.pathname}${location.search}`
    const title = pageTitleForPath(location.pathname)
    trackPageView(path, title)
  }, [location.pathname, location.search])

  useEffect(() => {
    identifyUser(user?.id ?? null)
  }, [user?.id])

  useEffect(() => {
    void registerNativeCapabilities()
  }, [])

  // Once per session only (was incorrectly firing on every navigation)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    trackEvent('app_started', { path: location.pathname })
  }, [location.pathname])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/quran" element={<QuranPage />} />
        <Route path="/nasheeds" element={<NasheedsPage />} />
        <Route path="/talks" element={<TalksPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/kids" element={<Navigate to="/kids-recordings" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/audiobooks" element={<AudiobookPage />} />
        <Route path="/hadith" element={<HadithPage />} />
        <Route path="/dua" element={<DuaPage />} />
        <Route path="/kids-learning" element={<Navigate to="/kids-recordings" replace />} />
        <Route path="/kids-recordings" element={<KidsLearningPage />} />
        <Route path="/submit" element={<Navigate to="/submit-audio" replace />} />
        <Route path="/submissions-approval" element={<Navigate to="/user-submissions-approval" replace />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/podcast" element={<PodcastPage />} />
        <Route path="/quran-recording" element={<QuranRecordingPage />} />
        <Route path="/kids-record" element={<Navigate to="/quran-recording" replace />} />
        <Route path="/quran-recordings-approval" element={<KidsApprovalPage />} />
        <Route path="/kids-approval" element={<Navigate to="/quran-recordings-approval" replace />} />
        <Route path="/submit-audio" element={<SubmitAudioPage />} />
        <Route path="/user-submissions-approval" element={<UserSubmissionsApprovalPage />} />
        <Route path="/my-submissions" element={<MySubmissionsPage />} />
        <Route path="/track/:id" element={<TrackPage />} />
        <Route path="/speaker/:slug" element={<SpeakerPage />} />
        <Route path="/car" element={<CarModePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  // App root - providers wrap all providers
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
        <AudioLibraryProvider>
          <AudioPlayerProvider>
          <AppShell />
          </AudioPlayerProvider>
        </AudioLibraryProvider>
        </FavoritesProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
