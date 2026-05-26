import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal, Drawer } from './shell';
import { sendMessage, isConfigured as telegramConfigured, ownerForwardMessage, serviceReminderMessage } from './lib/telegram';
import { generateId } from './data';
// ─── Dashboard, Customers & Vehicles, Job Card screens ───
const G = GARAGE;
const { customers, vehicles, parts, jobs, invoices, quotations, bookings, technicians, members,
  customersById, vehiclesById, partsById, jobsById, vehicleLabel, statusColor, statusLabel, moneyUSD, moneyKHR } = G;

function Money({ value, currency }) {
  if (currency === "KHR") return <>{moneyKHR(value)}</>;
  if (currency === "BOTH") return <span>{moneyUSD(value)} <span className="muted" style={{ fontSize: '0.8em' }}>· {moneyKHR(value)}</span></span>;
  return <>{moneyUSD(value)}</>;
}

// ─── State-aware lookups (fall back to static seed data) ───
function lookupCustomer(id, state) {
  if (!id) return null;
  const list = (state && state.customers) || customers;
  return list.find(c => c.id === id) || customersById[id] || null;
}
function lookupVehicle(id, state) {
  if (!id) return null;
  const list = (state && state.vehicles) || vehicles;
  return list.find(v => v.id === id) || vehiclesById[id] || null;
}
function vehiclesByOwner(customerId, state) {
  const list = (state && state.vehicles) || vehicles;
  return list.filter(v => v.owner === customerId);
}
// Safe placeholders if customer/vehicle is missing
const MISSING_C = { name: "—", initials: "?", color: "#666", phone: "", address: "" };
const MISSING_V = { plate: "—", make: "—", model: "", year: "", vin: "", color: "", mileage: 0 };

// ─── Cambodia address picker (Province → District → Commune → Village) ───
let _addrCache = null;
function loadAddressData() {
  if (_addrCache) return _addrCache;
  const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
  _addrCache = Promise.all([
    fetch(base + "data/provinces.json").then(r => r.json()),
    fetch(base + "data/districts.json").then(r => r.json()),
    fetch(base + "data/communes.json").then(r => r.json()),
    fetch(base + "data/villages.json").then(r => r.json()),
  ]).then(([provinces, districts, communes, villages]) => ({ provinces, districts, communes, villages }))
    .catch(() => ({ provinces: [], districts: [], communes: [], villages: [] }));
  return _addrCache;
}

function AddressPicker({ value, onChange }) {
  const [data, setData] = React.useState(null);
  const [prov, setProv] = React.useState("");
  const [dist, setDist] = React.useState("");
  const [comm, setComm] = React.useState("");
  const [vill, setVill] = React.useState("");

  React.useEffect(() => { loadAddressData().then(setData); }, []);

  function compose(p, d, c, v, src) {
    if (!src) return "";
    const parts = [];
    const vObj = v && src.villages.find(x => String(x.id) === String(v));
    const cObj = c && src.communes.find(x => String(x.id) === String(c));
    const dObj = d && src.districts.find(x => String(x.id) === String(d));
    const pObj = p && src.provinces.find(x => String(x.id) === String(p));
    if (vObj) parts.push("ភូមិ " + vObj.name_km);
    if (cObj) parts.push("ឃុំ/សង្កាត់ " + cObj.name_km);
    if (dObj) parts.push("ស្រុក/ខណ្ឌ " + dObj.name_km);
    if (pObj) parts.push("ខេត្ត/រាជធានី " + pObj.name_km);
    return parts.join(" · ");
  }
  function emit(p, d, c, v) { onChange && onChange(compose(p, d, c, v, data)); }
  function onProv(v) { setProv(v); setDist(""); setComm(""); setVill(""); emit(v, "", "", ""); }
  function onDist(v) { setDist(v); setComm(""); setVill(""); emit(prov, v, "", ""); }
  function onComm(v) { setComm(v); setVill(""); emit(prov, dist, v, ""); }
  function onVill(v) { setVill(v); emit(prov, dist, comm, v); }

  if (!data) return <div className="muted" style={{ fontSize: 12 }}>កំពុងផ្ទុកទិន្នន័យអាសយដ្ឋាន...</div>;

  const dists = prov ? data.districts.filter(d => String(d.province_id) === String(prov)) : [];
  const comms = dist ? data.communes.filter(c => String(c.district_id) === String(dist)) : [];
  const vills = comm ? data.villages.filter(v => String(v.commune_id) === String(comm)) : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div className="field">
        <label>ខេត្ត/រាជធានី · PROVINCE</label>
        <select className="select" value={prov} onChange={e => onProv(e.target.value)}>
          <option value="">— ជ្រើសរើស —</option>
          {data.provinces.map(p => <option key={p.id} value={p.id}>{p.name_km}</option>)}
        </select>
      </div>
      <div className="field">
        <label>ស្រុក/ខណ្ឌ · DISTRICT</label>
        <select className="select" value={dist} onChange={e => onDist(e.target.value)} disabled={!prov}>
          <option value="">— ជ្រើសរើស —</option>
          {dists.map(d => <option key={d.id} value={d.id}>{d.name_km}</option>)}
        </select>
      </div>
      <div className="field">
        <label>ឃុំ/សង្កាត់ · COMMUNE</label>
        <select className="select" value={comm} onChange={e => onComm(e.target.value)} disabled={!dist}>
          <option value="">— ជ្រើសរើស —</option>
          {comms.map(c => <option key={c.id} value={c.id}>{c.name_km}</option>)}
        </select>
      </div>
      <div className="field">
        <label>ភូមិ · VILLAGE</label>
        <select className="select" value={vill} onChange={e => onVill(e.target.value)} disabled={!comm}>
          <option value="">— ជ្រើសរើស —</option>
          {vills.map(v => <option key={v.id} value={v.id}>{v.name_km}</option>)}
        </select>
      </div>
      {value && (
        <div style={{ gridColumn: '1 / -1', padding: 10, background: 'var(--bg-2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-1)' }}>
          <span className="mono muted" style={{ fontSize: 10, letterSpacing: '0.12em', marginRight: 8 }}>អាសយដ្ឋាន</span>
          {value}
        </div>
      )}
    </div>
  );
}

function exportCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
function DashboardScreen({ state, currency, onNav, toast }) {
  const dJobs = state?.jobs || jobs;
  const dParts = state?.parts || parts;
  const dInvoices = state?.invoices || invoices;
  const dBookings = state?.bookings || bookings;
  const dCustomers = state?.customers || [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRevenue = dInvoices.filter(i => i.issued === todayStr).reduce((s, i) => s + (i.paid || 0), 0);
  const openJobs = dJobs.filter(j => j.status !== "done").length;
  const lowStock = dParts.filter(p => (p.stock || 0) <= (p.reorder || 0)).length;
  const todayBookings = dBookings.length;

  // ── Live aggregations for the chart row ──
  // 7-day revenue trend
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: 0, jobs: 0 });
  }
  const dayIdx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  dInvoices.forEach(inv => {
    if (dayIdx[inv.issued] != null) days[dayIdx[inv.issued]].revenue += inv.paid || 0;
  });
  dJobs.forEach(j => {
    const k = (j.created || "").slice(0, 10);
    if (dayIdx[k] != null) days[dayIdx[k]].jobs++;
  });
  const maxRev = Math.max(...days.map(d => d.revenue), 1);
  const weekRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const weekJobs = days.reduce((s, d) => s + d.jobs, 0);
  const yesterdayRev = days[5] ? days[5].revenue : 0;
  const dayDelta = yesterdayRev ? Math.round(((days[6].revenue - yesterdayRev) / yesterdayRev) * 100) : 0;

  // Outstanding A/R
  const outstanding = dInvoices.reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0);
  const overdueCount = dInvoices.filter(i => i.status === "overdue").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">ថ្ងៃនេះ · ពុធ ១៧ ឧសភា ២០២៦ · សរុបសកម្មភាព ៤២ ករណី</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => { exportCsv("jobs-summary.csv", dJobs.map(j => ({ id: j.id, title: j.title, status: j.status, tech: j.tech, priority: j.priority, created: j.created, promised: j.promised }))); toast && toast(`នាំចេញ ${dJobs.length} Jobs (CSV)`, "ok"); }}><Icon.Download size={14} /> Export</button>
          <button className="btn btn-primary" onClick={() => onNav("jobs")}>
            <Icon.Plus size={14} /> បន្ថែម Job Card ថ្មី
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label"><span className="dot-blue" style={{ width: 6, height: 6, borderRadius: 3 }}></span> ចំណូលថ្ងៃនេះ · TODAY</div>
          <div className="kpi-value"><Money value={todayRevenue} currency={currency} /></div>
          <div className={"kpi-delta" + (dayDelta < 0 ? " down" : dayDelta === 0 ? " neutral" : "")}>{dayDelta >= 0 ? "▲" : "▼"} {Math.abs(dayDelta)}% · vs ម្សិលមិញ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot-amber" style={{ width: 6, height: 6, borderRadius: 3 }}></span> Jobs · បើកចំហ</div>
          <div className="kpi-value">{openJobs}<span className="kpi-unit"> / {dJobs.length}</span></div>
          <div className="kpi-delta neutral">{weekJobs} jobs ​សប្ដាហ៍​នេះ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot-red" style={{ width: 6, height: 6, borderRadius: 3 }}></span> Low Stock</div>
          <div className="kpi-value">{lowStock}</div>
          <div className={"kpi-delta " + (lowStock > 0 ? "down" : "neutral")}>{lowStock > 0 ? "ត្រូវការបញ្ជាទិញ" : "ស្តុក​គ្រប់​គ្រាន់"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot-teal" style={{ width: 6, height: 6, borderRadius: 3 }}></span> Outstanding A/R</div>
          <div className="kpi-value"><Money value={outstanding} currency={currency} /></div>
          <div className={"kpi-delta " + (overdueCount > 0 ? "down" : "neutral")}>{overdueCount} overdue · {todayBookings} ​​​ការកក់​ថ្ងៃនេះ</div>
        </div>
      </div>

      {/* 7-day revenue chart */}
      <div className="card">
        <h3 className="card-title">
          ចំណូល​ 7 ​ថ្ងៃ​ចុង​ក្រោយ · 7-DAY REVENUE
          <span className="meta">សរុប {moneyUSD(weekRevenue)}</span>
        </h3>
        {weekRevenue === 0 ? (
          <div className="empty" style={{ padding: 28 }}>មិន​ទាន់​មាន​ការ​បង់​ប្រាក់​ក្នុង​ 7 ​ថ្ងៃ​ចុង​ក្រោយ</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {days.map((d, i) => {
              const h = (d.revenue / maxRev) * 100;
              const today = i === days.length - 1;
              return (
                <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div className="num" style={{ fontSize: 10, color: 'var(--text-2)' }}>{d.revenue ? '$' + Math.round(d.revenue) : ''}</div>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', background: today ? 'var(--accent)' : 'var(--info)', borderRadius: '4px 4px 0 0', height: h + "%", minHeight: d.revenue > 0 ? 2 : 0, opacity: today ? 1 : 0.5 + (i / days.length) * 0.5 }}></div>
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Today's schedule */}
        <div className="card">
          <h3 className="card-title">
            កាលវិភាគថ្ងៃនេះ · TODAY'S SCHEDULE
            <span className="meta">{dBookings.length} BOOKINGS</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dBookings.length === 0 && <div className="empty" style={{ padding: 16, fontSize: 12 }}>គ្មានការកក់ថ្ងៃនេះ</div>}
            {dBookings.map((b) => {
              const c = lookupCustomer(b.customer, state) || { name: "—", color: "#666" };
              const v = lookupVehicle(b.vehicle, state) || { plate: "—", make: "—", model: "", year: "" };
              const st = b.status === "checked-in" ? "amber" : b.status === "in-progress" ? "blue" : "gray";
              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border-0)' }}>
                  <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 18, color: 'var(--accent-text)' }}>{b.time}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.service} · <span className="mono" style={{ color: 'var(--text-2)' }}>{v.plate}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{c.name} · {vehicleLabel(v)} · Tech: {b.tech}</div>
                  </div>
                  <span className={"chip chip-" + st}>{b.status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Job status mix */}
        <JobStatusMix jobs={dJobs} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Technician load — recomputed from state.jobs */}
        <div className="card">
          <h3 className="card-title">បន្ទុកជាងជួសជុល · TECHNICIAN LOAD</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {technicians.map(t => {
              const liveLoad = dJobs.filter(j => j.tech === t.name && j.status !== "done").length;
              const cap = t.capacity || 4;
              const ratio = Math.min(1, liveLoad / cap);
              const tone = liveLoad >= cap ? "red" : ratio > 0.7 ? "orange" : "green";
              return (
                <div key={t.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div className="avatar av-sm" style={{ background: t.color, color: '#0b0b0b' }}>{t.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{t.role}</div>
                    </div>
                    <div className="num" style={{ fontSize: 12, color: 'var(--text-1)' }}>{liveLoad}/{cap} jobs</div>
                  </div>
                  <div className="bar"><div className={"bar-fill " + tone} style={{ width: (ratio * 100) + "%" }}></div></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue 7-day */}
        <div className="card">
          <h3 className="card-title">ចំណូល ៧ ថ្ងៃកន្លងមក · REVENUE</h3>
          <RevenueBars currency={currency} />
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <h3 className="card-title">
          ការជូនដំណឹង · ALERTS
          <span className="meta">5 ITEMS</span>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { kind: "warn", t: "ថ្ម GS Yuasa 65Ah ⋅ ស្តុក 4 ⋅ ក្រោម reorder 6", a: "បញ្ជាទិញ" },
            { kind: "warn", t: "ទឹកត្រជាក់ម៉ាស៊ីន (4L) ⋅ ស្តុក 3 ⋅ ក្រោម reorder 8", a: "បញ្ជាទិញ" },
            { kind: "info",  t: "Lexus RX350 ⋅ 2KA-3917 ⋅ Service due ៥ ថ្ងៃ", a: "ផ្ញើ SMS" },
            { kind: "info",  t: "Toyota Camry ⋅ 1AA-2202 ⋅ Service due ថ្ងៃនេះ", a: "ផ្ញើ SMS" },
            { kind: "danger",t: "Invoice INV-2406-068 ⋅ Overdue 4 ថ្ងៃ ⋅ ABA Bank Fleet", a: "Follow-up" },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)' }}>
              <span className={"dot-" + (r.kind === "warn" ? "orange" : r.kind === "danger" ? "red" : "blue")} style={{ width: 8, height: 8, borderRadius: 4 }}></span>
              <div style={{ flex: 1, fontSize: 13 }}>{r.t}</div>
              <button className="btn btn-sm">{r.a}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JobStatusMix({ jobs }) {
  const map = {
    waiting: { k: "រង់ចាំ", c: "gray" },
    diagnose: { k: "ត្រួតពិនិត្យ", c: "amber" },
    progress: { k: "កំពុងធ្វើ", c: "blue" },
    parts: { k: "រង់ចាំ Parts", c: "orange" },
    qc: { k: "QC", c: "teal" },
    done: { k: "បានបញ្ចប់", c: "green" },
  };
  const counts = {};
  Object.keys(map).forEach(k => counts[k] = 0);
  (jobs || []).forEach(j => { if (counts.hasOwnProperty(j.status)) counts[j.status] += 1; });
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const active = total - (counts.done || 0);
  const pct = total ? Math.round((active / total) * 100) : 0;
  return (
    <div className="card">
      <h3 className="card-title">ស្ថានភាព Jobs · STATUS MIX</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div className="donut" style={{ '--pct': pct }}>
          <div className="donut-label">
            <div className="v">{pct}%</div>
            <div className="muted" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ACTIVE</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {Object.entries(map).filter(([k]) => k !== "waiting" || counts[k] > 0).map(([k, m]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span className={"dot-" + m.c} style={{ width: 8, height: 8, borderRadius: 4 }}></span>
              <span style={{ flex: 1, color: 'var(--text-1)' }}>{m.k}</span>
              <span className="num" style={{ color: 'var(--text-0)', fontWeight: 600 }}>{counts[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueBars({ currency }) {
  const days = [
    { d: "ច័ន្ទ", v: 612 },
    { d: "អង្គារ", v: 480 },
    { d: "ពុធ", v: 920 },
    { d: "ព្រ.", v: 1024 },
    { d: "សុក្រ", v: 880 },
    { d: "សៅរ៍", v: 1380 },
    { d: "ថ្ងៃនេះ", v: 622 },
  ];
  const max = Math.max(...days.map(d => d.v));
  const total = days.reduce((s, d) => s + d.v, 0);
  return (
    <div>
      <div className="num" style={{ fontSize: 30, fontWeight: 700, marginBottom: 4 }}><Money value={total} currency={currency} /></div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 18 }}>សរុបសប្តាហ៍នេះ · ▲ 22% w/w</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: (d.v / max * 100) + "%", background: i === days.length - 1 ? 'var(--accent)' : 'var(--info)', borderRadius: '4px 4px 0 0', opacity: i === days.length - 1 ? 1 : 0.55, transition: 'opacity 0.2s' }} title={moneyUSD(d.v)}></div>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>{d.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CUSTOMERS & VEHICLES
// ════════════════════════════════════════════════════════════
function CustomersScreen({ state, search, currency, onOpenCustomer, onNav, onAddCustomer, toast }) {
  const [filter, setFilter] = React.useState("all");
  const customers = state.customers;
  const vehicles = state.vehicles || G.vehicles;
  const filtered = customers.filter(c => {
    if (filter === "vip" && !c.tags.includes("VIP")) return false;
    if (filter === "corp" && c.type !== "corporate") return false;
    if (filter === "new" && !c.tags.includes("NEW")) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(c.name || "").toLowerCase().includes(s) && !(c.phone || "").includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Customer + Vehicle</h1>
          <div className="page-sub">អតិថិជន & រថយន្ត · សរុប {customers.length} នាក់ · {vehicles.length} រថយន្ត</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={async () => {
            const today = new Date().toISOString().slice(0, 10);
            const cutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            const due = vehicles.filter(v => v.nextService && v.nextService !== '—' && v.nextService <= cutoff);
            if (due.length === 0) { toast && toast("គ្មាន​រថយន្ត​ដល់​ពេល​សេវាកម្ម​នៅ 7 ​ថ្ងៃ​ខាង​មុខ", "info"); return; }
            const garageName = (state?.config && state.config.garageName) || "Garage";
            const tg = state?.config && state.config.telegram;
            if (!telegramConfigured(state?.config)) { toast && toast("Telegram មិន​បាន​ភ្ជាប់ · ​សុំ​ភ្ជាប់​នៅ Settings", "info"); return; }
            let sent = 0, failed = 0;
            for (const v of due) {
              const c = customers.find(x => x.id === v.owner);
              const msg = serviceReminderMessage(v, c, garageName);
              const target = c?.telegramChatId || tg.ownerChatId;
              const finalMsg = c?.telegramChatId ? msg : ownerForwardMessage(c?.name || v.plate, msg);
              const res = await sendMessage(tg.botToken, target, finalMsg);
              if (res.ok) sent++; else failed++;
            }
            toast && toast(`បាន​ផ្ញើ ${sent}/${due.length} ​សារ​រំលឹក${failed ? ` · ${failed} បរាជ័យ` : ''}`, sent > 0 ? "ok" : "error");
          }}><Icon.Bell size={14} /> ផ្ញើ​​សារ​រំលឹក​សេវាកម្ម</button>
          <button className="btn" onClick={() => { exportCsv("customers.csv", customers.map(c => ({ id: c.id, name: c.name, type: c.type, phone: c.phone, address: c.address, since: c.since, points: c.points, lifetime: c.lifetime, jobs: c.jobs }))); toast && toast(`នាំចេញ ${customers.length} អតិថិជន (CSV)`, "ok"); }}><Icon.Download size={14} /> នាំចេញ</button>
          <button className="btn" onClick={() => toast && toast("នាំចូល Excel (ឆាប់ៗ)", "info")}><Icon.Up size={14} /> នាំចូល Excel</button>
          <button className="btn btn-primary" onClick={onAddCustomer}><Icon.Plus size={14} /> បន្ថែមអតិថិជន</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">សរុបអតិថិជន</div>
          <div className="kpi-value num">{customers.length}</div>
          <div className="kpi-delta">▲ 12 ខែនេះ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">បុគ្គល / CORPORATE</div>
          <div className="kpi-value num">{customers.filter(c=>c.type==='personal').length}<span className="kpi-unit"> / {customers.filter(c=>c.type==='corporate').length}</span></div>
          <div className="kpi-delta neutral">75% បុគ្គល</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">សរុបរថយន្ត</div>
          <div className="kpi-value num">{vehicles.length}</div>
          <div className="kpi-delta neutral">1.6 រថយន្ត / អតិថិជន</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">សកម្ម ៩០ ថ្ងៃ</div>
          <div className="kpi-value num">7</div>
          <div className="kpi-delta">88% Retention</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { id: "all", label: "ទាំងអស់", n: customers.length },
          { id: "vip", label: "VIP", n: customers.filter(c => c.tags.includes("VIP")).length },
          { id: "corp", label: "Corporate", n: customers.filter(c => c.type === "corporate").length },
          { id: "new", label: "ថ្មី (NEW)", n: customers.filter(c => c.tags.includes("NEW")).length },
        ].map(f => (
          <button key={f.id} className={"btn btn-sm" + (filter === f.id ? " btn-primary" : "")} onClick={() => setFilter(f.id)}>
            {f.label} <span className="num" style={{ opacity: 0.7 }}>{f.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }}></div>
        <button className="btn btn-sm" onClick={() => toast && toast("ប្រើ tab ខាងលើ (ទាំងអស់/VIP/Corporate/ថ្មី) ដើម្បីត្រង", "info")}><Icon.Filter size={12} /> Filter</button>
      </div>

      {/* Customer cards */}
      <div className="section-heading"><h2>បញ្ជីអតិថិជន</h2><span className="sub">{filtered.length} លទ្ធផល</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ cursor: 'pointer', padding: 18 }} onClick={() => onOpenCustomer(c.id)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <div className="avatar av-lg" style={{ background: c.color, color: '#0b0b0b' }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {c.type === "corporate" ? "Corporate · " + c.vehicles.length + " Vehicles" : c.phone + (c.telegram ? " · Telegram ✓" : "")}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{c.address}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  អតិថិជនតាំងពី · {c.since}{c.terms ? " · " + c.terms : ""}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {c.tags.map(t => (
                <span key={t} className={"chip " + (
                  t === "VIP" ? "chip-teal" :
                  t === "CORPORATE" ? "chip-amber" :
                  t === "CONTRACT SLA" ? "chip-purple" :
                  t === "LOYALTY" ? "chip-green" :
                  t === "NEW" ? "chip-pink" : "chip-gray"
                )}>
                  {t === "LOYALTY" ? "LOYALTY " + c.points + " PTS" : t}
                </span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-0)' }}>
              <div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{c.jobs}</div>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.12em' }}>JOBS</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{moneyUSD(c.lifetime)}</div>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.12em' }}>LIFETIME</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{c.vehicles.length}</div>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{c.vehicles.length === 1 ? "VEHICLE" : "VEHICLES"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vehicles table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>ប្រវត្តិរថយន្ត · VEHICLE REGISTRY</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{vehicles.length} គ្រឿង · ${vehicles.filter(v=>v.status==='due'||v.status==='overdue').length} ត្រូវការ Service</div>
          </div>
          <button className="btn btn-sm">មើលទាំងអស់ <Icon.Right size={12} /></button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ស្លាកលេខ</th>
              <th>រថយន្ត</th>
              <th>ម្ចាស់</th>
              <th>VIN</th>
              <th className="num">គីឡូម៉ែត្រ</th>
              <th>Service ក្រោយ</th>
              <th>ស្ថានភាព</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.slice(0, 10).map(v => {
              const c = lookupCustomer(v.owner, state) || MISSING_C;
              const stColor = v.status === "overdue" ? "red" : v.status === "due" ? "orange" : "green";
              const stLabel = v.status === "overdue" ? "OVERDUE" : v.status === "due" ? "DUE SOON" : "ON SCHEDULE";
              return (
                <tr key={v.id}>
                  <td className="mono" style={{ fontWeight: 700, color: 'var(--text-0)' }}>{v.plate}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{vehicleLabel(v)}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{v.color}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar av-sm" style={{ background: c.color, color: '#0b0b0b', fontSize: 10 }}>{c.initials}</div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="mono muted" style={{ fontSize: 11 }}>{v.vin}</td>
                  <td className="num">{v.mileage.toLocaleString()}</td>
                  <td className="mono">{v.nextService}</td>
                  <td><span className={"chip chip-" + stColor}>{stLabel}</span></td>
                  <td><button className="btn btn-sm btn-ghost"><Icon.More size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Customer drawer
function CustomerDrawer({ id, state, setState, onClose, currency, onNewJob, onNewQuote, toast }) {
  const c = lookupCustomer(id, state);
  const [editing, setEditing] = React.useState(false);
  const [addVehOpen, setAddVehOpen] = React.useState(false);
  const [editVeh, setEditVeh] = React.useState(null);
  const [confirmDelVeh, setConfirmDelVeh] = React.useState(null);
  const [confirmDelCust, setConfirmDelCust] = React.useState(false);
  const [stmtOpen, setStmtOpen] = React.useState(false);
  if (!c) return null;
  const cvehs = vehiclesByOwner(id, state);
  const cjobs = (state?.jobs || jobs).filter(j => j.customer === id);
  return (
    <Drawer onClose={onClose} width={620}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="avatar av-lg" style={{ background: c.color, color: '#0b0b0b' }}>{c.initials}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                {c.name}
                {c.telegramChatId && <span title={`Telegram Chat ID: ${c.telegramChatId}`} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 6, fontWeight: 600 }}>📱 Telegram</span>}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>{c.id} · {c.phone}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {setState && <button className="icon-btn" title="កែប្រែ" onClick={() => setEditing(true)}><Icon.Pen size={14} /></button>}
            {setState && <button className="icon-btn" title="លុបអតិថិជន" onClick={() => setConfirmDelCust(true)}><Icon.Trash size={14} /></button>}
            <button className="icon-btn" onClick={onClose}><Icon.X size={16} /></button>
          </div>
        </div>
        {editing && <EditCustomerModal customer={c} state={state} setState={setState} onClose={() => setEditing(false)} toast={toast} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <Stat label="JOBS" value={c.jobs} />
          <Stat label="LIFETIME" value={moneyUSD(c.lifetime)} />
          <Stat label="POINTS" value={c.points || "—"} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { onNewJob && onNewJob(c.id); onClose(); }}><Icon.Plus size={12} /> Job ថ្មី</button>
          <button className="btn btn-sm" onClick={() => { onNewQuote && onNewQuote(c.id); onClose(); }}><Icon.Calc size={12} /> Quote</button>
          <button className="btn btn-sm" title="Statement" onClick={() => setStmtOpen(true)}><Icon.Doc size={12} /></button>
          <button className="btn btn-sm" onClick={() => { if (c.phone && c.phone !== "—") { window.open("tel:" + c.phone.replace(/\s/g, ""), "_self"); } else { toast && toast("គ្មានលេខទូរស័ព្ទ", "info"); } }}><Icon.Phone size={12} /></button>
          <button className="btn btn-sm" title="ផ្ញើ​សារ​សួរ​សុខ​ទុក្ខ​តាម Telegram" onClick={async () => {
            const garageName = (state?.config && state.config.garageName) || "Garage";
            const msg = `<b>👋 ${garageName}</b>\n\nជម្រាបសួរ ${c.name},\n\nសូម​អរគុណ​ដែល​ប្រើ​សេវាកម្ម​យើង។`;
            const tg = state?.config && state.config.telegram;
            if (telegramConfigured(state?.config) && c.telegramChatId) {
              const res = await sendMessage(tg.botToken, c.telegramChatId, msg);
              toast && toast(res.ok ? `បាន​ផ្ញើ​សារ​ទៅ ${c.name}` : `ផ្ញើ​បរាជ័យ · ${res.description}`, res.ok ? "ok" : "error");
            } else if (telegramConfigured(state?.config)) {
              const res = await sendMessage(tg.botToken, tg.ownerChatId, ownerForwardMessage(c.name, msg));
              toast && toast(res.ok ? `បាន​ផ្ញើ​ទៅ Telegram របស់​អ្នក · forward ​ទៅ ${c.name}` : `ផ្ញើ​បរាជ័យ · ${res.description}`, res.ok ? "ok" : "error");
            } else {
              toast && toast("Telegram មិន​បាន​ភ្ជាប់ · ​សុំ​ភ្ជាប់​នៅ Settings", "info");
            }
          }}><Icon.Mail size={12} /></button>
        </div>
        {stmtOpen && <CustomerStatementModal customer={c} state={state} currency={currency} onClose={() => setStmtOpen(false)} toast={toast} />}

        <div className="section-heading">
          <h2 style={{ fontSize: 14 }}>រថយន្ត · VEHICLES ({cvehs.length})</h2>
          {setState && <button className="btn btn-sm" onClick={() => setAddVehOpen(true)}><Icon.Plus size={12} /> បន្ថែម​រថយន្ត</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {cvehs.length === 0 && <div className="empty" style={{ padding: 14, fontSize: 12 }}>មិនទាន់មានរថយន្ត​នៅឡើយ</div>}
          {cvehs.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius)' }}>
              <div style={{ background: 'var(--bg-3)', padding: '6px 10px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{v.plate}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{vehicleLabel(v)}</div>
                <div className="muted" style={{ fontSize: 11 }}>{(v.mileage || 0).toLocaleString()} km · Next: {v.nextService || "—"}</div>
              </div>
              <span className={"chip chip-" + (v.status === "due" ? "orange" : v.status === "overdue" ? "red" : "green")}>{v.status || "ok"}</span>
              {setState && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm btn-ghost" title="កែ​រថយន្ត" onClick={() => setEditVeh(v)}><Icon.Pen size={12} /></button>
                  <button className="btn btn-sm btn-ghost" title="លុប" onClick={() => setConfirmDelVeh(v)}><Icon.X size={12} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        {addVehOpen && <AddVehicleModal customerId={c.id} state={state} setState={setState} onClose={() => setAddVehOpen(false)} toast={toast} />}
        {editVeh && <EditVehicleModal vehicle={editVeh} setState={setState} onClose={() => setEditVeh(null)} toast={toast} />}
        {confirmDelVeh && <ConfirmModal title="លុបរថយន្ត?" message={`លុប ${confirmDelVeh.plate} · ${vehicleLabel(confirmDelVeh)} ឬ​ទេ?`} onClose={() => setConfirmDelVeh(null)} onConfirm={() => { setState(s => ({ ...s, vehicles: s.vehicles.filter(x => x.id !== confirmDelVeh.id) })); toast(`លុប ${confirmDelVeh.plate} ជោគជ័យ`, "ok"); setConfirmDelVeh(null); }} />}
        {confirmDelCust && <ConfirmModal title="លុបអតិថិជន?" message={`លុប ${c.name} និង​រថយន្ត ${cvehs.length} គ្រឿង? Jobs/Invoices/Quotes នឹង​នៅ​ដដែល​តែ​អត់​មាន​អ្នកជា​​ម្ចាស់។`} danger onClose={() => setConfirmDelCust(false)} onConfirm={() => { setState(s => ({ ...s, customers: s.customers.filter(x => x.id !== c.id), vehicles: (s.vehicles || []).filter(v => v.owner !== c.id) })); toast(`លុប ${c.name} ជោគជ័យ`, "ok"); setConfirmDelCust(false); onClose(); }} />}

        <div className="section-heading"><h2 style={{ fontSize: 14 }}>ប្រវត្តិសេវាកម្ម · HISTORY</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cjobs.length === 0 && <div className="empty">មិនទាន់មាន Job ទេ</div>}
          {cjobs.map(j => {
            const jv = lookupVehicle(j.vehicle, state) || MISSING_V;
            return (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius)' }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)' }}>{j.id}</div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{j.title}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{jv.plate} · {(j.created || "").split(" ")[0] || "—"}</div>
                </div>
                <span className={"chip chip-" + statusColor(j.status)}>{j.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 'var(--radius)' }}>
      <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.12em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function AddCustomerModal({ onClose, state, setState, toast }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [type, setType] = React.useState("personal");
  const [telegramChatId, setTelegramChatId] = React.useState("");
  // Optional vehicle
  const [addVeh, setAddVeh] = React.useState(true);
  const [plate, setPlate] = React.useState("");
  const [make, setMake] = React.useState("Toyota");
  const [model, setModel] = React.useState("");
  const [year, setYear] = React.useState(2020);
  const PALETTE = ["#0fbfa1", "#22c55e", "#f5b400", "#a78bfa", "#38bdf8", "#f472b6", "#fb923c"];

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះអតិថិជន", "error"); return; }
    const cid = generateId("CU", state?.customers || []);
    const parts = name.trim().split(/\s+/);
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();

    // Optional vehicle creation
    let newVeh = null;
    if (addVeh && plate.trim()) {
      const vid = generateId("VE", state?.vehicles || []);
      newVeh = {
        id: vid, owner: cid, plate: plate.trim().toUpperCase(),
        make: make.trim() || "—", model: model.trim() || "—",
        year: +year || 2020, color: "—", vin: "—",
        mileage: 0, nextService: "—", status: "ok",
      };
    }

    const newC = {
      id: cid, name: name.trim(), initials, color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      type, phone: phone.trim() || "—", telegram: !!telegramChatId.trim(),
      telegramChatId: telegramChatId.trim() || undefined,
      address: address.trim() || "—", since: new Date().toISOString().slice(0, 10),
      tags: ["NEW"], points: 0,
      vehicles: newVeh ? [newVeh.id] : [],
      lifetime: 0, jobs: 0,
    };

    setState(s => ({
      ...s,
      customers: [newC, ...s.customers],
      vehicles: newVeh ? [newVeh, ...(s.vehicles || [])] : s.vehicles,
    }));
    toast(`បន្ថែម ${newC.name}${newVeh ? ` + ${newVeh.plate}` : ""} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title="អតិថិជនថ្មី · NEW CUSTOMER" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}>បន្ថែមអតិថិជន</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>ឈ្មោះ · NAME</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="ឧ. Sok Dara" autoFocus />
        </div>
        <div className="field">
          <label>ទូរស័ព្ទ · PHONE</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+855 ..." />
        </div>
        <div className="field">
          <label>ប្រភេទ · TYPE</label>
          <select className="select" value={type} onChange={e => setType(e.target.value)}>
            <option value="personal">Personal</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>អាសយដ្ឋាន · ADDRESS</label>
          <AddressPicker value={address} onChange={setAddress} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Telegram Chat ID <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(មិនបង្ខំ · ​ឱ្យ Bot ​ផ្ញើ​សារ​ផ្ទាល់​ទៅ​អតិថិជន)</span></label>
          <input className="input mono" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="ឧ. 8270854278" />
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            ​អតិថិជន​ត្រូវ: (1) ​ផ្ញើ <code>/start</code> ​ទៅ @userinfobot ដើម្បី​យក ID, (2) ​ផ្ញើ <code>/start</code> ទៅ bot ​អ្នក
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-0)', paddingTop: 14, marginTop: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={addVeh} onChange={e => setAddVeh(e.target.checked)} />
            បន្ថែមរថយន្ត · ADD VEHICLE
            <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(មិនបង្ខំ — អាចបន្ថែមក្រោយ)</span>
          </label>
        </div>
        {addVeh && (
          <>
            <div className="field">
              <label>ស្លាកលេខ · PLATE</label>
              <input className="input mono" value={plate} onChange={e => setPlate(e.target.value)} placeholder="2AB-1234" style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="field">
              <label>ឆ្នាំ · YEAR</label>
              <input className="input" type="number" min="1990" max="2030" value={year} onChange={e => setYear(e.target.value)} />
            </div>
            <div className="field">
              <label>ម៉ាក · MAKE</label>
              <select className="select" value={make} onChange={e => setMake(e.target.value)}>
                {["Toyota", "Honda", "Lexus", "Hyundai", "Kia", "Ford", "Mitsubishi", "Mazda", "Nissan", "BMW", "Mercedes-Benz", "Other"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>ម៉ូដែល · MODEL</label>
              <input className="input" value={model} onChange={e => setModel(e.target.value)} placeholder="Camry / Civic / RX350 ..." />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Edit Customer Modal ──
function EditCustomerModal({ customer, state, setState, onClose, toast }) {
  const [name, setName] = React.useState(customer.name || "");
  const [phone, setPhone] = React.useState(customer.phone === "—" ? "" : (customer.phone || ""));
  const [address, setAddress] = React.useState(customer.address === "—" ? "" : (customer.address || ""));
  const [type, setType] = React.useState(customer.type || "personal");
  const [telegramChatId, setTelegramChatId] = React.useState(customer.telegramChatId || "");

  function save() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះ", "error"); return; }
    const parts = name.trim().split(/\s+/);
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
    setState(s => ({
      ...s,
      customers: s.customers.map(c => c.id === customer.id ? {
        ...c,
        name: name.trim(),
        initials,
        phone: phone.trim() || "—",
        address: address.trim() || "—",
        type,
        telegram: !!telegramChatId.trim(),
        telegramChatId: telegramChatId.trim() || undefined,
      } : c),
    }));
    toast(`រក្សាទុក ${name} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title={"កែប្រែ · " + customer.id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>ឈ្មោះ · NAME</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>ទូរស័ព្ទ · PHONE</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+855 ..." />
        </div>
        <div className="field">
          <label>ប្រភេទ · TYPE</label>
          <select className="select" value={type} onChange={e => setType(e.target.value)}>
            <option value="personal">Personal</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>អាសយដ្ឋាន · ADDRESS</label>
          <AddressPicker value={address} onChange={setAddress} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Telegram Chat ID <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(មិនបង្ខំ · ​ឱ្យ Bot ​ផ្ញើ​ផ្ទាល់)</span></label>
          <input className="input mono" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="ឧ. 8270854278" />
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            ​អតិថិជន: (1) ផ្ញើ <code>/start</code> ​ទៅ​ @userinfobot ​យក ID, (2) ផ្ញើ <code>/start</code> ​ទៅ bot ​អ្នក
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Vehicle Modal (to existing customer) ──
function AddVehicleModal({ customerId, state, setState, onClose, toast }) {
  const [plate, setPlate] = React.useState("");
  const [make, setMake] = React.useState("Toyota");
  const [model, setModel] = React.useState("");
  const [year, setYear] = React.useState(2020);
  const [color, setColor] = React.useState("");
  const [vin, setVin] = React.useState("");
  const [mileage, setMileage] = React.useState(0);

  function save() {
    if (!plate.trim()) { toast("បំពេញ​ស្លាក​លេខ", "error"); return; }
    const vid = generateId("VE", state?.vehicles || []);
    const v = {
      id: vid, owner: customerId, plate: plate.trim().toUpperCase(),
      make: make.trim() || "—", model: model.trim() || "—",
      year: +year || 2020, color: color.trim() || "—", vin: vin.trim() || "—",
      mileage: +mileage || 0, nextService: "—", status: "ok",
    };
    setState(s => ({
      ...s,
      vehicles: [v, ...(s.vehicles || [])],
      customers: s.customers.map(c => c.id === customerId ? { ...c, vehicles: [...(c.vehicles || []), vid] } : c),
    }));
    toast(`បន្ថែម ${v.plate} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title="រថយន្ត​ថ្មី · NEW VEHICLE" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={save}><Icon.Plus size={14} /> បន្ថែម​រថយន្ត</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field"><label>ស្លាក​លេខ · PLATE</label><input className="input" value={plate} onChange={e => setPlate(e.target.value)} placeholder="2AB-1234" autoFocus /></div>
        <div className="field"><label>ឆ្នាំ</label><input className="input" type="number" value={year} onChange={e => setYear(e.target.value)} /></div>
        <div className="field"><label>ម៉ាក · MAKE</label><input className="input" value={make} onChange={e => setMake(e.target.value)} /></div>
        <div className="field"><label>ម៉ូដែល · MODEL</label><input className="input" value={model} onChange={e => setModel(e.target.value)} placeholder="Camry" /></div>
        <div className="field"><label>ពណ៌ · COLOR</label><input className="input" value={color} onChange={e => setColor(e.target.value)} placeholder="ស / Black" /></div>
        <div className="field"><label>គីឡូម៉ែត្រ · MILEAGE</label><input className="input" type="number" value={mileage} onChange={e => setMileage(e.target.value)} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>VIN</label><input className="input" value={vin} onChange={e => setVin(e.target.value)} placeholder="17 តួ" /></div>
      </div>
    </Modal>
  );
}

// ── Edit Vehicle Modal ──
function EditVehicleModal({ vehicle, setState, onClose, toast }) {
  const [plate, setPlate] = React.useState(vehicle.plate || "");
  const [make, setMake] = React.useState(vehicle.make === "—" ? "" : (vehicle.make || ""));
  const [model, setModel] = React.useState(vehicle.model === "—" ? "" : (vehicle.model || ""));
  const [year, setYear] = React.useState(vehicle.year || 2020);
  const [color, setColor] = React.useState(vehicle.color === "—" ? "" : (vehicle.color || ""));
  const [vin, setVin] = React.useState(vehicle.vin === "—" ? "" : (vehicle.vin || ""));
  const [mileage, setMileage] = React.useState(vehicle.mileage || 0);
  const [status, setStatus] = React.useState(vehicle.status || "ok");

  function save() {
    if (!plate.trim()) { toast("បំពេញ​ស្លាក​លេខ", "error"); return; }
    setState(s => ({
      ...s,
      vehicles: s.vehicles.map(v => v.id === vehicle.id ? {
        ...v,
        plate: plate.trim().toUpperCase(),
        make: make.trim() || "—",
        model: model.trim() || "—",
        year: +year || 2020,
        color: color.trim() || "—",
        vin: vin.trim() || "—",
        mileage: +mileage || 0,
        status,
      } : v),
    }));
    toast(`រក្សាទុក ${plate} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title={"កែ​រថយន្ត · " + vehicle.plate} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field"><label>ស្លាក​លេខ · PLATE</label><input className="input" value={plate} onChange={e => setPlate(e.target.value)} autoFocus /></div>
        <div className="field"><label>ឆ្នាំ</label><input className="input" type="number" value={year} onChange={e => setYear(e.target.value)} /></div>
        <div className="field"><label>ម៉ាក · MAKE</label><input className="input" value={make} onChange={e => setMake(e.target.value)} /></div>
        <div className="field"><label>ម៉ូដែល · MODEL</label><input className="input" value={model} onChange={e => setModel(e.target.value)} /></div>
        <div className="field"><label>ពណ៌ · COLOR</label><input className="input" value={color} onChange={e => setColor(e.target.value)} /></div>
        <div className="field"><label>គីឡូម៉ែត្រ · MILEAGE</label><input className="input" type="number" value={mileage} onChange={e => setMileage(e.target.value)} /></div>
        <div className="field"><label>VIN</label><input className="input" value={vin} onChange={e => setVin(e.target.value)} /></div>
        <div className="field"><label>ស្ថានភាព · STATUS</label>
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ok">OK</option>
            <option value="due">Due Soon</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ── Confirm Modal (generic) ──
function ConfirmModal({ title, message, danger, onClose, onConfirm }) {
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className={"btn " + (danger ? "btn-danger" : "btn-primary")} onClick={onConfirm}><Icon.Check size={14} /> បញ្ជាក់</button>
      </>}>
      <div style={{ fontSize: 14, lineHeight: 1.6, padding: '4px 0' }}>{message}</div>
      {danger && <div style={{ marginTop: 12, padding: 10, background: 'rgba(239,68,68,0.12)', borderLeft: '3px solid var(--danger)', borderRadius: 4, fontSize: 12, color: 'var(--danger)' }}>⚠️ សកម្មភាពនេះ​មិន​អាច​ត្រឡប់​ក្រោយ​បានទេ</div>}
    </Modal>
  );
}

// ── Customer Statement Modal (history + PDF) ──
function CustomerStatementModal({ customer, state, currency, onClose, toast }) {
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const cvehs = vehiclesByOwner(customer.id, state);
  const cjobs = ((state && state.jobs) || jobs).filter(j => j.customer === customer.id);
  const cinvs = ((state && state.invoices) || invoices).filter(i => i.customer === customer.id);
  const cquotes = ((state && state.quotations) || quotations).filter(q => q.customer === customer.id);

  const totalBilled = cinvs.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = cinvs.reduce((s, i) => s + (i.paid || 0), 0);
  const outstanding = totalBilled - totalPaid;
  const today = new Date().toISOString().slice(0, 10);

  async function downloadPdf() {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { downloadElementAsPdf } = await import('./lib/pdf');
      const safeName = (customer.name || customer.id).replace(/[^a-zA-Z0-9-]/g, "_");
      await downloadElementAsPdf(sheetRef.current, `Statement-${safeName}-${today}.pdf`);
      toast(`បាន​ទាញ​យក Statement (${customer.name})`, "ok");
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal wide title={"Statement · " + customer.name} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បិទ</button>
        <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print</button>
        <button className="btn btn-primary" onClick={downloadPdf} disabled={downloading}><Icon.Download size={14} /> {downloading ? "កំពុង​បង្កើត..." : "ទាញ​យក PDF"}</button>
      </>}>
      <div ref={sheetRef} style={{ background: 'white', color: '#0a0d12', padding: 32, borderRadius: 8, fontFamily: 'var(--font-en)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #0a0d12' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: '#0b0b0b', fontWeight: 800, fontSize: 18 }}>G</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.02em' }}>GARAGE OS</div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#666' }}>SERVICE CENTER · PHNOM PENH</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>St. 271, Sangkat Toul Tom Pong<br />Phnom Penh, Cambodia · +855 23 555 100</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>STATEMENT</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{customer.id}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>As of {today}</div>
          </div>
        </div>

        {/* Customer info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>CUSTOMER</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{customer.name}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{customer.address}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{customer.phone}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Customer since: {customer.since || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>SUMMARY</div>
            <table style={{ width: '100%', fontSize: 12 }}>
              <tbody>
                <tr><td style={{ padding: 3, color: '#666' }}>Total Vehicles</td><td style={{ padding: 3, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cvehs.length}</td></tr>
                <tr><td style={{ padding: 3, color: '#666' }}>Total Jobs</td><td style={{ padding: 3, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{cjobs.length}</td></tr>
                <tr><td style={{ padding: 3, color: '#666' }}>Total Billed</td><td style={{ padding: 3, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(totalBilled)}</td></tr>
                <tr><td style={{ padding: 3, color: '#666' }}>Total Paid</td><td style={{ padding: 3, textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#22a85a', fontWeight: 700 }}>{moneyUSD(totalPaid)}</td></tr>
                <tr style={{ borderTop: '1px solid #ccc' }}>
                  <td style={{ padding: '6px 3px 3px', fontWeight: 700 }}>Outstanding</td>
                  <td style={{ padding: '6px 3px 3px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: outstanding > 0 ? '#dc2626' : '#0a0d12', fontSize: 14 }}>{moneyUSD(outstanding)}</td>
                </tr>
                {customer.points > 0 && <tr><td style={{ padding: 3, color: '#666' }}>Loyalty Points</td><td style={{ padding: 3, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-text)' }}>{customer.points}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicles */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>VEHICLES ({cvehs.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>PLATE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>MAKE / MODEL</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>VIN</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>MILEAGE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>NEXT SERVICE</th>
            </tr>
          </thead>
          <tbody>
            {cvehs.length === 0 && <tr><td colSpan={5} style={{ padding: '10px 12px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>គ្មាន​រថយន្ត</td></tr>}
            {cvehs.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v.plate}</td>
                <td style={{ padding: '8px 10px' }}>{vehicleLabel(v)}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#666' }}>{v.vin}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{(v.mileage || 0).toLocaleString()} km</td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{v.nextService || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Jobs history */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>SERVICE HISTORY ({cjobs.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>DATE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>JOB ID</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>VEHICLE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>SERVICE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {cjobs.length === 0 && <tr><td colSpan={5} style={{ padding: '10px 12px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>មិនទាន់​មាន Job ទេ</td></tr>}
            {cjobs.map(j => {
              const jv = lookupVehicle(j.vehicle, state) || MISSING_V;
              return (
                <tr key={j.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{(j.created || "").split(" ")[0]}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{j.id}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{jv.plate}</td>
                  <td style={{ padding: '8px 10px' }}>{j.title}</td>
                  <td style={{ padding: '8px 10px', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>{j.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Invoices */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>INVOICES ({cinvs.length})</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>DATE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>INVOICE ID</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>VEHICLE</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>TOTAL</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>PAID</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>BALANCE</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {cinvs.length === 0 && <tr><td colSpan={7} style={{ padding: '10px 12px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>គ្មាន Invoice</td></tr>}
            {cinvs.map(i => {
              const iv = lookupVehicle(i.vehicle, state) || MISSING_V;
              const bal = (i.total || 0) - (i.paid || 0);
              return (
                <tr key={i.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{i.issued}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{i.id}</td>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{iv.plate}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(i.total || 0)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#22a85a' }}>{moneyUSD(i.paid || 0)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: bal > 0 ? '#dc2626' : '#0a0d12' }}>{moneyUSD(bal)}</td>
                  <td style={{ padding: '8px 10px', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>{i.status}</td>
                </tr>
              );
            })}
            {cinvs.length > 0 && (
              <tr style={{ borderTop: '2px solid #0a0d12', background: '#fafafa' }}>
                <td colSpan={3} style={{ padding: '10px 10px', fontWeight: 800, letterSpacing: '0.06em' }}>TOTAL</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{moneyUSD(totalBilled)}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#22a85a' }}>{moneyUSD(totalPaid)}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: outstanding > 0 ? '#dc2626' : '#0a0d12', fontSize: 14 }}>{moneyUSD(outstanding)}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Quotes (compact) */}
        {cquotes.length > 0 && (
          <>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>QUOTATIONS ({cquotes.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>CREATED</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>QUOTE ID</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>VALID UNTIL</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>TOTAL</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {cquotes.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{q.created}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{q.id}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{q.valid}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(q.total)}</td>
                    <td style={{ padding: '8px 10px', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700 }}>{q.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        {outstanding > 0 && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 12, color: '#7a5a00' }}>
            <strong>Outstanding Balance:</strong> {moneyUSD(outstanding)} · សូម​ទូទាត់​នៅ​ឱកាស​ដ៏​ឆាប់
          </div>
        )}
        <div style={{ fontSize: 10, color: '#888', textAlign: 'center', letterSpacing: '0.04em', borderTop: '1px solid #eee', paddingTop: 14 }}>
          THANK YOU · សូមអរគុណចំពោះការគាំទ្ររបស់លោកអ្នក
        </div>
      </div>
    </Modal>
  );
}

export { DashboardScreen, CustomersScreen, CustomerDrawer, Stat, Money, Row, AddCustomerModal, EditCustomerModal, AddVehicleModal, EditVehicleModal, ConfirmModal, CustomerStatementModal, exportCsv,
  lookupCustomer, lookupVehicle, vehiclesByOwner, MISSING_C, MISSING_V };
