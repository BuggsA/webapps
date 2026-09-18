#!/usr/bin/env python3
"""Collect every word a visitor could ever read into one reviewable document.

    python scripts/ip-narrative-review.py

Writes docs/ip-narrative-all.md.

The narrative lives in JSON because the app loads it and because adding a
quest has to mean adding rows rather than editing logic. JSON is a bad thing
to read prose out of, and worse to hand to someone for review. So this
regenerates a single readable file from the content files themselves, which
means it cannot quietly drift out of date the way a hand-kept copy would.

Regenerate it after any writing session, before asking anyone to read it.
"""

import io
import json
import os
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CONTENT = os.path.join(REPO, "apps", "ip", "content")
OUT = os.path.join(REPO, "docs", "ip-narrative-all.md")

MODE = {
    "dry": "dry",
    "wry": "WRY",
    "open": "**OPEN**",
}


def load(name):
    with io.open(os.path.join(CONTENT, name), encoding="utf-8") as f:
        return json.load(f)


BANNED = ["did you know", "simply", "just ", "of course", "obviously",
          "basically", "a kind of", "think of it like", "amazing",
          "incredible", "wonderful"]

# Phrases that assume which family the visitor arrived on. Every one of these
# has been wrong at least once, in both directions.
FAMILY_ASSUMING = ["your address is", "your own address is", "all four of",
                   "your address already", "four of those numbers"]


def lint(guide, chains):
    """The rules are written precisely enough to check. So check them.

    Every finding here is one that was found by hand first, by a reviewer,
    after it had already shipped into a file. That is the argument for this
    function existing.
    """
    bad = []

    # Prose only, named explicitly. Walking every string in the file swept up
    # mode names and ids and reported forty identical "dry"s as duplicates,
    # which is how a linter teaches you to stop trusting it.
    said = [t["t"] for b in guide["lines"] for t in b["text"]]
    said += [b["say"] for c in chains["lines"] for b in c["beats"]]
    said += [c["reveal"] for c in chains["lines"]]
    said += [c["title"] for c in chains["lines"]]

    for s in said:
        for w in BANNED:
            if w in s.lower():
                bad.append("banned word %r: %s" % (w.strip(), s[:64]))

    # a line heard twice, flat, is worse than a line cut
    seen = {}
    for s in said:
        key = s.strip().lower()
        if key in seen:
            bad.append("duplicated verbatim: %s" % s[:64])
        seen[key] = 1

    # assumes a family unless the branch says which one
    for b in guide["lines"]:
        for t in b["text"]:
            only = " ".join(t.get("only", []))
            if "v4" in only or "v6" in only:
                continue
            for w in FAMILY_ASSUMING:
                if w in t["t"].lower():
                    bad.append("assumes a family, ungated: %s" % t["t"][:64])

    # only[] means two different things and conflating them was a real bug in
    # the content notes. Where a bucket fires ONCE, the first match wins and a
    # fallback above a branch kills it. Where a bucket is a random pool, only[]
    # is an eligibility filter and order carries no meaning at all.
    for b in guide["lines"]:
        if b.get("fires") != "once per visit":
            continue
        plain = [i for i, t in enumerate(b["text"]) if not t.get("only")]
        if plain and any(t.get("only") for t in b["text"]):
            if plain[0] != len(b["text"]) - 1:
                bad.append("%s fires once, so first match wins - but a line with no "
                           "only[] sits at index %d and every branch below it is dead"
                           % (b["id"], plain[0]))
        if not plain and not b.get("silence_ok"):
            bad.append("%s fires once and has no fallback - some visitor gets silence. "
                       "If that is intended, say so with silence_ok" % b["id"])

    # the unguarded mode has to stay rare where lines are heard often
    for tier, ceiling in (("constantly", 0.17), ("often", 0.20)):
        sel = [t for b in guide["lines"] if b.get("fires") == tier for t in b["text"]]
        if not sel:
            continue
        share = sum(1 for t in sel if t["mode"] == "open") / float(len(sel))
        if share > ceiling:
            bad.append("%s tier is %.0f%% open, over the %.0f%% ceiling"
                       % (tier, 100 * share, 100 * ceiling))

    # a reveal nothing has earned yet
    for c in chains["lines"]:
        if c.get("provisional"):
            bad.append("PROVISIONAL, not a defect: %s - %s" % (c["id"], c["provisional"]))

    return bad


def main():
    guide = load("guide.json")
    chains = load("lines.json")
    w = []
    p = w.append

    rows = [(b, t) for b in guide["lines"] for t in b["text"]]
    modes = collections.Counter(t["mode"] for _, t in rows)
    tiers = collections.Counter(b.get("fires", "?") for b in guide["lines"] for _ in b["text"])

    p("# Every word, in one place")
    p("")
    p("**Generated** by `scripts/ip-narrative-review.py` from "
      "`apps/ip/content/*.json`. Do not edit this file - edit the JSON and "
      "regenerate, or the two will disagree and this one will lose.")
    p("")
    p("This is the whole of the writing: every line the guide can say and "
      "every chain he can say it along. Nothing here is loaded by the app "
      "yet.")
    p("")

    p("## What it is being judged against")
    p("")
    p("A reviewer should know the rules before deciding a line is wrong, "
      "because several of these are counter-intuitive and were arrived at "
      "deliberately.")
    p("")
    p("- **Evidence discipline, and four allowed classes of claim.** The "
      "instrument never claims to see what it has not asked about, so neither "
      "does he. Allowed: (1) what the instrument looked for and found or did "
      "not find, because it really did look; (2) disposition - what he likes, "
      "what steadies him; (3) the overwhelmingly likely reading of a record "
      "already on screen, phrased as inference; (4) hyperbole nobody could "
      "mistake for data. **Not allowed, and this was corrected after review: "
      "laundering an empirical claim through him.** \"Most of what I have "
      "looked at\" is not safe, because nothing records what he has looked "
      "at. Registered and observed are never conflated - absence of a route "
      "means not seen, not not-there.")
    p("- **The plate already states the fact.** A line that restates a number "
      "on screen is the wrong line. He is the only part of the product "
      "allowed to say what something *means*.")
    p("- **Three modes**, target 60 / 25 / 15 in the frequent tiers. `dry` is "
      "the default. `WRY` points at the internet and at him, **never at the "
      "thing the visitor just chose to go and look at**. `OPEN` has no joke "
      "and no undercut - if it relents into a joke it is not open, it is wry.")
    p("- **The unguarded mode must stay rare.** If he means it every time, "
      "meaning it is the formula and cannot be sincere. One-off lines are "
      "allowed to skew open: a line heard once can afford to mean something, "
      "a line heard forty times cannot.")
    p("- **Two readers at once** - somebody who has never heard the word "
      "*prefix*, and somebody who has run networks for thirty years, with the "
      "second never feeling patronised. Use the real word and cash it out at "
      "the thing on screen. Never simplify into something false. Banned "
      "outright: *did you know*, *simply*, *just*, *of course*, *obviously*, "
      "*basically*.")
    p("- **He is not teaching, he is pointing at his own work.** A surveyor "
      "says \"that one has been empty since 1991\". A curriculum says \"did "
      "you know address space can remain unallocated\".")
    p("- **`beautiful` may be used once in the entire product.** It is "
      "currently unused.")
    p("")
    p("Full reasoning: `ip-guide-voice.md`, `ip-emotional-design.md`, "
      "`ip-two-audiences.md`, `ip-story-research.md`.")
    p("")

    p("## Counts")
    p("")
    p("| | |")
    p("|---|---|")
    p("| lines the guide can say | **%d** across %d buckets |" % (len(rows), len(guide["lines"])))
    p("| modes | dry %d (%.0f%%) · wry %d (%.0f%%) · open %d (%.0f%%) |" % (
        modes["dry"], 100.0 * modes["dry"] / len(rows),
        modes["wry"], 100.0 * modes["wry"] / len(rows),
        modes["open"], 100.0 * modes["open"] / len(rows)))
    p("| chains | **%d**, %d beats |" % (
        len(chains["lines"]), sum(len(c["beats"]) for c in chains["lines"])))
    p("| beats the engine resolves at runtime | %d of %d |" % (
        sum(1 for c in chains["lines"] for b in c["beats"] if "find" in b),
        sum(len(c["beats"]) for c in chains["lines"])))
    p("")
    p("Per tier, which is where the ratio actually matters:")
    p("")
    p("| fires | lines | dry | wry | open |")
    p("|---|---|---|---|---|")
    for tier in ("constantly", "often", "occasionally", "once per visit", "once ever"):
        sel = [t for b in guide["lines"] if b.get("fires") == tier for t in b["text"]]
        if not sel:
            continue
        c = collections.Counter(t["mode"] for t in sel)
        p("| %s | %d | %.0f%% | %.0f%% | %.0f%% |" % (
            tier, len(sel),
            100.0 * c["dry"] / len(sel), 100.0 * c["wry"] / len(sel),
            100.0 * c["open"] / len(sel)))
    p("")

    p("---")
    p("")
    p("# The guide")
    p("")
    for b in guide["lines"]:
        p("### `%s` — %s" % (b["id"], b.get("on", "")))
        p("")
        p("*fires %s · %d lines*" % (b.get("fires", "?"), len(b["text"])))
        p("")
        if b.get("_note"):
            p("> %s" % b["_note"])
            p("")
        for t in b["text"]:
            bits = [MODE.get(t["mode"], t["mode"])]
            if t.get("when"):
                bits.append("*%s only*" % t["when"])
            if t.get("only"):
                bits.append("*only %s*" % ", ".join(t["only"]))
            p("- %s — %s" % (" ".join(bits), t["t"]))
        p("")

    p("---")
    p("")
    p("# The chains")
    p("")
    p("`at` is a fixed address, verified against the registry this app ships. "
      "`find` is a rule the sightline engine resolves at runtime, so the "
      "chain works without anyone having chosen the address in advance. "
      "`teaches` is never shown to anybody.")
    p("")
    for c in chains["lines"]:
        p("## %s" % c["title"])
        p("")
        p("*`%s` · %s%s*" % (
            c["id"], c["kind"],
            (" · needs %s" % ", ".join("`%s`" % n for n in c["needs"])) if c["needs"] else ""))
        p("")
        if c.get("_note"):
            p("> %s" % c["_note"])
            p("")
        for i, b in enumerate(c["beats"], 1):
            where = ("`%s`" % b["at"]) if "at" in b else ("*find:* %s" % b["find"])
            p("%d. **%s**" % (i, where))
            p("   > %s" % b["say"])
            p("   ")
            p("   <sub>teaches: %s</sub>" % b["teaches"])
        p("")
        p("**Reveal —** %s" % c["reveal"])
        p("")
        if c.get("_verified"):
            p("<sub>verified: %s</sub>" % c["_verified"])
            p("")

    p("---")
    p("")
    # Derived, not asserted. The hand-written version of this section went stale
    # the moment the main line was written, and a reviewer caught it before I did.
    p("# State of the writing")
    p("")
    has_main = [c for c in chains["lines"] if c["kind"] == "main"]
    prov = [c for c in chains["lines"] if c.get("provisional")]
    p("Derived from the content files on every regeneration, because the "
      "hand-written version of this section went stale the moment the main "
      "line was written and a reviewer found it before I did.")
    p("")
    if has_main:
        p("- **The spine exists.** %s, %d beats total." % (
            " and ".join("*%s*" % c["title"] for c in has_main),
            sum(len(c["beats"]) for c in has_main)))
    else:
        p("- **No main line yet.** The side chains are pointing at nothing.")
    p("- **%d chains, %d beats**, of which **%d are `find` rules** the engine "
      "resolves at runtime rather than addresses anybody chose." % (
          len(chains["lines"]),
          sum(len(c["beats"]) for c in chains["lines"]),
          sum(1 for c in chains["lines"] for b in c["beats"] if "find" in b)))
    if prov:
        p("- **%d chain%s cannot ship yet:**" % (len(prov), "" if len(prov) == 1 else "s"))
        for c in prov:
            p("  - *%s* — %s" % (c["title"], c["provisional"]))
    p("- **Still unwritten:** the celebration lines. Phase C machinery does "
      "not exist, and the rule for them is already set - he describes the "
      "play, like an announcer, and never congratulates the viewer.")
    p("")
    p("# Known soft spots")
    p("")
    p("- The unallocated bucket is **mostly about absence**, so its "
      "vocabulary clusters. Inherent to the subject, and the bucket most "
      "likely to read as bleak rather than dry.")
    p("- **The mode ratio counts lines, not hearings.** A tier that fires "
      "rarely contributes fewer heard lines than its share suggests, so these "
      "percentages are a proxy and a weighted one would be better.")
    p("- **Nothing varies by time, session length, or how full the notebook "
      "is.** Memory runs on one axis: unvisited, revisited, familiar.")
    p("- **A delivery scheduler is a hard requirement, not a nicety.** See "
      "`_delivery` in `guide.json`. There are %d constantly-firing lines; "
      "speaking on every arrival would make this a talkative game." % (
          sum(len(b["text"]) for b in guide["lines"] if b.get("fires") == "constantly")))
    p("")

    with io.open(OUT, "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(w) + "\n")
    findings = lint(guide, chains)
    print("wrote %s" % os.path.relpath(OUT, REPO))
    if findings:
        print("")
        print("LINT")
        for f in findings:
            print("  - %s" % f)
    print("  %d guide lines, %d buckets, %d chains, %d beats" % (
        len(rows), len(guide["lines"]), len(chains["lines"]),
        sum(len(c["beats"]) for c in chains["lines"])))


if __name__ == "__main__":
    main()
