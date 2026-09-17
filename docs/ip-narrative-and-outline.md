# What’s My IP

## Product narrative and outline design brief

**Status:** Directional handoff for product, design, content, and engineering  
**Purpose:** Describe the experience clearly enough to begin prototyping, while preserving the few gaps that can only be resolved through design and technical tests.  
**This is not:** A finished visual design, a component specification, or an implementation plan.

---

# Part I — The narrative

## The address is Home

A person arrives because they need their IP address.

There is no welcome screen. No logo animation. No consent wall. No explanation of what an IP address is. Nothing stands between the person and the thing they came for.

Their address is already there.

Large enough to read immediately. Easy to copy. Finished.

Around it is a quiet field that can be ignored. The visitor’s address is a distinct point within it. The page feels complete even if nothing moves and nothing else loads.

The rushed visitor copies the address and leaves in four seconds.

The product has succeeded.

But the field suggests that the number is not only a number. It occupies a position. The person can move away from it in one direction or toward it in the other.

Their address is the zero point.

It is Home.

## Outward

The visitor moves outward.

Their address becomes a smaller mark inside the prefix that is actually announced for it on the Internet. A boundary appears around the containing block. A name resolves beside it:

> `203.0.113.42`  
> `203.0.113.0/24 · announced by AS64496`  
> `Example Network`

The identifiers above are reserved documentation examples. In the live experience, the visitor sees their real address, the containing routed prefix, the announcing autonomous system, and the best available organization name.

This is the first revelation:

**The address belongs inside something.**

The page does not say that the network owns the person, knows who they are, or physically contains them. It says only what the routing data supports:

> **This address is announced as part of this block.**

The visitor moves outward again.

The single block separates into the other prefixes announced by the same network. They do not become a tidy country or a continuous continent. They remain distinct pieces because that is what they are.

Some networks consist of a few large blocks. Some consist of hundreds or thousands of smaller ones. Some look compact; some look scattered. The form changes because the data changes.

> **AS64496 currently announces 37 prefixes.**

The visitor does not need to know what an autonomous system is before this moment. The behavior teaches the idea first: one named network can be made of many separate address blocks.

The visitor moves outward once more.

The network becomes a node among other networks observed beside it in BGP paths. Names appear. A transit provider. Another ISP. A university. A cloud platform. An organization the visitor recognizes, and several they do not.

The page is precise about what this view means:

> **Observed beside this network in BGP paths.**  
> `Not necessarily the route this visit took.`

No animated packet claims to retrace the visitor’s journey. No line is described as a physical cable or a measured route. The relationships come from published routing observations; the language does not claim more.

Until now, the visitor has been following themselves outward.

Here, the nature of the experience changes.

They touch another network.

Nothing opens over the page. No dashboard slides in. The instrument simply changes its subject.

The selected network becomes the focus. Its prefixes can be inspected. Its observed neighbours can be entered. Each real network can become the center of the same instrument.

The visitor moves from their own provider to another network, then another:

> home network → transit network → university → regional provider → something unknown

A faint thread remains in the field. It is not a breadcrumb bar or a score. It is the route of the visitor’s curiosity through relationships they chose to follow.

Their own IP address remains visible and copyable throughout. Small now, but distinct.

Home.

This is where the experience can hold an hour. It does not present an hour of chapters. It gives the visitor a small number of truthful actions that can be repeated across a large, real space:

- Move outward or inward in scale.
- Select a real object to make it the subject.
- Follow an observed relationship.
- Return Home.

Different networks have different characters without the design inventing personalities for them. One is vast and fragmented. Another is small and densely connected. Another has few visible neighbours. Some relationships are uncertain or incomplete and remain visually unresolved rather than being converted into confident lines.

Names create questions the page never has to ask:

*Why is that university connected here?*  
*How large is that cloud network?*  
*What is the enormous one beside mine?*  
*How far have I wandered?*

The visitor supplies the curiosity. The product supplies a place where it can go.

At the widest scale, the individual network recedes into a population of active networks. The exact count is drawn from the dataset and dated rather than hard-coded as an eternal fact.

The field is not a random star background. Every position must follow a consistent, defensible construction. The visitor’s network remains marked. Networks visited during this session retain the faintest trace. The path through them is visible only because the visitor made it.

This widest view is not an ending.

It is the horizon: everywhere the visitor could go.

They can enter another point and the field opens again. Or they can touch their own address.

The journey folds back to Home.

## Inward

From Home, the visitor can move the other way.

Outward asks:

> **What contains this address, and what is connected to it?**

Inward asks:

> **What did this visit reveal, and where does the page’s visibility stop?**

This side is not an endless map. It is a finite inspection. That asymmetry is intentional.

### What crossed the wire

The address enlarges until it is no longer treated as a location in the network. It becomes the request that created this visit.

The page shows only the information the site actually received from this browser and this request. Literal values come first; plain-language interpretations appear only where they are accurate.

> **This reached the edge.**

The section does not promise that every browser will reveal an exact operating-system version, device model, or full browser version. Modern browsers deliberately reduce or vary some of those details. If a field was not exposed, it is not reconstructed or implied.

The privacy statement matches the deployed infrastructure. If request logging is disabled or stripped as designed, the page may say:

> **Seen for this response. Not kept by this experience.**

If the infrastructure cannot support that sentence literally, the sentence changes. The copy never outruns the system.

### What stayed here

Moving further inward reveals details the page can observe locally: viewport, timezone, language preferences, color preference, touch capability, and browser-reported concurrency, along with any other values deliberately included in the final scope.

These are labeled as browser-reported observations, not as perfect measurements of physical hardware or personal identity.

> **This browser made these details available here.**  
> **They have not been sent by this section.**

That distinction is part of the experience, not a footnote hidden in a policy. Server-observed information and locally observable information look related but remain visibly separate.

The local section should continue to work after the page is loaded and the network is disconnected. The architecture makes the privacy claim tangible.

### Together

The observations gather without turning into a score.

There is no invented “one in a million” result. There is no claim that this visitor is unique unless a legitimate comparison population exists and the product intentionally performs that comparison—which this product does not.

The page says only:

> **Together, details like these can form a browser fingerprint.**

Then it stops escalating.

### The boundary

The final inward movement becomes quieter.

> **This page cannot see:**

> your name  
> your files  
> your other tabs  
> your street address

And then:

> **Opening it did not give those away.**

No shield icon. No green check. No promise that the Internet is safe. The instrument simply reaches the edge of what this page can observe.

There is nowhere further inward to go.

The visitor returns Home.

## The shape of the whole experience

The experience is one instrument with a home position.

It is not a linear story that every visitor must sit through. The story exists spatially around the answer, and the visitor chooses whether to enter it.

At its center, the product is a four-second tool.

Outward, it becomes an open-ended map.

Inward, it becomes a finite microscope.

The same address anchors all three.

Four valid visits can happen on the same page:

1. **Four seconds:** copy the IP and leave.
2. **Thirty seconds:** learn which routed prefix and named network contain it.
3. **Five to fifteen minutes:** travel to the horizon and inward to the boundary.
4. **An hour:** select a network, follow its relationships, get lost safely, and return Home.

Nothing nags the repeat visitor. Nothing announces that there is more to discover. On the thirty-ninth visit, someone who has always copied and left may move the page by accident, recognize their provider, touch another network, and realize the utility has contained a map all along.

The desired reaction is not:

> “This site also has educational content.”

It is:

> **“Wait. I can go in there?”**

Then:

> **“I can keep going.”**

## The artifact and the exit

At any meaningful view, the visitor may save a still image.

The saved frame is not a screenshot of controls. It is the canonical reduced-motion composition: the current subject, the truthful structure visible at that scale, the visitor’s address if appropriate, and a quiet museum plate with the date and series mark.

If the visitor has wandered, the image may include the faint thread they drew through the network during this session. It is personal without being a profile, a score, or a stored history.

At the end—not in the first frame—the series appears as provenance:

- *Tonight* — where you are under the sky.
- *Tide* — where you are in the moon’s pull on the ocean.
- *Until* — where you are in time.
- *This* — where you are in the network.

They are the same instrument pointed at different things:

> **Where am I inside something larger than me?**

The primary way the product spreads remains much simpler:

> “Use this IP site. It’s clean.”

And sometimes:

> “Move around when you have a minute.”

---

# Part II — Outline design template

## 1. Product definition

### Working product sentence

**Your IP is a place. Copy it and leave—or follow it outward until the Internet becomes somewhere you can wander. Touch your address to come Home.**

### Product promise

Deliver the visitor’s public IP address immediately, then make that address the starting point for an optional, truthful exploration of the network around it and the information visible to the page.

### Experience model

| Region | Question | Shape | Ending |
|---|---|---|---|
| **Home** | What is my public IP? | Immediate utility | Complete on arrival |
| **Outward** | What contains this address, and what is connected to it? | Recursive, explorable map | No fixed ending |
| **Inward** | What did this visit reveal, and what stayed local? | Finite inspection | Explicit privacy boundary |

### Priority order

1. Beauty.
2. Wonder.
3. Utility.

This priority order does **not** permit beauty or wonder to delay, obscure, or complicate the utility. The IP answer is the immovable floor.

## 2. Experience principles

### Decided

- The IP address is visible in the initial response and remains copyable at every depth.
- There is no opening sequence, tutorial, modal, onboarding, account, consent wall, ad, or promotional interruption.
- Exploration is voluntary and reversible.
- Home always means the visitor’s own address, even when another network becomes the current subject.
- Outward becomes recursive at the network-neighbour level.
- Inward is deliberately finite and ends calmly.
- Every visible relationship must correspond to a relationship supported by the underlying data.
- The experience does not use geography as a proxy for network topology.
- The experience does not claim to trace the visitor’s packets.
- No third-party network lookup fires during an arrive-copy-leave visit.
- Reduced motion is a first-class composition and the basis of the saved image.

### Proposed; validate in prototype

- A single signed scale axis: Home at zero, outward positive, inward negative.
- Wheel, trackpad, pinch, drag, and keyboard all control position on that axis.
- Selecting a network changes the instrument’s subject without changing the visitor’s Home.
- A subtle session-only trail shows the networks the visitor chose to traverse.
- The current subject may receive a stable shareable URL in a later release; session trail data is not encoded by default.

### Explicitly out

- Random particles whose placement has no semantic meaning.
- A globe, world map, country map, or implied physical proximity.
- Fake packets, fake traceroutes, or claims that BGP adjacency is the visitor’s measured route.
- A fixed hour-long guided tour.
- Quizzes, achievements, streaks, counts of “networks discovered,” recommendations, or a feed.
- A privacy scare sequence or unsupported uniqueness score.
- A conventional analytics/dashboard visual language.
- Global search in the first build. Reconsider only if testing shows that relationship-based wandering cannot sustain curiosity.

## 3. Core states and content contract

The names below are design-state labels, not required visible headings.

| State | Visitor sees | Data basis | Primary action | Proposed copy | Fallback |
|---|---|---|---|---|---|
| **H0 — Home** | Public IP, copy control, quiet responsive field | Viewer IP from own edge | Copy; begin moving | Address only; optional edge round-trip labeled precisely | Address remains; field becomes a stable still |
| **O1 — Announced block** | Address inside routed prefix; origin ASN and name | RIPEstat `network-info`, name lookup | Continue outward | “This address is announced as part of this block.” | “Routing details unavailable.” Keep address visible |
| **O2 — Network** | Other prefixes announced by selected ASN | RIPEstat `announced-prefixes` | Inspect structure; continue | “AS____ currently announces __ prefixes.” | Show selected ASN/name without prefix collection |
| **O3 — Observed neighbours** | Selected ASN with observed adjacent ASNs | RIPEstat `asn-neighbours` | Select another network | “Observed beside this network in BGP paths.” | Keep selected network; explain no neighbour data is available |
| **O4 — Horizon** | Population of active networks; Home and visited subjects marked | Versioned active-AS dataset | Enter another network; return Home | “__ active networks in this dataset.” Date the dataset | Reduce density; never substitute random decoration |
| **I1 — Reached the edge** | Values actually received for this request | Own edge/request contract | Inspect; continue inward | “This reached the edge.” | Show only fields verified as received |
| **I2 — Stayed here** | Selected locally observable browser values | Client APIs/CSS media queries | Inspect; continue | “This browser made these details available here.” | Omit unavailable fields rather than infer them |
| **I3 — Together** | Previous observations gathered | No population comparison | Continue | “Together, details like these can form a browser fingerprint.” | Same statement; no score |
| **I4 — Boundary** | Plain list of information not exposed to the page | Web security model and actual app permissions | Return Home | “Opening it did not give those away.” | Must remain accurate to final feature set |

### Important cut: the `/24` “street”

A `/24` containing 256 addresses may be used as a visual texture for some IPv4 addresses, but it is **not a universal narrative state**. It does not generalize to IPv6 and is not necessarily the meaningful routed unit for a given address. The first outward state is the containing announced prefix returned by routing data.

## 4. Interaction grammar

### The minimum vocabulary

| Input | Meaning |
|---|---|
| Wheel / trackpad / pinch / drag | Change scale along the inward–Home–outward axis |
| Tap / click / Enter on a network | Make that network the current subject |
| Home control | Return scale and subject to the visitor’s address |
| Copy control | Copy the visitor’s IP without changing state |
| Escape | Cancel a transient selection or return focus to the current subject; exact behavior to prototype |
| Arrow/Page keys | Move through discrete semantic states, not arbitrary pixels |

### Interaction rule

**Scale answers “how far am I?” Selection answers “what am I looking at?” Home answers “where did I begin?”**

### Do not lock native vertical scrolling yet

The conceptual axis is settled. Its physical implementation is not.

Opening a normal document in the middle of its scroll range creates browser-history, focus-order, screen-reader, keyboard, and restoration questions. Prototype at least these models before choosing:

1. A controlled full-viewport signed scale surface with semantic state transitions.
2. A native document that begins at Home and exposes inward/outward through explicit controls.
3. A hybrid: continuous gesture for pointer/touch users plus a linear semantic representation for keyboard and assistive technology.

The selected model must preserve predictable browser navigation and a complete non-gesture path.

## 5. Visual grammar

### One material, four truthful relationships

The experience should feel like one instrument, but it must not force unlike data into one fake geometry.

| Relationship | Visual job | Truth represented |
|---|---|---|
| **Containment** | Address inside announced prefix | The queried IP matches a routed prefix |
| **Collection** | Multiple prefix islands belonging to one ASN | One ASN originates multiple separate prefixes |
| **Adjacency** | Network nodes and observed connections | ASNs were observed beside one another in RIS paths |
| **Population** | Wide field of active ASNs | This subject is one member of a much larger set |

Use a consistent material system—light, density, line weight, motion behavior, typography—but allow the spatial rule to change when the relationship changes.

### The beauty requirement

The first frame must invite touch before the visitor reads an explanation. This cannot be proven in this document. It requires visual studies.

The visual system must also have a floor: unusual prefixes, missing names, a network with thousands of prefixes, a network with no returned neighbours, IPv6, a narrow phone, reduced motion, and an offline state must all look intentional.

### The horizon problem

The widest field is the largest unresolved visual decision.

The team must be able to answer:

> **Why is this ASN at this position?**

“The force layout placed it there” is insufficient unless the forces themselves encode a documented relationship and remain stable enough to learn. Random placement is explicitly rejected.

Prototype no more than three defensible constructions:

1. **Topology-derived:** Position follows observed network relationships. Evaluate stability, legibility, and computation cost.
2. **Registry-grouped:** Stable grouping by registry with deterministic ordering inside each group. Evaluate whether registry membership is meaningful enough at the widest scale.
3. **Deterministic numeric field:** Stable ASN order mapped into a space-filling layout. Evaluate honesty and whether it feels too catalog-like.

Choose using the following criteria: truthful rule, stable placement, understandable transitions, cheap rendering, usable hit testing, graceful density reduction, and beauty across the whole population.

This is a design spike, not a reason to block Home, O1, O2, or O3 prototypes.

### Motion

- Motion explains changes of scale or subject; it does not decorate idle time.
- Home return may retrace or collapse the path, but must be interruptible.
- Uncertainty may appear as incomplete, faint, or unresolved structure—never as a definitive line.
- Reduced motion uses direct state changes and considered still compositions.
- Nothing animates before the answer is usable.

## 6. Voice and microcopy

### Voice

Sparse, documentary, exact. State the observation and stop.

Prefer:

> `193.0.0.0/21 · announced by AS3333`  
> `Observed beside this network in BGP paths.`  
> `Median round trip to this edge: 24 ms.`

Avoid:

> `Your connection traveled across 7 networks!`  
> `24 ms away.`  
> `Your provider carries your traffic through these partners.`

The first invents a route, the second turns latency into physical distance, and the third claims a relationship the neighbour data does not establish.

### Copy rules

- Show actual values before interpretation.
- Say “browser-reported” where the browser may reduce or alter a value.
- Say “observed” where the data comes from routing observations.
- Date mutable population claims and datasets.
- Do not promise fields that some browsers will not expose.
- Do not use “anonymous,” “private,” “safe,” “untraceable,” or “nothing is stored” unless the full system makes the exact claim true.
- Do not anthropomorphize the network when plain language works.
- No exclamation marks in the product voice.

## 7. Data and technical outline

### House constraints

- Vanilla HTML, CSS, and JavaScript with **WebGL2** (raw, no library) and a
  **Canvas 2D fallback**. No framework, bundler, or build step.
  *Amended 2026-09-16, by the owner. The original line said Canvas 2D. It was
  changed because Canvas 2D cannot carry the light this document's own
  reference stills have: line width is capped at 1px and a bloom chain is not
  affordable. WebGL2 is a browser API, not a dependency — every other
  constraint on this list is unchanged. See `ip-render-research.md`.*
- One self-contained app folder: `index.html`, one CSS file, one JavaScript file, `README.md`, plus local `fonts/`, `lib/`, and `data/` directories only as needed.
- No parent-directory references and no CDN-hosted scripts, styles, or fonts.
- Self-hosted fonts include their licenses.
- Network-derived enrichment is keyless, CORS-compatible, cached where appropriate, optional, and allowed to fail quietly.
- Deployment remains a documented human-run action; the implementation ends with the handoff command rather than deploying itself.

### First response

The public IP must exist in the first HTML response or an equivalently immediate edge-generated response. Do not accept an empty shell that waits for browser JavaScript to fetch the address if an edge-generated minimal HTML response can safely embed it.

CloudFront Functions can generate an HTTP response and replace a response body, while their code size is constrained. The first technical spike should prove one of these patterns:

- A tiny edge-generated HTML shell containing the escaped IP and references to static CSS/JS assets.
- A static HTML response transformed at the edge only where needed.
- Another edge-only pattern that preserves first-response utility without Lambda cold starts.

The spike must test IPv4 and IPv6 formatting, HTML escaping, `Accept` negotiation for plaintext clients, cache behavior, security headers, and failure handling.

For non-HTML clients, return the address as plaintext and nothing else.

### Progressive data requests

| Trigger | Request | Purpose |
|---|---|---|
| Arrival | Own edge only | Deliver IP and static experience |
| Enter O1 | RIPEstat `network-info`; ASN/name lookup as needed | Prefix and origin network |
| Enter O2 | RIPEstat `announced-prefixes` | Prefix collection for current subject |
| Enter O3 | RIPEstat `asn-neighbours` | Observed adjacent networks |
| Enter O4 | Local/versioned dataset preferred | Active ASN population and stable layout inputs |
| Select new subject | Fetch/cache only missing subject data | Re-point the instrument |

### Data behavior

- Defer RIPEstat until the visitor chooses depth.
- Cache public routing data locally with a clear version/time policy; it is not personal history.
- Keep session exploration in memory by default. Do not persist the trail unless a later product decision explicitly justifies it.
- Treat missing, delayed, deprecated, uncertain, or contradictory responses as normal states.
- Never hold the primary interaction hostage to a slow neighbour response.
- Bound, sample, or aggregate very large prefix/neighbour collections without falsifying counts.
- Prefer a versioned local dataset for the all-networks view so its geometry is stable and the experience remains useful offline after first load.
- Check source attribution and licensing before including any third-party dataset in the product or saved image.

### Facts the current design may rely on

- RIPEstat `network-info` returns the containing prefix and announcing ASN(s) for a routed IP.
- `announced-prefixes` can provide prefixes announced by an ASN.
- `asn-neighbours` describes ASN neighbours observed in RIPE RIS paths; it is not a traceroute.
- Browser-exposed values vary, and some values such as `hardwareConcurrency` may be reduced by the browser.
- Browser characteristics can be combined for fingerprinting, but uniqueness requires a comparison population and is not claimed here.

Current reference documentation:

- [RIPEstat Network Info](https://stat.ripe.net/docs/data-api/api-endpoints/network-info)
- [RIPEstat ASN Neighbours](https://stat.ripe.net/docs/data-api/api-endpoints/asn-neighbours.html)
- [CloudFront Functions event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html)
- [Choosing between CloudFront Functions and Lambda@Edge](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html)
- [MDN: `hardwareConcurrency`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency)
- [MDN: Fingerprinting](https://developer.mozilla.org/en-US/docs/Glossary/Fingerprinting)
- [EFF: About browser fingerprinting](https://coveryourtracks.eff.org/about)

Re-verify API behavior, browser support, CORS, quotas, licensing, and costs during implementation.

## 8. Privacy contract

### Target posture

- No account.
- No ads.
- No third-party IP echo service.
- No IP history.
- No fingerprint or locally observed browser profile sent from the inward section.
- No product analytics that undermine the page’s stated privacy model.
- No cookies for product behavior.
- Optional public routing lookups begin only when the visitor enters the relevant outward state.

### Required pre-launch audit

Before final copy is approved, document:

- Every request generated during an arrive-copy-leave visit.
- Every request generated by each outward state.
- Which request headers the edge receives.
- Whether CDN, WAF, origin, deployment, error, or security logs retain IP addresses, and for how long.
- Whether saved images contain a full IP address by default and whether redaction is needed.
- Which local values are read, when, and whether any leave the device.

The final on-page wording is derived from this audit. It is not written from intention alone.

## 9. Accessibility and alternate representations

### Required behavior

- The IP and copy action are real semantic elements and are first in the useful focus order.
- Every network that can be selected by pointer can be selected by keyboard.
- Visible focus is clear without relying on a default rounded halo that conflicts with the visual language.
- Interactive hit areas are at least 44 × 44 CSS pixels even when the visible mark is tiny.
- Text contrast remains at least 4.5:1 against the worst background state.
- The experience works at approximately 320 CSS pixels without horizontal body scrolling.
- Safe-area insets are respected.
- Motion can be reduced without losing information or beauty.
- Color is never the only carrier of Home, current subject, visited state, uncertainty, or focus.

### Semantic companion

Canvas alone cannot be the experience model. Maintain a synchronized semantic representation containing:

- Current scale/state.
- Visitor’s address and copy action.
- Current subject name/ASN.
- Current prefix/count facts.
- Selectable neighbour list.
- Home action.
- Status messages for loading, unavailable data, and subject changes.

The semantic representation may be visually integrated or visually hidden where appropriate, but it must be usable, not a dump of thousands of nodes.

At the horizon, expose a bounded meaningful summary and navigation method rather than 80,000 focus targets.

## 10. Performance floor

### Target devices and conditions

Prototype and test on:

- A low-cost Android phone.
- A recent iPhone.
- A laptop using trackpad and keyboard only.
- A desktop with a mouse wheel.
- Slow or unavailable RIPEstat responses.
- Offline after the initial page has loaded.
- Reduced motion and increased text size.

### Performance rules

- The address is not delayed by visualization initialization.
- Interaction remains responsive while data is parsing or a subject is loading.
- Large collections are processed off the critical interaction path when possible.
- Density is reduced intentionally on constrained devices; meaning is preserved before quantity.
- Canvas resolution is capped sensibly on high-density screens.
- The system has explicit budgets for frame time, memory, dataset size, and first-response bytes before visual polish begins.

Exact budgets are an engineering deliverable from the prototype, not invented here.

## 11. Saved image

### Purpose

Create a personal artifact that can travel without adding social machinery to the product.

### Contents

- The canonical still composition of the current view.
- Current subject and the truthful relationship shown.
- Date and dataset date where relevant.
- Quiet series mark.
- Optional session trail if the visitor has wandered.
- IP address treatment chosen explicitly: full, partially redacted, or omitted.

### Open privacy decision

Do not assume a full public IP belongs in an image someone may post publicly. Prototype the museum plate with a partially redacted address by default and make full inclusion an explicit visitor choice if needed.

## 12. Build sequence

This is a sequence for reducing uncertainty, not a prescribed sprint plan.

### Prototype A — Home proves the tool

Build only:

- First-response IP delivery.
- Copy behavior.
- Plaintext response for non-HTML clients.
- Static/reduced-motion first frame.
- Keyboard, focus, small-screen, offline shell, and failure behavior.

**Exit condition:** The page is already preferable to an ad-filled IP lookup before any exploration exists.

### Prototype B — The first true revelation

Add:

- O1 announced prefix and named ASN.
- Transition from Home to O1.
- Loading and unavailable states.
- Ten-second comprehension test.

**Exit condition:** A visitor can accurately repeat one new fact: their address is announced inside this prefix by this named network.

### Prototype C — The map begins

Add:

- O2 prefix collection.
- O3 observed neighbours.
- Selection changes the subject.
- Home return.
- In-memory session trail.

**Exit condition:** A visitor can enter another real network, continue from it, understand that Home remains theirs, and return without instruction.

### Prototype D — The inward boundary

Add:

- I1 actual received values.
- I2 local-only observations.
- I3 fingerprint statement.
- I4 privacy boundary.
- Infrastructure/privacy audit and final copy alignment.

**Exit condition:** Test participants understand the difference between “reached the edge” and “stayed on this device,” and the ending leaves them informed rather than alarmed.

### Prototype E — The horizon

Test the three candidate population layouts, density strategies, transitions, and dataset packaging.

**Exit condition:** The team can explain every position, the visitor can find Home, the view remains beautiful on the performance floor, and the field invites entry rather than merely admiration.

### Prototype F — The artifact

Add the canonical still, museum plate, trail treatment, IP redaction choice, and image export.

**Exit condition:** The exported image remains truthful, legible, and desirable without exposing information the visitor did not knowingly choose to share.

## 13. Acceptance tests

### Four-second utility

- The correct address is present without a loading placeholder.
- Copy is obvious and works with pointer and keyboard.
- No optional content moves or obscures it.

### Ten-second truth

- After one intentional movement, a visitor can state one accurate new fact about their address or network.
- The fact is still correct when spoken without the visual.

### Three-year-old cause and effect

- Touching a visible object produces a clear response.
- Moving in scale makes the relationship visibly larger or smaller.
- Selecting an object makes it the new subject.
- Home reliably returns to the starting point.

No reading is required for the cause-and-effect layer.

### Wonder versus distraction

- Test participants can identify what the visible objects represent.
- The most memorable moments arise from real names, scale, containment, difference, or connection—not only from animation.
- Removing labels does not turn the form into unrelated decoration; the geometry still has a documented rule.

### Beauty before language

- The first frame invites inspection before explanatory copy is read.
- The reduced-motion frame is equally composed.
- Missing or extreme data does not collapse the art direction.

### Hundredth visit

- A returning visitor can copy and leave without dismissing, skipping, or waiting through anything.
- No novelty mechanism asks for attention.
- The interface does not depend on remembered tutorial instructions.

### One-hour possibility

- A visitor can move from one network to another recursively.
- Different subjects create visibly different truthful structures.
- The visitor’s trail and Home give long exploration shape without scoring it.
- At least some unprompted test sessions produce self-generated questions and continued wandering.

This is a possibility test, not a retention target. The product must never manufacture an hour.

### The floor

- IPv4 and IPv6 both have intentional Home and O1 treatments.
- No-name, no-prefix, no-neighbour, huge-network, offline, reduced-motion, narrow-screen, and low-power states have designed outcomes.
- The primary utility survives every optional-data failure.

## 14. Decisions needed during prototyping

These are the remaining gaps. They are bounded enough that work can begin.

| Decision | Owner(s) | Resolve by | Evidence required |
|---|---|---|---|
| Physical implementation of the signed axis | Interaction design + accessibility + engineering | Before Prototype C is finalized | Wheel, touch, keyboard, screen-reader, history/restoration tests |
| First-response edge pattern | Engineering | Prototype A | Measured response, cache correctness, IPv4/IPv6, security review |
| Home field’s visual material | Visual design | Prototype A/B | First-frame studies across device sizes and reduced motion |
| Prefix collection geometry | Visual design + data engineering | Prototype C | Extreme-ASN fixtures and comprehension testing |
| Horizon layout rule | Visual/data design + engineering | Prototype E | Rule explanation, stability, performance, transition studies |
| Neighbor uncertainty treatment | Content + visual/data design | Prototype C | API fixture review and user comprehension |
| Exact inward fields | Privacy + engineering + content | Prototype D | Cross-browser inventory and privacy audit |
| Saved-image IP redaction default | Product + privacy + design | Prototype F | Sharing scenarios and explicit-choice test |
| Whether search is ever needed | Product research | After recursive map testing | Evidence that wandering alone does or does not support intended exploration |

## 15. Prototype fixtures

Prepare deterministic fixtures before visual work so the design is tested against the floor rather than a lucky address:

- Documentation-reserved IPv4 address and ASN identifiers for mockups.
- IPv6 address with a normal routed prefix.
- Address with multiple announcing ASNs if supported by the data response.
- Small ASN with few prefixes and neighbours.
- Large ASN with thousands of prefixes.
- ASN with many observed neighbours.
- ASN with no usable neighbour response.
- Missing or ambiguous organization name.
- Slow response, malformed response, deprecated-call status, and full offline mode.
- Narrow phone, tall phone, landscape phone, ultrawide display, high zoom, and reduced motion.

No mockup should use a real private customer relationship as fictional content. Use reserved identifiers until live data is intentionally being tested.

## 16. Further-reading exits

The owner wants the experience to open a door beyond itself. These links belong at the relevant far edges or on the quiet provenance plate, not in the primary Home interface.

### Outward

- RIPEstat: inspect the underlying routing observations and look up another network.
- BGP-oriented reference tools: inspect announcements with their own terminology and caveats.
- A submarine-cable map: a separately labeled view of physical infrastructure, never presented as the geometry used in this experience.
- The defining IP standards, with IPv4 and IPv6 both represented rather than treating RFC 791 as the whole modern Internet.

### Inward

- Browser or operating-system privacy controls that can change exposed values.
- A plain explanation of why some protocol and browser information cannot simply be disabled while still making a web request.
- EFF or equivalent primary educational material on browser fingerprinting.

External destinations should be curated, stable, and sparse. They are the next door for a person who deliberately asks for more, not a link directory.

## 17. What changed from the parts list

The source material was deliberately a parts list. This narrative makes the following cuts and corrections explicitly:

| Source piece | Decision | Reason |
|---|---|---|
| Fixed six-stop outward ladder | Replaced with three semantic outward scales plus a population horizon | Prefix containment, ASN prefix membership, ASN adjacency, and population are different relationships; forcing them into one literal zoom would teach the wrong structure |
| `/24` street as a universal chapter | Demoted to an optional IPv4 texture | It does not generalize to IPv6 and is not necessarily the meaningful routed unit |
| “Networks carry your traffic onward” | Rewritten as “observed beside this network in BGP paths” | Neighbour data does not prove the route this visit took |
| “7 networks carried this here” | Removed unless a separate, honest measurement can support it | A browser cannot perform traceroute, and an AS path is not the visitor’s measured packet path |
| “24 ms away” | Rewritten as a median round trip to this edge | Latency is not physical distance |
| Promised OS/version/language fields | Replaced with actual observed values | Browser exposure varies and may be deliberately reduced |
| Dark-mode preference as request data | Placed in the local-observation section by default | It is locally observable; it is not necessarily part of the initial HTTP request |
| CPU cores and similar hardware claims | Labeled browser-reported | Browsers may reduce or alter exposed values |
| “All details usually identify you” | Rewritten as “can form a browser fingerprint” | Uniqueness cannot be claimed without a comparison population |
| Exact `~80,000` as timeless copy | Replaced with a dated dataset count | The population changes and the product should show its source date |
| One gesture as a finished mechanic | Preserved as a conceptual axis, left for interaction prototyping | Native mid-document scrolling may conflict with accessibility, focus, history, and restoration behavior |
| Global search | Deferred | Recursive relationship-following is the load-bearing exploration; add search only if research shows it is needed |
| Inward journey as an equal open-ended branch | Kept finite | Its meaning comes from reaching a truthful boundary, not from becoming a privacy encyclopedia |
| Saved image with full address | Redaction default left for explicit decision | A public IP may become more shareable than the visitor intended |

## 18. Team handoff summary

The team does not need another concept phase before beginning.

The load-bearing product decisions are settled:

- The answer is immediate.
- The address is Home.
- Outward is a recursive map made from real routing relationships.
- Inward is a finite inspection that ends at a calm boundary.
- Scale, selection, and return are the core interactions.
- The geometry must remain accountable to the data.
- The hour comes from agency and recursion, not from adding chapters.

The unresolved work is appropriate prototype work: the physical axis, the first visual material, extreme-data behavior, the widest-field geometry, exact privacy copy, and the saved-image redaction default.

The build should begin at Home and grow outward in proofs. At every stage, the current product must remain useful enough to ship even if the next layer never arrives.

That is the governing rule:

> **A perfect four-second IP tool, with a door behind the number.**
