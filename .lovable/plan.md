## 1. WhatsApp number — global update

Replace every occurrence of `919999999999` / `+91 99999 99999` with the new number `+91 90444 66957` (URL form: `919044466957`).

Files touched:
- `src/components/Layout.tsx` — `WHATSAPP_URL` constant
- `src/routes/contact.tsx` — WhatsApp + Call entries
- `src/routes/faq.tsx`, `src/routes/size-guide.tsx`, `src/routes/returns.tsx`, `src/routes/product.$slug.tsx`
- `src/routes/api/chat.ts` — system prompt mentions

One constant (`WHATSAPP_NUMBER` / `WHATSAPP_URL`) will be exported from a small helper (`src/lib/contact.ts`) so future changes are one-line. Display string: `+91 90444 66957`; link: `https://wa.me/919044466957`.

## 2. Search button not working

Today the header search icon is just `<Link to="/shop">`. If the user is already on `/shop`, nothing visible happens — feels broken.

Fix: replace the icon with a real **search overlay**:
- New `SearchOverlay` component inside `Layout.tsx` (controlled via `useUI` store — add `isSearchOpen`/`setSearchOpen`).
- Both header search icons (desktop + mobile) open the overlay instead of navigating.
- Overlay shows: autofocused input, live results (top 6 products matched by name/category from `products`), "View all results →" button that navigates to `/shop?q=...`.
- Pressing Enter or clicking "View all" → `navigate({ to: "/shop", search: { q } })`.
- `/shop` already reads `q` from search params, so results land filtered.
- Close on Esc / backdrop click / result click.

## 3. Product names vs images — accuracy pass

Current `src/data/products.ts` reuses some images under mismatched names (e.g. *Mint Green Sharara* uses `palazzo-cream.jpg`; *Peach Palazzo* uses the cream palazzo image; two noodle-strap items share one photo with different colour labels).

Fix approach — rename items so each product's name truthfully describes the image it shows:

| Slot | Image | Corrected name |
|---|---|---|
| Kurti #1 | kurti-white.jpg | Lucknowi Chikankari Cotton Kurti — White |
| Kurti #2 | kurti-mint.jpg | Pastel Mint Chikankari Kurti |
| Kurta Set #1 | kurta-set-ivory.jpg | Ivory Hand-Embroidered Chikankari Kurta Set |
| Kurta Set #2 | kurta-set-maroon.jpg | Maroon Festive Chikankari Kurta Set |
| Palazzo #1 | palazzo-cream.jpg | Cream Chikankari Palazzo Set with Dupatta |
| Palazzo #2 | palazzo-cream.jpg | *(remove duplicate)* |
| Sharara #1 | sharara-maroon.jpg | Royal Maroon Chikankari Sharara Set |
| Sharara #2 | palazzo-cream.jpg → **sharara-maroon.jpg** | Wine Festive Sharara Suit (re-image, not rename) |
| Garara | garara-gold.jpg | Bridal Gold Chikankari Garara Set |
| Saree #1 | saree-offwhite.jpg | Off-White Chikankari Cotton Saree |
| Saree #2 | saree-pink.jpg | Pastel Pink Georgette Chikankari Saree |
| Unstitched #1 | unstitched-beige.jpg | Beige Unstitched Chikankari Cotton Suit Piece |
| Unstitched #2 | unstitched-beige.jpg | *(remove duplicate)* |
| Tunic #1 | tunic-white.jpg | White Short Chikankari Tunic Top |
| Tunic #2 | tunic-white.jpg → keep, rename | White Chikankari Crop Tunic |
| Noodle #1 | noodle-strap.jpg | White Noodle-Strap Chikankari Top |
| Noodle #2 | noodle-strap.jpg | *(remove duplicate)* |
| Pants #1 | pants-white.jpg | White Chikankari Cotton Pants |
| Pants #2 | pants-white.jpg | *(remove duplicate)* |
| Anarkali | anarkali-bridal.jpg | Heritage Bridal Chikankari Anarkali |

Net result: ~15 products instead of 20, every name matches the photo, no "mint" or "peach" labels on cream images. Categories, sizes, descriptions and the seeded rating/review arrays stay (indexes just shorten). Detail-page colour swatches will be rewritten to a single accurate colour per product so the page doesn't claim 4 colours that don't exist.

If you'd rather keep 20 SKUs, the alternative is generating 5 new product photos (mint sharara, peach palazzo, sleeveless camisole, premium beige unstitched, embroidered pants) — call it out and I'll add that step instead.

## Out of scope
No backend, no schema, no chatbot logic changes beyond the WhatsApp number string.
