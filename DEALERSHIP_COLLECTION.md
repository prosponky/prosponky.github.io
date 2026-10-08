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

The thread heartbeat runs at 7 a.m. and noon Eastern; unchanged success stays quiet and failures requiring action are reported. GitHub's public collection is configured for the same times. Do not describe a configured schedule as already proven.

The first actual scheduled browser run dispatched on October 8, 2026 at 12:11 p.m. Eastern after this chat became idle. It collected all 355 official Greenway VINs (269 new, 86 used), published the map, and verified exact live equality at 12:17 p.m. The current HA219379 price was $14,597. The public cloud recovery refreshed all three vehicle feeds, but its optional Coggin official-price step returned HTTP 403. The local public collector recovered complete Atlantic (269) and Avenues (233) official maps, and both were verified live. Run metadata, checkpoints, and `tmp/greenway-scheduled-run-report.json` preserve the evidence. This proves scheduled local operation while the computer and Codex are running; cloud-only official collection and exact-minute execution remain separate limitations.
