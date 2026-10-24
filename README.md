# DAWG

DAWG is a React + TypeScript + Vite application deployed on Cloudflare Workers, with Supabase for authentication and persistent application data.

## Current foundation

- Responsive DAWG interface and navigation
- Supabase email/password sign-up and sign-in wiring (requires project environment variables)
- Cloudflare Workers/Vite deployment configuration
- No fake member counts, feed posts, or database records
- No Supabase service-role key in browser code

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `VITE_SUPABASE_URL` to your Supabase project URL.
4. Set `VITE_SUPABASE_ANON_KEY` to your publishable key (or legacy anon key).
5. Start: `npm run dev`
6. Check types: `npm run typecheck`
7. Build: `npm run build`

Never put a Supabase service_role or secret key in a VITE_ variable. VITE_ variables are exposed to the browser.

## Cloudflare Workers deployment

This repository uses the Cloudflare Vite plugin and Wrangler configuration.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Local development: `npm run dev`

Add the two Supabase values to the Cloudflare Workers Builds build environment. They are public client configuration, not secrets. Configure Supabase Auth Site URL and allowed redirect URLs to include the actual deployed DAWG origin before testing email confirmation or password recovery.

## Security and next milestones

The UI is a foundation, not a complete production platform. Before enabling community posts, messaging, profile editing or other user data:
1. Inspect the existing Supabase project and schema.
2. Design only the required tables, relationships and indexes.
3. Enable and test row-level security policies for every user-owned table.
4. Verify authorization with multiple test accounts.
5. Add moderation, abuse reporting, account deletion and privacy flows.
6. Add tests and verify deployed behavior.

Do not treat a successful frontend build as proof that backend functionality is production-ready.