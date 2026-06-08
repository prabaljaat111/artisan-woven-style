## Goal
Turn the existing admin + storefront into a tight Shopify/WooCommerce-style flow: rock-solid inventory, real discounts, clear order lifecycle, and fast/in-sync storefront — without slowing the site.

## Current state (already done — won't rebuild)
- Products, variants, categories, orders, order items, coupons, customers, reviews, leads, shipments, 15+ settings pages
- Admin bulk actions, per-size variant matrix, image management
- Realtime sync admin ↔ storefront via `postgres_changes` on products/variants
- Razorpay + Shiprocket integrations
- RLS hardened, admin gate via `user_roles` + `has_role()`

## Phased plan

### Phase 1 — Inventory & stock alerts (ship first)
**Backend (1 migration)**
- Add `low_stock_threshold` (int, default 5) to `products`
- Add `track_inventory` (bool, default true) — admin can disable for made-to-order
- Trigger: when `products.stock` drops at/below threshold, insert a row into new `stock_alerts` table (product_id, level: 'low' | 'out', notified_at)
- `stock_alerts` table + RLS (admin-only read/write)

**Frontend**
- Storefront: hide/grey "Add to cart" + show "Out of stock" badge when `track_inventory && stock = 0`
- PDP: disable size buttons whose variant stock = 0 (data already in `product_variants`)
- Admin dashboard: "Low stock" widget on `/admin` listing alerts
- Admin products list: red/amber row tinting already partial — extend to use `low_stock_threshold` instead of hardcoded 10

### Phase 2 — Discounts & promotions
**Backend (1 migration)**
- Extend `coupons`: `applies_to` ('all' | 'category' | 'product'), `target_ids uuid[]`, `usage_limit int`, `used_count int`, `per_user_limit int`, `first_order_only bool`, `free_shipping bool`
- New server fn `validateCoupon({ code, subtotal, items, user_id })` — single source of truth, used by checkout + cart preview
- Update `createOrder` to call `validateCoupon`, increment `used_count`, enforce limits
- Admin coupons page: add new fields + usage counter

**Frontend**
- Cart: live coupon preview (apply → see discount before checkout)
- "Auto-applied" discount banner when threshold met (e.g. free shipping > ₹999)

### Phase 3 — Order workflow
**Backend (1 migration)**
- `order_events` table (order_id, event_type, note, actor_id, created_at) — full timeline
- Trigger: log every `orders.status` / `payment_status` change
- Add `refunded_amount`, `refund_reason`, `cancelled_reason`, `internal_notes` to orders

**Frontend (admin)**
- Order detail drawer: status stepper (Pending → Confirmed → Packed → Shipped → Delivered), one-click transitions, refund button, cancel button, internal notes, full event timeline
- Bulk actions on orders list (mark confirmed, export CSV, print invoices)
- Customer-facing invoice PDF (print view, no new dep)

### Phase 4 — Storefront performance & sync
**Performance**
- Convert `listPublishedProducts` to return a **trimmed list shape** (no description, no per-variant data) for `/shop` and category pages — full data only on PDP via `getProductBySlug` serverFn
- Add HTTP cache headers (`s-maxage=60, stale-while-revalidate=300`) on list endpoints
- Lazy-load below-the-fold images (`loading="lazy"`, `decoding="async"`), explicit width/height to kill CLS
- Replace per-page realtime subscription with a **single** root-level channel + React Query cache invalidation (currently every page re-subscribes)
- Image transform: hand off Supabase storage URLs through `?width=...&quality=75` for thumbs

**Sync correctness**
- Debounce realtime invalidations (250ms) to coalesce bulk admin edits
- On admin save, optimistic update + server confirm (already partly there)

## Tech notes
- All schema changes via migration tool, with `GRANT` + RLS scoped to admin or owner.
- Server fns under `src/lib/*.functions.ts`; admin client loaded inside handler via `await import(...)`.
- No new deps; uses existing React Query + Supabase realtime.
- Storefront list payload target: < 8 KB gzipped for 50 products.

## Out of scope (call out for later)
- Email notifications on stock alerts (needs Resend connector — ask before adding)
- Multi-warehouse inventory
- Abandoned cart recovery
- Customer accounts UI overhaul

## Suggested next step
Approve this plan and I'll start **Phase 1 (Inventory & stock alerts)** — one migration + the storefront/admin UI wiring. Each phase ships independently so you can test before moving on.
