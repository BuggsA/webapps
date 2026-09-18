# COMPACTION_REHYDRATION.md

**Read this first after any compact, resume or restart.** Short on purpose.
Second preservation pass, 2026-09-18.

---

## Operating mode

**WAITING_FOR_USER.** A preservation pass was requested mid-proposal. **No
product work until the owner responds.**

## Objective

**Make exploring feel directed.** After several days of wandering the live
app the owner said it feels undirected and that arriving produces nothing.
Three of four diagnoses confirmed; the fourth was false only because the
first is true.

## Exact next action

**Ask whether they want a sketch of "territories" before it lands in the
app.** That question was asked and never answered, so the feature is **NOT
APPROVED**.

Then, only with a fresh instruction, the order in
`docs/ip-build-plan-v3.md`: the chain engine, the doors, the card, the inward
half, the ghost tier.

## The evidence that matters more than any plan

Measured on the live site, 2026-09-18:

- Sightlines are **hidden for the first quarter of the axis** — home and the
  block view, the first minute of every visit.
- Across eight axis positions they produce **one repeated suggestion**.
- The owner could name two destinations: private space, and brighter orbs.
  **That is the whole visual vocabulary the map has.**

A feature can pass every check in this repository and still fail its purpose.
The owner wandering for a day is worth more than all of them.

## Most important product invariants

1. **The camera belongs to the hand holding it.** A click moves the aim and
   nothing else. *Rejected three times.*
2. **Amber is only ever the visitor.** Travel away and there is no amber.
3. **Geometry accountable to the data.** If a mark cannot be explained by a
   number, remove it — do not restyle it.
4. **Never a number without something already seen to size it against.**
5. **Lit = known, dark = unasked** — and **the guide holds the same line.**
   Four classes of claim are allowed; laundering a fact through his
   observation is not one of them.
6. **No third-party address lookup, ever.** Telemetry stays dormant.
7. **Deploy is human-run, always.**
8. **Content is data.** Adding a line or a quest means adding rows. If
   anybody opens `ip.js` to add a side line, it was built wrong.

## Most dangerous regressions

1. **Trimming the enjoyment on grounds of taste.** *Rejected four times.*
2. **Making the camera move itself.**
3. **The wry mode pointing at what the visitor just chose to look at.**
4. **Writing content that can never fire** — a branch whose condition arrives
   later than its trigger.
5. **Bypassing `spread()`** when drawing many marks.
6. **Treating a plan entry as approval.**
7. **Half-cell errors** — one place treats a cell as a point, another as an
   area. Found three times. `__ip.cur()` probes for it.

## Blockers

- **Territories not approved**, and the question was never answered.
- `4cd70ce` contains **inert half-built lens groundwork**, committed to
  preserve it rather than because it is right. Treat as a sketch.
- Two chains are `provisional` and must not ship: *The boundary* needs the
  inward half; *Sold, and given back* is unverified.
- Nothing has ever been **pushed**.

## Canonical references

`apps/ip/ip.js` · `ip.css` · `index.html` · **`content/guide.json`** ·
**`content/lines.json`** · `data/space.bin` · `hosting/edge/ip-whoami.js` ·
`scripts/ip-narrative-review.py` · `docs/ip-art-direction.md` ·
`docs/ip-build-plan-v3.md`

## Critical commands

```bash
node --check apps/ip/ip.js
python scripts/ip-narrative-review.py    # regenerates the narrative doc AND lints it
python scripts/ip-build-space-field.py   # rebuilds apps/ip/data/space.bin
```

Preview: `.claude/launch.json` config **`webapps`**, port 8766 →
`/apps/ip/?ip=193.0.6.139`. Fallback `&renderer=2d`. Debug: `window.__ip` —
including `guide()`, `cel()`, `cur()`, `snd()`, `probe()`.

## Recovery

| | |
|---|---|
| HEAD | `4cd70ce`, tree clean, **never pushed** |
| Snapshot | `../ip-preservation-snapshot-20260918.tar.gz`, sha256 `9f9ad051…` |

## The preservation files

| file | what it holds |
|---|---|
| `PRODUCT_SOUL.md` | character, 13 user corrections, 12 anti-patterns, canonical refs |
| `CURRENT_STATE.md` | engineering state, bugs, decisions, next actions |
| `APPROVAL_STATE.md` | what is and is not approved. **Wins over inference.** |
| `PRESERVATION_BASELINE.md` | both recovery points |
| `PRODUCT_SOUL_EVALS.md` | the test suite; most are `NOT VERIFIED` |
| `docs/ip-narrative-all.md` | every word of the writing, generated |
| `docs/ip-build-plan-v3.md` | what is left, and in what order |

**Ambiguous approval means NOT APPROVED.**
