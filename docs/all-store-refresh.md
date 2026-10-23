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

Each helper accepts a writable checkpoint directory. When workspace writes are restricted in CUA, use `C:/Users/Sponk/AppData/Local/Temp/pocket-desking-scheduled`. This directory contains public vehicle evidence only. Save and archive the returned run metadata, checkpoint and complete evidence/snapshot into workspace tmp; never change the original startedAt or make an old checkpoint fresh. Start a fresh reserved run for each store at each scheduled slot. Resume the same checkpoint for a navigation interruption. Expired checkpoints are retained as failed evidence and replaced by a new reserved run. Publish stores independently after complete verification, so another store's failure cannot block the successful store.

Greenway: `createBrowserRun('greenway',{directory})`, then `runBrowserBatch(tab,run,{maxPages:3})` until done; publish the returned complete snapshot. The main runner supports two bounded passes for identical overlapping VINs and preserves complete new/used counts. Do not fall back to the older one-pass checkpoint form just because filesystem writes are restricted; use the writable directory option.

AutoNation: `createAutoNationRun({scope:'physical',directory})`, then `runAutoNationBatch(tab,run,{maxPages:3,maxVehicles:5})` until done. Check every advertised VIN, final inventory recheck, physical store scope and three promotional tiles before publishing the physical subset. Missing dealer reports remain unavailable.

Hutchinson: `createHutchinsonRun(key,{directory})`, then `runHutchinsonBatch(tab,run,{maxPages:1,maxVehicles:5})` until done. New and used pages capture exact labeled prices plus visible detail-tab colors. Used report destinations are checked separately in batches of five, followed by both section totals. A missing printed VIN in the Cadillac detail tab is accepted only with the unchanged VIN-bearing dealer listing URL and no conflicting printed VIN. Save the returned complete `-evidence.json`; then run `node scripts/finalize-hutchinson-run.mjs EVIDENCE` outside CUA. This performs the Node-only model/trim and complete-data validation and writes `-snapshot.json`. Publish with `node scripts/publish-hutchinson-inventory.mjs KEY SNAPSHOT --publish`. Do not publish the evidence file directly. Keep model and trim separate, last-eight VIN tile labels, OEM color fallback, and Sport interior labels. Never collect window stickers.

## Verification and acceptance

All publishers share the recoverable publication lock, preserve unrelated releases, pull/rebase before committing and verify exact live JSON. Deployment verification waits up to ten minutes and polls every ten seconds; HTTP 401/403/429 stop immediately. Never turn an old or modified HTTP 200 response into success. Missing fresh amounts retain the previous verified amount and its original verification timestamp indefinitely. Missing fresh reports are unavailable rather than synthesized.

Before starting Coggin recovery, inspect its Windows task and latest report, and wait for any running worker. Use the existing recovery command with its run lock. Run `node scripts/audit-unattended-inventory.mjs` afterward; this now covers all seven maps. A stale store must remain separately labeled retained, and the scheduled report must list all seven stores, evidence dates, complete counts, publication, live verification and actual trigger. Configured schedules, fixture tests, one-page probes and manual dispatches do not prove scheduled end-to-end success.

The October 23 manual cloud recovery 40007465709 succeeded after the timing repair. Both local Coggin maps passed exact live verification. The new Hutchinson helper passed one real listing-page probe for each of Kia, GMC and Cadillac; AutoNation passed a bounded list probe. These probes did not replace any full inventory. A full unattended scheduled cycle for all seven remains to be proven. The computer, logged-in Windows session, Codex and supported browser must remain available for browser-only stores; the cloud's three public inventory feeds continue independently.
