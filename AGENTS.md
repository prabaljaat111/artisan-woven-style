# Hosting architecture
- Keep Hostinger-only Node startup utilities under scripts/ and out of the application import graph so Lovable's Worker deployment remains compatible.
- Load only allowlisted public backend configuration from scripts/hostinger-public-config.json for Hostinger build and startup, preserving platform overrides; private credentials must remain environment-only.
- Resolve Hostinger build output from the launcher URL and honor platform-provided listening settings so startup is independent of the working directory.
- Apply long-lived caching only to hashed static assets in the Hostinger Nitro configuration; never cache customer, admin, or server-function responses globally.
- Keep route-specific metadata on leaf routes and reuse adminPageMeta for private administrative pages to avoid generic or inherited page titles.
- Save product forms and variation changes through a single database transaction, preserving IDs for unchanged combinations to protect stock history.
- Catalog backups restore only catalog/configuration records atomically; never replay order, payment, auth, or stock-history records through catalog restoration.
- Validate public analytics identifiers before emitting tags; expose only explicitly allowlisted public settings.
- Resolve checkout product identities, prices, inventory and payment rules on the server; require an order-specific signed capability before public guest payment operations.