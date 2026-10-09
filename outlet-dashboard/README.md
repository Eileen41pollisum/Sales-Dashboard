# Outlet performance dashboard

Vite (vanilla JS) app that reads the `outlet_weeks` table from Supabase.

## Run locally

```bash
npm install
cp .env.example .env     # then edit if needed
npm run dev
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New > Project**, import the repo. Vercel detects Vite automatically (build command `npm run build`, output directory `dist`).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (the publishable key)
4. Deploy.

The publishable key is meant to be public. Access is restricted by row-level security (read-only on `outlet_weeks`).

## Data

All data loading lives in `loadData()` in `src/main.js`. Outlet filter buttons are built from the outlets found in the table.
