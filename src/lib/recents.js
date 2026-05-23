// ─── Recent searches (localStorage) ───
// Stores the last N picked search results so the dropdown can show
// "Recent" suggestions when the query is empty.

const KEY = "garage-os:recent-searches";
const MAX = 5;

export function loadRecents() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveRecent(result) {
  if (!result || !result.type || !result.id) return loadRecents();
  const current = loadRecents();
  // De-dupe by type+id
  const filtered = current.filter(r => !(r.type === result.type && r.id === result.id));
  // Strip transient/large fields, keep only what the dropdown needs to render
  const entry = {
    type: result.type,
    id: result.id,
    ownerId: result.ownerId,
    label: result.label,
    meta: result.meta,
    icon: result.icon,
    color: result.color,
    initials: result.initials,
    ts: Date.now(),
  };
  const next = [entry, ...filtered].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function clearRecents() {
  try { localStorage.removeItem(KEY); } catch {}
  return [];
}
