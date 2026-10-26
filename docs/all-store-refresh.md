# Twice-daily refresh for all seven stores

The user authorized the same 7 a.m. and noon America/New_York refresh for every current store on October 23. This resumes the existing thread heartbeat; it does not create a duplicate schedule. The cloud workflow and Windows Coggin task retain their existing times.

| Store | Collection path | Publication |
|---|---|---|
| Greenway Kia at the Avenues | supported CUA, official-browser-run.mjs | publish-official-prices.mjs greenway |
| Coggin Nissan Atlantic | cloud public inventory plus local official recovery | local-inventory-recovery.mjs --publish |
| Coggin Nissan at the Avenues | cloud public inventory plus local official recovery | local-inventory-recovery.mjs --publish |
| AutoNation USA Jacksonville | supported CUA, autonation-browser-run.mjs, physical store 2993 | publish-autonation-inventory.mjs |
| Hutchinson Kia | supported CUA, hutchinson-browser-run.mjs, key kia | publish-hutchinson-inventory.mjs kia |
| Hutchinson GMC | supported CUA, hutchinson-browser-run.mjs, key gmc | publish-hutchinson-inventory.mjs gmc |
| Hutchinson Cadillac | supported CUA, hutchinson-browser-run.mjs, key cadillac | publish-hutchinson-inventory.mjs cadillac |

## Browser checkpoints

Use the available supported browser. Never substitute the previously denied headless Greenway/AutoNation probes, bypass challenges or retry access denials. Import the runner from its absolute file URL with a fresh query suffix. One bounded batch per browser tool call. Greenway uses at most three list pages or five used detail pages; AutoNation uses at most three pages or five details; Hutchinson defaults to one list page (including the visible details tabs) or five used detail pages. Return a progress update between batches.

Each helper accepts a writable checkpoint directory. When workspace writes are restricted in CUA, use `C:/Users/Sponk/AppData/Local/Temp/pocket-desking-scheduled` if writable. If CUA cannot write there either, use the loopback bridge below; do not abandon collection merely because the browser runtime cannot save files. These directories contain public vehicle evidence only. Save and archive the returned run metadata, checkpoint and complete evidence/snapshot into workspace tmp; never change the original startedAt or make an old checkpoint fresh. Start a fresh reserved run for each store at each scheduled slot. Resume the same checkpoint for a navigation interruption. Expired checkpoints are retained as failed evidence and replaced by a new reserved run. Publish stores independently after complete verification, so another store's failure cannot block the successful store.

Greenway: `createBrowserRun('greenway',{directory})`, then `runBrowserBatch(tab,run,{maxPages:3})` until done; publish the returned complete snapshot. The main runner and the new loopback bridge support two bounded passes for identical overlapping VINs and preserve complete new/used counts. Prefer either of these over the older one-pass checkpoint form when imports work.

AutoNation: `createAutoNationRun({scope:'physical',directory})`, then `runAutoNationBatch(tab,run,{maxPages:3,maxVehicles:5})` until done. Check every advertised VIN, the final inventory recheck, physical store scope and the explicitly observed promotional tiles before publishing the physical subset. The results heading counts VINs only. Rendered tile count must equal VIN count plus distinct recognized non-vehicle promotional tiles (one-price, pre-qualification or appraisal); do not assume there are always three. Save and validate promotional evidence on both passes. Unknown, duplicate, ambiguous or vehicle-linked promotional tiles fail validation. Missing dealer reports remain unavailable.

Hutchinson: `createHutchinsonRun(key,{directory})`, then `runHutchinsonBatch(tab,run,{maxPages:1,maxVehicles:5})` until done. New and used pages capture exact labeled prices plus visible detail-tab colors. Used report destinations are checked separately in batches of five, followed by both section totals. A missing printed VIN in the Cadillac detail tab is accepted only with the unchanged VIN-bearing dealer listing URL and no conflicting printed VIN. Save the returned complete `-evidence.json`; then run `node scripts/finalize-hutchinson-run.mjs EVIDENCE` outside CUA. This performs the Node-only model/trim and complete-data validation and writes `-snapshot.json`. Publish with `node scripts/publish-hutchinson-inventory.mjs KEY SNAPSHOT --publish`. Do not publish the evidence file directly. Keep model and trim separate, last-eight VIN tile labels, OEM color fallback, and Sport interior labels. Never collect window stickers.

## Loopback bridge when CUA cannot save checkpoints (October 25)

Run `scripts/browser-checkpoint-bridge.mjs` from the workspace terminal, outside CUA. It only persists public evidence on this computer; it does not request dealership pages or publish data. Supported registry keys are `greenway`, `autonation-jacksonville`, `hutchinson-kia`, `hutchinson-gmc` and `hutchinson-cadillac`.

```powershell
# Reserve a new manual recovery. Choose an unused loopback port.
node scripts/browser-checkpoint-bridge.mjs greenway --port 4321
# Reopen the same non-expired run after the server or browser was interrupted.
node scripts/browser-checkpoint-bridge.mjs --resume 'PATH-RETURNED-IN-metadata' --port 4321
```

Save the emitted metadata and reserved URL. The CLI labels a new run `manual recovery`. For a scheduled wake, reserve through the exported `reserveBridgeRun(store,{trigger:'scheduled',directory})` function and start the returned metadata with `bridgeServer(meta,{port})`, listening on `127.0.0.1`; retain the scheduled slot and actual wake time in the per-store report. Do not describe a manual recovery as a scheduled run. The default directory is `tmp/browser-bridge`.

Open the emitted URL in a separate supported browser tab (`form`) and use another tab (`tab`) for public dealership pages. Import with a fresh absolute file-URL query suffix for each run:

```js
var checkpointClient = await import('file:///C:/Users/Sponk/Documents/ChatGPT/Pocket%20Desking/scripts/browser-checkpoint-client.mjs?run=' + Date.now());
var progress = await checkpointClient.runCheckpointBatch(tab, form, {maxPages:3,maxVehicles:5});
```

Call **one batch per browser tool call**. Use `maxPages:1` for Hutchinson. The client reads the form's `#checkpoint` in 50,000-character chunks so large inventories cannot be truncated by browser tool output limits. It submits the exact JSON to the local form and verifies the incremented version in `#status` before continuing. Do not dump a whole checkpoint into a tool result or reconstruct it from truncated output. UTF-8 response headers, page charset and form encoding preserve Unicode evidence exactly. A rejected save must be inspected; never remove the immutable-evidence checks or edit accepted text to make it pass.

The bridge saves atomically, serializes submissions and rejects conflicting checkpoint versions. Accepted evidence and the original `startedAt` remain fixed. Greenway expires after one hour; AutoNation and Hutchinson after two hours. Publisher freshness validation also applies. Preserve an expired checkpoint as failed evidence and reserve a new run; never extend its timestamps. AutoNation can replay a saved listing prefix on a new tab in bounded batches and checks it against the accepted cards. Hutchinson preserves accepted details when resuming an interrupted listing page.

The bridge runs finalization outside CUA and returns **already-finalized snapshot paths**:

| Progress | File to publish | Command |
|---|---|---|
| Greenway `done:true` | `snapshot` | `node scripts/publish-official-prices.mjs greenway SNAPSHOT --publish` |
| AutoNation `done:true` | `snapshot` | `node scripts/publish-autonation-inventory.mjs SNAPSHOT --publish` |
| Hutchinson `inventoryReady:true` | `inventorySnapshot` | `node scripts/publish-hutchinson-inventory.mjs KEY SNAPSHOT --inventory-only --publish` |
| Hutchinson `done:true` after report batches | `snapshot` | `node scripts/publish-hutchinson-inventory.mjs KEY SNAPSHOT --reports-only --publish` |

For Hutchinson publisher `KEY` use `kia`, `gmc` or `cadillac`, not the full registry key. Metadata also retains `inventoryEvidence` and `evidence` for audit. Do not pass those raw evidence files to a publisher. The bridge's `inventorySnapshot` is already finalized, unlike the direct Hutchinson runner's `inventoryEvidence`; the direct runner still requires the separate finalizer described below. Publish and verify inventory-only immediately, then continue the same checkpoint for reports. Neither `inventoryReady` nor a completed local snapshot proves live publication.

No bridge route authorizes a private dealer API, challenge bypass or retry of denied access. It accepts only its reserved loopback route and same-origin form submissions. Browser availability recovery may resume the same unexpired checkpoint in another supported browser only when ordinary public pages remain accessible.

The bridge form keeps accepted evidence in the read-only `#checkpoint` field and submits only the new append/replace operations through `#update`. This avoids repeatedly filling a growing multi-megabyte text field. Every delta is applied to the matching saved version and then passes the same immutable-evidence and completeness checks. After a failed submission, reload the form before resuming; the accepted version is authoritative.

The cloud's final health step may use a complete official Coggin vehicle map as an explicit fallback for failed syndicated inventory. It requires evidence from the current Eastern slot, full explicit vehicle identities, and exact equality between the published repository map and live JSON. Older or partial maps cannot make the run green. A failed Greenway public feed still fails the cloud run. Official cloud price-step failures remain separately visible; inspect their actual logs even when the fallback succeeds. The October 25 labeled manual run 40264451789 passed with Atlantic's official fallback; this is not scheduled all-seven acceptance.

## Repeated Hutchinson listings

An identical VIN may appear twice across the dealer's listing pages. Such a run enters `duplicate-list` and reads one additional complete new/used listing pass, one page per browser call, preserving the original `startedAt` and expiry. It reuses accepted labeled detail observations and only restores a pricing tab when that tab is not already visibly active. Both passes must account for every advertised tile, all pages and final counts, and agree on the exact unique VIN set, identities and parsed prices. Conflicting repeats, incomplete confirmation or changed evidence fail. Only after that confirmation may the snapshot contain one row per VIN; section `listedTotal` and `duplicateListings` record the difference from the unique `total`. This does not allow a partial inventory or unverified price to publish.

## Verification and acceptance

All publishers share the recoverable publication lock, preserve unrelated releases, pull/rebase before committing and verify exact live JSON. Deployment verification waits up to ten minutes and polls every ten seconds; HTTP 401/403/429 stop immediately. Never turn an old or modified HTTP 200 response into success. Missing fresh amounts retain the previous verified amount and its original verification timestamp indefinitely. Missing fresh reports are unavailable rather than synthesized.

Before starting Coggin recovery, inspect its Windows task and latest report, and wait for any running worker. Use the existing recovery command with its run lock. Run `node scripts/audit-unattended-inventory.mjs` afterward; this now covers all seven maps. A stale store must remain separately labeled retained, and the scheduled report must list all seven stores, evidence dates, complete counts, publication, live verification and actual trigger. Configured schedules, fixture tests, one-page probes and manual dispatches do not prove scheduled end-to-end success.

Coggin's official maps now include complete vehicle rows from the same public listing reads: explicit year, make, model, trim, labeled colors and mileage, alongside VIN, stock, condition, official links and separately dated prices. The app may use those rows only after every identity agrees with the complete official VIN set, so new arrivals do not depend on a lagging syndicated list. Legacy maps remain readable, and retained amounts keep their original dates. A short syndicated feed must still fail its category/completeness checks. Use `node scripts/local-inventory-recovery.mjs --publish`; `--force` is only for an intentional fresh manual verification after the task/lock check, not an access-denial retry. Inspect `tmp/unattended-audit/latest-report.json` after all completed publications.

The October 23 manual cloud recovery 40007465709 succeeded after the timing repair. Both local Coggin maps passed exact live verification. The new Hutchinson helper passed one real listing-page probe for each of Kia, GMC and Cadillac; AutoNation passed a bounded list probe. These probes did not replace any full inventory. A full unattended scheduled cycle for all seven remains to be proven. The computer, logged-in Windows session, Codex and supported browser must remain available for browser-only stores; the cloud's three public inventory feeds continue independently.

## Inventory-first publication (October 24 optimization)
Hutchinson now stops at `inventoryReady: true` after every new/used listing, color detail and a fresh section-count recheck. At that checkpoint, immediately finalize the returned `inventoryEvidence` with `node scripts/finalize-hutchinson-run.mjs EVIDENCE --inventory-only`, then publish its complete snapshot with `node scripts/publish-hutchinson-inventory.mjs KEY SNAPSHOT --inventory-only --publish`. This is a complete inventory/price snapshot, not a partial VIN collection. Existing exact-identity Carfax links keep their original report dates; new vehicles without verified reports remain unavailable. The publisher never assigns today's report verification date to retained reports.
Continue the same run in bounded batches for Carfax and final rechecks, then use the full finalizer and publish with `--reports-only --publish`. The report merge requires exact VIN/stock/listing coverage of the current used inventory, preserves newer reports, and never rewrites inventory or price verification dates. If current inventory contains an uncovered vehicle, stop and collect a fresh run. `inventoryReady` is an intermediate success, not `done`; report price and Carfax outcomes separately. An expired run must start fresh, never refresh its timestamps. Prefer completing the inventory stage for all three stores before the slower report stages, within the existing run-expiry limits. Full scheduled acceptance still requires the report stage and exact live publication checks.
