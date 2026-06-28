import React from 'react';
import GARAGE, { generateId } from './data';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel';
import { useShortcuts, SHORTCUTS } from './lib/shortcuts';
import { useOnline } from './lib/useOnline';
import { Sidebar, Topbar, useToasts } from './shell';
import { DashboardScreen, CustomersScreen, CustomerDrawer, AddCustomerModal } from './screens-core';
import { JobsScreen, JobDrawer, NewJobModal, EditJobModal } from './screens-jobs';
import { PartsScreen, QuotationScreen, NewQuoteModal, QuoteModal, InvoicesScreen, InvoiceModal, NewPartModal, NewInvoiceModal } from './screens-billing';
import { BookingScreen, DVIScreen, MembersScreen, ReportsScreen, SettingsScreen, AddBookingModal, AddMemberModal } from './screens-extra';
import { LoginScreen, LoadingScreen } from './screens-auth';
import { supabase, isConfigured } from './lib/supabase';
import { loadWorkspace, queueSave, flushSave } from './lib/storage';
import { sendMessage, lowStockMessage, quoteShareMessage, ownerForwardMessage, isConfigured as telegramConfigured } from './lib/telegram';
import { RoleContext, resolveRole } from './lib/permissions';
import { lookupCustomer } from './screens-core';
import './styles.css';

const G = GARAGE;

const TWEAK_DEFAULTS = {
  "accent": "#f5b400",
  "density": "comfortable",
  "currency": "USD",
  "sidebar": "full",
  "theme": "auto"
};

const ACCENT_PALETTES = {
  "#f5b400": { c: "#f5b400", hi: "#ffc832", dim: "#8a6500", soft: "rgba(245, 180, 0, 0.12)" },
  "#3b82f6": { c: "#3b82f6", hi: "#60a5fa", dim: "#1e3a8a", soft: "rgba(59, 130, 246, 0.12)" },
  "#22c55e": { c: "#22c55e", hi: "#4ade80", dim: "#14532d", soft: "rgba(34, 197, 94, 0.12)" },
  "#a78bfa": { c: "#a78bfa", hi: "#c4b5fd", dim: "#4c1d95", soft: "rgba(167, 139, 250, 0.12)" },
};
// Light mode reuses the original brand hues; only the "soft" fills get
// a small opacity bump so chip backgrounds stay readable on slate.
// dim for #f5b400: shifted toward amber (40° hue vs 44° of original) at
// 31% lightness so it reads as warm honey-gold, not olive.  Contrast
// on near-white cards ≈ 4.6:1 (passes WCAG AA).
const ACCENT_PALETTES_LIGHT = {
  "#f5b400": { c: "#f5b400", hi: "#ffc832", dim: "#a06b00", soft: "rgba(245, 180, 0, 0.22)" },
  "#3b82f6": { c: "#3b82f6", hi: "#60a5fa", dim: "#1e3a8a", soft: "rgba(59, 130, 246, 0.18)" },
  "#22c55e": { c: "#22c55e", hi: "#4ade80", dim: "#14532d", soft: "rgba(34, 197, 94, 0.18)" },
  "#a78bfa": { c: "#a78bfa", hi: "#c4b5fd", dim: "#4c1d95", soft: "rgba(167, 139, 250, 0.20)" },
};

function defaultState() {
  return {
    jobs: G.jobs.slice(),
    parts: G.parts.slice(),
    invoices: G.invoices.slice(),
    quotations: G.quotations.slice(),
    bookings: G.bookings.slice(),
    customers: G.customers.slice(),
    vehicles: G.vehicles.slice(),
    members: G.members.slice(),
    dvis: [],
    reorders: [],
    auditLog: [],
    suppliers: [],
    branches: [
      { id: "BR-01", name: "សាខាមេ · ភ្នំពេញ", addr: "St. 271, Toul Tom Pong", bays: 8, staff: 12, status: "active", main: true },
      { id: "BR-02", name: "សាខា ខ. កែវ", addr: "St. 2004, Sen Sok", bays: 5, staff: 7, status: "active" },
      { id: "BR-03", name: "សាខា សៀមរាប", addr: "National Rd 6, Siem Reap", bays: 4, staff: 5, status: "active" },
    ],
    staff: [
      ...G.technicians.map(t => ({ ...t, dept: "Workshop" })),
      { id: "S-05", name: "Chan Sophea", initials: "CS", color: "#f472b6", role: "Service Advisor", dept: "Front Desk", load: 0, capacity: 0 },
      { id: "S-06", name: "Long Dara", initials: "LD", color: "#38bdf8", role: "Parts Manager", dept: "Inventory", load: 0, capacity: 0 },
      { id: "S-07", name: "លោក សុខ ភារុណ", initials: "SP", color: "#22c55e", role: "Owner", dept: "Management", load: 0, capacity: 0 },
    ],
    config: {
      garageName: "Garage OS · Service Center",
      garageAddr: "St. 271, Sangkat Toul Tom Pong, Phnom Penh",
      garagePhone: "+855 23 555 100",
      vatTin: "K001-901886401",
      hoursWeekday: { open: "07:30", close: "18:30" },
      hoursSat: { open: "07:30", close: "16:00" },
      hoursSun: { open: "បិទ", close: "—" },
      vatRate: "10%",
      invoicePrefix: "INV-2406-",
      paymentTerms: "Due on receipt",
      invoiceFooter: "Thank you for your business · សូមអរគុណចំពោះការគាំទ្ររបស់លោកអ្នក",
      loyaltyEarn: "1 ពិន្ទុ / $1",
      loyaltyRedeem: "100 ពិន្ទុ = $5 បញ្ចុះ",
      loyaltyBirthday: "2x ពិន្ទុក្នុងខែខួបកំណើត",
      loyaltyExpiry: "24 ខែ",
    },
  };
}

function App({ initialState, userId, userEmail, onSignOut }) {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const tweaks = t || TWEAK_DEFAULTS;
  const [route, setRoute] = React.useState("dashboard");
  const [search, setSearch] = React.useState("");
  const [customerOpen, setCustomerOpen] = React.useState(null);
  const [jobOpen, setJobOpen] = React.useState(null);
  const [invoiceOpen, setInvoiceOpen] = React.useState(null);
  const [quoteOpen, setQuoteOpen] = React.useState(null);
  const [newJobOpen, setNewJobOpen] = React.useState(false);
  const [newJobPrefill, setNewJobPrefill] = React.useState("");
  const [newQuoteOpen, setNewQuoteOpen] = React.useState(false);
  const [newQuotePrefill, setNewQuotePrefill] = React.useState("");
  const [editJobOpen, setEditJobOpen] = React.useState(null);
  const [newPartOpen, setNewPartOpen] = React.useState(false);
  const [newInvoiceOpen, setNewInvoiceOpen] = React.useState(false);
  const [addBookingOpen, setAddBookingOpen] = React.useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = React.useState(false);
  const [addMemberOpen, setAddMemberOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState("idle"); // idle | saving | saved | error
  const online = useOnline();

  const [state, setState] = React.useState(initialState || defaultState());
  const role = React.useMemo(() => resolveRole(state.staff, userEmail), [state.staff, userEmail]);

  // ─── Persistence: debounced save to Supabase on state change ───
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (!userId) return;            // in-memory mode
    if (firstRender.current) { firstRender.current = false; return; }
    setSaveStatus(online ? "saving" : "queued");
    queueSave(userId, state, (res) => {
      if (res.ok) setSaveStatus("saved");
      else if (res.reason === 'offline') setSaveStatus("queued");
      else setSaveStatus("error");
    });
  }, [state, userId, online]);

  // ─── Low-stock Telegram alerts (owner) ───
  // Send only on transition (above reorder → below).  Seed the Set with
  // all currently-low parts on first render so existing low-stock items
  // don't spam the owner the moment they log in.
  const lowStockAlertedRef = React.useRef(null);
  React.useEffect(() => {
    const tg = state.config && state.config.telegram;
    const parts = state.parts || [];
    // First-time seed: remember which parts are already low, no alerts.
    if (lowStockAlertedRef.current === null) {
      lowStockAlertedRef.current = new Set(
        parts.filter(p => p.stock <= (p.reorder || 0)).map(p => p.id)
      );
      return;
    }
    if (!tg || !tg.botToken || !tg.ownerChatId || tg.notifyLowStock === false) return;
    const alerted = lowStockAlertedRef.current;
    parts.forEach(p => {
      const threshold = p.reorder || 0;
      const isLow = p.stock <= threshold;
      if (isLow && !alerted.has(p.id)) {
        sendMessage(tg.botToken, tg.ownerChatId, lowStockMessage(p)).catch(() => {});
        alerted.add(p.id);
      } else if (!isLow && alerted.has(p.id)) {
        // Restocked — clear flag so the next dip alerts again
        alerted.delete(p.id);
      }
    });
  }, [state.parts, state.config]);

  function convertQuoteToJob(qId) {
    const q = state.quotations.find(x => x.id === qId);
    if (!q) return;
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const newId = generateId("JOB", state.jobs);
    const newJob = {
      id: newId, title: `ពី Quote ${q.id}`, vehicle: q.vehicle, customer: q.customer,
      tech: "Sok Pheap", techInitials: "SP", techColor: "#22c55e",
      status: "waiting", priority: "normal",
      created: today + " " + new Date().toTimeString().slice(0, 5),
      promised: tomorrow + " 17:00", services: [], partsUsed: [], notes: `បង្កើតពី Quote ${q.id} · សរុប $${q.total}`,
    };
    setState(s => ({
      ...s,
      jobs: [newJob, ...s.jobs],
      quotations: s.quotations.map(x => x.id === qId ? { ...x, status: "accepted" } : x),
    }));
    toast(`Quote ${qId} → Job ${newId}`, "ok");
    setRoute("jobs");
  }

  async function sendQuote(qId) {
    const q = state.quotations.find(x => x.id === qId);
    if (!q) return;
    const c = lookupCustomer(q.customer, state) || { name: q.customer };
    const msg = quoteShareMessage(q, c, (state.config && state.config.garageName) || "Garage");
    const tg = state.config && state.config.telegram;
    // Mark status="sent" first — so list reflects the action even if Telegram fails
    setState(s => ({ ...s, quotations: s.quotations.map(x => x.id === qId ? { ...x, status: "sent" } : x) }));
    if (telegramConfigured(state.config) && c.telegramChatId) {
      const res = await sendMessage(tg.botToken, c.telegramChatId, msg);
      toast(res.ok ? `Quote ${qId} → ${c.name} (Telegram)` : `Quote ${qId} marked sent · Telegram failed: ${res.description}`, res.ok ? "ok" : "info");
    } else if (telegramConfigured(state.config)) {
      const res = await sendMessage(tg.botToken, tg.ownerChatId, ownerForwardMessage(c.name, msg));
      toast(res.ok ? `Quote ${qId} → Telegram របស់​អ្នក · forward ​ទៅ ${c.name}` : `Quote ${qId} marked sent · Telegram failed`, res.ok ? "ok" : "info");
    } else {
      toast(`Quote ${qId} marked as sent (Telegram មិន​បាន​ភ្ជាប់)`, "info");
    }
  }

  // viewQuote handled by setQuoteOpen below

  function convertBookingToJob(bId) {
    const b = state.bookings.find(x => x.id === bId);
    if (!b) return;
    if (b.status === "in-progress") { toast(`ការកក់ ${bId} មាន Job រួចហើយ`, "info"); return; }
    const today = new Date().toISOString().slice(0, 10);
    const newId = generateId("JOB", state.jobs);
    const techName = b.tech || "—";
    const techInitials = techName === "—" ? "—" : techName.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const newJob = {
      id: newId, title: b.service || "—", vehicle: b.vehicle, customer: b.customer,
      tech: techName, techInitials, techColor: "#22c55e",
      status: "waiting", priority: "normal",
      created: today + " " + new Date().toTimeString().slice(0, 5),
      promised: today + " " + (b.time || "17:00"), services: [], partsUsed: [], notes: `បង្កើតពីការកក់ ${b.id}`,
    };
    setState(s => ({
      ...s,
      jobs: [newJob, ...s.jobs],
      bookings: s.bookings.map(x => x.id === bId ? { ...x, status: "in-progress" } : x),
    }));
    toast(`ការកក់ ${bId} → Job ${newId}`, "ok");
    setRoute("jobs");
  }

  const { push: toast, view: toastView } = useToasts();

  // OS-preferred theme (for "auto" mode)
  const [osTheme, setOsTheme] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  );
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = e => setOsTheme(e.matches ? "light" : "dark");
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const effectiveTheme = (tweaks.theme || "auto") === "auto" ? osTheme : tweaks.theme;

  React.useEffect(() => {
    const root = document.documentElement;
    const palette = effectiveTheme === "light" ? ACCENT_PALETTES_LIGHT : ACCENT_PALETTES;
    const p = palette[tweaks.accent] || palette["#f5b400"];
    root.style.setProperty("--accent", p.c);
    root.style.setProperty("--accent-hi", p.hi);
    root.style.setProperty("--accent-dim", p.dim);
    root.style.setProperty("--accent-soft", p.soft);
    // --accent-text:
    //   Dark mode → bright accent (high contrast on near-black bg).
    //   Light mode → primary dark text (--text-0 value, #1c2230) for
    //   maximum readability; the amber surface tone (borders, soft
    //   fills, --accent itself) still carries the brand identity.
    root.style.setProperty("--accent-text", effectiveTheme === "light" ? "#1c2230" : p.c);
    root.dataset.density = tweaks.density;
    root.dataset.sidebar = tweaks.sidebar;
    root.dataset.theme = effectiveTheme;
  }, [tweaks.accent, tweaks.density, tweaks.sidebar, effectiveTheme]);

  // Context-aware "new" action — what does pressing N create on each screen?
  function newForCurrentRoute() {
    switch (route) {
      case "customers": setAddCustomerOpen(true); break;
      case "jobs": setNewJobOpen(true); break;
      case "parts": setNewPartOpen(true); break;
      case "quotation": setNewQuoteOpen(true); break;
      case "invoices": setNewInvoiceOpen(true); break;
      case "booking": setAddBookingOpen(true); break;
      case "members": setAddMemberOpen(true); break;
      default: setNewJobOpen(true); break; // sensible default
    }
  }

  useShortcuts({
    onSearch: () => {
      const i = document.querySelector('.search-input input');
      if (i) { i.focus(); i.select(); }
    },
    onHelp: () => setHelpOpen(true),
    onNav: (r) => setRoute(r),
    onNew: newForCurrentRoute,
    onToggleTheme: () => setTweak("theme", effectiveTheme === "dark" ? "light" : "dark"),
  });

  function generateInvoice(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    const partsTotal = job.partsUsed.reduce((s, p) => s + p.qty * p.price, 0);
    const laborTotal = job.services.reduce((s, x) => s + x.total, 0);
    const subtotal = partsTotal + laborTotal;
    const tax = +(subtotal * 0.1).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const newInv = {
      id: generateId("INV", state.invoices),
      job: jobId, customer: job.customer, vehicle: job.vehicle,
      issued: new Date().toISOString().slice(0, 10),
      subtotal, tax, total, paid: 0,
      status: "due", method: "—",
    };
    setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
    setJobOpen(null);
    setInvoiceOpen(newInv.id);
    toast(`Generated ${newInv.id} ពី Job ${jobId}`, "ok");
  }

  React.useEffect(() => {
    // Note: global search now handles navigation explicitly via onNavigate.
    // The old "type in topbar → jump to customers" auto-route effect is gone.
  }, [search]);

  return (
    <RoleContext.Provider value={role}>
    <div className="app">
      {!online && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'var(--warn)', color: '#0a0d12', padding: '6px 16px', fontSize: 12, fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontFamily: 'var(--font-en)', letterSpacing: '0.02em' }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#0a0d12' }}></span>
          OFFLINE · ការផ្លាស់ប្ដូរ​នឹង​ត្រូវ​រក្សា​ទុក​ពេល​ត្រឡប់​មក online វិញ
        </div>
      )}
      <Sidebar active={route} onNav={setRoute} />
      <main>
        <Topbar
          search={search} setSearch={setSearch}
          onOpenTweaks={() => window.postMessage({ type: '__activate_edit_mode' }, '*')}
          currency={tweaks.currency} setCurrency={(v) => setTweak("currency", v)}
          userEmail={userEmail} onSignOut={onSignOut} saveStatus={saveStatus}
          theme={effectiveTheme} onToggleTheme={() => setTweak("theme", effectiveTheme === "dark" ? "light" : "dark")}
          state={state}
          onNavigate={(r) => {
            switch (r.type) {
              case "customer": setRoute("customers"); setCustomerOpen(r.id); break;
              case "vehicle": setRoute("customers"); setCustomerOpen(r.ownerId); break;
              case "job": setRoute("jobs"); setJobOpen(r.id); break;
              case "part": setRoute("parts"); break;
              case "invoice": setRoute("invoices"); setInvoiceOpen(r.id); break;
              case "quote": setRoute("quotation"); setQuoteOpen(r.id); break;
              case "booking": setRoute("booking"); break;
              case "member": setRoute("members"); break;
              default: break;
            }
          }}
        />
        {route === "dashboard" && <DashboardScreen state={state} currency={tweaks.currency} onNav={setRoute} toast={toast} />}
        {route === "customers" && <CustomersScreen state={state} setState={setState} search={search} currency={tweaks.currency} onOpenCustomer={setCustomerOpen} onNav={setRoute} onAddCustomer={() => setAddCustomerOpen(true)} toast={toast} />}
        {route === "jobs" && <JobsScreen state={state} setState={setState} onOpenJob={setJobOpen} onNewJob={() => setNewJobOpen(true)} currency={tweaks.currency} />}
        {route === "parts" && <PartsScreen state={state} setState={setState} currency={tweaks.currency} toast={toast} onNewPart={() => setNewPartOpen(true)} />}
        {route === "quotation" && <QuotationScreen state={state} setState={setState} currency={tweaks.currency} onNewQuote={() => setNewQuoteOpen(true)} toast={toast} onConvert={convertQuoteToJob} onSend={sendQuote} onView={setQuoteOpen} />}
        {route === "invoices" && <InvoicesScreen state={state} setState={setState} currency={tweaks.currency} onOpenInvoice={setInvoiceOpen} onNewInvoice={() => setNewInvoiceOpen(true)} toast={toast} />}
        {route === "booking" && <BookingScreen state={state} setState={setState} currency={tweaks.currency} onAddBooking={() => setAddBookingOpen(true)} onConvertBooking={convertBookingToJob} toast={toast} />}
        {route === "dvi" && <DVIScreen state={state} setState={setState} currency={tweaks.currency} toast={toast} />}
        {route === "members" && <MembersScreen state={state} setState={setState} currency={tweaks.currency} toast={toast} onAddMember={() => setAddMemberOpen(true)} />}
        {route === "reports" && <ReportsScreen state={state} currency={tweaks.currency} toast={toast} />}
        {route === "settings" && <SettingsScreen state={state} setState={setState} tweaks={tweaks} setTweak={setTweak} toast={toast} />}
      </main>

      {helpOpen && <ShortcutsModal onClose={() => setHelpOpen(false)} />}

      {customerOpen && <CustomerDrawer id={customerOpen} state={state} setState={setState} onClose={() => setCustomerOpen(null)} currency={tweaks.currency} toast={toast}
        onNewJob={(cid) => { setNewJobPrefill(cid); setNewJobOpen(true); }}
        onNewQuote={(cid) => { setNewQuotePrefill(cid); setNewQuoteOpen(true); }}
      />}
      {jobOpen && <JobDrawer id={jobOpen} state={state} setState={setState} onClose={() => setJobOpen(null)} onGenerateInvoice={generateInvoice} onEdit={(jid) => { setJobOpen(null); setEditJobOpen(jid); }} currency={tweaks.currency} toast={toast} userId={userId} />}
      {invoiceOpen && <InvoiceModal id={invoiceOpen} state={state} setState={setState} currency={tweaks.currency} onClose={() => setInvoiceOpen(null)} toast={toast} />}
      {quoteOpen && <QuoteModal id={quoteOpen} state={state} setState={setState} currency={tweaks.currency} onClose={() => setQuoteOpen(null)} toast={toast} onConvert={convertQuoteToJob} onSend={sendQuote} />}
      {newJobOpen && <NewJobModal onClose={() => { setNewJobOpen(false); setNewJobPrefill(""); }} setState={setState} toast={toast} state={state} prefillCustomer={newJobPrefill} />}
      {newQuoteOpen && <NewQuoteModal onClose={() => { setNewQuoteOpen(false); setNewQuotePrefill(""); }} setState={setState} toast={toast} currency={tweaks.currency} state={state} prefillCustomer={newQuotePrefill} />}
      {editJobOpen && <EditJobModal id={editJobOpen} state={state} setState={setState} onClose={() => setEditJobOpen(null)} toast={toast} />}
      {newPartOpen && <NewPartModal onClose={() => setNewPartOpen(false)} state={state} setState={setState} toast={toast} />}
      {newInvoiceOpen && <NewInvoiceModal onClose={() => setNewInvoiceOpen(false)} state={state} setState={setState} toast={toast} currency={tweaks.currency} />}
      {addBookingOpen && <AddBookingModal onClose={() => setAddBookingOpen(false)} state={state} setState={setState} toast={toast} />}
      {addCustomerOpen && <AddCustomerModal onClose={() => setAddCustomerOpen(false)} state={state} setState={setState} toast={toast} />}
      {addMemberOpen && <AddMemberModal onClose={() => setAddMemberOpen(false)} state={state} setState={setState} toast={toast} />}

      <TweaksPanel>
        <TweakSection label="Theme">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={["#f5b400", "#3b82f6", "#22c55e", "#a78bfa"]}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "comfortable", label: "Cozy" },
              { value: "compact", label: "Compact" },
            ]}
          />
          <TweakRadio
            label="Sidebar"
            value={tweaks.sidebar}
            onChange={(v) => setTweak("sidebar", v)}
            options={[
              { value: "full", label: "Full" },
              { value: "icons", label: "Icons" },
            ]}
          />
          <TweakRadio
            label="Theme"
            value={tweaks.theme || "auto"}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "auto", label: "Auto" },
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Locale">
          <TweakRadio
            label="Currency"
            value={tweaks.currency}
            onChange={(v) => setTweak("currency", v)}
            options={[
              { value: "USD", label: "USD" },
              { value: "KHR", label: "KHR" },
              { value: "BOTH", label: "Both" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>

      {toastView}
    </div>
    </RoleContext.Provider>
  );
}

// ─── Shortcuts cheatsheet modal ───
function ShortcutsModal({ onClose }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">Keyboard Shortcuts</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.14em', marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-2)', borderRadius: 6 }}>
                    <div style={{ fontSize: 13 }}>{s.desc}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {s.keys.map((k, j) => (
                        <kbd key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 7px', background: 'var(--bg-3)', border: '1px solid var(--border-1)', borderRadius: 4, minWidth: 22, textAlign: 'center', fontWeight: 600 }}>{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mono muted" style={{ fontSize: 10, textAlign: 'center', paddingTop: 8 }}>⌘ = Cmd (Mac) ឬ Ctrl (PC)</div>
        </div>
      </div>
    </div>
  );
}

// ─── AuthGate: handles Supabase auth + workspace loading ───
function AuthGate() {
  const [phase, setPhase] = React.useState(isConfigured ? "checking" : "memory");
  const [session, setSession] = React.useState(null);
  const [initial, setInitial] = React.useState(null);

  React.useEffect(() => {
    if (!isConfigured) return;
    // Initial check
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        loadOrSeed(data.session.user.id);
      } else {
        setPhase("login");
      }
    });
    // Listen for sign-in/out
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s) {
        setSession(s);
        loadOrSeed(s.user.id);
      } else {
        setSession(null);
        setInitial(null);
        setPhase("login");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadOrSeed(userId) {
    setPhase("loading");
    const remote = await loadWorkspace(userId);
    setInitial(remote || defaultState());
    setPhase("ready");
  }

  async function handleSignOut() {
    await flushSave();
    await supabase.auth.signOut();
  }

  if (phase === "memory") return <App initialState={defaultState()} userId={null} userEmail={null} onSignOut={null} />;
  if (phase === "checking") return <LoadingScreen message="GARAGE OS · ផ្ទៀងផ្ទាត់ Session" />;
  if (phase === "login") return <LoginScreen onSignedIn={(s) => { setSession(s); loadOrSeed(s.user.id); }} />;
  if (phase === "loading") return <LoadingScreen message="GARAGE OS · ផ្ទុកទិន្នន័យ..." />;
  return <App initialState={initial} userId={session.user.id} userEmail={session.user.email} onSignOut={handleSignOut} />;
}

export default AuthGate;
