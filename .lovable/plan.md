## Goal

Turn `/admin/settings` into an enterprise control room with sidebar navigation, in-settings search, and 18 modules. Build the shell + wired modules first; flag the rest as "Coming soon" so the experience is honest while we layer in real backends.

## Architecture (built once, reused by every module)

- New layout route `src/routes/admin.settings.tsx` becomes a layout (renders `<Outlet />`) with:
  - Left sidebar: 18 grouped sections, collapsible on mobile, icon + label.
  - Top bar: search across module + field titles (filters sidebar live).
  - Each module is its own file route: `admin.settings.general.tsx`, `admin.settings.website.tsx`, etc. → deep-linkable, fast, code-split.
- All persisted values live in existing `app_settings` table keyed by module (`general`, `website.hero`, `payment.razorpay`, ...). One Zod schema per module; one server fn pair `getSetting(key)` / `saveSetting(key, value)` already half-exists in `admin.functions.ts` — I'll extend it.
- Every field renders with a small `<Field>` wrapper that shows the label, inline help text ("Clear explanations for every setting" — your requirement), and validation errors.

## Phase 1 — Shell + first wired modules (this turn)

Ships a real, navigable Settings with these working:

1. **General** — store name, contact email/phone, address, GSTIN, social links (read/write `app_settings.general`). Logo + favicon upload to existing `product-images` bucket folder `brand/`.
2. **Payment** — Razorpay key id/secret status (read from existing secrets, mask), Stripe placeholder (disabled), COD on/off toggle.
3. **Shipping** — Shiprocket credential status (read from secrets), free-shipping threshold, default weight.
4. **WhatsApp** — number + welcome/order/lead message templates (read/write `app_settings.whatsapp`). ChatWidget already reads from here.
5. **SEO** — global title suffix, default meta description, default OG image, robots.txt toggle (sitewide noindex). Per-page SEO continues to live in route `head()`.
6. **Marketing → Coupons** — link to existing `/admin/coupons` page (no rebuild).
7. **Inventory** — low-stock threshold, out-of-stock behavior (hide / show "Out of stock" / allow backorder).
8. **Notifications** — admin email recipients for new orders / new leads / low stock / failed payments. Wired into existing order + lead creation paths.
9. **Security** — list admins (read `user_roles`), promote/demote (write). 2FA + activity log shown as "Coming soon".
10. **Analytics** — paste GA4 ID, GTM ID, Meta Pixel ID; injected into `__root.tsx` head when set.

## Phase 2 — Backed but bigger (next turn)

11. **Website → Homepage** — hero banners CMS (drag-reorder, image, headline, CTA URL); promo bars; featured collection picker. Replaces hardcoded `HeroSlider` data with `app_settings.homepage`.
12. **Website → Footer & Nav** — footer column editor, nav menu editor.
13. **Product Settings** — default status, SKU rule, size master list, color master list (used by variant matrix).
14. **Order Settings** — order status workflow toggles, cancellation window, return window, invoice prefix.
15. **Customer Settings** — registration enabled, OTP enabled (Phone provider), wishlist on/off.
16. **Email Settings** — template editor for order confirmation / shipped / welcome / abandoned cart. Uses Lovable email infra (already on).
17. **Lead Management** — sources list, auto-assign rule, status workflow.

## Phase 3 — Needs new infrastructure (clearly flagged "Coming soon" everywhere it appears)

- Reward points, referral program, loyalty, flash sales scheduler, abandoned cart recovery automation, BI reports beyond the existing dashboard, full activity audit log, 2FA, automated backups, customer groups, AWB management beyond current Shiprocket tracking.

These will show a polished placeholder card with what's needed to enable them, so the menu is complete but no one is misled.

## Technical detail (the build itself)

```text
src/routes/
  admin.settings.tsx              ← layout (sidebar + search + Outlet)
  admin.settings.index.tsx        ← redirect → /admin/settings/general
  admin.settings.general.tsx
  admin.settings.website.tsx      (Phase 2)
  admin.settings.product.tsx      (Phase 2)
  admin.settings.inventory.tsx
  admin.settings.order.tsx        (Phase 2)
  admin.settings.payment.tsx
  admin.settings.shipping.tsx
  admin.settings.customer.tsx     (Phase 2)
  admin.settings.marketing.tsx
  admin.settings.whatsapp.tsx
  admin.settings.email.tsx        (Phase 2)
  admin.settings.seo.tsx
  admin.settings.analytics.tsx
  admin.settings.leads.tsx        (Phase 2)
  admin.settings.security.tsx
  admin.settings.notifications.tsx
  admin.settings.backup.tsx       (Phase 3 placeholder)
  admin.settings.reports.tsx      (links to existing dashboard + Phase 3 placeholder)
src/components/admin/
  SettingsShell.tsx               (sidebar + search)
  SettingsField.tsx               (label + help + error)
src/lib/
  settings.functions.ts           (getSetting / saveSetting with per-module Zod schemas)
```

`useStorefrontProducts` already gives the storefront live admin data; once homepage CMS lands in Phase 2 the public site reads `app_settings.homepage` the same way.

## What I need from you

Confirm:
1. Build **Phase 1 now** (10 wired modules + shell)? OR
2. Different starting subset — tell me which modules matter most for launch and I'll prioritise those instead?

Anything I list as Phase 3 won't be built as fake UI — say if you'd rather I skip it from the sidebar entirely until the backend exists.