# Hostinger Node.js deployment

Use this when deploying the GitHub repo to Hostinger while continuing to edit in Lovable.

## Hostinger settings

- **Node version:** `22.x` or newer
- **Install command:** `npm install`
- **Build command:** `npm run build:hostinger`
- **Start command:** `npm run start:hostinger`
- **Startup file:** `dist/server/index.mjs`

## Required environment variables

Add these in Hostinger before building:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `HOSTINGER=1`
- `NITRO_PRESET=node-server`

Admin-only backend actions also need `SUPABASE_SERVICE_ROLE_KEY`. If that secret is not available on your external host, storefront product listing will still work, but admin write operations should be managed from Lovable.

## Why 403 happens

Hostinger shows 403 when the domain points to a folder with no runnable built app, or when the Node app never starts. This repo must be built first with `npm run build:hostinger`, then started from `dist/server/index.mjs`.

## GitHub sync flow

Lovable edits sync to GitHub. Hostinger must then pull the latest GitHub commit and run the build/start commands above. If auto-deploy is enabled in Hostinger, every synced commit can go live there too.