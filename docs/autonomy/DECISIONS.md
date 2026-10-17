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

## 2026-10-17 — Icon: hand-drawn glyph, no font

The AF monogram is built from `<polygon>`/`<rect>` geometry, not `<text>`: sharp
(libvips) has no guaranteed font stack on this host, so a text glyph would render
differently on another machine — or silently render nothing at all — and the
launcher icon is not something to discover broken on the device.

The A is two outlined legs with **horizontal** tops plus a crossbar. A stroked
apex was tried first and rejected twice: a joined path throws a miter spike, and
two butt-capped strokes meet in a V notch because each cap is perpendicular to
its own leg. Filled polygons give a flat apex and a clean counter.

`frontend/assets/*.svg` are the only source. `node scripts/render-icons.mjs`
rasterises them into `assets/*.png` (Capacitor's inputs) and `public/icons/*.png`
(the web manifest's), then `npx capacitor-assets generate --android` writes the
mipmaps and every splash density (74 files, 783 KB).

## 2026-10-17 — PWA manifest by hand, and no service worker

The web app's PWA was broken in three ways: `index.html` pointed at `/vite.svg`
and `/icons/icon-192x192.png`, neither of which existed, and `vite-plugin-pwa`
was a devDependency whose `VitePWA` import was never added to the plugin list.

Fixed with a hand-written `public/manifest.json` and real PNG icons — **not** by
wiring `vite-plugin-pwa`, which was then removed along with its unused import.

Reason: the plugin's value is its service worker, and a service worker on a
self-hosted app whose static bundle is replaced on every deploy is a machine for
"why is my change not showing up". AweFit is a thin client that loads the app
from the server anyway, so offline caching underneath it buys nothing and
threatens cache-staleness bugs on a live app. The manifest alone gives the icon,
name and standalone display that were actually missing.

## 2026-10-17 — Barcode lookup: local first, OpenFoodFacts second, cached

**Lookup happens on the server, not in the WebView.** One HTTP client, one place
for a user agent and a timeout, no dependence on a third party's CORS policy, and
a phone that never has to hold an API key. The route is the only thing the app
talks to.

**Local foods win.** A barcode already in the user's own food list answers
instantly and works offline. Only a miss goes to OpenFoodFacts, and a hit there is
**saved as a Food row for that user**: the second scan is local, the product turns
up in search, and the cache is the same table the rest of the app already reads.
One row per (user, barcode), which keeps two users' copies independent.

**Failure has three different meanings** and the client shows three different
messages: 400 for a code that is not 6–14 digits, 404 for "we don't know this
product" (try manual entry), 503 for "the lookup service is unreachable" (try
again). A dead third party must not look like a broken app, so an unreachable
OpenFoodFacts is never a 500.

**A product with no usable energy data is rejected**, not stored. OpenFoodFacts is
crowd-sourced: a 0 kcal row would silently log nothing and poison search results.
"No calories" is treated as "not found".

## 2026-10-17 — Camera scanning split out of FF-0014 into FF-0030

The lookup and the camera are different risks. The lookup is testable here; the
camera is not — a WebView scanner has to be judged on the actual phone, and the
two candidate approaches differ a lot:

- `@capacitor-mlkit/barcode-scanning`: a real native scanner sheet, reliable, but
  adds MLKit to the APK and leans on Play Services.
- `jsQR`/`zxing-js` over `getUserMedia`: keeps the APK small, but lives or dies on
  Capacitor granting CAMERA to the WebView — which has to be verified on the
  device, not assumed.

Shipping a typed code first means the feature is usable now, FF-0030 has a
decoded-code destination already built, and the camera decision gets made with a
phone in hand.

## 2026-10-17 — Camera scanning needs HTTPS (or a native plugin), so FF-0030 is parked

Measured, not assumed — a headless Chromium probe against the two addresses the
app actually uses:

| Origin | `isSecureContext` | `navigator.mediaDevices` |
| --- | --- | --- |
| `http://127.0.0.1:5001` | true (localhost is exempt) | present |
| `http://192.168.0.224:5001` | **false** | **undefined** |

AweFit loads the server by its LAN/Tailscale address, so a `getUserMedia` +
`jsQR` scanner would find `navigator.mediaDevices === undefined` and could never
open the camera — and testing it on `localhost` would hide that completely. That
makes the HTTPS work (FF-0008, blocked on the Tailscale Serve switch) a
**prerequisite** for the web-style scanner, and the native MLKit plugin the only
option that works over plain HTTP.

Parked rather than guessed: the MLKit route needs a device to verify (camera
permission, the scanner sheet, Play Services availability, +APK size), and its
alternatives are the kind of choice that should be made with the phone in hand.
FF-0014's typed code keeps the feature usable meanwhile.

## 2026-10-17 — A goal the user sets by hand must not be recalculated away

`PUT /api/auth/profile` recalculates `daily_calorie_goal` from BMR/TDEE whenever
any profile field changes and the profile is complete. Adding an editable goal on
top of that would have made it a lie: set 2350 today, correct your height
tomorrow, and the number silently changes.

So the column gains a companion flag, `calorie_goal_manual` (migration
`d6dc0a74684b`, default false — every existing row was derived, so false is
correct). A manual goal survives recalculation; `recalculate_user_calories` still
returns BMR/TDEE, which describe the body rather than the target. Sending
`calorie_goal_manual: false` hands control back to the calculation, which is what
the "use the calculated goal instead" action does.

Range is 500–10,000 kcal, enforced server-side with the constants in
`app/config.py`. Wide enough for a cut or a bulk, narrow enough that a stray
`20000` is rejected instead of quietly becoming the daily target.

Also fixed while here: the PUT answered `calorie_goal` while the GET answered
`daily_calorie_goal`, so no client could compare the two payloads. The PUT now
returns both keys.

## 2026-10-17 — Quick-add logs into a guessed meal, not a chosen one

FF-0018 asks for a "+" on recent foods that logs "to the currently selected
meal". There is no such selection when the screen is opened from the tab bar, so
the meal comes from two places, in order:

1. `?meal=` in the URL — the diary already links to Add Food per meal section
   (`/food/log?meal=lunch`), and that link was being ignored entirely.
2. Otherwise the clock: breakfast before 11, lunch before 16, dinner before 21,
   snack otherwise (and for 00:00–04:00).

One tap beat one dialog: guessing from the clock is fewer taps than asking, and a
wrong guess is a correction the diary already supports in two taps. The same meal
is now also passed on to the serving form when the row itself is tapped, so the
two paths agree.

The quick-add logs exactly **one serving** of the food's own nutrition — it is the
"same as last time" shortcut, and anything else goes through the serving form.
