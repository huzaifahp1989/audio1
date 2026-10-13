import React, { useEffect, useState } from 'react'
import { Upload, X, UserPlus, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAuthModal } from '../context/AuthModalContext'

interface ContributorUploadNoticeProps {
  variant: 'nasheeds' | 'talks'
  className?: string
}

const COPY = {
  nasheeds: {
    label: 'Nasheeds',
    gradient: 'from-sky-600 to-blue-600',
    border: 'border-blue-200',
    bg: 'bg-gradient-to-r from-sky-50 to-blue-50',
    button: 'bg-blue-600 hover:bg-blue-700',
    text: 'text-blue-900',
    subtext: 'text-blue-800/80',
  },
  talks: {
    label: 'Talks',
    gradient: 'from-sky-600 to-cyan-600',
    border: 'border-sky-200',
    bg: 'bg-gradient-to-r from-sky-50 to-cyan-50',
    button: 'bg-sky-600 hover:bg-sky-700',
    text: 'text-sky-900',
    subtext: 'text-sky-800/80',
  },
}

const STORAGE_KEY = 'contributor-upload-notice-dismissed'

export default function ContributorUploadNotice({ variant, className = '' }: ContributorUploadNoticeProps) {
  const { user, loading } = useAuth()
  const { openAuthModal } = useAuthModal()
  const theme = COPY[variant]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (loading) return
    const dismissed = sessionStorage.getItem(`${STORAGE_KEY}-${variant}`) === '1'
    setVisible(!dismissed)
  }, [loading, variant])

  const dismiss = () => {
    sessionStorage.setItem(`${STORAGE_KEY}-${variant}`, '1')
    setVisible(false)
  }

  if (loading || !visible) return null

  return (
    <div
      className={`relative rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5 shadow-sm ${className}`}
      role="status"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600"
        aria-label="Dismiss notice"
      >
        <X size={16} />
      </button>

      <div className="flex gap-3 pr-8">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} text-white shadow-sm`}>
          <Upload size={18} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${theme.text}`}>
            {user ? `Add your ${theme.label}` : `Want to add your ${theme.label}?`}
          </p>
          <p className={`mt-1 text-xs sm:text-sm ${theme.subtext}`}>
            {user
              ? 'Use the upload section below. All uploads are reviewed by admin before they go live.'
              : 'Please sign up to contribute. All uploads go through admin approval before publishing.'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <ShieldCheck size={13} className="shrink-0" />
            Admin approval required for every upload
          </div>
          {!user && (
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className={`mt-3 inline-flex items-center gap-2 rounded-xl ${theme.button} px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm`}
            >
              <UserPlus size={15} />
              Sign up to upload
            </button>
          )}
          {user && (
            <Link
              to="/my-submissions"
              className={`mt-3 inline-flex items-center gap-2 rounded-xl ${theme.button} px-4 py-2 text-xs font-semibold text-white shadow-sm sm:text-sm`}
            >
              View my submissions
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
