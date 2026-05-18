import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal, Drawer } from './shell';
import { Money } from './screens-core';
// ─── Job Card Kanban + Job detail drawer + New Job modal ───
const G = GARAGE;
const KANBAN_COLS = [
  { id: "waiting", title: "Waiting · រង់ចាំ", dot: "gray" },
  { id: "diagnose", title: "Diagnose · ត្រួតពិនិត្យ", dot: "amber" },
  { id: "progress", title: "In Progress · កំពុងធ្វើ", dot: "blue" },
  { id: "parts", title: "Awaiting Parts · រង់ចាំ", dot: "orange" },
  { id: "qc", title: "QC · ត្រួតពិនិត្យចុង", dot: "teal" },
  { id: "done", title: "Done · បានបញ្ចប់", dot: "green" },
];

function JobsScreen({ state, setState, onOpenJob, onNewJob, currency }) {
  const { jobs: allJobs } = state;
  const grouped = {};
  KANBAN_COLS.forEach(c => grouped[c.id] = []);
  allJobs.forEach(j => { if (grouped[j.status]) grouped[j.status].push(j); });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Job Card · Board</h1>
          <div className="page-sub">សរុប {allJobs.length} Jobs · {allJobs.filter(j=>j.status!=='done').length} កំពុងបន្ត · ៦ ត្រូវបញ្ចប់ថ្ងៃនេះ</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon.Filter size={14} /> Filter</button>
          <button className="btn"><Icon.Cal size={14} /> Today</button>
          <button className="btn btn-primary" onClick={onNewJob}><Icon.Plus size={14} /> Job ថ្មី</button>
        </div>
      </div>

      <div className="kanban">
        {KANBAN_COLS.map(col => (
          <div key={col.id} className="kanban-col">
            <div className="kanban-col-head">
              <div className="kanban-col-title">
                <span className={"kanban-col-dot dot-" + col.dot}></span>
                {col.title}
              </div>
              <span className="kanban-col-count num">{grouped[col.id].length}</span>
            </div>
            {grouped[col.id].map(j => (
              <JobCard key={j.id} job={j} onOpen={() => onOpenJob(j.id)} />
            ))}
            {grouped[col.id].length === 0 && (
              <div className="empty" style={{ padding: 20, fontSize: 11 }}>គ្មាន Job</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, onOpen }) {
  const v = vehiclesById[job.vehicle];
  const c = customersById[job.customer];
  return (
    <div className="job-card" onClick={onOpen}>
      <div className="job-card-head">
        <span className="job-id">{job.id}</span>
        {job.priority === "high" && <span className="chip chip-red" style={{ fontSize: 9, padding: "1px 6px" }}>HIGH</span>}
      </div>
      <div className="job-name">{job.title}</div>
      <div className="job-vehicle">
        <span className="mono" style={{ color: 'var(--text-1)', fontWeight: 700 }}>{v.plate}</span> · {vehicleLabel(v)}
      </div>
      <div className="job-foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="avatar av-sm" style={{ background: job.techColor, color: '#0b0b0b', width: 22, height: 22, fontSize: 9 }}>{job.techInitials}</div>
          <span>{c.name.split(' ')[0]}</span>
        </div>
        <span>{job.promised.split(' ')[1]}</span>
      </div>
    </div>
  );
}

function JobDrawer({ id, state, setState, onClose, onGenerateInvoice, currency, toast }) {
  const job = state.jobs.find(j => j.id === id);
  if (!job) return null;
  const v = vehiclesById[job.vehicle];
  const c = customersById[job.customer];

  const partsTotal = job.partsUsed.reduce((s, p) => s + p.qty * p.price, 0);
  const laborTotal = job.services.reduce((s, x) => s + x.total, 0);
  const subtotal = partsTotal + laborTotal;
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = subtotal + tax;

  function updateStatus(next) {
    setState(s => ({ ...s, jobs: s.jobs.map(j => j.id === id ? { ...j, status: next } : j) }));
    toast(`Job ${id} → ${next}`, "info");
  }

  function removePart(idx) {
    setState(s => ({ ...s, jobs: s.jobs.map(j => j.id === id ? { ...j, partsUsed: j.partsUsed.filter((_, i) => i !== idx) } : j) }));
  }

  return (
    <Drawer onClose={onClose} width={680}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', letterSpacing: '0.1em' }}>{job.id}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{job.title}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>បង្កើត {job.created} · សន្យាបញ្ចប់ {job.promised}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon.X size={16} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <span className={"chip chip-" + statusColor(job.status)}>{statusLabel(job.status)}</span>
          {job.priority === "high" && <span className="chip chip-red">HIGH PRIORITY</span>}
        </div>

        {/* Vehicle & Customer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 'var(--radius)' }}>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>VEHICLE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <Icon.Car size={20} />
              <div>
                <div style={{ fontWeight: 700 }}>{v.plate}</div>
                <div className="muted" style={{ fontSize: 12 }}>{vehicleLabel(v)} · {v.color}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{v.mileage.toLocaleString()} km</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 'var(--radius)' }}>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>CUSTOMER</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <div className="avatar av-md" style={{ background: c.color, color: '#0b0b0b' }}>{c.initials}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{c.phone}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tech */}
        <div style={{ background: 'var(--bg-2)', padding: 14, borderRadius: 'var(--radius)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em' }}>ASSIGNED TECH</div>
          <div className="avatar av-sm" style={{ background: job.techColor, color: '#0b0b0b' }}>{job.techInitials}</div>
          <div style={{ flex: 1, fontWeight: 600 }}>{job.tech}</div>
          <button className="btn btn-sm btn-ghost"><Icon.Pen size={12} /></button>
        </div>

        {/* Status actions */}
        <div className="section-heading"><h2 style={{ fontSize: 14 }}>ផ្លាស់ស្ថានភាព · UPDATE STATUS</h2></div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
          {KANBAN_COLS.map(c => (
            <button
              key={c.id}
              className={"btn btn-sm" + (job.status === c.id ? " btn-primary" : "")}
              onClick={() => updateStatus(c.id)}
            >
              <span className={"dot-" + c.dot} style={{ width: 6, height: 6, borderRadius: 3 }}></span>
              {c.title.split(' · ')[0]}
            </button>
          ))}
        </div>

        {/* Services */}
        <div className="section-heading"><h2 style={{ fontSize: 14 }}>សេវាកម្ម · SERVICES</h2></div>
        <table className="table" style={{ marginBottom: 18 }}>
          <thead>
            <tr><th>បរិយាយ</th><th className="num">ម៉ោង</th><th className="num">តម្លៃ</th><th className="num">សរុប</th></tr>
          </thead>
          <tbody>
            {job.services.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td className="num">{s.hours}</td>
                <td className="num"><Money value={s.rate} currency={currency} /></td>
                <td className="num" style={{ fontWeight: 700 }}><Money value={s.total} currency={currency} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Parts */}
        <div className="section-heading">
          <h2 style={{ fontSize: 14 }}>Parts ប្រើ · PARTS USED</h2>
          <span className="sub">{job.partsUsed.length} items</span>
        </div>
        <div style={{ marginBottom: 18 }}>
          {job.partsUsed.length === 0 && <div className="empty" style={{ padding: 20, fontSize: 12 }}>មិនទាន់មាន Parts ប្រើ</div>}
          {job.partsUsed.map((p, i) => {
            const part = partsById[p.id];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 'var(--radius)', marginBottom: 6 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', minWidth: 90 }}>{part.sku}</div>
                <div style={{ flex: 1, fontSize: 13 }}>{part.name}</div>
                <div className="num" style={{ fontSize: 13 }}>x{p.qty}</div>
                <div className="num" style={{ fontWeight: 700, minWidth: 70, textAlign: 'right' }}><Money value={p.qty * p.price} currency={currency} /></div>
                <button className="btn btn-sm btn-ghost" onClick={() => removePart(i)}><Icon.X size={12} /></button>
              </div>
            );
          })}
          <AddPartRow jobId={id} setState={setState} toast={toast} />
        </div>

        {/* Notes */}
        {job.notes && (
          <>
            <div className="section-heading"><h2 style={{ fontSize: 14 }}>កំណត់ត្រា · NOTES</h2></div>
            <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 22, fontStyle: 'italic', color: 'var(--text-1)' }}>
              {job.notes}
            </div>
          </>
        )}

        {/* Totals */}
        <div style={{ background: 'var(--bg-2)', padding: 16, borderRadius: 'var(--radius)', marginBottom: 18 }}>
          <Row label="Labor" value={<Money value={laborTotal} currency={currency} />} />
          <Row label="Parts" value={<Money value={partsTotal} currency={currency} />} />
          <Row label="VAT 10%" value={<Money value={tax} currency={currency} />} />
          <div style={{ borderTop: '1px solid var(--border-1)', marginTop: 10, paddingTop: 10 }}>
            <Row label={<strong>សរុប</strong>} value={<strong className="num" style={{ fontSize: 18, color: 'var(--accent)' }}><Money value={total} currency={currency} /></strong>} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn"><Icon.Print size={14} /> Print Job</button>
          <button className="btn"><Icon.Pen size={14} /> Edit</button>
          <div style={{ flex: 1 }}></div>
          {job.status === "done" ? (
            <button className="btn btn-primary" onClick={() => onGenerateInvoice(job.id)}>
              <Icon.Doc size={14} /> Generate Invoice
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => updateStatus("done")}>
              <Icon.Check size={14} /> Mark Done
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

function AddPartRow({ jobId, setState, toast }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const filtered = parts.filter(p =>
    !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  function addPart(p) {
    setState(s => ({
      ...s,
      jobs: s.jobs.map(j => j.id === jobId ? { ...j, partsUsed: [...j.partsUsed, { id: p.id, qty: 1, price: p.price }] } : j),
      parts: s.parts.map(pp => pp.id === p.id ? { ...pp, stock: Math.max(0, pp.stock - 1) } : pp),
    }));
    toast(`+ ${p.name} · ស្តុកថយ 1`, "ok");
    setOpen(false);
    setQuery("");
  }

  if (!open) return (
    <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setOpen(true)}>
      <Icon.Plus size={12} /> បន្ថែម Part
    </button>
  );
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 10, marginTop: 6 }}>
      <input
        className="input"
        placeholder="ស្វែងរក Part តាមឈ្មោះ ឬ SKU..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => addPart(p)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border-0)', textAlign: 'left', cursor: 'pointer' }}
          >
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-2)', minWidth: 100 }}>{p.sku}</div>
            <div style={{ flex: 1, fontSize: 13 }}>{p.name}</div>
            <span className={"chip " + (p.stock <= p.reorder ? "chip-red" : "chip-green")} style={{ fontSize: 9, padding: '1px 6px' }}>
              {p.stock}
            </span>
            <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>${p.price}</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty" style={{ padding: 12, fontSize: 12 }}>គ្មានលទ្ធផល</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => { setOpen(false); setQuery(""); }}>បោះបង់</button>
      </div>
    </div>
  );
}

// ── New Job modal ──
function NewJobModal({ onClose, setState, toast }) {
  const [customerId, setCustomerId] = React.useState("CU-1001");
  const [vehicleId, setVehicleId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState("normal");
  const [techId, setTechId] = React.useState("T-01");
  const [promised, setPromised] = React.useState("17:00");
  const [notes, setNotes] = React.useState("");

  const customerVehicles = vehicles.filter(v => v.owner === customerId);
  React.useEffect(() => {
    if (customerVehicles.length && !customerVehicles.find(v => v.id === vehicleId)) {
      setVehicleId(customerVehicles[0].id);
    }
  }, [customerId]);

  function submit() {
    if (!title.trim()) { toast("សូមបញ្ចូលចំណងជើង", "error"); return; }
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    const tech = technicians.find(t => t.id === techId);
    const newId = "JOB-2406-" + String(89 + Math.floor(Math.random() * 30)).padStart(3, "0");
    const newJob = {
      id: newId,
      title,
      vehicle: vehicleId,
      customer: customerId,
      tech: tech.name,
      techInitials: tech.initials,
      techColor: tech.color,
      status: "waiting",
      priority,
      created: "2026-05-17 " + new Date().toTimeString().slice(0, 5),
      promised: "2026-05-17 " + promised,
      services: [],
      partsUsed: [],
      notes,
    };
    setState(s => ({ ...s, jobs: [newJob, ...s.jobs] }));
    toast(`បង្កើត Job ${newId} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title="Job Card ថ្មី · NEW JOB" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> បង្កើត Job</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field">
          <label>អតិថិជន · CUSTOMER</label>
          <select className="select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>រថយន្ត · VEHICLE</label>
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {customerVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {vehicleLabel(v)}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>ចំណងជើង Job · TITLE</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="ឧ. Oil change + brake inspection" />
        </div>
        <div className="field">
          <label>អាទិភាព · PRIORITY</label>
          <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="field">
          <label>ជាងជួសជុល · TECHNICIAN</label>
          <select className="select" value={techId} onChange={e => setTechId(e.target.value)}>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name} · {t.role} · {t.load}/{t.capacity}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>សន្យាបញ្ចប់ · PROMISED TIME</label>
          <input className="input" type="time" value={promised} onChange={e => setPromised(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>កំណត់ត្រា · NOTES</label>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ប្រាប់ពីបញ្ហារបស់រថយន្ត..." />
        </div>
      </div>
    </Modal>
  );
}

export { JobsScreen, JobDrawer, NewJobModal, KANBAN_COLS };
