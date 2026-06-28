import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal } from './shell';
import { Money, Row, exportCsv, lookupCustomer, lookupVehicle, MISSING_C, MISSING_V, ConfirmModal } from './screens-core';
import { buildShareUrl, invoiceShareMessage, quoteShareMessage, sendMessage, ownerForwardMessage, reorderMessage, isConfigured as telegramConfigured } from './lib/telegram';
import { generateId } from './data';
import { auditEntry, pushAudit } from './lib/audit';
import { IfCan } from './lib/permissions';
// ─── Parts, Quotation, Invoices screens ───
const G = GARAGE;
const { customers, vehicles, parts, jobs, invoices, quotations, bookings, technicians, members,
  customersById, vehiclesById, partsById, jobsById, vehicleLabel, statusColor, statusLabel, moneyUSD, moneyKHR } = G;

// ════════════════════════════════════════════════════════════
// PARTS INVENTORY
// ════════════════════════════════════════════════════════════
function PartsScreen({ state, setState, currency, toast, onNewPart }) {
  const [tab, setTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [editPart, setEditPart] = React.useState(null);
  const [delPart, setDelPart] = React.useState(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reorderOpen, setReorderOpen] = React.useState(null);
  const [supplierMgrOpen, setSupplierMgrOpen] = React.useState(false);
  const allParts = state.parts;
  const supplierList = state.suppliers || [];
  const filtered = allParts.filter(p => {
    if (tab === "low" && p.stock > p.reorder) return false;
    if (tab === "out" && p.stock > 0) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(p.name || "").toLowerCase().includes(s) && !(p.sku || "").toLowerCase().includes(s) && !(p.nameEn || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });
  const totalValue = allParts.reduce((s, p) => s + (p.stock || 0) * (p.cost || 0), 0);
  const lowCount = allParts.filter(p => (p.stock || 0) <= (p.reorder || 0)).length;
  const outCount = allParts.filter(p => (p.stock || 0) === 0).length;
  const suppliers = [...new Set(allParts.map(p => p.supplier || "—"))];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Parts Inventory</h1>
          <div className="page-sub">ស្តុក Parts · {allParts.length} SKUs · {suppliers.length} អ្នកផ្គត់ផ្គង់</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => { exportCsv("parts.csv", allParts.map(p => ({ sku: p.sku, name: p.name, nameEn: p.nameEn, category: p.category, supplier: p.supplier, location: p.location, stock: p.stock, reorder: p.reorder, cost: p.cost, price: p.price }))); toast(`នាំចេញ ${allParts.length} Parts (CSV)`, "ok"); }}><Icon.Download size={14} /> Export</button>
          <button className="btn" onClick={() => setReportOpen(true)}><Icon.Doc size={14} /> Stock Report</button>
          <button className="btn" onClick={() => toast("Barcode scanner (ឆាប់ៗ)", "info")}><Icon.Tag size={14} /> Barcode</button>
          <button className="btn btn-primary" onClick={onNewPart}><Icon.Plus size={14} /> Part ថ្មី</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">SKU សកម្ម</div>
          <div className="kpi-value num">{allParts.length}</div>
          <div className="kpi-delta neutral">{suppliers.length} suppliers</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">តម្លៃស្តុក</div>
          <div className="kpi-value num"><Money value={totalValue} currency={currency} /></div>
          <div className="kpi-delta">▲ 4.2% ខែនេះ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Low Stock</div>
          <div className="kpi-value num" style={{ color: 'var(--warn)' }}>{lowCount}</div>
          <div className="kpi-delta down">ត្រូវការបញ្ជាទិញ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">អស់ស្តុក</div>
          <div className="kpi-value num" style={{ color: 'var(--danger)' }}>{outCount}</div>
          <div className="kpi-delta neutral">SKUs at zero</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {[
          { id: "all", label: "ទាំងអស់", n: allParts.length },
          { id: "low", label: "Low Stock", n: lowCount },
          { id: "out", label: "អស់ស្តុក", n: outCount },
        ].map(t => (
          <button key={t.id} className={"btn btn-sm" + (tab === t.id ? " btn-primary" : "")} onClick={() => setTab(t.id)}>
            {t.label} <span className="num" style={{ opacity: 0.7 }}>{t.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }}></div>
        <div className="search-input" style={{ maxWidth: 320 }}>
          <Icon.Search size={14} />
          <input placeholder="ស្វែងរក SKU, ឈ្មោះ..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>ឈ្មោះ</th>
              <th>ប្រភេទ</th>
              <th>អ្នកផ្គត់ផ្គង់</th>
              <th>ទីតាំង</th>
              <th>ស្តុក / Reorder</th>
              <th className="num">ដើម</th>
              <th className="num">លក់</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const ratio = p.stock / (p.reorder * 2);
              const lowState = p.stock === 0 ? "red" : p.stock <= p.reorder ? "orange" : "green";
              return (
                <tr key={p.id}>
                  <td className="mono" style={{ color: 'var(--text-0)', fontWeight: 600 }}>{p.sku}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{p.nameEn}</div>
                  </td>
                  <td><span className="chip chip-gray">{p.category}</span></td>
                  <td className="muted">{p.supplier}</td>
                  <td className="mono">{p.location}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 60 }}>
                        <div className="num" style={{ fontWeight: 700, color: lowState === "red" ? 'var(--danger)' : lowState === "orange" ? 'var(--warn)' : 'var(--text-0)' }}>
                          {p.stock}
                        </div>
                        <div className="muted" style={{ fontSize: 10 }}>min {p.reorder}</div>
                      </div>
                      <div className="bar" style={{ flex: 1, minWidth: 80 }}>
                        <div className={"bar-fill " + (lowState === "red" ? "red" : lowState === "orange" ? "orange" : "green")} style={{ width: Math.min(100, ratio * 100) + "%" }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="num muted">${(p.cost || 0).toFixed(2)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>${(p.price || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost" title="Reorder · បញ្ជា​ទិញ​ស្តុក" onClick={() => setReorderOpen(p)}>
                        <Icon.Plus size={14} />
                      </button>
                      <button className="btn btn-sm btn-ghost" title="កែ" onClick={() => setEditPart(p)}>
                        <Icon.Pen size={14} />
                      </button>
                      <IfCan perm="delete"><button className="btn btn-sm btn-ghost" title="លុប" onClick={() => setDelPart(p)}>
                        <Icon.X size={14} />
                      </button></IfCan>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Suppliers */}
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>អ្នកផ្គត់ផ្គង់ · SUPPLIERS</h2>
        {setState && <IfCan perm="inventory"><button className="btn btn-sm" onClick={() => setSupplierMgrOpen(true)}><Icon.Plus size={12} /> គ្រប់គ្រង​អ្នកផ្គត់ផ្គង់</button></IfCan>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {supplierList.length === 0 && suppliers.filter(s => s !== "—").length === 0 && (
          <div className="muted" style={{ fontSize: 13 }}>មិន​ទាន់​មាន​អ្នកផ្គត់ផ្គង់ — ចុច "គ្រប់គ្រង​អ្នកផ្គត់ផ្គង់" ដើម្បី​បន្ថែម។</div>
        )}
        {/* Managed suppliers (with contact) */}
        {supplierList.map(sup => {
          const sParts = allParts.filter(p => (p.supplier || "") === sup.name);
          const sLow = sParts.filter(p => p.stock <= p.reorder).length;
          return (
            <div key={sup.id} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{sup.name}</div>
              {sup.contact && <div className="muted" style={{ fontSize: 11 }}>{sup.contact}</div>}
              {sup.phone && <div className="mono muted" style={{ fontSize: 11 }}>{sup.phone}</div>}
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{sParts.length} SKUs{sup.telegramChatId ? " · 📱 Telegram" : ""}</div>
              {sLow > 0 && <div style={{ marginTop: 8 }}><span className="chip chip-orange">{sLow} LOW STOCK</span></div>}
            </div>
          );
        })}
        {/* Unmanaged supplier names found on parts (legacy / quick entry) */}
        {suppliers.filter(s => s !== "—" && !supplierList.some(x => x.name === s)).map(s => {
          const sParts = allParts.filter(p => p.supplier === s);
          const sLow = sParts.filter(p => p.stock <= p.reorder).length;
          return (
            <div key={s} className="card" style={{ padding: 16, opacity: 0.85 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s} <span className="chip chip-gray" style={{ fontSize: 9 }}>មិន​ទាន់​រក្សាទុក</span></div>
              <div className="muted" style={{ fontSize: 12 }}>{sParts.length} SKUs</div>
              {sLow > 0 && <div style={{ marginTop: 8 }}><span className="chip chip-orange">{sLow} LOW STOCK</span></div>}
            </div>
          );
        })}
      </div>
      {editPart && <EditPartModal part={editPart} state={state} setState={setState} onClose={() => setEditPart(null)} toast={toast} />}
      {delPart && <ConfirmModal title="លុប Part?" message={`លុប ${delPart.name} (${delPart.sku}) ឬ​ទេ?`} danger onClose={() => setDelPart(null)} onConfirm={() => { setState(s => ({ ...s, parts: s.parts.filter(x => x.id !== delPart.id), auditLog: pushAudit(s, auditEntry("delete", "part", delPart.id, `លុប Part ${delPart.name} (${delPart.sku})`, delPart)) })); toast(`លុប ${delPart.name} ជោគជ័យ`, "ok"); setDelPart(null); }} />}
      {reportOpen && <PartsReportModal parts={allParts} currency={currency} onClose={() => setReportOpen(false)} toast={toast} />}
      {reorderOpen && <ReorderModal part={reorderOpen} state={state} setState={setState} onClose={() => setReorderOpen(null)} toast={toast} />}
      {supplierMgrOpen && <SupplierManagerModal state={state} setState={setState} onClose={() => setSupplierMgrOpen(false)} toast={toast} />}
    </div>
  );
}

// ── Supplier / Vendor Manager ──
function SupplierManagerModal({ state, setState, onClose, toast }) {
  const suppliers = state.suppliers || [];
  const [edit, setEdit] = React.useState(null); // null | "new" | supplier
  const [delSup, setDelSup] = React.useState(null);

  return (
    <Modal wide title="អ្នកផ្គត់ផ្គង់ · SUPPLIERS / VENDORS" onClose={onClose}
      footer={<button className="btn" onClick={onClose}>បិទ</button>}>
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-sm btn-primary" onClick={() => setEdit("new")}><Icon.Plus size={12} /> បន្ថែម​អ្នកផ្គត់ផ្គង់</button>
      </div>
      {suppliers.length === 0 ? (
        <p className="muted">មិន​ទាន់​មាន​អ្នកផ្គត់ផ្គង់​នៅ​ឡើយ។</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                <th style={{ padding: "6px 8px" }}>ឈ្មោះ</th>
                <th style={{ padding: "6px 8px" }}>ទំនាក់ទំនង</th>
                <th style={{ padding: "6px 8px" }}>ទូរស័ព្ទ</th>
                <th style={{ padding: "6px 8px" }}>Telegram</th>
                <th style={{ padding: "6px 8px" }}>SKUs</th>
                <th style={{ padding: "6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(sup => {
                const n = (state.parts || []).filter(p => (p.supplier || "") === sup.name).length;
                return (
                  <tr key={sup.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{sup.name}</td>
                    <td style={{ padding: "6px 8px" }}>{sup.contact || "—"}</td>
                    <td style={{ padding: "6px 8px" }} className="mono">{sup.phone || "—"}</td>
                    <td style={{ padding: "6px 8px" }}>{sup.telegramChatId ? "📱" : "—"}</td>
                    <td style={{ padding: "6px 8px" }} className="mono">{n}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="btn btn-sm btn-ghost" title="កែ" onClick={() => setEdit(sup)}><Icon.Pen size={12} /></button>
                      <IfCan perm="delete"><button className="btn btn-sm btn-ghost" title="លុប" onClick={() => setDelSup(sup)}><Icon.X size={12} /></button></IfCan>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {edit && <SupplierEditModal supplier={edit === "new" ? null : edit} state={state} setState={setState} toast={toast} onClose={() => setEdit(null)} />}
      {delSup && <ConfirmModal title="លុបអ្នកផ្គត់ផ្គង់?" message={`លុប ${delSup.name} ឬ​ទេ? (Parts នឹង​នៅ​ដដែល​តែ​បាត់​ការ​ភ្ជាប់)`} danger onClose={() => setDelSup(null)}
        onConfirm={() => { setState(s => ({ ...s, suppliers: (s.suppliers || []).filter(x => x.id !== delSup.id), auditLog: pushAudit(s, auditEntry("delete", "supplier", delSup.id, `លុប អ្នកផ្គត់ផ្គង់ ${delSup.name}`, delSup)) })); toast(`លុប ${delSup.name} ជោគជ័យ`, "ok"); setDelSup(null); }} />}
    </Modal>
  );
}

function SupplierEditModal({ supplier, state, setState, toast, onClose }) {
  const [name, setName] = React.useState(supplier ? supplier.name : "");
  const [contact, setContact] = React.useState(supplier ? (supplier.contact || "") : "");
  const [phone, setPhone] = React.useState(supplier ? (supplier.phone || "") : "");
  const [telegramChatId, setTelegramChatId] = React.useState(supplier ? (supplier.telegramChatId || "") : "");
  const [address, setAddress] = React.useState(supplier ? (supplier.address || "") : "");
  const [note, setNote] = React.useState(supplier ? (supplier.note || "") : "");

  function submit() {
    if (!name.trim()) { toast("បំពេញ​ឈ្មោះ​អ្នកផ្គត់ផ្គង់", "error"); return; }
    const dup = (state.suppliers || []).find(x => x.name.trim().toLowerCase() === name.trim().toLowerCase() && (!supplier || x.id !== supplier.id));
    if (dup) { toast(`ឈ្មោះ "${dup.name}" មាន​រួច​ហើយ`, "error"); return; }
    const data = { name: name.trim(), contact: contact.trim() || undefined, phone: phone.trim() || undefined, telegramChatId: telegramChatId.trim() || undefined, address: address.trim() || undefined, note: note.trim() || undefined };
    if (supplier) {
      setState(s => ({ ...s, suppliers: (s.suppliers || []).map(x => x.id === supplier.id ? { ...x, ...data } : x) }));
      toast(`រក្សាទុក ${name} ជោគជ័យ`, "ok");
    } else {
      setState(s => {
        const id = generateId("SUP", s.suppliers || []);
        return { ...s, suppliers: [{ id, ...data }, ...(s.suppliers || [])] };
      });
      toast(`បន្ថែម ${name} ជោគជ័យ`, "ok");
    }
    onClose();
  }

  return (
    <Modal title={supplier ? "កែ​អ្នកផ្គត់ផ្គង់" : "អ្នកផ្គត់ផ្គង់​ថ្មី"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>ឈ្មោះ · NAME</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="ឧ. Cambo Auto Parts" autoFocus /></div>
        <div className="field"><label>អ្នកទំនាក់ទំនង · CONTACT</label><input className="input" value={contact} onChange={e => setContact(e.target.value)} placeholder="ឧ. Lok Dara" /></div>
        <div className="field"><label>ទូរស័ព្ទ · PHONE</label><input className="input mono" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+855 ..." /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Telegram Chat ID <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(មិនបង្ខំ · ​ផ្ញើ​បញ្ជា​ទិញ​ផ្ទាល់)</span></label><input className="input mono" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="ឧ. 8270854278" /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>អាសយដ្ឋាន · ADDRESS</label><input className="input" value={address} onChange={e => setAddress(e.target.value)} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>កំណត់​សម្គាល់ · NOTE</label><input className="input" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

// ── Reorder Modal ──
function ReorderModal({ part, state, setState, onClose, toast }) {
  const suggestedQty = Math.max(10, (part.reorder || 5) * 2);
  const [qty, setQty] = React.useState(suggestedQty);
  const [sendTg, setSendTg] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const orderQty = +qty || 0;
  const totalCost = orderQty * (part.cost || 0);
  // Match a managed supplier by name → enables sending the order straight to them.
  const supplier = (state?.suppliers || []).find(x => x.name === part.supplier);
  const toSupplier = !!(supplier && supplier.telegramChatId);

  async function confirm() {
    if (orderQty <= 0) { toast("ចំនួន​ត្រូវ​តែ​ច្រើន​ជាង 0", "error"); return; }
    setWorking(true);
    // 1. Send Telegram if requested — to the supplier directly when we have their chat ID, else to the owner
    let tgResult = null;
    if (sendTg && telegramConfigured(state?.config)) {
      const tg = state.config.telegram;
      const garageName = (state.config && state.config.garageName) || "Garage";
      const chatId = toSupplier ? supplier.telegramChatId : tg.ownerChatId;
      tgResult = await sendMessage(tg.botToken, chatId, reorderMessage(part, orderQty, totalCost, garageName));
    }
    // 2. Add stock + log reorder
    const reorder = {
      id: generateId("RO", state?.reorders || []),
      partId: part.id,
      partName: part.name,
      sku: part.sku,
      qty: orderQty,
      unitCost: part.cost || 0,
      totalCost,
      supplier: part.supplier || "—",
      supplierId: supplier ? supplier.id : undefined,
      sentTo: sendTg ? (toSupplier ? "supplier" : "owner") : undefined,
      createdAt: new Date().toISOString(),
    };
    setState(s => ({
      ...s,
      parts: s.parts.map(p => p.id === part.id ? { ...p, stock: (p.stock || 0) + orderQty } : p),
      reorders: [reorder, ...(s.reorders || [])],
    }));
    setWorking(false);
    if (sendTg && tgResult && tgResult.ok) {
      toast(`✅ បាន​បញ្ជា​ទិញ ${orderQty} × ${part.name} ($${totalCost.toFixed(2)}) · ផ្ញើ​ទៅ ${toSupplier ? supplier.name : "ម្ចាស់"}`, "ok");
    } else if (sendTg && tgResult && !tgResult.ok) {
      toast(`បន្ថែម​ស្តុក ${orderQty} × ${part.name} · Telegram បរាជ័យ: ${tgResult.description}`, "info");
    } else if (sendTg && !telegramConfigured(state?.config)) {
      toast(`បន្ថែម​ស្តុក ${orderQty} × ${part.name} · Telegram មិន​បាន​ភ្ជាប់ — ភ្ជាប់​នៅ Settings`, "info");
    } else {
      toast(`បាន​បញ្ជា​ទិញ ${orderQty} × ${part.name} ($${totalCost.toFixed(2)})`, "ok");
    }
    onClose();
  }

  return (
    <Modal title={`Reorder · ${part.name}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={confirm} disabled={working}>
          <Icon.Check size={14} /> {working ? "កំពុង​ផ្ញើ..." : "បញ្ជា​ទិញ + ​បន្ថែម​ស្តុក"}
        </button>
      </>}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, fontSize: 13 }}>
          <div><span className="muted">SKU: </span><code>{part.sku}</code></div>
          <div><span className="muted">Supplier: </span>{part.supplier || "—"}</div>
          <div><span className="muted">ស្តុក​បច្ចុប្បន្ន: </span><b>{part.stock || 0}</b> · Reorder ≤ {part.reorder || 0}</div>
          <div><span className="muted">តម្លៃ​ដើម: </span>${(part.cost || 0).toFixed(2)} / ឯកតា</div>
        </div>
        <div className="field">
          <label>ចំនួន​បញ្ជា​ទិញ</label>
          <input className="input" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} autoFocus />
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>​ ​ ​ ​ ​ ​ ​ ​ ​ស្តុក​ថ្មី: {(part.stock || 0)} → <b>{(part.stock || 0) + orderQty}</b></div>
        </div>
        <div className="field">
          <label>តម្លៃ​សរុប</label>
          <div className="num" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-text)' }}>${totalCost.toFixed(2)}</div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={sendTg} onChange={e => setSendTg(e.target.checked)} />
          ផ្ញើ​សារ​បញ្ជា​ទិញ​តាម Telegram
          {!telegramConfigured(state?.config) && <span className="muted" style={{ fontSize: 11 }}>(Telegram មិន​បាន​ភ្ជាប់)</span>}
        </label>
        {sendTg && telegramConfigured(state?.config) && (
          <div className="muted" style={{ fontSize: 11, marginTop: -4 }}>
            {toSupplier
              ? <>📱 ផ្ញើ​ផ្ទាល់​ទៅ <b>{supplier.name}</b></>
              : <>ផ្ញើ​ទៅ​ម្ចាស់ (Owner) · {part.supplier && part.supplier !== "—" ? `${part.supplier} គ្មាន Telegram ID — បន្ថែម​នៅ "គ្រប់គ្រង​អ្នកផ្គត់ផ្គង់"` : "Part នេះ​គ្មាន​អ្នកផ្គត់ផ្គង់"}</>}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Parts Stock Report Modal (with PDF) ──
function PartsReportModal({ parts, currency, onClose, toast }) {
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...parts].sort((a, b) => {
    // low/out first, then by supplier, then by sku
    const aLow = a.stock <= a.reorder ? 0 : 1;
    const bLow = b.stock <= b.reorder ? 0 : 1;
    if (aLow !== bLow) return aLow - bLow;
    if ((a.supplier || "") !== (b.supplier || "")) return (a.supplier || "").localeCompare(b.supplier || "");
    return (a.sku || "").localeCompare(b.sku || "");
  });

  const totalValue = parts.reduce((s, p) => s + (p.stock || 0) * (p.cost || 0), 0);
  const retailValue = parts.reduce((s, p) => s + (p.stock || 0) * (p.price || 0), 0);
  const lowCount = parts.filter(p => p.stock > 0 && p.stock <= p.reorder).length;
  const outCount = parts.filter(p => p.stock === 0).length;
  const totalUnits = parts.reduce((s, p) => s + (p.stock || 0), 0);

  // Group by supplier for summary
  const supplierGroups = {};
  parts.forEach(p => {
    const k = p.supplier || "—";
    if (!supplierGroups[k]) supplierGroups[k] = { skus: 0, units: 0, value: 0, low: 0 };
    supplierGroups[k].skus++;
    supplierGroups[k].units += p.stock || 0;
    supplierGroups[k].value += (p.stock || 0) * (p.cost || 0);
    if (p.stock <= p.reorder) supplierGroups[k].low++;
  });
  const supplierList = Object.entries(supplierGroups).sort((a, b) => b[1].value - a[1].value);

  async function downloadPdf() {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { downloadElementAsPdf } = await import('./lib/pdf');
      await downloadElementAsPdf(sheetRef.current, `Parts-Stock-Report-${today}.pdf`);
      toast("បាន​ទាញ​យក Parts Stock Report", "ok");
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal wide title="Parts Stock Report" onClose={onClose}
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
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>STOCK REPORT</div>
            <div style={{ fontSize: 11, color: '#666' }}>As of {today}</div>
          </div>
        </div>

        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>SKUs</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{parts.length}</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>UNITS</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{totalUnits.toLocaleString()}</div>
          </div>
          <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#888' }}>COST VALUE</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{moneyUSD(totalValue)}</div>
          </div>
          <div style={{ background: outCount > 0 ? '#fee2e2' : '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: outCount > 0 ? '#991b1b' : '#888' }}>OUT OF STOCK</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: outCount > 0 ? '#dc2626' : '#0a0d12' }}>{outCount}</div>
          </div>
          <div style={{ background: lowCount > 0 ? '#fef3c7' : '#f5f5f5', padding: 12, borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: lowCount > 0 ? '#7a5a00' : '#888' }}>LOW STOCK</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: lowCount > 0 ? '#d97706' : '#0a0d12' }}>{lowCount}</div>
          </div>
        </div>

        {/* Suppliers summary */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>SUPPLIERS · BY VALUE</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>SUPPLIER</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>SKUs</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>UNITS</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>LOW</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>VALUE</th>
            </tr>
          </thead>
          <tbody>
            {supplierList.map(([s, g]) => (
              <tr key={s} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{g.skus}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{g.units.toLocaleString()}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: g.low > 0 ? '#dc2626' : '#0a0d12', fontWeight: g.low > 0 ? 700 : 400 }}>{g.low}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(g.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Items - low stock first */}
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>ALL ITEMS · LOW STOCK FIRST</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>SKU</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>NAME</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>SUPPLIER</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>LOC</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>STOCK</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>MIN</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>COST</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>PRICE</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>VALUE</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => {
              const isOut = p.stock === 0;
              const isLow = !isOut && p.stock <= p.reorder;
              const rowBg = isOut ? '#fee2e2' : isLow ? '#fef3c7' : 'transparent';
              const value = (p.stock || 0) * (p.cost || 0);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee', background: rowBg }}>
                  <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{p.sku}</td>
                  <td style={{ padding: '6px 10px' }}>{p.name}</td>
                  <td style={{ padding: '6px 10px', color: '#666' }}>{p.supplier}</td>
                  <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666' }}>{p.location}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#0a0d12' }}>{p.stock}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#666' }}>{p.reorder}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(p.cost || 0)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(p.price || 0)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(value)}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid #0a0d12', background: '#fafafa' }}>
              <td colSpan={4} style={{ padding: '10px 10px', fontWeight: 800, letterSpacing: '0.06em' }}>TOTAL</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{totalUnits}</td>
              <td></td>
              <td></td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#666' }}>Retail: {moneyUSD(retailValue)}</td>
              <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>{moneyUSD(totalValue)}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        {(lowCount > 0 || outCount > 0) && (
          <div style={{ marginTop: 18, padding: 12, background: '#fef3c7', borderLeft: '3px solid #d97706', borderRadius: 4, fontSize: 12, color: '#7a5a00' }}>
            <strong>Action needed:</strong> {outCount > 0 && `${outCount} SKUs out of stock`}{outCount > 0 && lowCount > 0 && " · "}{lowCount > 0 && `${lowCount} SKUs below reorder level`} — សូម​បញ្ជា​ទិញ​ឲ្យ​ឆាប់
          </div>
        )}
        <div style={{ fontSize: 10, color: '#888', textAlign: 'center', letterSpacing: '0.04em', borderTop: '1px solid #eee', paddingTop: 14, marginTop: 18 }}>
          Generated by Garage OS · {today}
        </div>
      </div>
    </Modal>
  );
}

// ── Edit Part Modal ──
function EditPartModal({ part, state, setState, onClose, toast }) {
  const supplierNames = (state?.suppliers || []).map(x => x.name);
  const [sku, setSku] = React.useState(part.sku || "");
  const [name, setName] = React.useState(part.name || "");
  const [nameEn, setNameEn] = React.useState(part.nameEn || "");
  const [category, setCategory] = React.useState(part.category || "ប្រេង");
  const [supplier, setSupplier] = React.useState(part.supplier === "—" ? "" : (part.supplier || ""));
  const [stock, setStock] = React.useState(part.stock || 0);
  const [reorder, setReorder] = React.useState(part.reorder || 5);
  const [cost, setCost] = React.useState(part.cost || 0);
  const [price, setPrice] = React.useState(part.price || 0);
  const [location, setLocation] = React.useState(part.location === "—" ? "" : (part.location || ""));

  function save() {
    if (!name.trim()) { toast("បំពេញឈ្មោះ", "error"); return; }
    if (!sku.trim()) { toast("បំពេញ SKU", "error"); return; }
    setState(s => ({
      ...s,
      parts: s.parts.map(p => p.id === part.id ? {
        ...p,
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        nameEn: nameEn.trim() || name.trim(),
        category,
        supplier: supplier.trim() || "—",
        stock: +stock || 0,
        reorder: +reorder || 0,
        cost: +cost || 0,
        price: +price || 0,
        location: location.trim().toUpperCase() || "—",
      } : p),
    }));
    toast(`រក្សាទុក ${name} ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title={"កែ Part · " + part.sku} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={save}><Icon.Check size={14} /> រក្សាទុក</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field"><label>SKU</label><input className="input" value={sku} onChange={e => setSku(e.target.value)} autoFocus /></div>
        <div className="field"><label>ប្រភេទ · CATEGORY</label>
          <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
            {["ប្រេង", "តម្រង", "ហ្វ្រាំង", "អគ្គិសនី", "ឆេះ", "កង់", "ផ្សេងៗ"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field"><label>ឈ្មោះ (ខ្មែរ)</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label>ឈ្មោះ (English)</label><input className="input" value={nameEn} onChange={e => setNameEn(e.target.value)} /></div>
        <div className="field"><label>អ្នកផ្គត់ផ្គង់</label><input className="input" list="supplier-names" value={supplier} onChange={e => setSupplier(e.target.value)} /><datalist id="supplier-names">{supplierNames.map(n => <option key={n} value={n} />)}</datalist></div>
        <div className="field"><label>ទីតាំង</label><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="A-01" /></div>
        <div className="field"><label>ស្តុក · STOCK</label><input className="input" type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
        <div className="field"><label>Reorder Level</label><input className="input" type="number" value={reorder} onChange={e => setReorder(e.target.value)} /></div>
        <div className="field"><label>តម្លៃដើម · COST ($)</label><input className="input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></div>
        <div className="field"><label>តម្លៃលក់ · PRICE ($)</label><input className="input" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTATION
// ════════════════════════════════════════════════════════════
function QuotationScreen({ state, setState, currency, onNewQuote, toast, onConvert, onSend, onView }) {
  const [delQuote, setDelQuote] = React.useState(null);
  const [tab, setTab] = React.useState("all");
  const allQuotes = state.quotations;
  const filtered = tab === "all" ? allQuotes : allQuotes.filter(q => q.status === tab);
  const stats = {
    sent: allQuotes.filter(q => q.status === "sent").length,
    accepted: allQuotes.filter(q => q.status === "accepted").length,
    rejected: allQuotes.filter(q => q.status === "rejected").length,
    draft: allQuotes.filter(q => q.status === "draft").length,
  };
  const acceptRate = Math.round((stats.accepted / (stats.accepted + stats.rejected) || 0) * 100);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Quotation</h1>
          <div className="page-sub">តម្លៃប៉ាន់ស្មាន · {allQuotes.length} ឯកសារ · Acceptance Rate {acceptRate}%</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => { exportCsv("quotations.csv", allQuotes.map(q => ({ id: q.id, customer: (lookupCustomer(q.customer, state) || {}).name || q.customer, vehicle: (lookupVehicle(q.vehicle, state) || {}).plate || q.vehicle, created: q.created, valid: q.valid, items: q.items, total: q.total, status: q.status }))); toast(`នាំចេញ ${allQuotes.length} Quotations (CSV)`, "ok"); }}><Icon.Download size={14} /> Export</button>
          <button className="btn btn-primary" onClick={onNewQuote}><Icon.Plus size={14} /> Quote ថ្មី</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">សរុបនៅខែនេះ</div>
          <div className="kpi-value num">{allQuotes.length}</div>
          <div className="kpi-delta">▲ 4 vs ខែមុន</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">បានយល់ព្រម</div>
          <div className="kpi-value num" style={{ color: 'var(--success)' }}>{stats.accepted}</div>
          <div className="kpi-delta">{acceptRate}% acceptance</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">បានផ្ញើ</div>
          <div className="kpi-value num">{stats.sent}</div>
          <div className="kpi-delta neutral">រង់ចាំការឆ្លើយតប</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">តម្លៃសរុប</div>
          <div className="kpi-value num"><Money value={allQuotes.reduce((s, q) => s + (q.total || 0), 0)} currency={currency} /></div>
          <div className="kpi-delta">មុនពន្ធ</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[
          { id: "all", label: "ទាំងអស់" },
          { id: "draft", label: "Draft" },
          { id: "sent", label: "បានផ្ញើ" },
          { id: "accepted", label: "យល់ព្រម" },
          { id: "rejected", label: "បដិសេធ" },
        ].map(t => (
          <button key={t.id} className={"btn btn-sm" + (tab === t.id ? " btn-primary" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>អតិថិជន</th>
              <th>រថយន្ត</th>
              <th>បង្កើត</th>
              <th>មានសុពលភាពដល់</th>
              <th className="num">ធាតុ</th>
              <th className="num">សរុប</th>
              <th>ស្ថានភាព</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => {
              const c = lookupCustomer(q.customer, state) || MISSING_C;
              const v = lookupVehicle(q.vehicle, state) || MISSING_V;
              const stCls = q.status === "accepted" ? "green" : q.status === "rejected" ? "red" : q.status === "sent" ? "blue" : "gray";
              return (
                <tr key={q.id}>
                  <td className="mono" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>{q.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar av-sm" style={{ background: c.color, color: '#0b0b0b', fontSize: 10 }}>{c.initials}</div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="mono">{v.plate}</td>
                  <td className="mono">{q.created}</td>
                  <td className="mono">{q.valid}</td>
                  <td className="num">{q.items}</td>
                  <td className="num" style={{ fontWeight: 700 }}><Money value={q.total} currency={currency} /></td>
                  <td><span className={"chip chip-" + stCls}>{(q.status || "draft").toUpperCase()}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost" title="View" onClick={() => onView(q.id)}><Icon.Doc size={12} /></button>
                      <button className="btn btn-sm btn-ghost" title="Send" onClick={() => onSend(q.id)}><Icon.Send size={12} /></button>
                      {q.status === "accepted" && <button className="btn btn-sm btn-ghost" title="Convert to Job" onClick={() => onConvert(q.id)}><Icon.Wrench size={12} /></button>}
                      {setState && <IfCan perm="delete"><button className="btn btn-sm btn-ghost" title="លុប" onClick={() => setDelQuote(q)}><Icon.X size={12} /></button></IfCan>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {delQuote && <ConfirmModal title="លុប Quote?" message={`លុប ${delQuote.id} (តម្លៃ $${delQuote.total}) ឬ​ទេ?`} danger onClose={() => setDelQuote(null)} onConfirm={() => { setState(s => ({ ...s, quotations: s.quotations.filter(x => x.id !== delQuote.id), auditLog: pushAudit(s, auditEntry("delete", "quote", delQuote.id, `លុប Quote ${delQuote.id} ($${delQuote.total})`, delQuote)) })); toast(`លុប ${delQuote.id} ជោគជ័យ`, "ok"); setDelQuote(null); }} />}
    </div>
  );
}

function NewQuoteModal({ onClose, setState, toast, currency, state, prefillCustomer }) {
  const allCustomers = (state && state.customers) || customers;
  const allVehicles = (state && state.vehicles) || vehicles;
  const initialCustomer = prefillCustomer || (allCustomers[0] && allCustomers[0].id) || "CU-1001";
  const [customerId, setCustomerId] = React.useState(initialCustomer);
  const [vehicleId, setVehicleId] = React.useState("");
  const [items, setItems] = React.useState([
    { kind: "service", desc: "ផ្លាស់ប្រេងម៉ាស៊ីន + តម្រង", qty: 1, price: 32 },
  ]);
  const customerVehicles = allVehicles.filter(v => v.owner === customerId);
  React.useEffect(() => {
    if (customerVehicles.length) setVehicleId(customerVehicles[0].id);
    else setVehicleId("");
  }, [customerId, allVehicles.length]);

  const subtotal = items.reduce((s, x) => s + x.qty * x.price, 0);
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = subtotal + tax;

  function addItem() { setItems([...items, { kind: "service", desc: "", qty: 1, price: 0 }]); }
  function update(i, k, v) {
    setItems(items.map((x, idx) => idx === i ? { ...x, [k]: k === "qty" || k === "price" ? +v : v } : x));
  }
  function remove(i) { setItems(items.filter((_, idx) => idx !== i)); }

  function submit(status) {
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    const id = generateId("QT", state?.quotations || []);
    setState(s => ({
      ...s,
      quotations: [{
        id, customer: customerId, vehicle: vehicleId,
        created: new Date().toISOString().slice(0, 10), valid: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        subtotal, tax, total,
        lineItems: items,
        items: items.length,
        status: status || "draft"
      }, ...s.quotations],
    }));
    toast(`បង្កើត Quote ${id} (${(status || "draft").toUpperCase()}) ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal wide title="Quote ថ្មី · NEW QUOTATION" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn" onClick={() => submit("draft")}>រក្សាជា Draft</button>
        <button className="btn btn-primary" onClick={() => submit("sent")}><Icon.Send size={14} /> ផ្ញើ Quote</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div className="field">
          <label>អតិថិជន</label>
          <select className="select" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            {allCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>រថយន្ត</label>
          <select className="select" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            {customerVehicles.length === 0 && <option value="">— គ្មានរថយន្ត —</option>}
            {customerVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {vehicleLabel(v)}</option>)}
          </select>
        </div>
      </div>

      <div className="section-heading"><h2 style={{ fontSize: 14 }}>ធាតុក្នុង Quote</h2></div>
      <table className="table" style={{ marginBottom: 14 }}>
        <thead>
          <tr><th>ប្រភេទ</th><th>បរិយាយ</th><th className="num">ចំនួន</th><th className="num">តម្លៃ</th><th className="num">សរុប</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((x, i) => (
            <tr key={i}>
              <td>
                <select className="select" value={x.kind} onChange={e => update(i, "kind", e.target.value)} style={{ padding: '6px 8px' }}>
                  <option value="service">Service</option>
                  <option value="part">Part</option>
                </select>
              </td>
              <td>
                <input className="input" value={x.desc} onChange={e => update(i, "desc", e.target.value)} style={{ padding: '6px 8px' }} />
              </td>
              <td className="num"><input className="input" type="number" value={x.qty} onChange={e => update(i, "qty", e.target.value)} style={{ padding: '6px 8px', width: 70, textAlign: 'right' }} /></td>
              <td className="num"><input className="input" type="number" step="0.01" value={x.price} onChange={e => update(i, "price", e.target.value)} style={{ padding: '6px 8px', width: 100, textAlign: 'right' }} /></td>
              <td className="num" style={{ fontWeight: 700 }}><Money value={x.qty * x.price} currency={currency} /></td>
              <td><button className="btn btn-sm btn-ghost" onClick={() => remove(i)}><Icon.X size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-sm" onClick={addItem}><Icon.Plus size={12} /> បន្ថែមធាតុ</button>

      <div style={{ marginTop: 18, padding: 14, background: 'var(--bg-2)', borderRadius: 'var(--radius)', maxWidth: 320, marginLeft: 'auto' }}>
        <Row label="Subtotal" value={<Money value={subtotal} currency={currency} />} />
        <Row label="VAT 10%" value={<Money value={tax} currency={currency} />} />
        <div style={{ borderTop: '1px solid var(--border-1)', marginTop: 8, paddingTop: 8 }}>
          <Row label={<strong>សរុប</strong>} value={<strong className="num" style={{ fontSize: 18, color: 'var(--accent-text)' }}><Money value={total} currency={currency} /></strong>} />
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// INVOICES
// ════════════════════════════════════════════════════════════
function InvoicesScreen({ state, setState, currency, onOpenInvoice, onNewInvoice, toast }) {
  const [delInv, setDelInv] = React.useState(null);
  const [tab, setTab] = React.useState("all");
  const allInv = state.invoices;
  const filtered = tab === "all" ? allInv : allInv.filter(i => i.status === tab);
  const paid = allInv.filter(i => i.status === "paid").reduce((s, i) => s + (i.paid || 0), 0);
  const outstanding = allInv.reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0);
  const overdue = allInv.filter(i => i.status === "overdue").reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Invoices</h1>
          <div className="page-sub">វិក្កយបត្រ · {allInv.length} ឯកសារ · {allInv.filter(i => i.status !== "paid").length} នៅជំពាក់</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => { exportCsv("invoices.csv", allInv.map(inv => ({ id: inv.id, job: inv.job, customer: (lookupCustomer(inv.customer, state) || {}).name || inv.customer, vehicle: (lookupVehicle(inv.vehicle, state) || {}).plate || inv.vehicle, issued: inv.issued, subtotal: inv.subtotal, tax: inv.tax, total: inv.total, paid: inv.paid, status: inv.status }))); toast && toast(`នាំចេញ ${allInv.length} Invoices (CSV)`, "ok"); }}><Icon.Download size={14} /> Export</button>
          <button className="btn btn-primary" onClick={onNewInvoice}><Icon.Plus size={14} /> Invoice ថ្មី</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">បានបង់ខែនេះ</div>
          <div className="kpi-value num"><Money value={paid + 1240} currency={currency} /></div>
          <div className="kpi-delta">▲ 22% vs ខែមុន</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">នៅជំពាក់</div>
          <div className="kpi-value num" style={{ color: 'var(--warn)' }}><Money value={outstanding} currency={currency} /></div>
          <div className="kpi-delta neutral">{allInv.filter(i => i.status !== "paid").length} ឯកសារ</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value num" style={{ color: 'var(--danger)' }}><Money value={overdue} currency={currency} /></div>
          <div className="kpi-delta down">{allInv.filter(i => i.status === "overdue").length} ឯកសារយឺត</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">DSO មធ្យម</div>
          <div className="kpi-value num">12<span className="kpi-unit"> ថ្ងៃ</span></div>
          <div className="kpi-delta">▼ 2 ថ្ងៃ</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: "all", label: "ទាំងអស់" },
          { id: "paid", label: "បានបង់" },
          { id: "partial", label: "Partial" },
          { id: "due", label: "នៅជំពាក់" },
          { id: "overdue", label: "Overdue" },
        ].map(t => (
          <button key={t.id} className={"btn btn-sm" + (tab === t.id ? " btn-primary" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Job</th>
              <th>អតិថិជន</th>
              <th>រថយន្ត</th>
              <th>កាលបរិច្ឆេទ</th>
              <th className="num">សរុប</th>
              <th className="num">បង់រួច</th>
              <th>វិធីបង់</th>
              <th>ស្ថានភាព</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const c = lookupCustomer(inv.customer, state) || MISSING_C;
              const v = lookupVehicle(inv.vehicle, state) || MISSING_V;
              const stCls = inv.status === "paid" ? "green" : inv.status === "partial" ? "amber" : inv.status === "overdue" ? "red" : "blue";
              return (
                <tr key={inv.id} onClick={() => onOpenInvoice(inv.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono" style={{ color: 'var(--accent-text)', fontWeight: 700 }}>{inv.id}</td>
                  <td className="mono muted">{inv.job}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar av-sm" style={{ background: c.color, color: '#0b0b0b', fontSize: 10 }}>{c.initials}</div>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="mono">{v.plate}</td>
                  <td className="mono">{inv.issued}</td>
                  <td className="num" style={{ fontWeight: 700 }}><Money value={inv.total} currency={currency} /></td>
                  <td className="num"><Money value={inv.paid} currency={currency} /></td>
                  <td className="muted">{inv.method}</td>
                  <td><span className={"chip chip-" + stCls}>{(inv.status || "due").toUpperCase()}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost" title="Print" onClick={e => { e.stopPropagation(); window.print(); }}><Icon.Print size={12} /></button>
                      {setState && <IfCan perm="delete"><button className="btn btn-sm btn-ghost" title="លុប" onClick={e => { e.stopPropagation(); setDelInv(inv); }}><Icon.X size={12} /></button></IfCan>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {delInv && <ConfirmModal title="លុប Invoice?" message={`លុប ${delInv.id} (សរុប $${delInv.total}) ឬ​ទេ?`} danger onClose={() => setDelInv(null)} onConfirm={() => { setState(s => ({ ...s, invoices: s.invoices.filter(x => x.id !== delInv.id), auditLog: pushAudit(s, auditEntry("delete", "invoice", delInv.id, `លុប Invoice ${delInv.id} ($${delInv.total})`, delInv)) })); toast(`លុប ${delInv.id} ជោគជ័យ`, "ok"); setDelInv(null); }} />}
    </div>
  );
}

function InvoiceModal({ id, state, setState, currency, onClose, toast }) {
  const inv = state.invoices.find(i => i.id === id);
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  if (!inv) return null;
  const c = lookupCustomer(inv.customer, state) || MISSING_C;
  const v = lookupVehicle(inv.vehicle, state) || MISSING_V;
  // Payment history: derive a display list. Legacy invoices (paid>0, no payments[])
  // get a synthetic "opening" row so the balance always reconciles.
  const history = inv.payments && inv.payments.length
    ? inv.payments
    : ((inv.paid || 0) > 0 ? [{ id: "opening", amount: inv.paid, method: inv.method || "—", date: inv.issued, note: "កត់​ទុក​មុន" }] : []);
  const totalPaid = inv.paid || 0;
  const balance = (inv.total || 0) - totalPaid;

  function recordPayment({ amount, method, date, note }) {
    const amt = +amount || 0;
    if (amt <= 0) { toast("ចំនួន​ត្រូវ​តែ​ច្រើន​ជាង 0", "error"); return; }
    setState && setState(s => ({
      ...s,
      invoices: s.invoices.map(i => {
        if (i.id !== inv.id) return i;
        let payments = i.payments ? [...i.payments] : [];
        // Seed an opening entry for legacy invoices that already had a paid amount
        if (payments.length === 0 && (i.paid || 0) > 0) {
          payments.push({ id: "PMT-open", amount: i.paid, method: i.method || "—", date: i.issued, note: "កត់​ទុក​មុន" });
        }
        payments.push({ id: generateId("PMT", payments), amount: amt, method, date, note: note || "" });
        const newPaid = payments.reduce((a, p) => a + (p.amount || 0), 0);
        const status = newPaid >= (i.total || 0) ? "paid" : newPaid > 0 ? "partial" : i.status;
        return { ...i, payments, paid: newPaid, status, method };
      }),
      auditLog: pushAudit(s, auditEntry("payment", "invoice", inv.id, `ទទួល ${moneyUSD(amt)} (${method}) លើ ${inv.id}`, null)),
    }));
    const newBalance = balance - amt;
    toast(newBalance > 0
      ? `ទទួល ${moneyUSD(amt)} · នៅ​ជំពាក់ ${moneyUSD(newBalance)}`
      : `Invoice ${inv.id} · បង់​ពេញ ✓`, "ok");
    setPayOpen(false);
  }
  async function downloadPdf() {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      // Lazy-load to keep initial bundle small (~750 KB saved)
      const { downloadElementAsPdf } = await import('./lib/pdf');
      await downloadElementAsPdf(sheetRef.current, `${inv.id}.pdf`);
      toast(`បាន​ទាញ​យក ${inv.id}.pdf`, "ok");
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Modal wide title={"Invoice · " + inv.id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បិទ</button>
        <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print</button>
        <button className="btn" onClick={downloadPdf} disabled={downloading}><Icon.Download size={14} /> {downloading ? "កំពុង​បង្កើត..." : "ទាញ​យក PDF"}</button>
        <button className="btn" onClick={async () => {
          const msg = invoiceShareMessage(inv, c, (state.config && state.config.garageName) || "Garage");
          const tg = state.config && state.config.telegram;
          if (telegramConfigured(state.config) && c.telegramChatId) {
            const res = await sendMessage(tg.botToken, c.telegramChatId, msg);
            res.ok ? toast(`បាន​ផ្ញើ Invoice ​ទៅ ${c.name}`, "ok") : toast(`ផ្ញើ​បរាជ័យ · ${res.description}`, "error");
          } else if (telegramConfigured(state.config)) {
            const res = await sendMessage(tg.botToken, tg.ownerChatId, ownerForwardMessage(c.name, msg));
            res.ok ? toast(`បាន​ផ្ញើ​ទៅ Telegram របស់​អ្នក · forward ​ទៅ ${c.name}`, "ok") : toast(`ផ្ញើ​បរាជ័យ · ${res.description}`, "error");
          } else {
            window.open(buildShareUrl(msg), "_blank");
          }
        }}><Icon.Send size={14} /> ផ្ញើ​តាម Telegram</button>
        {inv.status !== "paid" && balance > 0 && (
          <IfCan perm="payments">
            <button className="btn btn-primary" onClick={() => setPayOpen(true)}>
              <Icon.Money size={14} /> ទទួល​ការ​ទូទាត់ · ​នៅ {moneyUSD(balance)}
            </button>
          </IfCan>
        )}
      </>}>
      <div ref={sheetRef} style={{ background: 'white', color: '#0a0d12', padding: 32, borderRadius: 8, fontFamily: 'var(--font-en)' }}>
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
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>INVOICE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{inv.id}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Issued: {inv.issued}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>BILL TO</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{c.address}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{c.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>VEHICLE</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{v.plate} · {vehicleLabel(v)}</div>
            <div style={{ fontSize: 12, color: '#444' }}>VIN: {v.vin}</div>
            <div style={{ fontSize: 12, color: '#444' }}>Mileage: {v.mileage.toLocaleString()} km</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>DESCRIPTION</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>RATE</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 12px' }}>Labor · service charges</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(inv.subtotal * 0.6)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px 12px' }}>Parts & materials</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(inv.subtotal * 0.4)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <table style={{ minWidth: 260, fontSize: 12 }}>
            <tbody>
              <tr><td style={{ padding: 4, color: '#666' }}>Subtotal</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(inv.subtotal)}</td></tr>
              <tr><td style={{ padding: 4, color: '#666' }}>VAT 10%</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(inv.tax)}</td></tr>
              <tr style={{ borderTop: '2px solid #0a0d12' }}>
                <td style={{ padding: '8px 4px 4px', fontWeight: 800 }}>TOTAL</td>
                <td style={{ padding: '8px 4px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16 }}>{moneyUSD(inv.total)}</td>
              </tr>
              <tr><td style={{ padding: 4, color: '#666' }}>Paid</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#22a85a' }}>{moneyUSD(inv.paid)}</td></tr>
              <tr><td style={{ padding: 4, color: '#666' }}>Balance</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: inv.total - inv.paid > 0 ? '#d4501c' : '#0a0d12' }}>{moneyUSD(inv.total - inv.paid)}</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 10, color: '#888', borderTop: '1px solid #eee', paddingTop: 12, textAlign: 'center', letterSpacing: '0.04em' }}>
          THANK YOU FOR YOUR BUSINESS · សូមអរគុណចំពោះការគាំទ្ររបស់លោកអ្នក
        </div>
      </div>

      {/* Payment history (not part of printable sheet) */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>ប្រវត្តិ​ការ​បង់ · PAYMENT HISTORY</h3>
          <div style={{ fontSize: 13 }}>
            <span className="muted">នៅ​ជំពាក់: </span>
            <strong className="num" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}><Money value={balance} currency={currency} /></strong>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="empty" style={{ padding: 14, fontSize: 12 }}>មិន​ទាន់​មាន​ការ​បង់</div>
        ) : (
          <div style={{ border: '1px solid var(--border-0)', borderRadius: 8, overflow: 'hidden' }}>
            {history.map((p, i) => (
              <div key={p.id || i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, padding: '8px 12px', borderTop: i ? '1px solid var(--border-0)' : 'none', alignItems: 'center', fontSize: 13 }}>
                <div className="mono muted" style={{ fontSize: 11 }}>{p.date || '—'}</div>
                <div>{p.method || '—'}{p.note ? <span className="muted" style={{ fontSize: 11 }}> · {p.note}</span> : null}</div>
                <div className="num" style={{ fontWeight: 700, color: 'var(--success)' }}><Money value={p.amount || 0} currency={currency} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {payOpen && <PaymentModal inv={inv} balance={balance} currency={currency} onClose={() => setPayOpen(false)} onConfirm={recordPayment} toast={toast} />}
    </Modal>
  );
}

// ── Payment Modal (partial payment + method + date) ──
function PaymentModal({ inv, balance, currency, onClose, onConfirm, toast }) {
  const [amount, setAmount] = React.useState(balance > 0 ? balance.toFixed(2) : "");
  const [method, setMethod] = React.useState("Cash");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState("");
  const amt = +amount || 0;
  const over = amt > balance + 0.001;

  function submit() {
    if (amt <= 0) { toast("ចំនួន​ត្រូវ​តែ​ច្រើន​ជាង 0", "error"); return; }
    if (over) { toast(`ចំនួន​លើស​ការ​ជំពាក់ (${moneyUSD(balance)}) · សូម​កែ`, "error"); return; }
    onConfirm({ amount: amt, method, date, note });
  }

  return (
    <Modal title={`ទទួល​ការ​ទូទាត់ · ${inv.id}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit} disabled={amt <= 0 || over}><Icon.Money size={14} /> រក្សា​ការ​បង់</button>
      </>}>
      <div style={{ background: 'var(--bg-2)', padding: 12, borderRadius: 8, marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
        <div><span className="muted">សរុប: </span><strong className="num"><Money value={inv.total} currency={currency} /></strong></div>
        <div><span className="muted">នៅ​ជំពាក់: </span><strong className="num" style={{ color: 'var(--danger)' }}><Money value={balance} currency={currency} /></strong></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>ចំនួន​ទទួល ($)</label>
          <input className="input num" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setAmount(balance.toFixed(2))}>ពេញ ({moneyUSD(balance)})</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAmount((balance / 2).toFixed(2))}>ពាក់​កណ្ដាល</button>
          </div>
          {over && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>⚠️ លើស​ការ​ជំពាក់</div>}
        </div>
        <div className="field">
          <label>វិធី​បង់ · METHOD</label>
          <select className="select" value={method} onChange={e => setMethod(e.target.value)}>
            <option>Cash</option>
            <option>ABA Pay</option>
            <option>Wing</option>
            <option>Bakong KHQR</option>
            <option>Bank Transfer</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label>កាល​បរិច្ឆេទ · DATE</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>កំណត់​ចំណាំ <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>(មិន​បង្ខំ)</span></label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="ឧ. បង់​មុន​ខ្លះ" />
        </div>
      </div>
    </Modal>
  );
}

function NewPartModal({ onClose, state, setState, toast }) {
  const [sku, setSku] = React.useState("");
  const [name, setName] = React.useState("");
  const [nameEn, setNameEn] = React.useState("");
  const [category, setCategory] = React.useState("ប្រេង");
  const [supplier, setSupplier] = React.useState("");
  const [stock, setStock] = React.useState(0);
  const [reorder, setReorder] = React.useState(5);
  const [cost, setCost] = React.useState(0);
  const [price, setPrice] = React.useState(0);
  const [location, setLocation] = React.useState("");
  const supplierNames = (state?.suppliers || []).map(x => x.name);

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះ Part", "error"); return; }
    if (!sku.trim()) { toast("សូមបញ្ចូល SKU", "error"); return; }
    const id = generateId("P", state?.parts || []);
    const newP = {
      id, sku: sku.trim().toUpperCase(), name: name.trim(), nameEn: nameEn.trim() || name.trim(),
      category, supplier: supplier.trim() || "—",
      stock: +stock, reorder: +reorder, price: +price, cost: +cost,
      location: location.trim().toUpperCase() || "—",
    };
    setState(s => ({ ...s, parts: [newP, ...s.parts] }));
    toast(`បន្ថែម Part ${newP.name} (${newP.sku}) ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal title="Part ថ្មី · NEW PART" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Plus size={14} /> បន្ថែម Part</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field"><label>SKU</label><input className="input" value={sku} onChange={e => setSku(e.target.value)} placeholder="OIL-5W30-4L" autoFocus /></div>
        <div className="field"><label>ប្រភេទ · CATEGORY</label>
          <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
            {["ប្រេង", "តម្រង", "ហ្វ្រាំង", "អគ្គិសនី", "ឆេះ", "កង់", "ផ្សេងៗ"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field"><label>ឈ្មោះ (ខ្មែរ)</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label>ឈ្មោះ (English)</label><input className="input" value={nameEn} onChange={e => setNameEn(e.target.value)} /></div>
        <div className="field"><label>អ្នកផ្គត់ផ្គង់</label><input className="input" list="supplier-names" value={supplier} onChange={e => setSupplier(e.target.value)} /><datalist id="supplier-names">{supplierNames.map(n => <option key={n} value={n} />)}</datalist></div>
        <div className="field"><label>ទីតាំង</label><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="A-01" /></div>
        <div className="field"><label>ស្តុក · STOCK</label><input className="input" type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
        <div className="field"><label>Reorder Level</label><input className="input" type="number" value={reorder} onChange={e => setReorder(e.target.value)} /></div>
        <div className="field"><label>តម្លៃដើម · COST ($)</label><input className="input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></div>
        <div className="field"><label>តម្លៃលក់ · PRICE ($)</label><input className="input" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
      </div>
    </Modal>
  );
}

// ── Quote Modal (view + PDF) ──
function QuoteModal({ id, state, setState, currency, onClose, toast, onConvert, onSend }) {
  const q = state.quotations.find(x => x.id === id);
  const sheetRef = React.useRef(null);
  const [downloading, setDownloading] = React.useState(false);
  if (!q) return null;
  const c = lookupCustomer(q.customer, state) || MISSING_C;
  const v = lookupVehicle(q.vehicle, state) || MISSING_V;
  const lineItems = q.lineItems || [];
  const subtotal = q.subtotal != null ? q.subtotal : (lineItems.reduce((s, x) => s + (x.qty || 1) * (x.price || 0), 0) || q.total / 1.1);
  const tax = q.tax != null ? q.tax : +(subtotal * 0.1).toFixed(2);

  async function downloadPdf() {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { downloadElementAsPdf } = await import('./lib/pdf');
      await downloadElementAsPdf(sheetRef.current, `${q.id}.pdf`);
      toast(`បាន​ទាញ​យក ${q.id}.pdf`, "ok");
    } catch (e) {
      console.error(e);
      toast("PDF generation failed: " + (e.message || "unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal wide title={"Quote · " + q.id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បិទ</button>
        <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print</button>
        <button className="btn" onClick={downloadPdf} disabled={downloading}><Icon.Download size={14} /> {downloading ? "កំពុង​បង្កើត..." : "ទាញ​យក PDF"}</button>
        <button className="btn" onClick={async () => {
          const msg = quoteShareMessage(q, c, (state.config && state.config.garageName) || "Garage");
          const tg = state.config && state.config.telegram;
          if (telegramConfigured(state.config) && c.telegramChatId) {
            const res = await sendMessage(tg.botToken, c.telegramChatId, msg);
            res.ok ? toast(`បាន​ផ្ញើ Quote ​ទៅ ${c.name}`, "ok") : toast(`ផ្ញើ​បរាជ័យ · ${res.description}`, "error");
          } else if (telegramConfigured(state.config)) {
            const res = await sendMessage(tg.botToken, tg.ownerChatId, ownerForwardMessage(c.name, msg));
            res.ok ? toast(`បាន​ផ្ញើ​ទៅ Telegram របស់​អ្នក · forward ​ទៅ ${c.name}`, "ok") : toast(`ផ្ញើ​បរាជ័យ · ${res.description}`, "error");
          } else {
            window.open(buildShareUrl(msg), "_blank");
          }
        }}><Icon.Send size={14} /> ផ្ញើ​តាម Telegram</button>
        {q.status !== "sent" && q.status !== "accepted" && onSend && (
          <button className="btn" onClick={() => { onSend(q.id); onClose(); }}><Icon.Send size={14} /> ផ្ញើ Quote</button>
        )}
        {q.status === "accepted" && onConvert && (
          <button className="btn btn-primary" onClick={() => { onConvert(q.id); onClose(); }}><Icon.Wrench size={14} /> ប្ដូរ​ទៅ Job</button>
        )}
      </>}>
      <div ref={sheetRef} style={{ background: 'white', color: '#0a0d12', padding: 32, borderRadius: 8, fontFamily: 'var(--font-en)' }}>
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
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.04em', marginBottom: 4 }}>QUOTATION</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{q.id}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Created: {q.created}</div>
            <div style={{ fontSize: 11, color: '#666' }}>Valid until: {q.valid}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#888', marginBottom: 6 }}>QUOTE FOR</div>
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

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>DESCRIPTION</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>QTY</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>RATE</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 10, letterSpacing: '0.14em', color: '#666' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length > 0 ? lineItems.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px' }}>{it.desc || it.kind || "—"}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{it.qty || 1}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(it.price || 0)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD((it.qty || 1) * (it.price || 0))}</td>
              </tr>
            )) : (
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 12px', color: '#888' }}>Quoted items ({q.items} ​ធាតុ)</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>—</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{moneyUSD(subtotal)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <table style={{ minWidth: 260, fontSize: 12 }}>
            <tbody>
              <tr><td style={{ padding: 4, color: '#666' }}>Subtotal</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(subtotal)}</td></tr>
              <tr><td style={{ padding: 4, color: '#666' }}>VAT 10%</td><td style={{ padding: 4, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{moneyUSD(tax)}</td></tr>
              <tr style={{ borderTop: '2px solid #0a0d12' }}>
                <td style={{ padding: '8px 4px 4px', fontWeight: 800 }}>TOTAL</td>
                <td style={{ padding: '8px 4px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 16 }}>{moneyUSD(q.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, color: '#666', borderTop: '1px solid #eee', paddingTop: 12, marginBottom: 8 }}>
          <strong>Terms:</strong> Quote valid until {q.valid}. Prices subject to change after this date. Service warranty 30 days / 1,000 km.
        </div>
        <div style={{ fontSize: 10, color: '#888', textAlign: 'center', letterSpacing: '0.04em' }}>
          THANK YOU · សូមអរគុណចំពោះការគាំទ្ររបស់លោកអ្នក
        </div>
      </div>
    </Modal>
  );
}

function NewInvoiceModal({ onClose, state, setState, toast, currency }) {
  const allVehicles = (state && state.vehicles) || vehicles;
  const firstWithVeh = state.customers.find(c => allVehicles.some(v => v.owner === c.id));
  const [customerId, setCustomerId] = React.useState((firstWithVeh && firstWithVeh.id) || (state.customers[0] && state.customers[0].id) || "CU-1001");
  const custVehicles = allVehicles.filter(v => v.owner === customerId);
  const [vehicleId, setVehicleId] = React.useState((custVehicles[0] && custVehicles[0].id) || "");
  const [items, setItems] = React.useState([{ desc: "សេវាកម្ម", qty: 1, price: 20 }]);
  React.useEffect(() => {
    const vs = allVehicles.filter(v => v.owner === customerId);
    setVehicleId(vs[0] ? vs[0].id : "");
  }, [customerId, allVehicles.length]);

  const subtotal = items.reduce((s, x) => s + x.qty * x.price, 0);
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  function update(i, k, v) { setItems(items.map((x, idx) => idx === i ? { ...x, [k]: k === "desc" ? v : +v } : x)); }
  function addItem() { setItems([...items, { desc: "", qty: 1, price: 0 }]); }
  function remove(i) { setItems(items.filter((_, idx) => idx !== i)); }

  function submit() {
    if (!vehicleId) { toast("ជ្រើសរើសរថយន្ត", "error"); return; }
    const id = generateId("INV", state?.invoices || []);
    const newInv = {
      id, job: "—", customer: customerId, vehicle: vehicleId, issued: new Date().toISOString().slice(0, 10),
      subtotal, tax, total, paid: 0, status: "due", method: "—",
    };
    setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
    toast(`បង្កើត Invoice ${id} ($${total}) ជោគជ័យ`, "ok");
    onClose();
  }

  return (
    <Modal wide title="Invoice ថ្មី · NEW INVOICE" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បោះបង់</button>
        <button className="btn btn-primary" onClick={submit}><Icon.Doc size={14} /> បង្កើត Invoice</button>
      </>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
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
      </div>
      <div className="section-heading"><h2 style={{ fontSize: 14 }}>ធាតុ · LINE ITEMS</h2></div>
      <table className="table" style={{ marginBottom: 14 }}>
        <thead><tr><th>បរិយាយ</th><th className="num">ចំនួន</th><th className="num">តម្លៃ</th><th className="num">សរុប</th><th></th></tr></thead>
        <tbody>
          {items.map((x, i) => (
            <tr key={i}>
              <td><input className="input" value={x.desc} onChange={e => update(i, "desc", e.target.value)} style={{ padding: '6px 8px' }} /></td>
              <td className="num"><input className="input" type="number" value={x.qty} onChange={e => update(i, "qty", e.target.value)} style={{ padding: '6px 8px', width: 70, textAlign: 'right' }} /></td>
              <td className="num"><input className="input" type="number" step="0.01" value={x.price} onChange={e => update(i, "price", e.target.value)} style={{ padding: '6px 8px', width: 100, textAlign: 'right' }} /></td>
              <td className="num" style={{ fontWeight: 700 }}><Money value={x.qty * x.price} currency={currency} /></td>
              <td><button className="btn btn-sm btn-ghost" onClick={() => remove(i)}><Icon.X size={12} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-sm" onClick={addItem}><Icon.Plus size={12} /> បន្ថែមធាតុ</button>
      <div style={{ marginTop: 18, padding: 14, background: 'var(--bg-2)', borderRadius: 'var(--radius)', maxWidth: 320, marginLeft: 'auto' }}>
        <Row label="Subtotal" value={<Money value={subtotal} currency={currency} />} />
        <Row label="VAT 10%" value={<Money value={tax} currency={currency} />} />
        <div style={{ borderTop: '1px solid var(--border-1)', marginTop: 8, paddingTop: 8 }}>
          <Row label={<strong>សរុប</strong>} value={<strong className="num" style={{ fontSize: 18, color: 'var(--accent-text)' }}><Money value={total} currency={currency} /></strong>} />
        </div>
      </div>
    </Modal>
  );
}

export { PartsScreen, QuotationScreen, NewQuoteModal, QuoteModal, InvoicesScreen, InvoiceModal, NewPartModal, NewInvoiceModal };
