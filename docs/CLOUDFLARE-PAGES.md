# DAWG Clothing — Cloudflare Pages

- Cloudflare Pages project: `dawg-clothing`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Required build-time environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

The Supabase anon/publishable key is intended for browser use; never configure a Supabase service-role key in frontend build variables. Before accepting real orders, configure and test the payment provider, server-side payment verification/webhooks, transactional emails, shipping/tax rules, and fulfilment workflow. A successful static deployment alone does not establish production commerce readiness.
