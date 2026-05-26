## 1. Fix mobile menu drawer (solid white, opaque)

In `src/components/Layout.tsx`, the drawer currently still bleeds the page underneath through. Replace the drawer styling with:
- `backgroundColor: #FFFFFF` (pure solid white) via inline style
- Add `isolate` + remove any opacity-bearing utilities
- Also ensure the backdrop (`bg-foreground/40`) sits at `z-40` and the drawer at `z-50` (already correct)
- Keep menu text in `text-primary` so it's readable on white

## 2. Hero banner: full-size auto-slider with 5 images

Generate 5 premium hero banner images (premium quality, 1920×1080-ish, Chikankari editorial vibe — model wearing different colored Lucknowi Chikankari outfits: ivory, maroon, pastel mint, blush pink, gold) and save to `src/assets/hero/hero-1.jpg` … `hero-5.jpg`.

Rewrite the hero section in `src/routes/index.tsx`:
- Remove the "NEW COLLECTION" mega-type + floating product layout
- New layout: full-bleed slider, `h-[70vh] md:h-[90vh] w-full` (true full-size, no max-width clipping)
- Use Framer Motion `AnimatePresence` with crossfade between 5 images, auto-advancing every 4.5s via `setInterval`
- Each slide: full-cover image (`object-cover`), soft dark gradient overlay at bottom, slide-specific caption ("New Collection", "Limited Edition", "Bridal Edit", etc.) + "Shop Now" CTA
- Dots indicator at bottom center, prev/next arrows on desktop only
- Pause on hover (desktop)

## Technical details

- File edits: `src/components/Layout.tsx`, `src/routes/index.tsx`
- New assets: 5 generated JPGs in `src/assets/hero/`, imported as ES6 modules
- No changes to routing, stores, data layer, or other pages
