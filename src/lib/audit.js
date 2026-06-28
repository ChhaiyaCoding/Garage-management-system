// ─── Audit log ───
// Records important/destructive actions (delete, payment, restore…) with a
// full snapshot of the affected record so deletes are recoverable.
// Stored in state.auditLog (persisted to Supabase like the rest of state).

export function auditEntry(action, entity, entityId, detail, snapshot) {
  return {
    id: "AL-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: new Date().toISOString(),
    action,        // 'delete' | 'restore' | 'payment' | 'stock' | 'void'
    entity,        // 'invoice' | 'customer' | 'vehicle' | 'job' | 'part' | 'member' | 'quote' | 'booking'
    entityId,
    detail: detail || "",   // human-readable summary (Khmer)
    snapshot: snapshot || null, // full record for restore (delete only)
  };
}

// Prepend an entry; cap at 1000 to keep the workspace blob small.
export function pushAudit(s, entry) {
  return [entry, ...(s.auditLog || [])].slice(0, 1000);
}

// Khmer labels for entities + actions (for the viewer).
export const ENTITY_KM = {
  invoice: "វិក្កយបត្រ",
  customer: "អតិថិជន",
  vehicle: "រថយន្ត",
  job: "Job Card",
  part: "Part",
  member: "សមាជិក",
  quote: "តម្លៃប៉ាន់ស្មាន",
  booking: "ការកក់",
};

export const ACTION_KM = {
  delete: "លុប",
  restore: "ស្ដារ",
  payment: "ការបង់",
  stock: "ស្តុក",
  void: "លុបចោល",
};
