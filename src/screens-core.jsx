import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal, Drawer } from './shell';
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
  const todayRevenue = dInvoices.filter(i => i.issued === "2026-05-17").reduce((s, i) => s + i.paid, 0) + 246.5;
  const openJobs = dJobs.filter(j => j.status !== "done").length;
  const lowStock = dParts.filter(p => p.stock <= p.reorder).length;
  const todayBookings = dBookings.length;

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
          <div className="kpi-delta">▲ 18% · vs ម្សិលមិញ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot-amber" style={{ width: 6, height: 6, borderRadius: 3 }}></span> Jobs · បើកចំហ</div>
          <div className="kpi-value">{openJobs}<span className="kpi-unit"> / 14</span></div>
          <div className="kpi-delta neutral">6 ត្រូវបញ្ចប់ថ្ងៃនេះ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot-red" style={{ width: 6, height: 6, borderRadius: 3 }}></span> Low Stock</div>
          <div className="kpi-value">{lowStock}</div>
          <div className="kpi-delta down">ត្រូវការបញ្ជាទិញ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><span className="dot-teal" style={{ width: 6, height: 6, borderRadius: 3 }}></span> ការកក់ថ្ងៃនេះ</div>
          <div className="kpi-value">{todayBookings}</div>
          <div className="kpi-delta">▲ 2 ការកក់ថ្មី</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Today's schedule */}
        <div className="card">
          <h3 className="card-title">
            កាលវិភាគថ្ងៃនេះ · TODAY'S SCHEDULE
            <span className="meta">{bookings.length} BOOKINGS</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookings.map((b) => {
              const c = customersById[b.customer];
              const v = vehiclesById[b.vehicle];
              const st = b.status === "checked-in" ? "amber" : b.status === "in-progress" ? "blue" : "gray";
              return (
                <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border-0)' }}>
                  <div style={{ fontFamily: 'var(--font-num)', fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>{b.time}</div>
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
        <div className="card">
          <h3 className="card-title">ស្ថានភាព Jobs · STATUS MIX</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div className="donut" style={{ '--pct': 64 }}>
              <div className="donut-label">
                <div className="v">64%</div>
                <div className="muted" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ACTIVE</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {[
                { k: "កំពុងធ្វើ", v: 4, c: "blue" },
                { k: "ត្រួតពិនិត្យ", v: 2, c: "amber" },
                { k: "រង់ចាំ Parts", v: 1, c: "orange" },
                { k: "QC", v: 1, c: "teal" },
                { k: "បានបញ្ចប់", v: 6, c: "green" },
              ].map(r => (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span className={"dot-" + r.c} style={{ width: 8, height: 8, borderRadius: 4 }}></span>
                  <span style={{ flex: 1, color: 'var(--text-1)' }}>{r.k}</span>
                  <span className="num" style={{ color: 'var(--text-0)', fontWeight: 600 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Technician load */}
        <div className="card">
          <h3 className="card-title">បន្ទុកជាងជួសជុល · TECHNICIAN LOAD</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {technicians.map(t => (
              <div key={t.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div className="avatar av-sm" style={{ background: t.color, color: '#0b0b0b' }}>{t.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{t.role}</div>
                  </div>
                  <div className="num" style={{ fontSize: 12, color: 'var(--text-1)' }}>{t.load}/{t.capacity} jobs</div>
                </div>
                <div className="bar"><div className={"bar-fill " + (t.load === t.capacity ? "red" : t.load / t.capacity > 0.7 ? "orange" : "green")} style={{ width: (t.load / t.capacity * 100) + "%" }}></div></div>
              </div>
            ))}
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
      if (!c.name.toLowerCase().includes(s) && !c.phone.includes(s)) return false;
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
              const c = customersById[v.owner];
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
function CustomerDrawer({ id, state, onClose, currency, onNewJob, onNewQuote, toast }) {
  const c = lookupCustomer(id, state);
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
              <div style={{ fontSize: 22, fontWeight: 700 }}>{c.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{c.id} · {c.phone}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon.X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <Stat label="JOBS" value={c.jobs} />
          <Stat label="LIFETIME" value={moneyUSD(c.lifetime)} />
          <Stat label="POINTS" value={c.points || "—"} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { onNewJob && onNewJob(c.id); onClose(); }}><Icon.Plus size={12} /> Job ថ្មី</button>
          <button className="btn btn-sm" onClick={() => { onNewQuote && onNewQuote(c.id); onClose(); }}><Icon.Calc size={12} /> Quote</button>
          <button className="btn btn-sm" onClick={() => { if (c.phone && c.phone !== "—") { window.open("tel:" + c.phone.replace(/\s/g, ""), "_self"); } else { toast && toast("គ្មានលេខទូរស័ព្ទ", "info"); } }}><Icon.Phone size={12} /></button>
          <button className="btn btn-sm" onClick={() => { if (c.telegram) { toast && toast(`បានផ្ញើសារ Telegram ទៅ ${c.name}`, "ok"); } else { toast && toast(`បានផ្ញើ SMS ទៅ ${c.phone || c.name}`, "ok"); } }}><Icon.Mail size={12} /></button>
        </div>

        <div className="section-heading"><h2 style={{ fontSize: 14 }}>រថយន្ត · VEHICLES ({cvehs.length})</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {cvehs.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius)' }}>
              <div style={{ background: 'var(--bg-3)', padding: '6px 10px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{v.plate}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{vehicleLabel(v)}</div>
                <div className="muted" style={{ fontSize: 11 }}>{v.mileage.toLocaleString()} km · Next: {v.nextService}</div>
              </div>
              <span className={"chip chip-" + (v.status === "due" ? "orange" : v.status === "overdue" ? "red" : "green")}>{v.status}</span>
            </div>
          ))}
        </div>

        <div className="section-heading"><h2 style={{ fontSize: 14 }}>ប្រវត្តិសេវាកម្ម · HISTORY</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cjobs.length === 0 && <div className="empty">មិនទាន់មាន Job ទេ</div>}
          {cjobs.map(j => {
            const jv = lookupVehicle(j.vehicle, state) || MISSING_V;
            return (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius)' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{j.id}</div>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{j.title}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{jv.plate} · {j.created.split(" ")[0]}</div>
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

function AddCustomerModal({ onClose, setState, toast }) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [type, setType] = React.useState("personal");
  // Optional vehicle
  const [addVeh, setAddVeh] = React.useState(true);
  const [plate, setPlate] = React.useState("");
  const [make, setMake] = React.useState("Toyota");
  const [model, setModel] = React.useState("");
  const [year, setYear] = React.useState(2020);
  const PALETTE = ["#0fbfa1", "#22c55e", "#f5b400", "#a78bfa", "#38bdf8", "#f472b6", "#fb923c"];

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះអតិថិជន", "error"); return; }
    const cid = "CU-1" + String(9 + Math.floor(Math.random() * 900)).padStart(3, "0");
    const parts = name.trim().split(/\s+/);
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();

    // Optional vehicle creation
    let newVeh = null;
    if (addVeh && plate.trim()) {
      const vid = "VE-" + String(2014 + Math.floor(Math.random() * 8000));
      newVeh = {
        id: vid, owner: cid, plate: plate.trim().toUpperCase(),
        make: make.trim() || "—", model: model.trim() || "—",
        year: +year || 2020, color: "—", vin: "—",
        mileage: 0, nextService: "—", status: "ok",
      };
    }

    const newC = {
      id: cid, name: name.trim(), initials, color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      type, phone: phone.trim() || "—", telegram: false,
      address: address.trim() || "—", since: "2026-05-17",
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

export { DashboardScreen, CustomersScreen, CustomerDrawer, Stat, Money, Row, AddCustomerModal, exportCsv,
  lookupCustomer, lookupVehicle, vehiclesByOwner, MISSING_C, MISSING_V };
