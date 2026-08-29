import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { GlobalNoticePriority } from '../lib/global-notices';

// Shared Supabase configuration for global notices
const SHARED_SUPABASE_URL = 'https://jlqrbbqsuksncrxjcmbc.supabase.co';
const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTQ2MjYsImV4cCI6MjA4MTQ5MDYyNn0.LAphA03H5Jj7yjAKf6k5N_auYfLkgHiApGOURDQEy_w';

export type NoticeItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string;
  priority: GlobalNoticePriority;
  publishAt: string;
  expireAt: string | null;
  createdAt: string;
  updatedAt: string;
  seenAt: string | null;
  readAt: string | null;
  isSeen: boolean;
  isRead: boolean;
};

export type NoticeSummary = {
  total: number;
  unread_count: number;
  unseen_count: number;
  urgent_unread_count: number;
  notices: NoticeItem[];
  setupRequired?: boolean;
};

const emptySummary: NoticeSummary = {
  total: 0,
  unread_count: 0,
  unseen_count: 0,
  urgent_unread_count: 0,
  notices: [],
};

const GUEST_STORAGE_KEY = 'global_notices_guest_state_v1';

type GuestState = {
  seen: Record<string, string>;
  read: Record<string, string>;
};

function readGuestState(): GuestState {
  if (typeof window === 'undefined') return { seen: {}, read: {} };
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return { seen: {}, read: {} };
    const parsed = JSON.parse(raw) as GuestState;
    return {
      seen: parsed && typeof parsed.seen === 'object' ? parsed.seen : {},
      read: parsed && typeof parsed.read === 'object' ? parsed.read : {},
    };
  } catch {
    return { seen: {}, read: {} };
  }
}

function writeGuestState(state: GuestState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyGuestStateToSummary(s: NoticeSummary): NoticeSummary {
  if (typeof window === 'undefined') return s;
  const gs = readGuestState();
  const notices = s.notices.map((n) => {
    const seenAt = gs.seen[n.id] || n.seenAt;
    const readAt = gs.read[n.id] || n.readAt;
    return {
      ...n,
      seenAt,
      readAt,
      isSeen: n.isSeen || Boolean(seenAt),
      isRead: n.isRead || Boolean(readAt),
    };
  });
  const total = notices.length;
  let unread_count = 0;
  let unseen_count = 0;
  let urgent_unread_count = 0;
  for (const n of notices) {
    if (!n.isSeen) unseen_count += 1;
    if (!n.isRead) {
      unread_count += 1;
      if (n.priority === 'urgent') urgent_unread_count += 1;
    }
  }
  return { ...s, total, unread_count, unseen_count, urgent_unread_count, notices };
}

// Create a supabase client for the shared database
let sharedSupabaseClient: any = null;

function getSharedSupabaseClient() {
  if (sharedSupabaseClient) return sharedSupabaseClient;
  sharedSupabaseClient = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);
  return sharedSupabaseClient;
}

async function fetchLiveNotices(limit: number) {
  const supabase = getSharedSupabaseClient();
  const now = new Date().toISOString();
  
  const { data: rows, error } = await supabase
    .from('global_notices')
    .select(`
      id,title,body,url,icon,priority,publish_at,expire_at,created_at,updated_at,
      global_notice_views(user_id,seen_at,read_at)
    `)
    .eq('active', true)
    .lte('publish_at', now)
    .or('expire_at.is.null,expire_at.gt.' + now)
    .order('publish_at', { ascending: false })
    .limit(limit);

  return { rows, error };
}

function mapRowsToNotices(rows: any[] | null, userId: string | null): NoticeItem[] {
  return (rows || []).map((r: any) => {
    const views: Array<any> = Array.isArray(r.global_notice_views) ? r.global_notice_views : [];
    const mine = userId ? views.find((v) => v.user_id === userId) : undefined;
    return {
      id: r.id,
      title: r.title,
      body: r.body,
      url: r.url || null,
      icon: r.icon || '🔔',
      priority: (r.priority as any) || 'normal',
      publishAt: r.publish_at,
      expireAt: r.expire_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      seenAt: mine?.seen_at || null,
      readAt: mine?.read_at || null,
      isSeen: Boolean(mine?.seen_at),
      isRead: Boolean(mine?.read_at),
    };
  });
}

function summarize(notices: NoticeItem[]): NoticeSummary {
  const total = notices.length;
  let unread_count = 0;
  let unseen_count = 0;
  let urgent_unread_count = 0;
  for (const n of notices) {
    if (!n.isSeen) unseen_count += 1;
    if (!n.isRead) {
      unread_count += 1;
      if (n.priority === 'urgent') urgent_unread_count += 1;
    }
  }
  return { total, unread_count, unseen_count, urgent_unread_count, notices };
}

export function useNotices() {
  const [summary, setSummary] = useState<NoticeSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const { rows, error: fetchError } = await fetchLiveNotices(30);
      
      if (fetchError) {
        if (String(fetchError.message || '').includes('does not exist')) {
          setError('Notices table is not configured yet.');
          setSummary(emptySummary);
          return;
        }
        throw fetchError;
      }

      // Get current user from local storage (using the project's auth)
      const userStr = localStorage.getItem('sb-jlqrbbqsuksncrxjcmbc-auth-token');
      let userId: string | null = null;
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          userId = userData?.user?.id || null;
        } catch {}
      }

      const notices = mapRowsToNotices(rows, userId);
      const rawSummary = summarize(notices);
      const finalSummary = applyGuestStateToSummary(rawSummary);
      setSummary(finalSummary);
      setError(null);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      // Silently fail - show empty state instead of error for production
      console.warn('[useNotices] Failed to load notices:', e?.message);
      setSummary(emptySummary);
      setError(null);
    } finally {
      setLoading(false);
      lastFetchRef.current = Date.now();
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const ac = new AbortController();
    void fetchSummary(ac.signal);
    return () => ac.abort();
  }, [fetchSummary]);

  // Refresh on window focus and periodic refresh
  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > 8_000) {
        void fetchSummary();
      }
    };
    window.addEventListener('focus', onFocus);
    const iv = setInterval(() => {
      void fetchSummary();
    }, 45_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(iv);
    };
  }, [fetchSummary]);

  const markSeen = useCallback(async (noticeId: string) => {
    const now = new Date().toISOString();
    const gs = readGuestState();
    gs.seen[noticeId] = now;
    writeGuestState(gs);

    // Update local state
    setSummary((s) => ({
      ...s,
      unseen_count: Math.max(0, s.unseen_count - 1),
      notices: s.notices.map((n) =>
        n.id === noticeId ? { ...n, isSeen: true, seenAt: now } : n
      ),
    }));

    // Try to sync with server if user is authenticated
    try {
      const userStr = localStorage.getItem('sb-jlqrbbqsuksncrxjcmbc-auth-token');
      if (!userStr) return; // Guest - no server sync needed

      const supabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);
      
      await supabase
        .from('global_notice_views')
        .upsert(
          { notice_id: noticeId, seen_at: now },
          { onConflict: 'notice_id,user_id' }
        );
    } catch {
      // Silent fail - guest state is already saved
    }
  }, []);

  const markRead = useCallback(async (noticeId: string) => {
    const now = new Date().toISOString();
    const gs = readGuestState();
    gs.read[noticeId] = now;
    gs.seen[noticeId] = gs.seen[noticeId] || now;
    writeGuestState(gs);

    // Update local state
    setSummary((s) => {
      const item = s.notices.find((n) => n.id === noticeId);
      const wasUnread = item && !item.isRead;
      const wasUnseen = item && !item.isSeen;
      return {
        ...s,
        unread_count: Math.max(0, s.unread_count - (wasUnread ? 1 : 0)),
        unseen_count: Math.max(0, s.unseen_count - (wasUnseen ? 1 : 0)),
        urgent_unread_count:
          wasUnread && item?.priority === 'urgent'
            ? Math.max(0, s.urgent_unread_count - 1)
            : s.urgent_unread_count,
        notices: s.notices.map((n) =>
          n.id === noticeId
            ? { ...n, isRead: true, isSeen: true, readAt: now, seenAt: n.seenAt || now }
            : n
        ),
      };
    });

    // Try to sync with server if user is authenticated
    try {
      const userStr = localStorage.getItem('sb-jlqrbbqsuksncrxjcmbc-auth-token');
      if (!userStr) return; // Guest - no server sync needed

      const supabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

      await supabase
        .from('global_notice_views')
        .upsert(
          { notice_id: noticeId, read_at: now, seen_at: now },
          { onConflict: 'notice_id,user_id' }
        );
    } catch {
      // Silent fail - guest state is already saved
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    const gs = readGuestState();
    for (const n of summary.notices) {
      gs.read[n.id] = now;
      gs.seen[n.id] = gs.seen[n.id] || now;
    }
    writeGuestState(gs);

    // Update local state
    setSummary((s) => ({
      ...s,
      unread_count: 0,
      unseen_count: 0,
      urgent_unread_count: 0,
      notices: s.notices.map((n) => ({
        ...n,
        isRead: true,
        isSeen: true,
        readAt: now,
        seenAt: n.seenAt || now,
      })),
    }));

    // Try to sync with server if user is authenticated
    try {
      const userStr = localStorage.getItem('sb-jlqrbbqsuksncrxjcmbc-auth-token');
      if (!userStr) return; // Guest - no server sync needed

      const supabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

      const rows = summary.notices.map((n) => ({
        notice_id: n.id,
        read_at: now,
        seen_at: now,
      }));

      await supabase
        .from('global_notice_views')
        .upsert(rows, { onConflict: 'notice_id,user_id' });
    } catch {
      // Silent fail - guest state is already saved
    }
  }, [summary.notices]);

  return {
    summary,
    loading,
    error,
    fetchSummary,
    markSeen,
    markRead,
    markAllRead,
  };
}
