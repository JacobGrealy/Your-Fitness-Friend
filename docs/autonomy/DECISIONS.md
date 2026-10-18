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

## 2026-10-17 — The add flow carries its own return path

Finishing a quick add used to land on `/food/log` — the search screen — no matter
where the flow started, so logging lunch from the diary put you back at a search
box. The origin now travels with the flow in **router location state**
(`{ returnTo }`), set by whoever opens it (the diary sets `/food/daily`) and
forwarded by each screen in turn.

`resolveReturnTo` validates it rather than trusting it: only in-app absolute
paths, and never anything inside the add flow itself (`/food/log*`,
`/food/photo-log`, `/food/barcode`), because returning into the form you just
submitted is worse than the old behaviour. With no recorded origin — entering
from the tab bar — it falls back to `/dashboard`, which is what the ticket asked
for ("the last non-Add Food page, or home if none exists").

Location state rather than a query parameter: it never ends up in the URL bar, so
it cannot be shared, bookmarked or replayed into a redirect after the fact.

## 2026-10-17 — The TODO backlog had drifted; six items were already shipped

FF-0012, FF-0015, FF-0020, FF-0022, FF-0023, FF-0024 and FF-0025 all turned out to
be implemented already. Each was filed from `TODO.md`, which is gitignored and
had not been reconciled with the code since the screens it describes were
rewritten (the chart components, the add-flow bar, the profile sheet).

Rather than keep discovering that one ticket per round, the remaining
TODO-derived queue was audited in a single pass. Outcome:

| Already shipped | Genuinely missing |
| --- | --- |
| chart order (0012), add-menu order (0015), Quick Add bar (0020), height field (0022), BMR/TDEE (0023), weekly goal → daily target (0024), weekly goal setting (0025) | goal ETA (0026), Then & Now (0027), timelapse (0028), serving amounts on diary rows (0029), the stale `/food` page (0031) |

The audit cost was one round; the three cancelled-here tickets would have cost
three. Each keeps a test that pins the behaviour, so "already done" is evidence
rather than an opinion, and `TODO.md` is no longer treated as a work list: the
registry is.

## 2026-10-17 — A goal date is projected from the trend, and withheld when unknown

FF-0026 asks for an ETA under "Distance to Goal". Two ways to compute it, and the
choice matters because a wrong date here is worse than no date — it is the number
a user plans around.

**The logged trend comes first** (`src/utils/goalEta.ts`): a least-squares slope
over the last 28 days of weigh-ins, requiring at least three points across at
least seven days. A single week's difference is noise (water, salt, time of day),
which is why the ticket says "not a single week".

**The configured weekly goal is the fallback**, used when the trend is flat
(|rate| < 0.2 lb/week), too short, or moving away from the goal. The UI labels
which source was used — "(your trend)" or "(your goal)" — because those are
different claims.

**Nothing is shown** when the goal is already met, when there is no goal weight,
or when the projection is more than two years out. A date invented from a flat
trend is confident nonsense; an empty space is honest.

Computed on the client rather than in the API because the Progress page already
holds every weigh-in it needs: another endpoint would be a round trip to
recompute what is on screen.

## 2026-10-17 — Camera scanning is jsQR, and only because the origin is HTTPS

Once Tailscale Serve was enabled, the app's origin became
`https://home-server-1.tail96ee52.ts.net`, and the blocker recorded in the audit
disappeared: measured in Chromium against that URL, `isSecureContext` is `true`,
`navigator.mediaDevices` is an object and `getUserMedia` is a function. Over the
plain-HTTP LAN address all three were the opposite.

So route 1 from QUESTIONS Q3 was taken: **scan inside the WebView with jsQR**, no
native plugin, no Play Services dependency, no extra APK weight.

`jsQR` rather than the Barcode Detection API even though Chrome exposes that API
on Android: it is **not** exposed inside an Android WebView, which is the only
place this app actually runs. A decoder that works in Chrome on the desktop and
silently fails on the phone would be the worst outcome, and jsQR is pure
JavaScript so it behaves identically everywhere.

The typed field from FF-0014 stays, both because a damaged or curved label is the
normal case in a kitchen and because it is the fallback when the camera is refused.
The sheet now opens on the camera and offers "Type the barcode instead".

Decoding is throttled to ~8 frames/second (`DECODE_INTERVAL_MS = 120`), stops at
the first successful read, buzzes once for feedback, and always releases the
camera tracks on unmount — a scanner that keeps the camera warm after the sheet
closes is a battery complaint waiting to happen.

## 2026-10-17 — The Android build defaults to the HTTPS origin

`https://home-server-1.tail96ee52.ts.net` is now the baked-in default server for
AweFit (FF-0008), for three reasons in order of weight: it is a **secure context**
(the camera scanner cannot open the camera without one), the certificate is
publicly trusted so the WebView needs no exception, and the name is stable where
the LAN address is DHCP.

`cleartext` is now derived from the URL scheme rather than hardcoded, so an HTTPS
build carries `cleartext: false` and a LAN test build keeps working.

**Trap found while doing it:** the default lived in two places — `capacitor.config.ts`
*and* `scripts/build-android.sh`, which exports its own fallback. The first rebuild
shipped 0.1.3 still pointing at `http://100.84.29.20:5001` because the script's
value wins. Both now hold the HTTPS default with a comment pointing at the other,
and the script warns loudly when it bakes a cleartext URL. Verify the result by
reading `assets/capacitor.config.json` out of the APK, not by trusting the build
log.

`SESSION_COOKIE_SECURE=true` goes in `.env` (not in the config class) because it is
a property of *this deployment*, not of the code: a plain-HTTP dev host must still
be able to log in. The consequence is recorded in `AGENTS.md` — the cookie stops
travelling to the LAN address, so `http://192.168.0.224:5001` can no longer log in.

## 2026-10-17 — The task board is AweCraft's board, not a page in the app

The queue needed a UI. Three options were on the table — a `/queue` route inside
the Flask app, a generated static HTML file, or AweCraft's standalone board — and
the board won because it already exists, is already trusted, and keeps developer
tooling out of the product app.

Ported as-is (renderer + stdlib server, no build step, no dependency). Three
adaptations:

1. **No per-ticket artifacts.** AweCraft links `tasks/<id>/spec.html`, results
   HTML and PNG galleries; FitnessFriend tickets are flat registry entries, so the
   folder links and the `/tasks/<id>/...` static route were removed rather than
   left pointing at nothing.
2. **Port 5181**, because AweCraft's board owns 5180.
3. **Narrow-screen CSS.** The relationship tables in AweCraft break `AC-0445` and
   `in-progress` across lines at 390 px. Since this board is read mostly on a
   phone, the id and status cells got hooks and a `nowrap` rule.

**No auth, by explicit owner choice**, matching AweCraft: readable and editable by
any device on the LAN or tailnet. That is a deliberate posture, not an oversight —
and it means ticket notes are network-visible, which `tasks/AGENTS.md` says out
loud.

The board and the CLI sharing one mutation layer is what forced FF-0034: the
library could reorder the queue while the CLI could not, so the board would have
been strictly more capable than the command line. Both now cover the same ground.

## 2026-10-17 — The app shell owns the viewport height, pages do not

Short pages could be scrolled by 136px into empty space. Measured at 390×844:
`/dashboard` and `/food/daily` reported `scrollHeight` 980 against
`innerHeight` 844 — and `main` computed `padding-top: 56px` + `padding-bottom:
80px`, exactly that 136px.

The cause is two rules that are each reasonable alone: the shell pads its content
by the header and bottom-nav heights (plus safe-area insets), and the pages inside
it declared `min-h-screen`. `100vh` inside a padded container means the document is
a full viewport *plus* the padding before any content is counted, so the page is
always slightly taller than the screen.

So responsibility is now explicit: **`Layout.tsx` owns the viewport height** (a
flex column at `min-h-[100svh]`, with `main` as `flex-1`) and pages rendered inside
it must not set `min-h-screen`. Auth pages sit outside the shell and keep theirs.

`100svh` rather than `100vh` in `index.css` and the shell, because in a phone
browser `100vh` is the *largest* viewport: laying out against it is scrollable the
whole time a URL bar is visible, which would reintroduce the same overshoot in the
browser even though the WebView is stable.

`scripts/gates.sh` gains a `layout` gate that fails when a file under
`frontend/src/pages` (excluding `pages/Auth/`) claims the viewport height — the
contract is easy to break again by habit, and the failure mode is a subtle scroll
jitter rather than something a test would otherwise catch.

**The gate must match both spellings.** The first version only looked for the
Tailwind class, and Progress shipped the same bug as an inline
`style={{ minHeight: '100vh' }}` — invisible to a class-based grep, and the one
screen still scrolling after the "fix" (FF-0052). It now matches the class *and*
inline `minHeight`/`height` of `100vh`/`100svh`, and both probes were confirmed to
fail the gate.

Also settled there: a page's own bottom padding must not duplicate the shell's
80px bottom-nav clearance. Two pages carried it (`pb-20`, `pb-32`), which is extra
scrollable emptiness on top of the shell's. The 36px still reported by
`/weight/log` is *not* that — it is the clearance that lets the submit button
scroll out from behind the fixed nav, and removing it would strand the button
under the bar.

## 2026-10-17 — Complete Diary copies MyFitnessPal's rules, including the ones that say no

Researched from MyFitnessPal's own help centre (article 360032624131, "How does
the Complete This Entry or Finish logging for today feature work?", updated
2026-10-10) rather than from memory, because the details that matter are the
cautious ones:

- The projection is **five weeks**: 35 days of "just like today", from the
  current weight. Framed as motivational, not predictive — MFP says the same.
- **Under-eating thresholds are gender-specific.** At/above 1200 kcal (women) or
  1500 (men) the projection is shown plainly. Between 1000–1199 / 1200–1499 it is
  shown **with** an under-eating warning. Below 1000 / 1200 the warning replaces
  the projection.
- Completing is **not required** for the logging streak, and you can keep logging
  afterwards and complete again.

AweFit keeps all three. `evaluate_intake` holds the bands in one place, and
`build_completion` withholds `change_lbs` — rather than clamping it — whenever the
number would be misleading: nothing logged, intake below the threshold, or a
profile missing age/height/weight/activity so TDEE cannot be computed. A wrong
projection is worse than an absent one; the UI shows the reason in the same slot
the number would occupy.

Two deliberate departures:

- **Unknown gender raises no warning.** There is no honest basis for picking a
  gender-specific threshold, so we do not guess one.
- **The completion is persisted** (`diary_completions`, one row per user per day)
  so the diary can show that a day was finished and the app can count consecutive
  completions. MFP's completion is largely a window; ours is a record. Re-completing
  updates the row, matching MFP's "carry on logging and complete again".

Deferred on purpose: sharing a day (MFP offers it), and any tie between completion
and a logging streak — MFP explicitly says those are separate, and inventing a
coupling would make the app nag about a thing that does not matter.

## 2026-10-17 — Notifications are local and device-owned, not pushed

Asked whether this app can send notifications, the honest answer needed three
options separated, because only one is open to us:

- **Local notifications** (`@capacitor/local-notifications`): the device schedules
  its own. No server, no third party, nothing to leak. This is what AweFit uses.
- **Web Push**: impossible here. Android's WebView has no Push API and no service
  worker, so the web app cannot notify through the browser on Android at all.
- **FCM push**: would work, but buys only one capability — the *server* initiating
  a message — at the cost of a Firebase project, `google-services.json`, a server
  key and an external dependency. Deferred until something actually needs it.

So reminders live where the schedule does: `localStorage` under `awefit.reminders`,
rescheduled idempotently whenever the app starts. Fixed notification ids (1001–1003,
1010) mean re-applying replaces rather than duplicates, which is what makes "just
run it on every launch" safe. The plugin also ships a
`LocalNotificationRestoreReceiver`, so a phone reboot restores alarms on its own;
ours is belt and braces.

Two consequences accepted deliberately:

- **Nothing syncs.** Reinstalling the app loses the settings — they are on the
  phone, not the account. That is the same trade as the schedule itself.
- **The JS is newer than the APK.** Same chicken-and-egg as the update button: the
  code is served from the server, the plugin lives in the binary. An older install
  gets `'unsupported'` and a line telling the user to install the latest, never a
  switch that silently does nothing.

## 2026-10-17 — Android needs to be *told* about the camera, twice

"Take photo" behaved like "Choose from library". The button was fine and so was the
JS; two manifest omissions were hiding it, and neither is visible from the web side.

**Package visibility (Android 11+).** Capacitor's `showImageCapturePicker` refuses
to launch the capture intent when
`takePictureIntent.resolveActivity(packageManager)` returns null, and under package
visibility filtering that is null unless the app declares a `<queries>` element for
the intent. It then logs "Media capture intent could not be launched. Falling back
to default file picker" and opens the gallery — a silent downgrade, indistinguishable
from a working gallery button. A `<queries>` block for `android.media.action.IMAGE_CAPTURE`
(and `GET_CONTENT` for `image/*`) fixes it. Note the `<queries>` element is only
about *visibility for resolution*; it grants nothing.

**The CAMERA permission.** Capacitor's `onPermissionRequest` translates
`webkit.resource.VIDEO_CAPTURE` into a request for `Manifest.permission.CAMERA` and
`request.deny()`s when that fails — so without the permission declared, `getUserMedia`
cannot work at all. That means the barcode scanner (FF-0030) was broken for a reason
no amount of host-side testing could reveal: the permission was never in the manifest,
so the OS denied the request instantly.

Rule for this project: **anything the WebView asks the OS for must exist in
`android/app/src/main/AndroidManifest.xml`, and anything resolved rather than started
implicitly needs a `<queries>` entry too.** Verify in the built artifact with
`aapt2 dump permissions` and `aapt2 dump xmltree --file AndroidManifest.xml`, not
from the Gradle log, because both failures produce a working-looking app.

## 2026-10-17 — A QR decoder cannot read a product barcode

The scanner opened the camera and never recognised anything. It decoded with
**jsQR**, a QR-only library: product barcodes are 1D (EAN-13, UPC-A, Code-128), so
jsQR returned `null` for every packet on the shelf regardless of framing. Proved
rather than assumed — a hand-built, checksum-correct EAN-13 module pattern
(`3017620422003`) decodes to the right digits through ZXing, and the identical pixel
buffer returns `null` from jsQR.

`@zxing/library` replaces it outright (it reads 1D and 2D), restricted to EAN-13,
EAN-8, UPC-A, UPC-E, Code-128, Code-39, ITF and QR. jsQR is gone from the bundle.

**The trap worth remembering:** ZXing's `RGBLuminanceSource` only unpacks pixels when
`BYTES_PER_ELEMENT === 4` (an `Int32Array`). Hand it a canvas `Uint8ClampedArray` of
RGBA and it treats every *byte* as a pixel — the image is noise and every frame fails
to decode, with no error anywhere. My own first probe failed for exactly this reason.
`toLuminance()` now does the conversion explicitly, and a real bitmap decode is a
unit test rather than something only a phone could check.

**A UPC-A is an EAN-13 with a leading zero**, and ZXing reports a leading-zero
EAN-13 as UPC-A — discovered by the test, not by reasoning. So the server canonicalises
12-digit codes to 13 digits, stores that form, and searches both: one product stays
one row, and a row cached before this existed is still found.

## 2026-10-17 — Nutrition is stored per serving, and the label must agree

Scanned products read several times too high (the owner's peanuts were 536 kcal for a
28 g serving; real value ~150). `parse_product` read OpenFoodFacts' **per-100g**
nutriments and attached the product's `serving_size` label to them, so a 100 g figure
wore a serving label. `Coffee mate` — a 2 g serving — was 50× out.

Three sources of truth, in order, and the label always matches the numbers:

1. **OFF's own per-serving fields** (`energy-kcal_serving`, `proteins_serving`, …)
   when published. Authoritative: OFF already knows the serving mass and its own
   rounding. Verified against the live API — crisps at 536 kcal/100 g and 152 kcal
   per 28.349 g portion, which our arithmetic also produced.
2. **Scale per-100g by the serving mass**, from `serving_quantity` or a mass parsed
   out of `serving_size` (`15 g`, `250ml`, `1.5 oz`). A mass is required; "1 cup" or
   "1 bar" cannot be converted without inventing a density, and guessing is the bug.
3. **Keep per-100g numbers and label them `100 g`.** Honest and unscaled beats
   confident and wrong.

Consequences worth stating plainly:

- **The cache serves stale numbers forever.** A `Food` row cached from a barcode is
  never refreshed, which is what makes scanning instant and offline-capable — and it
  is why fixing the parser does not fix rows already written.
  `scripts/refresh-barcode-foods.py` re-reads them (`--apply` to write). The owner's
  four affected rows were products they never logged, so they were deleted instead.
- **`food_logs` are not rewritten.** A logged entry records what was believed at the
  time; correcting history is a different decision from correcting a lookup.

## 2026-10-17 — Deleting a custom food detaches diary entries, it never deletes them

The Custom Foods trash can called `DELETE /api/food/<id>`, which **did not exist** — the
route only ever had DELETE for food *logs* — so deleting a custom food did nothing at
all, and the failure was invisible because the toast read `.message` while the API
returns `.error`.

The interesting part was the semantics, decided deliberately rather than by accident.
A `food_logs` row copies its own name, calories and macros at the time of logging, so
a food and its entries are already loosely coupled in that direction — and
`delete_food_log` already prunes an orphaned food by name, so the pair is symmetric.

Options weighed: **detach** (keep the entries, drop the link), **refuse** while entries
exist, **cascade** delete the entries, **archive** the food. Chosen: **detach**,
because a tidy-up of the food list must never quietly change what your diary says you
ate, and because it is the only option that neither destroys history nor blocks
cleanup. The response carries `logs_kept`, and the toast says
"Food deleted — 3 diary entries kept their own values", so the outcome is stated
rather than left to be noticed.

Ownership rules keep the answer honest: another user's food, or a shared
`user_id IS NULL` food, returns the *same* 404 as one that does not exist, so
ownership cannot be probed. The shared foods stay; only your own are deletable.

## 2026-10-17 — Closing the diary is a finish line, so the payoff lives on the diary

The completion modal was a dead end: the projection appeared once, inside a window
that then closed, and nothing accumulated. The owner asked for streaks and for the
closed state to be part of the diary itself — explicitly to make closing feel like
something you protect rather than a button you press and forget.

Three decisions:

**The projection moved under the goal / food / exercise line.** That is where the eye
already is when someone is deciding whether to add one more thing, and it is the one
place where "if every day were like today" can argue against eating more. It renders
from the load request — `GET /api/food/diary/completion` now returns the whole closed
summary rather than just totals — so no second round trip and no flash of empty panel.

**Reopen lives inside the closed panel, and the bottom row is gone.** One way out, in
the place that says the day is closed. The old bottom "Diary complete / Undo" row
disappeared entirely: two ways to undo one action is how a finish line stops feeling
like one.

**Two streaks, counting differently on purpose.** `closed_days` counts consecutive
closed days whatever you ate; `within_goal_days` counts consecutive closed days whose
intake was above zero and at most 10% over the goal (so under-goal always counts).
Both use *current-run* semantics: count back from the most recent qualifying day, and
return 0 once that day is older than yesterday — a broken streak must read as broken,
not as yesterday's total stuck on screen forever.

One deliberate asymmetry, found by writing the test: if you close today **over** goal
after two days on target, the on-target streak shows **2**, not 0. Reporting 0 would
erase a real achievement the moment someone goes over, which is precisely the moment
they are most likely to abandon the app. The run ended yesterday, and yesterday still
counts as current. The closed-day counter keeps counting either way — that difference
is what the two numbers are for.

The modal still celebrates (it is the moment of closure) and now shows both counters,
but it is bound to the act of closing: revisiting an already-closed diary shows the
panel, not the modal.

## 2026-10-17 — Weekday numbering: JS counts from Sunday 0, Capacitor from Sunday 1

A "Monday" weigh-in reminder arrived on Sunday morning, and would have arrived every
morning, for two reasons at once:

1. `buildSchedule` **never put `weekday` in the schedule**. Capacitor's `ScheduleOn`
   treats `{ hour, minute }` with `repeats: true` as *daily*, so the weekly reminder
   was really a daily one. The meal reminders are mean to be daily, which is why the
   omission was invisible there and only surfaced on the weigh-in.
2. Even once added, the two numberings differ: `Date.getDay()` is Sunday = 0 …
   Saturday = 6, while Capacitor's `Weekday` enum is **Sunday = 1 … Saturday = 7**
   (verified in `@capacitor/local-notifications`' `definitions.d.ts`). Off by one
   silently moves a reminder to the neighbouring day — the same class of bug, harder
   to see.

`toCapacitorWeekday()` is now the single conversion, named and exported, and the tests
pin the whole map (`[0..6] → [1..7]`, Monday → 2) plus the complement: meal reminders
must **not** carry a weekday, because for them daily is correct.

Already-scheduled notifications repair themselves on the next app open: the reminders
card re-applies on mount, and `applyReminders` cancels the fixed ids before scheduling,
so the stray daily weigh-in is replaced rather than duplicated.

## 2026-10-18 — Streaks are the habit, badges are the collection, and days are judged by their own goal

The owner set the shape: a Sunday–Saturday strip on the diary **and** Home, best streak
only in More, and three nested week badges — perfect week (7/7 closed), on target week
(≥5/7 within 10%, still requiring 7/7 closed) and **golden week** (7/7 within 10%).
Badges are **repeatable**: each qualifying week adds to a count, so they are a
collection rather than a one-time checklist.

Two consequences worth stating:

**Days are judged by the goal that applied then.** `within_goal` compared every
historical day against the *current* goal, so changing the goal silently rewrote the
past: a 1600 kcal day closed against a 1500 goal would stop being "on target" the
moment the goal was raised to 3000. `diary_completions.goal_calories` now records the
goal in force at close time (migration `cef99f51c9d7`, backfilled from the user's goal),
and every evaluation reads the stored value with the current goal only as a fallback.

**Badges are derived, never stored.** Counts are computed from the completion history,
so there is no badge table to drift out of sync, no "earned at" timestamp to migrate,
and changing badge rules is a code change rather than a data repair. The cost is that
history must remain interpretable — which is exactly why the per-day goal is stored.

Weeks are Sunday-start because `date.weekday()` counts from Monday (Sunday is 6), and
the badge *and* the strip must agree on where a week begins or the reward contradicts
the evidence. `week_start()` is the single definition.

## 2026-10-18 — The strip shows the week you can still affect; best streak does not belong there

Built to the owner's spec, with one addition that only showed up on a real Sunday.

**The strip names its week.** The owner chose the full Sunday–Saturday week, which means
that on a Sunday it is empty while the run length above it can read "5 days closed" —
those five days belong to the week that just ended. Both numbers were correct and looked
like they disagreed, so the strip now says `this week` above the dots. Naming the window
is cheaper and more honest than fudging the window.

**The dot states are four, and none of them is red.** `on_target` green, `closed` blue
(closed but over goal), `open` amber for today, `missed` hollow, `future` pale. A day
that was closed but over goal is an honest state, not a failure, and colouring it as one
would discourage exactly the behaviour the badge ladder rewards. The strip also carries
its own deadline — the tag flips between "close today to keep it" and "today counts" —
because a streak number without a deadline is trivia.

**Best streak lives only in More.** On the diary it would compete with the week you can
still change; in the badge section it is part of the record. Same reasoning that keeps
it off Home.

**Badges are counted, not ticked.** Each qualifying week adds to a count (a golden week
also earns the two below it), so the section reads as a collection. Locked badges show
progress through the *current* week rather than a grey mystery.

One implementation note: `StreakStrip` is a single component used by the diary (open
state), the closed panel and Home — one visual language, one set of states, and the only
per-screen difference is which container it sits in.

## 2026-10-18 — A photo save states its intent; it never infers it from shared state

One expression caused the whole FF-0073 bug family:
`photo_url: uploadedPhotoUrl || null`. That single line conflated three different
intents and got all three wrong:

| Intent | What it must send | What it sent |
|---|---|---|
| untouched | nothing (omit the key) | `null` — **erased the photo** |
| new file | the uploaded URL | `null` — the closure held the pre-upload value, leaving an orphan file |
| removed | `null` | `null` — correct by accident |

The replacement states each intent explicitly in `onSubmit`: a picked file is uploaded
*before* the save and its returned URL used; an explicit removal sends `null`; an
untouched photo omits the key. The omission is built into the object rather than left to
axios dropping `undefined`, because the backend's rule is `'photo_url' in data` — the
presence of the key is the instruction, so whether the key exists must not depend on a
client library's serialisation behaviour.

Two things were tangled into that same field and are now gone:

**`uploadedPhotoUrl` was cross-page state doing double duty** as "did I just upload" and
"what should be saved". It survived navigation, so an upload from an earlier screen made
a saved photo fall through to the "Tap to take a photo" placeholder, and it could attach
one entry's photo to another. Both pages now decide locally and clear the shared slot on
mount.

**A saved photo had no remove control at all.** The ✕ existed only on the freshly picked
preview, so an already-saved photo could not be removed from the UI — the "explicit
Remove" path in the ticket was unreachable before this fix added the control.

Also fixed while proving it: a failed upload now aborts the save quietly instead of
rejecting, which was surfacing as an unhandled promise rejection on the phone.

## 2026-10-18 — Looking at an entry must not be able to change it

Tapping a row in Weight History used to land in the edit form, so reviewing an old
weigh-in put live number inputs under your thumb and buried the photo under a "Tap to
change photo" overlay. `weight/history/:id` is now a read-only screen; editing is an
explicit step from it.

The rule that matters: **a view screen makes no mutating request on mount.** No autosave,
no "touch" write, nothing that can alter an entry by being looked at. The one request it
makes is the fetch, and there is a test asserting no update or delete fires
(`sends no mutating request just because the entry was opened`). It is the counterpart to
FF-0073: that fixed a save that destroyed data, this one makes sure a *read* cannot,
which is the only way "just look at it" can be a safe thing to offer.

Two smaller rules, both from bugs already in this repo:

**The day comes from `localDateOf`, not the ISO string.** FF-0059 was exactly this class
of bug — evening logs filed on tomorrow — and a second hand-rolled date path is how it
comes back.

**A missing photo is an empty state, not a broken image.** The serve route answers a
missing file with a JSON 404, so the `<img>` hides itself via `onError` and the block
reads "No photo for this entry." — deliberately worded differently from the notes empty
state, so the screen still reads as complete.

The photo URL now has one home, `utils/photoUrl.ts`. It existed as three hand-rolled
copies (EditWeight, ThenAndNow, WeightTimelapse) and this screen would have been the
fourth; four copies is where it drifts. The serve route accepts both `weight_photos/x.jpg`
and a bare filename, so the stored value passes through unchanged.

## 2026-10-18 — Shared state is for reading, never for deciding

FF-0073 and FF-0075 are the same field (`uploadedPhotoUrl`) in two stores, failing in
opposite directions: in the weight store it was written into a save payload (destroying
photos), in the food store it was used as a control-flow guard (cancelling uploads).
Attaching a photo to entry A and then entry B lost B's photo, because B's guard read A's
value and skipped the upload.

The rule now, in both places: **cross-page store state is not an input to a decision.**
Each screen holds its own "did I upload *this* file" fact, reset when the file changes,
and clears the shared slot on mount so it cannot steer a later screen. The shared field
stays for other readers, but nothing branches on it.

Two supporting fixes:

**Uploads return their URL.** `uploadFoodLogPhoto` now resolves to the photo URL and
rethrows on failure, matching `weightStore.uploadPhoto`. The asymmetry was the reason the
skipped upload was invisible: a swallowed error let `onSubmit` carry on to
`updateFoodLog` and `navigate(-1)`, so the user got a success-flavoured exit while nothing
was uploaded. A failed upload now keeps the user on the page, with the store's error
already on screen.

**The photo is the confirmation.** After a successful upload the page used to replace the
image with the words "Photo uploaded", so the thing the user had just attached appeared to
vanish. The image now stays.

## 2026-10-18 — The camera is a choice, and `capture` is the switch that removes it

Every photo upload offers camera **or** gallery, except the barcode scanner, which needs a
live feed and has no file input at all.

The mechanics are one HTML attribute: a file input with `capture="environment"` sends
Android straight to the camera and makes the gallery unreachable, while the same input
without `capture` opens the picker. Five screens had it hard-coded, so they could take a
photo but never pick one; `PhotoLog` had already solved this inline with two inputs. That
made the work a consolidation, not an invention: `PhotoSourceChooser` owns both inputs
(with and without `capture`) and offers them as a bottom sheet for forms, or as two inline
cards for a full-page capture step.

`capture=` now appears in exactly one file, and a test asserts the gallery input does *not*
carry it — because that is the failure mode: adding it back silently removes the choice
again, with no visible error.

**Destructive maintenance must name its directory.** While cleaning up after verification I
ran an "unreferenced uploads" sweep across every upload folder instead of the
`weight_photos` folder the owner had authorised, and deleted ~470 files (profile, meal and
AI food-log images). Unreferenced is not the same as safe to delete — the restore was
possible only because the tree is snapshotted before destructive changes.
