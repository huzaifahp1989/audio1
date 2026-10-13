import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SUPABASE_URL } from '../lib/supabase'

export type AuthMode = 'signup' | 'login'

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: AuthMode
}

export default function SignupModal({ isOpen, onClose, initialMode = 'signup' }: SignupModalProps) {
  const { configured, signUp, signIn } = useAuth()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const isSignup = mode === 'signup'

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setError('')
      setSuccess('')
    }
  }, [isOpen, initialMode])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!configured) {
      setError('Auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.')
      return
    }

    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (!password) {
      setError('Please enter a password')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (isSignup) {
      if (!fullName.trim()) {
        setError('Please enter your full name')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setLoading(true)
    try {
      if (isSignup) {
        const { needsEmailConfirmation } = await signUp(email, password, fullName.trim())
        if (needsEmailConfirmation) {
          setSuccess('Account created! Check your email to confirm, then log in.')
        } else {
          setSuccess('Account created successfully!')
          setTimeout(() => {
            onClose()
            resetForm()
          }, 1500)
        }
      } else {
        await signIn(email, password)
        setSuccess('Welcome back!')
        setTimeout(() => {
          onClose()
          resetForm()
        }, 800)
      }
    } catch (err: unknown) {
      let errorMessage = isSignup ? 'Signup failed. Please try again.' : 'Login failed. Please try again.'
      const message = err instanceof Error ? err.message : String(err)

      if (/user already registered|already exists/i.test(message)) {
        errorMessage = 'This email is already registered. Try logging in instead.'
      } else if (/invalid api key/i.test(message)) {
        errorMessage = 'Invalid Supabase API key. In .env.local, use the anon key from the same project as VITE_SUPABASE_URL (Supabase Dashboard → Project Settings → API).'
      } else if (/failed to fetch|networkerror|network request failed/i.test(message)) {
        errorMessage = `Could not reach Supabase. Current URL: ${SUPABASE_URL}. Make sure this matches your project.`
      } else if (/invalid login credentials/i.test(message)) {
        errorMessage = 'Invalid email or password.'
      } else if (/email not confirmed/i.test(message)) {
        errorMessage = 'Please confirm your email before logging in.'
      } else if (message) {
        errorMessage = message
      }

      setError(errorMessage)
      console.error('[AuthModal error]', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[min(82dvh,640px)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        <div className="sm:hidden shrink-0 flex justify-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        </div>
        <div className="shrink-0 bg-gradient-to-r from-teal-50 to-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
          <h2 id="auth-modal-title" className="text-lg sm:text-xl font-bold text-slate-800">
            {isSignup ? 'Create Account' : 'Log In'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4 sm:mb-5">
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isSignup ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                !isSignup ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Log In
            </button>
          </div>

          {success ? (
            <div className="flex flex-col items-center justify-center py-6 sm:py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-slate-800 text-center">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {isSignup && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isSignup && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-sm"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      disabled={loading}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 sm:mt-6 bg-gradient-to-r from-teal-600 to-amber-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (isSignup ? 'Creating Account...' : 'Logging In...')
                  : (isSignup ? 'Sign Up' : 'Log In')}
              </button>

              {isSignup && (
                <p className="text-xs text-slate-500 text-center mt-4">
                  By signing up, you agree to submit quality Islamic audio content.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
