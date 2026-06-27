# CONTEXT.md — garage-os
# ឯកសារនេះ → វចនានុក្រម (Glossary) របស់ Project
# កំណត់ meaning ជាក់លាក់នៃ terms ទាំងអស់
# ✏️ UPDATE នៅពេល term ថ្មីត្រូវបាន resolve
# ⚠️ កុំដាក់ implementation details — glossary តែប៉ុណ្ណោះ

---

## Terms

**Job Card (ប័ណ្ណការងារ)**
Work order បង្កើតពេល vehicle ចូលមកជួសជុល។
Lifecycle: `waiting → in_progress → done → delivered`
Vehicle + Customer ម្នាក់ → Job Card ម្តង។

**Invoice (វិក្កយបត្រ)**
Payment request បង្កើតពី Job Card ដែល complete ហើយ។
Status: `unpaid | partial | paid`
Invoice ម្តង → Job Card ម្តង (one-to-one)។

**Quote (តម្លៃប៉ាន់ស្មាន)**
Cost estimate មុនពេលការងារចាប់ផ្តើម។
អាច convert ទៅ Invoice បាន។
Status: `draft | sent | accepted | rejected`

**Customer (អតិថិជន)**
ម្ចាស់ vehicle ដែលមករក service។
Customer ម្នាក់ → Vehicles ច្រើន អាចមាន។

**Vehicle (យានយន្ត)**
រថយន្តដែល customer នាំមកជួសជុល។
Vehicle ម្នាក់ → Job Cards ច្រើន (service history)។

**Part (គ្រឿងបន្លាស់)**
Inventory item ដែលប្រើក្នុង Job Card។
triggers low-stock alert ពេល `quantity < reorder_level`

**Member (សមាជិក)**
Customer ដែល enrolled ក្នុង loyalty programme។
មាន tier: Bronze / Silver / Gold

**Branch (សាខា)**
Physical garage location។
Jobs + Customers belong to one Branch។
⚠️ មិនទាន់ linked ពេញលេញ — Incomplete Feature

**Supplier (អ្នកផ្គត់ផ្គង់)**
ក្រុមហ៊ុនដែលផ្គត់ផ្គង់ Parts។
⚠️ បច្ចុប្បន្ន string field ប៉ុណ្ណោះ — Missing Feature

**Technician (ช่างជួសជុល)**
Staff member ដែលធ្វើការជួសជុល vehicle។
Assigned to Job Card។

**Campaign (យុទ្ធនាការ)**
Telegram marketing broadcast ទៅ Members។
⚠️ មិនទាន់ real broadcast — Incomplete Feature

**DVI (ត្រួតពិនិត្យរថយន្ត)**
Digital Vehicle Inspection — checklist ត្រួតពិនិត្យ vehicle (engine, brakes, tires, lights)។
ភ្ជាប់នឹង Job Card ជាក់លាក់។ Item នីមួយៗ status: `pass | warn | fail`
ផ្ទុកក្នុង state.dvis[]។ អាចផ្ញើ report តាម Telegram។

**Reorder (បញ្ជាទិញស្តុក)**
ការបញ្ជាទិញ Part ឡើងវិញពេលស្តុកស្ទើរអស់។
ផ្ញើ Telegram ទៅម្ចាស់ហាង + បន្ថែមស្តុក + log ទៅ state.reorders[]។

**Service Reminder (សាររំលឹកសេវាកម្ម)**
ការជូនដំណឹងទៅ customer ពេល vehicle ដល់ពេលត្រួតពិនិត្យ (nextService date)។
Auto-set +3 ខែ ពេល Job → done។ ផ្ញើ Telegram តាម ServiceRemindersModal។

**Telegram Chat ID**
លេខសម្គាល់ chat របស់ customer ក្នុង Telegram។
បើ customer មាន → bot ផ្ញើផ្ទាល់ · បើគ្មាន → owner-forward។

---
# ✏️ បន្ថែម term ថ្មី នៅពេល feature ថ្មីត្រូវបាន build
