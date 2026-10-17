# Questions for the owner

Open questions are batched here rather than asked mid-round, so an unattended
run keeps moving. Answer inline under the question; the next round picks it up.

**Format:** one `###` per question, with the ticket id, what I assumed in the
meantime, and what changes if you answer differently.

---

_The eleven from the Android/autonomy planning round were all answered_ (see
`DECISIONS.md`). The queue is now empty of everything that does not need you:
22 tickets done, 7 cancelled as already-shipped, and only Q1/Q3's tickets parked.

### Q1 — Tailscale Serve/HTTPS — **RESOLVED 2026-10-17**

You enabled Serve and set the operator. Verified from this host:

- `tailscale serve status` → `https://home-server-1.tail96ee52.ts.net (tailnet only)` proxying `http://127.0.0.1:5001`
- Certificate: `CN=home-server-1.tail96ee52.ts.net`, Let's Encrypt, valid to 2027-01-15, verified by `openssl` and accepted by Chromium
- `200` over HTTPS, 13 ms warm (the first request took 35 s while the cert was issued)
- Deep links (`/food/daily`, `/progress`, `/more`) and the API (`401` anonymous) work through the proxy

FF-0008 is closed: **APK 0.1.3 (versionCode 4)** bakes that HTTPS origin.

### Q2 — Two one-time commands from you: sudoers drop-in + a restart

`sudo` needs a password here, so the passwordless rule in
`scripts/sudoers.d/fitnessfriend-agents` is still not installed and the running
gunicorn is older than `master`. Backend work is therefore verified on a
throwaway server and left "awaiting restart".

```bash
# 1. let the agent restart the two services without a password (one time)
sudo install -m 0440 -o root -g root \
  /home/angrygiant/github_projects/FitnessFriend/scripts/sudoers.d/fitnessfriend-agents \
  /etc/sudoers.d/fitnessfriend-agents
sudo visudo -c          # must print "parsed OK"

# 2. pick up the pending backend changes
sudo systemctl restart fitnessfriend
```

After that, `/api/app/version` and `/download/awefit.apk` are live (they 404 on
the running server today because it predates the blueprint), and later rounds can
deploy backend changes themselves.

**Careful with the APK URL until then:** `/download/awefit.apk` on the live server
answers **200 with the SPA's `index.html`**, not a 404 — the SPA catch-all serves
the shell for any unknown path. Tapping it on the phone downloads a 3.7 KB HTML
file named `awefit.apk`, which Android refuses to install. The APK itself is fine
at `releases/awefit.apk`; install it with `adb install -r releases/awefit.apk`, or
wait for the restart.

**Assumed meanwhile:** every backend change is gated on the throwaway server in
`scripts/gates.sh smoke` and reported as "awaiting restart" in the journal.

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

### Q4 — Nothing backend has reached the live server yet (still open)

Every backend change since FF-0008 (`session_protection`, `/api/app/version`,
`/download/awefit.apk`, the barcode endpoint) is merged and gated but **not
running**: the deployed gunicorn predates them, and `sudo` needs your password.
The one-time fix is Q2 above. Until then the app's update banner and barcode
lookup 404 on the live server while passing the gates — re-checked over HTTPS after
Serve came up: `/api/app/version` is still `404` there, and the same endpoint
returns the correct 0.1.3 metadata on a throwaway server running `master`.

**`SESSION_COOKIE_SECURE=true` is now in `.env`** and is also waiting on that
restart. When it takes effect the session cookie stops being sent over plain
`http://`, so **logging in at `http://192.168.0.224:5001` will stop working** — use
the HTTPS address. That is the intended trade, not a bug; say so if you would
rather I revert the flag.

---

## Current state, for when you have a minute

- **Queue:** empty — **no blocked tickets left**. 25 merged, 7 cancelled as already
  implemented. Gates green: 127 backend, 171 frontend, tsc,
  smoke, toolkit.
- **APK:** `releases/awefit.apk` — **0.1.3 (versionCode 4)**, signed `CN=AweFit`,
  3.8 MB, sha256 `c86960d1…`, baked server `https://home-server-1.tail96ee52.ts.net`
  with `cleartext: false`. Install with `adb install -r releases/awefit.apk`.
  **Install this one to get the camera scanner** — 0.1.2 still points at the
  plain-HTTP address, where `getUserMedia` does not exist. The web download URL
  starts working after the Q2 restart.
- **Web app:** `app/static` is rebuilt from `master` and confirmed identical to
  what the HTTPS origin serves (both `assets/index-C2pAnXw0.js`), so the browser and
  an installed 0.1.3 show the current UI on reload. No restart needed for frontend
  changes.
- **Backend:** everything merged since FF-0008 is waiting on the Q2 restart.
