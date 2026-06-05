This request spans ~6 major feature areas. To ship reliably I'll split it into focused phases. Quick wins go first; deep CMS work is staged so each phase is testable in isolation.

## Phase A — Quick wins (this turn)
1. **Footer Amazon section** — replace 4 category buttons with one premium "Shop on Amazon" CTA linking to the main IHS Amazon store (new tab, `rel="noopener noreferrer"`).
2. **Logo tagline contrast** — change "Chikankari • Lucknow" to a dark high-contrast token (`text-primary` / `text-foreground`) on both desktop & mobile header.
3. **Stock badges on product cards & PDP** — using existing `products.stock` column:
   - "Out of Stock" when 0
   - "Only N left" when 1–10
   - In-stock otherwise
   Mobile-friendly, semantic colors.

## Phase B — Per-size inventory (DB + UI)
4. New `product_variants` table: `product_id, size, color, stock, sku` + RLS (admin write, public read of published parents). Migration grants + policies.
5. PDP size selector reads variant stock; disables sold-out sizes with "Out of Stock" label; shows "Only N left" per size.
6. Admin product drawer: inline variant matrix editor (size × color → stock + SKU).
7. Cart add blocks when selected variant stock = 0; decrements logical availability at order time.

## Phase C — Real-time sync
8. Enable Supabase Realtime on `products`, `product_variants`, `categories`, `app_settings`.
9. Wrap product/category queries in TanStack Query with channel subscriptions that call `queryClient.invalidateQueries` on changes — homepage, shop, category, PDP refresh live.

## Phase D — Admin upgrades
10. Dashboard tiles: Products / Orders / Revenue / Customers / Leads / Low-stock count (single server fn aggregating counts).
11. Product list: filters (category, stock status, published, bestseller, new), bulk select → bulk publish/unpublish, bulk price %, bulk category.
12. Product detail page (`/admin/products/$id`) with sections: Overview, Images (drag-reorder), Pricing (with margin calc using new `cost_price` column), Inventory matrix, SEO (slug/title/description/og_image), Performance (orders+revenue from `order_items`), Reviews, Quick actions (duplicate, archive, delete).
13. Low-stock alerts panel on dashboard.

## Phase E — Deferred (will call out, not build this round)
- CSV bulk product upload (needs file-upload UX + parser)
- Per-product view/cart/wishlist analytics counters (needs new tracking events table + client beacons)
- Homepage banner / testimonials / FAQ CMS (currently hard-coded — sizeable schema work)
- Newsletter & WhatsApp lead sources (no current capture surfaces)

These are real work (multi-day) and bolting them on quickly would create half-broken admin screens. I'll list them in the final report with clear next-step proposals rather than shipping shells.

## Order of execution
A → B → C → D, with the dev server staying green between phases. After each phase I'll verify in preview (footer click, size selector behavior, realtime tab test, admin flows).

## Technical notes
- Variants table keeps `products.stock` as a denormalized total (sum trigger) so existing card badges keep working without N+1 queries.
- Realtime: single channel per page, debounced invalidation.
- Admin detail page uses TanStack Query + server fn (`adminGetProduct`) rather than rewriting the existing drawer — drawer becomes "Quick edit".

Confirm and I'll start with Phase A immediately, then proceed through B–D autonomously, reporting at each phase boundary.
