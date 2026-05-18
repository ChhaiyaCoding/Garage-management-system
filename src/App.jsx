import React from 'react';
import GARAGE from './data';
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from './tweaks-panel';
import { Sidebar, Topbar, useToasts } from './shell';
import { DashboardScreen, CustomersScreen, CustomerDrawer } from './screens-core';
import { JobsScreen, JobDrawer, NewJobModal } from './screens-jobs';
import { PartsScreen, QuotationScreen, NewQuoteModal, InvoicesScreen, InvoiceModal } from './screens-billing';
import { BookingScreen, DVIScreen, MembersScreen, ReportsScreen, SettingsScreen } from './screens-extra';
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

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const tweaks = t || TWEAK_DEFAULTS;
  const [route, setRoute] = React.useState("dashboard");
  const [search, setSearch] = React.useState("");
  const [customerOpen, setCustomerOpen] = React.useState(null);
  const [jobOpen, setJobOpen] = React.useState(null);
  const [invoiceOpen, setInvoiceOpen] = React.useState(null);
  const [newJobOpen, setNewJobOpen] = React.useState(false);
  const [newQuoteOpen, setNewQuoteOpen] = React.useState(false);

  const [state, setState] = React.useState(() => ({
    jobs: G.jobs.slice(),
    parts: G.parts.slice(),
    invoices: G.invoices.slice(),
    quotations: G.quotations.slice(),
    bookings: G.bookings.slice(),
  }));

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
        />
        {route === "dashboard" && <DashboardScreen currency={tweaks.currency} onNav={setRoute} />}
        {route === "customers" && <CustomersScreen search={search} currency={tweaks.currency} onOpenCustomer={setCustomerOpen} onNav={setRoute} />}
        {route === "jobs" && <JobsScreen state={state} setState={setState} onOpenJob={setJobOpen} onNewJob={() => setNewJobOpen(true)} currency={tweaks.currency} />}
        {route === "parts" && <PartsScreen state={state} currency={tweaks.currency} toast={toast} />}
        {route === "quotation" && <QuotationScreen state={state} currency={tweaks.currency} onNewQuote={() => setNewQuoteOpen(true)} toast={toast} />}
        {route === "invoices" && <InvoicesScreen state={state} currency={tweaks.currency} onOpenInvoice={setInvoiceOpen} />}
        {route === "booking" && <BookingScreen state={state} currency={tweaks.currency} />}
        {route === "dvi" && <DVIScreen currency={tweaks.currency} toast={toast} />}
        {route === "members" && <MembersScreen currency={tweaks.currency} toast={toast} />}
        {route === "reports" && <ReportsScreen currency={tweaks.currency} />}
        {route === "settings" && <SettingsScreen tweaks={tweaks} setTweak={setTweak} />}
      </main>

      {customerOpen && <CustomerDrawer id={customerOpen} onClose={() => setCustomerOpen(null)} currency={tweaks.currency} />}
      {jobOpen && <JobDrawer id={jobOpen} state={state} setState={setState} onClose={() => setJobOpen(null)} onGenerateInvoice={generateInvoice} currency={tweaks.currency} toast={toast} />}
      {invoiceOpen && <InvoiceModal id={invoiceOpen} state={state} currency={tweaks.currency} onClose={() => setInvoiceOpen(null)} toast={toast} />}
      {newJobOpen && <NewJobModal onClose={() => setNewJobOpen(false)} setState={setState} toast={toast} />}
      {newQuoteOpen && <NewQuoteModal onClose={() => setNewQuoteOpen(false)} setState={setState} toast={toast} currency={tweaks.currency} />}

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

export default App;
