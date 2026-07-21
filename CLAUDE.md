# CLAUDE.md — garage-os
# ឯកសារនេះ → Claude Code អានដោយស្វ័យប្រវត្តិរាល់ Session
# កែផ្នែកណាដែលខុសពី Project ពិត

## ⭐ PRODUCT DNA — governs every decision. Read first.
Garage OS is not built to have the most features. It is built to be the easiest and
fastest garage system to use every day.

**Core principles**
- Build for real garage workflows, not software workflows.
- Reduce clicks, reduce thinking, reduce duplicate work.
- Build → Use → Observe → Improve.
- Solve real pain points before adding new features.
- Keep the UI simple, clean and fast.

**Core structure** — Vehicle is the permanent identity; Visits belong to a Vehicle.
```
Customer └── Vehicle └── Visits ├── Repair History ├── Quotation
                                ├── Invoice ├── Payment ├── Warranty └── Reminder
```

**Product priorities (in order)**
1. Universal Search  2. Vehicle Workspace  3. Repair History  4. Repair Detail
5. Quotation  6. Invoice  7. Payment  8. Parts

**Design principles**
- Vehicle Workspace is the daily operating center.
- Repair History uses a table, not a timeline.
- Repair Detail is separate from Invoice.
- Parts and Labor appear in ONE unified work list.
- Search is the primary entry point.

**Workflow principles**
- Users record work. The system derives state automatically whenever possible.
- Avoid manual workflow management. Never force users to manage statuses.

**Do NOT spend time improving:** Job Card UI · DVI · Dashboard · Loyalty · Reports ·
Online Booking · Photo Upload.
`job` remains an INTERNAL data model — it must not become the primary user workflow.

**Decision rule:** "Does this make garage work faster and simpler?" If not, don't build it.
Never preserve a feature just because it exists. Every feature must justify its place
based on real daily garage operations.

## Stack
# បច្ចេកវិទ្យាដែល Project ប្រើ — កុំផ្លាស់ប្តូរដោយខ្លួនឯង
- React 19 + Vite 8, JavaScript (no TypeScript)
- Supabase (auth + database + realtime)
- Custom CSS only (no Tailwind, no UI library)
- Deploy: Vercel (auto on push to main)
- PWA enabled
- Deps: `qrcode` (KHQR/Bakong QR generation, lazy-imported)

## Architecture
# រចនាសម្ព័ន្ធ Code — Claude Code ត្រូវដឹងដើម្បីកុំ rebuild ខុស
- Routing: string state in App.jsx — `const [page, setPage] = useState('dashboard')`
- State: React useState/useContext only — no Redux/Zustand
- Toast: `toast(msg, kind)` prop passed down from App
- Supabase client: single instance in `src/lib/supabase.js`
- All Supabase calls: `const { data, error } = await supabase...`

## Commands
# Commands ដែលប្រើក្នុង Terminal
```
npm run dev      # localhost:5173
npm run build    # output: /dist
npm run lint
```

## Key Conventions
# វិន័យ Code ដែលត្រូវតាម
- Khmer UI language (primary)
- Dual currency: KHR + USD displayed together
- `import.meta.env.VITE_*` for all env vars
- Colocate CSS with component (Button.css next to Button.jsx)
- `@media print` hides nav/buttons for PDF/print views

## Do Not
# ហាមធ្វើ — Claude Code នឹងមិនធ្វើរឿងទាំងនេះ
- Add npm packages without asking
- Use TypeScript, Tailwind, React Router, or any CSS framework
- Expose Supabase service_role key client-side

---

## Working Features
# Features ដែល build ហើយ — Claude Code នឹងមិន rebuild ឡើងវិញ
- Dashboard: KPIs, 7-day chart
- Customer + Vehicle: full CRUD
- Job Card: workflow (waiting → in-progress → done → delivered)
- Parts inventory + low-stock alert
- Quote → Invoice → Telegram flow
- PDF generation: Invoice, Quote, Job Card, Reports
- Telegram Bot: full integration
- Supabase auth + auto-save
- PWA (installable)
- Light/Dark theme + accent colors
- Global search + keyboard shortcuts
- Cambodia address picker (4-level)
- Reorder Parts: ReorderModal (qty + cost + Telegram order to owner) + reorders[] history
- Notification Bell: real notifications derived from state (low stock, overdue, bookings, service due)
- Vehicle Service Reminder: auto-set nextService +3mo on Job done + ServiceRemindersModal (pick/edit dates, send Telegram)
- Customer Telegram Chat ID: field in Add/Edit Customer + 📱 badge in CustomerDrawer
- DVI Inspection: connected to real Jobs (job picker, save to state.dvis, Telegram report)
- Calendar view booking: list / week / month with real dates + nav + click-to-edit
- Booking date picker: Add + Edit Booking modals support date selection
- Partial payment + payment history per invoice (PaymentModal, invoice.payments[], status auto paid/partial)
- Stock accuracy: AddPartRow qty + merge, removePart restores stock
- Soft delete + Audit Log: all deletes (customer/vehicle/job/part/quote/invoice/booking/member) + payments logged to state.auditLog[]; Settings → Audit Log tab with Restore
- Duplicate prevention: customer phone + vehicle plate (normPhone/normPlate/findDupPhone/findDupPlate in screens-core)
- Roles/permissions: src/lib/permissions.js (owner/manager/cashier/mechanic), RoleContext in App, resolveRole by staff email, useCan/IfCan gates. Staff modal assigns email+accessRole. Gates: delete buttons, payment button, Settings tabs. Unassigned email = owner (never locks out)
- Supplier/Vendor CRUD: state.suppliers[] {id,name,contact,phone,telegramChatId,address,note}. SupplierManagerModal from Parts screen. Part forms use <datalist> of supplier names. ReorderModal sends order to supplier's Telegram if chat ID set (else owner). Delete logged to audit (entity "supplier")
- KHQR (Bakong): src/lib/khqr.js builds EMVCo MPM string + CRC16-CCITT, renders via `qrcode` pkg. Config in Settings → Tax & Invoice (bakongAccountId/bakongMerchantName/bakongCity). InvoiceModal shows KhqrBlock (scan-to-pay) when balance>0 + account set, else a config hint. USD amount. NOTE: verify with real Bakong app before production
- Expenses module: state.expenses[] {id,date,category,amount,payee,method,note}. ExpensesScreen (route "expenses", nav in Grow). Monthly view + revenue/expense/net-profit KPIs (revenue = invoices.paid where issued in month), by-category breakdown. ExpenseModal CRUD. Gated by "expenses" perm (owner/manager). Delete logged to audit (entity "expense")
- Vehicle Profile (repair-history center, read-only): VehicleProfileScreen in screens-core, route "vehicle" (state vehicleProfileId + vehicleBackRoute ref). Global search vehicle-click opens it. Header facts (plate/make/model/year/VIN/engineNo/owner/phone/mileage/lastService/outstanding/nextService) + Repair History Timeline (jobs joined w/ invoice+DVI, newest first) + INVOICE-ONLY visits for historical invoices whose job record is gone (guard vi.job null). In-history search box across title/notes/services/parts(joined names)/tech/invoice id/DVI items; highlights matched chips + shows matched part/service detail lines. job.mileage added to New/Edit Job forms (also bumps vehicle.mileage if higher). NOTE: most seed invoices (070-079) have no matching job object — only invoice-only visits show for those. P1 DONE: ServiceVisitModal (read-only repair record, in screens-core) opened from timeline "មើល​លម្អិត" — aggregates job+invoice+DVI: customer/vehicle, complaint/notes, DVI inspection (counts + warn/fail items), work/labor table, parts table, subtotal/discount/tax/total/paid/balance, payment history (incl refunds), Print/PDF (lazy lib/pdf) + jump to Job Card/Invoice. Handles null job (invoice-only). P2 DONE: (1) Warranty — parts master has warrantyMonths+warrantyKm (New/Edit Part); warrantyInfo(part,visitDate,visitMileage,currentMileage) computes active/expired (whichever comes first); shown in ServiceVisitModal parts table (WARRANTY col), in-history matched-part lines, + reminders. (2) Reminders panel on Vehicle Profile — overdue/soon service (from nextService date) + active-warranty parts list. (3) Advanced filters above timeline — mechanic dropdown (techs present) + status (paid/unpaid) + Part-category dropdown (categories present in the vehicle's parts; keeps visits with ≥1 part of that category) + clear-filters. Repair-history feature (P0+P1+P2) COMPLETE. SPRINT 1 (Vehicle Workspace V1): timeline cards REPLACED by a compact visit-history table (Paid date / Invoice no / Visit date / KM / Service summary / Total; row click opens Repair Detail). ServiceVisitModal retitled "REPAIR DETAIL" and its separate Labor+Parts tables merged into ONE work table (Action | Description | Mechanic | Qty | Amount). Action is INFERRED for display only via inferAction() from KH+EN keywords (REPAIR_ACTIONS map) — no schema change; Sprint 2 should make it an explicit stored field. paidInfo() derives Paid/Unpaid/Partial/VOID/REFUNDED; workRows() merges services+parts preserving entry order. SPRINT 2 (Vehicle Workspace can start work): "Visit ថ្មី · NEW VISIT" button in workspace header opens the existing NewJobModal prefilled with this vehicle + its owner + current mileage (NewJobModal gained a prefillVehicle prop; App passes newJobPrefillVehicle via onNewVisit). Active-visit detection: activeJob = open job for this vehicle (status not in done/delivered/cancelled) → shows an "IN SHOP" banner (title/mechanic/status/running-total + Continue→JobDrawer) and HIDES the New Visit button (prevents double-open); no open visit → shows New Visit. Terminology "Visit" not "Service" per product decision; complaint/mileage NOT mandatory. No schema change, no module merge — reuses the job object. SPRINT 3 (derived state + honest invoice): (1) invoiceLines(inv,state) in screens-billing builds REAL invoice lines — job.services + job.partsUsed (joined to parts master for names), else inv.lineItems, else one fallback line at subtotal. REPLACED the fabricated "Labor 60% / Parts 40%" split. NewInvoiceModal now stores lineItems so direct invoices print honestly too. (2) visitState(job,inv) in screens-core derives open|invoiced|paid (never stored, never hand-managed): no invoice=open, balance>0=invoiced, balance<=0=paid. (3) Active visit = latest non-cancelled job whose visitState !== "paid" — FULL PAYMENT COMPLETES A VISIT (no manual close; paid-but-parked and pay-later are deliberately deferred). Banner shows the derived state chip + the single next action: open→ចេញវិក្កយបត្រ (generateInvoice), invoiced→ទទួលប្រាក់ (open invoice), plus កត់ការងារ→JobDrawer
- Invoice Refund/Void: RefundModal appends negative payment entry {type:"refund"} → recomputes paid; status "refunded" when paid<=0. VoidModal sets status "void" + voidedAt/voidReason (kept as record, excluded from outstanding/revenue). Invoice statuses now: paid/partial/due/overdue/refunded/void. Buttons in InvoiceModal gated (refund=payments, void=delete). Audit actions "refund"/"void". VOID watermark on sheet

---

## Incomplete Features
# Features ដែល build មិនទាន់ពេញលេញ — fix មិន rebuild
# ✏️ UPDATE នៅពេល feature ណាមួយ fix ហើយ

- Refund/void: refund uses negative payment entries (no separate refunds[] ledger); refunded invoices can't take new payment (pay button hidden by design)
- Send Campaign: fake toast → missing real Telegram broadcast to members
- Branches/Staff: CRUD exists → not linked to Jobs/Customers, no filter
- Barcode scanner (Parts): toast placeholder only
- Import Excel (Customers): toast placeholder only

---

## Missing Features
# Features ដែលមិនទាន់ build — reference សម្រាប់ future work
# ✏️ MOVE TO Working Features នៅពេល build ហើយ

- Purchase Orders for parts
- Customer Portal (self-service)
- Technician time tracking + shift management
- SLA tracking — overdue job indicator
- Service packages (combo + discount)
- Profit margin per job/part
- Technician performance report
- Customer churn analysis
- Year-over-year comparison
- In-app notification center
- Email notifications to customer
- SMS gateway
