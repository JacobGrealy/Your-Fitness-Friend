# Journal

Append-only. Newest entry **last**. One entry per autonomous round: what landed,
which gates passed, the commit, and what the next round should pick up.

This file is the memory that survives context compaction. A resumed session
reads the last entry first, then `tasks.py next`. Nothing else is assumed.

---

## Round 0 — 2026-10-17 — planning (no code)

Owner asked for an Android sideload plan and an autonomous-operation plan
modelled on AweCraft. Both were written, reviewed, and answered:

- Android: thin Capacitor client (`server.url`), **AweFit**, `dev.awefit.app`,
  new AF icon, camera capture required, LAN APK updates, Tailscale HTTPS.
- Autonomy: port `tasks.py` verbatim, automerge on green, no round limit, no
  STOP file, sudoers drop-in for restarts, standard subagent tools (no custom
  builders).

## Round 1 — 2026-10-17 — autonomy scaffold (FF-0001)

Landed:

- `tasks/scripts/tasks.py` + `tasks_lib.py`, ported from AweCraft with
  `FF-NNNN` ids (single-writer YAML registry, flock, atomic replace, queue).
- `tasks/TASKS.yaml` seeded with 29 tickets: the Android/AweFit track first,
  then the open `TODO.md` bugs, then the feature backlog.
- `scripts/gates.sh` — pytest, jest, tsc, and a throwaway-gunicorn smoke gate
  that runs against a copy of the database, never the live one.
- `COORDINATOR.md`, `docs/autonomy/{JOURNAL,QUESTIONS,DECISIONS}.md`,
  `.dsh/skills/ff-{work-ticket,gates,closeout}`, `tasks/AGENTS.md`.
- `scripts/sudoers.d/fitnessfriend-agents` — passwordless restart for the two
  services, pending a one-time install by the owner (needs root).

Next: FF-0002 (Android toolchain), then FF-0003 (Capacitor scaffold).

## Round 2 — 2026-10-17 — FF-0002 Android toolchain

Landed: `scripts/android-toolchain.sh` — root-free install of Temurin JDK 21 to
`~/tools/jdk-21` and the Android SDK to `~/tools/android-sdk` (cmdline-tools,
platform-tools, platforms;android-36, build-tools;36.0.0), licences accepted,
`env.sh` generated, verification step that exits non-zero listing anything
missing. `--check` reports without changing anything.

Verified on this host: java 21.0.12.1, sdkmanager responds, adb 1.0.41, both
SDK platforms present. Capacitor 8 (not 7) is current — SDK 36 and AGP 8.13,
recorded in DECISIONS.md with its consequences for FF-0005/FF-0007.

Next: FF-0003 — Capacitor scaffold (`dev.awefit.app`, webDir `../app/static`,
`server.url` from `ANDROID_SERVER_URL`, cleartext).

## Round 3 — 2026-10-17 — FF-0003 Capacitor scaffold

Landed: `frontend/capacitor.config.ts` (appId `dev.awefit.app`, appName AweFit,
webDir `../app/static`, `server.url` from `ANDROID_SERVER_URL` defaulting to the
Tailscale address, `cleartext` derived from the scheme) and the generated
`frontend/android/` project, committed. npm scripts `android:sync`,
`android:debug`, `android:open`.

Verified end to end: `./gradlew assembleDebug` **BUILD SUCCESSFUL** in 12m51s
(first run downloads Gradle 8.14.3 + AGP 8.13) and produced a 4.3 MB
`app-debug.apk` — `package=dev.awefit.app versionCode=1 minSdk=24 targetSdk=36
application-label='AweFit' uses-permission INTERNET`. That is the whole toolchain
proven, not just present.

Trap harvested into AGENTS.md: this shell exports `NODE_ENV=production` and npm
therefore **omits devDependencies** — the first two `npm install` runs reported
success while `@capacitor/cli` and `@capacitor/android` were never installed, so
`npx cap` was missing. Fix: `NODE_ENV=development npm install --include=dev`.

Next: FF-0004 — the AF icon and splash (the generated launcher icons are still
Capacitor's default), then FF-0005 signing, FF-0006 the release APK + LAN serve.

## Round 4 — 2026-10-17 — FF-0004 AweFit icon, splash and the broken PWA

Landed: the AF monogram as hand-drawn geometry (`frontend/assets/*.svg`), a
rasteriser (`frontend/scripts/render-icons.mjs`, sharp), and
`npx capacitor-assets generate --android` — 74 resources covering every mipmap,
adaptive foreground/background and both splash variants. Verified visually at
1024 px and in the built `ic_launcher.png`; `./gradlew assembleDebug` rebuilt
clean in 12s with the new resources.

Also repaired the PWA, which was broken three ways: `index.html` referenced
`/vite.svg` and `/icons/icon-192x192.png` (neither existed), and
`vite-plugin-pwa`'s `VitePWA` was imported but never registered. Now: real PNGs,
`public/manifest.json`, title and manifest name **AweFit**. The dead
`vite-plugin-pwa` dependency and import were removed rather than wired — a
service worker over a bundle that is replaced on every deploy is a cache-staleness
machine, and this app is a thin client anyway (DECISIONS.md).

Next: FF-0005 — release keystore, signing config, keystore backup, and the
versionCode bump that makes in-place updates possible.

## Round 5 — 2026-10-17 — FF-0005 release signing

Landed: a 4096-bit RSA release keystore at `~/.android-keys/awefit-release.jks`
(10,000-day validity — a key that expires stops future updates), addressed from
the gitignored `frontend/android/keystore.properties`; `signingConfigs.release`
in `app/build.gradle` that degrades to an unsigned build when no keystore exists;
`scripts/android-version.py` (`show` / `bump` / `set-code`) because a stale
`versionCode` fails as `INSTALL_FAILED_VERSION_DOWNGRADE` *after* a successful
build and download; and `scripts/backup.sh` now snapshots the keystore plus the
properties file into `backups/keys/` (mode 700), with the restore command
documented in README.

Verified: `./gradlew assembleRelease` → BUILD SUCCESSFUL, 3.6 MB APK,
`apksigner verify --print-certs`: v2 scheme verified, signer
`CN=AweFit, ...`, `package=dev.awefit.app versionCode=1 versionName=0.1.0`.
`./scripts/backup.sh` reports `keystore: 16K (mode 700)`.

Next: FF-0006 — build script producing the signed APK, served over the LAN at
`/download/awefit.apk` so the phone can update without a cable.

## Round 6 — 2026-10-17 — FF-0006 signed APK + LAN distribution

Landed: `scripts/build-android.sh` — sources the toolchain, optionally bumps the
version, runs `npm run android:sync` (which includes the tsc gate), assembles the
release build, **verifies the signature with apksigner before publishing** (an
unsigned or wrong-key APK is worse than no APK: it cannot install over the app
already on the phone), then copies it to `app/static/download/` and writes
`version.json` for the in-app update check. README gains an "AweFit (Android)"
section with the build/install/update loop.

Verified against the *running* production server, not a test double:

- `curl -I http://127.0.0.1:5001/download/awefit.apk` → 200, gunicorn,
  `Content-Type: application/vnd.android.package-archive`
- `/download/version.json` → versionCode 1, versionName 0.1.0, signer CN=AweFit
- the served bytes hash to the same sha256 the build printed
- URLs printed for localhost, LAN (192.168.0.224) and Tailscale (100.84.29.20)

Next: FF-0007 — WebView polish (safe areas with Capacitor 8's SystemBars,
hardware back, status bar), then FF-0008 Tailscale HTTPS.

## Round 7 — 2026-10-17 — FF-0007 WebView polish (safe areas, status bar, back)

Landed: `viewport-fit=cover` in `index.html`; safe-area padding on the fixed
header, the bottom nav, the sidebar and the main content offset, so nothing sits
under the gesture bar or the notch (the three open mobile TODO bugs and the
top-bar separation are in this change); a native-shell module (`src/native.ts`)
that is a no-op on web and wires the hardware back button, the light status bar
and the splash; Capacitor 8 `SystemBars` configured with `insetsHandling: 'css'`
+ `initialViewportFitValueHint: 'cover'`, and a splash that matches theme-color.
The FAB sheet now claims the back press (`awefit:back`, cancelable) instead of
letting back navigate away underneath an open sheet.

Verified: `npx tsc --noEmit` clean, 97 jest tests pass (5 new for the back-button
decision logic and the cancelable event), the built CSS contains all four
`safe-area-inset-*` uses, and a Playwright pass against a **throwaway server on
a copy of the database** (a registered `visual-check@example.test` user) confirms
390×844 shows the bottom nav with the FAB and 844×390 shows the sidebar with its
Add Log button — so navigation exists at both widths, which closes that TODO item
as already-fixed rather than fixable.

Found while looking (filed onto FF-0019 rather than fixed here): the diary's
centred date control overlaps the "FitnessFriend" brand at 390 px, and in
landscape the mobile header is hidden so **the diary date cannot be changed at
all**. That is a layout bug in the date selector, not in the shell.

Next: FF-0008 — Tailscale HTTPS, which also lets SESSION_COOKIE_SECURE be true.

## Round 8 — 2026-10-17 — FF-0008 Tailscale HTTPS — **parked, blocked on owner**

Attempted twice and stopped, per the invariants. `tailscale serve --bg 5001`
answers "Serve is not enabled on your tailnet" with a console URL, and
`Self.CertDomains` is empty, so HTTPS certificates are off as well. The operator
is unset, so serve would need `sudo` for every call even once enabled. All three
are human switches, so this is a real blocker, not a puzzle — it is recorded as
**Q1 in QUESTIONS.md** with the two-minute fix.

Landed the part that does not need Tailscale, because it is the half that would
have bitten later:

- `login_manager.session_protection` is now `basic` by default (was hardcoded
  `strong`, which ties a session to the client IP — the phone would be logged out
  on every LAN <-> Tailscale switch) and configurable via `SESSION_PROTECTION`.
- `SESSION_COOKIE_SECURE` / `SESSION_COOKIE_SAMESITE` were being **overwritten**
  by hardcoded assignments at the end of `create_app`, silently defeating any
  config or environment setting. Now `setdefault`, so an HTTPS-only deployment
  can turn Secure on.
- README gains a "Tailscale HTTPS" section with the exact enable steps, the
  build command and the two cookie/`SESSION_PROTECTION` caveats.

Gates green. Ticket stays `blocked` in the registry until the console switch.
Next: FF-0009 — in-app update check (the `version.json` FF-0006 already writes).

## Round 9 — 2026-10-17 — FF-0009 in-app update check

Landed: `GET /api/app/version` (the published build's metadata, `no-store`) plus
`GET /download/<file>` for the APK and its metadata; `src/api/app.ts` and three
native helpers (`getRunningAppVersion` via `App.getInfo`, `isUpdateAvailable`,
`openExternalUrl`); an update banner on the More page that only appears inside
the Android shell and only when the published `versionCode` is newer than the
installed one. The download leaves the app through a Custom Tab
(`@capacitor/browser`): an APK link inside a WebView does nothing at all, because
only a real browser downloads it. 9 backend tests + 3 jest tests.

**Defect found and fixed while building this:** FF-0006 published the APK into
`app/static/download/`, and `vite build` **empties `app/static`** on every web
build — the published APK and the update metadata had already been deleted by
the FF-0007 rebuild, so `/download/awefit.apk` was 404 before anyone noticed.
Releases now live in `releases/` at the repo root (gitignored) behind a Flask
route with a suffix allowlist and `send_from_directory` (traversal-safe), and the
smoke gate asserts both release endpoints answer 200 or a JSON 404.

Verified: gates green including `API /api/app/version 200` and
`GET /download/awefit.apk 200` on the throwaway server; republished as
0.1.1 / versionCode 2, sha256 `6fb4aa9c…`.

Live deploy still pending: the running gunicorn predates this blueprint — **Q2 in
QUESTIONS.md** (install the sudoers drop-in, restart once).

Next: FF-0010 — the crop modal asking for the file twice.

## Round 10 — 2026-10-17 — FF-0010 crop modal asked for the file twice

Landed: `CropModal` now takes the `File` the caller already picked (`file` prop)
and no longer carries its own hidden input, "Choose a photo" placeholder or
Retake-into-the-picker loop. `Profile` keeps the selected file in state and hands
it over, and clears the input's value so re-picking the same file still fires.

Why it happened: `handleFileSelect(_file)` in Profile deliberately ignored its
argument (unused parameter named `_file`) and only opened the modal, so the modal
had no file and was forced to ask again.

Verified: 4 new jest tests (no file input inside the modal, crops the file it was
handed, revokes the object URL on close, renders nothing when closed) plus the
e2e spec asserted the opposite of the old behaviour — it waited for the second
"Choose a photo" prompt, so it now waits for the cropper and reports the prompt
count on failure. Gates green.

Next: FF-0011 — Account and Help rows in the More page do nothing.

## Round 11 — 2026-10-17 — FF-0011 dead Account/Help rows

Landed: **Account** opens the existing edit-profile sheet (the same one the
pencil in the Profile Info header uses — no second implementation), and **Help**
opens a small "Help & About" sheet showing the running version and build, the
server origin, three logging pointers and a note that sideloaded APKs update only
when the banner appears. The update-check effect now keeps the version *string*
as well as the build number so the sheet can report it.

Two new jest tests, one per row, asserting the sheet each one opens. Gates green.

Next: FF-0012 — the Progress weight chart's x-axis runs backwards.

## Round 12 — 2026-10-17 — FF-0012 chart "reversed" — **already correct, cancelled**

Not a fix round: the reported bug no longer reproduces. Evidence, gathered rather
than assumed:

- The API returns weight logs newest first (`2026-09-22 … 2026-09-01`), and both
  chart pages sort ascending before charting (`WeightHistory.chartData`,
  `Weight.tsx`, `Dashboard.trendData`). `WeightChartWithGoal` renders the order
  it is given and slices the *newest* 30 off the end, which is why the direction
  matters.
- A Playwright pass against a throwaway server seeded with four logs read the
  rendered x-axis out of the DOM: `["Sep 01","Sep 08","Sep 15","Sep 22"]` — left
  to right, oldest first.

So instead of editing correct code, the behaviour is now **locked**: a jest test
feeds the page descending logs and asserts the chart receives them ascending
(and that the recent-entries list still shows newest first). Ticket set to
`cancelled` with the evidence in its note — the item was fixed by an earlier
chart rewrite, not by this round.

Next: FF-0013 — the migration test that runs `flask db upgrade` on an empty DB.

## Round 13 — 2026-10-17 — FF-0013 migration test (found a broken chain)

Landed: `tests/test_migrations.py` — runs the real `flask db upgrade` CLI against
a temp SQLite file, asserts the expected tables exist, that `alembic_version`
equals the single head, that **every model table is created by a migration**, and
that a second upgrade is a no-op.

It immediately found what it was written to find: **a fresh install has been
broken all along.** The initial migration `851f1e051e23` already creates
`meal_photos`, and revision `22e3bf18ae2d` creates it again, so `upgrade head` on
an empty database died with "table meal_photos already exists". The live database
never noticed because it was already past that revision — precisely the blind
spot the ticket described.

Fix: the duplicate revision is kept (deleting it would break the live database's
revision ancestry) and both halves are guarded with
`sa.inspect(op.get_bind()).has_table('meal_photos')`, so they are no-ops when the
table exists. Live history is untouched.

A second trap found while writing the test: `FLASK_CONFIG=testing` sets
`SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'`, which **overrides
DATABASE_URL** — the first version of the test ran the whole migration chain in
memory and asserted against an empty file. The test now uses
`FLASK_CONFIG=production`, and the trap is written into AGENTS.md.

Verified: 103 backend tests pass (4 new migration tests); the guarded revision
still applies cleanly in sequence.

Next: FF-0008's blocker is still Q1; the queue's next live item is FF-0014
(barcode scanning), which needs a product-database decision first.

## Round 14 — 2026-10-17 — FF-0014 barcode lookup (camera split to FF-0030)

Landed: `GET /api/food/barcode/<code>` — validates the code, checks the user's own
foods first, then OpenFoodFacts (`app/utils/openfoodfacts.py`, stdlib urllib, 6s
timeout, no new dependency), and **caches a remote hit as a Food row** so a second
scan is local and offline. Three failure modes are distinguished: 400 bad code,
404 unknown product, 503 lookup unreachable (an unreachable third party must never
look like a broken app). Products without usable energy data are rejected rather
than stored as 0 kcal. Frontend: a "Barcode" button on Add Food, a
`BarcodeLookupModal` that types a code and hands the found food to the same
serving/meal screen a searched food goes to, with per-status error copy.

**Split, not deferred:** the camera scanner became **FF-0030**, queued right after
this. The lookup is testable here; the camera has to be judged on the phone, and
the two candidate approaches (MLKit native sheet vs jsQR over getUserMedia) have
very different APK and permission costs. Typed-code-first means the feature works
today and the scanner has a destination to land in. Recorded in DECISIONS.md.

Verified: 12 backend tests (local wins without touching the network, remote hit is
saved, second scan is local, 404/503/400, auth required, plus the client's own
parsing and kJ→kcal fallback) and 4 jest tests.

Next: FF-0030 needs the phone; FF-0015 is the next queue item that does not.

## Round 15 — 2026-10-17 — FF-0015 "photo log first" — **already correct, cancelled**

`FABModal` already lists Log Food Photo first and renders `options.map(...)` in
array order, so nothing needed moving. Locked with a test that asserts the whole
order (`Log Food Photo, Log Food, Log Weight, Log Exercise`) plus the close-before
-navigate behaviour, so a later reorder cannot quietly put the slowest path back
on top again.

Next: FF-0016 — the Custom Foods screen is unreachable from the UI.

## Round 16 — 2026-10-17 — FF-0016 Custom Foods was unreachable

Landed: the add menu (FAB sheet) gains a fifth entry, **Custom Foods → `/food/custom`**,
placed last so the logging actions still lead (FF-0015's assertion now covers the
new order). The screen itself — and its add/edit actions — had no reachable entry
point: the only link lived on `/food`, a page the Diary tab never opens.

Found while tracing it: `/food` is a stale duplicate of the diary. It renders a
meal list from the same `foodStore` selectors as `DailyFood` and sets the page
title to "Diary", so a user landing there sees something that looks like the
diary but is not the one the tabs use. Filed as FF-0031 rather than deleted in
this ticket — removing a route deserves its own change (and a redirect so old
bookmarks keep working).

The add-menu test now uses a `data-testid` on the option buttons instead of
guessing from label text, which is what made the fifth entry invisible to it.

Next: FF-0017 — calorie goal setting on the More page.

## Round 17 — 2026-10-17 — deploy the SPA, and where things stand

Rebuilt `app/static` so the running server serves the merged frontend (static
changes need no restart) and confirmed `/` answers 200 with the new bundle hash.

State at the end of this round: **13 done, 2 cancelled (already correct), 2
blocked on the owner, 14 open**. Gates green (backend 115, jest 114, tsc, smoke,
toolkit).

Waiting on the owner — these block real work, not busywork:

- **Q1** Tailscale Serve is disabled on the tailnet → FF-0008 (HTTPS) cannot run.
- **Q2** the sudoers drop-in is not installed and `sudo` needs a password, so
  **every backend change since FF-0008 is merged but not live** (Q4): the running
  gunicorn predates `/api/app/version`, `/download/awefit.apk` and the barcode
  endpoint — all of which answer 404 on 5001 today while passing the gates.
- **Q3** camera scanner (FF-0030): measured that the app's plain-HTTP origin is
  not a secure context, so it is HTTPS-then-jsQR or a native MLKit plugin, and
  either way it wants the phone in hand to verify.

Next: FF-0017 — calorie goal setting on the More page (needs a migration, so
`./scripts/backup.sh` first).

## Round 18 — 2026-10-17 — FF-0017 calorie goal is editable

`daily_calorie_goal` already existed on the model and the dashboard already read
it; what was missing was a way to change it, and the honesty problem underneath:
`PUT /api/auth/profile` recomputes the goal from BMR/TDEE on **any** profile
change, so an editable value would have been silently overwritten the next time
the user corrected their height.

Landed: migration `d6dc0a74684b` adds `calorie_goal_manual` (default false — every
existing row was derived), `recalculate_user_calories` leaves a manual goal alone
while still returning BMR/TDEE, the profile PUT accepts `daily_calorie_goal`
(validated 500–10,000 via constants in `app/config.py`) or
`calorie_goal_manual: false` to hand control back, and the More page's Calorie
Goal row opens an editor with a "use the calculated goal instead" reset. The row
now shows "set by you" when the value is manual.

Also fixed: the PUT answered `calorie_goal` while the GET answered
`daily_calorie_goal`; it now returns both.

Ran `./scripts/backup.sh` before the migration, per the invariant, and applied it
to the live database (`a1b2c3d4e5f6 → d6dc0a74684b`). Verified: 9 new backend
tests (flag exposed, manual persists through a later profile edit, reset
recalculates, range and type rejection) and 3 new jest tests. Gates green — the
migration test now also proves a fresh install reaches this revision.

Note: the column is live in the database but the *endpoint* that uses it is not
running until the restart in Q2.

## Round 19 — 2026-10-17 — FF-0018 one-tap add on recent foods

Recent-food rows now have a trailing "+" that logs one serving immediately into
the meal in question, with an "Added" confirmation on the row, instead of forcing
a trip through the serving form (tapping the row still opens that form).

The "currently selected meal" did not exist: the diary links to Add Food as
`/food/log?meal=lunch`, and that parameter was **being ignored entirely**. It now
drives the quick-add, and the tab-bar entry falls back to the time of day
(`src/utils/meal.ts`, 6 unit tests). The same meal is passed on to the serving
form, so both paths agree.

Verified: 6 unit tests for the meal mapping plus 3 component tests (payload is
exactly one serving of that food into the right meal, confirmation appears, the
row still navigates). Gates green.

Next: FF-0019 — the diary date selector, which the visual check in round 7 showed
overlapping the brand and vanishing in landscape.

## Round 20 — 2026-10-17 — FF-0019 diary date control, twice

The date control moves to a single `DiaryDateSelector` component used in two
places: the mobile top bar (where it already was) and **inline in the page body at
`sm`+**, where the mobile header is hidden — landscape previously had no way to
change the day at all, which the round-7 visual check had found and filed here.

Also fixed the overlap that same check found: the header's centre slot was
absolutely positioned (`left-1/2 -translate-x-1/2`), so a wide centre — the date
control — rode over the brand text. It is now a three-column flex row: left
flexes and truncates, centre takes its natural width, right stays a fixed 110 px
so the centre does not jump between screens. Brand text now reads **AweFit** in
both the header and the sidebar, matching the app identity; the sidebar still said
"FitnessFriend".

Verified with Playwright against a throwaway server on a copy of the database, at
both viewports, measuring geometry rather than eyeballing:
- 390×844: `brandRight: 82`, `controlLeft: 142`, **overlap: false**
- 844×390: inline control present, sidebar navigation intact
Plus 5 component tests (today label, stepping, jump-to-today, no stepping into the
future, both variants). Gates green.

Next: FF-0020 — Quick Add bar replacing the Add Food bar.

## Round 21 — 2026-10-17 — FF-0020 Quick Add bar — **already correct, cancelled**

`FoodLogSelect` opened without a food id *is* the Quick Add bar: a ← Back control
on the left, the title "Quick Add" in the middle, and a check submit on the right
that stays inert until there are calories. No change needed; three tests now pin
that shape (title, back navigates out, check disabled until there is something to
log).

The genuinely missing half of this pair is **FF-0021**: the check always navigates
to `/food/log`, so finishing a quick add dumps you on the search screen instead of
where you came from. That is next.

## Round 22 — 2026-10-17 — FF-0021 finishing a quick add returns where you were

The add flow's two screens now carry their origin in router location state. The
diary sets `returnTo: '/food/daily'`, Add Food forwards it to the serving screen,
and the serving screen navigates there with `replace` after logging instead of
the hardcoded `/food/log` that dropped the user back on a search box.

`src/utils/returnTo.ts` validates the value instead of trusting it: absolute
in-app paths only, and never a path inside the add flow (returning into the form
you just submitted would be worse than the old behaviour). With no origin — from
the tab bar — it falls back to `/dashboard`.

Verified: 4 unit tests for the resolver (including the loop-back and
protocol-relative cases) plus a component test that submits a quick add with
`returnTo: '/food/daily'` and asserts `navigate('/food/daily', { replace: true })`.
One FF-0018 assertion needed updating because `navigate` now takes a second
argument. Gates green — 138 jest tests.

Next: FF-0022 — a height field on the profile (migration, so back up first).

## Round 23 — 2026-10-17 — FF-0022 height field — **already correct, cancelled**

Height is present end to end: the model column, the registration payload
(ft/in → cm), the Profile Info row (shown as `5' 11"`), and the edit sheet's two
inputs converted back to centimetres. Nothing to add; two tests now pin the
display and the editor so a regression in the cm↔ft/in conversion shows up here
rather than on the phone.

That is the third "already done" item in the queue (after the chart order and the
add-menu order). They were filed from a `TODO.md` that had drifted from the code,
which is the cost of keeping the inbox outside the repo — the registry is now the
only place a task is worked from.

Next: FF-0023 — daily calorie expenditure from height, weight and activity.

## Round 24 — 2026-10-17 — FF-0023/0024/0025 — **already correct, cancelled (batched audit)**

Three more queue items were already shipped, which made the pattern impossible to
ignore: seven of the fifteen TODO-derived tickets have now turned out to be
implemented. The rest of the TODO backlog was audited in **one pass** instead of
one round per ticket, and the result is recorded in DECISIONS.md.

Cancelled here, each with evidence:
- **FF-0023** — the profile reports BMR and TDEE from the server (Mifflin-St Jeor ×
  activity factor), shown on the More page. New backend test asserts a 34 y/o
  male at 180 cm / 85 kg lands in a plausible BMR band, TDEE above BMR, and both
  absent while the profile is incomplete.
- **FF-0024** — `weekly_goal` already converts into the daily target: a `lose_2`
  goal comes out more than 500 kcal below `maintain`.
- **FF-0025** — the Weekly Goal sheet with its five options already exists on the
  More page.

Still real, and next in the queue: goal ETA (FF-0026), Then & Now (FF-0027),
timelapse (FF-0028), serving amounts on diary rows (FF-0029) and the stale `/food`
page (FF-0031).

Next: FF-0026 — goal ETA on Progress.

## Round 25 — 2026-10-17 — FF-0026 goal ETA on Progress

The Progress page now shows "On track for <date>" under Distance to Goal, with
the rate and which source it came from.

`src/utils/goalEta.ts` projects from a least-squares slope over the last 28 days
of weigh-ins (≥3 points, ≥7 days apart), falls back to the configured weekly goal
when the trend is flat, short or moving the wrong way, and returns **null** when
the goal is already met, no goal is set, or the projection is beyond two years —
a date invented from a flat trend would be exactly the confident nonsense that
makes a tracker untrustworthy.

Verified: 11 unit tests (steady loss measured, too-few-points refused, old
weigh-ins excluded, trend vs goal fallback, wrong-direction refusal, already-met,
missing inputs, beyond-horizon, date formatting) plus a page test asserting the
row renders. Gates green.

Next: FF-0027 — Then and Now on Progress.

## Round 26 — 2026-10-17 — FF-0027 Then and Now on Progress

A collapsed "Then and Now" section under the weight trend compares the **earliest
and latest weigh-ins that carry a photo** — entries without a photo are skipped,
so the comparison is always photo-to-photo. It renders nothing at all with fewer
than two photo days, or when both are the same day (two logs, no change to show),
and the images are lazy so opening Progress does not pull the whole photo history.

Each photo is captioned with its weight and date and has a real alt text
("Then: 205.0 lbs on Sep 1, 2026") rather than being a decorative blob.

Verified: 4 component tests (collapsed by default, opens on demand, picks the
first/last photo day rather than the middle rows, explains itself for a screen
reader, and stays silent without a real comparison). Gates green.

Next: FF-0028 — timelapse slideshow of the weight photos.

## Round 27 — 2026-10-17 — FF-0028 weight-photo timelapse

A "Timelapse" section on Progress steps through the logged weight photos with
prev / play-pause / next, a frame counter and the weight and date of the frame on
screen.

Laziness is the design, not an optimisation: the section is collapsed by default,
nothing is fetched until it is opened, and only **one** frame ahead is ever
preloaded. Opening Progress on a mobile connection should not pull a year of
photos because a section exists — and preloading the whole series would stall the
first frame instead.

Verified: 6 component tests (collapsed and silent until opened, starts at the
oldest frame, steps both ways, wraps at the ends, preloads exactly one frame,
plays and pauses under fake timers, and renders nothing with fewer than two
photos). Gates green.

Next: FF-0029 — serving amounts on diary rows.

## Round 28 — 2026-10-17 — FF-0029 serving amounts on diary rows

Diary rows now lead with how much was eaten — "2 × 170 g · 120 cal · P:17g …" —
using `number_of_servings` and `serving_size`, which were already on
`FoodLog.to_dict()` and simply were not rendered. `formatServing` handles the
half-known cases ("2 servings", "1 scoop") and returns null when nothing is
recorded, so a log without serving data looks exactly as it did before rather
than gaining a stray separator.

Process note: FF-0028 was first committed straight to `master` by mistake (the
branch was never created). It had not been pushed, so it was replayed through a
branch with `reset --soft` and merged properly — the history above shows the merge
commit it should always have had.

Verified: 4 unit tests for the formatter plus 2 that assert the diary row shows
"2 × 170 g" and omits the serving cleanly when the log has none. Gates green —
174 jest tests.

Next: FF-0031 — the stale `/food` page that duplicates the diary.
