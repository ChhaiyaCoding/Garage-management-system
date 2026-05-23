import React from 'react';
import GARAGE from './data';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel';
import { Sidebar, Topbar, useToasts } from './shell';
import { DashboardScreen, CustomersScreen, CustomerDrawer, AddCustomerModal } from './screens-core';
import { JobsScreen, JobDrawer, NewJobModal, EditJobModal } from './screens-jobs';
import { PartsScreen, QuotationScreen, NewQuoteModal, InvoicesScreen, InvoiceModal, NewPartModal, NewInvoiceModal } from './screens-billing';
import { BookingScreen, DVIScreen, MembersScreen, ReportsScreen, SettingsScreen, AddBookingModal, AddMemberModal } from './screens-extra';
import { LoginScreen, LoadingScreen } from './screens-auth';
import { supabase, isConfigured } from './lib/supabase';
import { loadWorkspace, queueSave, flushSave } from './lib/storage';
import './styles.css';

const G = GARAGE;

const TWEAK_DEFAULTS = {
  "accent": "#f5b400",
  "density": "comfortable",
  "currency": "USD",
  "sidebar": "full"
};

const ACCENT_PALETTES = {
  "#f5b400": { c: "#f5b400", hi: "#ffc832", dim: "#8a6500", soft: "rgba(245, 180, 0, 0.12)" },
  "#3b82f6": { c: "#3b82f6", hi: "#60a5fa", dim: "#1e3a8a", soft: "rgba(59, 130, 246, 0.12)" },
  "#22c55e": { c: "#22c55e", hi: "#4ade80", dim: "#14532d", soft: "rgba(34, 197, 94, 0.12)" },
  "#a78bfa": { c: "#a78bfa", hi: "#c4b5fd", dim: "#4c1d95", soft: "rgba(167, 139, 250, 0.12)" },
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
  const [saveStatus, setSaveStatus] = React.useState("idle"); // idle | saving | saved | error

  const [state, setState] = React.useState(initialState || defaultState());

  // ─── Persistence: debounced save to Supabase on state change ───
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (!userId) return;            // in-memory mode
    if (firstRender.current) { firstRender.current = false; return; }
    setSaveStatus("saving");
    queueSave(userId, state, (res) => setSaveStatus(res.ok ? "saved" : "error"));
  }, [state, userId]);

  function convertQuoteToJob(qId) {
    const q = state.quotations.find(x => x.id === qId);
    if (!q) return;
    const newId = "JOB-2406-" + String(89 + Math.floor(Math.random() * 30)).padStart(3, "0");
    const newJob = {
      id: newId, title: `ពី Quote ${q.id}`, vehicle: q.vehicle, customer: q.customer,
      tech: "Sok Pheap", techInitials: "SP", techColor: "#22c55e",
      status: "waiting", priority: "normal",
      created: "2026-05-17 " + new Date().toTimeString().slice(0, 5),
      promised: "2026-05-18 17:00", services: [], partsUsed: [], notes: `បង្កើតពី Quote ${q.id} · សរុប $${q.total}`,
    };
    setState(s => ({
      ...s,
      jobs: [newJob, ...s.jobs],
      quotations: s.quotations.map(x => x.id === qId ? { ...x, status: "accepted" } : x),
    }));
    toast(`Quote ${qId} → Job ${newId}`, "ok");
    setRoute("jobs");
  }

  function sendQuote(qId) {
    setState(s => ({ ...s, quotations: s.quotations.map(x => x.id === qId ? { ...x, status: "sent" } : x) }));
    toast(`Quote ${qId} បានផ្ញើទៅអតិថិជន`, "ok");
  }

  function viewQuote(qId) {
    const q = state.quotations.find(x => x.id === qId);
    if (!q) return;
    const c = state.customers.find(x => x.id === q.customer) || G.customersById[q.customer];
    toast(`${q.id} · ${c ? c.name : q.customer} · ${q.items} ធាតុ · $${q.total} · ${q.status.toUpperCase()}`, "info");
  }

  function convertBookingToJob(bId) {
    const b = state.bookings.find(x => x.id === bId);
    if (!b) return;
    if (b.status === "in-progress") { toast(`ការកក់ ${bId} មាន Job រួចហើយ`, "info"); return; }
    const newId = "JOB-2406-" + String(89 + Math.floor(Math.random() * 30)).padStart(3, "0");
    const newJob = {
      id: newId, title: b.service, vehicle: b.vehicle, customer: b.customer,
      tech: b.tech, techInitials: b.tech.split(' ').map(w => w[0]).join('').slice(0, 2), techColor: "#22c55e",
      status: "waiting", priority: "normal",
      created: "2026-05-17 " + new Date().toTimeString().slice(0, 5),
      promised: "2026-05-17 " + b.time, services: [], partsUsed: [], notes: `បង្កើតពីការកក់ ${b.id}`,
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

  React.useEffect(() => {
    const root = document.documentElement;
    const p = ACCENT_PALETTES[tweaks.accent] || ACCENT_PALETTES["#f5b400"];
    root.style.setProperty("--accent", p.c);
    root.style.setProperty("--accent-hi", p.hi);
    root.style.setProperty("--accent-dim", p.dim);
    root.style.setProperty("--accent-soft", p.soft);
    root.dataset.density = tweaks.density;
    root.dataset.sidebar = tweaks.sidebar;
  }, [tweaks.accent, tweaks.density, tweaks.sidebar]);

  function generateInvoice(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    const partsTotal = job.partsUsed.reduce((s, p) => s + p.qty * p.price, 0);
    const laborTotal = job.services.reduce((s, x) => s + x.total, 0);
    const subtotal = partsTotal + laborTotal;
    const tax = +(subtotal * 0.1).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const newInv = {
      id: "INV-2406-" + String(73 + Math.floor(Math.random() * 30)).padStart(3, "0"),
      job: jobId, customer: job.customer, vehicle: job.vehicle,
      issued: "2026-05-17",
      subtotal, tax, total, paid: 0,
      status: "due", method: "—",
    };
    setState(s => ({ ...s, invoices: [newInv, ...s.invoices] }));
    setJobOpen(null);
    setInvoiceOpen(newInv.id);
    toast(`Generated ${newInv.id} ពី Job ${jobId}`, "ok");
  }

  React.useEffect(() => {
    if (search && route !== "customers") setRoute("customers");
  }, [search]);

  return (
    <div className="app">
      <Sidebar active={route} onNav={setRoute} />
      <main>
        <Topbar
          search={search} setSearch={setSearch}
          onOpenTweaks={() => window.postMessage({ type: '__activate_edit_mode' }, '*')}
          currency={tweaks.currency} setCurrency={(v) => setTweak("currency", v)}
          userEmail={userEmail} onSignOut={onSignOut} saveStatus={saveStatus}
        />
        {route === "dashboard" && <DashboardScreen state={state} currency={tweaks.currency} onNav={setRoute} toast={toast} />}
        {route === "customers" && <CustomersScreen state={state} search={search} currency={tweaks.currency} onOpenCustomer={setCustomerOpen} onNav={setRoute} onAddCustomer={() => setAddCustomerOpen(true)} toast={toast} />}
        {route === "jobs" && <JobsScreen state={state} setState={setState} onOpenJob={setJobOpen} onNewJob={() => setNewJobOpen(true)} currency={tweaks.currency} />}
        {route === "parts" && <PartsScreen state={state} setState={setState} currency={tweaks.currency} toast={toast} onNewPart={() => setNewPartOpen(true)} />}
        {route === "quotation" && <QuotationScreen state={state} currency={tweaks.currency} onNewQuote={() => setNewQuoteOpen(true)} toast={toast} onConvert={convertQuoteToJob} onSend={sendQuote} onView={viewQuote} />}
        {route === "invoices" && <InvoicesScreen state={state} currency={tweaks.currency} onOpenInvoice={setInvoiceOpen} onNewInvoice={() => setNewInvoiceOpen(true)} toast={toast} />}
        {route === "booking" && <BookingScreen state={state} setState={setState} currency={tweaks.currency} onAddBooking={() => setAddBookingOpen(true)} onConvertBooking={convertBookingToJob} toast={toast} />}
        {route === "dvi" && <DVIScreen currency={tweaks.currency} toast={toast} />}
        {route === "members" && <MembersScreen state={state} setState={setState} currency={tweaks.currency} toast={toast} onAddMember={() => setAddMemberOpen(true)} />}
        {route === "reports" && <ReportsScreen state={state} currency={tweaks.currency} toast={toast} />}
        {route === "settings" && <SettingsScreen state={state} setState={setState} tweaks={tweaks} setTweak={setTweak} toast={toast} />}
      </main>

      {customerOpen && <CustomerDrawer id={customerOpen} state={state} onClose={() => setCustomerOpen(null)} currency={tweaks.currency} toast={toast}
        onNewJob={(cid) => { setNewJobPrefill(cid); setNewJobOpen(true); }}
        onNewQuote={(cid) => { setNewQuotePrefill(cid); setNewQuoteOpen(true); }}
      />}
      {jobOpen && <JobDrawer id={jobOpen} state={state} setState={setState} onClose={() => setJobOpen(null)} onGenerateInvoice={generateInvoice} onEdit={(jid) => { setJobOpen(null); setEditJobOpen(jid); }} currency={tweaks.currency} toast={toast} />}
      {invoiceOpen && <InvoiceModal id={invoiceOpen} state={state} setState={setState} currency={tweaks.currency} onClose={() => setInvoiceOpen(null)} toast={toast} />}
      {newJobOpen && <NewJobModal onClose={() => { setNewJobOpen(false); setNewJobPrefill(""); }} setState={setState} toast={toast} state={state} prefillCustomer={newJobPrefill} />}
      {newQuoteOpen && <NewQuoteModal onClose={() => { setNewQuoteOpen(false); setNewQuotePrefill(""); }} setState={setState} toast={toast} currency={tweaks.currency} state={state} prefillCustomer={newQuotePrefill} />}
      {editJobOpen && <EditJobModal id={editJobOpen} state={state} setState={setState} onClose={() => setEditJobOpen(null)} toast={toast} />}
      {newPartOpen && <NewPartModal onClose={() => setNewPartOpen(false)} setState={setState} toast={toast} />}
      {newInvoiceOpen && <NewInvoiceModal onClose={() => setNewInvoiceOpen(false)} state={state} setState={setState} toast={toast} currency={tweaks.currency} />}
      {addBookingOpen && <AddBookingModal onClose={() => setAddBookingOpen(false)} state={state} setState={setState} toast={toast} />}
      {addCustomerOpen && <AddCustomerModal onClose={() => setAddCustomerOpen(false)} setState={setState} toast={toast} />}
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
