# Original window stickers

## Current automation (October 9)

The original hero artwork has been restored. Sticker collection is scheduled for 7 a.m. Eastern only; the noon inventory/price refresh remains independent. `refresh-window-stickers.mjs` reads every registered dealership, processes durable batches of five, prioritizes new VINs, and stops a denied host rather than sending hundreds of identical requests. Weekly rechecks keep verified documents within their seven-day display window. Failed rechecks retain prior verification time and never claim a fresh success. The GitHub workflow publishes an explicit collection report; a challenged collection step fails visibly even though other inventory work continues.

The supported-browser fallback uses `prepare-sticker-browser.mjs`, then one `collectStickerBrowserBatch` call per CUA tool call, then `verify-sticker-browser.mjs STORE`. Durable queues are `tmp/STORE-sticker-browser.json`. Do not reset an unfinished queue. Browser runtimes that block local module imports must use the literal self-contained function from `sticker-browser-batch.mjs`; string code generation is unavailable. The browser reads only normal public detail/report pages. Candidate links alone are never published as verified stickers.

Collection and PDF verification write the same checkpoint: run them sequentially and wait for the verification process to finish before another browser batch for that store. Verification merges only processed markers into the latest queue and never replaces its collection index.

Current coverage remains incomplete. Morning automation must continue the queues and publish verified maps without waiting for the whole queue; missing or rejected documents stay hidden. The goal remains active until every registered store is covered and a real scheduled morning run completes end to end. Initial browser batches found and PDF-verified additional original stickers at Greenway and Coggin Atlantic; several Nissan documents fail the strict original-Monroney content rule.

The vehicle dialog shows **Window sticker** after Carfax (or after the listing button on new vehicles) only for a verified VIN-specific original PDF. New and used use the same rule. Missing, failed, expired, mismatched or unsafe evidence produces no button. Opening it leaves the vehicle dialog intact.

`src/window-sticker.js` validates exact HTTPS provider hosts, exact document VIN, successful verification status and seven-day availability. Stored evidence includes source page, final PDF URL, checked time and document SHA-256. These checks do not alter price retention. Manufacturer eligibility or a constructed endpoint never establishes availability.

Run the bounded collector (maximum five vehicles per invocation):

    node scripts/collect-window-stickers.mjs --store coggin-atlantic --limit 5
    node scripts/collect-window-stickers.mjs --store coggin-avenues --limit 5
    node scripts/collect-window-stickers.mjs --store greenway --limit 5

Optional `--vin VIN` targets an existing inventory record. `POCKET_PDF_PYTHON` must point to a Python executable with pypdf; missing PDF extraction fails closed. The desktop bundled Python supports this. No paid service is used. Repeated runs continue with records not checked within the last day. Each record is checkpointed atomically in `public/inventory/<store>-stickers.json`. Publish those independent maps alongside a feature release using the normal release process. Schedule collection externally alongside the existing public collectors; no schedule was changed by this implementation.

Discovery follows explicitly labeled Window sticker/Monroney anchors on registered dealer details and their dealer-provided Carfax reports. It never synthesizes a URL or searches every manufacturer's endpoint. Redirects are bounded and checked at every hop. Challenges and HTTP errors are recorded, never bypassed. PDF checks require the actual VIN plus MSRP and fuel-economy content, and reject sample/reproduction/unavailable documents. Providers outside the reviewed allowlist and non-PDF wrappers require a future adapter, so some valid stickers may remain hidden.

Candidate provider paths: dealer-hosted original PDFs and explicit Carfax/OEM links on the reviewed allowlist (FordDirect, Stellantis brand sites, Kia, Hyundai, Nissan, Subaru and Toyota). This is a safety allowlist, **not a claim that every brand or VIN has a working sticker endpoint**. No generic free all-brand sticker service was verified.

2026-10-09 validation: build and 13 focused tests passed. Five current-feed records were checked across the three stores; zero original stickers verified. HTTP collectors received challenges/403s. The supported browser opened Coggin Atlantic's current Altima stock 429416 (VIN 1N4BL4EV5SN429416) and confirmed no original sticker link in its accessible dealer page. Its dealer-provided Carfax report presented a device check. No positive live sticker example is claimed. This feature has not been published.

## Follow-up verification (supersedes the initial zero-example result)

A later normal browser visit opened Carfax without a challenge. Its first Detailed History entry for Ford Explorer stock **CJNTKGA04413**, VIN **1FM5K7D81KGA04413**, had the exact Original Window Sticker link. Download succeeded with an actual PDF; pypdf extracted the exact VIN, 2019 Explorer XLT factory equipment, MSRP $37,055 and fuel economy. The collector verified and cached this record with a document SHA-256. This is a positive working original-sticker example, not merely an untested endpoint.

For used Nissan Altima stock **429416**, VIN **1N4BL4EV5SN429416**, the first history entry also had Original Window Sticker and its PDF downloaded successfully. The embedded image visually matches the VIN, but its text disclaimer explicitly says **Unofficial Copy** and **Not actual Monroney Label**. It is recorded as `informational-copy`, original false, so the strict original-only button stays hidden. Do not call this missing or blocked.

For NEW Nissan Sentra stock **CJNVY230101**, VIN **3N1AB9BV9VY230101**, the dealer detail page directly exposes View Window Sticker at its registered same-origin `/api/legacy/pse/windowsticker/nissan` path. The actual observed link is saved as a candidate; its download returns HTTP403. Status unverified, not unavailable. No URL was guessed.

`scripts/sticker-browser-discovery.mjs` reads explicit links and VIN association from an already accessible page through supported browser APIs. Save its output (max five entries) and pass `--discovery-file PATH` to the collector, along with `--vin` when desired. The collector downloads the observed destination independently and requires the actual PDF content to match before verification. Fresh discoveries can retry a previous failure. No cookies or credentials are exported. If the local browser cannot import the helper, the same read-only DOM operation can produce the documented JSON entries (`vin`, `sourceVin`, `sourceUrl`, `url`, `label`, `discoveredAt`). Source failures remain distinct from confirmed absence.

Final checks: build, 14 focused Node tests, and three browser tests pass. Browser tests cover new/used conditional placement, opening a new tab while preserving the card, and stale-evidence hiding. No feature publication or automatic sticker schedule change has occurred. Existing Halloween banner release is preserved.
