# Official dealership collection

## Standard Playwright and Crawlee trial (October 10)

The user authorized ordinary local Playwright, Crawlee and Microsoft Playwright MCP installation. These are development dependencies; no AI API key, paid service, proxy, fingerprint injection, private API or CAPTCHA solver is used. `npm run inventory:tools:verify` checks standard Chromium extraction against a local five-vehicle fixture, reopens the saved Crawlee queue, and verifies a real MCP initialize/list/navigation exchange. Codex has `pocket-desking-playwright` registered through `scripts/start-playwright-mcp.mjs`; it uses an isolated profile, the standard headless-shell executable, and retains automation identification. Reconnect/restart may be needed for newly registered MCP tools to appear in an existing chat.

`npm run inventory:browser:probe` performs one bounded batch per browser store with no publication. `npm run inventory:browser:collect` collects with durable checkpoints under `tmp/standard-browser`, at most two stores concurrently, and the existing strict official verification. `node scripts/collect-standard-browser.mjs STORE --resume` resumes only a non-expired incomplete run. `--publish` serializes the existing complete-snapshot publishers and their exact live checks. A run lock prevents overlapping launches. Authentication failures, HTTP 403/429, challenges, identity or inventory changes stop safely; access denials are never retried. Navigation failures have one bounded retry. A changed inventory requires a fresh complete run, never edited timestamps or mixed snapshots.

The first standard-browser live probe on October 10 was denied by both Greenway and AutoNation. No snapshots were published from it. **This is not an accepted production replacement.** Keep the existing 7 a.m./noon Eastern schedule and supported CUA recovery. Do not repeatedly probe denied dealers within the same scheduled check or switch browsers to evade a denial. The packages and local tests working do not establish dealer access, fresh inventory, or scheduled end-to-end success. The prior supported-browser AutoNation retry remains incomplete and expired; retain the previous complete published snapshot until a fresh permitted collection succeeds.

The project uses public dealership pages without dealer API credentials or paid services. All stores share `data/dealership-sources.json`, VIN and price checks, complete-pagination requirements, atomic snapshots, and safe publication. Websites with a different layout require a new adapter or configuration verified against that site's public pages. No collector can promise access to every website or prices that never change between checks.

## Greenway: supported browser workflow

Greenway denies the unattended GitHub headless browser. The supported Codex browser reads its normal rendered public inventory. Local scheduling requires this computer to be on with Codex running and browser control available. The cloud workflow continues collecting public inventory and official Coggin prices independently.

Read the CUA documentation and use the selected browser. Open a temporary Greenway inventory tab and inspect its visible page. In CUA REPL import the helper from the absolute workspace file URL:

```js
var runner = await import('file:///C:/Users/Sponk/Documents/ChatGPT/Pocket%20Desking/scripts/official-browser-run.mjs');
var run = await runner.createBrowserRun('greenway');
var result = await runner.runBrowserBatch(tab,run,{maxPages:3});
```

Repeat **one batch per tool call** until `result.done`. Each batch loads the persisted checkpoint; progress survives tool interruptions. A new scheduled run must call `createBrowserRun` again; never reuse yesterday's completed run. Preserve `run` metadata in a temporary JSON file if the REPL is reset. The health file `tmp/inventory-health-greenway.json` records collection, verification, publication, or failure.

The collector accepts only explicit Greenway Price and MSRP labels, exact VIN/stock identities and dealer URLs. It preserves New/Used filters, waits for page position, and checks section totals. It tolerates identical overlapping VINs and tries at most two complete passes; changed prices, inconsistent totals, repeated pages within a pass, missing vehicles, blocked pages, or stale checkpoints fail safely. A failure never overwrites live prices. Retry once from a new run for a changing inventory set; if that also fails, report the failure and keep the prior snapshot. Do not solve access challenges, hide automation, or invent prices.

After complete verification, use PowerShell in the workspace:

```powershell
node scripts/publish-official-prices.mjs greenway '<result.snapshot>' --publish
```

The publisher validates age, source, identity, sections and positive-or-unavailable amounts; locks publication; stages only the price map; and rebases/retries to preserve unrelated releases. It requests a Pages build and verifies the live price map. Check stock HA219379 against the actual current official amount, rather than hard-coding $14,597 forever. Close temporary browser tabs after completion.

## Coggin and future stores

`node scripts/collect-coggin-offers.mjs` reads all `dealer-com-public-html` registry entries. The existing GitHub workflow publishes those complete snapshots at 7 a.m. and noon America/New_York. Used vehicles use **Retail Price**, new vehicles use MSRP, and conditional incentives are excluded from customer cash. No fees are subtracted or guessed.

Inspect the official-price step itself: `continue-on-error` can leave GitHub reporting success even when the dealer rejects collection. If the cloud request fails, the scheduled local check runs `node scripts/collect-coggin-offers.mjs` against the same public pages. Publish only complete maps from a successful collection, stage only those two official link/price files, rebase before pushing, request a Pages build, and verify exact live JSON equality. A missing scheduled cloud run can be dispatched as a recovery, but that is not evidence of a scheduled GitHub run. Neither path bypasses challenges or substitutes syndicated prices.

To onboard a dealership: verify the official site and its inventory pages in the browser; identify the platform; add a registry entry using an existing adapter where compatible; otherwise add a tested adapter for that layout. Confirm exact VIN/stock matching, new/used price semantics, every page and official count, zero/unavailable prices, and stale-data fallback. Test a complete collection and live publication before making the feed selectable. Newly added stores receive no automatic access for unassigned users.

## Schedule and acceptance

### Local unattended Coggin recovery

The Windows task `Pocket Desking Official Coggin Recovery` runs `scripts/run-local-inventory-recovery.ps1` at 7 a.m. and noon in the confirmed Eastern Windows time zone. It uses `scripts/local-inventory-recovery.mjs`: skip an already fresh, structurally complete live map; otherwise collect each official Coggin store independently, archive a complete snapshot, publish only its map through the clean release checkout, request Pages, and compare exact live JSON. It shares the official-price publication lock with Greenway. Access denials stop without retry. A demonstrably dead worker lock can be recovered; an unknown owner is never displaced.

Setup is reproducible with `scripts/install-local-inventory-task.ps1`. The task uses the existing Windows user session without saving a password and can run while locked. It cannot run when that user is signed out or the PC is powered off. Catch-up and wake settings are enabled, subject to hardware and Windows power capabilities. Logs and dated evidence/reports are under `tmp/local-inventory-recovery`. A manual Task Scheduler start is a scheduler execution test, **not** a successful morning/noon scheduled acceptance run. This task covers the two Coggin official maps only; it does not establish unattended Greenway or AutoNation access.

The Codex heartbeat should inspect this task's current report before attempting Coggin recovery. Do not start duplicate manual collectors if the worker is running. If needed, invoke the same worker with `--publish`, which owns a run lock and verifies live freshness. Do not run the denied standalone Greenway/AutoNation probe repeatedly.

After Coggin recovery, the Windows wrapper runs `scripts/audit-unattended-inventory.mjs` against the published maps only. It does not contact dealership sites. `tmp/unattended-audit/latest-report.json` separates current-window verification, retained older evidence, invalid live evidence and missing legacy interior fields. It checks the separate Greenway Carfax map against the embedded report evidence and enforces AutoNation physical scope and advertised/promotion counts. An all-current map report still does not prove a scheduled trigger or lack of user intervention; scheduled acceptance remains a separate gate. Audit exit code 2 means at least one store needs attention; the Coggin task retains its own worker exit code, with both recorded in `task-outcomes.json`. Run this audit again after the browser checks finish, and never describe retained AutoNation values as newly verified.

### AutoNation USA Jacksonville

The AutoNation group contains the Abess Boulevard store (`AutoNation USA Jax`, public store ID 2993). Its official pages advertise nearby-store vehicles too; the default physical scope retains only detail records whose explicit `ActualHyperionId` is 2993. All advertised VIN detail pages must be checked before publishing that subset. Never infer physical location from seller prose or the advertising store banner. Existing user assignments are unchanged; admins can assign the store or group.

AutoNation rejects direct HTTP collection. Use its normal supported CUA browser only. At 7 a.m. and noon Eastern, create a fresh run with `scripts/autonation-browser-run.mjs`, importing with a fresh file URL query suffix. Call `createAutoNationRun({scope:'physical'})` then `runAutoNationBatch(tab,run)` once per browser call. Each batch reads at most three inventory pages or five details. The current results heading counts vehicle VINs only; three promotional tiles are additional. Require unique VIN count to equal the results heading and rendered tile count to equal VINs plus the three exact known promotional cards without vehicle links. Pagination can use Load next 12, Load next 24, or a final partial count from 1 to 24. Accept only explicit AutoNation 1Price matching the list and detail page; do not subtract fees or substitute internal payment values. Preserve trim, color, stock, VIN, explicit certification and the supplied Carfax URL. Never collect canceled window stickers.

If the CUA runtime cannot import local files, start `node scripts/autonation-checkpoint-server.mjs physical`, open its **localhost** form in another supported browser tab, and copy the literal exported function from `scripts/autonation-browser-batch.mjs` into the REPL. Initialize state from the locally saved `tmp/autonation-current-run.json` checkpoint. Call exactly one bounded batch, fill the local form's `Checkpoint` textarea with the resulting state JSON, click `Save checkpoint`, and verify its status. The form persists and validates public vehicle evidence only. `--resume` resumes that same checkpoint server; do not reset a partial run. A navigation interruption may resume its current VIN once; an access denial or challenge stops collection. A fresh complete pass is required if official counts or prices change. No direct AutoNation API or cloud fallback is authorized.

Publish complete snapshots with `node scripts/publish-autonation-inventory.mjs SNAPSHOT --publish`, then compare exact live JSON equality. This stages only the AutoNation map and preserves concurrent releases. Previous verified amounts remain indefinitely during failures; unavailable new evidence retains a prior verified amount with its original price verification time. The twice-daily schedule depends on this computer, Codex and its browser being available. Do not claim a configured schedule has already completed a scheduled run.

The thread heartbeat runs at 7 a.m. and noon Eastern; unchanged success stays quiet and failures requiring action are reported. GitHub's public collection is configured for the same times. Do not describe a configured schedule as already proven.

Price retention follows the user's revised October 8 rule: keep the last verified official amount indefinitely until a successful fresh collection replaces it, including when this computer is off for a week. The app does not erase a verified used price or its quote prefill at 24 hours. Missing, invalid, future-dated, or never-verified amounts remain unavailable; conditional rebates still respect their own freshness and expiry. A retained amount is the last verification, not proof the dealer has left its price unchanged.

The first actual scheduled browser run dispatched on October 8, 2026 at 12:11 p.m. Eastern after this chat became idle. It collected all 355 official Greenway VINs (269 new, 86 used), published the map, and verified exact live equality at 12:17 p.m. The current HA219379 price was $14,597. The public cloud recovery refreshed all three vehicle feeds, but its optional Coggin official-price step returned HTTP 403. The local public collector recovered complete Atlantic (269) and Avenues (233) official maps, and both were verified live. Run metadata, checkpoints, and `tmp/greenway-scheduled-run-report.json` preserve the evidence. This proves scheduled local operation while the computer and Codex are running; cloud-only official collection and exact-minute execution remain separate limitations.

## Vehicle trim

The official collectors preserve trim alongside VIN-matched evidence: Coggin stores use the explicit public `trim` field in the complete official inventory map; Greenway stores its visible year/make/model/trim title in each verified price record. Inventory joins these details only on verified dealer identity, VIN, and matching stock/condition where available. Greenway trim is the official title suffix after the matching model, with bounded documented model spelling normalization. Seller prose, stock patterns, equipment, and unrelated VINs are never used to guess trim. Missing trim leaves no popup row. Scheduled collections retain these fields on each complete refresh; atomic publication and price validation remain unchanged.

## Carfax reports

Pre-owned vehicle popups use only dealer-provided HTTPS Carfax report URLs. Coggin collections retain public Carfax callout links by exact VIN in each complete official map. The supported Greenway browser runner collects rendered detail-page report links in durable batches of five vehicles after inventory collection; publication requires every used VIN to have been checked. No report is synthesized from a VIN. Missing reports remain unavailable, and opening a report preserves the inventory card. The browser runner returns done only after report collection completes.

## Durable local fallback and browser availability

If Greenway local file imports are restricted, run `node scripts/greenway-checkpoint-server.mjs`, open `http://127.0.0.1:4320/` in the supported browser, and copy the literal function in `scripts/greenway-browser-batch.mjs` into CUA. Read the reserved state from the form's `#checkpoint` value. Use exactly one `greenwayBrowserBatch` per browser call (three pages or five used-VIN details), fill `#checkpoint`, submit `Save checkpoint`, and verify `#status`. Read the returned state again after inventory completion because the server supplies the verified used-VIN queue. Repeat until the server says done. The server replays existing OfficialCollection price/identity checks, requires complete new and used section counts, and validates every used detail and dealer Carfax link before writing a snapshot. Publish only that complete snapshot through the existing official publisher. `--resume` reopens `tmp/greenway-current-run.json`; original check dates and accepted evidence remain fixed. Preserve failed checkpoints and retry one fresh run only if inventory changes.

For either localhost form, use `#checkpoint` directly and expect navigation on submission. Compare checkpoint evidence structurally, not by JSON property order. Verify the returned status before calling the next batch. Forms bind only loopback and only accept their own same-origin POST. Run metadata and accepted evidence are durable across REPL resets. Stop expired runs safely and reserve a new run; never modify startedAt to make old evidence fresh.

If the Chrome extension disconnects, the supported in-app browser may continue the same checkpoint when it can read the normal public pages. This is browser availability recovery, never permission to bypass a challenge or access denial. Stop on any such challenge. The local twice-daily check still requires this computer and Codex to be running; cloud collection remains independent. Report a missing browser honestly and retain the prior verified maps. Do not claim a configured schedule has passed its first end-to-end check until all required stores are freshly verified and published.

## Deployment verification window (October 23)

GitHub Pages can take longer than ninety seconds after a successful push. Public inventory, Greenway price publication and local Coggin recovery now share a bounded ten-minute exact-map verification window, checking every ten seconds and reporting progress. A delayed build can recover; a stale or modified HTTP 200 response still fails. Access denials remain terminal. Collection outcome, publication and official-source failures must remain separate in reports. A manual workflow dispatch is a recovery test, not evidence that the next scheduled run has succeeded.

## All seven stores (October 23)

All current stores are registered in data/dealership-sources.json. The resumed 7 a.m./noon Eastern heartbeat includes Greenway, both Coggin stores, AutoNation and all three Hutchinson stores. Follow docs/all-store-refresh.md for exact supported-browser, checkpoint, finalization, publication and per-store reporting instructions. A successful manual cloud run or current map does not prove a scheduled full seven-store cycle.
