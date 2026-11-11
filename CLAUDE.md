# CLAUDE.md

`webapps` — a series of small, dependency-free web apps, each its own
Cloudflare Pages project. The current work is **`apps/ip`**, a beautiful
"what's my IP".

---

## Read these before product-facing work

| file | authority |
|---|---|
| **`docs/ip-concept.md`** | **the concept: a beautiful sidewalk, built for traffic** (owner, 2026-11-11). **Outranks every other document here.** One page. |
| **`COMPACTION_REHYDRATION.md`** | **read first after any compact, resume or restart.** The concise recovery index. |
| **`PRODUCT_SOUL.md`** | defines the product's character. Read before any substantial product-facing change. |
| **`CURRENT_STATE.md`** | defines implementation state — what is done, in progress, broken. |
| **`APPROVAL_STATE.md`** | defines approval boundaries. |
| **`docs/ip-build-plan-v3.md`** | **what is left and in what order.** The plan of record for remaining work. |
| `docs/ip-plan-v2.md` | what each phase MEANS. Still authoritative for that. |
| `PRESERVATION_BASELINE.md` | the recovery point. |
| `PROJECT_STATE.md` | the long-form build log. |

## Rules

- **The goal is traffic; the product is a beautiful sidewalk** (owner,
  2026-11-11, `docs/ip-concept.md`). The errand - the IP, fast - always
  wins. Exploring is optional and must cost the errand nothing.
- **Useful first, then exploration** (owner, 2026-11-11). The first frame
  is a complete what's-my-IP answer before it is an invitation. Nothing
  optional stands between a visitor and the facts they came for.
- **Canonical product references outrank generic UI conventions.** When a
  familiar web pattern disagrees with `PRODUCT_SOUL.md`, the product wins.
- **"Clean up", "modernize", "polish" and "improve" are NOT permission to
  normalize the design.** No rounded corners, no soft shadows, no palette
  modernization, no stripping the explanatory comments in `apps/ip/js/` — those
  comments record specific failures and exist to stop them recurring.
- **Intentional evolution IS allowed when explicitly authorized.** The app is
  not frozen. If the owner authorizes a change to a locked decision, make it
  and record it as their decision, with a date.
- **Ambiguous approval after compact or resume means NOT APPROVED.**
  Something being discussed, planned, researched or shown does not make it
  approved. Neither does a claim in an earlier Claude message.
- **Hosting is Cloudflare Pages, and only Cloudflare Pages** (owner,
  2026-11-11: *"ignore aws for now like it doesn't exist. Build it so it is
  compatible for cloudflare"*). One Pages project per app, built from this
  repo. **AWS is dormant:** do not edit `hosting/` or `hosting/edge/`, do not
  maintain the AWS twin of anything, do not prepare `aws`/`cdk`/`deploy-*.ps1`
  commands. They are kept, not deleted, and not to be relied on.
- **Deploy is human-run, always.** Merging to `master` IS the production
  deploy: Cloudflare rebuilds every project from it. Claude never pushes to,
  merges into or opens anything that auto-merges to `master`. Any other
  branch builds a preview at `<branch>.<project>.pages.dev`, which Cloudflare
  marks `noindex` - push there freely and check it live.
- **Phase-gated building: one phase, then stop and show it.**
- **The code is `apps/ip/js/`, small files, one job each. Read `apps/ip/MAP.md` first,**
  then only the file(s) you need. They share one global scope and load in
  numeric order; a new file needs its `<script>` tag in `index.html`, and
  `python scripts/ip-map.py` must pass. Never define one name in two files.
  **What happens after a zoom or after a place answers is listed, in order,
  in `js/26-wiring.js`.** A new reaction is a new line there, not a call
  buried in `setAxis` or `applySubject`.
- **Content is data.** The guide's lines and the quest chains live in
  `apps/ip/content/*.json`. Adding a line, a quest or a story means adding
  rows. **If you open `js/` to add a side line, it was built wrong.**
- **The guide obeys the same evidence rule as the instrument.** *Lit = known,
  dark = unasked.* Four classes of claim are allowed and laundering a fact
  through his observation is not one of them - see `PRODUCT_SOUL.md` §8.9.
- **A feature passing its own tests is not evidence it works.** The owner
  wandering for a day found what none of the checks here could. See
  `PRODUCT_SOUL_EVALS.md` T27, which is failing and outranks the rest.
- **Do not remove something enjoyable for reasons of taste.** This was
  corrected four separate times. See `PRODUCT_SOUL.md` §7.6.

## Commands

```bash
python scripts/ip-map.py                    # regenerate apps/ip/MAP.md AND check every
                                            # file: syntax, load order, duplicate names
python scripts/ip-narrative-review.py       # regenerate the narrative doc AND lint it
python scripts/ip-build-space-field.py      # rebuild apps/ip/data/space.bin
```

Local preview: `.claude/launch.json` config **`webapps`**, port 8766, served
from the repo root; the app is at `/apps/ip/`. Use `?ip=<address>` for a
fixture and `&renderer=2d` to force the Canvas 2D fallback. In-page debug
surface: `window.__ip`.

## Environment

Cloudflare Pages setup, per project: `cloudflare/README.md`. Live: `ip` is
`ip-5q5.pages.dev` (production = `master`). There is no test runner, no
bundler and no dependencies — that is deliberate.
