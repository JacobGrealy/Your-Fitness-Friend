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
