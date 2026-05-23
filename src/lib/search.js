// ─── Global search ranker ───
// Builds a single ranked list of matches across all entity types.

function score(text, q) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 60;
  if (t.includes(q)) return 30;
  return 0;
}

export function searchAll(state, query, limit = 20) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];

  const results = [];

  // Customers
  (state.customers || []).forEach(c => {
    const s = Math.max(
      score(c.name, q),
      score(c.phone, q) * 0.9,
      score(c.id, q) * 0.8,
      score(c.address, q) * 0.6,
    );
    if (s > 0) results.push({ type: "customer", id: c.id, score: s,
      label: c.name, meta: c.phone, icon: "Users",
      color: c.color, initials: c.initials });
  });

  // Vehicles
  (state.vehicles || []).forEach(v => {
    const s = Math.max(
      score(v.plate, q) * 1.1,
      score(v.vin, q) * 0.9,
      score((v.make + " " + v.model), q) * 0.7,
      score(v.id, q) * 0.6,
    );
    if (s > 0) {
      const owner = (state.customers || []).find(c => c.id === v.owner);
      results.push({ type: "vehicle", id: v.id, ownerId: v.owner, score: s,
        label: `${v.plate} · ${v.make} ${v.model}`,
        meta: owner ? owner.name : v.owner, icon: "Car" });
    }
  });

  // Jobs
  (state.jobs || []).forEach(j => {
    const s = Math.max(
      score(j.id, q) * 1.1,
      score(j.title, q),
      score(j.tech, q) * 0.7,
    );
    if (s > 0) results.push({ type: "job", id: j.id, score: s,
      label: `${j.id} · ${j.title}`,
      meta: `${j.tech} · ${j.status}`, icon: "Wrench" });
  });

  // Parts
  (state.parts || []).forEach(p => {
    const s = Math.max(
      score(p.sku, q) * 1.1,
      score(p.name, q),
      score(p.nameEn, q),
      score(p.supplier, q) * 0.6,
      score(p.location, q) * 0.6,
    );
    if (s > 0) results.push({ type: "part", id: p.id, score: s,
      label: `${p.sku} · ${p.name}`,
      meta: `${p.supplier} · ${p.stock} in stock`, icon: "Box" });
  });

  // Invoices
  (state.invoices || []).forEach(i => {
    const s = Math.max(
      score(i.id, q) * 1.1,
      score(i.job, q) * 0.8,
    );
    if (s > 0) {
      const cust = (state.customers || []).find(c => c.id === i.customer);
      results.push({ type: "invoice", id: i.id, score: s,
        label: i.id, meta: `${cust ? cust.name : i.customer} · $${i.total}`, icon: "Doc" });
    }
  });

  // Quotations
  (state.quotations || []).forEach(q2 => {
    const s = score(q2.id, q) * 1.1;
    if (s > 0) {
      const cust = (state.customers || []).find(c => c.id === q2.customer);
      results.push({ type: "quote", id: q2.id, score: s,
        label: q2.id, meta: `${cust ? cust.name : q2.customer} · $${q2.total}`, icon: "Calc" });
    }
  });

  // Bookings
  (state.bookings || []).forEach(b => {
    const s = Math.max(
      score(b.id, q),
      score(b.service, q),
    );
    if (s > 0) {
      const cust = (state.customers || []).find(c => c.id === b.customer);
      results.push({ type: "booking", id: b.id, score: s,
        label: `${b.time} · ${b.service}`,
        meta: cust ? cust.name : b.customer, icon: "Cal" });
    }
  });

  // Members
  (state.members || []).forEach(m => {
    const s = Math.max(score(m.name, q), score(m.id, q) * 0.8);
    if (s > 0) results.push({ type: "member", id: m.id, score: s,
      label: m.name, meta: `${m.tier} · ${m.points} pts`, icon: "Star" });
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export const TYPE_LABELS = {
  customer: "អតិថិជន",
  vehicle: "រថយន្ត",
  job: "Job",
  part: "Part",
  invoice: "Invoice",
  quote: "Quote",
  booking: "Booking",
  member: "Member",
};
