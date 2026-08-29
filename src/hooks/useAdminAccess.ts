import { useAuth } from '../context/AuthContext'

const SESSION_KEY = 'admin_authenticated'

/** Admin dashboard + review pages: password session or signed-in Supabase user */
export function useAdminAccess() {
  const { user, loading } = useAuth()
  const hasAccess =
    typeof window !== 'undefined' &&
    (sessionStorage.getItem(SESSION_KEY) === '1' || Boolean(user))

  return { hasAccess, loading, user }
}

export { SESSION_KEY as ADMIN_SESSION_KEY }
