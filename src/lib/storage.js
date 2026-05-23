// ─── Workspace storage adapter ───
// Stores entire app state as a single JSONB blob keyed by user_id.
// Saves are debounced 800 ms so quick consecutive edits coalesce into one network call.
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
export function queueSave(userId, payload, onResult) {
  _pending = { userId, payload };
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(async () => {
    const p = _pending;
    _pending = null;
    _timer = null;
    if (!p) return;
    const res = await saveWorkspace(p.userId, p.payload);
    onResult && onResult(res);
  }, 800);
}

// Force-flush pending save (e.g. before sign-out)
export async function flushSave() {
  if (!_pending) return { ok: true, reason: 'no-pending' };
  const p = _pending;
  _pending = null;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  return await saveWorkspace(p.userId, p.payload);
}
