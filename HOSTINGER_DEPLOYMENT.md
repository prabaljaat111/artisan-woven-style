# Hostinger Node.js deployment

Use this when deploying the GitHub repo to Hostinger while continuing to edit in Lovable.

## Hostinger settings

- **Node version:** `22.x` or newer
- **Install command:** `npm install`
- **Build command:** `npm run build:hostinger`
- **Start command:** `npm run start:hostinger`
- **Startup file / Entry file:** `hostinger-server.mjs`
- **Output directory:** `dist`

## Vercel settings (alternative)

If deploying to Vercel instead of Hostinger:

- **Framework preset:** `Vite` (or leave as default)
- **Build command:** `npm run build:vercel`
- **Output directory:** `.output`
- **Install command:** `npm install`

## Required environment variables

Add these before building:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `HOSTINGER=1` (only for Hostinger builds)
- `NITRO_PRESET=node-server` (only for Hostinger builds)

Admin-only backend actions also need `SUPABASE_SERVICE_ROLE_KEY`. If that secret is not available on your external host, storefront product listing will still work, but admin write operations should be managed from Lovable.

## Why 403 happens (Hostinger)

Hostinger shows 403 when the domain points to `public_html` instead of the Node app, when the generated `.htaccess` is stale, or when the Node app never starts. This repo must be built first with `npm run build:hostinger`, then started from `hostinger-server.mjs`.

If 403 still appears after a successful build, open Hostinger **Node.js App → Settings & Redeploy**, set **Entry file** to `hostinger-server.mjs`, then redeploy/restart so Hostinger regenerates `public_html/.htaccess`.

## GitHub sync flow

Lovable edits sync to GitHub. Your hosting platform must then pull the latest GitHub commit and run the build/start commands above. If auto-deploy is enabled, every synced commit can go live automatically.
