# DAWG Clothing

DAWG Clothing is a premium editorial fashion storefront built on React, TypeScript, Vite, Cloudflare, and Supabase.

**Brand motto:** “Success is earned & not given.”  
**Philosophy:** Drive. Ambition. Work. Growth.

> This implementation is on the feature branch `feature/dawg-clothing-commerce`. The repository's `main` branch still contains the existing DAWG community application. Do not merge or deploy the clothing store over the current application until the intended product direction is confirmed and the pull request is reviewed.

## Current scope

- Responsive storefront and navigation.
- Homepage editorial hero, brand story, collection browsing, shop, product detail pages, and local shopping bag.
- Supabase Auth sign-up, sign-in, and password-reset entry points.
- Supabase-backed catalogue and role-gated product/collection management.
- Product image upload to the `product-media` bucket.
- Additive commerce schema and restrictive RLS policies.
- Initial collection records: KENN, GRIT, IVY, ROAM, HOWL.
- Architecture and launch blockers: [docs/DAWG-CLOTHING-ARCHITECTURE.md](docs/DAWG-CLOTHING-ARCHITECTURE.md).

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` to the actual DAWG Supabase project URL.
4. Set `VITE_SUPABASE_ANON_KEY` to the publishable key (or legacy anon key).
5. Run `npm run dev`.
6. Run `npm run typecheck`.
7. Run `npm run build`.

Never place a Supabase `service_role` or secret key in a `VITE_` variable. Values prefixed with `VITE_` are exposed to the browser.

## Cloudflare

This project uses the Cloudflare Vite plugin and Wrangler configuration.

- Build: `npm run build`
- Deploy: `npx wrangler deploy`
- Local dev: `npm run dev`

Use a preview deployment first. Configure the actual deployed origin in Supabase Auth Site URL and allowed redirect URLs before testing verification and password recovery.

## Database and access

The migrations in `supabase/migrations/` add the commerce schema and RLS policies. They have been applied to the configured DAWG Supabase project. Staff access is controlled by `public.staff_roles`; customers must not be able to self-assign roles. The owner role must be granted through a trusted administrative session after the owner account exists.

## Important: not ready to take live orders

No payment provider is configured or verified. The bag does not collect money or create paid orders. Do not launch live commerce until a trusted server-side checkout, authoritative pricing, atomic stock reservation, provider sandbox testing, signed/idempotent webhook verification, refund reconciliation, shipping rules, fulfilment, transactional emails, and policy review are complete.

Do not invent products, pricing, reviews, stock claims, shipping promises, or customer/order records. See the architecture document for evidence and remaining work.
