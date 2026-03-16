# Finance Consolidated

Single app that combines the **Cashflow**, **Net Income**, and **GP Analysis** dashboards with a shared login and left sidebar navigation.

## Run (development)

From the `finconsolidated` folder:

```bash
npm install
npm run dev
```

- **Password:** `!accounting123$` (same as the individual dashboards)
- **Home:** Welcome and links to each dashboard
- **Sidebar:** Switch between Home, Cashflow, Net Income, and GP Analysis. Only one view is shown at a time.

## Optional: Supabase instead of CSV

You can replace the CSV data sources with a single **Supabase** database. See **[SUPABASE.md](./SUPABASE.md)** for:

- What Supabase is and how to create a project
- SQL to create the three tables (`cashflow_invoices`, `net_income_metrics` + HC/variance, `talent_pool`)
- Where to get your Project URL and anon key
- Setting `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

When those env vars are set, **Cashflow** and **Net Income** read from Supabase; otherwise they keep using the CSV files.

## Data in dev

- **Cashflow:** Reads `Cashflow/db.csv` (served at `/db.csv` by Vite).
- **Net Income:** Reads `Net Income Project/src/assets/data.csv` (served at `/net-income-data.csv`).
- **GP Analysis:** Served from the `GP Analysis` folder at `/gp-analysis/` (e.g. `index.html`, `data.js`). Update data with `node update-data.js` or `python3 update_data.py` in the `GP Analysis` folder, then reload.

## Build for production

```bash
npm run build
npm run preview   # optional: test the build
```

For production you may need to:

1. **Cashflow:** Copy `Cashflow/db.csv` to `public/db.csv` so the built app can load it (or configure your server to serve it).
2. **Net Income:** Copy `Net Income Project/src/assets/data.csv` to `public/net-income-data.csv`.
3. **GP Analysis:** Copy the contents of the `GP Analysis` folder (at least `index.html`, `data.js`) to `public/gp-analysis/` so the iframe can load them.

Then deploy the `dist` folder (and ensure `public` assets are included in the deployment).
