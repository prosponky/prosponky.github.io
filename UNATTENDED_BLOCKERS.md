# Unattended refresh: verified limits as of October 10, 2026

The current setup does not yet satisfy unattended collection for all four stores.

- Coggin Atlantic and Avenues: a manually started Windows scheduled task collected 276 and 259 vehicles, published complete maps and verified exact live equality. Last task exit code is 0. The next actual timed run is October 11 at 7 a.m. Eastern; noon is also configured. This is not yet scheduled acceptance evidence.
- Windows runtime: requires this PC powered on and Sponk signed in; locking is supported. Wake-to-run and missed-start catch-up are enabled. Signed-out or powered-off collection is unproven. No Windows password was saved.
- Greenway and AutoNation: standard Playwright public-page probes on October 10 at 21:14 UTC were denied. The recorded report is tmp/standard-browser/latest-report.json. Neither was retried with stealth or another identity. Supported CUA collection remains an assisted path, not a proven standalone unattended worker.
- AutoNation's retained physical-store snapshot is October 9 evidence. Its old schema lacks interior colors. Those prices remain available with old verification provenance; they are not freshly verified.
- GitHub CLI keyring authentication is unavailable in the scheduled Windows session. Git publication works, and exact live equality proved deployment despite the redundant Pages API request warning. No keyring secrets were extracted.
- Official Coggin MSRP capture and app consumption are tested. A fresh complete map containing that field and deployment of the app source still need verification. The current live app was not overwritten by these backend releases.

Next acceptance work: inspect the actual morning and noon task triggers/reports, compare complete published maps exactly, and find a permitted unattended access path for Greenway and AutoNation. A configured timer, green overall job, retained map or manual task start cannot close these requirements. Existing browser heartbeat checks remain scheduled; do not call them proof of a standalone unattended worker.
