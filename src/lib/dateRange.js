// ─── Date range presets + bucket helpers ───
// Used by Reports screen to filter aggregations by chosen period.

function toIso(d) {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// All presets return { from: "YYYY-MM-DD", to: "YYYY-MM-DD", label, granularity: "day"|"month" }
export const PRESETS = [
  { id: "today", label: "ថ្ងៃនេះ", build: () => ({ from: toIso(startOfDay(new Date())), to: toIso(new Date()), granularity: "day" }) },
  { id: "7d", label: "7 ​ថ្ងៃ", build: () => ({ from: toIso(daysAgo(6)), to: toIso(new Date()), granularity: "day" }) },
  { id: "30d", label: "30 ​ថ្ងៃ", build: () => ({ from: toIso(daysAgo(29)), to: toIso(new Date()), granularity: "day" }) },
  { id: "3m", label: "3 ​ខែ", build: () => ({ from: toIso(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1)), to: toIso(new Date()), granularity: "month" }) },
  { id: "12m", label: "12 ​ខែ", build: () => ({ from: toIso(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)), to: toIso(new Date()), granularity: "month" }) },
  { id: "ytd", label: "ឆ្នាំ​នេះ", build: () => ({ from: toIso(new Date(new Date().getFullYear(), 0, 1)), to: toIso(new Date()), granularity: "month" }) },
];

export function defaultRange() {
  const p = PRESETS.find(p => p.id === "12m");
  return { preset: "12m", ...p.build() };
}

/**
 * Build chart buckets for a date range.
 * Returns [{ key, label, fromIso, toIso, [metrics...]}, ...]
 */
export function buildBuckets({ from, to, granularity }) {
  const buckets = [];
  const fromD = new Date(from);
  const toD = new Date(to);
  if (granularity === "day") {
    let cur = new Date(fromD);
    while (cur <= toD) {
      const k = toIso(cur);
      buckets.push({
        key: k,
        label: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fromIso: k,
        toIso: k,
      });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    let cur = startOfMonth(fromD);
    while (cur <= toD) {
      const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({
        key: k,
        label: cur.toLocaleDateString('en-US', { month: 'short' }),
        year: cur.getFullYear(),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return buckets;
}

/**
 * Map a date string (YYYY-MM-DD or with time suffix) → bucket key
 */
export function bucketKeyForDate(dateStr, granularity) {
  if (!dateStr) return null;
  if (granularity === "day") return dateStr.slice(0, 10);
  return dateStr.slice(0, 7);
}

/**
 * Check if a date falls within a range (inclusive).
 */
export function dateInRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}
