# COMPACTION_REHYDRATION.md

**Read this first after any compact, resume or restart.** Short on purpose.

---

## Objective

**Phase B of `docs/ip-plan-v2.md`** — "the descent becomes sublime", for
`apps/ip`. Registration is done; the wonder half is not.

## Operating mode

**WAITING_FOR_USER.** The preservation pass is done and its artifacts were
reviewed. The working tree is committed (`3d35fca`). **No product work
without a fresh instruction.**

## Exact next action

**The owner runs `deploy-hosting.ps1`.** The slash-less-URL fix is committed
but not deployed, and until it ships, `/ip` without the trailing slash shows
no address at all. Deploy is human-run; prepare the command, never run it.

Then, only with a fresh instruction: finish phase B — the previous container
outlined as it shrinks, and the descent accumulating.

## Most important product invariants

1. **The camera belongs to the hand holding it.** A click moves the aim and
   nothing else. Late data may fill in text, never move the frame. *Rejected
   three times.*
2. **Amber is only ever the visitor.** Travel away and there is no amber at
   all; that absence is the point.
3. **Geometry accountable to the data.** If a mark's position or brightness
   cannot be explained by a number, remove it — do not restyle it.
4. **Never a number without something already seen to size it against.**
5. **Lit = known, dark = unasked** (registry facts and landmarks excepted —
   they are known without asking).
6. **No third-party address lookup, ever.** Telemetry stays dormant.
7. **Deploy is human-run, always.**

## Most dangerous regressions

1. **Trimming the enjoyment on grounds of taste** — celebrations, counts,
   badges, the guide's licence to exclaim. **Rejected four times.** If about
   to remove something enjoyable, don't.
2. **Making the camera move itself** — fly-to, auto-centre, snap-to-state.
3. **Decoration that encodes nothing** — ambient shimmer, drift, twinkle.
4. **Bypassing `spread()`** when drawing many marks. Caused four separate
   white-out bugs.
5. **Treating a plan entry as approval.**
6. **Normalizing the design under "clean up" or "modernize".**

## Canonical references

`apps/ip/ip.js` · `apps/ip/ip.css` · `apps/ip/index.html` ·
`apps/ip/data/space.bin` + `scripts/ip-build-space-field.py` ·
`hosting/edge/ip-whoami.js` · `docs/ip-art-direction.md` ·
`docs/ip-plan-v2.md`

## Blockers

- **Undeployed: the slash-less-URL fix** in
  `hosting/hosting_stack/hosting_stack.py`. Needs `deploy-hosting.ps1`.
- Nothing has been **pushed**; `master` is local-only.
- Recovery points: `HEAD` (`3d35fca`) and
  `../ip-preservation-snapshot-20260917.tar.gz`, sha256 `986fd788…`.

## Pending approvals

Push · any further commit · deploy · starting any phase after B · removing
anything enjoyable · installing a dependency · running `/compact`. Full list in
`APPROVAL_STATE.md`.

**Ambiguous approval means NOT APPROVED.**

## Critical commands

```bash
node --check apps/ip/ip.js
python scripts/ip-build-space-field.py     # rebuilds apps/ip/data/space.bin
```
Preview: `.claude/launch.json` config **`webapps`**, port 8766 →
`/apps/ip/?ip=193.0.6.139`. Fallback: `&renderer=2d`. Debug: `window.__ip`.

## The preservation files

| file | what it holds |
|---|---|
| `PRODUCT_SOUL.md` | character, user corrections, anti-patterns, canonical refs |
| `CURRENT_STATE.md` | engineering state, bugs, decisions, next actions |
| `APPROVAL_STATE.md` | what is and is not approved. **Wins over inference.** |
| `PRESERVATION_BASELINE.md` | the recovery point and the unmade commit |
| `PRODUCT_SOUL_EVALS.md` | the test suite; most are `NOT VERIFIED` |
| `docs/ip-visual-references.md` | ten reference states, reproducible by hand |
| `PROJECT_STATE.md` | the full running build log |
