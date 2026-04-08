import React from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Music2, Mic2, Star, ArrowRight, BookText, Scroll, Hand } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackCard from '../components/TrackCard'

const HERO_CATEGORIES = [
  {
    to: '/quran',
    label: 'Quran',
    desc: 'Holy recitations by world-renowned reciters',
    icon: BookOpen,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  {
    to: '/nasheeds',
    label: 'Nasheeds',
    desc: 'Beautiful Islamic vocal performances',
    icon: Music2,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
  },
  {
    to: '/talks',
    label: 'Talks',
    desc: 'Inspiring lectures and khutbahs',
    icon: Mic2,
    gradient: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  {
    to: '/audiobooks',
    label: 'Audiobooks',
    desc: 'Islamic books with text support',
    icon: BookText,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  {
    to: '/hadith',
    label: 'Hadith',
    desc: 'Collections with full text',
    icon: Scroll,
    gradient: 'from-emerald-600 to-green-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  {
    to: '/dua',
    label: 'Dua',
    desc: 'Daily adhkar and supplications',
    icon: Hand,
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
  },
  {
    to: '/kids',
    label: 'Kids',
    desc: 'Fun educational audio for children',
    icon: Star,
    gradient: 'from-pink-400 to-rose-500',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
  },
]

export default function HomePage() {
  const { tracks } = useAudioLibrary()
  const recent = tracks.slice(0, 6)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 p-8 md:p-14 mb-12 text-center shadow-xl">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-1.5 text-sm text-white mb-6">
            <span>📖</span> Islamic Audio Library
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow">
            Listen to the Voice of <span className="text-yellow-300">Islam</span>
          </h1>
          <p className="text-violet-100 text-lg max-w-xl mx-auto mb-8">
            Explore Quran recitations, nasheeds, Islamic talks and children's audio — all in one place.
          </p>
          <Link
            to="/quran"
            className="inline-flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 transition-colors font-semibold px-6 py-3 rounded-xl shadow-md"
          >
            Start Listening <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Browse Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HERO_CATEGORIES.map(({ to, label, desc, icon: Icon, gradient, bg, border, text }) => (
            <Link
              key={to}
              to={to}
              className={`group relative overflow-hidden rounded-xl ${bg} border ${border} p-6 hover:shadow-md hover:scale-[1.02] transition-all duration-200`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className={`font-bold ${text} text-lg mb-1`}>{label}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              <ArrowRight
                size={16}
                className="absolute bottom-4 right-4 text-slate-300 group-hover:text-slate-500 transition-colors"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Recent uploads */}
      {recent.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-6">Recently Uploaded</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((track, index) => (
              <TrackCard key={track.id} track={track} tracks={recent} index={index} />
            ))}
          </div>
        </section>
      )}

      {tracks.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <p className="text-slate-500">No audio uploaded yet.</p>
          <Link to="/admin" className="text-violet-600 hover:text-violet-700 text-sm mt-2 inline-block font-medium">
            Go to Admin to upload audio →
          </Link>
        </div>
      )}
    </div>
  )
}
