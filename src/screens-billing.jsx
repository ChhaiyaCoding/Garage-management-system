import React from 'react';
import GARAGE from './data';
import { Icon } from './icons';
import { Modal } from './shell';
import { Money, Row, exportCsv, lookupCustomer, lookupVehicle, MISSING_C, MISSING_V } from './screens-core';
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
  const allParts = state.parts;
  function reorderPart(p) {
    if (!setState) { toast(`Reorder request sent to ${p.supplier}`, "info"); return; }
    const qty = Math.max(10, (p.reorder || 5) * 2);
    setState(s => ({ ...s, parts: s.parts.map(x => x.id === p.id ? { ...x, stock: (x.stock || 0) + qty } : x) }));
    toast(`បញ្ជា​ទិញ ${qty} × ${p.name} ពី ${p.supplier} · ស្តុក​ឡើង​វិញ`, "ok");
  }
  const filtered = allParts.filter(p => {
    if (tab === "low" && p.stock > p.reorder) return false;
    if (tab === "out" && p.stock > 0) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.sku.toLowerCase().includes(s) && !p.nameEn.toLowerCase().includes(s)) return false;
    }
    return true;
  });
  const totalValue = allParts.reduce((s, p) => s + p.stock * p.cost, 0);
  const lowCount = allParts.filter(p => p.stock <= p.reorder).length;
  const outCount = allParts.filter(p => p.stock === 0).length;
  const suppliers = [...new Set(allParts.map(p => p.supplier))];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Parts Inventory</h1>
          <div className="page-sub">ស្តុក Parts · {allParts.length} SKUs · {suppliers.length} អ្នកផ្គត់ផ្គង់</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => { exportCsv("parts.csv", allParts.map(p => ({ sku: p.sku, name: p.name, nameEn: p.nameEn, category: p.category, supplier: p.supplier, location: p.location, stock: p.stock, reorder: p.reorder, cost: p.cost, price: p.price }))); toast(`នាំចេញ ${allParts.length} Parts (CSV)`, "ok"); }}><Icon.Download size={14} /> Export</button>
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
                  <td className="num muted">${p.cost.toFixed(2)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>${p.price.toFixed(2)}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" title="Reorder · បញ្ជា​ទិញ​ស្តុក" onClick={() => reorderPart(p)}>
                      <Icon.Plus size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Suppliers */}
      <div className="section-heading"><h2>អ្នកផ្គត់ផ្គង់ · SUPPLIERS</h2></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {suppliers.map(s => {
          const sParts = allParts.filter(p => p.supplier === s);
          const sLow = sParts.filter(p => p.stock <= p.reorder).length;
          return (
            <div key={s} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s}</div>
              <div className="muted" style={{ fontSize: 12 }}>{sParts.length} SKUs</div>
              {sLow > 0 && <div style={{ marginTop: 8 }}><span className="chip chip-orange">{sLow} LOW STOCK</span></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// QUOTATION
// ════════════════════════════════════════════════════════════
function QuotationScreen({ state, currency, onNewQuote, toast, onConvert, onSend, onView }) {
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
          <div className="kpi-value num"><Money value={allQuotes.reduce((s, q) => s + q.total, 0)} currency={currency} /></div>
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
                  <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{q.id}</td>
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
                  <td><span className={"chip chip-" + stCls}>{q.status.toUpperCase()}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost" title="View" onClick={() => onView(q.id)}><Icon.Doc size={12} /></button>
                      <button className="btn btn-sm btn-ghost" title="Send" onClick={() => onSend(q.id)}><Icon.Send size={12} /></button>
                      {q.status === "accepted" && <button className="btn btn-sm btn-ghost" title="Convert to Job" onClick={() => onConvert(q.id)}><Icon.Wrench size={12} /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
    const id = "QT-2406-" + String(32 + Math.floor(Math.random() * 50)).padStart(3, "0");
    setState(s => ({
      ...s,
      quotations: [{
        id, customer: customerId, vehicle: vehicleId,
        created: "2026-05-17", valid: "2026-05-31",
        total, items: items.length, status: status || "draft"
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
          <Row label={<strong>សរុប</strong>} value={<strong className="num" style={{ fontSize: 18, color: 'var(--accent)' }}><Money value={total} currency={currency} /></strong>} />
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// INVOICES
// ════════════════════════════════════════════════════════════
function InvoicesScreen({ state, currency, onOpenInvoice, onNewInvoice, toast }) {
  const [tab, setTab] = React.useState("all");
  const allInv = state.invoices;
  const filtered = tab === "all" ? allInv : allInv.filter(i => i.status === tab);
  const paid = allInv.filter(i => i.status === "paid").reduce((s, i) => s + i.paid, 0);
  const outstanding = allInv.reduce((s, i) => s + (i.total - i.paid), 0);
  const overdue = allInv.filter(i => i.status === "overdue").reduce((s, i) => s + (i.total - i.paid), 0);

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
                  <td className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{inv.id}</td>
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
                  <td><span className={"chip chip-" + stCls}>{inv.status.toUpperCase()}</span></td>
                  <td><button className="btn btn-sm btn-ghost" onClick={e => { e.stopPropagation(); window.print(); }}><Icon.Print size={12} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceModal({ id, state, setState, currency, onClose, toast }) {
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return null;
  const c = lookupCustomer(inv.customer, state) || MISSING_C;
  const v = lookupVehicle(inv.vehicle, state) || MISSING_V;
  function acceptPayment() {
    setState && setState(s => ({
      ...s,
      invoices: s.invoices.map(i => i.id === inv.id ? { ...i, paid: i.total, status: "paid", method: "ABA Pay" } : i),
    }));
    toast(`Invoice ${inv.id} · ទទួលបាន ${moneyUSD(inv.total)} (ABA Pay)`, "ok");
    onClose();
  }
  return (
    <Modal wide title={"Invoice · " + inv.id} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>បិទ</button>
        <button className="btn" onClick={() => window.print()}><Icon.Print size={14} /> Print</button>
        <button className="btn" onClick={() => toast("បានផ្ញើវិក្កយបត្រតាម Telegram", "ok")}><Icon.Send size={14} /> ផ្ញើតាម Telegram</button>
        {inv.status !== "paid" && (
          <button className="btn btn-primary" onClick={acceptPayment}>
            <Icon.Money size={14} /> ទទួលការទូទាត់
          </button>
        )}
      </>}>
      <div style={{ background: 'white', color: '#0a0d12', padding: 32, borderRadius: 8, fontFamily: 'var(--font-en)' }}>
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
    </Modal>
  );
}

function NewPartModal({ onClose, setState, toast }) {
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

  function submit() {
    if (!name.trim()) { toast("សូមបញ្ចូលឈ្មោះ Part", "error"); return; }
    if (!sku.trim()) { toast("សូមបញ្ចូល SKU", "error"); return; }
    const id = "P-" + String(13 + Math.floor(Math.random() * 800)).padStart(3, "0");
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
        <div className="field"><label>អ្នកផ្គត់ផ្គង់</label><input className="input" value={supplier} onChange={e => setSupplier(e.target.value)} /></div>
        <div className="field"><label>ទីតាំង</label><input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="A-01" /></div>
        <div className="field"><label>ស្តុក · STOCK</label><input className="input" type="number" value={stock} onChange={e => setStock(e.target.value)} /></div>
        <div className="field"><label>Reorder Level</label><input className="input" type="number" value={reorder} onChange={e => setReorder(e.target.value)} /></div>
        <div className="field"><label>តម្លៃដើម · COST ($)</label><input className="input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></div>
        <div className="field"><label>តម្លៃលក់ · PRICE ($)</label><input className="input" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
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
    const id = "INV-2406-" + String(73 + Math.floor(Math.random() * 90)).padStart(3, "0");
    const newInv = {
      id, job: "—", customer: customerId, vehicle: vehicleId, issued: "2026-05-17",
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
          <Row label={<strong>សរុប</strong>} value={<strong className="num" style={{ fontSize: 18, color: 'var(--accent)' }}><Money value={total} currency={currency} /></strong>} />
        </div>
      </div>
    </Modal>
  );
}

export { PartsScreen, QuotationScreen, NewQuoteModal, InvoicesScreen, InvoiceModal, NewPartModal, NewInvoiceModal };
