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
