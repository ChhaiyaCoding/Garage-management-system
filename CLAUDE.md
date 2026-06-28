# CLAUDE.md — garage-os
# ឯកសារនេះ → Claude Code អានដោយស្វ័យប្រវត្តិរាល់ Session
# កែផ្នែកណាដែលខុសពី Project ពិត

## Stack
# បច្ចេកវិទ្យាដែល Project ប្រើ — កុំផ្លាស់ប្តូរដោយខ្លួនឯង
- React 19 + Vite 8, JavaScript (no TypeScript)
- Supabase (auth + database + realtime)
- Custom CSS only (no Tailwind, no UI library)
- Deploy: Vercel (auto on push to main)
- PWA enabled

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

---

## Incomplete Features
# Features ដែល build មិនទាន់ពេញលេញ — fix មិន rebuild
# ✏️ UPDATE នៅពេល feature ណាមួយ fix ហើយ

- Send Campaign: fake toast → missing real Telegram broadcast to members
- Branches/Staff: CRUD exists → not linked to Jobs/Customers, no filter
- Barcode scanner (Parts): toast placeholder only
- Import Excel (Customers): toast placeholder only

---

## Missing Features
# Features ដែលមិនទាន់ build — reference សម្រាប់ future work
# ✏️ MOVE TO Working Features នៅពេល build ហើយ

- Expenses tracking module
- Purchase Orders for parts
- Vendor/Supplier CRUD
- KHQR (Bakong) QR code on invoice
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
