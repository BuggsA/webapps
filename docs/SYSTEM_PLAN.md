# Plan: a bounded, parallel system for shipping small web apps

## What this is
A durable way to build many small, polished web apps -- name pickers,
IP checkers, a live traceroute globe, whatever comes next -- over the
course of a year, without re-architecting each time, without runaway
cost, and with real agent orchestration doing the building rather than
you relaying commands between two windows.

## Design philosophy
The point isn't just "fast utility." It's making ordinary things feel
a little more fun and a little more beautiful than they strictly need
to be -- a name picker that treats a name like it's worth a moment
instead of an instant answer, a traceroute that shows a signal
actually crossing the planet instead of a wall of hostnames. Simple
apps should still feel considered. Complex apps earn their complexity
because the payoff is worth it, not because more technology is more
impressive.

## Core decision: Claude Code subagents, not custom AWS orchestration
The AgentCore/Strands direction from earlier was the wrong tool for
this: it's a production hosting service for agents, with its own IAM
roles, containers, and a CLI that's admittedly mid-transition. That's
real infrastructure for running agents at scale in production. This
project is one person building small things over a year.

Claude Code already has what's actually needed, natively:
- **Subagents** -- isolated workers, each with restricted tool access,
  defined as plain markdown files in `.claude/agents/`
- **Worktrees** -- each subagent gets its own git checkout, so
  parallel builders never collide on the same files
- **Web search built in** -- no separate research pipeline to build

Using this instead of custom infrastructure is also the more durable
choice: it rides on a maintained product feature rather than something
only you are responsible for keeping working. Less to rot over a year.

## The bounded roles
Three subagent definitions (files below), each with deliberately
restricted tools:

- **builder** -- Read, Write, Edit, Bash. Works in its own worktree,
  inside one app's folder only. Can run in parallel with other
  builders on other app ideas. Never has AWS credentials available to
  it -- see the envelope section below for why that matters more than
  the instruction in its prompt.
- **researcher** -- WebSearch, WebFetch only. No file access at all.
  Looks up APIs, libraries, prior art, design inspiration; reports
  back; makes no decisions and touches no files.
- **deployer** -- Read, Bash. The only role ever run in a terminal
  session with real AWS credentials loaded. Checks the app actually
  works, notes anything that costs money, prepares the exact deploy
  command -- and stops. A person runs that command, on purpose, every
  time.

## How the envelope is actually enforced
Tool restrictions on a subagent are real and effective at the "which
capabilities does this role have" level -- a researcher literally
cannot write a file, because it wasn't given that tool. But "you have
Bash, please don't run `aws`" is guidance inside a prompt, not a wall.
Your reference document is explicit about this exact failure mode:
a boundary you can't independently check isn't a boundary, it's a
hope.

So the real enforcement is environmental, not instructional: run
builder and researcher subagents from a shell/profile that has no AWS
credentials configured at all. If they tried to run `aws` or `cdk`
anyway, it would simply fail to authenticate. Only the deployer role
runs in your one terminal that has `aws configure` credentials loaded.
This is the same idea as reversibility overriding confidence in the
original document, translated to solo scale: the step that can spend
money or touch real infrastructure is never something a bounded
subagent can do by itself, regardless of how well it's behaving.

## Mapping to the reference document
| Load-bearing idea | Home-scale version here |
|---|---|
| Risk and confidence, separate | Classify each app as Tier 1 or Tier 2 *before* building -- that classification is what decides which subagent role and how much oversight it gets, not a single vibe-based judgment call |
| Evidence, not just tests | The deployer role's job is specifically to check the app actually runs before it's allowed anywhere near real infrastructure |
| Autonomy as an envelope | Builder and researcher are structurally incapable of touching AWS (no credentials present); only deployer can, and only with you physically running the command |
| Comprehensibility, engineered | Builder writes a one-paragraph `README.md` per app: what it does, what it costs, how to remove it -- so app #30 is still legible a year from now |
| Reliability throttles change | If a recent auto-built app broke something, tighten the next few builds to require a manual look before deploy, same as the original document's error-budget idea, just judged by feel instead of a formal metric |

## Parallel building
Multiple independent app ideas can be handed to multiple builder
subagents at once -- each gets its own worktree, so there's no file
collision, and they finish in roughly the time of the slowest one
rather than stacking up sequentially. Good fit for: you've got three
small ideas queued and don't want to babysit them one at a time.

## Web lookup
The researcher role exists specifically for this -- "what's a good
free IP geolocation API," "is there a lightweight traceroute library
that doesn't need raw sockets," "show me clean minimal date-picker
designs." It reports findings back into the builder's task rather than
writing anything itself.

## Cost model
- **Building itself costs nothing extra.** Subagents run on your
  existing Claude Code usage -- there's no separate per-token AWS or
  API bill for the orchestration layer, unlike the AgentCore/Bedrock
  path from earlier.
- **Hosting is the one AWS cost**, and it's the same near-zero S3 +
  CloudFront setup from before, built once, shared by every app.
- **Tier 2 apps** may have their own small, per-use cost (a model call
  for a generated narrative, a geolocation API) -- that's a property of
  the specific app, not of the building system, and stays tiny at
  personal-use volume, same as everything costed out earlier today.

## The two tiers (unchanged from before)
**Tier 1 -- pure static, the default.** HTML/CSS/JS only, no backend.
**Tier 2 -- static plus one small function.** Only when an app
genuinely can't work client-side (a live traceroute; a per-name
generated narrative). Reuses the Lambda + Function URL pattern already
proven today -- no database, no shared state.

## Build order
1. **Hosting stack.** S3 + CloudFront via CDK, deployed once.
2. **Repo structure.** One repo, `apps/<name>/`, git-initialized from
   the first commit.
3. **Subagent definitions.** The three files below, in `.claude/agents/`.
4. **First real app through the whole pipeline** -- intent, builder,
   review, you deploy -- to prove the envelope actually holds before
   trusting it with more.
5. **Shared house style**, pulled from whatever the first app ends up
   looking like.
6. **Repeat**, adding builder subagents in parallel once you're
   comfortable with one at a time.

## Explicit non-goals
- AgentCore, Bedrock-hosted agent runtimes -- not needed for this
- A custom orchestration framework -- Claude Code's own subagents are
  the framework
- Automatic deploy without a human running the command -- deliberately
  never automated, on purpose, indefinitely
