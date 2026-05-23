// ─── Workspace storage adapter ───
// Stores entire app state as a single JSONB blob keyed by user_id.
// Saves are debounced 800 ms so quick consecutive edits coalesce into one network call.
// When offline, saves are queued and automatically flushed on `online` event.
import { supabase, isConfigured } from './supabase';

const TABLE = 'workspaces';

export async function loadWorkspace(userId) {
  if (!isConfigured || !userId) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[storage] load error:', error.message);
    return null;
  }
  return data?.data || null;
}

export async function saveWorkspace(userId, payload) {
  if (!isConfigured || !userId) return { ok: false, reason: 'not-configured' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, reason: 'offline' };
  }
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) {
    console.warn('[storage] save error:', error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

// Debounced saver — call queueSave(userId, payload) freely; one upsert per 800 ms.
let _timer = null;
let _pending = null;
let _lastOnResult = null;

async function _flushNow() {
  const p = _pending;
  if (!p) return { ok: true, reason: 'no-pending' };
  // Don't clear _pending yet — if save fails offline, we'll retry later.
  const res = await saveWorkspace(p.userId, p.payload);
  if (res.ok) {
    _pending = null;
  }
  // Notify the most recent listener
  if (_lastOnResult) _lastOnResult(res);
  return res;
}

export function queueSave(userId, payload, onResult) {
  _pending = { userId, payload };
  _lastOnResult = onResult;
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    _flushNow();
  }, 800);
}

// Force-flush pending save (e.g. before sign-out)
export async function flushSave() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  return _flushNow();
}

export function hasPendingSave() {
  return !!_pending;
}

// Auto-retry pending save when the browser reconnects.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (_pending) {
      console.info('[storage] back online, flushing queued save');
      _flushNow();
    }
  });
}
