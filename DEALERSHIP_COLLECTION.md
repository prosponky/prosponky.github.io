# Official dealership collection

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