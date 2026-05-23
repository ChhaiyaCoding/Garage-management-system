# 🟢 Supabase Setup · Garage OS

ការណែនាំជា Khmer សម្រាប់​ភ្ជាប់ Garage OS ទៅ Supabase (Database + Auth)។

**រយៈពេលប៉ាន់ស្មាន: ៧-១០ នាទី**

---

## 📋 ជំហានទាំងអស់

1. បង្កើត Supabase Account (Free)
2. បង្កើត Project ថ្មី
3. Run Schema SQL
4. យក URL + anon key
5. ដាក់ Keys ទៅ Vercel
6. (Optional) Local dev `.env.local`

---

## ① បង្កើត Supabase Account

1. បើក 👉 https://supabase.com
2. ចុច **Start your project** ឬ **Sign Up**
3. Sign up ដោយ GitHub (recommended) ឬ Email
4. ✅ Free tier មាន:
   - 500 MB database
   - 1 GB storage
   - 50,000 monthly active users
   - **គ្រប់គ្រាន់សម្រាប់ MVP**

---

## ② បង្កើត Project ថ្មី

1. ចុច **New Project**
2. បំពេញ:
   - **Name**: `garage-os` (ឬ​ឈ្មោះអ្នកចង់)
   - **Database Password**: ☆ ⚠️ **រក្សាទុកដោយប្រុងប្រយ័ត្ន** — នឹងត្រូវការនៅពេលក្រោយ
   - **Region**: `Southeast Asia (Singapore)` 🇸🇬 (ជិតកម្ពុជា = លឿន)
   - **Pricing Plan**: Free
3. ចុច **Create new project**
4. **រង់ចាំ ~2 នាទី** ឲ្យវាបង្កើតឲ្យហើយ

---

## ③ Run Schema SQL

1. នៅ Dashboard ខាងឆ្វេង → ចុច **SQL Editor** (icon សញ្ញា `<>`)
2. ចុច **+ New query**
3. បើក file `supabase/schema.sql` នៅក្នុង project Garage OS
4. **Copy ខ្លឹមសារទាំងអស់ → Paste ក្នុង SQL Editor**
5. ចុច **Run** (ឬ Cmd+Enter)
6. ✅ បើ​ឃើញ "Success. No rows returned" → ល្អហើយ!

ដើម្បីផ្ទៀងផ្ទាត់៖ ខាងឆ្វេង → **Table Editor** → គួរឃើញ table ឈ្មោះ `workspaces`

---

## ④ យក URL + anon key

1. ខាងឆ្វេង Dashboard → **Settings** (icon ⚙️ខាងក្រោម)
2. ចុច **API**
3. នៅទំព័រនេះ អ្នកនឹងឃើញ:

```
Project URL:    https://xxxxxxxxxxxx.supabase.co
Project API keys:
  anon public:  eyJhbGc......(long string)
```

📋 **Copy ទាំង ២ តម្លៃ​នេះ​ទុក** — ត្រូវប្រើនៅ​ ⑤

⚠️ **កុំ Copy `service_role` key** — វា dangerous, កុំដាក់ក្នុង frontend!

---

## ⑤ ដាក់ Keys ទៅ Vercel

1. បើក 👉 https://vercel.com/dashboard
2. ចូលទៅ Project **garage-management-system** (ឬ​ឈ្មោះ project អ្នក)
3. **Settings** → **Environment Variables**
4. បន្ថែម 2 variables៖

| Name | Value | Environment |
|---|---|---|
| `VITE_SUPABASE_URL` | (URL ពី ④) | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | (anon key ពី ④) | Production, Preview, Development |

5. ចុច **Save**
6. ត្រឡប់ទៅ **Deployments** → ចុច `…` លើ deployment ចុងក្រោយ → **Redeploy**
7. រង់ចាំ ~30 វិនាទី

✅ ពេលដាក់ deployment ឡើងវិញរួច → Garage OS នឹងបង្ហាញ Login Screen!

---

## ⑥ Local Development (Optional)

បើ​ចង់​ run nៅ​ Mac អ្នកជាមួយ Supabase ផងដែរ:

```bash
cd ~/Desktop/garage-os
cp .env.example .env.local
# Edit .env.local → ដាក់ URL និង anon key
npm run dev
```

`.env.local` នឹង​ត្រូវ​បាន **ignore** ដោយ Git (មិន push ទេ) — safe!

---

## 🎉 ការសាកល្បង

1. បើក Vercel URL → ឃើញ Login Screen
2. ចុច **បង្កើតគណនី** → វាយ Email + Password (យ៉ាងតិច 6 តួ)
3. ✉️ Supabase នឹងផ្ញើ **Verification Email** — បើក Inbox ហើយ​ចុចតំណ
4. ត្រឡប់ App → Sign In
5. ✅ ឃើញ Dashboard! បន្ថែម​អតិថិជន​មួយ ហើយ Refresh page → វា​នៅ​គង់!

---

## 🐛 ដោះស្រាយបញ្ហា

### "Supabase keys មិនទាន់កំណត់ទេ" លេចនៅ Login Screen
→ Env vars មិន​ត្រូវ​បាន​អានទេ។ ត្រួតពិនិត្យ:
- Vercel: Settings → Environment Variables → ប្រាកដ ​2 keys មាន
- Redeploy ម្ដងទៀត

### "Email not confirmed"  ពេល Sign In
→ បើក Inbox / Spam → រក​ Email ពី Supabase → ចុចតំណ Verify

### ចង់ **បិទ Email Confirmation** (សម្រាប់ test លឿន)
→ Supabase Dashboard → **Authentication** → **Providers** → **Email** → uncheck **Confirm email** → Save

### "row level security policy violation"
→ Schema SQL មិន​ដំណើរការ​ត្រឹមត្រូវ។ Re-run `supabase/schema.sql` ម្ដងទៀត

---

## 📊 តើ​ Data របស់ខ្ញុំ​ស្ថិត​នៅ​ឯណា?

Supabase Dashboard → **Table Editor** → **workspaces**

អ្នក​នឹង​ឃើញ​ 1 row per user មាន column `data` ដែលផ្ទុក state ទាំងមូលជា JSON ​​(jobs, customers, vehicles, parts, ល.)។

ដើម្បីបម្រុងទុក: SQL Editor → `select * from workspaces;` → Export CSV
