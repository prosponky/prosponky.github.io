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

To onboard a dealership: verify the official site and its inventory pages in the browser; identify the platform; add a registry entry using an existing adapter where compatible; otherwise add a tested adapter for that layout. Confirm exact VIN/stock matching, new/used price semantics, every page and official count, zero/unavailable prices, and stale-data fallback. Test a complete collection and live publication before making the feed selectable. Newly added stores receive no automatic access for unassigned users.

## Schedule and acceptance

The thread heartbeat runs at 7 a.m. and noon Eastern; unchanged success stays quiet and failures requiring action are reported. GitHub's public collection runs at the same times. First complete browser collection is proven manually; acceptance of unattended execution requires a successful actual scheduled run. Do not describe a configured schedule as already proven.
