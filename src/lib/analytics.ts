import { initAnalytics, logEvent, setUserId, type Analytics } from './firebase'

type EventParams = Record<string, string | number | boolean | undefined | null>

function sanitizeParams(params?: EventParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string') {
      clean[key] = value.slice(0, 100)
    } else {
      clean[key] = value
    }
  }
  return clean
}

/** Fire-and-forget: wait for Analytics init, then log. Never blocks UI. */
function withAnalytics(fn: (instance: Analytics) => void) {
  void initAnalytics().then((instance) => {
    if (!instance) return
    try {
      fn(instance)
    } catch (err) {
      console.warn('[Analytics] event failed', err)
    }
  })
}

/** Track a SPA page view on every route change. */
export function trackPageView(path: string, title?: string) {
  withAnalytics((instance) => {
    logEvent(instance, 'page_view', {
      page_path: path,
      page_title: (title || document.title || 'Islamic Audio').slice(0, 100),
      page_location: typeof window !== 'undefined' ? window.location.href.slice(0, 100) : path,
    })
  })
}

/** Generic custom event. */
export function trackEvent(eventName: string, params?: EventParams) {
  withAnalytics((instance) => {
    logEvent(instance, eventName, sanitizeParams(params))
  })
}

export function identifyUser(userId?: string | null) {
  withAnalytics((instance) => {
    setUserId(instance, userId || null)
  })
}

/** New track started (or switched to). */
export function trackAudioPlay(track: {
  id: string
  title?: string
  category?: string
  reciter?: string
  duration?: number
}, source?: string) {
  trackEvent('audio_play', {
    track_id: track.id,
    track_title: track.title,
    category: track.category,
    reciter: track.reciter,
    duration_sec: track.duration != null ? Math.round(track.duration) : undefined,
    source: source || 'player',
  })
}

/** Resume after pause (same track). */
export function trackAudioResume(track: {
  id: string
  category?: string
  position?: number
}) {
  trackEvent('audio_resume', {
    track_id: track.id,
    category: track.category,
    position_sec: track.position != null ? Math.round(track.position) : undefined,
  })
}

export function trackAudioPause(track: {
  id: string
  category?: string
  position?: number
  duration?: number
}) {
  trackEvent('audio_pause', {
    track_id: track.id,
    category: track.category,
    position_sec: track.position != null ? Math.round(track.position) : undefined,
    duration_sec: track.duration != null ? Math.round(track.duration) : undefined,
  })
}

export function trackAudioComplete(track: {
  id: string
  category?: string
  duration?: number
}) {
  trackEvent('audio_complete', {
    track_id: track.id,
    category: track.category,
    duration_sec: track.duration != null ? Math.round(track.duration) : undefined,
  })
}

/** Fire once per milestone (25 / 50 / 75). */
export function trackAudioProgress(track: {
  id: string
  category?: string
}, percent: 25 | 50 | 75) {
  trackEvent('audio_progress', {
    track_id: track.id,
    category: track.category,
    percent,
  })
}

export function trackAudioError(trackId: string | undefined, message?: string) {
  trackEvent('audio_error', {
    track_id: trackId,
    message: message?.slice(0, 80),
  })
}
