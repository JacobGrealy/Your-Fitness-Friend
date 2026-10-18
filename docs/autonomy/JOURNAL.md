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

## Round 29 — 2026-10-17 — FF-0031 the stale /food diary is gone

`src/pages/Food/Food.tsx` rendered a second diary — the same meal groups from the
same store, under the page title "Diary" — that the tab bar never opened. It
existed only to host a Custom Foods button, which FF-0016 put in the add menu.
Deleted; `/food` is now a `<Navigate to="/food/daily" replace />` so a bookmark or
an old link lands on the real diary instead of a lookalike with no way forward.

Verified: tsc clean after dropping the export and the import, and a router test
that enters `/food` and asserts it settles on `/food/daily`. Gates green.

That empties the queue of everything that can be done without you: what remains is
FF-0008 (Tailscale Serve — Q1) and FF-0030 (camera scanner — Q3), both parked with
measurements. Next round is the deploy + audit sweep.

## Round 30 — 2026-10-17 — the queue is empty, AweFit 0.1.2 is published

**Where the backlog stands.** 22 tickets merged, 7 cancelled as already
implemented, 2 parked with reasons. Nothing is `open` or `in-progress`, so
`tasks.py next` returns nothing — the queue the goal asked me to empty is empty.

**The deliverable.** `releases/awefit.apk` is now **0.1.2 (versionCode 3)**, signed
`CN=AweFit`, 3.6 MB, sha256 `20ffd9dc…`, and it contains everything merged since
0.1.1: custom foods in the add menu, one-tap add on recent foods, the diary date
control in both layouts, barcode lookup with an OpenFoodFacts fallback, an
editable calorie goal, the goal ETA, Then and Now, the photo timelapse, serving
amounts on diary rows and the removal of the duplicate diary page.

**What I could not do, and why** — both need you, and both are written up in
QUESTIONS.md with the exact commands:

- **FF-0008 (HTTPS)** — Tailscale Serve is still disabled on the tailnet, and
  turning it on is an admin-console switch.
- **FF-0030 (camera scanner)** — the app's plain-HTTP origin is not a secure
  context (`navigator.mediaDevices` is undefined there, measured), so it is
  either HTTPS-then-jsQR or a native MLKit plugin, and either way it wants your
  phone to verify.

**One trap worth knowing before sideloading:** on the *running* server
`/download/awefit.apk` returns `200` with the SPA's `index.html` — the catch-all
serves the shell for unknown paths — so tapping the URL downloads an HTML file
named `awefit.apk`. The APK is fine: `adb install -r releases/awefit.apk` works
now, and the URL starts serving the real file after the Q2 restart. That is now
in QUESTIONS.md, because a silent 200 here is exactly the kind of thing that
wastes an evening.

**Round-30 verification:** gates green (127 backend, 171 frontend, tsc, smoke,
toolkit); `app/static` rebuilt from `master`; working tree clean and pushed.

## Round 31 — 2026-10-17 — FF-0032 the toolkit refused to celebrate an empty queue

The final gates run went red on `tooling` — not on the app, on the toolkit's own
self-test: it asserted that `tasks.py next` against the **live** registry always
names an FF id, and the queue is now empty. So the gate that guards the loop broke
exactly when the loop succeeded.

Relaxed to accept either a live id or the documented "queue has no live items"
message. The populated case is still asserted, against the sandbox fixture that
always has items — the check was not weakened, just made honest about which of two
correct answers it will see.

Lesson for the registry: self-tests that assert on *live* state inherit that
state's shape, and the empty queue is a shape the code is designed to reach.

## Round 32 — 2026-10-17 — FF-0030 camera scanner, unblocked by the HTTPS move

The owner enabled Tailscale Serve and set the operator, so the app now answers on
`https://home-server-1.tail96ee52.ts.net`. Step 3's verification found a
Let's Encrypt certificate (valid to Jan 2027) trusted by both `openssl` and
Chromium, warm responses in 13 ms, the current bundle, deep links working, and the
API answering `401` anonymously through the proxy — and, decisively,
`isSecureContext: true` with `navigator.mediaDevices` present, where the plain-HTTP
origin had neither.

That answer to Q3 was route 1, so: **FF-0030 is done**. The barcode sheet opens on
a camera scanner (jsQR, ~8 fps, stops on first decode, buzzes, always releases the
tracks), with "Type the barcode instead" as the fallback and the FF-0014 typed
path unchanged underneath. jsQR rather than the Barcode Detection API because that
API is not exposed in an Android WebView — the one place this runs.

Verified: 6 scanner tests (HTTPS-required message, permission refusal in words a
user can act on, rear camera requested, single decode callback, keeps scanning on
no-decode, tracks released on unmount) and the 5 existing FF-0014 tests adapted to
the camera-first sheet. Gates green.

## Round 33 — 2026-10-17 — FF-0008 closed: AweFit ships over HTTPS

The default server baked into the APK is now
`https://home-server-1.tail96ee52.ts.net`, and **0.1.3 (versionCode 4)** is
published: signed `CN=AweFit`, sha256 `c86960d1…`, 3.8 MB, `cleartext: false`.

**A trap worth the entry.** The first 0.1.3 build came out still pointing at
`http://100.84.29.20:5001`. The default lived in two places — `capacitor.config.ts`
and `scripts/build-android.sh`, which exports its own fallback *and wins* because
the sync reads the exported value. Both now hold the HTTPS default with a comment
pointing at the other, and the script warns when it bakes a cleartext URL (such an
origin is not a secure context, so the camera scanner would silently not work).
Verified by reading `assets/capacitor.config.json` **out of the APK** rather than
trusting the build log.

`SESSION_COOKIE_SECURE=true` is now in `.env` (this deployment's property, not the
code's — a plain-HTTP dev host must still be able to log in). It takes effect on
the restart, and it deliberately stops the session cookie travelling to the plain
LAN address.

Verified: apksigner signs and verifies the published APK; `version.json` reports
0.1.3 / versionCode 4 / the HTTPS URL / matching sha256; and against a throwaway
server on the new code, `/api/app/version` returns that exact metadata and
`/download/awefit.apk` returns 200 with
`application/vnd.android.package-archive` and 3,813,445 bytes. Gates green.

## Round 34 — 2026-10-17 — FF-0033 an empty queue now says so

`tasks.py queue list` printed **nothing** with exit 0 when the queue was empty,
which in a log is indistinguishable from a command that broke — and the toolkit
self-test asserted the live queue was always non-empty, so `gates.sh tooling` went
red again on a healthy repo. Second time this class of bug has bitten (FF-0032 was
the `next` assertion).

Fixed both halves: the command now prints `queue is empty`, and the self-test
accepts an FF id or that line, with the populated case still asserted against the
sandbox fixture. Gates green.

## Round 35 — 2026-10-17 — FF-0034 the CLI can now reorder its own queue

`tasks_lib` could reorder and move queue entries since the port, but the CLI
exposed only `queue add|remove|list`. That mattered less when the only client was
the agent; it matters now that a board with drag-to-reorder is coming, because the
CLI would otherwise be the weaker of two clients of "the same mutation layer".

Added `queue move --id FF-NNNN --to <position>` (1-based to match `queue list`,
plus `top`, `bottom`, `after FF-0001`) and `queue reorder <ids...>` (must be a
permutation — a reorder that silently drops an id is how a queue loses work).
Both write through `commit_write` with an `intended` check, like every other
command here.

35 toolkit self-tests now, including moving to top, to a position, after an
anchor, reordering the whole queue, and rejecting an unqueued id or a partial
permutation. Gates green.

## Round 36 — 2026-10-17 — FF-0035 the queue has a board

Ported AweCraft's board rather than inventing one inside the Flask app:

- **`tasks/scripts/render.py`** — the shared renderer. The server serves it and
  `python3 tasks/scripts/render.py > board.html` saves the identical view as a
  file, so the two can never disagree about layout.
- **`tasks/webui.py`** — stdlib-only server on **5181** (AweCraft holds 5180),
  binds `0.0.0.0` with no auth per the owner's choice, with `--daemon`,
  `--sandbox` and `--replace`. Reads the YAML fresh on every request; every action
  goes through the same `tasks_lib` the CLI uses.

Adapted for FF: per-ticket folders, `spec.html` links, the PNG gallery and the
`/tasks/<id>/...` static route are all gone (tickets here are flat entries), and
the title is "AweFit work queue".

One deliberate deviation: AweCraft's table wraps `FF-0035` and `in-progress` mid
word on a 390 px screen. Since this board is mostly read on a phone, the id and
status cells got class hooks and a narrow-screen rule that keeps them on one line.

Verified by using it, not just by rendering it: on a **sandboxed copy**, real HTTP
calls moved a queue entry, rejected a bad status with 400, 404'd an unknown
action, added a ticket and saw it land in the sandbox YAML — with the live
registry confirmed untouched. Screenshots at 1180 px and 390 px, plus the detail
modal opening on a row click. 51 toolkit self-tests, gates green.

## Round 37 — 2026-10-17 — FF-0036 the board filed its own pid in the wrong project

Starting the daemon showed the port from AweCraft's layout does not travel: its
`webui.py` lives in `tasks/`, so `WEBUI_DIR.parent / ".scratch"` is the project
root there. Here it is `FitnessFriend/tasks`, one level deeper than I accounted
for, so the first daemon wrote `tasks_webui.pid` into
`github_projects/.scratch/` — next to *other* projects — and `--replace` would
have been looking in the wrong place.

Fixed to `FitnessFriend/.scratch/` (already gitignored), stray files removed, and
the daemon restarted: pid 2593796, log in the repo, answering `200` on localhost,
the LAN address and the Tailscale address. A sandboxed probe server left listening
on 5182 from an earlier check was also cleaned up.

Worth noting for anyone reading the board later: it is served over plain HTTP on
`:5181` with no auth, which is the same posture as AweCraft's and was chosen
deliberately. Adding it to `tailscale serve` behind HTTPS would be a one-line
follow-up if that ever feels too loose.

## Round 38 — 2026-10-17 — FF-0037 snacks were invisible on the home screen

Owner-reported, and the cause was a one-letter plural: `Dashboard.tsx` ordered its
meal groups by `['breakfast', 'lunch', 'dinner', 'snacks']` while the data says
`'snack'`. `groupMealsByType` grouped correctly and then the filter threw the
snack group away, so "Today's Meals" never listed it — and because the header
figure is summed from the groups that render, the `kcal` next to the title was
short by every snack too. Two symptoms, one cause, and the second one would have
been easy to blame on the calorie maths.

The order now comes from `MEAL_TYPES` in `utils/constants.ts`, which is the same
constant the diary and the add flow use, so a meal type cannot be dropped from
this screen again by a stray plural. `MEAL_TYPE_LABELS` keeps the display strings
and now maps `snack → "Snacks"`, matching `MEAL_LABELS` in `DailyFood.tsx`.

Verified the way that matters: the four new tests **fail on the unfixed file**
(3 of 4, with the "no empty meals" case still passing as it should) and pass after
it — a regression test that only passes both ways proves nothing. Gates green.

## Round 39 — 2026-10-17 — FF-0038 the chosen meal now survives the add flow

Owner-reported: "Add Food under Snacks → Quick Add" landed on a form set to
Breakfast. Two halves, both trivial, both invisible from either file alone:

- `LogFood.tsx` *had* the resolved meal (FF-0018's `resolveMealType`) and then
  dropped it: `handleQuickAdd` navigated to `/food/log/select` with no query at
  all. The food-tap and barcode paths dropped it too, and the photo screen was
  never told either.
- `FoodLogSelect.tsx` never read `?meal=` — its `useForm` default was a hardcoded
  `'breakfast'`, and it only unpacked name/calories/macros/serving/brand/barcode.

Now every exit from Add Food carries `?meal=`, and the serving screen seeds
`meal_type` from it via the existing `isMealType` guard (`utils/meal.ts`), so a
junk value still falls back to breakfast. `PhotoLog.tsx` got the same treatment —
its meal state was hardcoded `'lunch'`, which is the identical bug with a different
default.

Verified: 5 tests on the serving screen (preselection, the logged payload, other
meals, the junk/absent fallback, and the user overriding it) and 3 on the handoff
(Quick Add, Food Photo, and the clock fallback when opened from the tab bar).
Without the fix **6 of those 11 fail**; with it they pass. Gates green.

## Round 40 — 2026-10-17 — FF-0039 five copies of the meal labels, now one

PhotoLog paired a positional array `['Breakfast','Lunch','Dinner','Snacks']` with
`MEAL_TYPES` through the array index. It worked, which is exactly why it was worth
a ticket: one inserted meal type and every dropdown in that screen would have filed
photos under the wrong name, silently. That is the same class as FF-0037, waiting
instead of visible.

Rather than fix only that array, the labels got **one home**: `MEAL_LABELS` in
`utils/constants.ts`, a `Record<MealTypeKey, string>` keyed by type. The five
copies went away — PhotoLog's array, plus Records in `DailyFood`,
`FoodLogSelect` and `EditFoodLog`, plus the one I added to `Dashboard` in FF-0037.

Two consequences worth recording:

- `FoodLogSelect` and `EditFoodLog` called the meal **"Snack"** while the diary and
  now the dashboard call it **"Snacks"**. Unifying them is a visible (and correct)
  copy change, and it broke the FF-0038 test that asserted the chip reading
  "Snack" — updated, with a comment saying why.
- The map is now a contract: `tests/utils/mealLabels.test.ts` asserts every
  `MEAL_TYPES` entry has a label and that no extra keys exist, so adding a meal
  type without a name fails the suite instead of rendering `undefined`.

Gates green — 194 frontend tests.

## Round 41 — 2026-10-17 — FF-0040 delegation protocol, and an honest look at why it needed a ticket

The owner asked why no subagents were being used for implementation. The answer
was invariant 9, which put "anything that builds, runs gates or switches branches"
in one lane — correct about *this* repo's shared state (`app/static` is one live
build output, one database, one running server) and wrong to apply to
*implementation* as a whole. Three rounds this session had read-only work that
should have been fanned out: the TODO audit that found seven already-shipped
tickets, the AweCraft board reconnaissance, and the hunt for hand-maintained lists
drifting from `MEAL_TYPES`.

Invariant 9 is now: **subagents take tickets end to end; the coordinator owns the
merge, the deploy and the registry**, with the protocol written down — own branch
cut from master, never merge or push, never write `app/static`, never touch the
registry or the services, disjoint files per lane, and the measured reason
concurrent gates are safe (the smoke gate binds a dynamically chosen port;
`instance/` is per-worktree).

## Round 42 — 2026-10-17 — FF-0042 the photo screen stopped dropping food quietly

Owner asked why I wasn't delegating; the answer led to three policy tickets
(FF-0040, FF-0041) and a discovery about the harness: the plain `subagent` tool
was missing because `~/.dsh/cordis.patch.yml` renames the shipped `tool-subagent`
entry to `subagent_medium` and pins it to a different model, leaving only the three
effort-level agents plus `subagent_fork` — and a fork is seeded with this session's
whole transcript, which is why both fork attempts failed instantly with no output.
Added a plain `subagent` instance (no `agentOptions`, so it inherits this model) to
the patch. **It needs a dsh restart, which the owner deferred because another agent
is using the harness** — so this round ran in-lane as an explicit, recorded
exception to the delegation rule.

The ticket itself came out of the earlier grep: `PhotoLog.handleAccept` shipped five
`console.log` calls and, worse, `if (entry.id) { update } else { log "Skipping entry,
no id" }`. A food with no id was **silently dropped** — accepted in the UI, never
saved. For a tracking app that is the worst failure shape: invisible.

Reading `app/routes/meals_ai_log.py` settled the ambiguity in the ticket: every
analysed item is created and committed server-side and `format_log_entry` returns
its id, so the skip branch was a guard for something that should not happen. That
guard is now `saveAcceptedEntries` (`src/utils/photoLogEntries.ts`): an entry with
an id is updated, one without is **created**. A duplicate row is a visible mistake
the user can delete; a missing row is not.

Also fixed while in there: Accept navigated to `/food`, which since FF-0031 is only
a redirect — it goes straight to `/food/daily` now.

Verified: 6 unit tests on the save path (update, create-when-no-id, empty-string id,
mixed batch, empty review, propagated failure) — and a `console.` count of **0** in
that file. Gates green; SPA rebuilt so the phone gets it on reload.

## Round 43 — 2026-10-17 — FF-0043 why the phone kept asking for a password

Two independent causes, both real:

1. **The session cookie was a *session* cookie.** `session.permanent` was never
   set anywhere in `app/`, so Flask emitted no `Expires`/`Max-Age`, and an Android
   WebView keeps session cookies in memory only — kill the app and the login dies
   with the process. `PERMANENT_SESSION_LIFETIME` existed (7 days) but was
   unreachable code without `permanent`.
2. **"Remember me" was never asked for.** The login route has honoured a `remember`
   flag for a long time, but `authApi.login` posted credentials only, so
   `remember=False` always and Flask-Login never issued a `remember_token`.

Fixed: `session.permanent = True` on login *and* on the auto-login after
registering; the client now sends `remember: true`; the session lifetime goes from
7 to 30 days and the remember cookie to 365, with `REMEMBER_COOKIE_SECURE` tied to
`SESSION_COOKIE_SECURE` so the token is Secure over HTTPS and still works on plain
HTTP for LAN testing.

**A test caught a test, not the app.** My first version registered (which signs you
in) and then POSTed to `/login` — which short-circuits on
`current_user.is_authenticated` and never reaches `login_user`, so it asserted
against the wrong branch and failed for a bogus reason. The helper now logs out and
returns the register response, and the "no remember cookie" case also asserts the
session cookie exists, so it cannot pass vacuously.

Verified: 4 backend tests (remember cookie on/off, `Expires`/`Max-Age` on the
session cookie, and the same for registration) plus 1 frontend test that the client
asks for it. 201 frontend tests, gates green.

**Deploy order matters here.** `.env` still carries `SESSION_COOKIE_SECURE=true`
from FF-0008 and this change lands in the same restart: install **APK 0.1.3**
(HTTPS) *before* restarting the backend, or the installed 0.1.2 — which points at
plain `http://100.84.29.20:5001` — will no longer be able to log in at all.

## Round 44 — 2026-10-17 — FF-0045 the state doc was telling the next session a lie

`QUESTIONS.md` still opened with "nothing backend has reached the live server" and
listed the restart as outstanding. It had been done — at 18:32:16 EDT, by the
owner, by hand. So the first thing a new session reads was wrong in the direction
that matters: it would have believed a whole class of merged work was undeployed.

Verified rather than assumed, both halves:

- **Restart: done.** `/api/app/version` returns the 0.1.3 metadata,
  `/download/awefit.apk` returns `200` with `application/vnd.android.package-archive`
  and 3,813,445 bytes, the barcode endpoint returns `401` (exists, needs auth), and
  the running gunicorn's `/proc/<pid>/environ` contains `SESSION_COOKIE_SECURE=true`.
- **Drop-in: not installed.** `/etc/sudoers.d/` has no `fitnessfriend-agents`, and
  `sudo -n -l` still says *"interactive authentication is required"*.

So Q2 is now honestly half-done rather than outstanding, Q4 is resolved with the
evidence table, and the closing section became **"Waiting on you"** — five concrete
items, ordered, starting with "install 0.1.3 first", because `SESSION_COOKIE_SECURE`
going live means the installed 0.1.2 can no longer log in at all.

Also corrected a stale claim I had left in that file: it said the APK URL returns
the SPA shell and would keep doing so until the restart. That stopped being true
when the restart happened.

## Round 45 — 2026-10-17 — FF-0046 persistent login confirmed, and why it needed no restart after all

The owner reported the login now sticks. Two explanations were possible and I
measured instead of assuming: either the client half alone had done it — the login
route has honoured a `remember` flag since the original commit, so sending
`remember: true` would issue the cookie even against the old backend — or the
backend had been restarted again.

The second. `fitnessfriend` started at **19:18:38 EDT**, ten minutes after FF-0043
merged at 19:08:18, and the running config carries the new 30-day session / 365-day
remember lifetimes. The served bundle contains the client half too
(`remember: t` inside the login call). So the phone now holds a session cookie with
an `Expires` **and** a remember token, which is why it survives both an app restart
and a phone reboot.

Removed the "one more restart" item from the Waiting-on-you list — it was asking
the owner to do something already done — and recorded the state as verified on
hardware rather than merely green in tests.

## Round 46 — 2026-10-17 — FF-0044 one tap to update, and a native plugin that compiles

The update banner existed but its button opened the APK in a Custom Tab, leaving
the user to find the download, dismiss Chrome's "this type of file can harm your
device" warning and open it. Now the button does the work: a local Capacitor
plugin downloads the APK off the UI thread and fires Android's installer.

The manifest already carried Capacitor's `FileProvider` and `file_paths.xml`
declared a `<cache-path>`, so the app could already share a cached file — that
removed half the native work. What was left: `ApkInstallerPlugin.java`
(`@CapacitorPlugin`, download → ZIP-magic sanity check → `ACTION_VIEW` with
`application/vnd.android.package-archive` and a FileProvider URI), the
`REQUEST_INSTALL_PACKAGES` permission, registration in `MainActivity.onCreate`
*before* `super`, and `installApkUpdate()` in `native.ts`.

Deliberate choices:

- **Check the install permission before downloading.** On Android 8+ a sideloaded
  app cannot install without "install unknown apps" being granted; the plugin
  detects that, opens the exact Settings screen, and rejects with a distinct code.
  The UI turns that into one sentence instead of a mysterious no-op.
- **Never dead-end.** Any other failure falls back to the Custom Tab path, which is
  worse than one tap but far better than a button that does nothing.
- **Verify the bytes.** A truncated body or an HTML error page would fail later
  with a vague installer message, so the plugin checks the ZIP magic and the size
  first and names the real problem.

Verified here: 5 jest tests over the outcome matrix (native success, permission
missing, other failure, plugin absent, plain browser), gates green, and **APK 0.1.4
(versionCode 5) built** — which is itself the native check, since Gradle compiled
the Java and merged the manifest. Confirmed inside the produced APK rather than
from the build log: `ApkInstallerPlugin` is in `classes.dex`, the merged manifest
carries `REQUEST_INSTALL_PACKAGES`, and the FileProvider authority is
`dev.awefit.app.fileprovider`.

**Not verified, and cannot be from here:** the download-to-installer flow on real
hardware. That needs the phone, and there is a wrinkle worth knowing: the banner
only appears when a *newer* build is published than the one installed, so testing
it means running 0.1.4 while 0.1.5 exists.

## Round 47 — 2026-10-17 — FF-0048 published 0.1.5 to make the banner testable

No code change: a bump and rebuild only. The banner compares the installed
`versionCode` against whatever `/api/app/version` reports, and that route reads
`releases/version.json` per request — so publishing 0.1.5 (versionCode 6) lights
the banner on the owner's already-installed 0.1.4 without a restart.

Checked what the phone will actually see rather than trusting the build output:
`/api/app/version` reports 0.1.5 / 6 with the new sha256, `/download/awefit.apk`
serves `application/vnd.android.package-archive` at the matching size, and
`ApkInstaller` is still in `classes.dex` — the plugin the update path depends on is
present in the build being downloaded.

The interesting bit of the next step is which binary does the work: the installed
0.1.4 runs the *current* JS from the server (button, fallbacks) but its own native
plugin does the download and the install intent. So this exercises exactly the
combination that will ship.

## Round 48 — 2026-10-17 — FF-0049 one-tap update is confirmed on hardware

The owner installed 0.1.4, saw the "Update available — 0.1.5" banner, tapped
**Get it**, and it downloaded and installed inside the app — never handing over to
the browser. That is the on-device half of FF-0044 that this host cannot exercise,
so it is now recorded as verified rather than expected.

Both readings matter: the *JS* running on the phone came from the server (the
button, the fallback ladder, the permission message) while the *native plugin* that
did the download and fired the installer came from the installed 0.1.4 APK — which
is exactly the split that ships, so the pass is a genuine end-to-end one.

The mechanism is now written down once, in `AGENTS.md` under Android: bump, publish,
the banner appears on the next request because `/api/app/version` reads
`releases/version.json` per request, and the client installs it itself. Publishing
never installs anything by itself — Android's own dialog stays in the loop, which
is the point.

## Round 49 — 2026-10-17 — FF-0051 the 136px of nothing under every page

Owner asked why short pages scroll. Measured instead of guessing: at 390×844,
`/dashboard` and `/food/daily` had `scrollHeight` 980 against `innerHeight` 844,
and `main` computed exactly the 136px difference as its `padding-top: 56px` +
`padding-bottom: 80px`. `/more` did not scroll, purely because Profile happens not
to apply `min-h-screen` on its normal path — which is why it looked inconsistent.

Two reasonable rules colliding: the shell pads content clear of the header and the
bottom nav, and the pages inside it claimed `min-h-screen`. `100vh` inside a padded
container is a viewport *plus* the padding.

Fixed by giving the height one owner: `Layout.tsx` is now a flex column at
`min-h-[100svh]` with `main` as `flex-1`, and the seven shell pages dropped their
`min-h-screen`. Auth pages are outside the shell and keep theirs. `100svh` replaces
`100vh` in the globals too, so a browser's collapsing URL bar cannot recreate it.

Re-measured after the change: `/dashboard`, `/more`, `/weight`, `/exercise`,
`/food/custom` and `/food/log` all report **0** overflow. `/food/daily` still
scrolls 36px, which is honest — four meal sections plus the 80px bottom-nav
clearance genuinely exceed the viewport.

Guarded by a new `layout` gate in `./scripts/gates.sh` (the contract is easy to
break by habit and the symptom is a subtle jitter). Proved it trips: with a
throwaway page declaring `min-h-screen` the gate printed the offending file and
failed the run; removing it restored green.

## Round 50 — 2026-10-17 — FF-0052 Progress was the one page I missed, and the gate was why

The owner reported the scroll fix working everywhere except Progress. Measured
`/weight/history` at 390×844: page height 844 starting at y=56 inside `main`, so
`main` grew to 980 and the document overflowed by the same 136px as before.

Cause: `WeightHistory.tsx:63` set its viewport height as an **inline style** —
`style={{ backgroundColor: '#f2f2f2', minHeight: '100vh' }}` — not the Tailwind
class. My sweep grepped for the class and my new gate matched the class only, so
both walked straight past the one page that still had the bug. The gate was
guarding the spelling, not the rule.

Fixed the page (dropping the inline height and its redundant `pb-24`), then widened
the gate to match the class *and* inline `minHeight`/`height` of `100vh`/`100svh`,
and proved both probes fail it before trusting it. Also removed two more duplicate
bottom clearances that had the same effect (`LogExercise`'s `pb-20`, `PhotoLog`'s
review-step `pb-32`).

Final sweep of every bottom-nav destination and the two log forms: `dashboard`,
`weight/history`, `weight`, `exercise`, `exercise/history`, `more`, `food/custom`
and `food/log` all report document height equal to the viewport. `/weight/log`
keeps 36px and `/exercise/log` 168px — content that genuinely exceeds the screen,
which is what scrolling is for.

## Round 51 — 2026-10-17 — FF-0053 the Accept button was under the nav, and I put it there

Two defects on the photo-log review screen, one of them mine.

**The flat offset.** The floating Accept bar sat at `bottom-16` — a hardcoded 4rem.
The bottom nav is `bottom-0` with `pb-[env(safe-area-inset-bottom)]`, so its real
height is 4rem **plus the inset**: on a phone with a gesture bar it grows upward
over the bar and hides its lower half. In the browser the inset is 0, so the two
values are identical and nothing looks wrong — which is exactly why I would not
have caught it without the owner's eyes. It is now
`bottom-[calc(4rem+env(safe-area-inset-bottom))]`.

**My regression.** FF-0052 removed `pb-32` from the review container as a
"duplicate of the shell's bottom-nav clearance". On this page it was not clearing
the nav — it was clearing the *floating Accept bar*, which the shell knows nothing
about. The last content (the AI chat row) ended up underneath it.

Verified by driving the real review state, not by eye: intercepted
`POST /api/meals/ai-log` with a canned analysis, uploaded a 1×1 PNG, clicked
Capture, then measured rects at maximum scroll — nav 787–844, bar 724–780, Accept
button 736–780 (`acceptFullyVisible: true`), chat input 597–635
(`chatClearOfBar: true`).

The honest lesson, now twice over: the shell can only clear chrome it owns, and a
page with its own floating element must clear that too. "Duplicate padding" is not
a property of a number, it is a property of what the number is for.

## Round 52 — 2026-10-17 — FF-0054 Complete Diary, researched before it was written

The owner asked for MyFitnessPal's Complete Diary and told me to research it first,
which turned out to matter: the feature is not just "a summary screen", it is a
summary screen with three rules about when **not** to show a number.

DuckDuckGo was rate-limited from this host and MFP's site 403s a plain fetch, so I
went to the Zendesk API behind their help centre
(`support.myfitnesspal.com/api/v2/help_center/articles/search.json`), found article
360032624131, and read the rules from the source rather than reconstructing them:
five-week projection from current weight assuming every day matches today, framed
as motivational; gender-specific under-eating bands (1200/1500 fine, 1000–1199 /
1200–1499 warn, below that no projection); and completing is *not* required for
the logging streak, nor final — you can keep logging and complete again.

Backend: `diary_completions` (one row per user per day, unique constraint, migration
`1ed0f5b7343d`), `app/utils/diary_completion.py` holding the bands and the maths
(35 days, 3500 kcal/lb, reusing the existing Mifflin-St Jeor `bmr_calculator`), and
`/api/food/diary/{complete,completion}` with POST/GET/DELETE. A missing profile,
an empty day, or intake below the threshold all yield `change_lbs: null` plus the
reason — never a guessed number. 23 backend tests cover the arithmetic, each band,
upsert, streak, undo and the withheld cases.

Frontend: `api/diary.ts`, a `CompleteDiaryModal`, and the button placed **inline at
the end of the diary content**, deliberately not in a fixed bar — a floating element
has to clear the bottom nav itself and that cost three rounds (FF-0051…FF-0053). 8
jest tests cover the modal's states.

Verified end to end on a throwaway server with a real session: 3 logs totalling
2000 kcal against a 2720 kcal TDEE gave `change_lbs: -7.2`, `169.2 lb from 176.4 lb`
— 720 × 35 ÷ 3500, correct. Driving the UI put the same numbers on screen, the
completed chip and undo both worked, and the page reported no layout overflow.

One process note: the first UI run "failed" because the day was already completed by
my own earlier curl, so the page correctly showed the completed state and the
Complete Diary button genuinely was not there. The test was wrong, not the app.

## Round 53 — 2026-10-17 — FF-0056 reminders, and the notification route we do not have

Turning "can it notify?" into something real. The research from the previous round
holds: Web Push does not exist in an Android WebView, FCM would need a Firebase
project and a server key, and local notifications need neither. So the phone owns
the schedule.

`@capacitor/local-notifications` 8.3.1 added, `cap sync` found five plugins, the
manifest gained `POST_NOTIFICATIONS` and `SCHEDULE_EXACT_ALARM`, and the plugin
brings its own `RECEIVE_BOOT_COMPLETED` plus receivers. `src/notifications.ts` holds
a **pure** `buildSchedule()` (testable without a device) and an idempotent
`applyReminders()` that cancels fixed ids 1001–1003/1010 before scheduling — which is
what makes running it on every app start safe. Settings persist in `localStorage`;
the card says plainly that reminders are phone-local and that they do not work in a
browser tab.

20 new jest tests (14 scheduling, 6 card). The card distinguishes three failures
that a lazier version would have blurred: permission denied ("turn them on in
Android settings"), plugin missing from this build ("install the latest AweFit"),
and running in a browser ("only work in the app").

APK **0.1.6 (versionCode 7)** built, and checked inside the artifact rather than
trusted from the build log: the plugin classes are in the dex (16 refs), and the
merged manifest carries POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM and
RECEIVE_BOOT_COMPLETED, with `TimedNotificationPublisher`,
`NotificationDismissReceiver` and `LocalNotificationRestoreReceiver` registered.

**What is not verified:** that a notification actually arrives on the phone at the
right minute. Scheduling is verifiable here; delivery needs the device, and Android
may delay for doze regardless.

## Round 54 — 2026-10-17 — FF-0058 the camera was never offered, and the scanner never could have worked

The owner reported that only existing images could be picked. The button was already
there — five pages carry `capture="environment"` — so the fault had to be below the
web layer, and Capacitor's source said exactly where.

`BridgeWebChromeClient.showImageCapturePicker()` does
`takePictureIntent.resolveActivity(packageManager)` and returns false when it is
null; `showMediaCaptureOrFilePicker()` then logs "Media capture intent could not be
launched. Falling back to default file picker" and opens the gallery. Under Android
11+ package visibility, `resolveActivity` for an implicit intent is null **unless the
app declares a `<queries>` element for it** — and our manifest had no `<queries>` at
all. A silent downgrade that looks exactly like a working gallery button.

While in there, the second one dropped out: `android.permission.CAMERA` was not in
the manifest either (checked with `aapt2 dump permissions` on 0.1.6 — only INTERNET,
REQUEST_INSTALL_PACKAGES, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM,
RECEIVE_BOOT_COMPLETED, WAKE_LOCK). Capacitor's `onPermissionRequest` maps
`VIDEO_CAPTURE` to a CAMERA permission request and denies when it fails, so
`getUserMedia` — the barcode scanner — could not have worked on any build so far.
That is a genuine defect in FF-0030 that only a device could have surfaced, and the
owner had not reached that check yet.

Fixed by declaring `<queries>` (IMAGE_CAPTURE plus GET_CONTENT image/*) and the CAMERA
permission; no JS or UI changes were needed. APK **0.1.7 (versionCode 8)** built, and
verified inside the artifact with `aapt2`: CAMERA is an `uses-permission`, and the
merged manifest carries the `queries` element with both intents.

Still unverifiable here: that the camera actually opens, and that the scanner now
gets its permission. Both need the phone — but the manifest now gives the OS
something to grant.

## Round 55 — 2026-10-17 — FF-0059 the diary was filing evening entries on tomorrow

The owner reported that adding nuts to snacks did nothing, so they tried five times.
The live database explained it better than any repro could: five rows, all "Nuts
160 snack", all dated **2026-10-18**, all created between 00:54 and 00:58 UTC —
which is 20:54–20:58 EDT on the **17th**. Their first nuts at 19:44 EDT had landed
correctly, because 19:44 EDT is still the 17th in UTC.

Cause: seven call sites derived "today" with
`new Date().toISOString().split('T')[0]` — the **UTC** calendar date. West of
Greenwich that is the wrong day for the last hours of every evening, so a log made
after 20:00 EDT was filed on a day the diary was not showing. The entry existed the
whole time; it was just one tap to the right on the date selector.

One helper now owns it: `src/utils/localDate.ts` with `todayLocal()` and
`localDateOf()`, built from local getters. Every `toISOString().split` in the
frontend is gone — food logs, weight logs, and the display of a stored weight
timestamp, which had the same off-by-one-day problem.

The test asserts the local date for an instant where UTC and local disagree (00:54
UTC on the 18th), and guards that comparison when the host itself runs at UTC+0 so
it cannot pass vacuously. Verified on this host: that instant is 2026-10-17 locally
and 2026-10-18 from UTC.

Worth naming the shape of this one: nothing threw, no gate could have failed, and
the data was written correctly — to the wrong day. It took the owner's duplicate
attempts in the database to make it visible, which is exactly what the journal is
for.

## Round 56 — 2026-10-17 — FF-0060 the scanner was reading the wrong symbology

Camera opened, aimed, never detected. The decoder was jsQR, which reads **QR codes
only**; a food packet carries EAN-13/UPC-A. Not a tuning problem — a wrong tool.
Confirmed both ways with a hand-built, checksum-correct EAN-13 pattern: ZXing returns
the digits, jsQR returns `null` on the same buffer.

Replaced with `@zxing/library`'s MultiFormatReader (EAN-13/EAN-8/UPC-A/UPC-E/Code-128/
Code-39/ITF/QR), jsQR uninstalled, frames downscaled to 800px before decoding because
TRY_HARDER at full resolution is slow.

Two findings from writing the test rather than the feature:

1. **ZXing silently rejects RGBA.** `RGBLuminanceSource` only converts when
   `BYTES_PER_ELEMENT === 4`, i.e. an `Int32Array`; given a `Uint8ClampedArray` it
   treats each byte as a pixel, so the image is noise and nothing ever decodes. My
   own first probe failed for this exact reason and I nearly concluded ZXing could
   not read EAN-13. `toLuminance()` handles it, and the conversion has its own test.
2. **A leading-zero EAN-13 comes back as UPC-A** (12 digits). The test expectation
   failed with `123456789012` vs `0123456789012`, which is correct ZXing behaviour and
   a real bug for US products: the cached row would not match the next scan. The
   server now canonicalises to 13 digits, stores that form, and searches both, so a
   pre-existing 12-digit row still resolves — with three backend tests.

The decode is now covered by real bitmaps in jest (16 tests), which is the first time
this path has been verified without a phone.

## Round 57 — 2026-10-17 — FF-0063 per-100g numbers wearing a serving label

"The calories listed is super high, like at least 4 times what it is." That number was
the clue: `parse_product` read OpenFoodFacts' per-100g nutriments and attached the
product's `serving_size` label to them, so a 100 g figure was presented as one
serving. Their own cached rows made it concrete — peanuts stored as 536 kcal for a
28 g serving (~150 real, 3.6×), creamy peanut butter 576 for 33 g (2.9×), and Coffee
mate 500 for a **2 g** serving (50×).

Now: prefer OFF's own `*_serving` fields when published, else scale per-100g by the
serving mass (`serving_quantity`, or a mass parsed from the label), else keep
per-100g numbers and *say* `100 g` in the label. The last branch matters: a label that
matches its number is worth more than a number that looks per-serving.

Checked against the live API rather than trusting the arithmetic: crisps publish
536 kcal/100 g and 152 kcal per 28.349 g, and our scaled value is also 152. Nutella
publishes no serving size at all, so it correctly reads 539 kcal per `100 g` — the
old test fixture's `15 g` had been invented and is now fixed to match reality.

The cache is the other half of this bug: a `Food` row cached from a barcode is never
refreshed (that is what makes scanning instant and offline), so the parser fix alone
would leave the wrong numbers in place forever. `scripts/refresh-barcode-foods.py`
re-reads them, dry-run by default. The owner's four affected rows were products they
never logged, so at their direction those were deleted instead — after a backup, and
after confirming no `food_logs` referenced them.

Deliberately not rewritten: `food_logs`. Those are a record of what was believed when
the food was logged; fixing history is a different decision, and the ticket says so.

## Round 58 — 2026-10-17 — FF-0065 the trash can called nothing, and what a delete should mean

"Click trashcan, then delete, but it doesn't go away." The endpoint had never existed:
`foodApi.deleteFood` calls `DELETE /api/food/<id>`, and the blueprint only had DELETE
for `/log/<log_id>` and `/log/<log_id>/photo`. The 404 was swallowed twice over — the
store read `error.response.data.message` while the API returns `.error`, so even the
failure message was blank.

The design question came from the owner rather than being decided quietly: what
happens to diary entries that reference the food? Weighed detach / refuse / cascade /
archive and chose **detach** — entries keep their own snapshotted values and only lose
the `food_id`, so tidying the food list never changes what your diary says you ate, and
cleanup is never blocked by history. `food_logs` already behaved like this in reverse
(`delete_food_log` prunes an orphaned food by name), so the tables stay symmetric.

The response now returns `logs_kept` and the toast reads "Food deleted — 3 diary
entries kept their own values": the outcome is stated, not left to be discovered.

Also fixed while here: the store compared `food.id !== id` where the API sends numbers
and the UI passes strings, so even a successful delete could leave the row on screen
until a refetch; and the stale `Honey roasted peanuts` row that a scan had re-created
(the parser fix still awaited its restart) was removed — no logs referenced it.

5 backend tests (owner deletes, double delete, another user's food, shared food, a
logged meal surviving) and 5 store tests (list update, plural/singular count, numeric
id matching, API error surfaced).

## Round 59 — 2026-10-17 — FF-0068 closing the day became a thing worth keeping

The owner's brief was about behaviour, not just layout: make closing the diary feel
like a finish line so there is a reason not to keep adding food, and gamify the daily
habit with streaks.

Backend: `completion_streaks()` computes two counters from `diary_completions` —
`closed_days` (any completed day) and `within_goal_days` (completed days with intake
above zero and at most 10% over goal, so under-goal counts). Both use current-run
semantics: count back from the most recent qualifying day, 0 once that day is older
than yesterday. `summarise_record()` became the single payload builder for POST and
GET, so `GET /completion` now returns the entire closed summary and the panel renders
from the page load instead of a second request.

Writing the tests taught me the design: my first assertion said that closing today
over goal should zero the on-target streak, and the implementation disagreed by
returning 2. The implementation was right — zeroing it would erase a real run at the
exact moment a user is most likely to give up. The streak ended yesterday, and
yesterday is still current. The test now documents that asymmetry on purpose.

Frontend: a `ClosedDayPanel` sits directly under the goal / food / exercise line with
the projection, both streaks and Reopen; the old bottom "Diary complete / Undo" row is
gone, because two ways to undo one action stops a finish line feeling like one. The
open state gained a one-line nudge ("3 days closed in a row — close today to keep it
going"), and the celebration modal reports both counters with Reopen in place of Undo.

A bug caught by looking at a screenshot rather than at assertions: because the GET now
returns the full closed summary, the celebration modal popped up on every page load of
an already-closed day. Split into `closedSummary` (panel, from load) and `completion`
(modal, only when the user closes). Verified in the browser: no modal on load, panel
present, Reopen swaps back to the Complete Diary button, and the nudge reads correctly.

Verified end to end on a throwaway server: three closed days (two under goal, one over)
produced `closed_days: 3`, `within_goal_days: 3` — correct, because the profile's
recomputed goal of 2700 puts the 10% ceiling at 2970 and the 2600 kcal day is inside it.
40 new/changed tests (10 backend over the streak maths and payloads, 16 frontend).

## Round 60 — 2026-10-17 — FF-0070 the Monday weigh-in came on Sunday

Two faults stacked in one field. `buildSchedule` never included `weekday` at all, and
Capacitor reads `{ hour, minute }` with `repeats: true` as **daily** — so the "weekly"
weigh-in was a daily alarm that happened to arrive first on a Sunday. The meal
reminders are daily by design, which is exactly why the omission stayed invisible
until the one reminder that needed a weekday.

Adding it exposed the second fault: JS counts Sundays as 0, Capacitor's `Weekday` enum
counts them as 1 (checked in the plugin's own `definitions.d.ts`, Sunday = 1). Off by
one there silently shifts the reminder to a neighbouring day — the same bug wearing a
different hat. `toCapacitorWeekday()` is now the only conversion, and the tests pin the
entire map plus the inverse rule: meals must *not* carry a weekday.

Both are the kind of defect that a test asserting the payload shape would have caught,
and my original reminder tests asserted titles and ids — not the schedule — for the
weigh-in. They do now.

Repair is automatic: the reminders card re-applies on mount and `applyReminders`
cancels fixed ids first, so opening the app once replaces the stray daily notification.

## Round 61 — 2026-10-18 — FF-0071 the data layer for streaks and badges

Design settled with the owner first (mock rendered from the app's real palette, then
three questions), which changed the shape twice: best streak moved out of the diary and
Home to the badges section only, and the badges became three *nested* week badges rather
than my invented set — perfect week (7/7 closed), on target week (≥5/7 on target, still
requiring 7/7 closed) and golden week (7/7 on target), all repeatable.

Backend only, this round. `diary_completions.goal_calories` (migration `cef99f51c9d7`)
records the goal in force when a day is closed, backfilled from the user's goal. That
fixes a real flaw rather than tidying: `within_goal` judged every historical day against
*today's* goal, so raising the goal silently converted past "on target" days into
failures, rewriting a streak the user had already earned.

`week_start()` uses `date.weekday()` (Monday = 0, so Sunday = 6) and is the single
definition of a week — the strip and the badges must agree on where a week begins, or
the reward contradicts the evidence. `weekly_summary()` returns the seven dots with a
per-day state of on_target / closed / open / missed / future; `badges()` walks every
week with seven completions and counts the three badges; `longest_streak()` gives the
one number that lives only in More.

Badges are derived, never stored: no badge table to drift, no migration if the rules
change, and the history is the record. That is only honest because each day now carries
its own goal.

`GET /completion` gained a `week` block so the strip renders from the request the diary
and Home already make (open and closed states alike), and `GET /badges` serves the More
page. 11 new tests: week-start mapping across the whole week, the five day states, the
badge ladder (golden earns all three, 5/7 earns two, 4/7 earns one, a gap earns none),
accumulation across weeks, per-day goal judgement, best streak across a gap, and the
endpoint shape.

## Round 62 — 2026-10-18 — FF-0072 the strip and the badge collection

Frontend half of the streak work. `StreakStrip` is one component rendered in three
places — the open diary, inside the closed-day panel, and under the calorie bar on Home
— so the visual language cannot drift between screens. Best streak stayed out of all
three, per the owner, and appears only in the More page's badge section.

Four dot states, no red anywhere: on target (green), closed-but-over (blue), today-open
(amber ring), missed (hollow), future (pale). A day closed over goal is an honest state,
not a failure; painting it red would discourage the exact behaviour the badges reward.

A real bug fell out of testing on an actual Sunday: the strip is empty on Sunday while
the run length reads "5 days closed", because those days belong to the week that just
ended. Both numbers are right and look like they disagree, so the strip now labels
itself "this week". Naming the window was cheaper — and more honest — than changing it.

Badges are counted (`× 4`), since they are repeatable, and locked ones show progress
through the current week (1/7, 0/7) rather than a mystery. All derived from history.

Found while screenshotting: the More tab is `/profile`, not `/more` — `/more` is served
by the SPA catch-all and renders an empty shell, which is what an earlier round measured
when it listed "/more" among the navigable destinations. Worth remembering before
trusting a 200 from this app.

Tests: 6 for the strip (states, labels, colours, the on-target count, singular/plural),
4 for the badges section (counts, locked progress, stats including best streak, and
rendering nothing when the endpoint fails), plus updated panel and page tests.

## Round 63 — 2026-10-18 — FF-0073 one expression, three wrong answers

The weight-photo ticket from intake was accurate, and the root cause was a single line:
`photo_url: uploadedPhotoUrl || null` in `onSubmit`. It conflated "did I upload" with
"what should be saved", so an untouched photo was erased on save, and a photo picked and
saved in one step was uploaded to disk and recorded as null — the orphans sitting in
`app/uploads/weight_photos/`.

Replaced with three explicit outcomes (`onSubmit`): picked file uploaded first and its
returned URL used; explicit removal sends null; untouched omits the key. The omission is
built into the payload object rather than relying on axios dropping `undefined` — the
backend's rule is `'photo_url' in data`, so key presence *is* the instruction and must
not depend on client serialisation. `weightStore.updateLog` now builds its payload the
same way.

Two things surfaced only by writing the tests: a saved photo had **no remove control at
all** (the ✕ existed only on the freshly picked preview, so the ticket's "explicit
Remove" acceptance criterion was unreachable), and a failed upload **rejected instead of
aborting**, which is an unhandled promise rejection on the phone. Both fixed.

`uploadedPhotoUrl` is no longer read by either page; it is still cleared on mount in
EditWeight so it cannot infect other screens, per the ticket's warning not to "harmonise"
the two stores — the missing throw belongs to the food log and is FF-0075.

Verified live on a throwaway server: create-with-photo attaches in one step, the photo
shows on open, and an untouched save sends `{"weight_lbs":180.5,"date":"...","notes":""}`
— no `photo_url` key — with the photo still on the row afterwards. 5 new frontend tests.

Note on process: the subagent lane failed twice with no closing message, so this was
implemented inline in the coordinating session rather than delegated.

## Round 64 — 2026-10-18 — the orphaned weight photos are gone

Cleaned up on the owner's instruction after FF-0073 explained the cause: uploads that were
written to disk and then recorded as `photo_url: null`, because the save inferred its
intent from shared state.

Orphan detection scanned **every text value in every table** (9 tables, 473 values) rather
than just `weight_logs.photo_url` — a file referenced from anywhere is protected, and the
cost of over-keeping is a few kilobytes while the cost of over-deleting is a user's
irreplaceable photo. Seven files, 8.6 MB; the two that remain are both referenced, and
walking every `photo_url` against the filesystem afterwards shows zero broken references.

Three of the seven were mine, which is the part worth recording: 70-byte 1×1 PNGs left by
my own browser verification. A throwaway gunicorn on a *copied* database still writes
uploads into the real `app/uploads/` — the database is disposable in that setup, the
uploads tree is not. Future live checks should point uploads somewhere temporary or clean
up after themselves explicitly.

## Round 65 — 2026-10-18 — FF-0074 a weigh-in you can just look at

Read-only screen at `weight/history/:id`; the history row now opens it and Edit is an
explicit button, so reviewing an old entry no longer puts number inputs under your thumb.

Built to the ticket's acceptance criteria, with the parts I would have got wrong on my own
spelled out in the brief: the date through `localDateOf` (not the ISO string — FF-0059's
bug class), the photo hidden on `onError` with a quiet "No photo" state distinct from the
"No notes" one, and `utils/photoUrl.ts` extracted so the URL builder has one home instead
of becoming four copies.

**The test that matters most** asserts the screen sends *no mutating request* on mount.
It is the mirror of FF-0073: that fixed a save that destroyed a photo, this makes sure
merely looking cannot. Verified live on a throwaway server: row tap lands on
`/weight/history/13`, weight, local day and notes render, the photo shows and enlarges,
the screen has zero number inputs, and Edit leads to the form.

Two smaller things: the delete confirm test failed at first because "Delete" now matches
two buttons (page action and modal confirm) — disambiguated rather than worked around, so
the test still proves the modal is what fires the delete. And I cleaned up the upload my
verification wrote into the real `app/uploads/` this time, instead of leaving it for a
later sweep.

## Round 66 — 2026-10-18 — FF-0075 the guard that cancelled the upload

Same field as FF-0073, opposite failure. There `uploadedPhotoUrl` was written into a save
payload and destroyed photos; here it was a control-flow guard, so a value left by an
earlier screen made `!uploadedPhotoUrl` false and the upload was skipped outright. Editing
two food entries in a row and attaching a photo to each lost the second, silently.

Fixed by removing the shared field from every decision: the page keeps its own
`uploadedThisVisit` (set only by its own upload, cleared when the file changes) and clears
the store slot on mount. `uploadFoodLogPhoto` now returns the URL and rethrows on failure,
matching `weightStore.uploadPhoto` — the swallowed error is what made the skip invisible,
since `onSubmit` carried on to `updateFoodLog` and `navigate(-1)` regardless.

Also removed the "Photo uploaded" text that replaced the image after an upload: the photo
the user just attached should not appear to vanish behind a confirmation.

Tests caught one mistake of mine worth noting: the store calls `foodApi.getFoodLog`, not
`getFoodLogById`, and my mock used the wrong key — every test failed with the page stuck
on its spinner, which is exactly what a silent undefined would have done in production.
