import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal } from './shell';
import { Money, Stat } from './screens-core';
// ─── Booking, DVI, Members, Reports, Settings screens ───
const G = GARAGE;

// ════════════════════════════════════════════════════════════
// BOOKING (Online appointments)
// ════════════════════════════════════════════════════════════
function BookingScreen({ state, currency }) {
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
          <button className="btn"><Icon.Cal size={14} /> Calendar View</button>
          <button className="btn"><Icon.Tag size={14} /> Booking Link</button>
          <button className="btn btn-primary"><Icon.Plus size={14} /> បន្ថែមការកក់</button>
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
                        const c = customersById[b.customer];
                        return <div key={b.id} style={{ fontWeight: 600 }}>{c.name.split(" ")[0]} · {b.service.slice(0, 14)}</div>;
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
          const c = customersById[b.customer];
          const v = vehiclesById[b.vehicle];
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
                <button className="btn btn-sm"><Icon.Phone size={12} /></button>
                <button className="btn btn-sm"><Icon.Wrench size={12} /></button>
                <button className="btn btn-sm btn-ghost"><Icon.More size={12} /></button>
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
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">DVI Inspection</h1>
          <div className="page-sub">Digital Vehicle Inspection · 2KA-3917 · Lexus RX350 · JOB-2406-088</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon.Print size={14} /> Print Report</button>
          <button className="btn"><Icon.Send size={14} /> ផ្ញើតាម Telegram</button>
          <button className="btn btn-primary" onClick={() => toast("DVI report saved", "ok")}>
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
        <SummaryChip count={14} label="PASS" color="green" />
        <SummaryChip count={4} label="ATTENTION" color="orange" />
        <SummaryChip count={1} label="FAIL · IMMEDIATE" color="red" />
        <SummaryChip count={0} label="PENDING" color="gray" />
      </div>

      {/* Sections */}
      {DVI_SECTIONS.map(sec => {
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
                    <button className={"btn btn-sm" + (item.status === "pass" ? " btn-primary" : "")} style={{ padding: '4px 10px' }}>P</button>
                    <button className={"btn btn-sm" + (item.status === "warn" ? " btn-primary" : "")} style={{ padding: '4px 10px' }}>W</button>
                    <button className={"btn btn-sm" + (item.status === "fail" ? " btn-primary" : "")} style={{ padding: '4px 10px' }}>F</button>
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

function MembersScreen({ currency, toast }) {
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
          <button className="btn"><Icon.Send size={14} /> Send Campaign</button>
          <button className="btn btn-primary"><Icon.Plus size={14} /> បន្ថែមសមាជិក</button>
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
            <button className="btn btn-sm"><Icon.Filter size={12} /> Filter</button>
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
                  <td><button className="btn btn-sm" onClick={() => toast("បន្ថែម 50 ពិន្ទុ", "ok")}>+ Add Points</button></td>
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
function ReportsScreen({ currency }) {
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
          <button className="btn"><Icon.Cal size={14} /> Date Range</button>
          <button className="btn"><Icon.Branch size={14} /> All Branches</button>
          <button className="btn btn-primary"><Icon.Download size={14} /> Export PDF</button>
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
function SettingsScreen({ tweaks, setTweak }) {
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

      {tab === "garage" && <GarageSettings />}
      {tab === "branches" && <BranchSettings />}
      {tab === "staff" && <StaffSettings />}
      {tab === "billing" && <BillingSettings />}
      {tab === "integrations" && <IntegrationSettings />}
      {tab === "loyalty" && <LoyaltySettings />}
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

function GarageSettings() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <SettingsCard title="ព័ត៌មានហ្គារ៉ាស់ · GARAGE INFO">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label>ឈ្មោះហ្គារ៉ាស់</label><input className="input" defaultValue="Garage OS · Service Center" /></div>
          <div className="field"><label>អាសយដ្ឋាន</label><input className="input" defaultValue="St. 271, Sangkat Toul Tom Pong, Phnom Penh" /></div>
          <div className="field"><label>ទូរស័ព្ទ</label><input className="input" defaultValue="+855 23 555 100" /></div>
          <div className="field"><label>VAT TIN</label><input className="input" defaultValue="K001-901886401" /></div>
        </div>
      </SettingsCard>
      <SettingsCard title="ម៉ោងធ្វើការ · OPERATING HOURS">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {["ច័ន្ទ – សុក្រ", "សៅរ៍", "អាទិត្យ"].map((d, i) => (
            <div key={d} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 13 }}>{d}</div>
              <input className="input" defaultValue={i === 2 ? "បិទ" : "07:30"} style={{ width: 100, padding: '6px 10px' }} />
              <span className="muted">→</span>
              <input className="input" defaultValue={i === 2 ? "—" : i === 1 ? "16:00" : "18:30"} style={{ width: 100, padding: '6px 10px' }} />
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function BranchSettings() {
  const branches = [
    { id: "BR-01", name: "សាខាមេ · ភ្នំពេញ", addr: "St. 271, Toul Tom Pong", bays: 8, staff: 12, status: "active", main: true },
    { id: "BR-02", name: "សាខា ខ. កែវ", addr: "St. 2004, Sen Sok", bays: 5, staff: 7, status: "active" },
    { id: "BR-03", name: "សាខា សៀមរាប", addr: "National Rd 6, Siem Reap", bays: 4, staff: 5, status: "active" },
  ];
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
              <td><button className="btn btn-sm btn-ghost"><Icon.Pen size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 14 }}>
        <button className="btn btn-sm"><Icon.Plus size={12} /> បន្ថែមសាខាថ្មី</button>
      </div>
    </div>
  );
}

function StaffSettings() {
  const staff = [
    ...technicians.map(t => ({ ...t, dept: "Workshop" })),
    { id: "S-05", name: "Chan Sophea", initials: "CS", color: "#f472b6", role: "Service Advisor", dept: "Front Desk", load: 0, capacity: 0 },
    { id: "S-06", name: "Long Dara", initials: "LD", color: "#38bdf8", role: "Parts Manager", dept: "Inventory", load: 0, capacity: 0 },
    { id: "S-07", name: "លោក សុខ ភារុណ", initials: "SP", color: "#22c55e", role: "Owner", dept: "Management", load: 0, capacity: 0 },
  ];
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
              <td><button className="btn btn-sm btn-ghost"><Icon.Pen size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: 14 }}><button className="btn btn-sm"><Icon.Plus size={12} /> បន្ថែមបុគ្គលិក</button></div>
    </div>
  );
}

function BillingSettings() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <SettingsCard title="ពន្ធ · TAX">
        <div className="field"><label>VAT Rate</label><input className="input" defaultValue="10%" /></div>
        <div className="field" style={{ marginTop: 12 }}><label>VAT TIN</label><input className="input" defaultValue="K001-901886401" /></div>
        <div className="field" style={{ marginTop: 12 }}><label>Currency</label><select className="select"><option>USD (Primary)</option><option>KHR</option></select></div>
      </SettingsCard>
      <SettingsCard title="Invoice Template">
        <div className="field"><label>Invoice Prefix</label><input className="input" defaultValue="INV-2406-" /></div>
        <div className="field" style={{ marginTop: 12 }}><label>Default Payment Terms</label><select className="select"><option>Due on receipt</option><option>Net 15</option><option>Net 30</option></select></div>
        <div className="field" style={{ marginTop: 12 }}><label>Footer Note</label><textarea className="textarea" defaultValue="Thank you for your business · សូមអរគុណចំពោះការគាំទ្ររបស់លោកអ្នក"></textarea></div>
      </SettingsCard>
    </div>
  );
}

function IntegrationSettings() {
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
          <button className="btn btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
            {it.connected ? "កំណត់" : "ភ្ជាប់"}
          </button>
        </div>
      ))}
    </div>
  );
}

function LoyaltySettings() {
  return (
    <SettingsCard title="Loyalty Rules">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div className="field"><label>Earn Rate</label><input className="input" defaultValue="1 ពិន្ទុ / $1" /></div>
        <div className="field"><label>Redemption</label><input className="input" defaultValue="100 ពិន្ទុ = $5 បញ្ចុះ" /></div>
        <div className="field"><label>Birthday Bonus</label><input className="input" defaultValue="2x ពិន្ទុក្នុងខែខួបកំណើត" /></div>
        <div className="field"><label>Expiry</label><input className="input" defaultValue="24 ខែ" /></div>
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

export { BookingScreen, DVIScreen, MembersScreen, ReportsScreen, SettingsScreen };
