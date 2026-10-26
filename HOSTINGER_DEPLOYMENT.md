# Hostinger React / Node.js deployment

Use this when deploying the GitHub repo to Hostinger while continuing to edit in Lovable. This React app uses server rendering and server functions, so it requires **Hostinger Node.js application hosting**. Static React hosting or uploading only `dist/client` to `public_html` cannot run checkout, product loading, or admin server actions.

## Hostinger settings

- **Node version:** `22.12+` (Node 22 LTS)
- **Install command:** `npm install`
- **Build command:** `npm run build:hostinger`
- **Start command:** `npm run start:hostinger`
- **Startup file / Entry file:** `hostinger-server.mjs`
- **Output directory:** `dist`

Always use `npm run build:hostinger` as the build command — never the plain `npm run build`. The plain build emits Nitro's default `.output` directory, which Hostinger cannot serve and causes the "output directory build not found" failure. The Hostinger build emits `dist/server` + `dist/client` and also mirrors the static files into a top-level `build/` directory, so panels configured with an output directory of `build` also find files. If your panel asks for an output directory, set it to `build` (static files) or leave `dist` for the Node app.

Install development dependencies during the build: Vite and the hosting configuration package are build tools. Do not use `npm install --omit=dev` before building. After building, `npm run check:hostinger` validates the entry file and required server configuration without starting a second server. Run `npm run test:hostinger` to test startup safeguards.

Run `npm run prepare:hostinger` to check the Node version and public browser/server configuration before building. The build launcher automatically applies the Hostinger preset and resolves the project independently of the current working directory. This prerequisite check is not a deployment or checkout compatibility test.

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

The build and startup launchers now load the current project's **public** backend URL and publishable key from `scripts/hostinger-public-config.json`. You do not need to copy those four public settings into Hostinger manually. Values you explicitly set in Hostinger take precedence; browser and server settings must match. Only these public values are loaded from the file—no private credentials are included.

If you intentionally override the configuration, set these before building:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `HOSTINGER=1` (automatically set by the Hostinger build/start commands)
- `NITRO_PRESET=node-server` (automatically set by the Hostinger build/start commands)

`VITE_*` values must be present **before building**, because they are embedded in the browser bundle. The non-`VITE_*` variables must also be available when the Node app starts. Use the project's public configuration values; do not put private integration credentials in `VITE_*` variables or GitHub.

### External hosting limitations

Some existing server actions use a privileged Lovable Cloud key. That key is **not available for export from Lovable Cloud**. Consequently, this hosting setup does not make those actions work on Hostinger: checkout/order creation, order tracking, and other actions using the privileged client may fail there even when the storefront loads. Keep those workflows on the Lovable-hosted app until a separate supported backend migration is completed. Do not fabricate a service key or put one in frontend code.

Other integrations may also require their server-only credentials on the external host. This change does not migrate credentials, data, or change the live hosting/domain settings.

### Remaining deployment steps and blockers

The repository preparation does not create or configure a Hostinger account, upload code, change DNS, provision HTTPS, or migrate the backend. Those steps require authorized Hostinger access, which is not connected to this project.

1. In Hostinger, create a **Node.js application** and connect this GitHub repository.
2. Enter the Node version, install/build/start commands, and entry file listed above.
3. Deploy, then inspect the deployment/startup logs and test the site's generated Hostinger URL before changing the domain.
4. Do not move the live store until checkout, tracking, contact forms, admin tools, shipping, payment processing, and sitemap are verified against a supported backend.

Optional integration credentials are server-only: Razorpay uses `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; shipping services require their own credentials. These credentials do not solve the unavailable privileged backend key. Lovable-managed AI and connector credentials are not automatically transferred to Hostinger. Keep affected features on Lovable until a supported migration is complete.

## Why 403 happens (Hostinger)

Hostinger shows 403 when the domain points to `public_html` instead of the Node app, when the generated `.htaccess` is stale, or when the Node app never starts. This repo must be built first with `npm run build:hostinger`, then started from `hostinger-server.mjs`.

If 403 still appears after a successful build, open Hostinger **Node.js App → Settings & Redeploy**, set **Entry file** to `hostinger-server.mjs`, then redeploy/restart so Hostinger regenerates `public_html/.htaccess`.

## GitHub sync flow

Lovable edits sync to GitHub. Your hosting platform must then pull the latest GitHub commit and run the build/start commands above. If auto-deploy is enabled, every synced commit can go live automatically.
