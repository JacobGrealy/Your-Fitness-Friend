# Questions for the owner

Open questions are batched here rather than asked mid-round, so an unattended
run keeps moving. Answer inline under the question; the next round picks it up.

**Format:** one `###` per question, with the ticket id, what I assumed in the
meantime, and what changes if you answer differently.

---

_No questions are open right now._ The eleven from the Android/autonomy planning
round were all answered (see `DECISIONS.md` for how each was recorded).

### Q1 — Tailscale Serve/HTTPS is disabled on the tailnet (FF-0008, blocked)

`tailscale serve --bg 5001` answers:

> Serve is not enabled on your tailnet. To enable, visit:
> https://login.tailscale.com/f/serve?node=nyeAxDLDc221CNTRL

`Self.CertDomains` is also empty, so HTTPS certificates are off too. Both are
admin-console switches I cannot flip.

**What I need from you (2 minutes):**

1. Open <https://login.tailscale.com/f/serve> and enable Serve (this also enables
   HTTPS certificates for the tailnet).
2. `sudo tailscale set --operator=angrygiant` so serve can be managed without a
   password — otherwise every `tailscale serve` call needs you.

**What I assumed meanwhile:** builds keep pointing at
`http://100.84.29.20:5001` (the stable Tailscale *IP*), which works today. The
partial work that did not need Tailscale has landed: `SESSION_PROTECTION` is now
configurable and defaults to `basic` (so switching networks stops logging the
phone out), `SESSION_COOKIE_SECURE` is config-driven instead of hardcoded false,
and README documents the exact commands above.

**When you have done it**, just say so and FF-0008 finishes in one round: serve,
verify with curl, then rebuild the APK against `https://home-server-1.tail96ee52.ts.net`
and confirm login survives.
