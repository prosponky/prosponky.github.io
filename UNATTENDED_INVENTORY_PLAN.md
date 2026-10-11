# Unattended inventory: research and acceptance plan

Updated October 10, 2026. Goal active; not yet accepted as fully unattended.

## Required outcome

Free personal-use collection at 7 a.m. and noon Eastern for Greenway, both Coggin locations, and physical-store AutoNation USA Jacksonville. No clicks, prompts, dealer credentials, paid services, stealth, or challenge bypasses. Collect complete VIN sets, labeled prices, available interior/exterior colors and dealer-supplied Carfax links. Preserve verified prices indefinitely during failures. Never collect canceled window stickers.

## Evidence so far

- Cloud public inventory has completed scheduled runs. Official Coggin cloud requests can return 403 while the overall workflow remains green; local collection has recovered complete maps.
- Supported browser collection completed Greenway, including used detail/Carfax checks. AutoNation changed its inventory during a complete pass; its subsequent partial run expired and was not published.
- Standard Playwright and Crawlee passed local extraction, queue recovery and MCP fixture checks. Both browser-only dealers denied the live standard-browser probe. Installing packages is not evidence of dealer access.
- The existing Codex heartbeat is active twice daily. It depends on this PC, Codex and supported browser availability. It is not an independent Windows service.
- Task Scheduler inventory inspection fails with a CIM access error in the restricted execution environment. The authorized system-level inspection succeeded, and the Coggin recovery task is now registered and tested.

## Research findings

1. Crawlee supports persistent local request storage. Use durable per-VIN state and atomic checkpoints; verify recovery after process termination rather than relying on a successful clean exit. https://crawlee.dev/js/docs/3.12/guides/request-storage
2. GitHub documents scheduled-event delay and possible dropped jobs, especially near the beginning of the hour. A separate freshness watchdog must distinguish a missing run from a failed collection. Keep requested collection times; do not silently change them. https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
3. Playwright supports standard browsers, but browser support does not establish permission or reliable access to a dealer. Do not rotate engines or profiles to evade an access denial. https://playwright.dev/docs/browsers
4. Windows Task Scheduler supports catch-up and wake settings. Hardware wake capability, powered-off machines, network availability and logged-out execution still need actual tests. https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtasksettingsset

## Work sequence

### Implementation evidence: October 10 evening

- Inspected actual GitHub job logs: the earlier failure was a duplicate-VIN pagination rejection. The later scheduled public refresh completed; both official Coggin steps still logged HTTP 403 despite overall success. No official access was inferred from the green overall result.
- Registered Windows task `Pocket Desking Official Coggin Recovery` for 7 a.m. and noon Eastern, with catch-up, wake, no overlapping launches and a one-hour limit. It uses the existing user session, runs while locked, and does not store a Windows password. Signed-out or powered-off execution remains unsupported.
- Implemented complete per-store validation, exact VIN-map coverage including interiors and Carfax, archived snapshots, recoverable dead-owner locks, serialized narrow publication, rejection of older evidence and exact live comparison. Fifteen targeted tests passed, including denial isolation, corruption, live mismatch and stale ownership; the seven coordinator tests were rerun after subsequent coordinator changes and passed.
- A manually triggered **Task Scheduler** execution collected and published Atlantic 276 and Avenues 259, both exact-live verified; Task Scheduler returned zero. Evidence: `tmp/local-inventory-recovery/2026-10-11T00-04-04.086Z/report.json`. This proves an unattended scheduler-context execution, not a successful 7 a.m./noon trigger or all-store completion.
- The first scheduled-context test exposed a missing GitHub CLI login configuration. The subsequent worker correctly recorded the build-request warning and verified actual deployment from the pushes instead of assuming a failed redundant request meant publication failed. The task wrapper now explicitly uses the existing GitHub configuration directory without copying credentials and records an authentication preflight boolean.
- Greenway and AutoNation remain on supported Codex browser checks. The denied standalone probe has not been retried or made production. All-store scheduled acceptance remains open.
- The explicit GitHub configuration directory did **not** resolve keyring authentication inside Task Scheduler: its preflight still reports false. Deployment from Git pushes nevertheless completed and exact live verification passed. Keep that warning visible in reports; do not claim authenticated build requests from the scheduled context. A follow-up scheduler invocation correctly skipped both already-fresh maps and returned zero without extra collection.
- Added an automatic all-store audit after local recovery. The live audit verifies Greenway's price and separate Carfax maps, both Coggin maps, and AutoNation's physical subset. It reports AutoNation's October 9 snapshot as retained, with 120 missing legacy interior fields; no refresh or scheduled success is inferred from those retained values. The audit never visits dealer sites.
- Tightened browser publishers: complete fresh Carfax evidence is mandatory for Greenway; local validation cannot modify the release checkout; browser publishers share the recoverable official publication lock and reject older snapshots. AutoNation publication requires physical scope, explicit color fields, and promotion/count reconciliation.
- Added explicit retained-price provenance for Greenway and Coggin. Missing fresh amounts can keep previously verified official values by exact VIN/source and identity where available, with original verification dates; raw observed amounts remain recorded. Rebates are not retained by this mechanism. New verified values replace old prices.
- Cloud publication now prepares per-file expected evidence and has a bounded exact-live verification step. A failed redundant build request alone cannot claim deployment failure or success. This change still needs deployment and a real workflow execution test before being treated as production evidence.

### 1. Establish the failure baseline

Inspect recent actual scheduled GitHub runs and individual steps. Classify each failure as missing trigger, tool launch, navigation timeout, changing inventory, access denial, incomplete data, publication conflict or live verification. Record original timestamps and source provenance. Do not repeatedly contact denied sources during the same check.

### 2. Prove collection access before choosing a scheduler

Audit each existing adapter and supported browser path. Prefer existing permitted public listing/detail reads; no private endpoints or syndicated replacement for official prices. Measure request count and time. Use listing-provided fields first; visit details only for required missing evidence and physical-store reconciliation. Complete VIN reconciliation remains mandatory. A denied standalone browser remains unaccepted; scheduling it would only automate failure.

### 3. Build one unattended run coordinator

Give each store an independent job and status. Share a run lock and serialized publication lock. Save checkpoint after every bounded batch. Resume only unexpired matching runs; abandon expired work without modifying timestamps. Allow one fresh run for inventory changes, bounded retries for transient navigation, and zero challenge/denial retries. Ensure crashes cannot leave permanent locks. Preserve live snapshots on every unsuccessful path.

### 4. Select execution host using proven capabilities

Compare the existing cloud/public plus Codex/browser arrangement with a local Windows worker. The local worker is acceptable only if its required browser can run without user clicks and access is permitted. Test whether it needs an interactive session; do not label a logged-in-only browser as a logged-out service. Avoid duplicate collectors across cloud, local tasks and heartbeat.

### 5. Validate and publish safely

Require exact unique VIN counts, explicit price semantics and store identity. Publish only completed fresh snapshots independently per store. Rebase/retry narrowly scoped inventory changes, preserve app releases, request deployment and compare live JSON against collected evidence. Retained prices keep their original verification timestamps. Rebates retain separate expiry/freshness rules.

### 6. Add honest monitoring

Per-store states: fresh and verified, retained after failure, no verified amount, and recovery pending. Separate cloud schedule failures from dealer failures. Alert once on meaningful failure/recovery, not on every polling tick. Do not remove errors merely to stop GitHub emails; change notifications only after reliable replacement monitoring exists.

## Acceptance gate

- Actual morning and noon scheduled runs complete without input for every store, with exact live comparisons and complete reports.
- Repeat across three consecutive days before calling the system stable; this is an engineering confidence target, not a guarantee of permanent dealer access.
- Exercise process crash, lost network, expired checkpoint, changed inventory, overlapping trigger, concurrent app release, unavailable browser and denied page.
- Each failure preserves verified prices; recovery resumes safely or starts a fresh coherent run.
- Document PC power/session requirements. No success claim based only on fixtures, a timer configuration, a manual recovery or an overall green workflow.

## Decision boundary

If no permitted public collector can complete automatically for a store, record that external limitation explicitly. A different scheduling library cannot fix denied access. Keep the goal active while meaningful research/implementation remains; do not claim success by hiding alerts or relaxing complete-evidence requirements.

Official new-price audit: Coggin public HTML includes an explicitly labeled MSRP. The collector now saves msrps by VIN and retains original MSRP verification dates when absent in a later complete check. Parser/collector/retention tests pass. Next live collection and app consumption of this field remain unverified; existing public-feed MSRP must not be called officially verified.

App source now consumes official Coggin msrps when available and exact source/listing match; Greenway new MSRP uses exact VIN/stock/condition official evidence. Per-price original dates and retained flags remain attached. Eight focused tests and production build pass. Cloudflare app deployment remains pending; GitHub source publication is not a live app release.
