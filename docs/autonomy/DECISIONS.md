# Decisions

Technical calls made while working the queue, with the reason. Reversible calls
land here; anything about product direction, money or the owner's data goes to
`QUESTIONS.md` instead and the loop moves on.

## 2026-10-17 — Android app shape

**Thin Capacitor client over `server.url`, not a bundled SPA.**
TWA/Bubblewrap needs HTTPS plus Digital Asset Links, which a plain-HTTP LAN
server cannot provide. Bundling the SPA locally would put the WebView on a
different origin from the API, which breaks Flask-Login's session cookie
(`SameSite=Lax` is not sent cross-site) and needs either `SameSite=None; Secure`
(TLS) or token auth. Loading the app *from* the server keeps one origin: cookies,
CORS, `/uploads` and every relative photo URL keep working unchanged. Cost: the
app needs the server reachable. Accepted by the owner as "thin is fine for now".

**App id `dev.awefit.app`, label `AweFit`.** Owner's requirement: no personal
name in the id. The id is permanent once installed.

**Updates over the LAN as a served APK**, not adb/USB: the owner's daily driver.
Requires a stable keystore (same key or Android refuses the in-place update) and
a strictly increasing `versionCode`.

**Tailscale HTTPS for the server address.** The LAN IP is DHCP, so a baked-in
`ANDROID_SERVER_URL` would rot. The `.ts.net` name is stable and gives a real
certificate, which also keeps the door open for a TWA later.

## 2026-10-17 — Autonomy

**Port AweCraft's `tasks.py` toolkit verbatim** (single-writer YAML registry,
flock, atomic replace, queue as the work order), with `FF-NNNN` ids. It is
already tested and battle-scarred; inventing a second format buys nothing.

**No `docs/autonomy/STOP` file.** The owner does not want it. Stopping is a
decision: finish the ticket in hand, then report — no new ticket is started.

**Automerge into `master` on green gates**, per the owner's standing rule that
merged branches are deleted without asking. Feature branch per ticket, merge,
delete locally and on origin.

**No round limit.** The queue is the budget. A round ends on merge or on park.

**Verify on a throwaway server, deploy through a sudoers drop-in.** `sudo` on
this host requires interactive auth, so an unattended round cannot restart
`fitnessfriend.service` by default. `scripts/gates.sh smoke` therefore boots its
own gunicorn against a *copy* of the database on a free port. Production is
flipped only through the passwordless rule in
`scripts/sudoers.d/fitnessfriend-agents` (installed once by the owner).

**`TODO.md` is the owner's inbox, the registry is the work order.** `TODO.md` is
gitignored, so it cannot be the durable queue; its open items were filed as
tickets. New items may be filed either way, but only the registry is worked.

## 2026-10-17 — Capacitor 8, not 7

`npm view` put `@capacitor/core` at **8.5.3**, so the Android track targets
Capacitor 8 rather than the 7 planned from the earlier search result. That moves
the native floor:

| | Capacitor 7 | **Capacitor 8 (chosen)** |
| --- | --- | --- |
| JDK | 21 | 21 |
| compileSdk / targetSdk | 35 | **36** |
| minSdk | 23 | 24 |
| AGP / Gradle | 8.7.2 / 8.11.1 | 8.13.0 / 8.14.3 |

Consequences recorded now so a later round does not rediscover them:

- `scripts/android-toolchain.sh` installs **platform 36 + build-tools 36.0.0**
  (35 is still on disk from the first pass and stays — it costs 200 MB and
  removes a whole class of "why does the build want a different SDK" detours).
- Capacitor 8 folds status-bar and edge-to-edge handling into a built-in
  `SystemBars` plugin with an `insetsHandling` option (`native` / `css` /
  `disable`) and `initialViewportFitValueHint`. FF-0007 should configure that
  first and only fall back to `@capacitor/status-bar` if v8's own handling is
  not enough — the old plugin is a second mechanism for the same job.
- Capacitor can sign the release build itself through
  `android.buildOptions` (`keystorePath`, `keystoreAlias`, `releaseType: 'APK'`,
  `signingType: 'apksigner'`), so FF-0005 does not need to hand-edit
  `signingConfigs` in Gradle unless that proves awkward.

`server.url` and `server.cleartext` are documented as "not intended for
production" because their usual consumer is live-reload. A deliberately thin
client loading the real app from the owner's server is the accepted v1 shape
(see the entry above); the warning is about intent, not capability.
