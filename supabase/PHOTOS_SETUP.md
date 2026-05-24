# Job Photos · Supabase Storage Setup

ការ​បន្ថែម​មុខងារ **រូបភាព លើ Job Card** ត្រូវការ Supabase Storage bucket។

## ជំហាន​ដំឡើង

### 1. ដំណើរការ SQL ​ដែល​បាន​បន្ថែម

​បើក **Supabase Dashboard → SQL Editor** ​ហើយ run `supabase/schema.sql` ​ទាំង​មូល​ម្ដង​ទៀត។ SQL script ​នេះ​នឹង​បង្កើត:

- bucket ឈ្មោះ `job-photos` (public read)
- 4 policies ​នៅ​លើ `storage.objects`:
  - **Anyone can read** — រូបភាព​អាច​បង្ហាញ​នៅ​ផ្ទាំង app ​បាន
  - **Users can upload to their own folder** — user តែ​ម្នាក់​ប៉ុណ្ណោះ​ដែល​អាច upload ​ទៅ​ folder ​ខ្លួន​ឯង
  - **Users can update / delete their own job photos** — user តែ​ម្នាក់​ប៉ុណ្ណោះ​ដែល​អាច​លុប

### 2. ផ្ទៀង​ផ្ទាត់

ដំណើរការ​ command នេះ​ក្នុង SQL Editor ​ដើម្បី​ផ្ទៀង​ផ្ទាត់:

```sql
select id, name, public from storage.buckets where id = 'job-photos';
```

​ត្រូវ​ឃើញ:
```
id          | name        | public
job-photos  | job-photos  | true
```

### 3. សាក​ប្រើ

1. ​ចូល Garage OS ​ហើយ Sign in
2. ​បើក Job Card ​ណា​មួយ
3. ​ចុះ​មក​ត្រឹម section **"រូបភាព · PHOTOS"**
4. ​ជ្រើស category (Before / After / Other)
5. ​ចុច **"ដាក់​រូបភាព"** ​ហើយ​ជ្រើស​រូប

## ការ​កំណត់

- **Max file size**: 8 MB / រូប
- **Supported types**: JPEG, PNG, WebP, HEIC
- **Path layout**: `{user_id}/{job_id}/{random_id}.{ext}`
- **Photos persist**: ​នៅ​ក្នុង workspace JSON blob (URL ​តែ​ប៉ុណ្ណោះ) + ​ឯកសារ​ពិត​ប្រាកដ​នៅ​ Storage bucket

## មាន​បញ្ហា?

- **"not-configured"** → `.env` ​ខ្វះ `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- **"not-signed-in"** → ​លោក​មិន​ទាន់ sign in (in-memory mode មិន​អាច upload ​ទេ)
- **"row violates RLS policy"** → policies ​មិន​បាន​ដំឡើង​ត្រឹមត្រូវ; ដំណើរការ schema.sql ​ម្ដង​ទៀត
