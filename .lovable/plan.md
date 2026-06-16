# Admin Panel Production Hardening

~4,200 lines of admin code spanning Products, Orders, Customers, Leads, Coupons, Categories, Reviews, Shipments + 20 settings pages. "Sab kuch ek saath" karne se regressions aayenge — isliye 4 prioritized passes mein karunga. Aap har pass ke baad test kar sakte ho.

## Pass 1 — Products (highest impact)
**File:** `admin.products.tsx` (528 lines), `admin.functions.ts`
- Server-side validation (zod) on create/update/delete — currently mostly client-trusted
- Image upload: progress, size/type validation, cleanup on cancel, delete-from-storage on remove
- Variants: SKU uniqueness check, stock sync verification, bulk edit
- Listing: pagination (currently loads all), search debounce, column sorting, bulk delete/publish
- Low-stock badge + filter, draft/published toggle, duplicate product action
- Confirm dialogs on destructive actions, toast on every mutation
- Loading skeletons, empty states, error boundaries

## Pass 2 — Orders & Shipments
**Files:** `admin.orders.tsx`, `admin.shipments.tsx`, `orders.functions.ts`, `shiprocket.functions.ts`
- Status workflow: pending → confirmed → packed → shipped → delivered with valid transitions only
- Payment status sync (Razorpay webhook reconciliation check)
- One-click Shiprocket push for prepaid orders + retry on failure with error display
- AWB/tracking auto-pull, courier selection UI
- Order detail drawer (items, address, timeline, notes)
- Filters: status, date range, payment method, search by order#/email/phone
- CSV export, print invoice, refund flow (mark refunded + notes)
- Pagination + sort

## Pass 3 — Customers, Leads, Reviews
- **Customers:** list with order count/LTV, role toggle (admin/customer) with confirm, search, ban flag
- **Leads:** status pipeline (new → contacted → converted/lost), assign, notes, dedupe by email/phone
- **Reviews:** approve/reject/reply, spam flag, bulk moderation, rating filter

## Pass 4 — Coupons, Categories, Settings polish
- **Coupons:** usage counter, per-user limit, expiry warnings, activate/deactivate toggle
- **Categories:** drag-reorder, image, parent/child if needed, slug auto-gen, product-count guard on delete
- **Settings:** consolidate scattered pages, add "unsaved changes" guard, validation, defaults

## Cross-cutting (applied throughout)
- Replace ad-hoc try/catch with consistent toast + log pattern
- All mutations → optimistic update + invalidate query keys
- All list queries → pagination + zod-validated filters
- All destructive actions → AlertDialog confirm
- Add admin audit log table (who did what, when) — single migration
- Tighten RLS / GRANTs audit on every admin-touched table

## Technical Approach
- Server fns: `requireAdmin` middleware on every mutation (some currently use plain `requireSupabaseAuth`)
- Add `audit_log` table via migration
- React Query: standardize keys `["admin", entity, filters]`, invalidate after mutations
- Forms: react-hook-form + zod schemas shared between client+server
- Tables: TanStack Table for sort/pagination/selection (already in deps)

## Deliverable order
I'll execute **Pass 1 (Products)** first, ship it, you test, then move to Pass 2. Each pass = 1 message with the migrations + code changes + a short test checklist.

**Confirm karo:** Pass 1 (Products) se shuru karu? Ya koi specific area pehle chahiye?
