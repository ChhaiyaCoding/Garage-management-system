import React from 'react';
import GARAGE, { generateId } from './data';
import { Icon } from './icons';
import { Modal } from './shell';
import { Money, Stat, lookupCustomer, lookupVehicle, MISSING_C, MISSING_V, ConfirmModal } from './screens-core';
import { PRESETS, defaultRange, buildBuckets, bucketKeyForDate, dateInRange } from './lib/dateRange';
import { getBotMe, sendMessage, isConfigured as telegramConfigured, newBookingMessage, ownerForwardMessage } from './lib/telegram';

// ── Date Range Picker (inline) ──
function DateRangePicker({ range, onChange }) {
  const [open, setOpen] = React.useState(false);
  const [fromInput, setFromInput] = React.useState(range.from);
  const [toInput, setToInput] = React.useState(range.to);
  React.useEffect(() => { setFromInput(range.from); setToInput(range.to); }, [range.from, range.to]);

  function applyPreset(id) {
    const p = PRESETS.find(p => p.id === id);
    if (!p) return;
    onChange({ preset: id, ...p.build() });
    setOpen(false);
  }
  function applyCustom() {
    if (fromInput && toInput && fromInput <= toInput) {
      const span = (new Date(toInput) - new Date(fromInput)) / 86400000;
      const granularity = span > 60 ? "month" : "day";
      onChange({ preset: "custom", from: fromInput, to: toInput, granularity });
      setOpen(false);
    }
  }

  const activeLabel = range.preset === "custom" ? `${range.from} → ${range.to}` : (PRESETS.find(p => p.id === range.preset) || { label: "Custom" }).label;

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" onClick={() => setOpen(v => !v)}><Icon.Cal size={14} /> {activeLabel} <Icon.Down size={12} /></button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }}></div>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 8, padding: 10, minWidth: 280, zIndex: 60, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {PRESETS.map(p => (
                <button key={p.id} className={"btn btn-sm" + (range.preset === p.id ? " btn-primary" : " btn-ghost")} style={{ justifyContent: 'flex-start' }} onClick={() => applyPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border-0)', paddingTop: 10 }}>
              <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}>CUSTOM RANGE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                <input className="input" type="date" value={fromInput} onChange={e => setFromInput(e.target.value)} />
                <input className="input" type="date" value={toInput} onChange={e => setToInput(e.target.value)} />
              </div>
              <button className="btn btn-sm btn-primary" style={{ width: '100%' }} onClick={applyCustom} disabled={!fromInput || !toInput || fromInput > toInput}>Apply</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// ─── Booking, DVI, Members, Reports, Settings screens ───
const G = GARAGE;
const { customers, vehicles, parts, jobs, invoices, quotations, bookings, technicians, members,
  customersById, vehiclesById, partsById, jobsById, vehicleLabel, statusColor, statusLabel, moneyUSD, moneyKHR } = G;

// ════════════════════════════════════════════════════════════
// BOOKING (Online appointments)
// ════════════════════════════════════════════════════════════
function BookingScreen({ state, setState, currency, onAddBooking, onConvertBooking, toast }) {
  const [editBk, setEditBk] = React.useState(null);
  const [delBk, setDelBk] = React.useState(null);
  const [view, setView] = React.useState("list"); // list | week | month
  const [anchor, setAnchor] = React.useState(() => new Date());
  function checkIn(bId) {
    if (!setState) return;
    setState(s => ({ ...s, bookings: s.bookings.map(b => b.id === bId ? { ...b, status: "checked-in" } : b) }));
  }
  function callPhone(phone) {
    if (phone && phone !== "—") window.open("tel:" + phone.replace(/\s/g, ""), "_self");
    else toast("គ្មានលេខទូរស័ព្ទ", "info");
  }
  const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── Week view dates (Monday → Saturday) ──
  function fmt(d) { return d.toISOString().slice(0, 10); }
  function startOfWeek(d) {
    const x = new Date(d);
    const day = x.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const DAY_KM = ["ច័ន្ទ", "អង្គារ", "ពុធ", "ព្រ.", "សុក្រ", "សៅរ៍"];

  // ── Month view (6 weeks × 7 days) ──
  function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }
  const monthStart = startOfMonth(anchor);
  const monthGridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(monthGridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const monthName = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function getBookingsAt(dateStr, hour) {
    return state.bookings.filter(b => b.date === dateStr && b.time && b.time.startsWith(hour));
  }
  function getBookingsForDay(dateStr) {
    return state.bookings.filter(b => b.date === dateStr);
  }

  function moveAnchor(deltaDays) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + deltaDays);
    setAnchor(d);
  }
  function moveMonth(delta) {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + delta);
    setAnchor(d);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Online Booking</h1>
          <div className="page-sub">កាលវិភាគការកក់ · {state.bookings.length} ការកក់ថ្ងៃនេះ · 4 Bays សកម្ម</div>
        </div>
        <div className="page-actions">
          <div style={{ display: 'inline-flex', background: 'var(--bg-2)', borderRadius: 8, padding: 3, gap: 2 }}>
            <button className={"btn btn-sm" + (view === "list" ? " btn-primary" : " btn-ghost")} style={{ padding: '6px 12px' }} onClick={() => setView("list")}>បញ្ជី</button>
            <button className={"btn btn-sm" + (view === "week" ? " btn-primary" : " btn-ghost")} style={{ padding: '6px 12px' }} onClick={() => setView("week")}>សប្ដាហ៍</button>
            <button className={"btn btn-sm" + (view === "month" ? " btn-primary" : " btn-ghost")} style={{ padding: '6px 12px' }} onClick={() => setView("month")}>ខែ</button>
          </div>
          <button className="btn" onClick={() => { navigator.clipboard?.writeText("https://garage-os.app/book"); toast("បាន copy តំណកក់ Online", "ok"); }}><Icon.Tag size={14} /> Booking Link</button>
          <button className="btn btn-primary" onClick={onAddBooking}><Icon.Plus size={14} /> បន្ថែមការកក់</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">ការកក់ថ្ងៃនេះ</div>
          <div className="kpi-value num">{state.bookings.length}</div>
          <div className="kpi-delta">▲ 2 ការកក់ថ្មី</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">សប្តាហ៍នេះ</div>
          <div className="kpi-value num">28</div>
          <div className="kpi-delta neutral">មធ្យម 5/ថ្ងៃ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Bay Utilization</div>
          <div className="kpi-value num">72<span className="kpi-unit">%</span></div>
          <div className="kpi-delta">▲ 8%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">No-show Rate</div>
          <div className="kpi-value num" style={{ color: 'var(--warn)' }}>6<span className="kpi-unit">%</span></div>
          <div className="kpi-delta down">▼ 1.2%</div>
        </div>
      </div>

      {/* Week view */}
      {view === "week" && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-sm" onClick={() => moveAnchor(-7)}>◀</button>
            <button className="btn btn-sm" onClick={() => setAnchor(new Date())}>ថ្ងៃ​នេះ</button>
            <button className="btn btn-sm" onClick={() => moveAnchor(7)}>▶</button>
            <h3 className="card-title" style={{ margin: 0 }}>{weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          </div>
          <div style={{ overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(6, 1fr)', gap: 4, minWidth: 800 }}>
              <div></div>
              {weekDays.map((d, i) => {
                const isToday = fmt(d) === todayStr;
                return (
                  <div key={i} style={{ textAlign: 'center', padding: '8px 0', borderRadius: 6, background: isToday ? 'var(--accent-soft)' : 'var(--bg-2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: isToday ? 'var(--accent)' : 'var(--text-1)', letterSpacing: '0.08em' }}>
                    {DAY_KM[i]} {d.getDate()}
                  </div>
                );
              })}
              {slots.map(s => (
                <React.Fragment key={s}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', textAlign: 'right', paddingRight: 8, paddingTop: 10 }}>{s}</div>
                  {weekDays.map((d, di) => {
                    const dateStr = fmt(d);
                    const isToday = dateStr === todayStr;
                    const hourKey = s.slice(0, 2);
                    const booked = getBookingsAt(dateStr, hourKey);
                    return (
                      <div key={di} style={{ height: 56, borderRadius: 4, background: booked.length ? 'var(--info-soft)' : (isToday ? 'var(--bg-3)' : 'var(--bg-2)'), border: '1px solid ' + (booked.length ? 'rgba(56,189,248,0.3)' : 'var(--border-0)'), padding: 6, fontSize: 10, color: 'var(--text-1)', cursor: booked.length ? 'pointer' : 'default', overflow: 'hidden' }} onClick={() => booked.length && setEditBk(booked[0])}>
                        {booked.map(b => {
                          const c = lookupCustomer(b.customer, state) || MISSING_C;
                          return <div key={b.id} style={{ fontWeight: 600, lineHeight: 1.3 }} title={`${b.id} · ${b.time} · ${c.name} · ${b.service}`}>{b.time} · {(c.name || "—").split(" ")[0]} · {(b.service || "").slice(0, 12)}</div>;
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Month view */}
      {view === "month" && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button className="btn btn-sm" onClick={() => moveMonth(-1)}>◀</button>
            <button className="btn btn-sm" onClick={() => setAnchor(new Date())}>ខែ​នេះ</button>
            <button className="btn btn-sm" onClick={() => moveMonth(1)}>▶</button>
            <h3 className="card-title" style={{ margin: 0 }}>{monthName}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {DAY_KM.concat(["អា."]).map((d, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 0', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.08em' }}>{d}</div>
            ))}
            {monthDays.map((d, i) => {
              const dateStr = fmt(d);
              const isToday = dateStr === todayStr;
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayBookings = getBookingsForDay(dateStr);
              return (
                <div key={i} style={{ minHeight: 80, padding: 6, borderRadius: 6, background: isToday ? 'var(--accent-soft)' : 'var(--bg-2)', border: '1px solid ' + (isToday ? 'var(--accent)' : 'var(--border-0)'), opacity: inMonth ? 1 : 0.45, fontSize: 11 }}>
                  <div style={{ fontWeight: isToday ? 700 : 600, color: isToday ? 'var(--accent)' : 'var(--text-1)', marginBottom: 4 }}>{d.getDate()}</div>
                  {dayBookings.slice(0, 3).map(b => {
                    const c = lookupCustomer(b.customer, state) || MISSING_C;
                    return (
                      <div key={b.id} onClick={() => setEditBk(b)} style={{ background: 'var(--info-soft)', color: 'var(--text-1)', padding: '2px 4px', borderRadius: 3, marginBottom: 2, fontSize: 10, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${b.time} · ${c.name} · ${b.service}`}>
                        {b.time} {(c.name || "—").split(" ")[0]}
                      </div>
                    );
                  })}
                  {dayBookings.length > 3 && <div className="muted" style={{ fontSize: 10 }}>+{dayBookings.length - 3} ​ផ្សេង​ទៀត</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today list */}
      {view === "list" && <>
      <div className="section-heading">
        <h2>ការកក់ថ្ងៃនេះ · TODAY'S APPOINTMENTS</h2>
        <span className="sub">{state.bookings.length} នាក់</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.bookings.map(b => {
          const c = lookupCustomer(b.customer, state) || MISSING_C;
          const v = lookupVehicle(b.vehicle, state) || MISSING_V;
          return (
            <div key={b.id} className="card" style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto auto', gap: 18, alignItems: 'center', padding: 16 }}>
              <div>
                <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-text)' }}>{b.time}</div>
                <div className="muted" style={{ fontSize: 11 }}>{b.duration}h</div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div className="avatar av-sm" style={{ background: c.color, color: '#0b0b0b', fontSize: 10 }}>{c.initials}</div>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>· {c.phone}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  <span className="mono" style={{ color: 'var(--text-1)' }}>{v.plate}</span> · {vehicleLabel(v)} · {b.service}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Tech: {b.tech}</div>
              </div>
              <span className={"chip chip-" + (b.status === "checked-in" ? "amber" : b.status === "in-progress" ? "blue" : "gray")}>{b.status}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" title="ហៅទូរស័ព្ទ" onClick={() => callPhone(c.phone)}><Icon.Phone size={12} /></button>
                <button className="btn btn-sm" title="បង្កើតជា Job" onClick={() => onConvertBooking(b.id)}><Icon.Wrench size={12} /></button>
                <button className={"btn btn-sm" + (b.status === "checked-in" ? " btn-primary" : " btn-ghost")} title="Check-in" onClick={() => { checkIn(b.id); toast(`${c.name} · Checked-in ✓`, "ok"); }} disabled={b.status === "checked-in"}><Icon.Check size={12} /></button>
                {setState && <button className="btn btn-sm btn-ghost" title="កែ" onClick={() => setEditBk(b)}><Icon.Pen size={12} /></button>}
                {setState && <button className="btn btn-sm btn-ghost" title="លុប" onClick={() => setDelBk(b)}><Icon.X size={12} /></button>}
              </div>
            </div>
          );
        })}
      </div>
      </>}
      {editBk && <EditBookingModal booking={editBk} state={state} setState={setState} onClose={() => setEditBk(null)} toast={toast} />}
      {delBk && <ConfirmModal title="លុបការកក់?" message={`លុប ${delBk.id} · ${delBk.time} · ${delBk.service} ឬ​ទេ?`} danger onClose={() => setDelBk(null)} onConfirm={() => { setState(s => ({ ...s, bookings: s.bookings.filter(x => x.id !== delBk.id) })); toast(`លុប ${delBk.id} ជោគជ័យ`, "ok"); setDelBk(null); }} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DVI (Digital Vehicle Inspection)
// ════════════════════════════════════════════════════════════
const DVI_SECTIONS = [
  { id: "engine", title: "ម៉ាស៊ីន · ENGINE", items: [
    { name: "ប្រេងម៉ាស៊ីន · Engine Oil Level", status: "pass" },
    { name: "Coolant Level", status: "pass" },
    { name: "Belt Condition", status: "warn", note: "Cracking visible · ត្រូវផ្លាស់ក្នុង 10K" },
    { name: "Air Filter", status: "pass" },
    { name: "Battery Voltage", status: "pass", value: "12.6V" },
  ]},
  { id: "brakes", title: "ហ្វ្រាំង · BRAKES", items: [
    { name: "Front Pad Thickness", status: "warn", value: "4mm", note: "ត្រូវផ្លាស់ឆាប់ៗ" },
    { name: "Rear Pad Thickness", status: "pass", value: "7mm" },
    { name: "Brake Fluid Level", status: "pass" },
    { name: "Brake Disc Condition", status: "pass" },
    { name: "Parking Brake", status: "pass" },
  ]},
  { id: "tires", title: "កង់ · TIRES", items: [
    { name: "Tire Tread Front Left", status: "pass", value: "6mm" },
    { name: "Tire Tread Front Right", status: "pass", value: "6mm" },
    { name: "Tire Tread Rear Left", status: "warn", value: "3mm", note: "ជិតដល់កម្រិតផ្លាស់" },
    { name: "Tire Tread Rear Right", status: "warn", value: "3mm" },
    { name: "Tire Pressure", status: "fail", note: "FR 24 PSI - ទាបពេក" },
  ]},
  { id: "lights", title: "ភ្លើង · LIGHTS", items: [
    { name: "Headlights", status: "pass" },
    { name: "Brake Lights", status: "pass" },
    { name: "Turn Signals", status: "pass" },
    { name: "Reverse Lights", status: "pass" },
    { name: "Interior Lights", status: "pass" },
  ]},
];

function DVIScreen({ state, setState, currency, toast }) {
  const allJobs = (state && state.jobs) || jobs;
  const allVehicles = (state && state.vehicles) || vehicles;
  const allCustomers = (state && state.customers) || [];
  const allDvis = (state && state.dvis) || [];

  // Selected Job (default: first active job, else first job)
  const defaultJob = allJobs.find(j => j.status !== "done") || allJobs[0];
  const [jobId, setJobId] = React.useState(defaultJob ? defaultJob.id : "");
  const job = allJobs.find(j => j.id === jobId);
  const veh = job ? allVehicles.find(v => v.id === job.vehicle) : null;
  const cust = job ? allCustomers.find(c => c.id === job.customer) : null;

  // Load existing DVI for this job, or start from template
  const existingDvi = allDvis.find(d => d.jobId === jobId);
  const [sections, setSections] = React.useState(() =>
    existingDvi ? existingDvi.sections : DVI_SECTIONS.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) }))
  );

  // When Job changes, reload sections
  React.useEffect(() => {
    const dvi = allDvis.find(d => d.jobId === jobId);
    setSections(dvi ? dvi.sections : DVI_SECTIONS.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) })));
  }, [jobId]);

  function setItemStatus(secId, idx, status) {
    setSections(secs => secs.map(s => s.id !== secId ? s : {
      ...s, items: s.items.map((it, i) => i === idx ? { ...it, status } : it),
    }));
  }

  const allItems = sections.flatMap(s => s.items);
  const counts = {
    pass: allItems.filter(i => i.status === "pass").length,
    warn: allItems.filter(i => i.status === "warn").length,
    fail: allItems.filter(i => i.status === "fail").length,
    pending: allItems.filter(i => !["pass", "warn", "fail"].includes(i.status)).length,
  };

  function saveDvi() {
    if (!job) { toast("សូម​ជ្រើស Job ​មុន", "error"); return; }
    const dvi = {
      id: existingDvi?.id || generateId("DVI", allDvis),
      jobId: job.id,
      vehicleId: job.vehicle,
      customerId: job.customer,
      sections,
      counts: { pass: counts.pass, warn: counts.warn, fail: counts.fail },
      inspectedBy: job.tech || "—",
      createdAt: existingDvi?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      dvis: existingDvi
        ? (s.dvis || []).map(d => d.id === existingDvi.id ? dvi : d)
        : [dvi, ...(s.dvis || [])],
    }));
    toast(`DVI ​បាន​រក្សា​ទុក​ · ${counts.pass} pass · ${counts.warn} warn · ${counts.fail} fail`, "ok");
  }

  if (allJobs.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">DVI Inspection</h1>
          <div className="page-sub">Digital Vehicle Inspection</div>
        </div>
        <div className="empty" style={{ padding: 40, textAlign: 'center' }}>
          មិន​មាន Job ​ដើម្បី​ត្រួត​ពិនិត្យ — ​សុំ​បង្កើត Job ​មុន
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">DVI Inspection</h1>
          <div className="page-sub">
            {job ? `${veh?.plate || "—"} · ${veh ? `${veh.year} ${veh.make} ${veh.model}` : "—"} · ${job.id}` : "Digital Vehicle Inspection"}
            {existingDvi && <span style={{ marginLeft: 10, color: 'var(--success)' }}>· ✓ បាន​រក្សា​ទុក</span>}
          </div>
        </div>
        <div className="page-actions">
          <select className="input" value={jobId} onChange={e => setJobId(e.target.value)} style={{ minWidth: 220 }}>
            {allJobs.map(j => {
              const jv = allVehicles.find(v => v.id === j.vehicle);
              return <option key={j.id} value={j.id}>{j.id} · {jv?.plate || j.vehicle} · {j.title?.slice(0, 24) || ''}</option>;
            })}
          </select>
          <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print</button>
          <button className="btn" onClick={async () => {
            if (!job) return;
            const garageName = (state?.config && state.config.garageName) || "Garage";
            const failItems = allItems.filter(i => i.status === "fail").map(i => `• ${i.name}${i.note ? ` — ${i.note}` : ''}`).join('\n');
            const warnItems = allItems.filter(i => i.status === "warn").map(i => `• ${i.name}${i.note ? ` — ${i.note}` : ''}`).join('\n');
            const vehLabel = veh ? `${veh.plate} · ${veh.year} ${veh.make} ${veh.model}` : '—';
            const msg = `<b>🔍 ${garageName} · DVI Report</b>\n` +
              `\nរថយន្ត: <b>${vehLabel}</b>\nJob: <code>${job.id}</code>\nអតិថិជន: ${cust?.name || '—'}\n\n` +
              `✅ ${counts.pass} pass · ⚠️ ${counts.warn} warn · ❌ ${counts.fail} fail\n` +
              (failItems ? `\n<b>❌ បន្ទាន់</b>\n${failItems}\n` : '') +
              (warnItems ? `\n<b>⚠️ ​ត្រូវ​ផ្លាស់</b>\n${warnItems}\n` : '');
            const tg = state?.config && state.config.telegram;
            if (telegramConfigured(state?.config)) {
              const res = await sendMessage(tg.botToken, tg.ownerChatId, msg);
              toast(res.ok ? "បានផ្ញើ DVI report ​ទៅ Telegram" : `ផ្ញើ​បរាជ័យ · ${res.description}`, res.ok ? "ok" : "error");
            } else {
              toast("Telegram មិន​បាន​ភ្ជាប់ · ​សុំ​ភ្ជាប់​នៅ Settings", "info");
            }
          }}><Icon.Send size={14} /> ផ្ញើ Telegram</button>
          <button className="btn btn-primary" onClick={saveDvi}>
            <Icon.Check size={14} /> {existingDvi ? "Update DVI" : "Save DVI"}
          </button>
        </div>
      </div>

      {/* Vehicle summary */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: 24, alignItems: 'center', padding: 18 }}>
        <div style={{ width: 70, height: 70, background: 'var(--bg-3)', borderRadius: 10, display: 'grid', placeItems: 'center' }}>
          <Icon.Car size={32} />
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>PLATE</div>
          <div style={{ fontWeight: 700, fontSize: 18 }} className="mono">{veh?.plate || "—"}</div>
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>VEHICLE</div>
          <div style={{ fontWeight: 600 }}>{veh ? `${veh.year || ""} ${veh.make || ""} ${veh.model || ""}`.trim() : "—"}</div>
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>MILEAGE</div>
          <div style={{ fontWeight: 600 }} className="num">{veh?.mileage ? `${veh.mileage.toLocaleString()} km` : "—"}</div>
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>INSPECTED BY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar av-sm" style={{ background: job?.techColor || '#22c55e', color: '#0b0b0b', fontSize: 10 }}>{job?.techInitials || "—"}</div>
            <span style={{ fontWeight: 600 }}>{job?.tech || "—"}</span>
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryChip count={counts.pass} label="PASS" color="green" />
        <SummaryChip count={counts.warn} label="ATTENTION" color="orange" />
        <SummaryChip count={counts.fail} label="FAIL · IMMEDIATE" color="red" />
        <SummaryChip count={counts.pending} label="PENDING" color="gray" />
      </div>

      {/* Sections */}
      {sections.map(sec => {
        const pass = sec.items.filter(i => i.status === "pass").length;
        const warn = sec.items.filter(i => i.status === "warn").length;
        const fail = sec.items.filter(i => i.status === "fail").length;
        return (
          <div key={sec.id} className="card" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.02em' }}>{sec.title}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {pass > 0 && <span className="chip chip-green">{pass} PASS</span>}
                {warn > 0 && <span className="chip chip-orange">{warn} WARN</span>}
                {fail > 0 && <span className="chip chip-red">{fail} FAIL</span>}
              </div>
            </div>
            <div style={{ padding: 6 }}>
              {sec.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 14, padding: '12px 14px', borderBottom: i < sec.items.length - 1 ? '1px solid var(--border-0)' : 'none' }}>
                  <StatusIcon status={item.status} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                    {item.note && <div style={{ fontSize: 12, color: item.status === "fail" ? 'var(--danger)' : 'var(--warn)', marginTop: 2 }}>{item.note}</div>}
                  </div>
                  <div className="num" style={{ fontSize: 13, color: 'var(--text-1)', minWidth: 50, textAlign: 'right', fontWeight: 600 }}>{item.value || "—"}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className={"btn btn-sm" + (item.status === "pass" ? " btn-primary" : "")} style={{ padding: '4px 10px' }} onClick={() => setItemStatus(sec.id, i, "pass")}>P</button>
                    <button className={"btn btn-sm" + (item.status === "warn" ? " btn-primary" : "")} style={{ padding: '4px 10px' }} onClick={() => setItemStatus(sec.id, i, "warn")}>W</button>
                    <button className={"btn btn-sm" + (item.status === "fail" ? " btn-primary" : "")} style={{ padding: '4px 10px' }} onClick={() => setItemStatus(sec.id, i, "fail")}>F</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusIcon({ status }) {
  const map = { pass: { c: "var(--success)", b: "var(--success-soft)" }, warn: { c: "var(--warn)", b: "var(--warn-soft)" }, fail: { c: "var(--danger)", b: "var(--danger-soft)" }, pending: { c: "var(--text-3)", b: "var(--bg-3)" } };
  const m = map[status] || map.pending;
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.b, color: m.c, display: 'grid', placeItems: 'center' }}>
      {status === "pass" ? <Icon.Check size={14} /> : status === "fail" ? <Icon.X size={14} /> : <Icon.Alert size={14} />}
    </div>
  );
}

function SummaryChip({ count, label, color }) {
  return (
    <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minWidth: 180 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `var(--${color === "gray" ? "bg-3" : color === "green" ? "success" : color === "orange" ? "warn" : "danger"}-soft, var(--bg-3))`, display: 'grid', placeItems: 'center', color: color === "gray" ? 'var(--text-2)' : `var(--${color === "green" ? "success" : color === "orange" ? "warn" : "danger"})` }}>
        <span className="num" style={{ fontWeight: 700 }}>{count}</span>
      </div>
      <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-1)' }}>{label}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MEMBERS (Loyalty)
// ════════════════════════════════════════════════════════════
const TIERS = [
  { name: "Bronze", color: "#cd7f32", min: 0, perks: ["5% discount labor", "Birthday gift"] },
  { name: "Silver", color: "#c0c0c0", min: 100, perks: ["10% discount labor", "Priority booking", "Free car wash"] },
  { name: "Gold", color: "#f5b400", min: 250, perks: ["15% discount", "Free pickup/delivery", "VIP waiting room", "Annual gift"] },
  { name: "Platinum", color: "#a78bfa", min: 1000, perks: ["20% discount", "All Gold perks", "Free annual major service"] },
];

function MembersScreen({ state, setState, currency, toast, onAddMember }) {
  const members = state.members;
  const [editMem, setEditMem] = React.useState(null);
  const [delMem, setDelMem] = React.useState(null);
  function tierFromPoints(p) {
    let best = TIERS[0].name;
    for (const t of TIERS) if (p >= t.min) best = t.name;
    return best;
  }
  function addPoints(mid, delta) {
    setState(s => ({
      ...s,
      members: s.members.map(m => {
        if (m.id !== mid) return m;
        const newPoints = Math.max(0, (m.points || 0) + delta);
        const newTier = tierFromPoints(newPoints);
        if (newTier !== m.tier) {
          toast(`${m.name} → តម្លើងជា ${newTier}!`, "ok");
        }
        return { ...m, points: newPoints, tier: newTier };
      }),
    }));
    toast(`+${delta} ពិន្ទុ`, "ok");
  }
  const totalPoints = members.reduce((s, m) => s + (m.points || 0), 0);
  const totalSpent = members.reduce((s, m) => s + (m.spent || 0), 0);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Members · Loyalty</h1>
          <div className="page-sub">សមាជិក · {members.length} នាក់សកម្ម · {totalPoints} ពិន្ទុសរុប</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => toast(`បានផ្ញើ campaign ទៅសមាជិក ${members.length} នាក់`, "ok")}><Icon.Send size={14} /> Send Campaign</button>
          <button className="btn btn-primary" onClick={onAddMember}><Icon.Plus size={14} /> បន្ថែមសមាជិក</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">សមាជិកសរុប</div>
          <div className="kpi-value num">{members.length}</div>
          <div className="kpi-delta">▲ 8 ខែនេះ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ពិន្ទុបច្ចុប្បន្ន</div>
          <div className="kpi-value num">{totalPoints.toLocaleString()}</div>
          <div className="kpi-delta neutral">មធ្យម {members.length ? Math.round(totalPoints / members.length) : 0}/នាក់</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ចំណាយរួម</div>
          <div className="kpi-value num"><Money value={totalSpent} currency={currency} /></div>
          <div className="kpi-delta">▲ 14%</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Reward Redeem</div>
          <div className="kpi-value num">22</div>
          <div className="kpi-delta neutral">ខែនេះ</div>
        </div>
      </div>

      {/* Tiers */}
      <div className="section-heading"><h2>កម្រិតសមាជិក · TIERS</h2><span className="sub">ស្វ័យដំឡើងតាមចំណាយ</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {TIERS.map((t, i) => {
          const count = members.filter(m => m.tier === t.name).length;
          return (
            <div key={t.name} className="card" style={{ borderLeft: `3px solid ${t.color}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon.Award size={16} />
                <div style={{ fontSize: 14, fontWeight: 700, color: t.color }}>{t.name}</div>
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{count}</div>
              <div className="muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>MEMBERS</div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-0)' }}>
                <div className="mono muted" style={{ fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>FROM {t.min} PTS</div>
                {t.perks.slice(0, 3).map((p, j) => (
                  <div key={j} style={{ fontSize: 11, color: 'var(--text-1)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon.Check size={10} /> {p}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Members list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>បញ្ជីសមាជិក · MEMBER LIST</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => toast("តម្រងសមាជិក (ឆាប់ៗ)", "info")}><Icon.Filter size={12} /> Filter</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>សមាជិក</th>
              <th>កម្រិត</th>
              <th>បានចូល</th>
              <th className="num">ពិន្ទុ</th>
              <th className="num">ចំណាយរួម</th>
              <th>Progress</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const tier = TIERS.find(t => t.name === m.tier);
              const next = TIERS[TIERS.indexOf(tier) + 1];
              const progress = next ? Math.min(100, ((m.points - tier.min) / (next.min - tier.min)) * 100) : 100;
              const c = customersById[m.id];
              return (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar av-sm" style={{ background: c?.color || '#888', color: '#0b0b0b' }}>{c?.initials || m.name.slice(0, 2)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{c?.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="chip" style={{ background: tier.color + "22", color: tier.color, border: `1px solid ${tier.color}40` }}>{m.tier.toUpperCase()}</span></td>
                  <td className="mono">{m.joined}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--accent-text)' }}>{m.points}</td>
                  <td className="num"><Money value={m.spent} currency={currency} /></td>
                  <td style={{ minWidth: 160 }}>
                    {next ? (
                      <>
                        <div className="bar"><div className="bar-fill" style={{ width: progress + "%", background: tier.color }}></div></div>
                        <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{next.min - m.points} pts → {next.name}</div>
                      </>
                    ) : <div className="mono muted" style={{ fontSize: 10 }}>MAX TIER</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => addPoints(m.id, 50)}>+ 50 pts</button>
                      <button className="btn btn-sm btn-ghost" title="កែ" onClick={() => setEditMem(m)}><Icon.Pen size={12} /></button>
                      <button className="btn btn-sm btn-ghost" title="លុប" onClick={() => setDelMem(m)}><Icon.X size={12} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editMem && <EditMemberModal member={editMem} setState={setState} onClose={() => setEditMem(null)} toast={toast} />}
      {delMem && <ConfirmModal title="លុបសមាជិក?" message={`លុប ${delMem.name} (${delMem.tier}) ឬ​ទេ?`} danger onClose={() => setDelMem(null)} onConfirm={() => { setState(s => ({ ...s, members: s.members.filter(x => x.id !== delMem.id) })); toast(`លុប ${delMem.name} ជោគជ័យ`, "ok"); setDelMem(null); }} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════
function ReportsScreen({ state, currency, toast }) {
  const [salesOpen, setSalesOpen] = React.useState(false);
  const [chartMetric, setChartMetric] = React.useState("revenue");
  const [range, setRange] = React.useState(() => defaultRange());

  // ── Live aggregations from state, filtered by range ──
  const allInvs = state.invoices || [];
  const allJobs = state.jobs || [];
  const allCustomers = state.customers || [];
  const allParts = state.parts || [];

  // Build buckets from selected range
  const buckets = buildBuckets(range);
  const bucketIdx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
  buckets.forEach(b => { b.revenue = 0; b.billed = 0; b.jobs = 0; b.newCustomers = 0; });

  // Filter by range, then drop into buckets
  const rangedInvs = allInvs.filter(i => dateInRange(i.issued, range.from, range.to));
  const rangedJobs = allJobs.filter(j => dateInRange((j.created || "").slice(0, 10), range.from, range.to));
  const rangedNewCust = allCustomers.filter(c => dateInRange(c.since, range.from, range.to));

  rangedInvs.forEach(inv => {
    const k = bucketKeyForDate(inv.issued, range.granularity);
    if (bucketIdx[k] != null) {
      buckets[bucketIdx[k]].billed += inv.total || 0;
      buckets[bucketIdx[k]].revenue += inv.paid || 0;
    }
  });
  rangedJobs.forEach(j => {
    const k = bucketKeyForDate(j.created, range.granularity);
    if (bucketIdx[k] != null) buckets[bucketIdx[k]].jobs++;
  });
  rangedNewCust.forEach(c => {
    const k = bucketKeyForDate(c.since, range.granularity);
    if (bucketIdx[k] != null) buckets[bucketIdx[k]].newCustomers++;
  });
  const max = Math.max(...buckets.map(b => b[chartMetric] || 0), 1);

  // KPI calculations — based on filtered set
  const totalRevenue = rangedInvs.reduce((s, i) => s + (i.paid || 0), 0);
  const totalBilled = rangedInvs.reduce((s, i) => s + (i.total || 0), 0);
  const completedJobs = rangedJobs.filter(j => j.status === "done");
  const avgPerJob = completedJobs.length ? totalRevenue / completedJobs.length : 0;
  // Gross margin from ranged jobs
  let partsCost = 0;
  let partsRevenue = 0;
  let laborRevenue = 0;
  rangedJobs.forEach(j => {
    (j.partsUsed || []).forEach(p => {
      const part = allParts.find(x => x.id === p.id);
      if (part) partsCost += (p.qty || 0) * (part.cost || 0);
      partsRevenue += (p.qty || 0) * (p.price || 0);
    });
    (j.services || []).forEach(s => { laborRevenue += s.total || 0; });
  });
  const grossRevenue = partsRevenue + laborRevenue;
  const grossMargin = grossRevenue ? Math.round(((grossRevenue - partsCost) / grossRevenue) * 100) : 0;
  // Retention: across ranged jobs
  const jobCountByCustomer = {};
  rangedJobs.forEach(j => { jobCountByCustomer[j.customer] = (jobCountByCustomer[j.customer] || 0) + 1; });
  const customersWithJobs = Object.keys(jobCountByCustomer).length;
  const repeatCustomers = Object.values(jobCountByCustomer).filter(n => n >= 2).length;
  const retention = customersWithJobs ? Math.round((repeatCustomers / customersWithJobs) * 100) : 0;

  // Top services: from ranged jobs
  const serviceAgg = {};
  rangedJobs.forEach(j => {
    (j.services || []).forEach(s => {
      const k = s.name || "—";
      if (!serviceAgg[k]) serviceAgg[k] = { name: k, count: 0, revenue: 0 };
      serviceAgg[k].count++;
      serviceAgg[k].revenue += s.total || 0;
    });
  });
  const topServices = Object.values(serviceAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Top parts: from ranged jobs
  const partAgg = {};
  rangedJobs.forEach(j => {
    (j.partsUsed || []).forEach(p => {
      if (!partAgg[p.id]) partAgg[p.id] = { id: p.id, used: 0, revenue: 0 };
      partAgg[p.id].used += p.qty || 0;
      partAgg[p.id].revenue += (p.qty || 0) * (p.price || 0);
    });
  });
  const topParts = Object.values(partAgg).map(pa => {
    const part = allParts.find(x => x.id === pa.id);
    return { ...pa, name: part ? part.name : pa.id };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // Top customers: by lifetime within range (use ranged invoices)
  const custRevenue = {};
  rangedInvs.forEach(inv => {
    if (!custRevenue[inv.customer]) custRevenue[inv.customer] = { spent: 0, jobs: 0 };
    custRevenue[inv.customer].spent += inv.paid || 0;
  });
  rangedJobs.forEach(j => {
    if (!custRevenue[j.customer]) custRevenue[j.customer] = { spent: 0, jobs: 0 };
    custRevenue[j.customer].jobs++;
  });
  const topCustomers = Object.entries(custRevenue).map(([id, data]) => {
    const c = allCustomers.find(x => x.id === id) || { id, name: id };
    return { ...c, ...data };
  }).sort((a, b) => b.spent - a.spent).slice(0, 6);

  const metricLabel = chartMetric === "revenue" ? "ចំណូល · REVENUE" : chartMetric === "billed" ? "BILLED" : chartMetric === "jobs" ? "JOBS" : "NEW CUSTOMERS";
  const formatBar = v => chartMetric === "revenue" || chartMetric === "billed" ? (v ? Math.round(v / 1000) + 'K' : '') : (v || '');
  const periodLabel = range.preset === "custom" ? `${range.from} → ${range.to}` : (PRESETS.find(p => p.id === range.preset) || {}).label || "12 ​ខែ";
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports & BI</h1>
          <div className="page-sub">របាយការណ៍ · {periodLabel} · Phnom Penh branch</div>
        </div>
        <div className="page-actions">
          <DateRangePicker range={range} onChange={setRange} />
          <button className="btn" onClick={() => toast("តម្រងតាមសាខា (ឆាប់ៗ)", "info")}><Icon.Branch size={14} /> All Branches</button>
          <button className="btn btn-primary" onClick={() => setSalesOpen(true)}><Icon.Doc size={14} /> Sales Report</button>
          <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">ចំណូល · REVENUE</div>
          <div className="kpi-value num"><Money value={totalRevenue} currency={currency} /></div>
          <div className="kpi-delta neutral">{allInvs.length} invoices · billed {moneyUSD(totalBilled)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Gross Margin</div>
          <div className="kpi-value num">{grossMargin}<span className="kpi-unit">%</span></div>
          <div className="kpi-delta neutral">parts + labor</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">មធ្យម / Job</div>
          <div className="kpi-value num"><Money value={Math.round(avgPerJob)} currency={currency} /></div>
          <div className="kpi-delta neutral">{completedJobs.length} done jobs</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Retention</div>
          <div className="kpi-value num">{retention}<span className="kpi-unit">%</span></div>
          <div className="kpi-delta neutral">{repeatCustomers}/{customersWithJobs} repeat</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          {metricLabel} <span className="meta">{periodLabel.toUpperCase()}</span>
          <span style={{ flex: 1 }}></span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { id: "revenue", label: "Revenue" },
              { id: "billed", label: "Billed" },
              { id: "jobs", label: "Jobs" },
              { id: "newCustomers", label: "New Cust" },
            ].map(t => (
              <button key={t.id} className={"btn btn-sm" + (chartMetric === t.id ? " btn-primary" : "")} onClick={() => setChartMetric(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
          {buckets.map((m, i) => {
            const v = m[chartMetric] || 0;
            const last = i === buckets.length - 1;
            return (
              <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div className="num" style={{ fontSize: 10, color: 'var(--text-2)' }}>{formatBar(v)}</div>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', background: last ? 'var(--accent)' : 'var(--info)', borderRadius: '4px 4px 0 0', height: ((v / max) * 100) + "%", minHeight: v > 0 ? 2 : 0, opacity: last ? 1 : 0.5 + (i / buckets.length) * 0.5 }}></div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-2)', textAlign: 'center' }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 className="card-title">សេវាកម្មកំពូល · TOP SERVICES</h3>
          {topServices.length === 0 ? <div className="empty" style={{ padding: 24 }}>មិនទាន់​មាន​សេវាកម្ម​ក្នុង Jobs</div> : (
            <table className="table">
              <thead><tr><th>សេវាកម្ម</th><th className="num">Count</th><th className="num">ចំណូល</th></tr></thead>
              <tbody>
                {topServices.map((s, i) => (
                  <tr key={i}>
                    <td>{s.name}</td>
                    <td className="num">{s.count}</td>
                    <td className="num" style={{ fontWeight: 700 }}><Money value={s.revenue} currency={currency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 className="card-title">អតិថិជនកំពូល · TOP CUSTOMERS <span className="meta">{periodLabel}</span></h3>
          {topCustomers.length === 0 ? <div className="empty" style={{ padding: 24 }}>គ្មាន​អតិថិជន​ក្នុង​ចន្លោះ​នេះ</div> : (
            <table className="table">
              <thead><tr><th>អតិថិជន</th><th className="num">Jobs</th><th className="num">ចំណាយ</th></tr></thead>
              <tbody>
                {topCustomers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar av-sm" style={{ background: c.color || '#888', color: '#0b0b0b', fontSize: 10 }}>{c.initials || "?"}</div>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="num">{c.jobs || 0}</td>
                    <td className="num" style={{ fontWeight: 700 }}><Money value={c.spent || 0} currency={currency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">ការប្រើ Parts ច្រើនបំផុត · PARTS USAGE</h3>
        {topParts.length === 0 ? <div className="empty" style={{ padding: 24 }}>មិនទាន់​មាន Parts ​ប្រើ​ក្នុង Jobs</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {topParts.map((p, i) => (
              <div key={i} style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{p.used}</div>
                    <div className="mono muted" style={{ fontSize: 10 }}>UNITS</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent-text)' }}><Money value={p.revenue} currency={currency} /></div>
                    <div className="mono muted" style={{ fontSize: 10 }}>REVENUE</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {salesOpen && <SalesReportModal state={state} currency={currency} onClose={() => setSalesOpen(false)} toast={toast} />}
    </div>
  );
}

// ── Sales Report Modal (real aggregates from state) ──
function SalesReportModal({ state, currency, onClose, toast }) {
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const allInvs = state.invoices || [];
  const allJobs = state.jobs || [];
  const allCustomers = state.customers || [];

  // Build last 12 months buckets keyed YYYY-MM
  const now = new Date();
  const monthBuckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: 0, billed: 0, invoices: 0, jobs: 0, newCustomers: 0 });
  }
  const idx = Object.fromEntries(monthBuckets.map((m, i) => [m.key, i]));

  allInvs.forEach(inv => {
    const k = (inv.issued || "").slice(0, 7);
    if (idx[k] != null) {
      monthBuckets[idx[k]].billed += inv.total || 0;
      monthBuckets[idx[k]].revenue += inv.paid || 0;
      monthBuckets[idx[k]].invoices++;
    }
  });
  allJobs.forEach(j => {
    const k = (j.created || "").slice(0, 7);
    if (idx[k] != null) monthBuckets[idx[k]].jobs++;
  });
  allCustomers.forEach(c => {
    const k = (c.since || "").slice(0, 7);
    if (idx[k] != null) monthBuckets[idx[k]].newCustomers++;
  });

  const totalRevenue = monthBuckets.reduce((s, m) => s + m.revenue, 0);
  const totalBilled = monthBuckets.reduce((s, m) => s + m.billed, 0);
  const totalJobs = monthBuckets.reduce((s, m) => s + m.jobs, 0);
  const totalNewCust = monthBuckets.reduce((s, m) => s + m.newCustomers, 0);
  const outstanding = allInvs.reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0);
  const maxRev = Math.max(...monthBuckets.map(m => m.revenue), 1);

  const thisMonth = monthBuckets[monthBuckets.length - 1];
  const lastMonth = monthBuckets[monthBuckets.length - 2] || { revenue: 0 };
  const momChange = lastMonth.revenue ? Math.round(((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100) : 0;

  // Top customers
  const topCustomers = [...allCustomers].sort((a, b) => (b.lifetime || 0) - (a.lifetime || 0)).slice(0, 8);
  // Status mix
  const statusMix = {};
  allJobs.forEach(j => { statusMix[j.status] = (statusMix[j.status] || 0) + 1; });

  async function downloadPdf() {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { downloadElementAsPdf } = await import('./lib/pdf');
      await downloadElementAsPdf(sheetRef.current, `Sales-Report-${today}.pdf`);
      toast("បាន​ទាញ​យក Sales Report", "ok");
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal wide title="Monthly Sales Report" onClose={onClose}
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
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>SALES REPORT</div>
            <div style={{ fontSize: 11, color: '#666' }}>Last 12 months · As of {today}</div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>REVENUE (PAID)</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{moneyUSD(totalRevenue)}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>12-mo</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>BILLED</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{moneyUSD(totalBilled)}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{allInvs.length} invoices</div>
          </div>
          <div style={{ background: outstanding > 0 ? '#fef3c7' : '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: outstanding > 0 ? '#7a5a00' : '#888' }}>OUTSTANDING</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: outstanding > 0 ? '#d97706' : '#0a0d12' }}>{moneyUSD(outstanding)}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>receivables</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>JOBS</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{totalJobs}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>12-mo</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>NEW CUSTOMERS</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{totalNewCust}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>12-mo</div>
          </div>
        </div>

        {/* This month vs last month */}
        <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 6, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>THIS MONTH ({thisMonth.label})</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{moneyUSD(thisMonth.revenue)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>VS LAST MONTH</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: momChange >= 0 ? '#22a85a' : '#dc2626' }}>
              {momChange >= 0 ? '▲' : '▼'} {Math.abs(momChange)}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>LAST MONTH ({lastMonth.label || "—"})</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#666' }}>{moneyUSD(lastMonth.revenue || 0)}</div>
          </div>
        </div>

        {/* Monthly revenue chart (bar) */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>MONTHLY REVENUE · LAST 12 MONTHS</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, padding: '8px 0 0', borderBottom: '1px solid #ddd', marginBottom: 20 }}>
          {monthBuckets.map((m, i) => {
            const h = maxRev ? (m.revenue / maxRev) * 100 : 0;
            const last = i === monthBuckets.length - 1;
            return (
              <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-mono)' }}>{m.revenue ? Math.round(m.revenue / 1000) + 'K' : ''}</div>
                <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', background: last ? 'var(--accent)' : '#94a3b8', height: h + '%', borderRadius: '3px 3px 0 0', minHeight: m.revenue > 0 ? 2 : 0 }}></div>
                </div>
                <div style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{m.label}</div>
              </div>
            );
          })}
        </div>

        {/* Monthly breakdown table */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>MONTHLY BREAKDOWN</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>MONTH</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>INVOICES</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>JOBS</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>NEW CUST</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>BILLED</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {monthBuckets.map(m => (
              <tr key={m.key} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{m.label}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{m.invoices || "—"}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{m.jobs || "—"}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{m.newCustomers || "—"}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{m.billed ? moneyUSD(m.billed) : "—"}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{m.revenue ? moneyUSD(m.revenue) : "—"}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #0a0d12', background: '#fafafa' }}>
              <td style={{ padding: '10px 10px', fontWeight: 800, letterSpacing: '0.06em' }}>TOTAL</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{allInvs.length}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{totalJobs}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{totalNewCust}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{moneyUSD(totalBilled)}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>{moneyUSD(totalRevenue)}</td>
            </tr>
          </tbody>
        </table>

        {/* Two columns: Top customers & Job status mix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>TOP CUSTOMERS · BY LIFETIME</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, letterSpacing: '0.14em', color: '#666' }}>CUSTOMER</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9, letterSpacing: '0.14em', color: '#666' }}>JOBS</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9, letterSpacing: '0.14em', color: '#666' }}>LIFETIME</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 10px' }}><span style={{ color: '#888', marginRight: 6, fontFamily: 'var(--font-mono)' }}>{i + 1}.</span>{c.name}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{c.jobs || 0}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(c.lifetime || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>JOB STATUS MIX</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, letterSpacing: '0.14em', color: '#666' }}>STATUS</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9, letterSpacing: '0.14em', color: '#666' }}>COUNT</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px', fontSize: 9, letterSpacing: '0.14em', color: '#666' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statusMix).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                  <tr key={s} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 10px', textTransform: 'uppercase', fontWeight: 600, fontSize: 10, letterSpacing: '0.06em' }}>{s}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{n}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#666' }}>{allJobs.length ? Math.round((n / allJobs.length) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#888', textAlign: 'center', letterSpacing: '0.04em', borderTop: '1px solid #eee', paddingTop: 14 }}>
          Generated by Garage OS · {today}
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════
function SettingsScreen({ state, setState, tweaks, setTweak, toast }) {
  const [tab, setTab] = React.useState("garage");
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">ការកំណត់ប្រព័ន្ធ · Garage OS · v2.4.1</div>
        </div>
      </div>

      <div className="tabs">
        {[
          { id: "garage", label: "ហ្គារ៉ាស់" },
          { id: "branches", label: "សាខា" },
          { id: "staff", label: "បុគ្គលិក" },
          { id: "billing", label: "Tax & Invoice" },
          { id: "integrations", label: "Integrations" },
          { id: "loyalty", label: "Loyalty Program" },
        ].map(t => (
          <button key={t.id} className={"tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "garage" && <GarageSettings state={state} setState={setState} toast={toast} />}
      {tab === "branches" && <BranchSettings state={state} setState={setState} toast={toast} />}
      {tab === "staff" && <StaffSettings state={state} setState={setState} toast={toast} />}
      {tab === "billing" && <BillingSettings state={state} setState={setState} toast={toast} />}
      {tab === "integrations" && <IntegrationSettings state={state} setState={setState} toast={toast} />}
      {tab === "loyalty" && <LoyaltySettings state={state} setState={setState} toast={toast} />}
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      {children}
    </div>
  );
}

function GarageSettings({ state, setState, toast }) {
  const cfg = state.config || {};
  const [name, setName] = React.useState(cfg.garageName || "");
  const [addr, setAddr] = React.useState(cfg.garageAddr || "");
  const [phone, setPhone] = React.useState(cfg.garagePhone || "");
  const [tin, setTin] = React.useState(cfg.vatTin || "");
  const [wd, setWd] = React.useState(cfg.hoursWeekday || { open: "07:30", close: "18:30" });
  const [sat, setSat] = React.useState(cfg.hoursSat || { open: "07:30", close: "16:00" });
  const [sun, setSun] = React.useState(cfg.hoursSun || { open: "បិទ", close: "—" });

  function save() {
    setState(s => ({ ...s, config: { ...s.config, garageName: name, garageAddr: addr, garagePhone: phone, vatTin: tin, hoursWeekday: wd, hoursSat: sat, hoursSun: sun } }));
    toast("ការកំណត់ហ្គារ៉ាស់បានរក្សាទុក", "ok");
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SettingsCard title="ព័ត៌មានហ្គារ៉ាស់ · GARAGE INFO">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>ឈ្មោះហ្គារ៉ាស់</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field"><label>អាសយដ្ឋាន</label><input className="input" value={addr} onChange={e => setAddr(e.target.value)} /></div>
            <div className="field"><label>ទូរស័ព្ទ</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div className="field"><label>VAT TIN</label><input className="input" value={tin} onChange={e => setTin(e.target.value)} /></div>
          </div>
        </SettingsCard>
        <SettingsCard title="ម៉ោងធ្វើការ · OPERATING HOURS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: "ច័ន្ទ – សុក្រ", val: wd, set: setWd },
              { label: "សៅរ៍", val: sat, set: setSat },
              { label: "អាទិត្យ", val: sun, set: setSun },
            ].map(d => (
              <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 13 }}>{d.label}</div>
                <input className="input" value={d.val.open} onChange={e => d.set({ ...d.val, open: e.target.value })} style={{ width: 100, padding: '6px 10px' }} />
                <span className="muted">→</span>
                <input className="input" value={d.val.close} onChange={e => d.set({ ...d.val, close: e.target.value })} style={{ width: 100, padding: '6px 10px' }} />
              </div>
            ))}
          </div>
        </SettingsCard>
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </div>
    </div>
  );
}

function BranchSettings({ state, setState, toast }) {
  const [edit, setEdit] = React.useState(null); // null | "new" | branch object
  const branches = state.branches;
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table">
        <thead><tr><th>សាខា</th><th>អាសយដ្ឋាន</th><th className="num">Bays</th><th className="num">បុគ្គលិក</th><th>ស្ថានភាព</th><th></th></tr></thead>
        <tbody>
          {branches.map(b => (
            <tr key={b.id}>
              <td><div style={{ fontWeight: 600 }}>{b.name}</div>{b.main && <span className="chip chip-amber" style={{ marginTop: 4, fontSize: 9, padding: '1px 6px' }}>MAIN</span>}</td>
              <td className="muted">{b.addr}</td>
              <td className="num">{b.bays}</td>
              <td className="num">{b.staff}</td>
              <td><span className="chip chip-green">ACTIVE</span></td>
              <td><button className="btn btn-sm btn-ghost" onClick={() => setEdit(b)}><Icon.Pen size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 14 }}>
        <button className="btn btn-sm" onClick={() => setEdit("new")}><Icon.Plus size={12} /> បន្ថែមសាខាថ្មី</button>
      </div>
      {edit && <BranchModal branch={edit === "new" ? null : edit} setState={setState} toast={toast} onClose={() => setEdit(null)} />}
    </div>
  );
}

function BranchModal({ branch, setState, toast, onClose }) {
  const [name, setName] = React.useState(branch ? branch.name : "");
  const [addr, setAddr] = React.useState(branch ? branch.addr : "");
  const [bays, setBays] = React.useState(branch ? branch.bays : 4);
  const [staffN, setStaffN] = React.useState(branch ? branch.staff : 5);

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះសាខា", "error"); return; }
    if (branch) {
      setState(s => ({ ...s, branches: s.branches.map(b => b.id === branch.id ? { ...b, name: name.trim(), addr: addr.trim(), bays: +bays, staff: +staffN } : b) }));
      toast(`កែសាខា ${name} ជោគជ័យ`, "ok");
    } else {
      setState(s => {
        const id = generateId("BR", s.branches || []);
        return { ...s, branches: [...(s.branches || []), { id, name: name.trim(), addr: addr.trim(), bays: +bays, staff: +staffN, status: "active" }] };
      });
      toast(`បន្ថែមសាខា ${name} ជោគជ័យ`, "ok");
    }
    onClose();
  }

  return (
    <Modal title={branch ? "កែសាខា · EDIT BRANCH" : "សាខាថ្មី · NEW BRANCH"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>ឈ្មោះសាខា</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>អាសយដ្ឋាន</label><input className="input" value={addr} onChange={e => setAddr(e.target.value)} /></div>
        <div className="field"><label>Bays</label><input className="input" type="number" value={bays} onChange={e => setBays(e.target.value)} /></div>
        <div className="field"><label>បុគ្គលិក</label><input className="input" type="number" value={staffN} onChange={e => setStaffN(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

function StaffSettings({ state, setState, toast }) {
  const [edit, setEdit] = React.useState(null);
  const staff = state.staff;
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table">
        <thead><tr><th>បុគ្គលិក</th><th>តួនាទី</th><th>នាយកដ្ឋាន</th><th>ជំនាញ</th><th>បន្ទុក</th><th></th></tr></thead>
        <tbody>
          {staff.map(s => (
            <tr key={s.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar av-md" style={{ background: s.color, color: '#0b0b0b' }}>{s.initials}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="mono muted" style={{ fontSize: 10 }}>{s.id}</div>
                  </div>
                </div>
              </td>
              <td>{s.role}</td>
              <td className="muted">{s.dept}</td>
              <td>
                {s.skills && s.skills.map(k => <span key={k} className="chip chip-gray" style={{ fontSize: 9, marginRight: 4 }}>{k}</span>)}
              </td>
              <td>{s.capacity > 0 ? <span className="num">{s.load}/{s.capacity}</span> : <span className="muted">—</span>}</td>
              <td><button className="btn btn-sm btn-ghost" onClick={() => setEdit(s)}><Icon.Pen size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 14 }}><button className="btn btn-sm" onClick={() => setEdit("new")}><Icon.Plus size={12} /> បន្ថែមបុគ្គលិក</button></div>
      {edit && <StaffModal staff={edit === "new" ? null : edit} setState={setState} toast={toast} onClose={() => setEdit(null)} />}
    </div>
  );
}

function StaffModal({ staff, setState, toast, onClose }) {
  const [name, setName] = React.useState(staff ? staff.name : "");
  const [role, setRole] = React.useState(staff ? staff.role : "Mechanic");
  const [dept, setDept] = React.useState(staff ? staff.dept : "Workshop");
  const PALETTE = ["#22c55e", "#f5b400", "#38bdf8", "#a78bfa", "#f472b6", "#fb923c"];

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះបុគ្គលិក", "error"); return; }
    const parts = name.trim().split(/\s+/);
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
    if (staff) {
      setState(s => ({ ...s, staff: s.staff.map(x => x.id === staff.id ? { ...x, name: name.trim(), role, dept, initials } : x) }));
      toast(`កែបុគ្គលិក ${name} ជោគជ័យ`, "ok");
    } else {
      setState(s => {
        const id = generateId("S", s.staff || []);
        return { ...s, staff: [...(s.staff || []), { id, name: name.trim(), initials, color: PALETTE[Math.floor(Math.random() * PALETTE.length)], role, dept, load: 0, capacity: 0 }] };
      });
      toast(`បន្ថែមបុគ្គលិក ${name} ជោគជ័យ`, "ok");
    }
    onClose();
  }

  return (
    <Modal title={staff ? "កែបុគ្គលិក · EDIT STAFF" : "បុគ្គលិកថ្មី · NEW STAFF"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>ឈ្មោះ</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        <div className="field"><label>តួនាទី · ROLE</label><input className="input" value={role} onChange={e => setRole(e.target.value)} /></div>
        <div className="field"><label>នាយកដ្ឋាន · DEPT</label>
          <select className="select" value={dept} onChange={e => setDept(e.target.value)}>
            {["Workshop", "Front Desk", "Inventory", "Management"].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function BillingSettings({ state, setState, toast }) {
  const cfg = state.config || {};
  const [vatRate, setVatRate] = React.useState(cfg.vatRate || "10%");
  const [tin, setTin] = React.useState(cfg.vatTin || "");
  const [prefix, setPrefix] = React.useState(cfg.invoicePrefix || "INV-2406-");
  const [terms, setTerms] = React.useState(cfg.paymentTerms || "Due on receipt");
  const [footer, setFooter] = React.useState(cfg.invoiceFooter || "");

  function save() {
    setState(s => ({ ...s, config: { ...s.config, vatRate, vatTin: tin, invoicePrefix: prefix, paymentTerms: terms, invoiceFooter: footer } }));
    toast("Tax & Invoice settings បានរក្សាទុក", "ok");
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SettingsCard title="ពន្ធ · TAX">
          <div className="field"><label>VAT Rate</label><input className="input" value={vatRate} onChange={e => setVatRate(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 12 }}><label>VAT TIN</label><input className="input" value={tin} onChange={e => setTin(e.target.value)} /></div>
        </SettingsCard>
        <SettingsCard title="Invoice Template">
          <div className="field"><label>Invoice Prefix</label><input className="input" value={prefix} onChange={e => setPrefix(e.target.value)} /></div>
          <div className="field" style={{ marginTop: 12 }}><label>Default Payment Terms</label>
            <select className="select" value={terms} onChange={e => setTerms(e.target.value)}>
              <option>Due on receipt</option><option>Net 15</option><option>Net 30</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label>Footer Note</label><textarea className="textarea" value={footer} onChange={e => setFooter(e.target.value)} /></div>
        </SettingsCard>
      </div>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </div>
    </div>
  );
}

function IntegrationSettings({ state, setState, toast }) {
  const tgConnected = telegramConfigured(state.config);
  const [tgModalOpen, setTgModalOpen] = React.useState(false);
  const integ = [
    { name: "Telegram", desc: "ផ្ញើ​សារ​ទៅ​អតិថិជន · ការ​កក់​ថ្មី · ស្ដុក​អស់", icon: "Send", connected: tgConnected, key: "telegram" },
    { name: "ABA Pay", desc: "Accept payments · QR + Bakong", icon: "Money", connected: false },
    { name: "Wing Money", desc: "Mobile wallet payments", icon: "Money", connected: false },
    { name: "SMS Gateway", desc: "Smart, Cellcard, Metfone", icon: "Phone", connected: false },
    { name: "QuickBooks", desc: "Accounting sync", icon: "Doc", connected: false },
    { name: "Bakong KHQR", desc: "National QR standard", icon: "Tag", connected: false },
  ];
  function onConfigure(item) {
    if (item.key === "telegram") {
      setTgModalOpen(true);
    } else {
      toast && toast(`${item.name} (ឆាប់ៗ)`, "info");
    }
  }
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {integ.map(it => (
          <div key={it.name} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, background: 'var(--bg-3)', borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--accent-text)' }}>
                {React.createElement(Icon[it.icon])}
              </div>
              {it.connected ? <span className="chip chip-green">CONNECTED</span> : <span className="chip chip-gray">OFF</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{it.desc}</div>
            <button className="btn btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => onConfigure(it)}>
              {it.connected ? "កំណត់" : "ភ្ជាប់"}
            </button>
          </div>
        ))}
      </div>
      {tgModalOpen && <TelegramSetupModal state={state} setState={setState} toast={toast} onClose={() => setTgModalOpen(false)} />}
    </>
  );
}

function TelegramSetupModal({ state, setState, toast, onClose }) {
  const tg = state.config?.telegram || {};
  const [botToken, setBotToken] = React.useState(tg.botToken || "");
  const [ownerChatId, setOwnerChatId] = React.useState(tg.ownerChatId || "");
  const [notifyNewBooking, setNotifyNewBooking] = React.useState(tg.notifyNewBooking ?? true);
  const [notifyLowStock, setNotifyLowStock] = React.useState(tg.notifyLowStock ?? true);
  const [testing, setTesting] = React.useState(false);
  const [verifyMsg, setVerifyMsg] = React.useState(null);

  async function verifyAndSave() {
    if (!botToken.trim()) {
      setVerifyMsg({ kind: "error", text: "ត្រូវ​បំពេញ Bot Token" });
      return;
    }
    setTesting(true);
    setVerifyMsg(null);
    const me = await getBotMe(botToken.trim());
    if (!me.ok) {
      setTesting(false);
      setVerifyMsg({ kind: "error", text: `Bot Token មិន​ត្រឹមត្រូវ · ${me.description || "unknown"}` });
      return;
    }
    // Try sending a test message if chat ID provided
    if (ownerChatId.trim()) {
      const send = await sendMessage(
        botToken.trim(),
        ownerChatId.trim(),
        `✅ <b>Garage OS</b> បាន​ភ្ជាប់​ដោយ​ជោគជ័យ\n\nBot: @${me.result.username}`,
      );
      if (!send.ok) {
        setTesting(false);
        setVerifyMsg({ kind: "error", text: `Bot ត្រឹមត្រូវ ប៉ុន្តែ Chat ID មិន​ដំណើរការ · ${send.description}` });
        return;
      }
    }
    // Save to state
    setState(s => ({
      ...s,
      config: {
        ...s.config,
        telegram: {
          botToken: botToken.trim(),
          botUsername: me.result.username,
          ownerChatId: ownerChatId.trim(),
          notifyNewBooking,
          notifyLowStock,
        },
      },
    }));
    setTesting(false);
    toast(ownerChatId ? "Telegram បាន​ភ្ជាប់ · សារ​សាក​ត្រូវ​បាន​ផ្ញើ" : "Bot Token បាន​រក្សា​ទុក", "ok");
    onClose();
  }

  function disconnect() {
    setState(s => ({
      ...s,
      config: { ...s.config, telegram: null },
    }));
    toast("បាន​ផ្ដាច់ Telegram", "info");
    onClose();
  }

  return (
    <Modal title="ភ្ជាប់ Telegram Bot" onClose={onClose}
      footer={<>
        {tg.botToken && (
          <button className="btn" onClick={disconnect} style={{ background: 'transparent', color: 'var(--danger)' }}>ផ្ដាច់</button>
        )}
        <div style={{ flex: 1 }}></div>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={verifyAndSave} disabled={testing}>
          {testing ? "កំពុង​សាក..." : "សាក & រក្សា​ទុក"}
        </button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="muted" style={{ fontSize: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius)' }}>
          <strong>វិធី​បង្កើត Bot:</strong>
          <ol style={{ margin: '6px 0 0 18px', padding: 0, lineHeight: 1.7 }}>
            <li>បើក Telegram → ស្វែងរក <code>@BotFather</code></li>
            <li>ផ្ញើ <code>/newbot</code> → ដាក់​ឈ្មោះ​ឱ្យ bot របស់​អ្នក</li>
            <li>Copy <b>Bot Token</b> ដែល​ BotFather ផ្ដល់​ឱ្យ → paste ខាង​ក្រោម</li>
            <li>បន្ទាប់​មក ស្វែង <code>@userinfobot</code> → ផ្ញើ <code>/start</code> → copy <b>Chat ID</b> របស់​អ្នក → paste ខាង​ក្រោម</li>
            <li>បំផុត ផ្ញើ <code>/start</code> ទៅ bot ​ដែល​អ្នក​បាន​បង្កើត (សំខាន់!)</li>
          </ol>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Bot Token</label>
          <input
            type="text"
            className="input"
            placeholder="123456:ABC-DEF..."
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Chat ID របស់​ម្ចាស់​ហាង <span className="muted" style={{ fontWeight: 400 }}>(សម្រាប់​ទទួល​ការ​ជូន​ដំណឹង)</span></label>
          <input
            type="text"
            className="input"
            placeholder="123456789"
            value={ownerChatId}
            onChange={e => setOwnerChatId(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>ការ​ជូន​ដំណឹង​ស្វ័យ​ប្រវត្តិ​ទៅ​ម្ចាស់​ហាង:</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyNewBooking} onChange={e => setNotifyNewBooking(e.target.checked)} />
            មាន booking ថ្មី
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyLowStock} onChange={e => setNotifyLowStock(e.target.checked)} />
            Parts ស្ទើរ​អស់ (low stock)
          </label>
        </div>

        {verifyMsg && (
          <div style={{
            padding: 10,
            borderRadius: 'var(--radius)',
            fontSize: 12,
            background: verifyMsg.kind === "error" ? 'var(--danger-soft)' : 'var(--success-soft)',
            color: verifyMsg.kind === "error" ? 'var(--danger)' : 'var(--success)',
          }}>
            {verifyMsg.text}
          </div>
        )}
      </div>
    </Modal>
  );
}

function LoyaltySettings({ state, setState, toast }) {
  const cfg = state.config || {};
  const [earn, setEarn] = React.useState(cfg.loyaltyEarn || "1 ពិន្ទុ / $1");
  const [redeem, setRedeem] = React.useState(cfg.loyaltyRedeem || "100 ពិន្ទុ = $5 បញ្ចុះ");
  const [bday, setBday] = React.useState(cfg.loyaltyBirthday || "2x ពិន្ទុក្នុងខែខួបកំណើត");
  const [expiry, setExpiry] = React.useState(cfg.loyaltyExpiry || "24 ខែ");
  function save() {
    setState(s => ({ ...s, config: { ...s.config, loyaltyEarn: earn, loyaltyRedeem: redeem, loyaltyBirthday: bday, loyaltyExpiry: expiry } }));
    toast("Loyalty rules បានរក្សាទុក", "ok");
  }
  return (
    <SettingsCard title="Loyalty Rules">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div className="field"><label>Earn Rate</label><input className="input" value={earn} onChange={e => setEarn(e.target.value)} /></div>
        <div className="field"><label>Redemption</label><input className="input" value={redeem} onChange={e => setRedeem(e.target.value)} /></div>
        <div className="field"><label>Birthday Bonus</label><input className="input" value={bday} onChange={e => setBday(e.target.value)} /></div>
        <div className="field"><label>Expiry</label><input className="input" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </div>
      <div className="section-heading"><h2 style={{ fontSize: 14 }}>Tier Thresholds</h2></div>
      <table className="table">
        <thead><tr><th>Tier</th><th className="num">Min Points</th><th className="num">Discount</th><th>Perks</th></tr></thead>
        <tbody>
          {TIERS.map(t => (
            <tr key={t.name}>
              <td><span className="chip" style={{ background: t.color + "22", color: t.color, border: `1px solid ${t.color}40` }}>{t.name}</span></td>
              <td className="num">{t.min}</td>
              <td className="num">{[5, 10, 15, 20][TIERS.indexOf(t)]}%</td>
              <td className="muted" style={{ fontSize: 12 }}>{t.perks.join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SettingsCard>
  );
}

function AddBookingModal({ onClose, state, setState, toast }) {
  const allVehicles = (state && state.vehicles) || vehicles;
  const firstWithVeh = state.customers.find(c => allVehicles.some(v => v.owner === c.id));
  const [customerId, setCustomerId] = React.useState((firstWithVeh && firstWithVeh.id) || (state.customers[0] && state.customers[0].id) || "CU-1001");
  const custVehicles = allVehicles.filter(v => v.owner === customerId);
  const [vehicleId, setVehicleId] = React.useState((custVehicles[0] && custVehicles[0].id) || "");
  const [service, setService] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = React.useState("09:00");
  const [duration, setDuration] = React.useState(1);
  const [techId, setTechId] = React.useState((technicians[0] && technicians[0].id) || "T-01");
  React.useEffect(() => {
    const vs = allVehicles.filter(v => v.owner === customerId);
    setVehicleId(vs[0] ? vs[0].id : "");
  }, [customerId, allVehicles.length]);

  function submit() {
    if (!service.trim()) { toast("សូមបញ្ចូលប្រភេទសេវា", "error"); return; }
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    if (!date) { toast("សូម​ជ្រើស​កាល​បរិច្ឆេទ", "error"); return; }
    const tech = technicians.find(t => t.id === techId);
    const id = generateId("BK", state?.bookings || []);
    const newB = { id, date, time, duration: +duration, customer: customerId, vehicle: vehicleId, service: service.trim(), tech: tech ? tech.name : "—", status: "confirmed" };
    setState(s => ({ ...s, bookings: [...s.bookings, newB].sort((a, b) => a.time.localeCompare(b.time)) }));
    toast(`បន្ថែមការកក់ ${id} · ${time} ជោគជ័យ`, "ok");
    // Owner Telegram notification — fire-and-forget
    const tg = state.config && state.config.telegram;
    if (tg && tg.botToken && tg.ownerChatId && tg.notifyNewBooking !== false) {
      const cust = (state.customers || []).find(c => c.id === customerId);
      const veh = (state.vehicles || []).find(v => v.id === vehicleId);
      sendMessage(tg.botToken, tg.ownerChatId, newBookingMessage(newB, cust, veh)).catch(() => {});
    }
    onClose();
  }

  return (
    <Modal title="ការកក់ថ្មី · NEW BOOKING" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> បន្ថែមការកក់</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field">
          <label>អតិថិជន</label>
          <select className="select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>រថយន្ត</label>
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {custVehicles.length === 0 && <option value="">— គ្មានរថយន្ត —</option>}
            {custVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {vehicleLabel(v)}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>សេវាកម្ម · SERVICE</label>
          <input className="input" value={service} onChange={e => setService(e.target.value)} placeholder="ឧ. Oil change" autoFocus />
        </div>
        <div className="field"><label>កាល​បរិច្ឆេទ · DATE</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label>ម៉ោង · TIME</label><input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>រយៈពេល (ម៉ោង)</label><input className="input" type="number" step="0.5" value={duration} onChange={e => setDuration(e.target.value)} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>ជាងជួសជុល · TECHNICIAN</label>
          <select className="select" value={techId} onChange={e => setTechId(e.target.value)}>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function AddMemberModal({ onClose, state, setState, toast }) {
  const [name, setName] = React.useState("");
  const [tier, setTier] = React.useState("Bronze");
  const [points, setPoints] = React.useState(0);
  const [spent, setSpent] = React.useState(0);

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះសមាជិក", "error"); return; }
    const id = generateId("M", state?.members || []);
    const newM = { id, name: name.trim(), tier, points: +points, spent: +spent, joined: new Date().toISOString().slice(0, 10) };
    setState(s => ({ ...s, members: [...s.members, newM] }));
    toast(`បន្ថែមសមាជិក ${name} (${tier}) ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title="សមាជិកថ្មី · NEW MEMBER" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> បន្ថែមសមាជិក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>ឈ្មោះ · NAME</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        <div className="field">
          <label>កម្រិត · TIER</label>
          <select className="select" value={tier} onChange={e => setTier(e.target.value)}>
            {TIERS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="field"><label>ពិន្ទុ · POINTS</label><input className="input" type="number" value={points} onChange={e => setPoints(e.target.value)} /></div>
        <div className="field"><label>ចំណាយរួម · SPENT ($)</label><input className="input" type="number" value={spent} onChange={e => setSpent(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

// ── Edit Booking Modal ──
function EditBookingModal({ booking, state, setState, onClose, toast }) {
  const allVehicles = (state && state.vehicles) || vehicles;
  const [customerId, setCustomerId] = React.useState(booking.customer);
  const custVehicles = allVehicles.filter(v => v.owner === customerId);
  const [vehicleId, setVehicleId] = React.useState(booking.vehicle);
  const [service, setService] = React.useState(booking.service || "");
  const [date, setDate] = React.useState(booking.date || new Date().toISOString().slice(0, 10));
  const [time, setTime] = React.useState(booking.time || "09:00");
  const [duration, setDuration] = React.useState(booking.duration || 1);
  const [techId, setTechId] = React.useState(() => {
    const t = technicians.find(t => t.name === booking.tech);
    return t ? t.id : technicians[0].id;
  });
  const [status, setStatus] = React.useState(booking.status || "confirmed");

  React.useEffect(() => {
    const vs = allVehicles.filter(v => v.owner === customerId);
    if (!vs.find(v => v.id === vehicleId)) setVehicleId(vs[0] ? vs[0].id : "");
  }, [customerId, allVehicles.length]);

  function save() {
    if (!service.trim()) { toast("បំពេញសេវាកម្ម", "error"); return; }
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    const tech = technicians.find(t => t.id === techId);
    setState(s => ({
      ...s,
      bookings: s.bookings.map(b => b.id === booking.id ? {
        ...b, customer: customerId, vehicle: vehicleId, service: service.trim(),
        date, time, duration: +duration, tech: tech ? tech.name : b.tech, status,
      } : b).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '')),
    }));
    toast(`រក្សាទុក​ការកក់ ${booking.id} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title={"កែការកក់ · " + booking.id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field">
          <label>អតិថិជន</label>
          <select className="select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>រថយន្ត</label>
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {custVehicles.length === 0 && <option value="">— គ្មានរថយន្ត —</option>}
            {custVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {vehicleLabel(v)}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>សេវាកម្ម · SERVICE</label>
          <input className="input" value={service} onChange={e => setService(e.target.value)} autoFocus />
        </div>
        <div className="field"><label>កាល​បរិច្ឆេទ · DATE</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label>ម៉ោង · TIME</label><input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        <div className="field"><label>រយៈពេល (ម៉ោង)</label><input className="input" type="number" step="0.5" value={duration} onChange={e => setDuration(e.target.value)} /></div>
        <div className="field">
          <label>ជាងជួសជុល</label>
          <select className="select" value={techId} onChange={e => setTechId(e.target.value)}>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}
          </select>
        </div>
        <div className="field">
          <label>ស្ថានភាព</label>
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-in</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit Member Modal ──
function EditMemberModal({ member, setState, onClose, toast }) {
  const [name, setName] = React.useState(member.name || "");
  const [tier, setTier] = React.useState(member.tier || "Bronze");
  const [points, setPoints] = React.useState(member.points || 0);
  const [spent, setSpent] = React.useState(member.spent || 0);

  function save() {
    if (!name.trim()) { toast("បំពេញឈ្មោះ", "error"); return; }
    setState(s => ({
      ...s,
      members: s.members.map(m => m.id === member.id ? {
        ...m, name: name.trim(), tier, points: +points || 0, spent: +spent || 0,
      } : m),
    }));
    toast(`រក្សាទុក ${name} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title={"កែសមាជិក · " + member.id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>ឈ្មោះ · NAME</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus /></div>
        <div className="field">
          <label>កម្រិត · TIER</label>
          <select className="select" value={tier} onChange={e => setTier(e.target.value)}>
            {TIERS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="field"><label>ពិន្ទុ · POINTS</label><input className="input" type="number" value={points} onChange={e => setPoints(e.target.value)} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>ចំណាយរួម · SPENT ($)</label><input className="input" type="number" value={spent} onChange={e => setSpent(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

export { BookingScreen, DVIScreen, MembersScreen, ReportsScreen, SettingsScreen, AddBookingModal, AddMemberModal, EditMemberModal };
