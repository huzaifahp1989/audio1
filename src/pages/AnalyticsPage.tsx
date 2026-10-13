import React, { useState, useEffect } from 'react'
import { BarChart3, Users, Play, TrendingUp, Clock, Music, Eye, Activity } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { formatViews } from '../lib/views'
import { computeAnalyticsFromTracks } from '../lib/analyticsLocal'

interface AnalyticsStats {
  totalViews: number
  todayListens: number
  activeListeners: number
  totalTracks: number
  topTracks: Array<{
    id: string
    title: string
    category: string
    reciter: string
    views: number
    lastPlayedAt: string | null
  }>
  categoryBreakdown: Record<string, number>
  dailyStats: Array<{
    date: string
    totalListens: number
    uniqueListeners: number
  }>
}

export default function AnalyticsPage() {
  const { tracks } = useAudioLibrary()
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [tracks])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/analytics/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setError(null)
      } else {
        setStats(computeAnalyticsFromTracks(tracks))
        setError(null)
      }
    } catch {
      setStats(computeAnalyticsFromTracks(tracks))
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  const categoryLabels: Record<string, string> = {
    quran: 'Quran',
    nasheeds: 'Nasheeds',
    talks: 'Talks',
    audiobooks: 'Audiobooks',
    hadith: 'Hadith',
    dua: 'Dua',
    'kids-stories': 'Kids Stories',
    'kids-quran': 'Kids Quran',
    'kids-nasheeds': 'Kids Nasheeds',
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p>Failed to load analytics: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 shadow-sm sm:h-12 sm:w-12">
          <BarChart3 size={22} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Analytics Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time listening statistics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Play}
          label="Total Plays"
          value={formatViews(stats?.totalViews || 0)}
          color="violet"
        />
        <StatCard
          icon={Activity}
          label="Today's Listens"
          value={String(stats?.todayListens || 0)}
          color="emerald"
        />
        <StatCard
          icon={Users}
          label="Active Now"
          value={String(stats?.activeListeners || 0)}
          color="amber"
          pulse
        />
        <StatCard
          icon={Music}
          label="Total Tracks"
          value={String(stats?.totalTracks || 0)}
          color="sky"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Top Tracks */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} className="text-violet-500" />
            <h2 className="text-lg font-bold text-slate-800">Top 10 Most Played</h2>
          </div>

          <div className="space-y-3">
            {stats?.topTracks?.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{track.title}</p>
                  <p className="text-xs text-slate-500">
                    {track.reciter} · {categoryLabels[track.category] || track.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">{formatViews(track.views)}</p>
                  <p className="text-xs text-slate-400">plays</p>
                </div>
              </div>
            ))}
            
            {(!stats?.topTracks || stats.topTracks.length === 0) && (
              <p className="text-center text-slate-400 py-8">No plays recorded yet</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye size={20} className="text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-800">Plays by Category</h2>
          </div>

          <div className="space-y-4">
            {Object.entries(stats?.categoryBreakdown || {})
              .sort(([, a], [, b]) => b - a)
              .map(([category, views]) => {
                const total = stats?.totalViews || 1
                const percentage = Math.round((views / total) * 100)
                
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {categoryLabels[category] || category}
                      </span>
                      <span className="text-sm text-slate-500">
                        {formatViews(views)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            
            {Object.keys(stats?.categoryBreakdown || {}).length === 0 && (
              <p className="text-center text-slate-400 py-8">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {stats?.dailyStats && stats.dailyStats.length > 0 && (
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={20} className="text-sky-500" />
            <h2 className="text-lg font-bold text-slate-800">Last 30 Days Activity</h2>
          </div>

          <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-15 gap-2">
            {stats.dailyStats.map((day) => {
              const maxListens = Math.max(...stats.dailyStats.map(d => d.totalListens), 1)
              const intensity = day.totalListens / maxListens
              
              return (
                <div
                  key={day.date}
                  className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-110"
                  style={{
                    backgroundColor: intensity > 0 
                      ? `rgba(139, 92, 246, ${0.1 + intensity * 0.9})` 
                      : '#f1f5f9',
                    color: intensity > 0.5 ? 'white' : '#64748b'
                  }}
                  title={`${day.date}: ${day.totalListens} plays`}
                >
                  {day.totalListens > 0 && day.totalListens}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center">
            Heatmap showing daily listen activity (darker = more plays)
          </p>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  color: 'violet' | 'emerald' | 'amber' | 'sky'
  pulse?: boolean
}

function StatCard({ icon: Icon, label, value, color, pulse }: StatCardProps) {
  const colorClasses = {
    violet: 'bg-violet-50 text-violet-600 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    sky: 'bg-sky-50 text-sky-600 border-sky-200',
  }

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-white/50 ${pulse ? 'animate-pulse' : ''}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )
}
