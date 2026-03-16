# Using Supabase Instead of CSV Files

This guide walks you through replacing the CSV files used by all three dashboards with a single **Supabase** database. No prior Supabase experience required.

---

## What is Supabase?

**Supabase** is a free cloud database that gives you:

- A **spreadsheet-like table editor** in your browser (no SQL knowledge required to add rows)
- An **automatic API** — the app reads your data from it without any backend code
- **Access control** so only your app can read the data

You'll create one Supabase project, add three tables (one per dashboard), and paste two values into a config file. The app keeps working with your CSV files if Supabase isn't set up.

---

## Step 1: Create a Supabase account and project

1. Go to **[supabase.com](https://supabase.com)** and click **Start your project** (sign up with GitHub or email — it's free).
2. Click **New project**.
3. Fill in:
   - **Name**: `finconsolidated` (or anything you like)
   - **Database password**: make one up and save it somewhere — you won't need it often
   - **Region**: pick the one closest to you
4. Click **Create new project** and wait about 60 seconds for it to finish loading.

---

## Step 2: Create the tables

In the Supabase dashboard, click **SQL Editor** in the left sidebar. You'll paste SQL into the editor and click **Run**. Do this once for each block below.

> **Important:** When copying the code blocks, copy only the SQL lines — do **not** include the ` ```sql ` line at the top or the ` ``` ` line at the bottom. Those are just formatting markers, not SQL. Start your selection from `create table` and end on the last line with a semicolon.

### Table 1 — Cashflow invoices

This replaces `Cashflow/db.csv`.

```sql
create table if not exists cashflow_invoices (
  id             uuid        primary key default gen_random_uuid(),
  invoice_number text        unique,
  client         text        not null,
  status         text        not null default 'SENT',
  issue_date     date,
  due_date       date        not null,
  billing_period text,
  amount         numeric     not null,
  group_code     text,
  payment_terms  integer,
  version        integer,
  revised        boolean     default false,
  created_at     timestamptz default now()
);

alter table cashflow_invoices enable row level security;
create policy "Allow read for anon" on cashflow_invoices for select using (true);
```

**Before importing your CSV**, you need to clean two columns:

- **Amount** — the CSV has values like `$ 8,700.00` (with a dollar sign and spaces). Remove the `$`, commas, and spaces so it becomes `8700.00` before importing.
- **Dates** — the CSV has dates like `Mar 03, 2026`. Supabase ideally wants `2026-03-03` (year-month-day), but **try importing as-is first** — Supabase is often smart enough to parse this format automatically. If the import fails or dates show up blank, convert them in Google Sheets:
  1. Add a blank column next to the date column
  2. Paste this formula in the first data row (replace `D2` with your actual cell):
     `=RIGHT(D2,4)&"-"&TEXT(MATCH(LEFT(D2,3),{"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"},0),"00")&"-"&MID(D2,5,2)`
  3. Drag it down to fill all rows — you should see `2026-03-03` style values
  4. Select that column → **Copy** → **Paste Special → Values only**
  5. Delete the original date column
  6. Repeat for each date column (Issue Date, Due Date)

To **import your existing data**, first open the CSV in Google Sheets and rename the header row (row 1) so it matches the table column names exactly — Supabase won't accept it otherwise. Also delete the `Created At` column (the table fills that in automatically).

| Rename this header | To this |
|---|---|
| Invoice Number | invoice_number |
| Client Name | client |
| Status | status |
| Issue Date | issue_date |
| Due Date | due_date |
| Billing Period | billing_period |
| Total Amount | amount |
| Group Code | group_code |
| Payment Terms (Days) | payment_terms |
| Version | version |
| Revised | revised |
| Created At | *(delete this column)* |

Then **File → Download → Comma Separated Values (.csv)** and import that file.

In the Supabase dashboard open **Table Editor** → `cashflow_invoices` → **Import data from CSV**.

---

### Table 2 — Net Income financial metrics

This replaces `Net Income Project/src/assets/data.csv`. The CSV is a multi-company P&L report; these three tables store the same data in a clean row-by-row format.

```sql
create table if not exists net_income_metrics (
  id           uuid    primary key default gen_random_uuid(),
  company      text    not null,
  metric_key   text    not null,
  period_label text    not null,
  value        numeric not null,
  created_at   timestamptz default now(),
  unique (company, metric_key, period_label)
);

create table if not exists net_income_hc_projected (
  id           uuid    primary key default gen_random_uuid(),
  period_label text    not null unique,
  value        numeric not null,
  created_at   timestamptz default now()
);

create table if not exists net_income_variance (
  id           uuid    primary key default gen_random_uuid(),
  period_label text    not null unique,
  value        numeric not null,
  created_at   timestamptz default now()
);

alter table net_income_metrics    enable row level security;
create policy "Allow read for anon" on net_income_metrics    for select using (true);
alter table net_income_hc_projected enable row level security;
create policy "Allow read for anon" on net_income_hc_projected for select using (true);
alter table net_income_variance   enable row level security;
create policy "Allow read for anon" on net_income_variance   for select using (true);
```

**How to fill `net_income_metrics`:** one row per company + metric + month. Example rows:

| company | metric_key | period_label | value |
|---|---|---|---|
| CONSOLIDATED | totalIncome | January-26 | 150000 |
| CONSOLIDATED | cogs | January-26 | 40000 |
| Ryz Labs HC LLC | grossProfit | February-26 | 95000 |

Valid `metric_key` values: `totalIncome`, `cogs`, `grossProfit`, `totalExpenses`, `operatingIncome`

`period_label` format: `Month-YY` (e.g. `January-26`, `February-26`)

---

### Table 3 — GP Analysis talent pool

This replaces `GP Analysis/talent-pool.csv`.

```sql
create table if not exists talent_pool (
  id             uuid    primary key default gen_random_uuid(),
  candidate_name text,
  role           text,
  company        text,
  rate           numeric,
  actual_cost    numeric,
  net_margin     numeric,
  rate_type      text,
  start_date     date,
  hire_date      date,
  end_date       date,
  status         text,
  month          text,
  created_at     timestamptz default now()
);

alter table talent_pool enable row level security;
create policy "Allow read for anon" on talent_pool for select using (true);
```

**Before importing your CSV**, clean the dates the same way as Cashflow (convert to `YYYY-MM-DD`). The `month` column (`01/23`) can be imported as-is.

To import: **Table Editor** → `talent_pool` → **Import data from CSV** and map columns by name.

---

## Step 3: Get your two API keys

1. In the Supabase dashboard, click the **gear icon (Settings)** in the bottom-left → **API**.
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string under "Project API keys"

You'll paste them in the next step.

---

## Step 4: Connect the app

1. In the project root folder, find the file named **`.env.example`** and make a copy of it named **`.env`** (just remove the word "example").

   > **Note:** `.env` files are hidden by default on Mac. In Finder, press **Cmd + Shift + .** to show hidden files.

2. Open `.env` in any text editor and fill in your two values:

   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_URL.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
   ```

3. Save the file, then restart the dev server:

   ```
   npm run dev
   ```

The app will now load **Cashflow** and **Net Income** data from Supabase. If the env vars are missing or wrong, both dashboards automatically fall back to the local CSV files.

---

## Step 5: Connect GP Analysis

GP Analysis is a self-contained HTML page. To connect it to Supabase, add these two lines inside the `<head>` of `GP Analysis/index.html`, right before any other `<script>` tags:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script>
  window.__SUPABASE_URL__ = 'https://YOUR_PROJECT_URL.supabase.co'
  window.__SUPABASE_KEY__ = 'your_anon_public_key_here'
</script>
```

Once those are in place, the page can call Supabase directly and replace the `window.TALENT_POOL_CSV` variable — no build step needed. The existing `update-data.js` script (which generates `data.js` from a local CSV) can stay as a manual fallback if you ever need it offline.

---

## Security note

The "allow read for anon" policies let anyone who has your anon key **read** the data. Since this app already has a password gate, that's acceptable. The anon key is safe to include in the frontend — it can only read, never write or delete.

If you ever want to lock it down further, you can add a **Supabase Auth** check to the RLS policies (ask your developer).

---

## Summary

| Dashboard | Was reading from | Now reads from |
|---|---|---|
| Cashflow | `Cashflow/db.csv` | `cashflow_invoices` |
| Net Income | `Net Income.../data.csv` | `net_income_metrics`, `net_income_hc_projected`, `net_income_variance` |
| GP Analysis | `GP Analysis/data.js` (generated from CSV) | `talent_pool` (via Supabase CDN in `index.html`) |

**Checklist:**
- [ ] Created Supabase project
- [ ] Ran all three SQL blocks in SQL Editor
- [ ] Cleaned and imported CSV data into each table
- [ ] Copied `.env.example` → `.env` and filled in URL + key
- [ ] Restarted dev server and confirmed dashboards load
- [ ] Added Supabase CDN script to `GP Analysis/index.html`
