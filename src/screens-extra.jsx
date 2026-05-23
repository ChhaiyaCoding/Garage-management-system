import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal } from './shell';
import { Money, Stat, lookupCustomer, lookupVehicle, MISSING_C, MISSING_V } from './screens-core';
// ─── Booking, DVI, Members, Reports, Settings screens ───
const G = GARAGE;
const { customers, vehicles, parts, jobs, invoices, quotations, bookings, technicians, members,
  customersById, vehiclesById, partsById, jobsById, vehicleLabel, statusColor, statusLabel, moneyUSD, moneyKHR } = G;

// ════════════════════════════════════════════════════════════
// BOOKING (Online appointments)
// ════════════════════════════════════════════════════════════
function BookingScreen({ state, setState, currency, onAddBooking, onConvertBooking, toast }) {
  function checkIn(bId) {
    if (!setState) return;
    setState(s => ({ ...s, bookings: s.bookings.map(b => b.id === bId ? { ...b, status: "checked-in" } : b) }));
  }
  function callPhone(phone) {
    if (phone && phone !== "—") window.open("tel:" + phone.replace(/\s/g, ""), "_self");
    else toast("គ្មានលេខទូរស័ព្ទ", "info");
  }
  const slots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const days = ["ច័ន្ទ 18", "អង្គារ 19", "ពុធ 17", "ព្រ. 20", "សុក្រ 21", "សៅរ៍ 22"];
  const todayCol = 2;

  const bays = ["Bay 1", "Bay 2", "Bay 3", "Bay 4"];
  const slotBookings = {};
  state.bookings.forEach(b => {
    const key = b.time.slice(0, 2);
    slotBookings[key] = slotBookings[key] || [];
    slotBookings[key].push(b);
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Online Booking</h1>
          <div className="page-sub">កាលវិភាគការកក់ · {state.bookings.length} ការកក់ថ្ងៃនេះ · 4 Bays សកម្ម</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => toast("Calendar View · ការមើលប្រតិទិន (ឆាប់ៗ)", "info")}><Icon.Cal size={14} /> Calendar View</button>
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

      {/* Week strip */}
      <div className="card">
        <h3 className="card-title">សប្តាហ៍នេះ · WEEK · 17–22 ឧសភា 2026 <span className="meta">VIEW BY HOUR</span></h3>
        <div style={{ overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(6, 1fr)', gap: 4, minWidth: 800 }}>
            <div></div>
            {days.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 0', borderRadius: 6, background: i === todayCol ? 'var(--accent-soft)' : 'var(--bg-2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: i === todayCol ? 'var(--accent)' : 'var(--text-1)', letterSpacing: '0.08em' }}>{d}</div>
            ))}
            {slots.map(s => (
              <React.Fragment key={s}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', textAlign: 'right', paddingRight: 8, paddingTop: 10 }}>{s}</div>
                {days.map((_, di) => {
                  const isToday = di === todayCol;
                  const hourKey = s.slice(0, 2);
                  const booked = isToday && slotBookings[hourKey];
                  return (
                    <div key={di} style={{ height: 56, borderRadius: 4, background: booked ? 'var(--info-soft)' : 'var(--bg-2)', border: '1px solid ' + (booked ? 'rgba(56,189,248,0.3)' : 'var(--border-0)'), padding: 6, fontSize: 10, color: 'var(--text-1)' }}>
                      {booked && booked.map(b => {
                        const c = lookupCustomer(b.customer, state) || MISSING_C;
                        return <div key={b.id} style={{ fontWeight: 600 }}>{(c.name || "—").split(" ")[0]} · {b.service.slice(0, 14)}</div>;
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Today list */}
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
                <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{b.time}</div>
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
              </div>
            </div>
          );
        })}
      </div>
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

function DVIScreen({ currency, toast }) {
  const [sections, setSections] = React.useState(() =>
    DVI_SECTIONS.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) }))
  );

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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">DVI Inspection</h1>
          <div className="page-sub">Digital Vehicle Inspection · 2KA-3917 · Lexus RX350 · JOB-2406-088</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print Report</button>
          <button className="btn" onClick={() => toast("បានផ្ញើរបាយការណ៍ DVI តាម Telegram", "ok")}><Icon.Send size={14} /> ផ្ញើតាម Telegram</button>
          <button className="btn btn-primary" onClick={() => toast(`DVI បានរក្សាទុក · ${counts.pass} pass · ${counts.warn} warn · ${counts.fail} fail`, "ok")}>
            <Icon.Check size={14} /> Submit Inspection
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
          <div style={{ fontWeight: 700, fontSize: 18 }} className="mono">2KA-3917</div>
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>VEHICLE</div>
          <div style={{ fontWeight: 600 }}>2019 Lexus RX350</div>
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>MILEAGE</div>
          <div style={{ fontWeight: 600 }} className="num">78,420 km</div>
        </div>
        <div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>INSPECTED BY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="avatar av-sm" style={{ background: '#22c55e', color: '#0b0b0b', fontSize: 10 }}>SP</div>
            <span style={{ fontWeight: 600 }}>Sok Pheap</span>
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
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalSpent = members.reduce((s, m) => s + m.spent, 0);
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
          <div className="kpi-delta neutral">មធ្យម {Math.round(totalPoints / members.length)}/នាក់</div>
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
                  <td className="num" style={{ fontWeight: 700, color: 'var(--accent)' }}>{m.points}</td>
                  <td className="num"><Money value={m.spent} currency={currency} /></td>
                  <td style={{ minWidth: 160 }}>
                    {next ? (
                      <>
                        <div className="bar"><div className="bar-fill" style={{ width: progress + "%", background: tier.color }}></div></div>
                        <div className="mono muted" style={{ fontSize: 10, marginTop: 4 }}>{next.min - m.points} pts → {next.name}</div>
                      </>
                    ) : <div className="mono muted" style={{ fontSize: 10 }}>MAX TIER</div>}
                  </td>
                  <td><button className="btn btn-sm" onClick={() => addPoints(m.id, 50)}>+ 50 Points</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════
function ReportsScreen({ state, currency, toast }) {
  const monthly = [
    { m: "ឧសភា 25", v: 12400 },
    { m: "មិថុនា", v: 14820 },
    { m: "កក្កដា", v: 13900 },
    { m: "សីហា", v: 15640 },
    { m: "កញ្ញា", v: 16200 },
    { m: "តុលា", v: 14800 },
    { m: "វិច្ឆិកា", v: 17320 },
    { m: "ធ្នូ", v: 19420 },
    { m: "មករា 26", v: 16800 },
    { m: "កុម្ភៈ", v: 18200 },
    { m: "មីនា", v: 21100 },
    { m: "មេសា", v: 22850 },
  ];
  const max = Math.max(...monthly.map(m => m.v));
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports & BI</h1>
          <div className="page-sub">របាយការណ៍ · Last 12 months · Phnom Penh branch</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => toast("ជ្រើសរើសចន្លោះកាលបរិច្ឆេទ (ឆាប់ៗ)", "info")}><Icon.Cal size={14} /> Date Range</button>
          <button className="btn" onClick={() => toast("តម្រងតាមសាខា (ឆាប់ៗ)", "info")}><Icon.Branch size={14} /> All Branches</button>
          <button className="btn btn-primary" onClick={() => window.print()}><Icon.Download size={14} /> Export PDF</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">ចំណូលឆ្នាំ</div><div className="kpi-value num"><Money value={203210} currency={currency} /></div><div className="kpi-delta">▲ 28% YoY</div></div>
        <div className="kpi"><div className="kpi-label">Gross Margin</div><div className="kpi-value num">38<span className="kpi-unit">%</span></div><div className="kpi-delta">▲ 2.4%</div></div>
        <div className="kpi"><div className="kpi-label">មធ្យម / Job</div><div className="kpi-value num"><Money value={142} currency={currency} /></div><div className="kpi-delta">▲ 8%</div></div>
        <div className="kpi"><div className="kpi-label">Retention</div><div className="kpi-value num">64<span className="kpi-unit">%</span></div><div className="kpi-delta">▲ 5%</div></div>
      </div>

      <div className="card">
        <h3 className="card-title">ចំណូលប្រចាំខែ · MONTHLY REVENUE <span className="meta">USD · 12 MOS</span></h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
          {monthly.map((m, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="num" style={{ fontSize: 10, color: 'var(--text-2)' }}>{Math.round(m.v / 1000)}K</div>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', background: i === monthly.length - 1 ? 'var(--accent)' : 'var(--info)', borderRadius: '4px 4px 0 0', height: (m.v / max * 100) + "%", opacity: i === monthly.length - 1 ? 1 : 0.5 + (i / monthly.length) * 0.5 }}></div>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-2)', textAlign: 'center' }}>{m.m}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 className="card-title">សេវាកម្មកំពូល · TOP SERVICES</h3>
          <table className="table">
            <thead><tr><th>សេវាកម្ម</th><th className="num">Jobs</th><th className="num">ចំណូល</th></tr></thead>
            <tbody>
              <tr><td>Oil change + filter</td><td className="num">88</td><td className="num">$3,520</td></tr>
              <tr><td>Brake service</td><td className="num">42</td><td className="num">$4,180</td></tr>
              <tr><td>30K/60K major service</td><td className="num">28</td><td className="num">$5,940</td></tr>
              <tr><td>AC service</td><td className="num">34</td><td className="num">$1,820</td></tr>
              <tr><td>Tire rotation + balance</td><td className="num">52</td><td className="num">$1,560</td></tr>
              <tr><td>Engine diagnostics</td><td className="num">18</td><td className="num">$680</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="card-title">អតិថិជនកំពូល · TOP CUSTOMERS</h3>
          <table className="table">
            <thead><tr><th>អតិថិជន</th><th className="num">Jobs</th><th className="num">ចំណាយ</th></tr></thead>
            <tbody>
              {customers.sort((a, b) => b.lifetime - a.lifetime).slice(0, 6).map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar av-sm" style={{ background: c.color, color: '#0b0b0b', fontSize: 10 }}>{c.initials}</div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="num">{c.jobs}</td>
                  <td className="num" style={{ fontWeight: 700 }}>${c.lifetime.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">ការប្រើ Parts ច្រើនបំផុត · PARTS USAGE</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { name: "Engine Oil 5W-30", used: 88, val: 2816 },
            { name: "Oil Filter Toyota", used: 76, val: 646 },
            { name: "Brake Pads Front", used: 42, val: 2016 },
            { name: "Cabin Filter", used: 38, val: 532 },
            { name: "Spark Plugs Iridium", used: 24, val: 864 },
            { name: "Coolant 4L", used: 22, val: 484 },
          ].map((p, i) => (
            <div key={i} style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{p.used}</div>
                  <div className="mono muted" style={{ fontSize: 10 }}>UNITS</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>${p.val}</div>
                  <div className="mono muted" style={{ fontSize: 10 }}>REVENUE</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
      {tab === "integrations" && <IntegrationSettings toast={toast} />}
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
      const id = "BR-" + String(4 + Math.floor(Math.random() * 90)).padStart(2, "0");
      setState(s => ({ ...s, branches: [...s.branches, { id, name: name.trim(), addr: addr.trim(), bays: +bays, staff: +staffN, status: "active" }] }));
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
      const id = "S-" + String(8 + Math.floor(Math.random() * 90)).padStart(2, "0");
      setState(s => ({ ...s, staff: [...s.staff, { id, name: name.trim(), initials, color: PALETTE[Math.floor(Math.random() * PALETTE.length)], role, dept, load: 0, capacity: 0 }] }));
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

function IntegrationSettings({ toast }) {
  const integ = [
    { name: "ABA Pay", desc: "Accept payments · QR + Bakong", icon: "Money", connected: true },
    { name: "Wing Money", desc: "Mobile wallet payments", icon: "Money", connected: true },
    { name: "Telegram", desc: "Send invoices & reminders", icon: "Send", connected: true },
    { name: "SMS Gateway", desc: "Smart, Cellcard, Metfone", icon: "Phone", connected: false },
    { name: "QuickBooks", desc: "Accounting sync", icon: "Doc", connected: false },
    { name: "Bakong KHQR", desc: "National QR standard", icon: "Tag", connected: true },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {integ.map(it => (
        <div key={it.name} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, background: 'var(--bg-3)', borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
              {React.createElement(Icon[it.icon])}
            </div>
            {it.connected ? <span className="chip chip-green">CONNECTED</span> : <span className="chip chip-gray">OFF</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{it.desc}</div>
          <button className="btn btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
            onClick={() => toast && toast(it.connected ? `កំណត់ ${it.name} (ឆាប់ៗ)` : `ភ្ជាប់ ${it.name} (ឆាប់ៗ)`, "info")}>
            {it.connected ? "កំណត់" : "ភ្ជាប់"}
          </button>
        </div>
      ))}
    </div>
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
    const tech = technicians.find(t => t.id === techId);
    const id = "BK-" + String(507 + Math.floor(Math.random() * 90));
    const newB = { id, time, duration: +duration, customer: customerId, vehicle: vehicleId, service: service.trim(), tech: tech ? tech.name : "—", status: "confirmed" };
    setState(s => ({ ...s, bookings: [...s.bookings, newB].sort((a, b) => a.time.localeCompare(b.time)) }));
    toast(`បន្ថែមការកក់ ${id} · ${time} ជោគជ័យ`, "ok");
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
        <div className="field"><label>ម៉ោង · TIME</label><input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        <div className="field"><label>រយៈពេល (ម៉ោង)</label><input className="input" type="number" step="0.5" value={duration} onChange={e => setDuration(e.target.value)} /></div>
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
    const id = "M-" + String(100 + Math.floor(Math.random() * 900));
    const newM = { id, name: name.trim(), tier, points: +points, spent: +spent, joined: "2026-05-17" };
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

export { BookingScreen, DVIScreen, MembersScreen, ReportsScreen, SettingsScreen, AddBookingModal, AddMemberModal };
