# PRESERVATION_BASELINE.md

Recovery point for `apps/ip`, established 2026-09-17 before compaction.

---

## 1. Golden recovery identifier

**A working-tree snapshot, created without changing anything.**

| | |
|---|---|
| **File** | `C:\Users\you\Downloads\scratch-repo\ip-preservation-snapshot-20260917.tar.gz` |
| **Location** | the repo's **parent** directory, deliberately outside the repo |
| **Size** | 2.6 MB |
| **sha256** | `986fd788f3c75600e13b4022fdc14942b873b59bc1da2d1f24d4857e5de485cf` |
| **Excludes** | `.git/`, `scripts/.nro-cache` (55 MB, re-fetchable), `hosting/.venv/`, `hosting/cdk.out/` |
| **Contains** | the full working tree, verified to include `apps/ip/ip.js`, `ip.css`, `index.html`, `data/space.bin` and `docs/ip-plan-v2.md` |

### Restore

```bash
mkdir restored && cd restored
tar -xzf ../ip-preservation-snapshot-20260917.tar.gz
node --check apps/ip/ip.js
python scripts/ip-build-space-field.py   # only if data/space.bin is missing
```

### Verify the snapshot is intact

```bash
sha256sum ip-preservation-snapshot-20260917.tar.gz
# expect 986fd788f3c75600e13b4022fdc14942b873b59bc1da2d1f24d4857e5de485cf
```

---

## 2. Git state at preservation time

| | |
|---|---|
| **Repo** | `C:\Users\you\Downloads\scratch-repo\webapps` |
| **Branch** | `master` |
| **HEAD** | `222f56e0c140130fa469304d8bfcad771519abe0` |
| **HEAD subject** | *ip: a self-contained handoff — the pieces, for whoever tells the story* |
| **HEAD date** | 2026-09-15 21:43:32 −0400 |
| **Pushed?** | No push was performed. Nothing was pushed. |

### The working tree IS committed, as of 2026-09-16

GATE 1 was opened by the owner and the commit was made: **`3d35fca`**, *"ip:
preserve the working state before compaction"* — 38 files, 11,645 insertions.
All of `apps/ip/` is tracked. **Nothing has been pushed.** `HEAD` is now a
real recovery point for the app; the snapshot is the second one.

---

## 3. The commit — prepared, shown, then made as `3d35fca`

Per the instruction — *"If creating a commit would include questionable
files, secrets, generated data, or anything you're unsure about, stop before
committing and show me"* — this commit was first staged in a dry run and
shown. The owner then said to run it, and it was made on 2026-09-16 as
`3d35fca`. The contents below are what it contains.

**Flagged item: `apps/ip/data/space.bin`, 2.9 MB, generated** by
`scripts/ip-build-space-field.py` from a 55 MB public source. It is a
*shipped* artifact — `scripts/deploy-app.ps1` pre-gzips `apps/*/data/*.bin`
and uploads it — and `apps/tide/data/land-50m.bin`, `tide-field.bin` are
already tracked, so there is direct precedent for committing it.

**Secrets check: clean.** No AWS keys, private keys or passwords found in any
file to be added. `hosting/.hosting-outputs.env` (bucket and distribution ids)
is already gitignored.

Exact contents of the proposed commit:

```
add    .gitignore                    (one line added: scripts/.nro-cache)
add    PROJECT_STATE.md
add    apps/ip/README.md
add    apps/ip/index.html
add    apps/ip/ip.css
add    apps/ip/ip.js
add    apps/ip/telemetry.js
add    apps/ip/data/space.bin                    <-- 2.9 MB, GENERATED
add    apps/ip/fonts/Archivo-OFL.txt
add    apps/ip/fonts/archivo-latin-var.woff2     (88 KB)
add    apps/ip/fonts/archivo-latin-ext-var.woff2 (85 KB)
add    docs/building-a-new-app.md
add    docs/ip-art-direction.md
add    docs/ip-art-direction-rejected-seafire-cordage.md
add    docs/ip-build-plan.md
add    docs/ip-infinity-research.md
add    docs/ip-narrative-and-outline.md
add    docs/ip-plan-v2.md
add    docs/ip-render-research.md
add    hosting/edge/ip-whoami.js
add    hosting/hosting_stack/hosting_stack.py
add    hosting/site-root/index.html
add    scripts/deploy-hosting.ps1
add    scripts/ip-build-asn-field.py
add    scripts/ip-build-space-field.py
add    scripts/ip-render-gate.html
remove apps/ip/lib/dyes.js          \
remove apps/ip/lib/form.js           |  all four from the rejected
remove scripts/ip-contact-sheet.html |  Cordage direction
remove scripts/ip-play.html         /
```

Plus the preservation files created in this pass: `PRODUCT_SOUL.md`,
`CURRENT_STATE.md`, `APPROVAL_STATE.md`, `PRESERVATION_BASELINE.md`,
`COMPACTION_REHYDRATION.md`, `PRODUCT_SOUL_EVALS.md`, `CLAUDE.md`,
`docs/ip-visual-references.md`.

### To make it, once approved

```bash
cd C:/Users/you/Downloads/scratch-repo/webapps
git add -A
git status            # read it before going further
git commit -m "ip: preserve the working state before compaction"
# do NOT push without a separate instruction
```

---

## 4. The one production-adjacent change made during preservation

`.gitignore` gained one line:

```
# NRO source cache for scripts/ip-build-space-field.py (55 MB, re-fetched)
scripts/.nro-cache
```

Nothing else outside the new documentation files was touched. No file in
`apps/ip/` was modified during the preservation pass.
