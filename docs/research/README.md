# Competitive research

Research on other fantasy football assistants, kept here because it feeds Draft Copilot's
roadmap rather than because it documents this codebase.

## Contents

| File | What it is |
|---|---|
| `statsdeck-site-audit.md` | Full audit of statsdeck.ai — structure, messaging, UX, visual system, technical stack. 23 findings, each with evidence, source and a confidence rating. |
| `statsdeck-competitive-analysis.md` | 23-section product and competitive analysis of StatsDeck, written to inform a competing assistant's design. Includes a tool inventory, weekly-workflow evaluation, opportunity matrix and build-it-better section. |

Both captured **20 September 2026**.

## What StatsDeck is

A free, beta MCP connector for Claude — not a website with a dashboard. Four static marketing
pages, 22 tools, read-only against Sleeper / ESPN / Yahoo, all analysis delivered inside a chat
conversation. It computes under the user's exact league scoring and refuses DFS and betting
outright.

Relevant to us because it solves an overlapping problem from the opposite direction: it has no
UI of its own and answers only when asked, where Draft Copilot is a persistent panel that
watches state.

## How it was verified

Every one of the four public pages was read as raw HTML and rendered. All ten product
screenshots were transcribed at native resolution. **19 of 22 connector tools were exercised
live**, including a real 10-team ESPN PPR league connected and used to make every pick of a
full 16-round draft.

Claims are tagged `[Verified]`, `[Inferred]`, `[Analysis]` or `[Speculative]` throughout, so
the evidentiary weight of any given statement is visible. The competitive analysis went through
an adversarial fact-check pass that raised and resolved 184 issues, largely analysts asserting
capabilities the evidence didn't support.

## The finding that matters most for us

StatsDeck answers whatever it is asked, accurately, under the right scoring — and volunteers
nothing. During the live draft it never warned that 16 picks would elapse before the next turn,
never flagged that four starters shared a bye week, and never raised kicker or defense scarcity
as the rounds ran out. It holds the roster data to make all three observations.

It also has **no bye-week modelling at all** — nine ranking calls, zero bye fields, and its
recommendation had to be overridden on bye grounds four times.

Both gaps are things a persistent panel that already tracks roster state is well positioned to
close.

## Raw evidence

The capture archive — raw HTML, extracted text, all ten screenshots, screenshot transcriptions,
and live API responses — is **deliberately not committed**. It is ~2.2 MB of binary that would
live in history permanently, and it contains a third party's copyrighted page content and
product imagery.

It lives here instead:

```
C:\Users\itcod\OneDrive\research\statsdeck-2026-09-20\statsdeck-crawl-data.zip
```

OneDrive rather than the repo root deliberately — `git clean -xdf` removes ignored files, and
this is a dated snapshot of a site that will change. The reports' findings are pinned to *this*
capture; re-crawling later produces a different one. The date is in the folder name so a future
capture can sit beside it for comparison rather than overwrite it.

The reports cite specific files inside the archive by name — `extractions/live-league-probes.json`,
`extractions/showcase-extractions.jsonl`, `pages/index.html` and so on — so those references
resolve once it's unzipped. Its own `README.md` documents the capture method for each folder.

## Note on identifiers

These reports mention the ESPN league and team used for live verification. The repo's
`.gitignore` otherwise keeps league and roster identifiers out of version control, so if that
convention should apply here too, the references are easy to scrub — they appear only in the
coverage sections and findings 20–23 of the audit, and in the live-verification addendum of the
competitive analysis.
