# Questions for the owner

Open questions are batched here rather than asked mid-round, so an unattended
run keeps moving. Answer inline under the question; the next round picks it up.

**Format:** one `###` per question, with the ticket id, what I assumed in the
meantime, and what changes if you answer differently.

---

_The eleven from the Android/autonomy planning round were all answered_ (see
`DECISIONS.md`). Q1, Q3 and Q4 are resolved; **Q2 is half done** — the restart
happened, the passwordless drop-in did not. What still needs you is listed under
"Waiting on you" at the bottom of this file.

### Q1 — Tailscale Serve/HTTPS — **RESOLVED 2026-10-17**

You enabled Serve and set the operator. Verified from this host:

- `tailscale serve status` → `https://home-server-1.tail96ee52.ts.net (tailnet only)` proxying `http://127.0.0.1:5001`
- Certificate: `CN=home-server-1.tail96ee52.ts.net`, Let's Encrypt, valid to 2027-01-15, verified by `openssl` and accepted by Chromium
- `200` over HTTPS, 13 ms warm (the first request took 35 s while the cert was issued)
- Deep links (`/food/daily`, `/progress`, `/more`) and the API (`401` anonymous) work through the proxy

FF-0008 is closed: **APK 0.1.3 (versionCode 4)** bakes that HTTPS origin.

### Q2 — Sudoers drop-in + a restart — **restart done, drop-in still missing**

**Done by you, 2026-10-17 18:32 EDT:** `sudo systemctl restart fitnessfriend`.
Everything that was waiting on it is now live on the server — verified from this
host after the restart:

| Checked | Result |
| --- | --- |
| `GET /api/app/version` | 0.1.3 metadata, `versionCode 4`, `serverUrl https://…` |
| `GET /download/awefit.apk` | `200`, `application/vnd.android.package-archive`, 3,813,445 bytes |
| `GET /api/food/barcode/…` | `401` (route exists and requires auth) |
| process environment | `SESSION_COOKIE_SECURE=true` |

**Still outstanding:** the passwordless drop-in. Re-verified 2026-10-17:
`/etc/sudoers.d/` contains **no** `fitnessfriend-agents` file, and `sudo -n -l`
still answers *"interactive authentication is required"*. So the 18:32 restart was
done by hand, and **every backend change still waits for you**:

```bash
sudo install -m 0440 -o root -g root \
  /home/angrygiant/github_projects/FitnessFriend/scripts/sudoers.d/fitnessfriend-agents \
  /etc/sudoers.d/fitnessfriend-agents
sudo visudo -c          # must print "parsed OK"
```

That grants exactly two things without a password — `systemctl restart`/`status`
for `fitnessfriend` and `fitness-frontend` — so later rounds can deploy backend
work themselves instead of ending every merge with "awaiting restart".

**Assumed meanwhile:** every backend change is verified on the throwaway server in
the gates' smoke step and reported as "awaiting restart" in the journal.

### Q3 — Camera barcode scanner — **RESOLVED, route 1 (FF-0030 shipped)**

Enabling HTTPS answered it. Measured in Chromium against the new origin:
`isSecureContext: true`, `navigator.mediaDevices` is an object, `getUserMedia` is a
function — all the opposite of the plain-HTTP origin that parked this ticket.

So the scanner is in-app with **jsQR** (no native plugin, no Play Services, no extra
APK weight), opening on the camera with "Type the barcode instead" as the fallback.

**One thing still needs your phone:** I cannot point a camera at a barcode from
here. The decode path is unit-tested with a stubbed decoder, but "hold a real
barcode in front of a real lens" is unverified until you try it. If the frame rate
or focus hunts, tell me and I will tune it.

### Q4 — Nothing backend has reached the live server — **RESOLVED 2026-10-17**

The restart fixed it. `/api/app/version`, `/download/awefit.apk` and the barcode
endpoint all answer correctly on the live server now, and `SESSION_COOKIE_SECURE`
is in the running process's environment (see the table under Q2).

**One consequence to act on:** the Secure cookie means plain-HTTP clients can no
longer log in. AweFit **0.1.3** talks to the HTTPS origin; **0.1.2** still speaks
`http://100.84.29.20:5001` and will fail to log in. The APK is downloadable over
the LAN at `http://192.168.0.224:5001/download/awefit.apk` (verified serving the
real 3.8 MB file, not the SPA shell any more).
---

## Waiting on you

Three things, all small; nothing else blocks the queue.

1. **Install APK 0.1.3** — `http://192.168.0.224:5001/download/awefit.apk` on the
   phone (verified serving the real file), or `adb install -r releases/awefit.apk`.
   Do this *first*: `SESSION_COOKIE_SECURE=true` is live, so 0.1.2 (plain HTTP) can
   no longer log in.
2. **The sudoers drop-in** (see Q2) — until then every backend merge ends with
   "awaiting restart".
3. **Verify the camera scanner on the phone** (FF-0030): the decode path is unit
   tested with a stubbed decoder, but holding a real barcode in front of a real
   lens is unverified from this host.


## Current state, for when you have a minute

- **Queue:** FF-0044 (one-tap in-app update) is the only open ticket. 36 done, 7
  cancelled as already implemented, **0 blocked**. Gates green: 131 backend, 201
  frontend, tsc, smoke, toolkit.
- **Live server:** current with `master` as of the 19:18:38 EDT restart —
  `/api/app/version` and `/download/awefit.apk` answer correctly.
- **One-tap update (FF-0044):** **verified on the phone** — the banner appeared on
  0.1.4 for 0.1.5, Get it downloaded and installed inside the app without leaving
  for the browser. Current published build: **0.1.5 (versionCode 6)**.
- **Persistent login (FF-0043):** live and **verified on the phone** — the session
  cookie now carries a 30-day `Expires` and the remember token 365 days, so the app
  no longer asks for a password on launch.
- **APK:** `releases/awefit.apk` — **0.1.5 (versionCode 6)**, signed `CN=AweFit`,
  3.7 MB, baked server
  `https://home-server-1.tail96ee52.ts.net` with `cleartext: false`. Install it to
  get the camera scanner and a working login.
- **Web app:** `app/static` is rebuilt from `master` and identical to what the HTTPS
  origin serves, so an installed client shows the current UI on reload — frontend
  changes need no restart and no reinstall.
- **Board:** `http://<lan-ip>:5181/` — `python3 tasks/webui.py --daemon` starts it.
