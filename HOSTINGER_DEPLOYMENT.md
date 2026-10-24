# Hostinger React / Node.js deployment

Use this when deploying the GitHub repo to Hostinger while continuing to edit in Lovable. This React app uses server rendering and server functions, so it requires **Hostinger Node.js application hosting**. Static React hosting or uploading only `dist/client` to `public_html` cannot run checkout, product loading, or admin server actions.

## Hostinger settings

- **Node version:** `22.12+` (Node 22 LTS)
- **Install command:** `npm install`
- **Build command:** `npm run build:hostinger`
- **Start command:** `npm run start:hostinger`
- **Startup file / Entry file:** `hostinger-server.mjs`
- **Output directory:** `dist`

Install development dependencies during the build: Vite and the hosting configuration package are build tools. Do not use `npm install --omit=dev` before building. After building, `npm run check:hostinger` validates the entry file and required server configuration without starting a second server. Run `npm run test:hostinger` to test startup safeguards.

Hostinger assigns the listening port through `PORT`. The launcher preserves that port and binds to `0.0.0.0`; do not hardcode a port in the hosting panel. It resolves `dist/server/index.mjs` relative to the launcher, so startup also works when the hosting panel uses a different working directory.

## Performance and caching

- Hostinger builds precompress static files with gzip and Brotli.
- Hashed files under `/assets/` receive a one-year immutable cache policy; changed builds generate new URLs.
- No blanket caching is applied to HTML, admin pages, checkout, or server-function responses.
- Enable HTTPS for the domain and use the Node app as the domain target, not a separate static folder.
- Keep both `dist/server` and `dist/client` from the same build; do not mix output from different deployments.

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

`VITE_*` values must be present **before building**, because they are embedded in the browser bundle. The non-`VITE_*` variables must also be available when the Node app starts. Use the project's public configuration values; do not put private integration credentials in `VITE_*` variables or GitHub.

### External hosting limitations

Some existing server actions use a privileged Lovable Cloud key. That key is **not available for export from Lovable Cloud**. Consequently, this hosting setup does not make those actions work on Hostinger: checkout/order creation, order tracking, and other actions using the privileged client may fail there even when the storefront loads. Keep those workflows on the Lovable-hosted app until a separate supported backend migration is completed. Do not fabricate a service key or put one in frontend code.

Other integrations may also require their server-only credentials on the external host. This change does not migrate credentials, data, or change the live hosting/domain settings.

## Why 403 happens (Hostinger)

Hostinger shows 403 when the domain points to `public_html` instead of the Node app, when the generated `.htaccess` is stale, or when the Node app never starts. This repo must be built first with `npm run build:hostinger`, then started from `hostinger-server.mjs`.

If 403 still appears after a successful build, open Hostinger **Node.js App → Settings & Redeploy**, set **Entry file** to `hostinger-server.mjs`, then redeploy/restart so Hostinger regenerates `public_html/.htaccess`.

## GitHub sync flow

Lovable edits sync to GitHub. Your hosting platform must then pull the latest GitHub commit and run the build/start commands above. If auto-deploy is enabled, every synced commit can go live automatically.
