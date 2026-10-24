# DAWG Clothing — implementation architecture and launch status

## Scope and baseline

Repository: `officialdawg25-ai/DAWG`  
Implementation branch: `feature/dawg-clothing-commerce`  
Framework: React 19 + TypeScript + Vite 7  
Hosting configuration: Cloudflare Vite plugin / Wrangler Worker assets  
Existing auth client: `@supabase/supabase-js` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The pre-existing `main` branch is a DAWG community/social experience. The clothing storefront work is isolated on a feature branch so it does not replace the existing app without review. The DAWG Supabase project `lypynfozdnlmaaxmvrev` was active and had no public tables at baseline.

## Implemented in this branch

- Premium monochrome editorial storefront for DAWG Clothing, with the brand motto and the Drive / Ambition / Work / Growth philosophy.
- Homepage, shop, collection concepts, brand story, product detail, persistent local shopping bag, account entry points, and restricted administration route.
- Existing Supabase Auth client reused for sign-up, sign-in, and password reset.
- Supabase-backed catalogue reads and administrator product/collection create/edit workflows.
- Product image upload to the `product-media` storage bucket, with file-type and 8 MB size validation.
- Additive SQL migration for profiles, staff roles, collections, products, variants, product media, customer addresses, orders, order items, order status events, discounts, store settings, and audit logs.
- RLS enabled on every table introduced by the migration. Store staff access is based on `staff_roles`, not user-editable user metadata.
- Storage write policies restrict product image writes to staff roles.
- No client-side insert/update policies for orders or payment state. This intentionally blocks pretending that a browser checkout is a verified transaction.
- Explicit empty catalogue states and clear payment/shipping configuration warnings.

## Data flow

1. The React client uses the existing Supabase publishable/anon key only.
2. Public catalogue queries are restricted by RLS to active, published products and active collections.
3. Staff catalogue queries are allowed only when the signed-in user has a row in `staff_roles` with an eligible role.
4. Product media is stored in the `product-media` bucket. Public reads are allowed because product photos are intended for public display; upload/update/delete are staff-only.
5. Orders, order items, payment records/events, inventory reservations, and webhook verification must be mediated by a trusted server-side checkout/payment integration. That integration is not enabled in this implementation; the UI does not collect payment or create orders.

## Migration

Migration file: `supabase/migrations/20261024090000_dawg_commerce_foundation.sql`

It was applied to the configured DAWG Supabase project through the connected Supabase tool. It is additive and does not delete or rewrite existing user data. The migration creates the five initial collection records (KENN, GRIT, IVY, ROAM, HOWL), but does not create fake products or orders.

## Initial staff access

No administrator is created automatically. After creating the intended owner account through Supabase Auth, an authorised project owner must assign that account an explicit row in `public.staff_roles` using the Supabase dashboard or an authorised administrative SQL session. Do not allow users to self-assign roles, and do not expose service-role credentials in the frontend.

## Known limitations / not yet launch-ready

- No verified PayFast or other payment-provider integration, server-side checkout, webhook signature verification, replay protection, refund processing, or reconciliation.
- No order creation or payment-state transitions from the browser; no production order-processing UI yet.
- No atomic inventory reservation/decrement workflow or concurrent last-item checkout test.
- No shipping zones/rates, VAT/tax configuration, fulfilment-provider integration, or verified tracking.
- No transactional email provider configured; account confirmation depends on the Supabase Auth project configuration.
- No complete customer profile/address/order-history workflow, discount redemption engine, newsletter consent/unsubscribe workflow, CMS, or audit-event automation.
- The current catalogue editor provides a single variant per product; multi-variant management, media gallery ordering, size charts, bulk operations, scheduling, and full merchandising tools remain future work.
- No products, approved product photography, actual retail prices, sizing measurements, shipping/returns policy, or legal text were fabricated.
- The public product-variant query currently returns inventory columns needed by the client to show availability; consider replacing it with a safe public availability view or server endpoint before broad launch to avoid exposing exact stock counts.
- The product upload workflow expects the `product-media` bucket created by the migration and an authorised staff role.
- A source commit and database migration are not proof of a successful production deployment. Build/CI, preview browser journeys, and deployed URL verification still need to be completed.

## Verification evidence

- Repository and branch inspected through GitHub integration.
- Confirmed framework/package scripts from `package.json`.
- Confirmed initial empty `public` schema in Supabase before migration.
- Applied the additive commerce migration successfully.
- Queried the Supabase schema after migration and confirmed RLS is enabled on all 13 introduced commerce tables; five collections exist.\n- Reviewed Supabase Security Advisors. A pre-existing `public.rls_auto_enable()` security-definer event-trigger helper was flagged for direct EXECUTE grants; a follow-up migration revoked client EXECUTE privileges, and a throwaway public-table test confirmed the event trigger still enables RLS. The Security Advisor then returned no findings.\n- Reviewed Performance Advisors and added indexes for foreign keys. Remaining unused-index notices are expected for a newly created schema with no order/catalogue traffic yet; re-evaluate after real workload.
- Code has not yet been locally built or exercised through a browser in this session. Do not represent type checking, end-to-end tests, or a live deployment as passed until CI/browser/deployment evidence exists.

## Recommended next steps

1. Run CI on this branch and resolve type/build failures.
2. Review Supabase Security and Performance Advisors and inspect the full RLS policies.
3. Assign the owner role through a trusted administrative path and test owner versus ordinary customer permissions with separate accounts.
4. Build a trusted server-side checkout and payment integration with provider sandbox credentials before creating any paid orders.
5. Add transactional stock reservation, idempotent payment webhooks, and refund reconciliation.
6. Complete shipping, product content, customer communications, privacy/consumer policy review, and accessibility/performance tests.
7. Deploy a preview, test the complete customer/admin journey, then request explicit approval before merging or deploying to production.
