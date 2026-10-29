# Admin functionality audit
- [x] Connect admin catalog previews and public Google/Meta feeds to shared live product/variant records; verified 105 matching offers, downloads and public accessibility locally; 5 catalog tests passed.
- [ ] Complete Google/Meta scheduled-source setup and WhatsApp catalog association — requires publication (current live endpoints return 404), account access and provider approval; no relevant catalog connection is available.
- [x] Repair bulk product upload; verified 5-row creation, 5-row SKU update, variation stock totals, history, error reporting, deleted-slug conflicts and product-list Import navigation; 10 CSV tests passed. Temporary listings were soft-deleted.
- [x] Review 41 admin pages with the signed-in account and record failures.
- [x] Repair transactional product saving, catalog safeguards, inventory thresholds, navigation, tracking settings and payment verification.
- [x] Add catalog backup/restore, return-order listing and sales/inventory CSV reports.
- [x] Verify draft creation/read-back, catalog download/restore/read-back, draft soft deletion and report export; 21 regression tests passed.
- [x] Identify integrations requiring external setup and distinguish credential presence from verified operation.
- [ ] Complete remaining website-setting connections, marketing automation, advanced security and role-specific action checks; these remain unfinished, not certified functional.
- [ ] Verify live payment, shipping and automated WhatsApp delivery — requires authorized external-service operations; daily email requires a sending domain.

# Hostinger readiness
- [x] Automate public hosting configuration and pre-build checks without exporting private credentials.
- [x] Verify automated configuration and update Hostinger instructions.
- [x] Harden Node startup and validate hosting configuration.
- [x] Optimize static asset delivery without caching private pages.
- [x] Resolve existing product/category compilation blockers.
- [x] Update deployment instructions and test startup behavior.
- [x] Apply required package security update and verify preview.
- [ ] Validate an actual Hostinger deployment — requires access to the external hosting environment; privileged Cloud credentials are not exportable.
- [ ] Enable full checkout/admin compatibility on Hostinger — requires an authorized supported backend migration; existing privileged Cloud credentials cannot be transferred.