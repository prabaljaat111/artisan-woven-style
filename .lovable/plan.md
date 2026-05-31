
## What the PDF gives us

The proposal contains concrete, applyable content (not just vibes). Filtering out pricing/agency notes, the useful pieces are:

1. **Full Size Guide** — Top Wear (XS–3XL), Plus Size (4XL–7XL), Bottom Wear table, fit rules ("relaxed = bust + 4in"), measurement instructions, bottom length guide.
2. **Real social handles** — Instagram `@indian_handicraft_standards`, Facebook share link, YouTube `@indianhandicraftstandards8147`.
3. **Brand story / trust signals** — Founded 2015, paused, restarting; 10,000+ customers via Amazon/Flipkart; old seller rating 4.2, product rating 4.1; sourced from IndiaMART.
4. **Amazon cross-listings** — 4 ASIN links (B0H2MVW5B9, B0H2MCF4X7, B0H2K5ZCNN, B0H2DCZ1CL) to display as "Also available on Amazon".
5. **Categories confirmation** — kurti, kurta set, palazzo, sharara, garara, unstitched suits, sarees, short tops, noodle strap tops, tunics, pants, budget/mid/premium tiers (already match `categories` in `src/data/products.ts` ✅).
6. **Design intent** — 95% mobile-first; product thumbnails shaped like Taj Mahal / Imambara / Clock Tower (already implemented as `clip-taj`/`clip-arch`/`clip-clocktower` ✅).
7. **FAQ source** — modeled on poshakchikanstudio FAQs (shipping, returns, sizing, care, handmade variation).

Pricing, hosting, delivery-time and agency proposal lines are dropped — not site content.

## Plan

### 1. New `/size-guide` route (biggest content gap)
Create `src/routes/size-guide.tsx` with:
- TOP WEAR table (XS–3XL: bust/waist/hip)
- PLUS SIZE table (4XL–7XL)
- BOTTOM WEAR table (waist/hip/inseam) + length guide (palazzo ~38in, pant ~36in)
- "Understand the fit" block (fitted = +2in, relaxed = +4in, example with 36in bust)
- "How to measure" block (bust / waist / hip with the 8-inch hip rule)
- Important tips list (handmade variation, size up if between sizes, etc.)
- All measurements stated as inches, garment-flat
- Link from product page ("Size guide"), footer Policies column, and FAQ.

### 2. Footer + Contact: real social + Amazon
- Replace placeholder socials in `Layout.tsx` footer with the three real URLs (Instagram, Facebook, YouTube).
- Add a small "Also on Amazon" row linking the 4 ASIN URLs (icon + short label).
- Update `contact.tsx` to surface the same socials.

### 3. About page: real brand story
Rewrite `src/routes/about.tsx` to lead with:
- "Indian Handicraft Standards — championing Lucknowi Chikankari since 2015."
- The restart narrative (paused, returning with the same name).
- Trust metrics: **10,000+ customers** served on Amazon/Flipkart, **4.2★** seller rating, **4.1★** product rating (clearly marked as historical marketplace ratings).
- Sourcing line (Lucknow karigars, IndiaMART verified).

### 4. Trust strip on home + product page
Add a thin trust bar (icons + numbers) used on home and PDP:
`10,000+ Happy Customers · Since 2015 · Worldwide Shipping · Handmade in Lucknow`.

### 5. FAQ rewrite
Replace generic FAQs in `src/routes/faq.tsx` with a poshakchikanstudio-style set covering: order tracking, shipping timelines (domestic/international), returns & exchange, custom sizing, fabric care (Chikankari hand-wash), color/measurement variation disclaimer (handmade), bulk/wholesale enquiries, and how to contact (WhatsApp + the three socials).

### 6. Product page polish
- Add "Size guide" link beside the size selector → opens `/size-guide`.
- Add "Handmade — slight variation may occur" microcopy (per PDF tip).

### Out of scope (intentionally not doing)
- Cloning poshakchikanstudio's actual product catalog (legal/IP — current sample catalog stays).
- Live chatbot backend (the WhatsApp + chat widget already cover the "100 queries" need; a real bot needs Cloud + AI gateway — can be a follow-up if you want).
- Hosting/domain/agency-pricing content from the proposal.

### Technical notes
- Pure frontend changes; no Cloud / DB required.
- New route file follows TanStack flat routing (`size-guide.tsx`) with proper `head()` meta + `errorComponent` / `notFoundComponent`.
- Size-chart tables use the existing emerald `--primary` token for headers (matches the PDF's `#2F5A53` header style ≈ current theme).
- Footer/About edits stay inside `Layout.tsx` / `about.tsx`; no token or routing changes.

Ready to switch to build mode and implement.
