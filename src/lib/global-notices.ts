export type GlobalNoticePriority = 'normal' | 'urgent' | 'info';

export interface GlobalNoticeRow {
  id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string;
  priority: GlobalNoticePriority;
  active: boolean;
  created_by: string | null;
  publish_at: string;
  expire_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalNoticeWithStatus extends GlobalNoticeRow {
  seen_at: string | null;
  read_at: string | null;
  is_seen: boolean;
  is_read: boolean;
}

export type AdminUpsertNoticeInput = {
  id?: string;
  title: string;
  body: string;
  url?: string | null;
  icon?: string | null;
  priority?: GlobalNoticePriority;
  active?: boolean;
  publish_at?: string | null;
  expire_at?: string | null;
};

export function validateAdminNoticeInput(input: Partial<AdminUpsertNoticeInput>): string | null {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  if (!title) return 'Notice title is required';
  if (!body) return 'Notice body is required';
  if (title.length > 200) return 'Title is too long (max 200 characters)';
  if (body.length > 2000) return 'Body is too long (max 2000 characters)';
  if (input.url && typeof input.url === 'string' && input.url.trim()) {
    try { new URL(input.url.trim()); } catch { return 'URL is not valid'; }
  }
  return null;
}

export function buildAdminNoticeRow(input: AdminUpsertNoticeInput) {
  const priority =
    input.priority === 'urgent' || input.priority === 'info' || input.priority === 'normal'
      ? input.priority
      : 'normal';
  const icon = String(input.icon || '🔔' || '').trim().slice(0, 8) || '🔔';
  const url =
    typeof input.url === 'string' && input.url.trim() ? input.url.trim() : null;
  const publishAt =
    typeof input.publish_at === 'string' && input.publish_at.trim()
      ? new Date(input.publish_at).toISOString()
      : new Date().toISOString();
  const expireAt =
    typeof input.expire_at === 'string' && input.expire_at.trim()
      ? new Date(input.expire_at).toISOString()
      : null;
  return {
    title: String(input.title || '').trim(),
    body: String(input.body || '').trim(),
    url,
    icon,
    priority,
    active: typeof input.active === 'boolean' ? input.active : true,
    publish_at: publishAt,
    expire_at: expireAt,
  };
}
