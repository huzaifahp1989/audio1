import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AudioPlayerProvider } from './context/AudioPlayerContext'
import { AudioLibraryProvider } from './hooks/useAudioLibrary'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import QuranPage from './pages/QuranPage'
import NasheedsPage from './pages/NasheedsPage'
import TalksPage from './pages/TalksPage'
import KidsPage from './pages/KidsPage'
import KidsRecordPage from './pages/KidsRecordPage'
import AdminPage from './pages/AdminPage'
import RecordPage from './pages/RecordPage'
import AudiobookPage from './pages/AudiobookPage'
import HadithPage from './pages/HadithPage'
import DuaPage from './pages/DuaPage'

export default function App() {
  return (
    <BrowserRouter>
      <AudioLibraryProvider>
        <AudioPlayerProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/quran" element={<QuranPage />} />
              <Route path="/nasheeds" element={<NasheedsPage />} />
              <Route path="/talks" element={<TalksPage />} />
              <Route path="/kids" element={<KidsPage />} />
              <Route path="/kids/studio" element={<KidsRecordPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/record" element={<RecordPage />} />
              <Route path="/audiobooks" element={<AudiobookPage />} />
              <Route path="/hadith" element={<HadithPage />} />
              <Route path="/dua" element={<DuaPage />} />
            </Route>
          </Routes>
        </AudioPlayerProvider>
      </AudioLibraryProvider>
    </BrowserRouter>
  )
}
