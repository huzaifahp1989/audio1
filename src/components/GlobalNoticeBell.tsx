import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotices, type NoticeItem, type NoticeSummary } from '../hooks/useNotices';
import type { GlobalNoticePriority } from '../lib/global-notices';

const emptySummary: NoticeSummary = {
  total: 0,
  unread_count: 0,
  unseen_count: 0,
  urgent_unread_count: 0,
  notices: [],
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 8) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function priorityBadge(p: GlobalNoticePriority) {
  switch (p) {
    case 'urgent':
      return { label: 'URGENT', className: 'bg-rose-500/10 text-rose-600 ring-rose-500/20' };
    case 'info':
      return { label: 'INFO', className: 'bg-sky-500/10 text-sky-700 ring-sky-500/20' };
    default:
      return { label: 'NOTICE', className: 'bg-amber-500/10 text-amber-700 ring-amber-500/20' };
  }
}

// Wrapper component to handle errors gracefully
export const GlobalNoticeBell: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Fallback bell that always renders
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          className="relative inline-flex items-center justify-center transition-all h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-300 bg-white shadow-sm text-slate-800"
          aria-label="Notifications"
        >
          <Bell size={compact ? 18 : 20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <GlobalNoticeBellInner compact={compact} onError={() => setHasError(true)} />
  );
};

const GlobalNoticeBellInner: React.FC<{ compact?: boolean; onError?: () => void }> = ({ 
  compact = false,
  onError
}) => {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<NoticeSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<number>(0);
  const panelOpenedForMarkSeenRef = useRef<Set<string>>(new Set());

  // Ensure component only renders on client to avoid hydration issues
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Catch any errors in the component
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('GlobalNoticeBell') || e.filename?.includes('GlobalNoticeBell')) {
        console.error('[GlobalNoticeBell] Caught error:', e);
        onError?.();
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  const noticesHook = useNotices();

  const { 
    summary: hookSummary, 
    loading: hookLoading, 
    error: hookError, 
    fetchSummary,
    markSeen: hookMarkSeen,
    markRead: hookMarkRead,
    markAllRead: hookMarkAllRead
  } = noticesHook;

  // Sync with hook
  useEffect(() => {
    setSummary(hookSummary);
    setLoading(hookLoading);
    setError(hookError);
  }, [hookSummary, hookLoading, hookError]);

  const unread = summary.unread_count ?? 0;
  const unseen = summary.unseen_count ?? 0;
  const hasUrgent = (summary.urgent_unread_count ?? 0) > 0;

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      const inBell = rootRef.current && t && rootRef.current.contains(t);
      const inPanel = panelRef.current && t && panelRef.current.contains(t);
      if (!inBell && !inPanel) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When panel opens, mark all visible notices as "seen"
  useEffect(() => {
    if (!open) return;
    const toMark = summary.notices
      .filter((n) => !n.isSeen && !panelOpenedForMarkSeenRef.current.has(n.id))
      .map((n) => n.id);
    if (toMark.length === 0) return;
    panelOpenedForMarkSeenRef.current = new Set([
      ...panelOpenedForMarkSeenRef.current,
      ...toMark,
    ]);
    setSummary((s) => ({
      ...s,
      unseen_count: Math.max(0, s.unseen_count - toMark.length),
      notices: s.notices.map((n) =>
        toMark.includes(n.id) ? { ...n, isSeen: true, seenAt: new Date().toISOString() } : n
      ),
    }));
    // Call hook to persist
    for (const id of toMark) {
      void hookMarkSeen(id);
    }
  }, [open, summary.notices, hookMarkSeen]);

  const handleMarkRead = async (id: string) => {
    setMarkingIds((s) => new Set(s).add(id));
    try {
      await hookMarkRead(id);
    } finally {
      setMarkingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await hookMarkAllRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const displayCount = unread > 0 ? unread : unseen > 0 ? unseen : 0;
  const badgeTone =
    hasUrgent
      ? 'bg-rose-500 text-white'
      : unread > 0
      ? 'bg-amber-500 text-white'
      : 'bg-sky-500 text-white';

  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalHost(document.body);
      try {
        let el = document.getElementById('bell-panel-mount') as HTMLElement | null;
        if (!el) {
          el = document.createElement('div');
          el.setAttribute('id', 'bell-panel-mount');
          document.body.appendChild(el);
        }
        setPortalHost(el);
      } catch {
        setPortalHost(document.body);
      }
    }
  }, []);

  // Don't render until client-side to avoid hydration mismatches
  if (!hasMounted) {
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          className="relative inline-flex items-center justify-center transition-all h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-300 bg-white shadow-sm text-slate-800"
          aria-label="Notifications"
        >
          <Bell size={compact ? 18 : 20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          displayCount > 0
            ? `Notifications · ${displayCount} unread`
            : 'Open notifications'
        }
        title={
          displayCount > 0
            ? `${displayCount} unread notification${displayCount === 1 ? '' : 's'}${
                hasUrgent ? ' · urgent' : ''
              }`
            : 'Notifications'
        }
        className={[
          'relative inline-flex items-center justify-center transition-all',
          compact
            ? 'h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-300 bg-white shadow-sm text-slate-800 hover:bg-teal-50 hover:text-teal-700'
            : 'h-10 w-10 rounded-xl border-2 border-slate-300 bg-white shadow-md text-slate-800 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-400',
          hasUrgent
            ? 'ring-4 ring-rose-300/70 bg-rose-50 text-rose-700 animate-pulse'
            : unread > 0
            ? 'ring-4 ring-amber-300/60'
            : '',
        ].join(' ')}
      >
        {hasUrgent && (
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-rose-400/50 animate-ping" aria-hidden />
        )}
        <Bell size={compact ? 18 : 20} strokeWidth={2} aria-hidden />
        {displayCount > 0 && (
          <span
            aria-hidden
            className={[
              'pointer-events-none absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-extrabold leading-none ring-2 ring-white shadow-md',
              badgeTone,
              hasUrgent ? 'ring-rose-400/70' : unread > 0 ? 'ring-amber-300/60' : 'ring-transparent',
            ].join(' ')}
          >
            {displayCount > 99 ? '99+' : String(displayCount)}
          </span>
        )}
      </button>

      {portalHost &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="bell-scrim"
                  aria-hidden
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="sm:hidden fixed inset-0 z-[59] bg-slate-900/55 backdrop-blur-[2px]"
                />
                <motion.div
                  key="bell-panel"
                  ref={panelRef}
                  role="dialog"
                  aria-modal={true}
                  aria-label="Notifications"
                  initial={{ opacity: 0, y: 12, scale: 0.992 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.992 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className={[
                    'sm:absolute sm:right-4 sm:top-16 sm:mt-0 sm:z-[60] sm:w-[22rem] md:w-[26rem]',
                    'fixed inset-x-0 bottom-0 z-[60] sm:inset-auto sm:bottom-auto',
                    'rounded-t-3xl sm:rounded-3xl border-x sm:border-2 border-t-2 border-slate-200 sm:border-slate-200',
                    'bg-white',
                    'shadow-[0_-22px_60px_-16px_rgba(15,23,42,0.45)] sm:shadow-[0_18px_50px_-12px_rgba(15,23,42,0.35),0_6px_18px_-6px_rgba(15,23,42,0.22)]',
                    'overflow-hidden isolate flex flex-col',
                    'max-h-[88svh] sm:max-h-[70vh]',
                    'pb-[env(safe-area-inset-bottom,0px)]',
                  ].join(' ')}
                  style={{ transformOrigin: 'top right' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-br from-teal-100 via-white to-amber-100">
                    <div className="w-full flex items-start justify-center pt-1.5 pb-1 sm:hidden">
                      <span
                        aria-hidden
                        className="block h-1.5 w-12 rounded-full bg-slate-300 shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="sm:pt-0 px-4 pt-1 pb-3 border-b border-slate-200 bg-gradient-to-br from-teal-100 via-white to-amber-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">🔔</span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 leading-tight">
                          Notifications
                        </p>
                        <p className="text-[11px] font-medium text-slate-600 truncate">
                          {error
                            ? error
                            : summary.total === 0
                            ? loading
                              ? 'Loading…'
                              : 'No notices right now'
                            : `${summary.total} notice${summary.total === 1 ? '' : 's'} · ${unread} unread`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(unread > 0 || unseen > 0) && (
                        <button
                          type="button"
                          onClick={() => void handleMarkAllRead()}
                          disabled={markingAll}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-sm"
                        >
                          {markingAll ? (
                            <Loader2 size={12} className="animate-spin" aria-hidden />
                          ) : (
                            <CheckCheck size={12} aria-hidden />
                          )}
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400 font-semibold"
                        aria-label="Close notifications"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 max-h-[calc(88svh-140px)] sm:max-h-[calc(70vh-140px)] overflow-y-auto bg-slate-50 overscroll-contain">
                    {loading && summary.notices.length === 0 ? (
                      <div className="px-4 py-6 flex items-center justify-center text-slate-600 text-sm gap-2 bg-white">
                        <Loader2 size={16} className="animate-spin text-teal-600" aria-hidden />
                        Loading notices…
                      </div>
                    ) : summary.notices.length === 0 ? (
                      <div className="px-6 py-10 text-center bg-white">
                        <p className="text-4xl mb-2">🎉</p>
                        <p className="text-sm font-bold text-slate-900">All caught up!</p>
                        <p className="text-xs text-slate-500 mt-1">
                          New notices will appear here.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-200 bg-white">
                        {summary.notices.map((n) => {
                          const badge = priorityBadge(n.priority);
                          const hasLink = Boolean(n.url);
                          const marking = markingIds.has(n.id);
                          return (
                            <li
                              key={n.id}
                              className={[
                                'relative px-4 py-3.5',
                                !n.isSeen
                                  ? 'bg-gradient-to-r from-amber-50 via-white to-white'
                                  : !n.isRead
                                  ? 'bg-white'
                                  : 'bg-slate-50',
                              ].join(' ')}
                            >
                              {!n.isSeen && (
                                <span
                                  className="pointer-events-none absolute left-0 top-0 bottom-0 w-[4px] rounded-r-full bg-gradient-to-b from-amber-400 via-rose-500 to-rose-600 animate-pulse"
                                  aria-hidden
                                />
                              )}
                              <div className="flex items-start gap-3">
                                <div className="shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center text-2xl bg-white ring-2 ring-slate-200 shadow-sm">
                                  {n.icon || '🔔'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-extrabold text-slate-900 leading-tight truncate">
                                          {n.title}
                                        </p>
                                        <span
                                          className={[
                                            'inline-flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] rounded-full px-2 py-0.5 ring-1',
                                            badge.className,
                                          ].join(' ')}
                                        >
                                          {badge.label}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-semibold text-slate-600">
                                          {timeAgo(n.publishAt || n.createdAt)}
                                        </span>
                                        <span aria-hidden className="h-1 w-1 rounded-full bg-slate-300" />
                                        <time
                                          dateTime={n.publishAt || n.createdAt}
                                          className="text-[11px] font-medium text-slate-500"
                                          title={fmtDate(n.publishAt || n.createdAt)}
                                        >
                                          {fmtDate(n.publishAt || n.createdAt)}
                                        </time>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void handleMarkRead(n.id)}
                                      disabled={marking || n.isRead}
                                      title={n.isRead ? 'Read' : 'Mark as read'}
                                      aria-label={n.isRead ? 'Notice is read' : 'Mark notice as read'}
                                      className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 ring-1 ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400"
                                    >
                                      {marking ? (
                                        <Loader2 size={14} className="animate-spin text-teal-700" aria-hidden />
                                      ) : n.isRead ? (
                                        <CheckCheck size={16} className="text-teal-600" aria-hidden />
                                      ) : (
                                        <Check size={16} aria-hidden />
                                      )}
                                    </button>
                                  </div>
                                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                                    {n.body}
                                  </p>
                                  {hasLink && (
                                    <div className="mt-2.5">
                                      <a
                                        href={n.url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100"
                                      >
                                        Open link <ExternalLink size={12} aria-hidden />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-medium text-slate-500">
                      Auto-refreshes every 45s
                    </span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          portalHost
        )}
    </div>
  );
};

export default GlobalNoticeBell;
