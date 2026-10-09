# Window sticker collection

The five-per-day rule applies ONLY to window stickers. Inventory, official prices, availability and Carfax still refresh at 7 a.m. and noon Eastern.

Sticker slots are two hours apart, starting at 7 a.m. Eastern. Across all registered dealerships, at most five vehicles are attempted per Eastern calendar day, one per slot. New inventory arrivals take priority. When none are pending, use daily slots for existing missing stickers. A failed attempt consumes its slot; do not repeatedly fetch the same VIN or bypass access challenges.

Run `node scripts/prepare-sticker-browser.mjs` once per sticker wakeup. It reserves one vehicle before any network request in `public/inventory/sticker-collection.json`. Existing bulk queues are archived once and never resumed. Today’s historical attempts count toward the cap, so installation cannot start another mass collection. No slot means no sticker requests.

Use the literal supported-browser function in `scripts/sticker-browser-batch.mjs` only for the single reserved policy queue, then `node scripts/verify-sticker-browser.mjs STORE --limit 1`. Wait for terminal verification before publication. A blocked queue stops automation rather than retrying the challenge. Cloud sticker collection is disabled; the independent inventory workflow remains unchanged.

Publish the three sticker maps and the global ledger through the clean release checkout and compare live maps exactly. Sync the published ledger before planning, preserving newer local reservations. Keep all previous verified sticker evidence. Documents retain their original verification date; they are never described as freshly verified without a new check.

The button appears only for exact-VIN verified original PDFs from approved destinations. Dealer informational copies remain hidden. Existing verified originals are retained without automatic age expiry. Missing or unverified documents never get synthesized links. Opening the sticker keeps the vehicle card open.

The revised planner has unit coverage for global daily limits, Eastern boundaries, two-hour spacing, arrival priority and deduplication. A real scheduled run under this revised policy remains to be observed. Original hero artwork is restored and live.
