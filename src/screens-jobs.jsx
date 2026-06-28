import React from 'react';
import GARAGE, { generateId } from './data';
import { auditEntry, pushAudit } from './lib/audit';
import { IfCan } from './lib/permissions';
import { Icon } from './icons';
import { Modal, Drawer } from './shell';
import { Money, Row, lookupCustomer, lookupVehicle, vehiclesByOwner, MISSING_C, MISSING_V, ConfirmModal } from './screens-core';
import { uploadJobPhoto, deleteJobPhoto, PHOTO_KINDS } from './lib/photos';
import { isConfigured } from './lib/supabase';
import { buildShareUrl, sendMessage, jobStatusMessage, ownerForwardMessage, isConfigured as telegramConfigured } from './lib/telegram';
// ─── Job Card Kanban + Job detail drawer + New Job modal ───
const G = GARAGE;
const { customers, vehicles, parts, jobs, invoices, quotations, bookings, technicians, members,
  customersById, vehiclesById, partsById, jobsById, vehicleLabel, statusColor, statusLabel, moneyUSD, moneyKHR } = G;
const KANBAN_COLS = [
  { id: "waiting", title: "Waiting · រង់ចាំ", dot: "gray" },
  { id: "diagnose", title: "Diagnose · ត្រួតពិនិត្យ", dot: "amber" },
  { id: "progress", title: "In Progress · កំពុងធ្វើ", dot: "blue" },
  { id: "parts", title: "Awaiting Parts · រង់ចាំ", dot: "orange" },
  { id: "qc", title: "QC · ត្រួតពិនិត្យចុង", dot: "teal" },
  { id: "done", title: "Done · បានបញ្ចប់", dot: "green" },
];

function JobsScreen({ state, setState, onOpenJob, onNewJob, currency, toast }) {
  const [todayOnly, setTodayOnly] = React.useState(false);
  const [highOnly, setHighOnly] = React.useState(false);
  const TODAY = new Date().toISOString().slice(0, 10);
  const allJobs = state.jobs.filter(j => {
    if (todayOnly && !((j.promised || "").startsWith(TODAY) || (j.created || "").startsWith(TODAY))) return false;
    if (highOnly && j.priority !== "high") return false;
    return true;
  });
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
          <button className={"btn" + (highOnly ? " btn-primary" : "")} onClick={() => setHighOnly(v => !v)}><Icon.Filter size={14} /> High Priority</button>
          <button className={"btn" + (todayOnly ? " btn-primary" : "")} onClick={() => setTodayOnly(v => !v)}><Icon.Cal size={14} /> Today</button>
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
              <JobCard key={j.id} job={j} state={state} onOpen={() => onOpenJob(j.id)} />
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

function JobCard({ job, state, onOpen }) {
  const v = lookupVehicle(job.vehicle, state) || MISSING_V;
  const c = lookupCustomer(job.customer, state) || MISSING_C;
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
          <span>{(c.name || "—").split(' ')[0]}</span>
        </div>
        <span>{(job.promised || "").split(' ')[1] || "—"}</span>
      </div>
    </div>
  );
}

function JobDrawer({ id, state, setState, onClose, onGenerateInvoice, onEdit, currency, toast, userId }) {
  const job = state.jobs.find(j => j.id === id);
  const [delConfirm, setDelConfirm] = React.useState(false);
  const [printOpen, setPrintOpen] = React.useState(false);
  if (!job) return null;
  const v = lookupVehicle(job.vehicle, state) || MISSING_V;
  const c = lookupCustomer(job.customer, state) || MISSING_C;

  const partsTotal = job.partsUsed.reduce((s, p) => s + p.qty * p.price, 0);
  const laborTotal = job.services.reduce((s, x) => s + x.total, 0);
  const subtotal = partsTotal + laborTotal;
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = subtotal + tax;

  function updateStatus(next) {
    const wasDone = job.status === "done";
    const isDone = next === "done";
    setState(s => {
      const updates = { ...s, jobs: s.jobs.map(j => j.id === id ? { ...j, status: next, ...(isDone && !wasDone ? { completed: new Date().toISOString().slice(0, 16).replace('T', ' ') } : {}) } : j) };
      // On transition to "done" → auto-set vehicle's nextService to +3 months
      if (isDone && !wasDone && job.vehicle) {
        const due = new Date();
        due.setMonth(due.getMonth() + 3);
        const nextService = due.toISOString().slice(0, 10);
        updates.vehicles = (s.vehicles || []).map(v => v.id === job.vehicle ? { ...v, nextService, lastService: new Date().toISOString().slice(0, 10) } : v);
      }
      return updates;
    });
    if (isDone && !wasDone) {
      toast(`Job ${id} → done · Next service ​បាន​កំណត់ +3 ​ខែ`, "ok");
    } else {
      toast(`Job ${id} → ${next}`, "info");
    }
  }

  function removePart(idx) {
    const removed = job.partsUsed[idx];
    setState(s => ({
      ...s,
      jobs: s.jobs.map(j => j.id === id ? { ...j, partsUsed: j.partsUsed.filter((_, i) => i !== idx) } : j),
      // Restore the removed quantity back to stock
      parts: removed ? s.parts.map(pp => pp.id === removed.id ? { ...pp, stock: (pp.stock || 0) + (removed.qty || 0) } : pp) : s.parts,
    }));
    if (removed) {
      const p = (state.parts || []).find(pp => pp.id === removed.id);
      toast(`ដក ${removed.qty || 0} × ${p?.name || removed.id} · ស្តុក​ត្រឡប់​វិញ`, "info");
    }
  }
  function removeService(idx) {
    setState(s => ({ ...s, jobs: s.jobs.map(j => j.id === id ? { ...j, services: j.services.filter((_, i) => i !== idx) } : j) }));
  }

  return (
    <Drawer onClose={onClose} width={680}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', letterSpacing: '0.1em' }}>{job.id}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{job.title}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>បង្កើត {job.created} · សន្យាបញ្ចប់ {job.promised}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <IfCan perm="delete"><button className="icon-btn" title="លុប Job" onClick={() => setDelConfirm(true)}><Icon.Trash size={14} /></button></IfCan>
            <button className="icon-btn" onClick={onClose}><Icon.X size={16} /></button>
          </div>
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
          <button className="btn btn-sm btn-ghost" onClick={() => onEdit(job.id)}><Icon.Pen size={12} /></button>
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
        <div className="section-heading">
          <h2 style={{ fontSize: 14 }}>សេវាកម្ម · SERVICES</h2>
          <span className="sub">{job.services.length} ធាតុ</span>
        </div>
        <div style={{ marginBottom: 18 }}>
          {job.services.length === 0 && <div className="empty" style={{ padding: 16, fontSize: 12 }}>មិនទាន់មាន​សេវាកម្ម</div>}
          {job.services.length > 0 && (
            <table className="table">
              <thead>
                <tr><th>បរិយាយ</th><th className="num">ម៉ោង</th><th className="num">តម្លៃ</th><th className="num">សរុប</th><th></th></tr>
              </thead>
              <tbody>
                {job.services.map((s, i) => (
                  <tr key={i}>
                    <td>{s.name}</td>
                    <td className="num">{s.hours}</td>
                    <td className="num"><Money value={s.rate} currency={currency} /></td>
                    <td className="num" style={{ fontWeight: 700 }}><Money value={s.total} currency={currency} /></td>
                    <td><button className="btn btn-sm btn-ghost" onClick={() => removeService(i)}><Icon.X size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <AddServiceRow jobId={id} setState={setState} toast={toast} />
        </div>

        {/* Parts */}
        <div className="section-heading">
          <h2 style={{ fontSize: 14 }}>Parts ប្រើ · PARTS USED</h2>
          <span className="sub">{job.partsUsed.length} items</span>
        </div>
        <div style={{ marginBottom: 18 }}>
          {job.partsUsed.length === 0 && <div className="empty" style={{ padding: 20, fontSize: 12 }}>មិនទាន់មាន Parts ប្រើ</div>}
          {job.partsUsed.map((p, i) => {
            const part = (state.parts || parts).find(x => x.id === p.id) || partsById[p.id] || { sku: p.id, name: "(unknown part)" };
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
          <AddPartRow jobId={id} state={state} setState={setState} toast={toast} />
        </div>

        {/* Photos */}
        <JobPhotosSection job={job} userId={userId} setState={setState} toast={toast} />

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
            <Row label={<strong>សរុប</strong>} value={<strong className="num" style={{ fontSize: 18, color: 'var(--accent-text)' }}><Money value={total} currency={currency} /></strong>} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setPrintOpen(true)}><Icon.Print size={14} /> Print / PDF</button>
          <button className="btn" onClick={() => onEdit(job.id)}><Icon.Pen size={14} /> Edit</button>
          <button
            className="btn"
            title="ផ្ញើ​សារ​ទៅ​អតិថិជន​តាម Telegram"
            onClick={async () => {
              const garageName = (state.config && state.config.garageName) || "Garage";
              const msg = jobStatusMessage(job, c, v, garageName);
              const tg = state.config && state.config.telegram;
              // Best case: customer has chat ID → bot sends directly
              if (telegramConfigured(state.config) && c.telegramChatId) {
                const res = await sendMessage(tg.botToken, c.telegramChatId, msg);
                if (res.ok) toast(`បាន​ផ្ញើ​សារ​ទៅ ${c.name}`, "ok");
                else toast(`ផ្ញើ​បរាជ័យ · ${res.description}`, "error");
              }
              // Bot connected but customer has no chat ID → send to owner with forward header
              else if (telegramConfigured(state.config)) {
                const forwardMsg = ownerForwardMessage(c.name, msg);
                const res = await sendMessage(tg.botToken, tg.ownerChatId, forwardMsg);
                if (res.ok) toast(`បាន​ផ្ញើ​ទៅ Telegram របស់​អ្នក · forward ​ទៅ ${c.name}`, "ok");
                else toast(`ផ្ញើ​បរាជ័យ · ${res.description}`, "error");
              }
              // No bot configured → t.me/share URL
              else {
                window.open(buildShareUrl(msg), "_blank");
              }
            }}
          ><Icon.Send size={14} /> ផ្ញើ Telegram</button>
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
      {delConfirm && <ConfirmModal title="លុប Job?" message={`លុប ${job.id} · ${job.title} ឬ​ទេ?`} danger onClose={() => setDelConfirm(false)} onConfirm={() => { setState(s => ({ ...s, jobs: s.jobs.filter(j => j.id !== job.id), auditLog: pushAudit(s, auditEntry("delete", "job", job.id, `លុប Job ${job.id} (${job.title})`, job)) })); toast(`លុប ${job.id} ជោគជ័យ`, "ok"); setDelConfirm(false); onClose(); }} />}
      {printOpen && <JobPrintModal job={job} state={state} currency={currency} onClose={() => setPrintOpen(false)} toast={toast} />}
    </Drawer>
  );
}

// ── Job Photos · upload, grid, lightbox ──
function JobPhotosSection({ job, userId, setState, toast }) {
  const photos = job.photos || [];
  const [uploading, setUploading] = React.useState(false);
  const [lightboxIdx, setLightboxIdx] = React.useState(null);
  const [kind, setKind] = React.useState('before');
  const fileRef = React.useRef(null);

  const canUpload = isConfigured && !!userId;

  async function onFilesPicked(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (!canUpload) {
      toast("ត្រូវ Sign in ដើម្បី upload រូបភាព", "error");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const uploaded = [];
    for (const f of files) {
      const res = await uploadJobPhoto(userId, job.id, f, kind);
      if (res.ok) {
        uploaded.push(res.photo);
      } else {
        toast(`Upload បរាជ័យ · ${res.reason}`, "error");
      }
    }
    if (uploaded.length > 0) {
      setState(s => ({
        ...s,
        jobs: s.jobs.map(j =>
          j.id === job.id ? { ...j, photos: [...(j.photos || []), ...uploaded] } : j
        ),
      }));
      toast(`បាន​ដាក់ ${uploaded.length} រូប`, "ok");
    }
    setUploading(false);
    e.target.value = "";
  }

  async function onDelete(photo) {
    if (!confirm(`លុប​រូបភាព​នេះ​មែន​ទេ?`)) return;
    const res = await deleteJobPhoto(photo.path);
    if (!res.ok && res.reason !== 'not-configured') {
      toast(`លុប​បរាជ័យ · ${res.reason}`, "error");
      return;
    }
    setState(s => ({
      ...s,
      jobs: s.jobs.map(j =>
        j.id === job.id ? { ...j, photos: (j.photos || []).filter(p => p.id !== photo.id) } : j
      ),
    }));
    toast("បាន​លុប​រូបភាព", "ok");
    setLightboxIdx(null);
  }

  return (
    <>
      <div className="section-heading">
        <h2 style={{ fontSize: 14 }}>រូបភាព · PHOTOS</h2>
        <span className="sub">{photos.length} រូប</span>
      </div>

      <div style={{ marginBottom: 22 }}>
        {/* Upload bar */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
          {PHOTO_KINDS.map(k => (
            <button
              key={k.id}
              className={"btn btn-sm" + (kind === k.id ? " btn-primary" : "")}
              onClick={() => setKind(k.id)}
            >
              {k.labelKm}
            </button>
          ))}
          <div style={{ flex: 1 }}></div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            style={{ display: 'none' }}
            onChange={onFilesPicked}
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !canUpload}
            title={canUpload ? "ដាក់​រូបភាព​ថ្មី" : "Sign in ដើម្បី upload"}
          >
            <Icon.Camera size={14} /> {uploading ? "កំពុង​ផ្ទុក..." : "ដាក់​រូបភាព"}
          </button>
        </div>

        {/* Thumbnail grid */}
        {photos.length === 0 ? (
          <div className="empty" style={{ padding: 20, fontSize: 12 }}>
            មិន​ទាន់​មាន​រូបភាព​ទេ {canUpload ? "· ចុច \"ដាក់រូបភាព\" ខាងលើ" : "· Sign in ដើម្បី upload"}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {photos.map((p, i) => {
              const labelKm = (PHOTO_KINDS.find(k => k.id === p.kind) || PHOTO_KINDS[2]).labelKm;
              return (
                <button
                  key={p.id}
                  onClick={() => setLightboxIdx(i)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    border: '1px solid var(--border-1)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'var(--bg-2)',
                  }}
                  title={labelKm}
                >
                  <img
                    src={p.url}
                    alt={labelKm}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <span
                    className="mono"
                    style={{
                      position: 'absolute',
                      left: 4,
                      bottom: 4,
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      padding: '2px 5px',
                      background: 'rgba(10, 13, 18, 0.78)',
                      color: '#fff',
                      borderRadius: 3,
                    }}
                  >
                    {labelKm}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <PhotoLightbox
          photo={photos[lightboxIdx]}
          index={lightboxIdx}
          total={photos.length}
          onPrev={() => setLightboxIdx(i => (i - 1 + photos.length) % photos.length)}
          onNext={() => setLightboxIdx(i => (i + 1) % photos.length)}
          onClose={() => setLightboxIdx(null)}
          onDelete={() => onDelete(photos[lightboxIdx])}
        />
      )}
    </>
  );
}

function PhotoLightbox({ photo, index, total, onPrev, onNext, onClose, onDelete }) {
  React.useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onPrev, onNext]);
  const labelKm = (PHOTO_KINDS.find(k => k.id === photo.kind) || PHOTO_KINDS[2]).labelKm;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'grid', placeItems: 'center', padding: 24 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <img src={photo.url} alt={labelKm} style={{ maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          <span style={{ padding: '4px 10px', background: 'var(--accent)', color: '#0b0b0b', borderRadius: 4, fontWeight: 700 }}>{labelKm}</span>
          <span>{index + 1} / {total}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(photo.uploadedAt).toLocaleString()}</span>
        </div>
        <button
          className="icon-btn"
          onClick={onClose}
          style={{ position: 'absolute', top: -8, right: -8, background: '#fff', color: '#000' }}
          title="បិទ"
        >
          <Icon.X size={16} />
        </button>
        {total > 1 && (
          <>
            <button onClick={onPrev} className="icon-btn" style={{ position: 'absolute', left: -52, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', color: '#000' }} title="មុន"><Icon.Left size={18} /></button>
            <button onClick={onNext} className="icon-btn" style={{ position: 'absolute', right: -52, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', color: '#000' }} title="បន្ទាប់"><Icon.Right size={18} /></button>
          </>
        )}
        <button
          className="btn btn-sm"
          onClick={onDelete}
          style={{ position: 'absolute', bottom: -50, background: 'var(--danger)', color: '#fff', border: 'none' }}
        >
          <Icon.Trash size={12} /> លុប​រូបភាព
        </button>
      </div>
    </div>
  );
}

// ── Job Print Modal (receipt-style + PDF) ──
function JobPrintModal({ job, state, currency, onClose, toast }) {
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const v = lookupVehicle(job.vehicle, state) || MISSING_V;
  const c = lookupCustomer(job.customer, state) || MISSING_C;

  const partsTotal = job.partsUsed.reduce((s, p) => s + p.qty * p.price, 0);
  const laborTotal = job.services.reduce((s, x) => s + x.total, 0);
  const subtotal = partsTotal + laborTotal;
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  async function downloadPdf() {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { downloadElementAsPdf } = await import('./lib/pdf');
      await downloadElementAsPdf(sheetRef.current, `${job.id}.pdf`);
      toast(`បាន​ទាញ​យក ${job.id}.pdf`, "ok");
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal wide title={"Job Card · " + job.id} onClose={onClose}
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
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>JOB CARD</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{job.id}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Status: <strong>{(job.status || "—").toUpperCase()}</strong></div>
            {job.priority === "high" && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, fontWeight: 700 }}>★ HIGH PRIORITY</div>}
          </div>
        </div>

        {/* Title + Dates */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{job.title}</div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#666' }}>
            <div><strong style={{ color: '#444' }}>Created:</strong> {job.created}</div>
            <div><strong style={{ color: '#444' }}>Promised:</strong> {job.promised}</div>
          </div>
        </div>

        {/* Customer + Vehicle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>CUSTOMER</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{c.address}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{c.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>VEHICLE</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{v.plate} · {vehicleLabel(v)}</div>
            <div style={{ fontSize: 12, color: '#444' }}>VIN: {v.vin}</div>
            <div style={{ fontSize: 12, color: '#444' }}>Mileage: {(v.mileage || 0).toLocaleString()} km</div>
          </div>
        </div>

        {/* Assigned Tech */}
        <div style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 6, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888' }}>ASSIGNED TECH</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{job.tech}</div>
        </div>

        {/* Services */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>SERVICES · LABOR</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>DESCRIPTION</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>HRS</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>RATE</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {job.services.length === 0 && (
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td colSpan={4} style={{ padding: '10px 12px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>មិនទាន់មាន​សេវាកម្ម</td>
              </tr>
            )}
            {job.services.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 10px' }}>{s.name}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.hours}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(s.rate)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Parts */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>PARTS USED</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>SKU</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>NAME</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>PRICE</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {job.partsUsed.length === 0 && (
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td colSpan={5} style={{ padding: '10px 12px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>មិនទាន់មាន Parts ប្រើ</td>
              </tr>
            )}
            {job.partsUsed.map((p, i) => {
              const part = (state.parts || parts).find(x => x.id === p.id) || partsById[p.id] || { sku: p.id, name: "(unknown)" };
              return (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{part.sku}</td>
                  <td style={{ padding: '8px 10px' }}>{part.name}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{p.qty}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(p.price || 0)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD((p.qty || 0) * (p.price || 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <table style={{ minWidth: 280, fontSize: 12 }}>
            <tbody>
              <tr><td style={{ padding: 4, color: '#666' }}>Labor</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(laborTotal)}</td></tr>
              <tr><td style={{ padding: 4, color: '#666' }}>Parts</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(partsTotal)}</td></tr>
              <tr><td style={{ padding: 4, color: '#666' }}>Subtotal</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(subtotal)}</td></tr>
              <tr><td style={{ padding: 4, color: '#666' }}>VAT 10%</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(tax)}</td></tr>
              <tr style={{ borderTop: '2px solid #0a0d12' }}>
                <td style={{ padding: '8px 4px 4px', fontWeight: 800 }}>TOTAL</td>
                <td style={{ padding: '8px 4px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16 }}>{moneyUSD(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {job.notes && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>NOTES</div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{job.notes}</div>
          </div>
        )}

        {/* Signature */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 32, paddingTop: 18, borderTop: '1px solid #eee' }}>
          <div>
            <div style={{ borderBottom: '1px solid #0a0d12', height: 40, marginBottom: 4 }}></div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888' }}>CUSTOMER SIGNATURE</div>
          </div>
          <div>
            <div style={{ borderBottom: '1px solid #0a0d12', height: 40, marginBottom: 4 }}></div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888' }}>TECHNICIAN SIGNATURE</div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#888', textAlign: 'center', letterSpacing: '0.04em', marginTop: 18 }}>
          THANK YOU · សូមអរគុណចំពោះការគាំទ្ររបស់លោកអ្នក
        </div>
      </div>
    </Modal>
  );
}

function AddPartRow({ jobId, state, setState, toast }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [qty, setQty] = React.useState(1);
  const sourceParts = (state && state.parts) || parts;
  const filtered = sourceParts.filter(p =>
    !query || (p.name || "").toLowerCase().includes(query.toLowerCase()) || (p.sku || "").toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  function addPart(p) {
    const n = Math.max(1, Math.floor(+qty || 1));
    const avail = p.stock || 0;
    setState(s => ({
      ...s,
      jobs: s.jobs.map(j => {
        if (j.id !== jobId) return j;
        const existing = j.partsUsed.find(x => x.id === p.id);
        // Merge into existing row if same part already used
        const partsUsed = existing
          ? j.partsUsed.map(x => x.id === p.id ? { ...x, qty: (x.qty || 0) + n } : x)
          : [...j.partsUsed, { id: p.id, qty: n, price: p.price || 0 }];
        return { ...j, partsUsed };
      }),
      parts: s.parts.map(pp => pp.id === p.id ? { ...pp, stock: Math.max(0, (pp.stock || 0) - n) } : pp),
    }));
    if (n > avail) {
      toast(`+ ${n} × ${p.name} · ⚠️ ស្តុក​មាន​តែ ${avail} (ស្តុក = 0)`, "info");
    } else {
      toast(`+ ${n} × ${p.name} · ស្តុក​ថយ ${n}`, "ok");
    }
    setOpen(false);
    setQuery("");
    setQty(1);
  }

  if (!open) return (
    <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setOpen(true)}>
      <Icon.Plus size={12} /> បន្ថែម Part
    </button>
  );
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 10, marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          placeholder="ស្វែងរក Part តាមឈ្មោះ ឬ SKU..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          style={{ flex: 1 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="ចំនួន">
          <span className="muted" style={{ fontSize: 11 }}>Qty</span>
          <input className="input num" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={{ width: 64, textAlign: 'center', padding: '6px 4px' }} />
        </div>
      </div>
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
            <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)' }}>${p.price}</span>
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

// ── Add Service Row ──
function AddServiceRow({ jobId, setState, toast }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [hours, setHours] = React.useState(1);
  const [rate, setRate] = React.useState(15);

  const PRESETS = [
    { name: "Oil change + filter", hours: 0.5, rate: 20 },
    { name: "Brake service · front", hours: 1.5, rate: 25 },
    { name: "Tire rotation", hours: 0.5, rate: 15 },
    { name: "Engine diagnostics", hours: 1, rate: 30 },
    { name: "AC service", hours: 1, rate: 25 },
    { name: "Major service 30K/60K", hours: 3, rate: 25 },
  ];

  function addService() {
    if (!name.trim()) { toast("បំពេញឈ្មោះសេវាកម្ម", "error"); return; }
    const total = +(hours * rate).toFixed(2);
    const svc = { name: name.trim(), hours: +hours, rate: +rate, total };
    setState(s => ({ ...s, jobs: s.jobs.map(j => j.id === jobId ? { ...j, services: [...j.services, svc] } : j) }));
    toast(`+ ${svc.name} · $${total}`, "ok");
    setOpen(false); setName(""); setHours(1); setRate(15);
  }
  function pickPreset(p) {
    setName(p.name); setHours(p.hours); setRate(p.rate);
  }

  if (!open) return (
    <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setOpen(true)}>
      <Icon.Plus size={12} /> បន្ថែម​សេវាកម្ម
    </button>
  );
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: 12, marginTop: 6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {PRESETS.map((p, i) => (
          <button key={i} className="btn btn-sm btn-ghost" style={{ fontSize: 11 }} onClick={() => pickPreset(p)}>
            {p.name}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 8 }}>
        <input className="input" placeholder="បរិយាយសេវាកម្ម..." value={name} onChange={e => setName(e.target.value)} autoFocus />
        <input className="input" type="number" step="0.5" value={hours} onChange={e => setHours(e.target.value)} placeholder="hrs" title="ម៉ោង" />
        <input className="input" type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="$/hr" title="តម្លៃ​ក្នុង​មួយ​ម៉ោង" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span className="mono muted" style={{ fontSize: 11 }}>សរុប: ${(hours * rate).toFixed(2)}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => { setOpen(false); setName(""); }}>បោះបង់</button>
          <button className="btn btn-sm btn-primary" onClick={addService}><Icon.Plus size={12} /> បន្ថែម</button>
        </div>
      </div>
    </div>
  );
}

// ── New Job modal ──
function NewJobModal({ onClose, setState, toast, state, prefillCustomer }) {
  const allCustomers = (state && state.customers) || customers;
  const allVehicles = (state && state.vehicles) || vehicles;
  const initialCustomer = prefillCustomer || (allCustomers[0] && allCustomers[0].id) || "CU-1001";
  const [customerId, setCustomerId] = React.useState(initialCustomer);
  const [vehicleId, setVehicleId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState("normal");
  const [techId, setTechId] = React.useState("T-01");
  const [promised, setPromised] = React.useState("17:00");
  const [notes, setNotes] = React.useState("");

  const customerVehicles = allVehicles.filter(v => v.owner === customerId);
  React.useEffect(() => {
    if (customerVehicles.length && !customerVehicles.find(v => v.id === vehicleId)) {
      setVehicleId(customerVehicles[0].id);
    } else if (!customerVehicles.length) {
      setVehicleId("");
    }
  }, [customerId, allVehicles.length]);

  function submit() {
    if (!title.trim()) { toast("សូមបញ្ចូលចំណងជើង", "error"); return; }
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    const tech = technicians.find(t => t.id === techId);
    const today = new Date().toISOString().slice(0, 10);
    const newId = generateId("JOB", state?.jobs || []);
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
      created: today + " " + new Date().toTimeString().slice(0, 5),
      promised: today + " " + promised,
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
            {allCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>រថយន្ត · VEHICLE</label>
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {customerVehicles.length === 0 && <option value="">— គ្មានរថយន្ត —</option>}
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

function EditJobModal({ id, state, setState, onClose, toast }) {
  const job = state.jobs.find(j => j.id === id);
  const allCustomers = (state && state.customers) || customers;
  const allVehicles = (state && state.vehicles) || vehicles;
  const [customerId, setCustomerId] = React.useState(job ? job.customer : "");
  const [vehicleId, setVehicleId] = React.useState(job ? job.vehicle : "");
  const [title, setTitle] = React.useState(job ? job.title : "");
  const [priority, setPriority] = React.useState(job ? job.priority : "normal");
  const [techId, setTechId] = React.useState(() => {
    const t = technicians.find(t => t.name === (job && job.tech));
    return t ? t.id : (technicians[0] && technicians[0].id);
  });
  const [status, setStatus] = React.useState(job ? job.status : "waiting");
  const [promised, setPromised] = React.useState(job && job.promised ? job.promised.split(' ')[1] || "17:00" : "17:00");
  const [notes, setNotes] = React.useState(job ? job.notes : "");
  const custVehicles = allVehicles.filter(v => v.owner === customerId);
  React.useEffect(() => {
    if (!custVehicles.find(v => v.id === vehicleId)) {
      setVehicleId(custVehicles[0] ? custVehicles[0].id : "");
    }
  }, [customerId]);

  if (!job) return null;

  function submit() {
    if (!title.trim()) { toast("សូមបញ្ចូលចំណងជើង", "error"); return; }
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    const tech = technicians.find(t => t.id === techId) || { name: job.tech, initials: job.techInitials, color: job.techColor };
    const datePart = (job.promised && job.promised.split(' ')[0]) || "2026-05-17";
    setState(s => ({
      ...s,
      jobs: s.jobs.map(j => j.id === id ? {
        ...j, title: title.trim(), priority, status,
        customer: customerId, vehicle: vehicleId,
        tech: tech.name, techInitials: tech.initials, techColor: tech.color,
        promised: datePart + " " + promised, notes,
      } : j),
    }));
    toast(`កែ Job ${id} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title={"កែ Job · EDIT " + id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>ចំណងជើង Job · TITLE</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>អតិថិជន · CUSTOMER</label>
          <select className="select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {allCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>រថយន្ត · VEHICLE</label>
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {custVehicles.length === 0 && <option value="">— គ្មានរថយន្ត —</option>}
            {custVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {vehicleLabel(v)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>ជាងជួសជុល · TECHNICIAN</label>
          <select className="select" value={techId} onChange={e => setTechId(e.target.value)}>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name} · {t.role}</option>)}
          </select>
        </div>
        <div className="field">
          <label>ស្ថានភាព · STATUS</label>
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            {KANBAN_COLS.map(c => <option key={c.id} value={c.id}>{c.title.split(' · ')[0]}</option>)}
          </select>
        </div>
        <div className="field">
          <label>អាទិភាព · PRIORITY</label>
          <select className="select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="field">
          <label>សន្យាបញ្ចប់ · PROMISED</label>
          <input className="input" type="time" value={promised} onChange={e => setPromised(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>កំណត់ត្រា · NOTES</label>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

export { JobsScreen, JobDrawer, NewJobModal, EditJobModal, KANBAN_COLS };
