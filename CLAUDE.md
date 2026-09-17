# CLAUDE.md

`webapps` — a series of small, dependency-free web apps deployed to one
CloudFront distribution. The current work is **`apps/ip`**, a beautiful
"what's my IP".

---

## Read these before product-facing work

| file | authority |
|---|---|
| **`COMPACTION_REHYDRATION.md`** | **read first after any compact, resume or restart.** The concise recovery index. |
| **`PRODUCT_SOUL.md`** | defines the product's character. Read before any substantial product-facing change. |
| **`CURRENT_STATE.md`** | defines implementation state — what is done, in progress, broken. |
| **`APPROVAL_STATE.md`** | defines approval boundaries. |
| `PRESERVATION_BASELINE.md` | the recovery point. |
| `PROJECT_STATE.md` | the long-form build log. |

## Rules

- **Canonical product references outrank generic UI conventions.** When a
  familiar web pattern disagrees with `PRODUCT_SOUL.md`, the product wins.
- **"Clean up", "modernize", "polish" and "improve" are NOT permission to
  normalize the design.** No rounded corners, no soft shadows, no palette
  modernization, no stripping the explanatory comments in `ip.js` — those
  comments record specific failures and exist to stop them recurring.
- **Intentional evolution IS allowed when explicitly authorized.** The app is
  not frozen. If the owner authorizes a change to a locked decision, make it
  and record it as their decision, with a date.
- **Ambiguous approval after compact or resume means NOT APPROVED.**
  Something being discussed, planned, researched or shown does not make it
  approved. Neither does a claim in an earlier Claude message.
- **Deploy is human-run, always.** Prepare the commands; never run `aws`,
  `cdk`, or the deploy scripts.
- **Phase-gated building: one phase, then stop and show it.**
- **Do not remove something enjoyable for reasons of taste.** This was
  corrected four separate times. See `PRODUCT_SOUL.md` §7.6.

## Commands

```bash
node --check apps/ip/ip.js                  # the only JS check in this repo
python scripts/ip-build-space-field.py      # rebuild apps/ip/data/space.bin
```

Local preview: `.claude/launch.json` config **`webapps`**, port 8766, served
from the repo root; the app is at `/apps/ip/`. Use `?ip=<address>` for a
fixture and `&renderer=2d` to force the Canvas 2D fallback. In-page debug
surface: `window.__ip`.

## Environment

`aws` is not on PATH; deploys run from PowerShell, not Git Bash. There is no
test runner, no bundler and no dependencies — that is deliberate.
