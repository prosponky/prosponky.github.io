# October 24 optimization release

The app builds in the local Pocket Desking workspace and deploys to the existing Cloudflare Pages project. The hosting checkout retains its minimal collector package.json.

Local build: node scripts/compact-reference-data.mjs, npx vite build --manifest, then node scripts/precache.mjs (also wired into local npm run build). Original reference JSON remains the source of truth. Compact make data preserves all 48 existing selector results; one of the 49 requested brand names is absent from the source. All original ZIP county mappings are preserved.

Measured main JS: 1,548,518 to approximately 586,360 bytes before compression; gzip approximately 294.6 to 161.4 KB. The worker precaches three bundles including basic PDF export; scanner libraries cache after their first online use. Hashed assets use cache-first reads. Inventory search caches normalized row text and DOM references. Offscreen list items defer rendering while pinned rows render normally.

Freshness shows inventory and oldest saved price dates separately. Official used-price dates propagate from Greenway/Coggin maps. Hutchinson inventory publishes only after complete new/used pages, colors and final counts. Later report-only publication preserves current inventory and prices, requires exact current used-VIN identity coverage, and keeps newer reports. The audit checks per-VIN Carfax dates including checked-unavailable reports.

208 unit tests, ten inventory browser tests, and one offline quote/PDF check passed locally. Production verification is recorded separately. This release does not itself refresh dealer prices or prove unattended scheduled acceptance. See all-store-refresh.md for the two-stage Hutchinson workflow.
