# Window sticker collection

The live vehicle popup shows **Window sticker** only after a VIN-specific original PDF passes verification. It appears after Carfax on used vehicles and after the listing action on new vehicles. Opening the document keeps the card open.

## Schedule and publication

Inventory, prices, availability and Carfax checks remain scheduled at **7 a.m. and noon Eastern**. Window stickers run only with the morning schedule. Separate cron identifiers preserve this distinction even if GitHub delays the morning job. The local heartbeat provides the supported-browser fallback; the computer and Codex must be running for that fallback.

The workflow starts from the latest published evidence, updates successful collections and retains previous maps when a source fails. Individual Coggin and sticker outcomes are saved in the workflow artifact; an overall job success does not prove those steps succeeded. Production reads the refreshed public GitHub inventory maps, so a data update does not require another app deployment.

`refresh-window-stickers.mjs` iterates every registered dealership, prioritizes new VINs, checkpoints batches of five, and stops denied hosts rather than repeating hundreds of failures. Verified PDFs are rechecked directly after six days, within the seven-day display window. Failed retrieval never advances the prior successful verification time. A retrieved document that is no longer an original VIN match invalidates that evidence.

## Supported browser fallback

1. Run `node scripts/prepare-sticker-browser.mjs`. Unfinished queues retain progress and insert new VINs ahead of the remaining backlog.
2. Run one `collectStickerBrowserBatch` call per supported CUA tool call, with a maximum of five vehicles. Its implementation is in `scripts/sticker-browser-batch.mjs`.
3. Stop collection before running `node scripts/verify-sticker-browser.mjs STORE`. Wait for its terminal result before resuming browser batches for that store. `--limit 5` provides a bounded verification batch; repeat until pending verification records are zero.
4. Publish verified `inventory/STORE-stickers.json` maps through the clean release checkout, request the Pages build, and compare every live map exactly to the published snapshot.

Queues are `tmp/STORE-sticker-browser.json`. Both collection and verification use atomic writes. Verification merges processed markers into the current checkpoint and never replaces a newer collection index. A real challenge leaves the current VIN pending; never bypass it. If local file-module imports are denied in CUA, paste the literal self-contained browser function. String code generation is unavailable.

Dealer details and dealer-provided Carfax reports supply explicit links. New arrivals can discover their report directly from the dealer page without depending on an older report cache. No VIN-based report or manufacturer URL is synthesized. Candidate links are not verification evidence by themselves.

## PDF verification

Set `POCKET_PDF_PYTHON` to a Python executable with pypdf. The bundled desktop Python supports it; the cloud workflow installs the pinned free dependency. Redirects, HTTPS hosts, download size and timeouts are bounded. Verification requires the actual document VIN, MSRP and fuel-economy content, and rejects sample, reproduction and informational-copy disclaimers. Image-only documents without a readable VIN remain unverified.

The current display rule excludes Nissan PDFs marked **Unofficial Copy / Not actual Monroney Label**, even when the dealer provides a working link. These are classified separately as `informational-copy`. The user has been asked whether to include clearly labeled copies; do not change that policy without their answer.

Commands:

    node scripts/collect-window-stickers.mjs --store greenway --limit 5
    node scripts/collect-window-stickers.mjs --store coggin-atlantic --limit 5
    node scripts/collect-window-stickers.mjs --store coggin-avenues --limit 5

`--discovery-file PATH` accepts up to five fresh browser-observed links. `--vin VIN --recheck` directly rechecks an existing verified document. The evidence includes its source page, final PDF URL, successful verification time and document SHA-256. These rules do not alter indefinite retention of verified vehicle prices.

## Verified examples and unfinished work

Original PDFs have been verified for Greenway Telluride **LG008800**, Atlantic Explorer **CJNTKGA04413**, and Atlantic Seltos **CJNTM7107436**. The live Telluride card shows the action; direct PDF rechecks passed for Telluride and Explorer. The original hero artwork is restored and verified live.

Initial inventory-wide coverage remains unfinished. Consult `tmp/sticker-goal-progress.json` and the actual queues for current counts; do not treat the examples or passing tests as full coverage. The goal requires completed initial collection, verified publication, and a real scheduled morning end-to-end run. October 9's cloud recovery was manually dispatched and is not scheduled-run proof.