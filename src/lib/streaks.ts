const KEY = 'listening-streak'

interface StreakData {
  lastDate: string
  current: number
  best: number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load(): StreakData {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { lastDate: '', current: 0, best: 0 }
  } catch {
    return { lastDate: '', current: 0, best: 0 }
  }
}

function save(data: StreakData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

/** Call when user starts playing audio. Updates streak once per calendar day. */
export function recordListeningDay(): StreakData {
  const data = load()
  const today = todayKey()
  if (data.lastDate === today) return data

  if (data.lastDate === yesterdayKey()) {
    data.current += 1
  } else {
    data.current = 1
  }
  data.best = Math.max(data.best, data.current)
  data.lastDate = today
  save(data)
  return data
}

export function getListeningStreak(): StreakData {
  const data = load()
  const today = todayKey()
  if (data.lastDate !== today && data.lastDate !== yesterdayKey()) {
    return { ...data, current: 0 }
  }
  return data
}
