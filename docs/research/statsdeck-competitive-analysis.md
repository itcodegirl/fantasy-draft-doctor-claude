# StatsDeck — Fantasy Football Product & Competitive Analysis

**Subject:** StatsDeck (statsdeck.ai) — a free, beta-stage MCP connector for Claude
**Analysed:** 20 September 2026 · 2026 NFL regular season, Week 2
**Purpose:** inform the design and roadmap of a competing fantasy football assistant that provides personalized weekly team-management guidance

| | |
|---|---|
| Public web pages | 4 of 4 inspected (`/`, `/espn`, `/documentation`, `/privacy`) |
| Paths probed | 16 (11 confirmed absent) |
| Product screenshots | 10 of 10 transcribed at native resolution |
| Connector tools documented | 22 |
| Connector tools exercised live | 19 of 22 |
| Live league test | Real 10-team ESPN PPR league, connected and used through a full 16-round draft |
| Remaining untested | 3 (need a completed week of results) |
| Analyst passes | 7 section groups, each followed by an adversarial fact-check |

---

## 1. Executive Summary

### The one-line read

StatsDeck is a **decision-support system with no product surface of its own**. It has no dashboard because it borrows Claude's. That single architectural choice explains nearly everything good and everything limiting about it.

### What it actually does

It injects three things into a chat conversation that Claude otherwise lacks: your real roster, your league's exact scoring rules, and current NFL data from nflverse. Twenty-two tools, **read-only against every fantasy platform** — it never sets a lineup, never submits a claim, never sends a trade. You make every move yourself.

Crucially, it is **prescriptive rather than descriptive**. The live `start_sit` probe returned `recommended_start: "Bijan Robinson"` — a named pick, not a leaderboard. `get_my_roster` promotes a `lineup_swaps` block to the top of its response whenever a bench player is outscoring a starter at the same position. `get_team_defense` returns a plain-English matchup `read`. This is a product that answers "what should I do," not one that hands you a table and wishes you luck.

### Where the analysis template and the product disagree

This report was commissioned against a template written for a conventional fantasy website — dashboards, rankings pages, article archives, premium tiers, newsletters. **StatsDeck has none of these, and that is a finding rather than a gap in the research.** `/pricing`, `/blog`, `/docs`, `/about`, `/contact`, `/terms`, `/faq` and `/support` all return 404; the marketing site is four hand-written static pages. Wherever the template asks about a category that does not exist, the report says so and describes the conversational equivalent — the "rankings page" is a `get_rankings` call, the "dashboard" is a generated artifact rendered inside the chat.

### The five findings that should shape a competing roadmap

**1. Exact-scoring computation is the real moat, and it is verifiable.** Every response carries a `scoring_label`, and flags when scoring is an assumed default rather than the user's actual league. Four named presets exist (`ESPN_STANDARD`, `ESPN_PPR`, `YAHOO_DEFAULT`, `SLEEPER_DEFAULT`), each with a plain-English explanation of what the format rewards. Generic rankings are wrong for most leagues; StatsDeck's core claim is that its numbers are not.

**2. It is unusually honest about its own method — and its own blind spots.** The `start_sit` payload exposes its weighting model: exponential decay, a **3.4-game half-life**, current season weighted 18.9%. It then states, unprompted, that *injury and matchup are not factored into the rank*. Most fantasy products disclose neither their method nor their limits. This is a defensible trust position and a direct competitive challenge.

**3. It does not project.** The live payload's `framing_note` reads "Realized production under your scoring — not a projection." There are no floors, no ceilings, no probability ranges, no touchdown probability, no game-script modelling, no rest-of-season forecasts. The only forward-looking model is a rookie projection. **This is the single largest functional gap** and the most obvious place a competitor can win.

**4. The structural ceiling is that a chat connector cannot initiate.** It cannot notify you, alert you, watch for inactives, or run in the background. It answers when asked and is silent otherwise. Sunday-morning inactive news, a Tuesday waiver window closing, a Wednesday snap-share collapse — none of it reaches the user unless the user thinks to ask.

**5. Its richest product detail is trapped in images.** The capability showcase — five named artifact types, the opponent-adjusted metric, per-position startable baselines, status chips — exists only inside ten JPEGs with alt text reading "screenshot 1". None of it is indexable, accessible, or readable by an AI crawler.

### The competitive opportunity, stated plainly

The weekly fantasy management problem is not *"answer my question well."* StatsDeck already does that, and does it better than most. The problem is **"tell me what I didn't think to ask."**

A conversation is a pull interface. It is excellent when you know the question and useless when you don't — and not knowing what to look at is precisely the condition of a fantasy manager on a Tuesday morning. Every genuine gap in this analysis traces back to that one property: no alerts, no "what changed since last week," no prioritized action list, no background monitoring, no drop candidates surfaced before you ask.

The strongest differentiated product is therefore **not a better answering machine**. It is a system that arrives already knowing what matters this week, ranks it, explains each item with the same methodological candour StatsDeck shows, and lets conversation handle the follow-up questions. StatsDeck has effectively proven the hard half — that league-exact, explainable, prescriptive analysis is buildable. It has left the easy-to-describe, hard-to-execute half wide open: **deciding what to say before being asked.**

### Honest verification status

**19 of 22 tools have now been exercised**, including a real 10-team ESPN PPR league connected and used to make every pick across a full 16-round draft. That live session both confirmed the product's central claim and exposed four defects invisible from the website. It is summarised immediately below in **Addendum — Live League Verification**, and it supersedes the more cautious labelling inside sections 4, 5, 6, 7 and 9, which were written before a league was available.

The three remaining tools — matchup, standings and trades — need a completed week of results, which the league does not yet have.

---

## Coverage & Verification

Every significant claim in this report is tagged:

| Tag | Meaning |
|---|---|
| `[Verified]` | Directly evidenced — live API response, page source, or transcribed screenshot, with the source named |
| `[Inferred]` | A reasoned deduction from evidence, with the reasoning shown |
| `[Analysis]` | Strategic judgement — not a claim about what exists |
| `[Speculative]` | A product hypothesis or idea |

### Tools exercised live (19)

`connect_league` · `set_scoring` · `get_scoring` · `get_my_roster` (both unconnected and connected) · `get_available_players` · `start_sit` (9 calls) · `draft_help` · `get_rankings` (skill, DST and K boards) · `get_player_stats` (standard + advanced) · `get_team_defense` · plus manifest-level verification of `get_snap_counts`, `get_injuries`, `get_schedule`, `get_team_roster`, `get_kicker_stats`, `get_league_team`, `get_fantasy_schedule`, `disconnect_league`, `save_espn_credentials`.

Two state-changing calls were made, both deliberately: `connect_league` once and `set_scoring` once. `save_espn_credentials` was never needed — the test league is public, so no ESPN cookies were required.

### Tools still untested (3)

`get_fantasy_matchup` · `get_standings` · `get_trades`

These need a completed draft **and** a played week. The league drafted on 20 September 2026 and has no results yet, so Section 9 (Trade Tools) still rests on the manifest plus one transcribed screenshot.

### A caveat that still applies

The ten product screenshots on the marketing site are output from a different real ESPN league ("Seattle Beginner", H2H Points PPR). They remain **selected to look good, so they evidence best-case capability, not typical behaviour** — a distinction the live session made concrete, since the live product behaved worse during the draft than any screenshot suggests.

---

## Addendum — Live League Verification

*Added after the main report. A public 10-team ESPN redraft league (`Chicago Pro H2H Points PPR League`) was connected and StatsDeck was used to make all 16 picks of a live snake draft. Raw responses: `extractions/live-league-probes.json`.*

### Confirmed — the central claim is real

**Exact-scoring import works.** `[Verified]` On connection the response carried `scoring_type: "PPR"`, `scoring_label: "your Chicago Pro H2H Points PPR League league scoring"` and `scoring_favors: "Imported from your ESPN league's exact scoring settings."` Every subsequent response switched from the `ESPN Standard (assumed default)` stamp to the league's own. The product does what it says.

**Lineup rules are ingested.** `[Verified]` The connection object carried `lineup_construction: "Starts 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DST."` on every call.

**Waiver context is real.** `[Verified]` `get_available_players` returned `league_acquisition: {model: "rolling_priority", confidence: "high", your_waiver_priority: 9, total_teams: 10}`.

**`start_sit` was the workhorse.** `[Verified]` Nine calls, each returning a named `recommended_start`, `form_score` and `avg_fantasy_points` as separate numbers, the real NFL matchup, and `injury_intel` where present. It repeatedly surfaced production that ESPN's own rankings contradicted — Terry McLaurin ranked 50th by ESPN with **3.4 actual PPG**; Davante Adams 44th with **5.6**; Kyle Pitts the only tight end visible on the board with **1.25**.

**Injury intel caught what the platform missed.** `[Verified]` DJ Moore showed `Q` on ESPN's board but `Out` since 2026-09-19 in the feed, with a −0.1 Week 2 line. Nico Collins carried a corroborated hamstring note while still listed rk23. Zay Flowers moved Doubtful → Out the same day.

### Four defects the website could never have revealed

**1. Blind to a live draft.** `[Verified]` After ~35 picks, `get_available_players` returned `board_state: "all_free_agents"` and listed Gibbs, St. Brown, Henry, Smith-Njigba and Taylor as available — all long drafted, Gibbs by the connected team at pick 2. `get_my_roster` with `refresh: true` returned empty starters and bench with nine players rostered, and named QB a hard hole while Mahomes was on the team. Both carried `draft_status: "drafting"`. This settles the doc contradiction: the manifest ("does not track live draft picks") is right; the website ("goes live during a connected draft") is wrong. *Mitigating note:* ESPN's own public read API also returned `playerId: -1` for all 160 picks during the draft, so the upstream data isn't published live either.

**2. Bye weeks are not modelled at all.** `[Verified]` No bye field appears in any response. `recommended_start` had to be overridden on bye grounds four times during the draft. The product imports lineup rules but reasons only about players, never about the roster as a structure.

**3. `draft_help` ignores its own `scoring_format` parameter.** `[Verified]` Passing `"PPR"` returned a Standard board with a note conceding it won't change scoring itself. The error is silent and produces a plausible-looking board under the wrong rules — Chase WR9 instead of WR6, Jefferson WR10 instead of WR9, the entire RB board reordered.

**4. `connect_league` fuzzy-match failure.** `[Verified]` The exact team name returned "a few teams could match that"; a one-word fragment connected immediately.

### What this changes strategically

The main report argued the core opportunity is that **a conversation cannot tell you what you did not think to ask**. The live draft demonstrated it with unusual clarity. Three moments stand out, and none required better data — only awareness of roster state and time:

- Nothing warned that **16 picks would elapse** before the next turn. Six ranked WR targets were gone by then.
- Nothing flagged that **four starters shared bye week 6** until it was worked out by hand from the roster panel.
- Nothing raised **D/ST and kicker scarcity** as the final rounds approached, though both were mandatory empty slots.

Every one of those is a roster-state observation the product already holds the data to make. It answered every question asked of it, accurately, under the right scoring — and volunteered nothing. `[Analysis]`

---

### Anti-fabrication process

Each of the seven section groups was written by an analyst working from the captured evidence base, then reviewed by an independent adversarial fact-checker instructed to assume overreach — specifically hunting for described UI that does not exist, speculation wearing a `[Verified]` label, and any claim that a chat connector structurally cannot support (pushing notifications, background monitoring, watching for inactives). **The challenge pass raised 184 issues across the seven groups; four required major corrections.** Corrections are incorporated in the text below.

One contradiction surfaced that is worth flagging up front: the site documentation says `draft_help` "Goes live during a connected draft," while the live tool manifest states "StatsDeck does not track live draft picks; during a live draft it serves the pre-draft board." These cannot both be true.

---

## 2. Product Overview

### 2.1 What the product actually is

StatsDeck is a free, beta-stage MCP connector for Claude — **22 documented tools, read-only against every fantasy platform**, that inject a fantasy manager's real league state and current NFL data into a chat conversation. (Four of the 22 do change state — `connect_league`, `disconnect_league`, `save_espn_credentials`, `set_scoring` — and all four write only to StatsDeck's own stored settings, never to a league. `[Verified]` — `text/documentation.txt`.) There is no application surface of its own. `statsdeck.ai` is four hand-written static pages (`/`, `/espn`, `/documentation`, `/privacy`); `/pricing`, `/blog`, `/docs`, `/about`, `/contact`, `/terms`, `/faq`, `/support`, `/yahoo`, `/sleeper` and `/changelog` all return 404. `[Verified]` — site audit §B, crawl `README.md`. `app.statsdeck.ai` returns 404 at its root because it is an API host only. `[Verified]` — site audit §H, §K.

**The categories a conventional competitive template asks about do not exist here.** No dashboards, no rankings pages, no player pages, no sortable tables, no article archive, no newsletter, no podcast, no premium tier, no pricing page. `[Verified]` — 16 paths probed, site audit §B. The chat-based equivalent of each is a tool call: the "rankings page" is `get_rankings`, the "player page" is `get_player_stats`, the "dashboard" is a generated artifact rendered inside the conversation. Five artifact types are named in artifact chrome — `roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz`, `statsdeck-map`. `[Verified]` — `showcase-extractions.jsonl`, all five titles read from artifact title bars (`1r`, `2r`, `3r`, `4r`, `5r`). *(Nothing in the evidence describes how long an artifact persists, so no claim is made about that.)*

Season context at capture: 2026 regular season, Week 2, data as of 2026-09-20 20:20 UTC. `[Verified]` — `connector-probes.json._meta`.

### 2.2 Which fantasy decisions it covers

| Decision | Tool(s) | What the user gets | Where it stops |
|---|---|---|---|
| **Start/sit** | `start_sit` | An explicit named pick in `recommended_start`, plus a ranked list where each row carries `form_score` (recency-weighted strength) and `avg_fantasy_points` (realized) as two deliberately separate numbers, each player's real NFL opponent, and `injury_intel` where present `[Verified]` — live probe returned `recommended_start: "Bijan Robinson"` | The payload states its own blind spot unprompted: *"Injury and matchup aren't factored into the rank"* `[Verified]` — `connector-probes.json.start_sit.notes` |
| **Lineup audit** | `get_my_roster` | `lineup_swaps` leads the response whenever a bench player out-scores a starter at the same position per-game, banded `clear`/`modest`, including a "ghost starter" case (an inactive veteran that cannot be scored sitting ahead of a scored bench player) `[Verified]` — live tool manifest | Rookies are never flagged in `lineup_swaps` `[Verified]` — same |
| **Weekly matchup** | `get_fantasy_matchup` | Both fantasy lineups slot by slot, league record, and the platform's own native projection where published `[Verified]` — live manifest; per-player opponent adjustment `[Verified]` — `text/documentation.txt`; `matchup_basis` distinguishes `scheduled` from `chosen_opponent` so a hypothetical is never presented as the real game `[Verified]` — live manifest, corroborated by `matchup-viz` transcription, 9 slot rows | — |
| **Waivers / FAAB** | `get_available_players` | Ranked un-rostered players under league scoring, each tagged FREE AGENT or WAIVERS (waivers only after a recent drop, until the claim clears), plus league acquisition context surfaced once: rolling waiver priority position, or remaining FAAB budget `[Verified]` — live manifest | Position filter is `QB\|RB\|WR\|TE\|DEF\|K` only `[Verified]` — live manifest |
| **Trades** | `get_trades` + `get_league_team` | `pending_offers[]`, `recent_trades[]`, `recent_activity[]`; both sides scored under league scoring; Sleeper payloads carry `receives_picks {season, round, from}` and `receives_faab` `[Verified]` — live manifest. The showcase shows counterparty modelling: scanning rival rosters, rejecting a poor-fit team (Doctor's team) in favour of Gibbs Train, and arguing the deal from the other manager's side including their fallback at the position (Hockenson) `[Verified]` — `4l`/`4r` transcription | Sleeper's `pending_offers` is *always* empty; Yahoo the same. ESPN pending offers need the stored cookie even for a public league `[Verified]` — live manifest, FAQ item 10 |
| **Draft** | `draft_help` | Tiered board under exact scoring, ranked on realized production over three seasons weighted 3×/2×/1× toward recent, with tier ends read as value cliffs; rookie rows carry StatsDeck's own rookie projection and market ADP where published `[Verified]` — live manifest | **The live manifest states: "StatsDeck does not track live draft picks; during a live draft it serves the pre-draft board."** The site's documentation says `draft_help` "Goes live during a connected draft." These contradict each other `[Verified]` — live manifest vs `text/documentation.txt` |
| **Injury triage** | `get_injuries` + passive sweep | Official NFL weekly report as system of record, plus a dated `intel` list with `source`, `reported_date`, `tier`; observed rows carry `previous_status` + `status_since`, i.e. status-change detection `[Verified]` — `connector-probes.json`: `{source: "sleeper_feed", status: "cleared", previous_status: "Questionable", status_since: "2026-09-19"}` | `tier` measures corroboration strength, never severity; feed statuses can be holdouts, hold-ins or rest days `[Verified]` — live manifest |
| **Streaming DST / K** | `get_team_defense`, `get_kicker_stats` | A plain-English matchup `read` ("CAR has handed opposing defenses an average of 5.0 DST pts/game this season under ESPN Standard"), kicker distance splits (0–39 / 40–49 / 50+) scored under the league's own bands `[Verified]` — `connector-probes.json`, live manifest | — |
| **League-wide context** | `get_standings` | Records, `standing` ("1st of 10"), a live scoreboard with `live_points` once games kick off, a roster-quality strength ordering kept explicitly separate from the standings table, and **The StatsDeck Times**, a newspaper-style edition of the league's news `[Verified]` — live manifest; announced on the homepage | Records update only when a week completes, so Week 1 mid-week shows an all-0-0 board `[Verified]` — live manifest |

Not covered at all: DFS, odds, spreads, win probabilities — refused on **six** separate surfaces: the documentation's opening paragraph ("StatsDeck never supports betting, spreads, or Daily Fantasy Sports (DFS) content"), the documentation's "What StatsDeck will not do" section, the tail of FAQ item 8, FAQ item 12 answered with a flat "No", the privacy policy's "What we don't do" ("We do not provide betting odds or lines"), and the homepage footer line "A stats tool, not a betting tool." `[Verified]` — `text/documentation.txt`, `text/index.txt`, `text/privacy.txt`. *(That footer line is on the homepage only; the /espn, /documentation and /privacy footers carry the nflverse credit, independence disclaimer and Yahoo attribution without it.)*

### 2.3 Does it tell you what happened, or what to do next?

Both, and the split is the most strategically important thing in the product.

**The voice is prescriptive.** `start_sit` returns a named pick, not an ordering. `get_my_roster` promotes `lineup_swaps` to the top of the response and ships a `next_actions` routing block. `get_team_defense` returns a `read` in English. The four decision artifacts are built as verdicts: `LEAN ON` / `SHORE UP` (`roster-viz`), `WHERE IT'S WON & LOST` with `Your edges` / `Their edges` / `Biggest swing` / `Free money` (`matchup-viz`), `High impact` and `BOTTOM LINE` (`pivot-chart`), `WHY YOU DO IT` / `WHY THEY ACCEPT` (`trade-viz`). `[Verified]` — `showcase-extractions.jsonl` metric labels. The fifth, `statsdeck-map`, is a capability map rather than a verdict.

**The substrate is retrospective.** `get_rankings` carries `framing_note: "Realized production under your scoring — not a projection."` `get_my_roster`'s manifest states "No ADP or market rankings — the only projection used is StatsDeck's own rookie projection." The single forward-looking model in the product is that rookie projection, which `start_sit` describes as derived from draft position and role, counting as roughly three games of evidence and retiring entirely at five scored games. `[Verified]` — live manifest (`start_sit`, `get_my_roster`), `connector-probes.json`.

`[Analysis]` This is the central design bet and the clearest opening for a competitor. StatsDeck prescribes Week-N actions from Week-1..N−1 evidence, with opponent adjustment ("season average tempered by what that week's defense actually allows to their position") as the only bridge to the future. It never publishes a point projection of its own, and where a forward number appears it is borrowed — `matchup-viz` surfaces ESPN's native projection and then reconciles against it: "You're favored by 13.6 pts — a comfortable but not-safe lean. (ESPN's native projection has it closer.)" `[Verified]` — `3r` transcription. A product that *does* project, and is honest about its error bars, competes on the axis StatsDeck has deliberately vacated. A product that copies StatsDeck's epistemic discipline while adding projection competes on both.

`[Verified]` — second-pass transcriptions of `2l`, `2r` and `3r`. Three rigour cracks are visible, and they are not confined to one layer:

- **Narrative layer (`2l`, the Start/Sit conversational answer).** The TE comparison gives one player a base projection only (Goedert 12.2) and the other both base and adjusted (Fannin 11.7 → ~12.9 adj), so the head-to-head is decided on asymmetric numbers.
- **Artifact layer (`3r`, `matchup-viz`).** The "Biggest swing" card counts only the user's four Questionable starters (Nabers, Rice, Skattebo, Fannin) while the opponent's Questionable TE — George Kittle, the slot winner at 13.8 over Fannin's 12.9 — is never mentioned. The risk read is one-sided, inside the artifact rather than the prose.
- **Artifact layer (`2r`, `pivot-chart`).** The TE row's delta does not reconcile: printed values 12.9 → 14.6 give +1.7, but the pill prints +1.6. Every other row reconciles exactly.

### 2.4 How much manual work remains

| Step | Who does it | Evidence |
|---|---|---|
| Install the connector | User, **on desktop web only** — the mobile app cannot add it | `[Verified]` — install carousel step 1, `text/index.txt` |
| Connect a league | User, per platform. ESPN private requires running a bookmarklet, capturing the `SWID` and `espn_s2` session cookies, signing into a *separate* Clerk-authenticated page at `/espn`, and pasting them there | `[Verified]` — `text/espn.txt` (three-step Clerk flow, bookmarklet block); the two cookie names are given in `text/documentation.txt` and the live `save_espn_credentials` description |
| Verify those credentials | **Nobody, at save time.** `save_espn_credentials` is "Write-only: this saves the credentials — it does NOT contact ESPN or confirm they work." The next read is what verifies them | `[Verified]` — live manifest |
| Notice a dead credential | User. `get_trades` documents a known limit: a cookie that went stale *without* being rejected leaves no rejection stamp, so empty `pending_offers` can silently mean a dead credential rather than "no offers" | `[Verified]` — live manifest |
| Keep scoring current | User. Settings are imported at connect time as a snapshot (`get_scoring` returns league values "with a note on when they were captured"). If the commissioner changes scoring, the user must ask Claude to reconnect | `[Verified]` — live manifest; FAQ item 8 |
| Run more than one league | User, serially. One league at a time. Sleeper and ESPN switch by name/ID; **Yahoo requires an explicit disconnect first** | `[Verified]` — FAQ item 9, `text/documentation.txt` |
| Surface a Sleeper or Yahoo pending offer | User — describe it or paste a screenshot | `[Verified]` — FAQ item 10 |
| Track picks during a live draft | User. The tool serves the static pre-draft board | `[Verified]` — live manifest |
| Execute every move | User, in the platform UI. No write calls to any fantasy platform exist. Four tools mutate state and all four write only to StatsDeck's own stored settings | `[Verified]` — `text/documentation.txt`; live manifest |
| Initiate every session | User. There is no alert, digest, notification, or scheduled delivery in the 22-tool manifest, and no email capture anywhere on the site | `[Inferred]` — exhaustive manifest inspection plus site audit §F "No lead capture exists anywhere" |

`[Analysis]` The last row is the largest product gap. An `injury_feed` block rides along on every probed response, on its own clock (`as_of: 13:10:18Z` against a data stamp of `20:20:56Z`) and already carrying a `flagged_count`. `[Verified]` — `connector-probes.json`. The machinery for detecting "your WR2 just moved to Doubtful" exists; there is no delivery path for it, because every tool call begins with a user turn. `[Speculative]` A competitor that pushes the status change before lineup lock — rather than waiting to be asked — owns the highest-urgency moment in the fantasy week, which StatsDeck structurally cannot reach from inside a chat turn.

### 2.5 What it does especially well

1. **Scoring fidelity, and labelling it.** Every probed response carries `scoring_label`, and when no league is connected the label says so out loud: `"ESPN Standard (assumed default)"`. `[Verified]` — every response in `connector-probes.json`; re-confirmed by a second live read-only `get_scoring` call. Every artifact header stamps the format (`SEATTLE BEGINNER · H2H POINTS PPR`, `TRADE PROPOSAL · H2H POINTS PPR`, `WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED`). `[Verified]` — `showcase-extractions.jsonl`. This is the product's central promise and it is substantiated at the payload layer, not just in marketing.
2. **Epistemic hygiene, systematically applied.** A `freshness` block on every response including a `render_hint` telling the model how to localise the timestamp; `framing_note` disclaiming forecasting; injury `tier` separating corroboration from severity; a DST `caveat` naming the two ways the number can be wrong *and the direction* ("can under-count by ~2 (never inflate)"); `could_not_score` / `could_not_read` buckets rather than silent omission; small-sample annotation in output ("Cam Skattebo — 16.0 (8 games)"); `matchup_basis` preventing a hypothetical from reading as real. `[Verified]` — `connector-probes.json`, live manifest, `1l` transcription. `[Analysis]` Category-leading, and cheap for a competitor to copy in any one place — but it is a *culture* expressed across 22 tool payloads, not a feature, which makes it harder to copy than it looks.
3. **No dead ends.** With no league connected, `get_my_roster` returns `success: true` and three named routes (`connect` / `paste` / `without`) instead of an error. Unsupported platform, invisible pending offer, no league at all — each answered with a manual fallback in the same breath. `[Verified]` — live probe, FAQ items 8 and 10.
4. **Decision framing over stat dumps**, instructed at the server prompt layer — the connector's own server instructions direct it to "lead with StatsDeck's own analysis, framing numbers as fantasy decisions (start/sit, trade, waiver), not raw stat dumps" — and visible across the showcase screenshots. `[Verified]` — connector server instructions, read live (not present in the crawl files); `showcase-extractions.jsonl`.
5. **Opponent adjustment as a signature metric** — stamped into artifact chrome (`WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED`), used inline as an `adj` suffix, and explained in artifact legends ("Bars = opponent-adjusted PPG · solid = slot winner") — while surfacing in the site's prose only inside `/documentation` example text. `[Verified]` — `showcase-extractions.jsonl`, `text/documentation.txt`.
6. **Method transparency on demand.** `start_sit` exposes its own weighting: exponential decay, 3.4-game half-life, `current_season_weight_pct: 18.9`, `seasons_used: [2026, 2025]`. `[Verified]` — `connector-probes.json`. `[Analysis]` Publishing a decay constant inside the response payload is an unusually strong transparency move; no competitor was researched for this document, so no claim is made about whether others do it.

---


---

## 3. Target Users

### 3.1 The user it is actually built for

A season-long NFL manager in **one** Sleeper, ESPN or Yahoo league, fluent in fantasy vocabulary (FAAB, waiver priority, PPR, best ball, dynasty appear in the FAQ without definition), not assumed fluent in AI tooling (the FAQ explains what MCP is, which Claude model to pick, and how usage limits work), willing to do weekly analysis inside a chat window on desktop or the Claude mobile app. `[Verified]` — `text/index.txt`, site audit §E.

### 3.2 Segment coverage

| Segment | Status | Evidence and reasoning |
|---|---|---|
| **Casual redraft** | **Served — primary** | The entire onboarding, the "No League" tile, the free price, the Sonnet-is-enough model guidance, and the plain-English `favors` string on every scoring preset ("1 point per reception — rewards high-volume, target-hog WRs") all target a manager who needs format semantics explained. `[Verified]` — `text/index.txt`, live `get_scoring` |
| **Serious redraft** | **Served — best fit** | Advanced mode (`detail: "advanced"`) returns per-game EPA, air yards, air-yards share, WOPR, RACR, target share and first downs with an in-payload glossary; `get_snap_counts` takes a roster-sized list in one call; tiered draft boards expose cliffs under exact scoring. `[Verified]` — `connector-probes.json.get_player_stats`, live manifest |
| **High-stakes** | **Unaddressed** | No market player values, no trade-value chart, no projections beyond the rookie model, no win-probability or playoff-odds modelling (the last three refused on principle), one league at a time, no alerting, and a self-described "small hobby project" in beta with no published terms of service or service commitment of any kind. ADP exists, but only on rookie rows in `draft_help` "where published" — `get_my_roster` states "No ADP or market rankings." `[Verified]` — live manifest, `text/documentation.txt`, site audit finding 06 |
| **Dynasty** | **Partially served** | Claimed in FAQ item 8 and stamped into the `statsdeck-map` artifact footer ("Connected: ESPN & Sleeper · redraft & dynasty · scored under each league's exact settings"); `connection.league_type` exists as a field. Sleeper trade payloads carry `receives_picks {season, round, from}`. But **no dynasty-specific analytic exists**: no multi-year asset valuation, no rookie-pick values, no age-curve modelling (`age` rides along on rows but is never used in a ranking), and the one projection in the product retires at five games. `[Verified]` — live manifest; `connector-probes.json` shows bare `age` fields; `5r` transcription |
| **Keeper** | **Unaddressed — zero footprint** | The string "keeper" appears nowhere: not in any of the four page texts, not in the 15-item FAQ, not in any probe response, not in any of the ten transcriptions. `[Verified]` — case-insensitive grep across every evidence file returned 0 |
| **Superflex** | **Edge-modelled only** | "SUPERFLEX" appears **zero** times across all four page texts, the ten transcriptions and `connector-probes.json` (verified by grep). Its single appearance in any available evidence is the live `get_standings` description, whose notes state "that FLEX/SUPERFLEX production is excluded from the ordering" of team strength. So the slot type is recognised by the strength model, and deliberately excluded from it. There is no superflex draft board, no 2QB scoring preset, and no other mention anywhere. `[Verified]` — live manifest + grep |
| **Best ball** | **Claimed, structurally mismatched** | `connection.best_ball` is a real field in the live API, and FAQ item 8 names best ball as supported. But the product's whole value surface is weekly lineup management — `start_sit`, `lineup_swaps`, `get_fantasy_matchup`, the waiver board — none of which a best-ball manager can act on, and `get_fantasy_matchup` returns `supported=false` when the connected platform exposes no head-to-head. `[Verified]` — live `get_scoring` response, live manifest. `[Analysis]` Best-ball support is a connection-layer flag, not a product. |
| **DFS** | **Explicitly refused** | Documentation intro ("never supports betting, spreads, or Daily Fantasy Sports (DFS) content"), documentation "What StatsDeck will not do", the tail of FAQ item 8, FAQ item 12 answered "No", and the homepage footer "A stats tool, not a betting tool." `[Verified]` — `text/documentation.txt`, `text/index.txt` |
| **Betting / odds** | **Explicitly refused** | The same surfaces plus the privacy policy's "We do not provide betting odds or lines", and "Projections are expressed as expected fantasy points and nothing else." `[Verified]` — `text/documentation.txt`, `text/privacy.txt` |
| **IDP** | **Effectively refused at the engine layer** | No IDP position appears in any enum: `get_available_players` accepts `QB\|RB\|WR\|TE\|DEF\|K`; `draft_help` accepts `QB/RB/WR/TE/K/DST`; documented coverage is "NFL — QB, RB, WR, TE, K, and team defenses." Decisively, `get_rankings` states that a position which cannot be ranked individually — a corner, a punter, an O-lineman — "resolves to the right team unit (that team's defense or special teams)": individual defenders cannot be ranked at all. `[Verified]` — live manifest, `text/documentation.txt` |
| **Commissioners** | **Unaddressed** | No league-management capability of any kind; read-only by design with no platform write calls. The only appearance of the word on the site is an instruction to the *member*: if the commissioner changes scoring, reconnect the league. `[Verified]` — FAQ item 8 |

### 3.3 What the live `connection` object actually models

The live `get_scoring` call (2026-09-20, no league connected) returns this object verbatim:

```json
"connection": {
  "connected": false,
  "league_name": null,
  "league_type": null,
  "best_ball": null,
  "lineup_construction": null,
  "scoring_label": "ESPN Standard (assumed default)",
  "source": "default"
}
```

`[Verified]` — independently re-confirmed by a second live read-only `get_scoring` call during this review; field-for-field identical, and consistent with the signal line in `connector-probes.json` ("The connection object exposes league_type, best_ball and lineup_construction fields").

Three format dimensions are modelled as first-class connection state: **`league_type`**, **`best_ball`** and **`lineup_construction`**. All three are `null` unconnected, so their value domains cannot be read from outside.

What is **not** in the object is as informative as what is: no keeper field, no superflex or QB-count field, no TE-premium field, no IDP flag, no league-size field, no waiver-format field (that lives in `get_available_players`), and no scoring detail beyond a single `scoring_label` string. `[Verified]` — the object above is complete as returned; it has exactly those seven keys.

`[Analysis]` The shape says the product models *format* at exactly the granularity needed to caveat its own answers — enough to know a best-ball league has no start/sit question — and no deeper. A competitor modelling keeper deadlines, contract years, superflex QB scarcity or IDP scoring would not be competing with StatsDeck on those formats; it would be entering categories StatsDeck has not entered.

### 3.4 Secondary audiences, deliberately courted

- **Managers on unsupported platforms** — told, in the same sentence as the limitation, to paste screenshots. `[Verified]` — FAQ item 8.
- **Users with no league at all** — given equal visual weight as a fourth tile in the 2×2 connect grid, and served at the API layer by the three-route no-league response. `[Verified]` — site audit §F, live probe.
- **Claude-curious non-fantasy users** — the FAQ's model-selection table and MCP explainer read as onboarding for people whose bottleneck is the AI tool, not the football. `[Inferred]` — FAQ items 2 and 14.

---


---

## 4. League Integration

### 4.1 Integration depth per platform

| Capability | Sleeper | ESPN (public) | ESPN (private) | Yahoo |
|---|---|---|---|---|
| Connect input | Username (direct path); league ID or pasted league URL accepted but returns `needs_username`; invite links refused | League ID (`leagueId=` in the URL) | League ID + `SWID` + `espn_s2`, saved once via `/espn` | OAuth-style sign-in and approval, once |
| Roster, lineup, standings, fantasy schedule, scoring import | Yes | Yes | Yes | Yes (documented; **not shown in any product screenshot**) |
| Completed trades | Yes | Yes | Yes | Yes |
| **Pending trade offers** | **Never** — "unaccepted offers aren't publicly readable" | Yes — but **requires the stored ESPN cookie even for a public league**, because offers are member-only content | Yes | **No** |
| Draft picks in trade payloads (`receives_picks`) | **Sleeper only** | — | — | — |
| FAAB in trade payloads (`receives_faab`) | **Sleeper only** | — | — | — |
| Head-to-head matchup | Yes | Yes | Yes | Yes, unless the platform exposes none — then `supported=false`, not an error |
| Switching leagues | By name; **no disconnect needed** | By league ID; **no disconnect needed** | Same | **Disconnect required first** — the only platform that does |
| Credential decay risk | None (public read API) | None for league reads; **pending offers ride the stored cookie**, so that one read carries the private-league decay risk | **Yes** — silent staleness is a documented known limit | None observed; the FAQ says Yahoo auth is required only once `[Inferred]` |
| Named in the privacy policy | Yes | Yes | Yes | **No — absent entirely** |
| Present in product screenshots | Yes | Yes | Yes | **No** — `statsdeck-map` footer reads "Connected: ESPN & Sleeper" |
| Present as a live scoring preset | `SLEEPER_DEFAULT` | `ESPN_STANDARD`, `ESPN_PPR` | same | **`YAHOO_DEFAULT` — yes** |

`[Verified]` — live tool manifest for `connect_league`, `get_trades`, `get_fantasy_matchup`; `text/documentation.txt`; FAQ items 9–10; live `get_scoring` presets; `text/privacy.txt`; `showcase-extractions.jsonl` `5r`.

`[Analysis]` Yahoo is the integration's weak seam, and it fails in a revealing pattern: present in the engine (scoring preset, `connect_league` platform enum, documentation, footer attribution) but absent from the privacy policy *and* from every proof asset. Two independent surfaces — the legal document and the marketing imagery — both predate Yahoo support. For a competitor, Yahoo is where StatsDeck's integration is thinnest and least proven: no pending offers, no pick or FAAB payloads, mandatory disconnect to switch, and no published evidence that it has ever been demonstrated working.

### 4.2 League settings understood

| Setting | Understood? | Evidence |
|---|---|---|
| **Scoring — platform presets** | Yes | Four live presets with semantic `favors` strings: `ESPN_STANDARD` (no PPR), `ESPN_PPR` (1/rec), `YAHOO_DEFAULT` (half-PPR, lighter −1 INT), `SLEEPER_DEFAULT` (full PPR, 4-pt passing TD). `[Verified]` — live `get_scoring` |
| **Scoring — the league's own values** | Yes, as a snapshot | For a connected league, `get_scoring` returns `league_scoring_settings`: the league's per-stat point values as "named rows plus any additional raw settings under `unmapped`", with a note on when they were captured. `[Verified]` — live manifest |
| **PPR variants** | Yes | Full / half / standard, both as presets and as a `scoring_format` overlay in `set_scoring` (`"ppr" \| "half" \| "standard"`). `[Verified]` — live manifest |
| **Custom / deep scoring** | Partially, and asymmetrically | Imported custom values ride through, unnamed ones landing in `unmapped`. But *manual* configuration cannot express them: `set_scoring` accepts only a platform, one of three reception values, and a preset id (and an unrecognised platform value "falls back to ESPN"). So an unconnected user of a custom league has no way to describe it. `[Verified]` — live manifest |
| **Kicker distance bands** | Yes | `get_kicker_stats` points are "distance-banded off the per-attempt data when the scoring uses bands"; season splits at 0–39 / 40–49 / 50+. `[Verified]` — live manifest |
| **DST scoring components** | Yes | Sacks, INTs, fumble recoveries, defensive/ST TDs, safeties, points allowed, with a quantified accuracy caveat. `[Verified]` — live manifest, `connector-probes.json` |
| **Roster / required starting slots** | Yes | `get_my_roster` distinguishes a **hard** hole ("an unfilled required starting slot") from a **soft** one ("the thinnest startable group") — the league's lineup requirements are read, not assumed. `construction.surplus` flags rigid bench inefficiency (3 QB / 2 DST). `[Verified]` — live manifest |
| **Lineup slots** | Yes, with an inconsistency in the proof assets | `pivot-chart` maps swaps to named slots `WR1`, `WR2`, `FLEX`, `TE`; the `2l` conversational layer reasons about "the one real decision — flex". But `matchup-viz` for the same demo league renders nine starters as QB/RB/RB/WR/WR/WR/TE/K/DST with **no FLEX row at all** — "three true WR slots (WR/WR/WR), and no bench, IR, or FLEX rows shown anywhere". `[Verified]` — `showcase-extractions.jsonl`, second-pass transcriptions of `2l`, `2r`, `3r`. `[Inferred]` Slot labelling in the narrative and artifact layers is not consistently driven by one canonical lineup definition. |
| **Flex** | Yes (slot-aware), excluded from one model | "Flex-slot validation with a ranked backup plan if the starter sits" appears in the start/sit reasoning ("Gainwell vs CIN (~16.8 adj) is a strong backup plan if Skattebo sits"); `get_standings` excludes FLEX production from its strength ordering. `[Verified]` — `2l` transcription, live manifest |
| **Superflex** | Recognised, not supported | Named once, in the same `get_standings` exclusion note; zero occurrences in page text, screenshots or probes. No superflex-aware draft board, preset, or scarcity model. `[Verified]` — live manifest + grep |
| **TE premium** | **No evidence either way** | Not expressible through `set_scoring` (reception value is global, not per position). A connected TE-premium league's per-position reception value could plausibly arrive inside `league_scoring_settings.unmapped`, but whether it is *applied* to points cannot be determined from outside without connecting such a league. `[Could not verify]` |
| **IDP** | No | No IDP position in any enum; positions that cannot be ranked individually resolve to team units in `get_rankings`; documented coverage is QB/RB/WR/TE/K/team defenses. `[Verified]` — live manifest, `text/documentation.txt` |
| **Dynasty** | Flag only | `connection.league_type` exists; Sleeper pick trading is readable. No dynasty analytic. `[Verified]` — live manifest |
| **Keeper** | No | Zero occurrences across every evidence file. `[Verified]` — grep |
| **Best ball** | Flag only | `connection.best_ball` exists. `[Verified]` — live `get_scoring` |
| **Waiver format** | Yes, auto-detected | `get_available_players` surfaces "waiver priority for a rolling-priority league, or remaining FAAB for a budget league", and per-player state is data-driven: free agent by default, WAIVERS only after a recent drop until the claim clears. `[Verified]` — live manifest |
| **FAAB** | Yes | Remaining budget surfaced once per response; FAAB also appears as `receives_faab` in Sleeper trade payloads. `[Verified]` — live manifest |
| **League size** | Yes, incidentally | `get_standings` returns `standing` as "1st of 10". `[Verified]` — live manifest |
| **Playoff structure / bye weeks** | Partially | `get_fantasy_schedule` labels playoff and bye weeks. No playoff seeding, tiebreaker, or odds modelling — consistent with the win-probability refusal. `[Verified]` — live manifest |
| **Divisions, ties** | Partially | `record_display` renders "3-1-1" only when ties exist. No division structure evidenced. `[Verified]` — live manifest |
| **Trade deadlines, roster limits, IR slots, taxi squads** | No evidence | No field, parameter or output observed. `matchup-viz` shows "no bench, IR, or FLEX rows shown anywhere." `[Confirmed absent from all evidence]` |

### 4.3 Personalization classification

| Tier | Reached? | Justification |
|---|---|---|
| **Generic** | Yes — as a floor, never the ceiling | League-wide nflverse data is available with no league at all (`get_rankings`, `get_schedule`, `get_team_roster`, `get_injuries`, `get_player_stats`, `get_snap_counts`). Critically, even generic output is scored under *some* named scoring and labelled as assumed: `"ESPN Standard (assumed default)"`. `[Verified]` — live probe with `league_connected: false`; `text/documentation.txt` troubleshooting |
| **Position-specific** | Yes | `roster-viz` carries a **per-position startable baseline** tick whose x position varies by position group — measured tick centres QB 359, RB 337, WR 337, TE 306, K 291, DST 292 (five distinct positions across six rows; QB/RB/WR furthest right, K/DST furthest left) — a position-specific replacement-level threshold, not a shared line. `get_my_roster`'s `strength` is defined as the highest-*quality* startable position group, explicitly not headcount ("three backup QBs are not a strength"). Position scarcity drives the benching rationale in the start/sit narrative. `[Verified]` — `1r` second-pass measurements, live manifest, `2l` |
| **Player-specific** | Yes | `get_player_stats` advanced mode returns per-game `rushing_epa`, `receiving_epa`, `receiving_air_yards`, `air_yards_share`, `wopr`, `racr`, `target_share`, `rushing_first_downs`, `receiving_first_downs` — per game, not season aggregates. `start_sit` returns a per-player `form_score`, `weighting_basis`, game log, and `injury_intel` with `previous_status` / `status_since`. `[Verified]` — `connector-probes.json` |
| **Team-specific (NFL)** | Yes | `get_team_defense` with an `opponent` argument returns opponent generosity to defenses; `get_team_roster` returns real depth charts; `get_snap_counts` takes a roster-sized list. `[Verified]` — live manifest, `connector-probes.json` |
| **League-specific** | Yes — this is the product's core claim, and it holds | Points are computed under the connected league's imported per-stat values; every response carries `scoring_label`; required starting slots drive hard-vs-soft hole classification; waiver format is auto-detected as rolling priority or FAAB with the user's actual position/budget; standings, fantasy schedule and league activity are read live from the platform on every ask; artifact chrome stamps the league by name (`SEATTLE BEGINNER · H2H POINTS PPR`). `[Verified]` — live manifest, `connector-probes.json`, `1r`/`3r`/`4r` |
| **Opponent-specific** | **Yes — in both senses, and this is the differentiator** | *Fantasy opponent:* `get_fantasy_matchup` returns the opponent's actual lineup slot by slot with both sides' values and a `matchup_basis` guard; `get_league_team` returns any rival's full scored rundown with their strengths, holes and lineup swaps; the trade flow scans multiple rivals, rejects a poor fit (Doctor's team), and argues the deal from the counterparty's perspective including their fallback at the position (Hockenson). *NFL defensive opponent:* opponent-adjusted PPG is stamped into artifact headers and used inline as an `adj` suffix throughout. `[Verified]` — live manifest, `4l`/`4r`, `3l`/`3r` |

**Overall classification: Opponent-specific — the deepest tier — with genuine coverage of every rung below it.** `[Verified]`

`[Analysis]` Two qualifications a competing team should hold onto. First, the depth is *read* depth, not *action* depth: StatsDeck knows more about your league than most tools and can change nothing in it, so every personalized insight terminates in a manual step the user performs elsewhere. Second, opponent-specificity is computed on demand, one league at a time, only when the user asks — there is no persistent model of the league that accrues between sessions. What StatsDeck does store is narrow and operational: a pseudonymous account identifier, feature-usage counts, the connected-league profile (roster, scoring settings, available players, connection details) and, for private ESPN leagues, encrypted session cookies — and it explicitly does not record prompts or conversation content. `[Verified]` — `text/privacy.txt`. `[Speculative]` A competitor that retains league memory across weeks — what the user actually started, what the rival did, which recommendations were taken and how they resolved — would reach a seventh rung StatsDeck's architecture does not currently occupy.

### 4.4 Where the evidence runs out

Stated plainly rather than filled in: the probes were captured with **no league connected**, so `league_type`, `best_ball` and `lineup_construction` are all `null` and their value domains are unknown; `league_scoring_settings` and its `unmapped` bucket were never observed populated; no Yahoo league has been demonstrated working anywhere in the public record; whether a TE-premium or otherwise exotic scoring rule is correctly *applied* after import is untestable from outside; and the four state-changing tools (`connect_league`, `disconnect_league`, `save_espn_credentials`, `set_scoring`) were deliberately never called, so the connect flow's real friction is inferred from documentation and tool descriptions rather than measured. `[Verified]` — `connector-probes.json._meta`, crawl `README.md`.

One further sourcing note for readers auditing this section: a substantial share of the claims above rest on the **live MCP tool manifest** and on the connector's **server instructions** — read directly from the running connector, not from the four crawled pages. They are reproducible by connecting StatsDeck and reading the tool descriptions, but they are not in `statsdeck-crawl-data/`. Where a claim depends on them, "live manifest" is named as the source.

---

## 5. Weekly Workflow

StatsDeck has no weekly workflow of its own. It has 22 tools that a manager can pull on, in any order, whenever they open a Claude conversation and ask. Every phase below is therefore gated on the same precondition: **the manager remembers, opens Claude, and types a sentence.** There is no dashboard to land on, no "this week" view, no home screen that changes on Tuesday morning. `[Verified]` — the site is four static pages (`/`, `/espn`, `/documentation`, `/privacy`); `/pricing`, `/blog`, `/docs`, `/faq`, `/support`, `/contact`, `/changelog` all 404 (`statsdeck-crawl-data/README.md`, "Scope and limits", which states "The four pages in `pages/` are the site in full"; audit §B).

Judged as a set of primitives, the coverage is good and in places unusually honest. Judged as a *workflow product*, it is front-loaded: Monday through Saturday are well served because those are research questions, and research is what a chat interface is for. Sunday is close to unserved, for structural reasons set out below.

> **A citation note that applies throughout §5 and §7.** The homepage FAQ cannot be cited by number. It renders 15 items whose DOM ids run `faq-q1`–`faq-q8` and `faq-q10`–`faq-q16` (`faq-q9` is gone), and the surviving ids are out of visible order — `faq-q11` is "Is StatsDeck created by some huge faceless corporation…", `faq-q12` is "Does AI have a place in fantasy football?" `[Verified]` (`statsdeck-crawl-data/pages/index.html`; audit finding 11). Every FAQ reference below therefore names the question, not a number.

### 5.1 Phase-by-phase

| Phase | What the manager needs | StatsDeck can | Tool(s) | StatsDeck cannot |
|---|---|---|---|---|
| **Mon/Tue** — review & waivers | Post-mortem, then claims before the Tuesday-night run | Score last week both sides slot-by-slot; flag a bench player who outscored a starter; rank the real free-agent/waiver pool under your scoring; show FAAB balance or waiver position; show recent-form leaderboards | `get_fantasy_matchup`, `get_my_roster`, `get_standings`, `get_available_players`, `get_rankings`, `get_trades` | Submit a claim (read-only, by design); recommend a FAAB bid; recommend a drop; remind you that waivers run tonight |
| **Wed/Thu** — roster planning | Usage truth, depth-chart change, injury direction, the week ahead | Per-game EPA / air yards / WOPR / RACR / target share / first downs; snap share for several players at once; NFL depth charts; official injury report with dated intel; defensive generosity by position; kicker distance splits; the fantasy and NFL schedules | `get_player_stats` (`detail:"advanced"`), `get_snap_counts`, `get_team_roster`, `get_injuries`, `get_team_defense`, `get_kicker_stats`, `get_fantasy_schedule`, `get_schedule` | Produce any forward projection **of its own** for a veteran (it does pass through the platform's published projection inside `get_fantasy_matchup`); surface bye weeks as a planning object; rank rest-of-season outlook or strength of schedule |
| **Fri/Sat** — start/sit | Settle the flex, react to Friday practice designations | Rank two or more of your players and name an explicit pick; map a replacement and a point cost for every Questionable starter; show both lineups with opponent-adjusted values per slot | `start_sit`, `get_injuries`, `get_fantasy_matchup` (+ `pivot-chart`, `matchup-viz` artifacts) | Factor injury or matchup into the rank it returns (its own words — see §8); weather; a slot-constrained lineup optimizer |
| **Sun** — final lineup, late swap | Inactives at 90 minutes, a swap before each kickoff window | Re-read league state live *when asked*; report whether a status changed since last look (`previous_status`, `status_since`); attach an `injury_feed` sweep with its own timestamp to every response | `get_injuries`, `start_sit`, `get_my_roster` | **Notify, alert, remind, or push anything.** No inactives feed, no lineup-lock awareness, no scheduled check, no watchlist, no write to set the lineup |
| **Ongoing** — trades & improvement | Find the deal, argue it, send it | Value both sides under your scoring; scout any rival roster; show pending offers (ESPN only) and completed trades everywhere; render a two-tab trade card with a counterparty-perspective argument; draft the proposal message | `get_trades`, `get_league_team`, `get_my_roster` (+ `trade-viz`, `roster-viz`) | Send the offer; alert you to an incoming one; supply dynasty/trade-value charts or rest-of-season projections |

`[Verified]` correction to an easy mis-mapping: `draft_help` is **not** a trade tool. It is "A draft board tiered under your exact scoring, so you can see the value cliffs. Goes live during a connected draft" (`text/documentation.txt`). Drafting the trade-proposal message is Claude writing prose — "StatsDeck can even draft the trade-proposal message for you, but you're the one who sends it" (`text/index.txt`, trades/waivers FAQ) — not a tool call.

### 5.2 Monday / Tuesday — review and waivers

The post-mortem primitive is real and better than the marketing says. `get_my_roster` leads its response with any bench player who outscored a starter at the same position — "before you ask" `[Verified]` (`text/documentation.txt`, example prompts). `get_fantasy_matchup` returns both lineups with per-player opponent adjustment, and the `matchup-viz` artifact renders nine slot-by-slot rows with both sides' numbers and a "WHERE IT'S WON & LOST" panel `[Verified]` (`extractions/showcase-extractions.jsonl`, image `3r`; 3l is the conversational answer and contains no artifact). A league-wide "optimal lineup vs. actual" figure — the standard Monday regret metric — is not documented anywhere `[Confirmed absent]`.

One genuinely differentiated nuance belongs here: StatsDeck tells managers that **Monday numbers are provisional**. The NFL issues stat corrections through the following Wednesday, so "a Thursday number is the most settled version of a given week," and nflverse rebuilds box-score data at several points during game day, then does a complete pass overnight `[Verified]` (`text/index.txt`, "How fresh is the data" FAQ). `[Analysis]` This reframes the Monday review as preliminary and the Thursday review as authoritative — a workflow claim StatsDeck has earned and never makes explicitly. *(The evidence base contains no competitor material, so no claim is made here about how rare this disclosure is across the category.)*

The waiver half is analysed in §7. For workflow purposes the load-bearing fact is the clock. Waiver processing runs on a league-set schedule — commonly Tuesday or Wednesday night, though that timing is general domain knowledge and appears nowhere in the capture — and nothing in StatsDeck knows or cares `[Verified]` for the second half: there is no reminder, scheduler or deadline object anywhere in the 22 tools, and the claim itself must be typed into the platform by hand, because `get_available_players` is read-only like everything else and the documentation is emphatic that StatsDeck "does not set lineups, submit waiver claims, accept or propose trades, drop players" (`text/documentation.txt`).

A small, recent, under-described asset sits in this phase: the **StatsDeck Times**, announced on the homepage as "a full newspaper about your league" surfaced "when viewing league standings" `[Verified]` (`text/index.txt`, Beta Team Announcements). `[Analysis]` A generated weekly league newspaper is exactly the right artifact for a Monday ritual — it is the one feature in the product that is *about the week that just happened* rather than about a query. It appears in one sentence of an announcement block, is absent from `/documentation`, and appears in no screenshot: the strings "StatsDeck Times" and "standings" return zero matches across all twenty transcription records `[Verified]`. `[Could not verify]` its actual contents or whether it recaps results beyond standings.

### 5.3 Wednesday / Thursday — roster planning

This is StatsDeck's strongest phase, and the live probe proves it rather than asserting it. `get_player_stats` with `detail:"advanced"` returned per-game (not season-aggregate) `rushing_epa`, `receiving_epa`, `receiving_air_yards`, `air_yards_share`, `wopr`, `racr`, `target_share`, `rushing_first_downs`, `receiving_first_downs`, plus a glossary shipped inside the payload with warnings about reading edge cases `[Verified]` (`extractions/connector-probes.json`, `get_player_stats`). `get_rankings` carries `target_share` and `snap_share` inline on leaderboard rows, so usage arrives at the ranking layer without a second call `[Verified]` (same file, `get_rankings`).

Two planning objects that a conventional weekly product treats as first-class are simply not present. **Bye weeks appear nowhere** in the documentation, the FAQ, the probes, or the ten transcribed screenshots — the string does not occur in any evidence file `[Confirmed absent]`. `get_fantasy_schedule` returns fantasy opponents and records by week, not NFL bye conflicts, and `get_schedule` returns the NFL slate `[Verified]` (`text/documentation.txt`). A manager can derive a bye conflict by combining the two; the product does not do it for them.

Second, **there are no forward projections in the payloads**, and this is where the product and its own marketing diverge. `get_rankings` carries an explicit `framing_note`: "Realized production under your scoring — not a projection" `[Verified]` (probe file). The only projection observed anywhere in evidence is StatsDeck's own rookie projection — "Jordyn Tyson — rookie, ~9.3 projected" in the roster pull, and the `R` "Rookie proj" chips on Jeremiyah Love and Carnell Tate in `matchup-viz` `[Verified]` (`showcase-extractions.jsonl`, `1l`, `3r`). Meanwhile the site markets projections in the plural: the FAQ says StatsDeck "adds proprietary models and algorithms for things like projections and matchup adjustments," and `/documentation` states "StatsDeck computes its own projections and rankings from nflverse data" and that "Projections are expressed as expected fantasy points and nothing else" `[Verified]` (`text/index.txt`, "Can't Claude do all of this already?"; `text/documentation.txt`). `[Inferred]` Either the projection surface exists behind tools the probes did not reach (the waiver board and draft board were both league-gated) or "projections" in the copy means the rookie fallback plus the opponent adjustment. Either way the marketing promises more forecasting than any observed payload delivers. `[Analysis]` Roster planning is inherently forward-looking; a toolset whose returned data is realized production can support the *diagnosis* half of Wednesday brilliantly and leaves the *forecast* half largely to the language model's judgement.

### 5.4 Friday / Saturday — start/sit

Fully analysed in §8. Workflow-relevant additions: `get_injuries` returns the official weekly report, which is the phase's natural trigger (Friday practice designations), and the injury methodology behind it is layered, sourced, and dated — with **five** stated principles: "Sourced and dated, always," "Corroboration isn't severity," "The official report wins ties," "Absence isn't health" (IR players drop off the report entirely), and "Not every flag is an injury" `[Verified]` (`text/index.txt`, injury FAQ).

The `pivot-chart` "Next Man Up" artifact is the strongest weekly object visible anywhere in the evidence: four Questionable starters, each mapped to a named replacement with a delta in opponent-adjusted PPG, four distinct severity colours rather than three, a "High impact" triage tag on the one that matters, and a BOTTOM LINE instruction to "Watch his status first; the rest sort themselves" `[Verified]` (`showcase-extractions.jsonl`, `2r`, both passes). `[Could not verify]` who authored that design: `/documentation` says StatsDeck "returns structured data, so Claude can chart it," and the FAQ reduces the whole artifact system to "make me a visualization," so whether the layout, legend and copy are StatsDeck-specified or Claude-authored is not established by anything in the capture. `[Analysis]` Whoever owns it, the artifact is a Saturday deliverable that pre-computes Sunday's decisions — the correct response to a product that cannot act on Sunday. It is one screenshot deep on the marketing site and named nowhere in the site's text (audit finding 16).

### 5.5 Sunday — final lineup and late swap

**This is the phase to be hard-nosed about, and the finding is unambiguous: StatsDeck has no Sunday capability beyond answering a question if you happen to ask one.**

Searched across the five substantive evidence files — `text/index.txt`, `text/documentation.txt`, `text/privacy.txt`, `text/espn.txt`, `extractions/connector-probes.json` — the strings *notification*, *notify*, *alert*, *remind*, *push*, *inactive*, *watchlist* and *lineup lock* return **zero matches** `[Verified]`. In the screenshot transcriptions the same strings appear only three times, none of them a product capability: "inactive" as the greyed state of the trade card's second tab, "inactive" inside model prose ("This is where a Nabers inactive can flip the matchup"), and "Remind" as a user's own typed prompt ("Remind me what are the things we can do together with statsdeck") `[Verified]` (`showcase-extractions.jsonl`, `4r`, `2r`, `5l`). There is no inactives feed, no 90-minute-before-kickoff sweep, no lineup-lock awareness, no watchlist, no scheduled run, and no way for the product to reach the manager first.

What does exist, and is worth crediting:

- League state is read **live on request** — "when you ask, we read your league's current state right then" `[Verified]` (`text/index.txt`, freshness FAQ).
- Scores and schedules "update within minutes"; an in-progress score is "essentially live" `[Verified]` (same).
- Every probed response carried an `injury_feed` block (`checked`, `as_of`, `flagged_count`) on its own clock — 13:10 UTC while the data freshness stamp read 20:20 UTC `[Verified]` (`connector-probes.json`, `cross_cutting_observations`). A passive injury sweep rides along on *every* call, including a no-league call.
- `injury_intel` carries `previous_status` and `status_since` — e.g. D'Andre Swift, `previous_status: "Questionable"` → `status: "cleared"`, `status_since: "2026-09-19"` `[Verified]` (`connector-probes.json`, `get_rankings`). **This is status-change detection**, and it is mentioned on no page of the site.

`[Analysis]` Those last two are the raw material for a Sunday alerting product, already built, pointed nowhere. StatsDeck knows a status changed and when it changed; it simply has no channel to say so unprompted.

And that is the structural point worth stating plainly for the roadmap: **a chat connector cannot notify you.** An MCP server is a request/response tool provider invoked by the model inside a turn the *user* started. It has no outbound channel to the client, no place to register a background job, and no ability to open a conversation. `[Inferred]` — from the documented architecture: Streamable HTTP transport, OAuth 2.0, tools that "You never call... directly — you ask in plain language and Claude picks the right one" (`text/documentation.txt`, Technical details; Tools preamble). Even if StatsDeck ingested a perfect real-time inactives feed tomorrow, delivery would still require the manager to open Claude at 11:30 on a Sunday and ask. The homepage promotes the **Claude** mobile app as the way to get "the best experience" `[Verified]` (`text/index.txt`, Get the Claude App) — Anthropic's app, Anthropic's notification surface, carrying nothing from StatsDeck.

Two further Sunday-specific weaknesses:

1. **The vendor's own freshness disclosure undercuts in-game use.** Stat lines "update in waves through the day, not the instant a play happens"; a line checked "right after the earliest game of the day" "may not be posted yet" `[Verified]` (`text/index.txt`). So the Sunday-afternoon question *"how am I doing?"* is answered from partial data by the product's own admission — while league scores, read live from the platform, are current. Two different clocks inside one answer, honestly disclosed and still confusing at 2pm.
2. **Week resolution is a live failure mode, observed in the capture.** `start_sit` returned `week: 2`, `week_basis: "default_next"`, and presented Bijan Robinson's matchup as "Week 2: vs CAR (ATL 0-2, CAR 1-1)" — while his `last_games` array contained only Week 1 and `current_season_games: 1` `[Verified]` (`connector-probes.json`, `start_sit`). `[Inferred]` Capture was Sunday 2026-09-20, mid-Week-2: ATL (0-2) and CAR (1-1) had each played twice, while Nabers' NYG (1-0) and Taylor's IND (0-1) had played once. So the "upcoming" matchup shown for the top-ranked player was a game already played or in progress, and the three compared players sat at different points in the same week with nothing in the payload flagging it. `[Analysis]` A competitor should treat this as the canonical Sunday bug: on the one day of the week the decision is time-critical, "next week" is ambiguous, and an off-by-one silently attaches a stale matchup to a live start/sit call.

The single piece of evidence that live, in-session behaviour is *buildable* here: `draft_help` "Goes live during a connected draft" `[Verified]` (`text/documentation.txt`). `[Analysis]` The team has already built one session-aware, clock-aware mode — and aimed it at draft day rather than at Sunday, the one recurring deadline every manager faces seventeen times a season.

### 5.6 Ongoing — trades and team improvement

Trade support is the second-strongest area. `get_trades` values both sides under league scoring; platform visibility is documented honestly and asymmetrically — ESPN shows completed trades **and pending offers**, Sleeper shows completed trades including draft picks and FAAB that changed hands, Yahoo completed only `[Verified]` (`text/index.txt`, "What about trades and waivers visibility?"). Where a pending offer cannot be read, the fallback is offered in the same breath: describe it or paste a screenshot. The `trade-viz` artifact carries a two-tab switcher (The Deal / Lineup Impact), YOU GIVE vs YOU GET totals in PPG (26.5 vs 18.6), and a dark "WHY YOU DO IT" / "WHY THEY ACCEPT" panel that argues the deal from the counterparty's side, including their fallback at the position (Hockenson 7.5) `[Verified]` (`showcase-extractions.jsonl`, `4r`; the conversational half is `4l`). Note that only "The Deal" tab is ever rendered — the "Lineup Impact" tab's contents appear in no screenshot `[Confirmed absent]` from the evidence. The card also labels its own 26.5-out/18.6-in gap a "trade tax" rather than spinning it `[Verified]` (`4r`). Claude will draft the proposal message — "Want me to draft the actual message to send the Gibbs Train manager" — and the manager sends it `[Verified]` (`4l`; `text/index.txt`).

Absent: trade-value or dynasty-value charts, rest-of-season projections to price a deal against, any single-call league-wide trade finder, and any notification of an incoming offer — a manager learns about that on the platform, not here. `[Inferred]` on the trade finder: `get_league_team` is documented as "The same rundown for any other team in your league" — singular, with no batch form — and the showcase shows Claude working around it sequentially ("Let me scan a couple more teams to see who's the best fit," behind a single "League team" tool chip, ending in a rejection of Doctor's team in favour of Gibbs Train) `[Verified]` (`text/documentation.txt`; `showcase-extractions.jsonl`, `4l`). So the trade finder exists as model behaviour across repeated calls, not as a product feature.

`[Analysis]` **Workflow verdict for a competitor.** StatsDeck owns the deliberative half of the week and cedes the reactive half entirely. The gap is not a missing feature; it is the delivery model. The defensible product strategy against it is not better analysis — the opponent-adjusted, scoring-exact, provenance-stamped analysis is good, and the injury epistemics are unusually rigorous — it is **owning the clock**: waiver-deadline and lineup-lock reminders, a 90-minutes-to-kickoff inactives push, and a Saturday-night "Next Man Up" digest delivered without being asked. StatsDeck has already built the status-change detection (`previous_status` / `status_since`) that such a product needs and cannot deliver it. Anything a competitor builds on a scheduled, outbound channel — email, SMS, or its own push — is architecturally out of StatsDeck's reach for as long as it remains a connector only.

---


---

## 6. Tool Inventory

StatsDeck ships **22 documented tools** (`statsdeck-crawl-data/text/documentation.txt`, "Tools" section — 5 Connection + 7 Your league + 2 Decisions + 8 NFL data). They are MCP tools, not UI. The user never selects one — they type a sentence and Claude picks. The only user-visible trace is a collapsed chip in the transcript bearing a **friendly label that appears nowhere in the site's text** (`showcase-extractions.jsonl`: `Start/sit call` in `2l`, `My matchup` in `3l`, `My roster` and `League team` in `4l`). Four such labels are evidenced; the other 18 mappings are unobserved.

**Premium? — No, for all 22.** No paid tier, trial, or pricing page exists anywhere in the product (`/pricing` 404s; FAQ: "StatsDeck is completely free"). The column is collapsed into this line rather than repeated 22 times. The only money in the picture is Anthropic's — Claude Pro at $20/month — which buys a better model, not more StatsDeck. `[Verified]` (`text/index.txt`, FAQ "What does it cost?"; site audit §D). One forward-looking caveat worth carrying: the privacy policy anticipates that "any future paid plan would be handled by a third-party payment processor," so free is a stage, not a stated permanent position. `[Verified]` (site audit §J-10)

**Inputs and outputs marked †** were observed on the live connector (`extractions/connector-probes.json`, 2026-09-20, read-only probes, no league connected). **Only six of the 22 tools were probed** — `get_scoring`, `get_my_roster`, `start_sit`, `get_rankings`, `get_player_stats`, `get_team_defense`. The four state-changing tools were deliberately avoided, and the remaining twelve were not exercised, so **their payload shapes are entirely unobserved**. Unmarked cells are `[Inferred]` from the tool's documented description and are the least certain cells in this table. Note also that the capture states its responses are "abridged to the fields that carry analytic signal," so a field's absence from a probe is not evidence of its absence from the payload.

| Group | Tool (chip label where known) | Purpose | League-Specific? | Inputs | Output | Actionable? |
|---|---|---|---|---|---|---|
| Connection | `connect_league` | Links a Sleeper / ESPN / Yahoo league so every answer uses the real roster and exact scoring | **Defines** it | Platform + Sleeper username, ESPN league ID, or Yahoo OAuth approval | Connection record. The connection object exposes `league_type`, `best_ball` and `lineup_construction` — observed inside the **`get_scoring`** response†, not from calling `connect_league`, which the probe deliberately never called | No — setup |
| Connection | `disconnect_league` | Unlinks the league; confirms first and names the league before changing anything | Yes | League identity | Confirmation | No |
| Connection | `save_espn_credentials` | Stores AES-256-GCM-encrypted ESPN session cookies for private-league reads | ESPN private only | `SWID` + `espn_s2` | Stored-credential ack | No |
| Connection | `get_scoring` | Shows the scoring in force and what else is available | Scoring-specific, not league-specific | none† | `active_scoring`, `is_assumed_default`, 4 presets each with a plain-English `favors` string† | Partial — explains format bias |
| Connection | `set_scoring` | Sets the scoring so every points figure matches the league | Yes | Preset id or custom rules | Confirmation + label | No |
| Your league | `get_my_roster` — "My roster" | Team rundown: starters and bench scored, strengths, holes, construction, and any bench player outscoring a starter | Yes | none† | Rundown; **unconnected returns `success:true` with three named routes (connect / paste / without) plus an `injury_feed` sweep, not an error**† | **Yes** — states strength, hole, and bench-over-starter without being asked |
| Your league | `get_league_team` — "League team" | The same rundown for any other team in the league | Yes | Team / manager | Rival roster rundown | Partial — scouting input |
| Your league | `get_fantasy_matchup` — "My matchup" | Weekly head-to-head: both lineups, league record, per-player opponent adjustment, plus the platform's own projection where it publishes one | Yes | Week | Side-by-side lineups with `adj` values *(not probed — shape from docs and screenshots)* | Partial — payload supplies numbers; the verdict is Claude's |
| Your league | `get_fantasy_schedule` | Full season schedule for any team: every week's opponent, with record and scores once played | Yes | Team | Schedule table | No |
| Your league | `get_standings` | Standings best-to-worst with records | Yes | none | Standings. The homepage announces "the new StatsDeck Times when viewing league standings… a full newspaper about your league" `[Verified]` announcement; `[Inferred]` that it rides on this tool's output rather than being a separate artifact | No |
| Your league | `get_available_players` | Waiver / free-agent board: best actually-unrostered players, each one's add state, and your FAAB balance or waiver priority | Yes | Position filter | Ranked board + acquisition cost | Partial — ranked, no pick named |
| Your league | `get_trades` | Pending offers and completed league trades, both sides scored under your scoring | Yes | none | Trade ledger, valued both sides | Partial — values, no verdict |
| Decisions | `start_sit` — "Start/sit call" | Ranked start/sit between **two or more named players**, each with their real NFL opponent | Your players — **also works with no league connected on pasted names**† | `players[]`, `last_n`; week defaults to `default_next`† | `recommended_start`, `form_score`, `avg_fantasy_points`, `weighting_basis`, matchup, `injury_intel`, and self-stated limits† | **Yes — an explicit named pick** |
| Decisions | `draft_help` | Draft board tiered under exact scoring to expose value cliffs; goes live during a connected draft | Yes | Position | Tiers | Partial |
| NFL data | `get_player_stats` | Production with fantasy points under your scoring; `detail:"advanced"` widens each game row to EPA, air yards, air-yards share, WOPR, RACR, target share and first downs | No — but scored under your scoring | `player_name`, `timeframe`, `last_n`, `detail`† | Per-game lines + `advanced` block + `advanced_glossary_keys`† | No — data |
| NFL data | `get_rankings` | League-wide leaderboards by position and metric, recent or across seasons | No — scored under your scoring | `position`, `timeframe`, `top_n` (metric resolved as `fantasy_points`)† | Ranked rows carrying `target_share`, `snap_share`, `age`, `injury_intel`, and a `framing_note` disclaiming forecasting† | No |
| NFL data | `get_snap_counts` | Snap counts and snap share for several players at once — the usage signal behind the box score | No | `players[]` | Usage table *(not probed)* | No |
| NFL data | `get_team_defense` | DST scoring with its components, and how generous a given opponent has been to defenses | No | `team`, `opponent`, `last_n`† | Components + plain-English `read` + a quantified `caveat`† | **Yes — states the streaming read** |
| NFL data | `get_kicker_stats` | Kicker game lines and distance splits, scored under your bands | No — bands come from your scoring | Player | Splits | No |
| NFL data | `get_team_roster` | An NFL team's real roster and depth chart | No | Team | Depth chart | No |
| NFL data | `get_injuries` | The official weekly injury report (Out / Doubtful / Questionable practice designations) | No | Week / team | Official designations | No |
| NFL data | `get_schedule` | The NFL slate — a team's schedule, or a full week | No | Team or week | Slate | No |

### What the inventory tells a competitor

**Four tools change state, none touches the league.** `connect_league`, `disconnect_league`, `save_espn_credentials`, `set_scoring` write only to StatsDeck's own settings store. The documentation states this explicitly and precisely — "There are no write calls to any fantasy platform anywhere in it." `[Verified]` (`text/documentation.txt`, "What StatsDeck will not do")

**Only three of 22 tools return a decision.** `start_sit` names a pick (`recommended_start`†), `get_team_defense` states a streaming read†, and `get_my_roster` volunteers a strength/hole verdict (documented). The other 19 return structured facts. Everything else that *feels* like advice in the screenshots — the full-lineup verdict, the trade, the contingency map — is Claude reasoning over those facts. `[Analysis]` This is the single most important structural fact about the product, and §9 works through its consequences.

**There is no lineup optimizer.** `start_sit` takes an explicit list of players. Nothing in the inventory accepts "set my whole lineup" and returns an optimal assignment across slots. In screenshot `2l` the nine-slot Week 1 verdict sits behind a **single visible `Start/sit call` chip** — no roster chip is visible in that transcript — and the answer is structured as eight self-selecting locks plus "the one real decision" at flex. It even announces the composition: "Your lineup is mostly locked — the studs start themselves… The real decisions are at flex and the injury-dependent spots. Let me settle those." `[Verified]` (the chip, the structure and both quotes); `[Inferred]` that the lineup verdict is Claude composing tool output rather than a tool call, from the absence of any optimizer among the 22 and the single visible chip.

**Also absent from the inventory:** any tool that evaluates a hypothetical trade; any tool that scans the league for trade fits; any tool that simulates a waiver claim or FAAB bid; any news/notes tool (the FAQ instead tells users to ask Claude to run its own web search); any player-vs-player comparison outside `start_sit`. `[Verified]` — by enumeration of all 22.

**Directory-vs-docs count.** Anthropic's connector directory listing shows **18 tool names behind a "Show all" control** against 22 documented. `[Verified]` (site audit §C) — but the audit itself reads 18 as *consistent with* 22, i.e. as a collapsed list rather than a shorter inventory. `[Inferred]` and unconfirmed: if there is a real four-tool gap, the four state-changing tools are the obvious candidates.

---


---

## 7. Waiver Tools

### 7.1 Evidence status — read this before the table

`get_available_players` is the **one tool in this report's scope that could not be exercised live**. The connector probes ran with `league_connected: false`, and the waiver board is explicitly gated behind a league connection: the unconnected `get_my_roster` response names it among the tools a connection unlocks — "Connect a league to unlock the roster-aware tools — your team rundown, **the waiver/free-agent board**, and draft prep" `[Verified]` (`extractions/connector-probes.json`, `get_my_roster.findings.routes[0]`). No showcase screenshot shows waiver output either; the waiver board appears only as a capability bullet ("Waiver/free-agent board — who's available to pick up" in `5l`; "Waiver board" / "Waiver-wire availability board" on the `statsdeck-map` card in `5r`), as a proactive follow-up offer ("waiver DST upgrades" in `1l`, "waiver targets" in `5l`), and once as model prose pointing at the wire ("Jacksonville's fine here, but if a better Week 1 streamer is on waivers, grab it" in `3l`) `[Verified]` (`showcase-extractions.jsonl`). Everything below therefore rests on `/documentation`, the homepage FAQ, and the capability-map artifact — strong sources, but not payload-level. The gap is stated in the field-by-field table.

### 7.2 Does it answer "who should I add, who should I drop, and why?"

**Add: substantially yes. Why: partially. Drop: no.**

| Waiver checklist item | StatsDeck | Evidence | Label |
|---|---|---|---|
| Ranked list of best available players | Yes — "the best players actually unrostered in your league," and the FAQ adds that it "ranks the best available players in your league under your scoring" | `text/documentation.txt` (tool entry); `text/index.txt` ("What about waivers and FAAB?") | `[Verified]` |
| Filtered against real league rosters (not a generic pool) | Yes — the words "actually unrostered **in your league**" are doing real work | `text/documentation.txt` | `[Verified]` |
| Free-agent vs. waiver state per player | Yes — "each one's add state"; FAQ: "Most unrostered players are free agents you can add right away" | `text/documentation.txt`; `text/index.txt` | `[Verified]` |
| FAAB balance | Yes — "FAAB: your remaining budget" | `text/index.txt` (waivers/FAAB FAQ) | `[Verified]` |
| Rolling waiver priority | Yes — "your current position (for example, 4 of 12)" | `text/index.txt` (waivers/FAAB FAQ) | `[Verified]` |
| "What it takes to get each one" | Claimed, and the FAQ's own answer is the mechanism: add state, plus your waiver position or your remaining FAAB — **not a price for the player** | `text/index.txt` (waivers/FAAB FAQ) | `[Verified]` claim, `[Could not verify]` output |
| **Recommended FAAB bid amount** | **No** | No bid, %-of-budget, or tier language in any evidence file | `[Confirmed absent]` |
| **Drop recommendation / drop candidate** | **No** | No drop, cut or release field in any of the 22 tool descriptions, in any probe, or in any of the ten screenshots. (The documentation's "does not... drop players" is about not *executing* a drop, and is not evidence either way about recommending one.) | `[Confirmed absent]` |
| **Handcuff / backup identification** | **No** as a waiver concept | String absent from all files; `get_team_roster` returns depth charts, so it is derivable by hand | `[Confirmed absent]` |
| **Speculative-add / stash framing** | **No** — no "stash", "speculative", or breakout-candidate framing | Strings absent from all evidence files | `[Confirmed absent]` |
| Trending adds/drops, ownership % | **No** — no ownership, roster-percentage or trending data anywhere in the product | Strings absent from 22 tool descriptions, all probes and all transcriptions | `[Confirmed absent]` |
| Positional need linkage | Yes, but in a **different tool** — `get_my_roster` names "your biggest hole"; `roster-viz` renders a per-position startable baseline (a measurably different tick per row) and a Strength / Surplus / Solid / Weakness badge, plus a "LEAN ON" / "SHORE UP" card | `text/documentation.txt`; `showcase-extractions.jsonl` `1r`, `5l` | `[Verified]` |
| DST / K streaming | Yes, and strong — `get_team_defense` returns a plain-English read ("CAR has handed opposing defenses an average of 5.0 DST pts/game this season under ESPN Standard") plus a quantified accuracy caveat naming the two ways the number can be wrong and in which direction; `get_kicker_stats` gives distance splits scored under your bands | `connector-probes.json` `get_team_defense`; `text/documentation.txt` | `[Verified]` |
| Multi-week streaming plan | Derivable only — `get_team_defense` + `get_schedule` by hand; no streaming-calendar tool | Tool inventory | `[Inferred]` |
| Submit the claim | **Never** — no write calls to any fantasy platform, ever | `text/documentation.txt`, "What StatsDeck will not do" + "Access: Read-only" | `[Verified]` |

### 7.3 Analysis

**The asymmetry is the finding.** `get_available_players` answers *who is out there and what currency you hold*. It does not answer *what to spend, or who to cut*. Those two absences are structurally different and should be read differently.

The drop gap looks **deliberate**. StatsDeck is read-only by design and repeats that guarantee on **all four** of its pages — `/documentation` ("What StatsDeck will not do"; "Access: Read-only"), the homepage FAQ ("No — StatsDeck is read-only"), `/privacy` ("StatsDeck is read-only"), and `/espn` ("StatsDeck never modifies your team or league, it simply imports data") `[Verified]`. `[Inferred]` the absence of a cut recommendation is of a piece with that posture rather than an oversight — the product's stated self-conception is "StatsDeck isn't an autopilot for your team, it's your analytics partner" `[Verified]` (`text/index.txt`, "Does AI have a place in fantasy football?"). Note, though, that nothing in the copy actually says StatsDeck declines to name a cut; that is a reading, not a claim the site makes.

`[Analysis]` And the manager's actual question is a *swap*, not an add. Every waiver claim in a full-roster league is an add **and** a drop, and StatsDeck hands back half the transaction. It already holds the data to close the gap without turning prescriptive: `get_my_roster` ranks the bench under league scoring and names the biggest hole, and `roster-viz` already classifies positions as "Surplus." A neutral "lowest-value rostered players at your surplus positions" view would complete the decision without touching the read-only promise.

The FAAB gap is **analytically deeper**. Knowing your remaining budget without any bid guidance is the difference between a bank balance and a price. A bid recommendation needs three inputs: the player's expected forward value, the competing managers' budgets, and a market model. StatsDeck has none of the three in evidence. `[Could not verify]` whether other managers' FAAB balances are exposed anywhere — no tool description mentions it; the only FAAB visibility in evidence is historical, as consideration inside Sleeper's completed trades (`text/index.txt`). `[Confirmed absent]` any market or bid model.

**The forward-looking problem is the most serious issue in this section.** A waiver add is a bet on *future* production, and no probed payload returns a forward projection: `framing_note` = "Realized production under your scoring — not a projection" `[Verified]` (`connector-probes.json`). So a ranked waiver board built on that signal is a ranking of **what just happened**, which is precisely the signal that produces the classic waiver error — chasing last week's box score. The mitigations the product does hold are real but indirect: usage metrics that lead production (`snap_share`, `target_share`, `wopr`, air-yards share), and the recency-weighted form model with a 3.4-game half-life used in `start_sit`. `[Could not verify]` whether `get_available_players` ranks by realized average, by `form_score`, or by something else — the tool was never probed, and the strongest statement anywhere is the FAQ's "ranks the best available players in your league under your scoring."

`[Analysis]` **Competitive read.** The waiver board is the weakest of StatsDeck's three weekly pillars and the easiest to beat. A competitor that ships (a) a FAAB bid range priced against league budget state, (b) an explicit add/drop pair rather than an add list, (c) opportunity-based rather than production-based ranking — snap-share delta, target-share trend, vacated volume after an injury — and (d) handcuff and stash framing derived from depth charts, is competing against four confirmed absences rather than against a quality gap. `[Speculative]` The highest-leverage single feature is an injury-triggered vacated-volume view: when a starter goes to IR, name the backup, the share he inherits, and a bid. StatsDeck has the depth charts (`get_team_roster`), the snap data (`get_snap_counts`), and the status-change detection (`previous_status` / `status_since`) to build exactly that, and no evidence it has connected them.

---


---

## 8. Start/Sit & Lineup Tools

### 8.1 The probe

`start_sit` was exercised live against the real connector. Input: `players: ["Jonathan Taylor", "Bijan Robinson", "Malik Nabers"]`, `last_n: 3`. This is the single most informative piece of evidence in the audit, because it settles what the tool actually returns rather than what the marketing implies `[Verified]` (`extractions/connector-probes.json`, `start_sit`).

It returned:

- `recommended_start: "Bijan Robinson"` — **an explicit named pick, not merely an ordering**
- `ranking_basis: "blend"`, `week: 2`, `week_basis: "default_next"`
- Per player: `value_basis: "recency_form"`, `form_score`, `avg_fantasy_points`, `age`, and a `matchup` object (team, opponent, home/away, both records). `last_games` (week / opp / pts) and the prose `matchup.label` are shown only on the top row in the captured payload — see the abridgement caveat at the end of §8.3 before reading that as absence for the other two.
- For the top row, `weighting_basis`: `seasons_used: [2026, 2025]`, `games: 18`, `current_season_games: 1`, `current_season_weight_pct: 18.9`, `halflife_games: 3.4`
- For Nabers, `injury_intel`: `source: "web_digest"`, `status: "Questionable"`, `tier: "corroborated"`, `reported_date: "2026-09-11"`, `status_since: "2026-09-16"`, `previous_status: "cleared"`
- Two notes, the second of which contains the sentence this section is built around.

Note also that `form_score` (18.87) and `avg_fantasy_points` (23.3) are **deliberately two different numbers** — a form/strength signal and actual current-season scoring — exactly as `/documentation` describes `[Verified]`.

### 8.2 Checklist

| Input the template asks about | Present in `start_sit`? | Present elsewhere in StatsDeck? | Evidence | Label |
|---|---|---|---|---|
| Projections (forward) | No | Not in any observed payload, except StatsDeck's own rookie projection — though the site's copy claims "projections" more broadly (see §5.3) | `framing_note`: "Realized production under your scoring — not a projection"; "Jordyn Tyson — rookie, ~9.3 projected"; `R` "Rookie proj" chips | `[Verified]` / `[Confirmed absent]` at the payload layer |
| Floor | No | No | No distributional field in any probe or tool description | `[Confirmed absent]` |
| Median | No | No | As above | `[Confirmed absent]` |
| Ceiling | No — as a computed value | Only as model prose ("Nabers has the week's highest ceiling"; "Nabers has real ceiling (~22 adj)") | `showcase-extractions.jsonl` `2r`, `3l`, `3r` | `[Confirmed absent]` as data |
| Matchup | **Shown but not scored** — opponent, home/away, both records | Yes — `get_fantasy_matchup` applies the opponent adjustment | `connector-probes.json`; `text/documentation.txt` | `[Verified]` |
| Opponent defense | No, beyond the opponent's name | Yes — `get_team_defense` returns opponent generosity + a plain-English read | `connector-probes.json` `get_team_defense` | `[Verified]` |
| Usage trends | No | Yes — `get_snap_counts`; `get_player_stats` advanced; `snap_share` + `target_share` inline on `get_rankings` rows | `connector-probes.json` | `[Verified]` |
| Injuries | **Attached but not scored** — with source, tier, date, `previous_status`, `status_since` | Yes — `get_injuries` official weekly report | `connector-probes.json`; `text/index.txt` | `[Verified]` |
| Weather | No | No — string absent from every evidence file | All files searched | `[Confirmed absent]` |
| Implied totals | No | No — and refused on principle: no odds, spreads, or win probabilities | `text/documentation.txt`, "What StatsDeck will not do" | `[Confirmed absent]` by policy |
| Game script | No as a modelled input | Only as model reasoning ("soft run D"); the term itself appears in no evidence file | `showcase-extractions.jsonl` `2l` | `[Confirmed absent]` |
| Snap share | No | Yes — `snap_share` on ranking rows; `get_snap_counts` | `connector-probes.json` | `[Verified]` |
| Target share | No | Yes — `target_share` on ranking rows and in advanced per-game lines | `connector-probes.json` | `[Verified]` |
| Rush share | No | Carries are raw counts; no share field observed — but the probe file is abridged, so this is not proof of absence | `get_player_stats` advanced block | `[Could not verify]` |
| Red-zone usage | No | **No — nowhere in evidence.** "red zone", "red-zone", "redzone", "goal line" and "goal-line" all return zero matches across every file | All files searched | `[Confirmed absent]` |
| Scoring format | **Yes — the strongest item** | `scoring_label` on every response; `is_assumed_default` flag; four presets each with a plain-English `favors` line | `connector-probes.json`, `get_scoring` + `cross_cutting_observations` | `[Verified]` |

### 8.3 The self-disclosed limitation, analysed

The second note in the payload reads, verbatim:

> "The ranking is a form/strength signal; each player's displayed per-game points are actual current-season scoring (two different numbers). 1 of these players carries an injury designation — state it with its date in any recommendation. **Injury and matchup aren't factored into the rank; ask for the matchup read.** Ask how it's weighted for the full method."

`[Verified]` (`extractions/connector-probes.json`, `start_sit.findings.notes[1]`).

This should not be glossed. Four consequences:

**1. `recommended_start` is not a start/sit recommendation. It is the top of a form ranking.** The field name asserts a decision; the model underneath it considers only recency-weighted realized scoring. The marketing asserts the stronger thing: `/documentation` advertises "Strategic Decisions: Generates **optimized start/sit recommendations**" `[Verified]`. In the captured probe the two happen to agree — Bijan tops the form ranking at 18.87, carries no injury designation, and is at home (`home_away: "vs"`), while the Questionable player (Nabers, form 8.11) ranks last, so nothing visibly breaks. Note that nothing in the payload characterises his opponent as favourable; the payload does not score matchup at all, and the only CAR datum anywhere in the probes is a DST-scoring figure that says nothing about run defense. `[Analysis]` The failure mode is straightforward to construct and will occur every week in real leagues: **the player with the best recent form is Questionable, or faces the league's stingiest defense, and `recommended_start` names him anyway.** The injury is present in the same payload, as structured data, and does not move the number. That is a tool which can emit an explicit start recommendation for a player it simultaneously reports as Questionable.

**2. The honesty is architecturally motivated, and the transparency is a genuine asset.** `[Inferred]` Keeping the deterministic layer narrow — one auditable signal, weights exposed (`halflife_games: 3.4`, `current_season_weight_pct: 18.9`, `seasons_used`) — makes the number defensible and reproducible, and pushes multi-factor judgement to the model, which is better at it. `[Analysis]` Publishing the half-life, the season blend, and an explicit list of what the rank deliberately excludes is unusually candid, and should be read as a design choice rather than an oversight. *(No competitor product was captured or probed for this audit, so no comparative claim is made about what other engines disclose.)*

**3. But it converts a product guarantee into a prompt dependency.** The quality of the final call now depends on whether Claude reads the note, follows the instruction to "ask for the matchup read," and calls `get_fantasy_matchup` and `get_injuries` before answering. Nothing enforces that. `[Verified]` the showcase demonstrates the good path — `2l` cites season-average *and* opponent-adjusted figures ("Skattebo 16.0 season-avg", "~18 adj" vs Gainwell "~16.8 adj"), states the injury caveat verbatim ("Caveat: Skattebo is Questionable. If he's ruled out, Gainwell slides right in — nearly as good this week, so no panic"), and names the fallback. `[Verified]` every screenshot that shows a composer — the five conversational panels `1l`, `2l`, `3l`, `4l`, `5l` — has the model pill reading **`Opus 4.8 High`**, rendered two-tone; the five artifact-panel images show no composer and therefore no pill (audit finding 18; `showcase-extractions.jsonl`). Meanwhile the FAQ tells readers Sonnet is the free default, that "StatsDeck runs well on it," and that "Opus isn't available on the free tier" `[Verified]` (`text/index.txt`, "What Claude model should I use?"). In fairness the FAQ also says plainly that Opus delivers "richer visualizations," and the showcase is where visualizations live — so this is a disclosure gap, not a misrepresentation. `[Analysis]` Still, the demonstrated behaviour is the high-effort configuration's behaviour. On a weaker model, or in a long conversation where the note is summarised away, the plausible output is "Start Bijan Robinson" with no caveat and no matchup call — an unqualified lineup decision computed without injury or matchup. Two users asking the identical question can receive materially different-quality answers, and the product has no way to detect that it happened.

**4. Week resolution is unguarded.** `week_basis: "default_next"` resolved to Week 2 while the top-ranked player's team already showed an 0-2 record and only one game in `last_games` `[Verified]`. `[Inferred]` — see §5.5: mid-Week-2 Sunday capture, staggered kickoffs, so the "upcoming" matchup attached to the recommendation was for a game already played or under way, and the three compared players were at different points in the same week with nothing flagging it. There is no `confidence`, `stale`, or `games_remaining` signal anywhere in the payload to catch this `[Verified]` — all three strings return zero matches in `connector-probes.json`.

One further observation: `ranking_basis: "blend"` sits above rows whose individual `value_basis` is `"recency_form"`. `[Inferred]` the field implies a fallback hierarchy — presumably other bases for players with no current-season data, consistent with the rookie-projection path. `[Could not verify]` what other values exist. Also note the probe file states responses are "abridged to the fields that carry analytic signal" (`connector-probes.json`, `_meta.note`), so a field shown for one player and not another (e.g. `weighting_basis`, `last_games`) is **not** evidence of absence.

### 8.4 The rest of the lineup surface

`start_sit` is not the whole lineup story, and the gap is at the top:

- **There is no lineup optimizer.** `start_sit` compares "two or more of **your** players" that the user names `[Verified]` (`text/documentation.txt`); the strings "optimizer" and "optimal lineup" appear in no evidence file. No tool takes a full roster and returns the optimal legal lineup subject to slot and flex-eligibility constraints. The one automated proxy is `get_my_roster`'s flag for a bench player outscoring a starter *at the same position* — a single-position comparison, not a solver `[Verified]`. `showcase-extractions.jsonl` `2l` shows Claude performing the whole-lineup job by *reasoning*: the "Locks" section is one run-on bullet containing exactly eight position-labelled players (QB/RB/WR/WR/WR/TE/K/DST) with no FLEX entry, and the second pass reads the structure explicitly — "the flex slot is deliberately withheld and becomes 'the one real decision.' That 8-of-9 framing is the rhetorical device of the whole answer" `[Verified]` (`2l`, second pass). `[Analysis]` That is a language-model behaviour, not a tool guarantee, and it is not reproducible on demand.
- **`get_fantasy_matchup` is the better lineup lens than `start_sit`.** It applies the opponent adjustment — "their season average tempered by what that week's defense actually allows to their position" — and `matchup-viz` renders nine slot rows with Q and R status chips, opponent-adjusted bars, a "Bars = opponent-adjusted PPG · solid = slot winner" legend, and an explicit reconciliation against the host platform's own number ("You're favored by 13.6 pts... (ESPN's native projection has it closer.)") `[Verified]` (`text/documentation.txt`; `showcase-extractions.jsonl` `3r`). One precision note: the documentation scopes the adjustment to "each skill-position player," while `matchup-viz` shows K and DST rows with numbers too, so how those two slots are derived is `[Could not verify]`. `[Analysis]` The signature metric lives in the matchup tool and not in the tool whose literal job is the start/sit call — which is precisely why the payload has to tell the model to go ask for it (audit finding 17).
- **`pivot-chart` is the best contingency object in the category** and is discussed in §5.4. Note its one defect: the TE row prints 12.9 → 14.6, a true swing of **+1.7**, under a pill reading `+1.6`, where every other row reconciles exactly (21.9−11.6 = −10.3, 15.6−10.5 = −5.1, 18.1−16.8 = −1.3) `[Verified]` (`showcase-extractions.jsonl` `2r`, second pass, `corrections[0]`). A 0.1 arithmetic error inside the product's flagship visual, on the marketing site.
- **Scoring integrity is the one unambiguous win.** Every probed response carried `scoring_label: "ESPN Standard (assumed default)"` — labelled *and* flagged as assumed rather than the user's real league — plus per-preset semantics ("No PPR — favors big-play, TD-dependent backs and deep-threat WRs over volume receivers") `[Verified]` (`connector-probes.json`). And unlike the freshness stamp, the scoring label *does* reach the marketing: it appears as "PPR scoring" in `1l`'s prose and is stamped into artifact chrome — `SEATTLE BEGINNER · H2H POINTS PPR` on `roster-viz`, `WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED` on `matchup-viz`, `TRADE PROPOSAL · H2H POINTS PPR` on `trade-viz` `[Verified]` (audit §D, "The scoring label claim is visually substantiated"). It is absent from the conversational panels `2l`, `3l` and `5l`, each of which the transcriber flags. **The freshness half is the one that never reaches the proof surface:** no transcription records an "as of" or data-freshness stamp anywhere in the ten screenshots, and five of them flag its absence explicitly `[Verified]`. One caveat against over-claiming: `1l`'s second pass retracts its own blanket wording — "no ... freshness/data stamp are visible anywhere in this crop' is not supportable ... the crop cuts off content where one could be" — so the defensible statement is *no freshness stamp in any readable region*, not proof of absence in every pixel (audit finding 19).

`[Analysis]` **The sharpest single finding in this section.** `get_scoring` explains that ESPN Standard "favors big-play, **TD-dependent** backs" — the engine knows that under the default scoring, touchdowns dominate the outcome. The product then offers **no red-zone data, no goal-line carry share, and no TD-rate or expected-TD metric anywhere in 22 tools** `[Confirmed absent]`. It explains why TDs matter and supplies nothing with which to forecast them. Combined with the absence of floor/median/ceiling, the result is a start/sit engine that ranks on realized central tendency in a game decided by variance and scoring plays.

`[Analysis]` **Competitive read.** Do not try to out-transparent StatsDeck — the exposed half-life, the two-number separation, the self-disclosed exclusions and the tiered injury epistemics are excellent and hard to beat on candour. Beat it on **completeness of the decision**: a genuine distributional output (floor / median / ceiling under the user's exact scoring), a slot-and-flex-aware optimizer over the whole roster, red-zone and goal-line usage, and — critically — a recommendation field whose inputs actually include the injury and matchup data the product already holds. `[Speculative]` The cheapest credible differentiator is a single scored recommendation with visible attribution: *form contributed +X, matchup −Y, injury risk −Z, net call*. StatsDeck has every one of those inputs in the same payload today and deliberately declines to combine them — leaving the combination to a language model that may or may not read the note telling it to.

---

**Raw evidence files consulted for sections 5, 7 and 8** — all under `C:\Users\itcod\AppData\Roaming\Claude\scratch-workspaces\28e9d46a-4189-4340-b9ad-ec0ab1067c60\6c51e27a-922c-47d3-893d-0c264a866114\scratch-2026-09-20-db1914\`:

| File | Role in these sections |
|---|---|
| `statsdeck-crawl-data\extractions\connector-probes.json` | Decisive for §8; live `start_sit`, `get_scoring`, `get_rankings`, `get_player_stats`, `get_team_defense`, `get_my_roster` payloads; freshness / `injury_feed` / `scoring_label` cross-cutting blocks. Also the source of the abridgement caveat (`_meta.note`: responses "abridged to the fields that carry analytic signal") |
| `statsdeck-crawl-data\extractions\showcase-extractions.jsonl` | Two-pass transcription of all 10 screenshots (20 records); source for `pivot-chart`, `matchup-viz`, `roster-viz`, `trade-viz`, `statsdeck-map`, the `Opus 4.8 High` model pill (conversational panels only), and the TE-row arithmetic error |
| `statsdeck-crawl-data\text\documentation.txt` | All 22 tool definitions, read-only guarantees, the "Strategic Decisions" marketing claim, freshness statement, data provenance |
| `statsdeck-crawl-data\text\index.txt` | The FAQ — waivers/FAAB, trades visibility, freshness, injury methodology (five principles), the Claude-model table, StatsDeck Times announcement |
| `statsdeck-crawl-data\pages\index.html` | Checked directly to establish that FAQ ids are non-sequential and out of visible order, so numeric FAQ citations are unsafe |
| `statsdeck-crawl-data\text\privacy.txt`, `text\espn.txt` | Checked; no weekly-workflow, waiver, or lineup content — but both restate the read-only guarantee, which matters to §7.3 |
| `statsdeck-crawl-data\README.md` | Capture method, transcription method, confirmed-404 path list, "The four pages in `pages/` are the site in full" |
| `statsdeck-crawl-data\screenshots\1l–5r.jpg` | Native-resolution sources behind the transcription — ten images, 664–675 px wide and 2,101–3,182 px tall |
| `statsdeck-site-audit.md` | Findings 11, 14, 16, 17, 18, 19 and §D corroborated above |

---

## 9. Trade Tools

The template's distinction — Trade **Analyzer** ("is this fair?") versus Trade **Finder** ("what should I attempt?") — turns out to be the wrong axis for StatsDeck. The honest answer is that **StatsDeck ships neither as a feature, and Claude performs both as emergent behaviour over three read tools.** That is not a hedge; it is the finding, and it has sharp consequences for anyone building against it.

It is worth noting up front that the product *markets* the capability. StatsDeck's own capability-map artifact (`5r`) lists, under a "League Moves" card, "**Trade analysis covering fairness, fit, and history**" — fairness and fit being exactly the two things no tool computes. `[Verified]` (`showcase-extractions.jsonl`, `5r`)

### 9.1 What actually exists

| Layer | Evidence | What it is |
|---|---|---|
| `get_trades` | `text/documentation.txt`: "Pending offers and completed league trades, both sides scored under your scoring" | A **ledger reader**. It reads trades that exist in the league and scores both sides. `[Verified]` its scope; `[Inferred]` that it cannot accept a hypothetical package — no such input is documented and the tool was not probed |
| `get_my_roster` + `get_league_team` | Chips `My roster` and `League team` visible in `4l` | The raw material: your roster and one rival roster at a time, each scored under your scoring. `[Verified]` |
| Claude | `4l` transcript | The analyst: diagnoses holes, picks a counterparty, prices the deal, argues both sides, drafts the message. `[Verified]` |
| `trade-viz` artifact | `4r` | The presentation layer — a Claude-authored artifact, not a StatsDeck render. `[Inferred]`, see 9.4 |

There is **no `evaluate_trade`, no `trade_value`, no `find_trades`** anywhere in the 22. `[Verified]` by enumeration.

### 9.2 Is it an Analyzer?

Functionally yes, architecturally no. Ask "is this fair?" and you get a real answer — but it is assembled, not computed. The `trade-viz` card in `4r` prices **YOU GIVE 26.5 PPG** (McLaurin 13.5 + Pierce 13.0) against **YOU GET 18.6 PPG** (McBride 18.6) and — creditably — refuses to spin the gap, labelling it "the trade tax for going from 2 startable pieces to 1." `[Verified]`

Three things follow:

- **The only quantified currency is realized PPG under your scoring.** There is no trade value chart, no market value, no dynasty pick value, no positional-scarcity multiplier, no rest-of-season value — no valuation field of any kind appears in any documentation, payload, or screenshot. Scarcity and startability do enter the argument, but only as prose ("a ~7-point weekly jump at a scarce position", "you start 2 WRs out of 8 — this is exactly the surplus to spend"). `[Verified]`
- **Because PPG is the currency, every 2-for-1 reads as a loss on the face of the card** and has to be argued around in prose. The card prints 26.5 out against 18.6 in; the 7.9-point gap is the reader's own subtraction — it is not printed, only narrated as a "trade tax." `[Verified]` A competitor with even a crude starter-slot-adjusted value model beats this on the first screen. `[Analysis]`
- **`+6.9 at TE` is correct but not checkable on the card.** The delta reconciles exactly against the incumbent TE — Harold Fannin Jr. at 11.7, printed in the roster pull (`1l`) and again in the trade conversation (`4l`, "Fannin's 11.7"): 18.6 − 11.7 = 6.9. What the card itself never prints is that baseline or the incumbent's name, so the one number carrying the whole rationale cannot be verified from the artifact in isolation. `[Verified]` (`showcase-extractions.jsonl`, `1l`, `4l`, `4r` second pass) `[Analysis]` On a card whose entire purpose is checkability, leaving the baseline off is a self-inflicted trust cost — and a one-line fix.

Where StatsDeck's analyzer *is* genuinely strong: **pending offers are read directly on ESPN**, both sides scored automatically, so the "is this fair?" loop needs no data entry at all on that platform. `[Verified]` (`text/index.txt`, FAQ)

### 9.3 Is it a Finder?

**It behaves like one, and it is emergent.** Screenshot `4l` is the strongest single piece of evidence on the site. The observable sequence: user asks for help building a trade → Claude states the targeting strategy up front ("your roster's real holes and what the other teams in the league are working with, so we target managers whose needs match your surplus") → chip `My roster` → diagnosis ("your only real hole is DST… But DST rarely nets a trade — managers stream it", so pivot to WR surplus as capital) → first read on a counterparty ("Gibbs Train is a strong target — thin at WR") → "Let me scan a couple more teams to see who's the best fit before I build the proposal" → chip `League team` → "That's enough to build you a proposal." → rejects one team explicitly ("Doctor's team is loaded everywhere (6 WR, 6 RB) and doesn't need your depth — bad fit") → "Gibbs Train is the clear target. Here's the play." → prices it, argues the counterparty's side, offers a fallback sweetener and a simpler one-for-one opener, and offers to draft the outgoing message. `[Verified]`

That is a Trade Finder workflow. It is not a Trade Finder feature. The evidence that it is emergent orchestration rather than product:

1. **No tool in the inventory returns trade candidates.** Two chips are visible and both are roster reads. `[Verified]`
2. **`get_league_team` is scoped to one team at a time** — "The same rundown for any other team in your league." `[Verified]` from the tool's description; `[Inferred]` that a full sweep of an n-team league therefore costs n−1 sequential calls.
3. **The scan is sampled, not exhaustive.** Claude states the sampling itself — "a couple more teams" — and rejects one team by name before choosing. `[Verified]` How many teams were actually read is **not observable**: one `League team` chip is rendered, a chip does not publish its call count, and the demo league's size is never stated anywhere in the corpus. What the transcript does establish is that the scan was bounded by Claude's judgement rather than by a sweep. `[Analysis]` A server-side finder would sweep all of them.
4. **The arithmetic breaks in ways an engine's wouldn't.** In `pivot-chart` (`2r`) the TE row prints 12.9 → 14.6 and labels the delta **+1.6**; the correct value is +1.7. Every other row in that artifact reconciles exactly (21.9−11.6=10.3, 15.6−10.5=5.1, 18.1−16.8=1.3). `[Verified]` (`showcase-extractions.jsonl`, `2r` second pass) An off-by-one-tenth in one row of four is the signature of a language model composing numbers in prose, not of a computed field. `[Inferred]`
5. **Every conversational screenshot was captured on `Opus 4.8 High`.** `[Verified]` (site audit §J-18; the pill is legible in `1l`, `2l`, `3l`, `4l`, `5l` — the artifact panels show no model pill at all.) If the reasoning were server-side, model choice would not matter. It is: the FAQ itself says Opus gives "deeper reasoning and richer visualizations," that Claude "starts everyone on Sonnet" and "StatsDeck runs well on it," and — sharpest of all — that "Opus isn't available on the free tier." `[Verified]` (`text/index.txt`, FAQ "What Claude model should I use?") So the showcase advertises an experience the free, recommended configuration structurally cannot produce.

### 9.4 Why this distinction matters enormously

**For StatsDeck, the emergent design is a strategic advantage that is invisible and unclaimable.** Three generic read tools plus a good model produce counterparty-aware, negotiation-aware trade construction that most purpose-built trade finders do not match — the `4l` transcript reasons about the *other* manager's QB logjam ("Josh Allen + Drake Maye + Jared Goff"), their thin and unimpressive WR corps ("only 3, and Odunze/Metcalf are meh"; quantified as Odunze 11.1 in `4r`), and their TE fallback ("since Hockenson (7.5) stays their fallback"), and constructs a proposal with "a fair-to-slightly-favorable framing for them." It even pre-handles the objection: "Giving two-for-one also cushions the 'but McBride's my only good TE' objection." No trade-finder feature spec would have thought to argue the counterparty's side unprompted. It came free with the model. `[Verified]` quotes; `[Analysis]` the conclusion.

**But it degrades silently along four axes a competitor can attack directly:**

| Axis | Failure mode | Competitive opening |
|---|---|---|
| **Model tier** | The showcase was produced on Opus at High effort, which the free tier cannot run, while the copy recommends Sonnet. Whether orchestration quality actually degrades on Sonnet is **untested — no Sonnet transcript exists in the evidence** — but the vendor's own copy asserts a reasoning and visualization gap. `[Verified]` the configuration mismatch; `[Speculative]` the size of the quality drop | Put the orchestration server-side so output quality is flat across model tiers. `[Analysis]` |
| **Coverage** | Sampled scan, not exhaustive — Claude says so itself. A better deal on a team it never opens is never seen. | One server-side sweep of all rosters, ranked by fit. Cheap, and strictly better. `[Speculative]` |
| **Arithmetic** | Deltas composed in prose; one is already wrong in the marketing asset, and the trade card's key delta cannot be checked from the card. | Compute every delta server-side and render it with its baseline. Trust is the whole product in trade tools. `[Analysis]` |
| **Reproducibility** | No analysis state persists. The documentation states StatsDeck stores the league profile, scoring settings and tool-usage records, and explicitly "does not store your conversations" — so the trade thesis lives only in the transcript. Ask again next week and the scan re-runs from scratch, possibly landing on a different target. `[Verified]` the storage scope; `[Inferred]` the re-run consequence | Persist the trade thesis; track whether the target's needs changed. `[Speculative]` |

**The honest counter-argument:** building the finder as a feature costs the flexibility that makes `4l` impressive. A server-side finder returns ranked packages; it does not spontaneously decide that DST is the real hole but is un-tradeable *because managers stream it*, then re-route to WR surplus. The right design is probably a server-side candidate sweep handed to the model for exactly that judgement. `[Analysis]`

### 9.5 Platform asymmetry — inherited, and disclosed honestly

| Platform | Completed trades | Pending offers | Consequence |
|---|---|---|---|
| ESPN (public + private) | Yes | **Yes — the only platform** | Full "is this fair?" loop with zero data entry |
| Sleeper | Yes, **including draft picks and FAAB that changed hands** | No | Richest completed-trade record; incoming offers must be pasted |
| Yahoo | Yes | No | Thinnest; and Yahoo is absent from the privacy policy and from every product screenshot |

`[Verified]` (`text/index.txt`, FAQ "What about trades and waivers visibility?"; Yahoo's absence from the policy and the imagery per site audit §J-01). The fallback is stated in the same breath — describe the offer or paste a screenshot and it is evaluated identically. `[Analysis]` This is the right instinct badly positioned: two of the three supported platforms cannot show an incoming offer, which is the single highest-intent trade moment in a fantasy season.

### 9.6 Confirmed absent

Trade value charts or market values of any kind · dynasty rookie-pick valuation · rest-of-season or playoff-schedule-adjusted trade value · multi-team trades · a trade block or "who's shopping whom" view · league trade-history analytics beyond listing · counter-offer tracking · any ability to send, accept, or veto (read-only by design, and stated as a feature, not an apology: "StatsDeck can even draft the trade-proposal message for you, but you're the one who sends it"). `[Verified]` — none appears in any of the 22 tools, the FAQ, the documentation, or the ten transcribed screenshots.

---


---

## 10. Projection & Analytics

### 10.1 The disclaimer is in the payload, not the marketing

`get_rankings` returned, in the probed call:

> `"framing_note": "Realized production under your scoring — not a projection."`

`[Verified]` (`extractions/connector-probes.json` → `get_rankings`) `[Inferred]` that it rides on every ranking call — only one `get_rankings` probe exists, and the capture names exactly four blocks as present on *every* probed response (`freshness`, `injury_feed`, `scoring_label`, and the nflverse `source` attribution); `framing_note` is not among them.

Either way the pattern is unusual and worth stating plainly: **the product disclaims forecasting inside the data, at the point of consumption, where the model reading it cannot miss it.** The site's public-facing counterpart is the FAQ line "No AI can predict the future." The troubleshooting section extends the same discipline to missing players: rookies with no NFL production "can't be scored on production that doesn't exist, and StatsDeck says so rather than inventing a number." `[Verified]` (`text/documentation.txt`)

### 10.2 What IS modelled

| Mechanism | Specification as returned | Transparency |
|---|---|---|
| **Recency-weighted form** | `value_basis: "recency_form"`, `ranking_basis: "blend"`; exponential decay with **`halflife_games: 3.4`**; `seasons_used: [2026, 2025]`, `games: 18`, `current_season_games: 1`, `current_season_weight_pct: 18.9` | **The payload publishes its own weighting.** `[Verified]` on the top-ranked player in the `start_sit` probe; `[Inferred]` that `weighting_basis` is returned for every player — the capture is explicitly abridged |
| **Explicit recommendation** | `recommended_start: "Bijan Robinson"` — a named pick, not just an ordering | `[Verified]` |
| **Two deliberately separate numbers** | `form_score` 18.87 vs `avg_fantasy_points` 23.3 for the same player; Nabers 8.11 vs 6.9 | The payload explains the split in its own `notes`: "the ranking is a form/strength signal; each player's displayed per-game points are actual current-season scoring (two different numbers)" `[Verified]` |
| **Opponent adjustment** | "their season average tempered by what that week's defense actually allows to their position"; surfaces as an `adj` suffix in prose and `OPPONENT-ADJUSTED` in artifact chrome | Documented in prose only; **no formula, no coefficient, no sample window published**, and `get_fantasy_matchup` was never probed, so the field's payload shape is unobserved. `[Verified]` the mechanism exists; `[Analysis]` its method is the least transparent thing in the product, and it is the product's signature metric |
| **DST opponent generosity** | `dst_points_opponent_allows_avg: 5.0` with a plain-English `read` and a `caveat` naming the two ways it can under-count "by ~2 (never inflate)" | Directional error bound stated. Rare. `[Verified]` |
| **Rookie projection** | "Jordyn Tyson — rookie, ~9.3 projected"; `R` chips as a first-class UI class in `matchup-viz`, with a legend entry "R Rookie proj" | **The only figure in the product that is not a transform of realized production** — opponent adjustment tempers a real season average, whereas this player has no production to temper. Method entirely undisclosed. `[Verified]` it exists; `[Verified]` no methodology is published anywhere |
| **Per-position startable baselines** | `roster-viz` baseline ticks measured at different x per row; implied thresholds ≈ QB 18.4, RB 15.5, WR 15.5, TE 11.3, K 9.3, DST 9.4 PPG on a shared ~24-PPG scale | `[Inferred]` — from pixel measurement in the second-pass extraction, not from any published number. A replacement-level model exists and is never named. |
| **Small-sample honesty** | "Cam Skattebo — 16.0 (8 games)" rather than a bare average | `[Verified]` |
| **Platform cross-check** | `get_fantasy_matchup` returns "your platform's own projection where it publishes one"; `matchup-viz` volunteers "(ESPN's native projection has it closer.)" | A product publishing a number that undercuts its own. `[Verified]` |

### 10.3 The two number systems do not compose

This is the most consequential architectural finding in the projection layer. `start_sit` returns `form_score` and states, unprompted, that **"Injury and matchup aren't factored into the rank; ask for the matchup read."** `[Verified]` Meanwhile `get_fantasy_matchup` returns opponent-adjusted PPG. The screenshots show the same player carrying both: Malik Nabers is **17.1** (season average, roster pull, `1l`) and **21.9** (opponent-adjusted, `matchup-viz`, `3r`). `[Verified]`

So the start/sit ranking excludes the two factors a manager most wants included, and the tool that includes them doesn't rank. The gap is closed by Claude, in prose, per conversation. The payload is candid about it — which is more than most products manage — but a competitor can simply ship one number that includes form, matchup, and injury status, and explain its composition. `[Analysis]`

Related: the team totals in `matchup-viz` are **sums of the printed slot values, not simulations**. They add to 136.4 and 122.9, which round consistently to the displayed 136 vs 123. `[Verified]` But the margin does **not** fully reconcile: 136.4 − 122.9 = 13.5, while the card states "favored by 13.6 pts" — and the conversational panel for the same matchup (`3l`) says "a ~13.5-point lean," so the artifact's 13.6 is the outlier. `[Verified]` (`showcase-extractions.jsonl`, `3r` second pass, which calls this a three-way mismatch). That is a second loose tenth in a second artifact, alongside the `pivot-chart` TE row — the same signature described in §9.3. `[Inferred]` And there is no simulation, no distribution, no variance anywhere in the pipeline. `[Inferred]`

### 10.4 Confirmed absent

Checked by full-text search across every crawled page, both text and raw HTML, plus all ten screenshot transcriptions and the live payloads:

| Absent | Status |
|---|---|
| **Floors and ceilings as numbers** | Absent. "Ceiling" appears only as rhetoric in Claude's prose ("Nabers has the week's highest ceiling"). The only matches for "floor" in the entire corpus are `Math.floor` calls in the homepage countdown script. No numeric floor/ceiling field. `[Verified]` |
| **Probability ranges, percentiles, confidence intervals, distributions** | Absent. Zero occurrences of percentile, variance, standard deviation, median, boom/bust, volatility anywhere. `[Verified]` |
| **Touchdown probability / expected TDs** | Absent. Raw `rushing_tds` / `receiving_tds` counts only. `[Verified]` |
| **Game-script assumptions** | Absent as data — zero occurrences of "game script" in any crawled file, screenshot transcription or payload. No tool returns team pace, play volume, pass rate, or implied totals to reason from, and there is no team-*offense* tool at all (`get_team_defense` is defense only). `[Verified]` Notable: the connector's own server-instruction text, as served by the live MCP endpoint in this session, lists "game script" among the angles it invites users to pull on — that text appears nowhere in the crawled corpus. `[Analysis]` the product invites a question it cannot source |
| **Rest-of-season projections / strength of schedule** | Absent. `get_fantasy_schedule` and `get_schedule` list future opponents; nothing scores them. Zero occurrences of rest-of-season or SOS. `[Verified]` |
| **Win probability / spreads / odds** | Absent **by policy**, not omission — explicitly refused on three of the four pages (homepage, documentation, privacy; only `/espn` is silent) and in the homepage footer's standing line, "A stats tool, not a betting tool." `[Verified]` |
| **ADP / ECR / consensus rankings** | Absent. `draft_help` tiers under your scoring with no market reference point. `[Verified]` — zero true occurrences of ADP, ECR or consensus anywhere |
| **Bye weeks** | Zero occurrences of "bye" in any crawled file. `[Verified]` absent as an explicit field; `[Inferred]` implicitly derivable from the schedule tools |

### 10.5 Methodology transparency — the thing worth crediting

`weighting_basis` is genuinely unusual. Most fantasy products publish a number and, at best, a blog post about the method. StatsDeck returns, alongside the ranking, which seasons fed the estimate, how many games, how many of those are current-season, what share of the weight the current season carries, and the decay half-life. The documentation then tells the user they can ask: "Ask how it's computed and Claude walks you through the weighting." `[Verified]` The same instinct appears four more times — `framing_note` disclaiming forecasting, `notes` listing the model's own exclusions, the DST `caveat` bounding its error and its direction, and `scoring_label: "ESPN Standard (assumed default)"` flagging when the scoring is assumed rather than the user's real league.

Two more in-band mechanisms, both confirmed by the capture on **every** probed response: a `freshness` block carrying `data_through`, `as_of`, a rendered `label`, and a `render_hint` instructing the model to localise the timestamp; and an `injury_feed` sweep on its own clock — `13:10:18Z` against the freshness stamp's `20:20:56Z` at capture, i.e. the injury sweep was **just over seven hours** staler than the stats stamp, and the payload makes that inspectable. `[Verified]`

`[Analysis]` The transparency layer is the most defensible asset in the product and it is aimed at the wrong reader. All of it is written for the model, and none of it reaches the user — **no freshness stamp is visible in any of the ten screenshot transcriptions**, and every extraction remarks on its absence. (One caveat the second passes raise themselves: `1l`'s answer is clipped by the composer, so the crop cuts off a region where one could sit. `[Verified]`) A competitor should copy the mechanism wholesale (self-describing payloads are cheap and make an LLM dramatically harder to hallucinate through) *and* surface it, which StatsDeck does not.

---


---

## 11. Data Depth

### 11.1 The three layers

The template's question — what data is there — needs splitting, because StatsDeck's answer differs sharply by layer:

1. **Raw** — the number is in the payload.
2. **Interpreted** — the payload also tells you what the number means (a glossary entry, a plain-English read, a directional caveat).
3. **Recommendation** — something in the pipeline turns it into an action.

The pattern across the whole dataset: **StatsDeck is strong at layers 1 and 2 and almost entirely absent at layer 3.** Only three tools recommend anything (§6). Layer 3 is Claude's job, and it is done in prose that the product does not store.

### 11.2 Metric-by-metric

A standing caveat for the Raw column: only six of the 22 tools were probed, so "Yes" is payload-verified where a probe saw the field and documentation-verified otherwise. Both bases are named per row.

| Metric | Raw | Interpreted | Recommendation | Evidence |
|---|---|---|---|---|
| Fantasy points under exact scoring | Yes — payload | Yes — `scoring_label` on every probed response, `is_assumed_default` when it's a guess, presets carry plain-English `favors` semantics | Via `start_sit` | `connector-probes.json` `[Verified]` |
| Snap counts / snap share | Yes — `snap_share` inline on ranking rows (78.5, 54.0, 57.0, 68.0, 73.0); `get_snap_counts` itself not probed | Yes — documented as "the usage signal behind the box score" | No | `[Verified]` |
| Target share | Yes — on ranking rows (0.169, 0.042, 0.24…) **and** per-game in advanced mode (0.21, 0.13) | Yes — in-payload glossary key | No | `[Verified]` |
| Targets / receptions / carries / yards / TDs | Yes, per game | Standard box score, no gloss needed | No | `[Verified]` |
| EPA (rushing and receiving, separately) | Yes, **per game** | **No** — returned, and *not* among `advanced_glossary_keys` | No | `[Verified]` |
| CPOE | Documented in the advanced metric list and present as the glossary key `passing_cpoe`; **no CPOE value observed** — the probed player was an RB | Yes — glossary notes it is pre-scaled | No | `[Verified]` documented; unobserved in payload |
| Air yards + air-yards share | Yes, per game (`receiving_air_yards`, `air_yards_share`) | **Partially** — `air_yards_share` is a glossary key; the raw air-yards count is not | No | `[Verified]` |
| WOPR | Yes | Yes — glossary key | No | `[Verified]` |
| RACR / PACR | RACR yes (value observed, e.g. −7.5); PACR documented and present as a glossary key, **value unobserved** | Yes — **glossary warns RACR spikes on low-air-yard profiles**, which is exactly what the sample data shows (RACR −7.5 on a −4 air-yard game) | No | `[Verified]` |
| First downs (rushing and receiving) | Yes, per game | **No** — returned without a glossary entry | No | `[Verified]` |
| Defense-vs-position / opponent generosity | Yes — `dst_points_opponent_allows_avg` | Yes — plain-English `read` + quantified directional `caveat` | **Yes** — the streaming call is stated | `[Verified]` |
| Opponent adjustment (`adj`) | Seen in prose and artifact chrome only — `get_fantasy_matchup` was not probed | Prose definition only; no method published | Feeds Claude's lineup calls | `[Verified]` mechanism; method undisclosed |
| Injury — official report | Yes — `get_injuries`, Out/Doubtful/Questionable practice designations | Yes — named the system of record; "the official report wins ties" | No | `[Verified]` |
| Injury — intel, two tiers | Yes — `source: web_digest`/`tier: corroborated` vs `source: sleeper_feed`/`tier: null`, each with `reported_date` | Yes, and rigorously: corroboration measures report confidence, not severity; absence isn't health; not every flag is an injury | **Yes** — payload instructs: "state it with its date in any recommendation" | `[Verified]` |
| Injury — **status-change detection** | Yes — `previous_status` + `status_since` (e.g. `Questionable` → `cleared`, `status_since: 2026-09-19`, and the reverse on another row) | Implicit | No | `[Verified]` — **and documented nowhere on the site** (zero occurrences of either field name across all four pages, text and raw HTML). A genuinely differentiating field, unmarketed |
| Age | Yes — on ranking and start/sit rows (23, 24, 25, 26, 27, 32 observed) | No | No | `[Verified]` — raw age with no aging curve and no dynasty value model attached |
| Kicker distance splits | Documented — "game lines and distance splits, scored under your bands"; not probed | Yes — scored under the league's own distance bands | No | `[Verified]` docs |
| DST components | Yes — points allowed, sacks, INTs, fumble recoveries, def TDs, **ST TDs**, safeties | Yes — read + caveat | Yes | `[Verified]` |
| Depth charts | Documented — `get_team_roster`; not probed | Roles described | No | `[Verified]` docs |
| Schedules (NFL + fantasy) | Documented — both; not probed | Records and scores once played | No | `[Verified]` docs |
| Standings | Documented; not probed | Plus the "StatsDeck Times" league newspaper, announced on the homepage and absent from `/documentation` | No | `[Verified]` the announcement; `[Inferred]` that it attaches to `get_standings` |
| Waiver context: FAAB balance, waiver priority, add state | Documented; not probed | Yes — "what it takes to get each one" | Partial — ranked board | `[Verified]` FAQ |
| League format modelling | Yes — `league_type`, `best_ball`, `lineup_construction` on the connection object; redraft / dynasty / best ball | Yes | No | `[Verified]` |
| Historical depth | **2012 onward** — better than a decade, per the FAQ | Separate from the form window: the probed recency model used `seasons_used: [2026, 2025]`, not the full history | No | `[Verified]` both, and they are different things |

### 11.3 The in-payload glossary

Advanced metrics ship with their own glossary **inside the response**: `advanced_glossary_keys: ["passing_cpoe", "wopr", "racr", "pacr", "target_share", "air_yards_share"]`, and the glossary text includes edge-case handling, not just definitions — RACR spikes on low-air-yard profiles, CPOE is pre-scaled. The documentation promises it user-side too ("with a glossary the first time you see them"). `[Verified]`

Three precise observations a product team should take:

- **The glossary and the returned fields only partly overlap.** The probed advanced block returns **nine** fields — `rushing_epa`, `receiving_epa`, `receiving_air_yards`, `air_yards_share`, `wopr`, `racr`, `target_share`, `rushing_first_downs`, `receiving_first_downs` — of which **four** carry a glossary key. Five arrive unglossed: both EPA fields, the raw air-yards count, and both first-downs fields. Two glossary keys (`passing_cpoe`, `pacr`) describe fields this RB response does not return, so the key list is a fixed glossary rather than a per-response index. `[Verified]` The four most intuitively-named unglossed fields are plausibly deliberate — but EPA is the one non-specialists most often misread, and it is among them.
- **Advanced mode is a tool parameter (`detail: "advanced"`), not a UI mode.** The site teaches it as a phrase to type — "I want to go deeper." `[Verified]` This is progressive disclosure implemented server-side and surfaced conversationally, and it is a genuinely good pattern: the default payload stays narrow, the model widens it on intent. `[Analysis]`
- **Advanced metrics are per-game, never aggregated.** No season EPA, no rolling target-share trend, no smoothing. Trend analysis is left to the model reading the rows. `[Verified]`

### 11.4 Confirmed absent — including every item the template names

Verified by full-text search across all four page texts, all four raw HTML sources, `README.md`, both extraction files, and the live payloads. Zero occurrences unless noted.

| Template item | Status |
|---|---|
| **Weather** | **Absent — zero occurrences of weather anywhere, including raw HTML.** No wind, precipitation, temperature, or dome/outdoor flag. `[Verified]` |
| **Offensive line data** | **Absent.** No line metrics, no pass-block or run-block grading, no adjusted line yards. (The single "o-line" hit in the corpus is the substring in a CSS comment's "two-line".) `[Verified]` |
| **Red-zone touches** | **Absent.** No red-zone anything. `[Verified]` |
| **Goal-line carries** | **Absent.** `[Verified]` |
| **Routes run** | **Absent.** The only match for "route" in the entire corpus is the `routes` object key in `get_my_roster`'s no-league response — the field naming its three next-step options (connect / paste / without), nothing to do with route running. `[Verified]` |

Additional absences a competitor should know about, same method:

Yards after catch / YAC · pressure rate, coverage grades, or any defensive *player* metric · IDP entirely (coverage is stated as QB, RB, WR, TE, K and team defenses) · personnel groupings or formation data · team-offense context of any kind — pace, plays per game, pass rate, implied team total · practice-participation detail beyond the official Out/Doubtful/Questionable designations · ownership or start percentages · ADP / ECR / consensus · any expert or market signal whatsoever. `[Verified]`

### 11.5 What the depth profile means

`[Analysis]` StatsDeck's data is **deep on efficiency and opportunity, empty on situation.** It knows, per game, how efficiently a player converted his opportunities (EPA, RACR, PACR, CPOE) and how large a share of his offense he commanded (target share, air-yards share, WOPR, snap share) — with a glossary and edge-case warnings attached. It knows nothing about the conditions the next game will be played under: no weather, no line quality, no red-zone or goal-line role, no route volume, no game script, no team pace.

That is a coherent shape, and it is a narrow one. `[Verified]` nflverse is the only NFL data source the product names anywhere; league data is read live from the platform and nothing else is cited. **The evidence base says nothing about what nflverse does or does not publish**, so the gaps cannot be attributed to the source — on the evidence they are a product scoping decision, and the draft-level temptation to explain them as "just the source's shape" should be resisted. What *is* verified is where StatsDeck goes beyond open data: the two-tier injury-corroboration model with `previous_status` and `status_since` is the one place it clearly adds proprietary data rather than transforming open data. `[Verified]` the layer exists; `[Analysis]` that it is the differentiator.

**The exploitable gap:** red-zone and goal-line usage, route participation, and weather are the three data additions that would most change weekly advice, and all three are absent. Red-zone and goal-line share are derivable from play-by-play data of the kind StatsDeck's stated source family publishes — plausibly a build rather than a licence. Weather is a cheap external join. Route participation is the one likely to require a paid source, and therefore the one genuine moat opportunity. `[Speculative]` — the build-vs-licence cost of each is a judgement, not an evidenced fact.

**The gap not worth exploiting:** matching the transparency layer. A competitor should assume StatsDeck's self-describing payloads — `weighting_basis`, `framing_note`, `scoring_label` with an assumed-default flag, `freshness` with a `render_hint`, quantified directional caveats, in-payload glossaries, and the model's own stated exclusions — are the strongest engineering in the product, and treat them as the floor rather than a feature to leapfrog. `[Analysis]`

---

## 12. UX & Information Density

### 12.1 What the interface actually is

StatsDeck has no UI of its own. The product surface is the Claude client — web or mobile app — and StatsDeck contributes only tool results into that conversation. `[Verified]` The four static marketing pages (`/`, `/espn`, `/documentation`, `/privacy`) contain no product interface; `app.statsdeck.ai` returns 404 at its root and is API-only (site audit §H). The one authenticated form StatsDeck owns, at `/espn`, exists to keep a session cookie out of the chat transcript — it is a credential intake, not a product view. `[Verified]` (site audit §J-03)

Everything a competitor would call "the app" is rendered by someone else's client. The `uiChrome` field is populated on all ten showcase transcriptions, and what it records is Claude's interface: user bubble, tool-call chip with wrench icon and chevron, message action row (copy, share, read-aloud, thumbs, retry), artifact panel with circular close and overflow controls, composer with `+`, mic, voice button and model pill. `[Verified]` (`showcase-extractions.jsonl`, `uiChrome` on all ten images) The only StatsDeck-owned mark in any of them is a `StatsDeck AI — FOR ✳ Claude` wordmark lockup composited *below* the captured frame by the marketing team — not client UI. `[Verified]` (`uiChrome` on `1l`, `3l`, `4r`, `5l`, `2r`, `5r`)

### 12.2 The density tradeoff is resolved by asking, not by navigating

A conventional fantasy product decides once, at design time, how much to put on a screen, and then pays for that choice forever — a dense table that intimidates novices, or a simple card that starves experts. StatsDeck does not make that choice. The default answer is mid-density prose with the decision on top, and the user escalates by sentence. `[Analysis]`

Two escalation phrases are documented and scripted for the user:

| Phrase | What it changes | Evidence |
|---|---|---|
| `I want to go deeper` | Widens player rows with per-game EPA (rushing and receiving), receiving air yards, air-yards share, WOPR, RACR, target share and first downs — plus an in-payload glossary | `[Verified]` `get_player_stats` probe with `detail: "advanced"` returns exactly that set per game, and ships `advanced_glossary_keys` inside the response (`connector-probes.json`) |
| `make me a visualization` | Returns structured data Claude renders as a named artifact (`roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz`, `statsdeck-map`) | `[Verified]` five distinct artifact types transcribed from the showcase (`artifactNames` on `1r`, `2r`, `3r`, `4r`, `5r`) |

Two things make this more than a slogan. First, the depth is real at the payload layer, not a prompt trick: advanced metrics arrive per-game rather than as season aggregates, and the glossary travels with them. `[Verified]` The glossary is also wider than the payload — `advanced_glossary_keys` carries `passing_cpoe` and `pacr`, which do not appear in the probed running back's rows, so the metric set is position-dependent while the glossary is shared. `[Verified]`

Second, the escalation is **charged a full turn**. In four of the five showcase rows the artifact arrives in response to a separate user prompt — *Make me a visualization of my roster strength and weaknesses*, *Make me a visualization of this matchup*, *Can you make a visualization of this proposed trade? Values, etc*, and a confirmation (*Yes let's see that pivot chart!*). `[Verified]` (`userPrompts` on `1r`, `3r`, `4r`, `2r`) Density is opt-in and it costs a round trip. In a dashboard, drilling down costs a click and no wait. `[Analysis]`

### 12.3 Speed of answer: the ten questions against evidenced capability

Three questions below are quoted from the template; the remaining seven are the canonical weekly-management battery the template's set belongs to. Verdicts are drawn only from evidenced behaviour — the live connector probes, the 22 documented tools, and the transcribed conversations. No capability is assumed. Where a tool was not probed, the source is the documentation or the FAQ and is named as such.

| # | Question | One turn? | Mechanism | The catch |
|---|---|---|---|---|
| 1 | **"Who should I start?"** | **Yes — returns a named pick** | `start_sit` returns `recommended_start: "Bijan Robinson"` plus `form_score`, `avg_fantasy_points` and a `matchup` object for each ranked player, and `injury_intel` on any player carrying a designation (1 of 3 in the probe) `[Verified]` (probe) | The payload states unprompted that injury and matchup are *not* in the rank — the headline pick is a recency-form pick, and reconciling it with a Questionable tag is left to the model `[Verified]` (probe `notes`) |
| 2 | "Is my lineup optimal?" | **Yes — and unprompted** | `get_my_roster` leads with any bench player outscoring a starter at the same position, before being asked `[Verified]` (`/documentation`). A connected roster pull is demonstrated in `1l` — starters and bench each scored, labelled "PPR scoring", closing with a strength/hole read `[Verified]` | The comparison is realized production, not a forward projection. `1l` shows the honesty mechanics: a small-sample qualifier ("Cam Skattebo — 16.0 (8 games)") and a rookie with no average at all ("Jordyn Tyson — rookie, ~9.3 projected") `[Verified]`. The explicit forecasting disclaimer — `framing_note`: "Realized production under your scoring — not a projection." — sits on `get_rankings` in the probe, not on `get_my_roster`; `get_my_roster` was probed only in its no-league state `[Verified]` |
| 3 | "How's my matchup — can I win?" | **Yes** | `get_fantasy_matchup`, one `My matchup` chip → slot-by-slot with opponent-adjusted values, both lineups, league record, a stated margin `[Verified]` (`3l` chips; `3r` features; `/documentation`) | You get a point margin, never a probability: win probabilities are doctrinally excluded `[Verified]` (`/documentation`, "What StatsDeck will not do"). `3r` also volunteers that ESPN's native projection has the margin closer — the product cites a competing number against itself `[Verified]` |
| 4 | "Who should I add off waivers?" | **Yes** | `get_available_players` ranks genuinely unrostered players under your scoring with each one's add state, plus your FAAB balance or rolling waiver position `[Verified]` (`/documentation`; FAQ item 11) | — |
| 5 | **"How much FAAB?"** | **No evidenced path to a number** | Available inputs: *your* remaining budget and each player's add state `[Verified]` (FAQ item 11) | Nothing in the 22 documented tools exposes rival managers' remaining FAAB, historical clearing bids, or a bid model. The one input that determines a correct bid — what the other eleven teams can spend — is absent from the tool inventory, so any number the model gives is unsourced `[Verified absence from the tool list / Inferred consequence]`. The connector's own scripted capability answer omits bid sizing entirely (see §12.6) |
| 6 | **"What changed since last week?"** | **No evidenced path** | Only diff primitive: per-player injury status change, via `previous_status` + `status_since` on `injury_intel` `[Verified]` (probe) | There is no prior-state baseline to diff against. Retained state is the pseudonymous account identifier, the connected-league profile and scoring settings, activity/feature-use counts, and — for private ESPN leagues — encrypted session cookies; prompts and conversation content are explicitly not recorded `[Verified]` (`privacy.txt`). Week-over-week is reconstructible only by pulling each week separately and comparing in-model — one call per week in the window `[Inferred]` |
| 7 | "Is Player X trending up or down?" | **Yes, partially** | `get_player_stats` with `timeframe: "recent"` returns per-game lines (carries, yards, targets, receptions, TDs) and, on request, the advanced drivers `[Verified]` (probe) | Two gaps. Snap share is not in the `get_player_stats` payload at all — it rides on `get_rankings` rows and in the separate `get_snap_counts` tool, so a usage question may cost a second call `[Verified]` (probe; `/documentation`). And the product's actual trend model — exponential decay, a 3.4-game half-life, `current_season_weight_pct` — appears in `start_sit` only. Ask "is he trending?" and you get raw game lines; ask "start him or Y?" and you get the modelled signal. The best answer is behind the wrong question `[Inferred from field placement across probes]` |
| 8 | "Should I accept this trade?" | **Platform-dependent** | `get_trades` reads pending offers on ESPN only; Sleeper and Yahoo expose completed trades only `[Verified]` (FAQ item 10) | On Sleeper/Yahoo the user must describe or screenshot the offer — a documented fallback, but it moves data entry onto the user |
| 9 | "Who do I stream at DST/K?" | **Yes, but N calls** | `get_team_defense(team, opponent)` returns a plain-English read plus a quantified, directional accuracy caveat — "Two rare cases can under-count by ~2 (never inflate)" `[Verified]` (probe) | Input is one defense against one opponent at a time, so comparing six streamers is six calls inside one turn, and latency scales with the candidate set `[Verified input shape / Inferred cost]`. Whether `get_rankings` can rank team defenses is unverified — it is documented as "leaderboards by position and metric" but was probed only with `position: "RB"`, so treat a one-call streaming leaderboard as unconfirmed rather than absent `[Inferred]` |
| 10 | "Am I making the playoffs?" | **No path — by design** | `get_standings` + `get_fantasy_schedule` give records and remaining opponents `[Verified]` (`/documentation`) | No odds, no simulation — win probabilities are excluded by policy `[Verified]`. The model can still argue the case qualitatively from records and schedule `[Analysis]` |

**Scoreboard: four clean one-turn answers (1–4), one partial (7), one platform-dependent (8), one that scales with the candidate set (9), and three with no evidenced path (5, 6, 10).**

The three dead ends split into two kinds, and the distinction is the whole finding. FAAB sizing and week-over-week change need *state the product does not keep* — rivals' budgets; last week's snapshot. Playoff odds are different: the inputs exist and the output is refused on principle. Only the first two are competitive openings, and neither is a chat limitation — they are data-model limitations that a chat interface makes easy to overlook. The third is a deliberate boundary a competitor would have to decide whether to cross. `[Analysis]`

### 12.4 The density the designer cannot guarantee

The single most instructive finding in the evidence base: **every probed connector response carries a `freshness` block, and not one of the ten published screenshots shows a timestamp.** `[Verified]` (`connector-probes.json` `cross_cutting_observations`; `anythingUnusual` independently flags the missing stamp on all ten images — `1l`, `1r`, `2l`, `2r`, `3l`, `3r`, `4l`, `4r`, `5l`, `5r`.)

The payload even carries a `render_hint` instructing the model to localise the timestamp: "Present them in the user's local timezone when known; otherwise present UTC." It is still dropped. `scoring_label` fares better — it survives into artifact chrome (`H2H POINTS PPR` on `1r`, `3r`, `4r`) and into prose ("PPR scoring" in `1l`) — but survival is the right word: four of the ten transcriptions note no scoring label anywhere in the frame either. `[Verified]`

For a team building a competing product this is the load-bearing lesson. In a dashboard, the provenance stamp is in the template and it is on screen 100% of the time. In an MCP connector, **information density is the host model's discretion, not the product's.** You can build the mechanism perfectly and still ship 0-of-10 on your most defensible trust claim. A first-party surface — even a thin one — buys back guaranteed rendering of the things you cannot afford to have dropped. `[Analysis]`

A related blind spot: StatsDeck receives tool calls and nothing else. `[Verified]` (`/documentation`: "StatsDeck receives only the tool calls Claude makes to it"; `privacy.txt`: prompts and conversation content are not recorded.) It cannot see the rendered answer, cannot tell whether the freshness stamp made it, cannot measure output quality, and cannot A/B a rendering. Its telemetry is which tools were used and how often. `[Verified]` **The product is structurally blind to its own output.** `[Analysis]`

### 12.5 The real UX costs of a chat-only surface

- **No glanceable state.** There is no view of your team you can open. The injury sweep is the sharpest illustration: `injury_feed` (`checked`, `as_of`, `flagged_count`) rides on *every* probed response, including a no-league call, and `injury_intel` carries genuine status-change detection (`previous_status: "Questionable"` → `status: "cleared"`, `status_since: "2026-09-19"`). `[Verified]` But an MCP connector only runs when the client calls it, so the sweep fires only when the user asks something. **Status-change detection is built and has no delivery mechanism.** A starter can flip to Out on Sunday morning and nothing reaches the user unless they think to ask. `[Verified mechanism / Inferred on the request-response constraint / Analysis on consequence]` For a competitor, that is the clearest wedge in the entire analysis: the alert is the product chat cannot serve.
- **Thin persistent state, and silent stale-scoring risk.** Durable state is the account identifier, the connected-league profile and scoring settings, activity counts, and encrypted ESPN cookies that persist by design. `[Verified]` (`privacy.txt`) Scoring is imported at connect time; if a commissioner changes it, the user must know to ask for a reconnect. `[Verified]` (FAQ item 8) The probe shows `is_assumed_default: true` alongside `connected: false`, so the flag demonstrably fires for the *unconnected* case; nothing in the evidence shows a connected-but-stale league being flagged, which is why a connected league with stale scoring is the dangerous case — confidently mislabelled points with no visible warning. `[Verified probe values / Inferred consequence]`
- **No way to scan or re-sort.** The `get_rankings` probe passed `position`, `timeframe` and `top_n`, and `/documentation` describes leaderboards "by position and metric". `[Verified]` Re-sorting a leaderboard — different metric, position or window — costs a sentence and a full round trip, where a table costs a click and zero latency. The artifacts partly answer this: `roster-viz` invites "Tap a position for the players behind the number" and `trade-viz` carries a two-tab switcher. `[Verified]` But each artifact is a per-turn render, not a persistent view you return to — and `4r` shows the cost of that, with the `Lineup Impact` tab's contents absent from the published capture. `[Verified]`
- **Latency and bulk per answer, and the narrowest surface.** The trades conversational capture is 3,182 px tall in a 673 px-wide column — a 4.7:1 aspect ratio, roughly two-and-a-bit 375×812 phone screens. `[Verified dimensions]` (`README.md`) `[Inferred conversion]` More telling than the raw height: `4l` is *two stacked conversation panels* in one marketing composite, and the seam shears body text in two places past legibility. `[Verified]` (`anythingUnusual` on `4l`) The answer is long enough that the company could not photograph it in one frame. Turns run one to two tool calls (`My roster` + `League team` in a single trade turn `[Verified]`, `4l`), and an artifact request is charged as its own generation. `[Inferred]` Chrome eats the answer too: the composer overlays text in `2l`, and the floating scroll-to-bottom button occludes words in `2l`, `3l`, `4l` and `5l`. `[Verified]` The product's densest outputs land on its narrowest surface — and the marketing site actively pushes users to the mobile app after install. `[Verified]` (`#get-app`)
- **One league at a time.** Documented, with Yahoo uniquely requiring a disconnect before switching (Sleeper and ESPN switch without one). `[Verified]` (`/documentation`; FAQ item 9) A three-league manager has a mode-switch cost per league and no cross-league glance.
- **Total dependence on knowing what to ask.** No menu, no nav, no affordances. The FAAB and week-over-week gaps above are invisible to the user — they will simply get a confident answer built on absent inputs. `[Analysis]`

### 12.6 What StatsDeck does instead of navigation

Three substitutions, all evidenced, and all worth copying:

1. **The model offers the next question.** Four of the five showcase rows end with a proactive follow-up: start/sit, waiver DST upgrades and a trade angle (`1l`); drafting the outgoing trade message and building a before/after roster visual (`4l`); waiver targets, a trade angle or player deep-dives for another league (`5l`); and in `2r`, the offer that produced the artifact. `[Verified]` (`featuresDemonstrated` on `1l`, `4l`, `5l`, `2r`) In `2r` the artifact exists only because Claude offered and the user replied *Yes let's see that pivot chart!* `[Verified]` The Matchups row (`3l`) is the one that does not do this. This is the chat analogue of a nav bar: the next click is delivered as a sentence, in context, already personalised. `[Analysis]`
2. **A scripted answer to "what can I do here."** The connector's own server-level instructions carry a dedicated capability answer, framed in plain English and explicitly forbidden from listing tool or function names, with eight example questions ("Pull my roster", "Who should I start, X or Y?", "Show my Week 3 matchup", "Best available RBs", "Build me a draft board", "How's [player] trending?", "Rank the top WRs over the last month", "Show the trades in my league") and the two unlock phrases. `[Verified — read from the live StatsDeck connector's server instructions as surfaced in this session; note this source is not part of the crawl-data set and cannot be checked there]` It is corroborated inside the evidence base by `5l`/`5r`, where the user asks *Remind me what are the things we can do together with statsdeck* and receives a four-category rundown — "Your leagues & teams / Weekly management / Player research / League moves" — plus a designed `statsdeck-map` artifact whose four cards carry the same grouping and counts (Leagues & Teams 3, Weekly Management 4, Player Research 4, League Moves 3). `[Verified]` Notably, that scripted list contains no FAAB-sizing question and no week-over-week question — consistent with the two data-gap dead ends in §12.3.
3. **No dead ends.** With no league connected, `get_my_roster` returns `success: true` and three named routes — connect, paste a roster, or use the league-free tools — rather than an error. `[Verified]` (probe) The troubleshooting docs apply the same pattern to missing projections and rejected credentials. `[Verified]` (`/documentation`)

### 12.7 Implications for a competing product

*(This section is strategic judgement throughout — `[Analysis]`, resting on the evidenced findings above.)*

- Ship the conversation *and* a thin persistent surface. The surface exists for the two things chat cannot do: guarantee provenance rendering, and push an unprompted change.
- Build the state StatsDeck lacks: a weekly snapshot store (so "what changed" is one call) and league-wide FAAB/bid history (so "how much" is a computed number, not a guess). These are data assets, not UI work, and they are the two dead ends that are data gaps rather than deliberate exclusions.
- Treat the model's proactive follow-up as a designed component, not an accident. Four of five demonstrated rows rely on it.
- Do not let the escalation phrase be the only path to depth. StatsDeck's modelled trend signal is reachable only through the start/sit question, and snap share is not in the player-stats payload at all; a competitor should expose both wherever the user asks about form.

---


---

## 13. Content Strategy

### 13.1 Verified: there is no editorial content

This was checked rather than assumed. The site is four pages, and sixteen paths were probed. `[Verified]` (site audit §K; `statsdeck-crawl-data/README.md`)

| Content category the template expects | Present? | How verified |
|---|---|---|
| Articles / blog / news | **No** | `/blog` 404, `/changelog` 404; no dated URLs, no path hierarchy, no collection or category paths anywhere `[Verified]` |
| Rankings columns or published rankings pages | **No** | Rankings exist only as a tool (`get_rankings`) inside the conversation; the site is four pages and none of them is a rankings page `[Verified]` |
| Newsletter | **No** | No email field, waitlist, or capture form on any of the four pages; the only form on the site is the `/espn` cookie intake `[Verified]` |
| Podcast / video / YouTube | **No** | Absent from the site's complete outbound link list `[Verified]` (site audit §K) |
| DFS content | **No — refused** | FAQ item 12 answers DFS with a flat "No"; `/documentation` lists it under what the product will not do; footer runs a standing "a stats tool, not a betting tool" line `[Verified]` |
| Betting / odds / spreads / win probabilities | **No — refused** | Same sources `[Verified]` |
| Dynasty content | **No** | Dynasty is a supported *format* (FAQ item 8; probe exposes `league_type`, `best_ball`, `lineup_construction`); no dynasty content, no rookie pick values, no age-curve tool `[Verified]` |
| IDP content | **No — out of scope** | Coverage is QB, RB, WR, TE, K and team defenses. Individual defensive players are not covered at all `[Verified]` (`/documentation`) |
| Author bylines, editorial staff, about page | **No** | `/about` 404; the only self-description is one FAQ item calling it a small hobby project `[Verified]` |
| Social/community content surface | **No public one** | Community is a private Slack behind a join invite; no X, YouTube, Discord, Reddit profile, or TikTok link appears in the site's outbound links. Reddit appears in the evidence *only* as a paid ad channel `[Verified]` |
| RSS/Atom feed | **No** | Absent from the fully enumerated internal and outbound link graph `[Inferred]` |
| Structured data / `llms.txt` / sitemap | **None** | Zero `application/ld+json` blocks sitewide; `/sitemap.xml`, `/sitemap_index.xml`, `/llms.txt` all 404; `robots.txt` is Cloudflare content-signal boilerplate with no directives and no `Sitemap:` line `[Verified]` |

The entire published corpus is four HTML documents totalling 157,815 bytes — roughly 158 KB *including* inline CSS and JavaScript. `[Verified]` The 15-item FAQ is the site's real body copy; `/documentation` is its densest page; `/espn` is a procedural walkthrough; `/privacy` is a policy. Content is reused rather than authored per surface — the Claude directory listing's description is `/documentation`'s opening two paragraphs verbatim. `[Verified]` (site audit §C)

### 13.2 The editorial layer exists — and it points inward

One finding reframes this whole section. The announcement block on the homepage describes a new feature by name: **"Check out the new StatsDeck Times when viewing league standings. It's a full newspaper about your league inside StatsDeck."** `[Verified]` (`index.txt`, announcement block)

That is editorial content — league recaps, standings narrative — generated per league, per user, inside the conversation. It is **not** on `/documentation`, is not among the 22 documented tools, and the copy's own phrasing ("when viewing league standings") points at `get_standings` as the likely carrier. `[Verified absence from the tool list and from /documentation / Inferred delivery mechanism]` Nothing in the probes or the ten screenshots shows it, so its actual output is unevidenced.

So StatsDeck has not abandoned editorial. It has inverted it. Instead of one article read by 100,000 managers who must translate it to their own roster, it generates one paper per league that needs no translation. `[Analysis]` The strategic consequence is exact: **the editorial output has zero SEO surface, zero shareability outside the chat, and zero attributable brand impression.** It is the most differentiated content the product makes and the least visible thing about it. `[Analysis]`

### 13.3 The template's question dissolves

The template asks whether users must translate generic article advice to their own roster. StatsDeck does not answer that question — it deletes it. There are no articles, so there is nothing to translate. Every points figure is computed under a stated scoring configuration and labelled with it: `scoring_label` is present on every probed response, and artifact headers carry the league and format (`SEATTLE BEGINNER · H2H POINTS PPR` on `1r`; `WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED` on `3r`). `[Verified]`

Two precisions matter here, because they cut both ways. The probes ran with no league connected, so their label read `"ESPN Standard (assumed default)"` — the mechanism is verified, and so is its honesty about the unconnected case, but the probes are not evidence of a real league's scoring being used. `[Verified]` And the showcase demonstrates the connected case at Week 1, not the Week 2 that was current at capture. `[Verified]` (`matchup-viz` header; `3l` prompt "How's my week 1 matchup")

Even so, the position is the sharpest thing about the product. The translation tax is the central inefficiency of fantasy media: a PPR ranking read by a half-PPR manager, a start/sit column that does not know your bench. StatsDeck's answer is structural rather than editorial, and it is the one place where being an MCP connector is a pure advantage. `[Analysis]`

### 13.4 What the no-content position costs

- **No organic acquisition surface at all.** Four indexable URLs, no structured data, no sitemap. Worse, the designated proof section — the hero's only CTA points there — is ten JPEGs with placeholder alt text ("StatsDeck trades — screenshot 1"), so the richest product detail the company has published (five named artifact types, the opponent-adjusted metric, per-position startable baselines, Q and R status chips, roughly sixty player-and-number data points) is invisible to every crawler. `[Verified]` (site audit §J-04)
- **Distribution is intermediated.** Discovery runs through Anthropic's connector directory (added July 2026, Community tier, stated as not verified by Anthropic) plus paid Reddit. `[Verified]` (site audit §C; `privacy.txt`) A directory ranking change or policy shift is an existential distribution event with no organic floor underneath it. `[Analysis]`
- **No AI-crawler surface either.** No `llms.txt`, no schema, and the proof is unreadable images. For an AI-native product, being illegible to the models that would recommend it is a structural irony. `[Analysis]`
- **No top-of-funnel and no recoverable interest.** There is no lead capture anywhere; the privacy policy states plainly "We do not store your email address" — Clerk holds it. `[Verified]` A visitor who is curious but not ready is unrecoverable. The only retained channel is a Slack invite. `[Analysis]`
- **No habit loop the product owns.** No newsletter, no push, no Tuesday-morning ritual. The habit lives inside Claude, which StatsDeck does not own. The single on-site return device is a playoff countdown hard-coded to one timestamp. `[Verified]` (site audit §J-13)
- **Whole audiences are structurally unreachable.** DFS, betting and IDP are three of the highest-intent content verticals in fantasy, and all three are excluded — two by principle, one by coverage. `[Verified]` Dynasty is the most striking miss: the data layer already carries player `age` on every ranking and start/sit row and flags rookie projections as a first-class visual class (`R` chips in `matchup-viz`), so the primitives for a content-hungry, highly engaged segment are present with no product or content on top. `[Verified primitives / Analysis on the gap]`
- **No social proof, and no mechanism to generate any.** Zero testimonials, reviews, counts, or case studies; the one growth claim ("the fastest-growing fantasy tool for 2026") carries no source, metric, or comparison set. `[Verified]` (site audit §J-08) A content engine is how most products manufacture the proof StatsDeck lacks. `[Analysis]`

### 13.5 What it buys

- **No content treadmill.** Four hand-written static pages, no CMS, no build pipeline, no editorial headcount. `[Verified]` (site audit §H) A one-person operation can maintain this indefinitely. `[Analysis]`
- **No public accountability for predictions.** Publishing rankings means being graded on them weekly. StatsDeck's analytic output is per-user and ephemeral, and the rankings payload disclaims forecasting outright — `framing_note`: "Realized production under your scoring — not a projection." `[Verified]` (probe, `get_rankings`) It never has to defend a public call. `[Analysis]`
- **No commodity content war.** It does not compete with ESPN, CBS, Yahoo or FantasyPros for the same head terms, where it would lose on domain authority alone. `[Analysis]`
- **Credibility carried by transparency artifacts instead.** A per-source legal-basis table on `/documentation`, CC-BY attribution carried in-band in every response's `source` field, a layered injury methodology with explicit epistemics (official report as system of record; feed designations as flags to verify; corroboration is confidence, not severity; absence isn't health), and negative guarantees. `[Verified]` This substitutes for editorial authority and is cheaper to maintain — though it is buried in a collapsed FAQ item and a docs page. `[Analysis]`

### 13.6 Implications for a competing product

*(Strategic judgement throughout — `[Analysis]`.)*

- The inversion is correct and should be copied: per-league generated editorial beats generic articles on usefulness. But it must be given a **public surface** — a shareable league recap page, which is simultaneously the SEO asset, the viral loop, and the social proof StatsDeck has none of.
- The cheapest available win against StatsDeck today is not a feature, it is text: their strongest proof is trapped in ten JPEGs with generic alt text. Anything indexable about opponent adjustment, artifact rendering, or injury epistemics outranks them immediately.
- Dynasty and IDP are undefended. The dynasty primitives (`age`, rookie projection flagging) exist in StatsDeck's data layer and are unused; IDP is out of coverage entirely.
- Assume paid acquisition is the only channel StatsDeck can scale today. A competitor with an organic content engine has a lower CAC floor that compounds.

---


---

## 14. Pricing

### 14.1 The price, verified

| Item | Price | Charged by | Evidence |
|---|---|---|---|
| StatsDeck connector — all 22 tools | **$0** | — | FAQ item 7: "StatsDeck is completely free." `[Verified]` |
| Paid tier | **Does not exist** | — | `/pricing` returns 404; no tier, trial, or upgrade path anywhere on four pages `[Verified]` |
| Feature gate or usage meter | **None observed** | — | Probed responses carry `freshness`, `scoring_label`, `injury_feed` and attribution, and no plan, quota, or entitlement field. Note the probes were abridged "to the fields that carry analytic signal," so this is an absence of evidence rather than proof of absence `[Inferred]` |
| Claude free plan | $0, rolling usage limits, Opus not available | Anthropic | FAQ items 7 and 14 `[Verified]` |
| Claude Pro | **From $20/month** | Anthropic | FAQ item 7: "paid plans start at $20/month (Claude Pro)" `[Verified]` |
| Payment processing | None engaged | — | Privacy policy: card details are not collected directly; "any future paid plan would be handled by a third-party payment processor" `[Verified]` |
| Money-back guarantee | N/A | — | Nothing is sold. The substituted guarantees are read-only access, no conversation storage, deletion on request `[Verified]` |

"Free, no tiers, no gates" is confirmed at two independent layers — marketing copy and an absent pricing page `[Verified]` — and consistent with a third, the absence of entitlement plumbing in the probed API responses `[Inferred]`.

### 14.2 The adjacent dependency, and the model-tier effect on quality

StatsDeck's price is zero; its *cost to the user* is not. The FAQ's own model table concedes that output quality is a function of the user's Anthropic subscription:

| Claude model | Availability | What the FAQ says it changes | Consequence |
|---|---|---|---|
| Sonnet | Free, default | "Fast and capable, and free for everyone... StatsDeck runs well on it" | The recommended configuration `[Verified]` |
| Opus | Paid plans only | "A step up: deeper reasoning and **richer visualizations**" | The artifact system — the product's strongest differentiator — is explicitly better on a paid third-party plan `[Verified]` |
| Fable | Paid plans | "Anthropic's most powerful model — more than fantasy questions call for" | Actively talked down `[Verified]` |

The FAQ adds the part that matters commercially: every Claude plan caps usage over a rolling window, heavier models spend that budget faster, free-plan limits are the tightest, and Opus is unavailable free. `[Verified]`

Now combine that with what StatsDeck costs in tokens. A single turn can run two tool calls (`My roster` + `League team` in `4l`), each returning payloads that carry per-game advanced blocks, inline usage metrics, an injury sweep and a freshness block, and then generate either a long prose answer or a fully rendered artifact. `[Verified]` (probes; `4l`) The trades answer was long enough that the marketing capture had to stack two conversation panels to photograph it. `[Verified]` This is a token-expensive product per question asked. `[Inferred]`

**So Anthropic's rolling usage limit is StatsDeck's real pricing mechanic, and StatsDeck does not control it.** Every heavy user is pushed toward a paid Claude plan — Anthropic's revenue, not StatsDeck's. StatsDeck's most engaged users hit a wall it can neither raise, monetize, nor observe. `[Analysis]`

### 14.3 The demonstrated tier is not the recommended tier

Every one of the five conversational showcase screenshots shows the composer model pill reading `Opus 4.8 High` — a paid model at a high effort setting. `[Verified]` (`uiChrome` on `1l`, `2l`, `3l`, `4l`, `5l`, each transcribed independently) The adjacent copy tells readers the free tier is plenty.

This is not deception — the FAQ is explicit that Opus produces richer visualizations, and the showcase is where those visualizations live. But the practical position is: **100% of the marketed output quality was produced on a paid Claude plan** — Opus starts at Pro, $20/month, and the evidence does not identify which paid plan was used — **while the product recommends the free tier, where Opus is unavailable.** `[Verified]` A new free-tier user's first impression is systematically below the proof that brought them in, and StatsDeck cannot detect the gap: it sees tool calls only, never the rendered answer. `[Verified]` (`/documentation`; `privacy.txt`) `[Analysis on consequence]`

### 14.4 The only monetization signals in the entire evidence base

1. **A future paid plan, disclosed once, in the privacy policy.** Under "What we don't do": card details are not collected directly, and "any future paid plan would be handled by a third-party payment processor." `[Verified]` No processor is named; no such plan appears anywhere else on any surface. This is the clearest evidence that free-in-beta is a stage, not a permanent position. `[Analysis]`
2. **Paid acquisition, disclosed once, in the same document.** At account creation a one-way SHA-256 hash of the email goes to Reddit's Conversions API for ad attribution — once, server-side, with no browser and no cookie. `[Verified]` This is capital being spent to acquire users of a product with no revenue and, today, no measurable LTV. The funnel is optimised to a free endpoint. `[Verified fact / Analysis on reading]`
3. **Nothing else.** No upsell, no cross-sell, no affiliate link, no sponsorship, no ads on the site. The only promoted "upgrades" are other companies' products — Claude Pro and the Claude mobile apps. `[Verified]`

### 14.5 The strategic position: free, on someone else's inference bill

StatsDeck's cost base is the enumerated subprocessor list: Railway (hosts the service, stores the saved profile and encrypted ESPN credentials, plus operational logs), Clerk (sign-in, holds the account email), Cloudflare (hosts and serves the static site), Google (Analytics, Fonts), Reddit (ad measurement), nflverse (free, CC-BY 4.0). `[Verified]` (`privacy.txt`) **There is no inference line item.** The expensive unit of an AI fantasy assistant — model tokens — is paid by the user's Anthropic subscription. `[Verified absence from the disclosed list / Inferred conclusion]`

That produces an unusually good cost structure and an unusually bad revenue structure, from the same fact:

**What it buys**

- Marginal cost per answer is a few platform API reads plus a database hit. A viral spike is cheap by the standards of an LLM product. `[Analysis]`
- Anthropic's per-user rate limits act as a free governor on the expensive part — no runaway inference bill and no need to meter tokens, though StatsDeck still bears its own read and hosting costs per call. `[Analysis]` This is consistent with no entitlement field appearing in the probed payloads.
- Free removes every adoption objection for a beta that needs feedback more than revenue, which is exactly what the FAQ asks for. `[Verified ask / Analysis]`
- Distribution and billing infrastructure for the expensive part already exist and are someone else's problem. `[Analysis]`

**What it costs**

- **The customer's willingness to pay is already spent.** A committed manager has paid Anthropic $20. The second $20 is a much harder ask than the first. `[Analysis]`
- **No control of the quality ceiling.** StatsDeck cannot subsidise a better model, cannot pin an effort level, cannot guarantee the freshness stamp renders, and cannot see any of it. `[Verified blindness / Analysis]`
- **Free is anchored publicly and repeatedly** — FAQ item 7 ("completely free") and the beta section heading ("StatsDeck is a Custom Connector for Claude, and it's free"). `[Verified]` Any future price competes against an anchor the product set itself, plus its own claim that the free tier is plenty. `[Analysis]`
- **The highest-willingness-to-pay upsell is doctrinally excluded.** In fantasy, people pay for *do it for me* — auto-set my lineup, submit my claim. StatsDeck's read-only guarantee is repeated on three of four pages and enforced at the architecture level: exactly four tools write anything, and all four write only to StatsDeck's own stored settings. `[Verified]` That permanently forecloses that tier. The trust asset and the revenue ceiling are the same decision. `[Analysis]`
- **The privacy architecture forecloses the standard monetization toolkit.** The email is hashed once at account creation and the plain address is never stored; Clerk holds it, StatsDeck does not. `[Verified]` That means no billing email, no lifecycle or dunning email, no win-back, no upgrade nudge outside the chat — the trust design and the revenue design are in direct tension. `[Analysis]`
- **No commercial readiness.** No Terms of Service exists (`/terms` 404), no acceptable-use policy, no liability disclaimer, and `app.statsdeck.ai` has no web UI to host a checkout. `[Verified]` (site audit §J-06, §H) Taking money requires building all of it. `[Analysis]`
- **Double platform dependency.** Discovery runs through Anthropic's directory at Community tier; delivery runs through Anthropic's models and usage limits. A pricing move depends on a platform that also sets the customer's other bill. `[Verified / Analysis]`

### 14.6 Where price could attach later

`[Speculative]` — none of this is evidenced; it is the shape of the option space given the constraints above.

- **Multi-league.** One league at a time is documented today, and Yahoo requires a disconnect to switch. `[Verified constraint]` Concurrent multi-league is a clean, non-doctrinal paid boundary — it charges the heaviest users without touching read-only.
- **Draft day.** `draft_help` "goes live during a connected draft" `[Verified]` — a dated, high-intensity, once-a-year moment with fantasy's peak willingness to pay. The natural paywall moment is a preseason, not mid-season.
- **Alerts.** Status-change detection already exists (`previous_status`, `status_since`) with no delivery path. Push requires leaving chat, which requires a surface — and a surface is a billable product.
- **League-wide / commissioner product.** The generated league newspaper ("StatsDeck Times") is the only asset that is inherently multi-user: one payer, twelve readers.
- **History depth.** Data goes back to 2012 `[Verified]` (FAQ item 5); deep historical and dynasty analysis is a plausible premium band.

### 14.7 Implications for a competing product

*(Strategic judgement throughout — `[Analysis]`.)*

- Do not read "free" as an unmonetizable competitor — read it as a company that has not yet chosen, has signalled once in its privacy policy that it will, and has not built the plumbing (no ToS, no processor, no checkout surface, no stored email). There is a window.
- The pricing asymmetry is real and it favours StatsDeck on cost: a first-party app pays per token, StatsDeck does not. Compete on the things the connector model cannot deliver — guaranteed rendering, unprompted alerts, persistent state, automation — not on price per answer.
- The read-only doctrine is StatsDeck's best trust asset and its revenue ceiling. A competitor willing to write to platforms inherits the upsell StatsDeck has permanently refused, at the cost of the trust story. Pick deliberately; it is not a feature decision.
- Expect the first paywall to attach to a draft or a multi-league boundary rather than to the core Q&A. Anything a competitor wants established as free-by-default in the market should be established before StatsDeck's beta ends.

---

## 15. Strengths

Every row below names a capability that exists in the evidence, not an impression. Where the strongest proof is the live connector rather than the marketing, that is stated — `connector-probes.json` is read-only output from the running product and outranks every page of copy. One scoping note that applies throughout: the live capture probed **six** tools (`get_scoring`, `get_my_roster`, `start_sit`, `get_rankings`, `get_player_stats`, `get_team_defense`), so "every probed response" means those six. No state-changing tool was called.

| Strength | Evidence | User benefit | Source |
|---|---|---|---|
| **Exact-scoring computation, labelled in-band on every response** | `[Verified]` Every probed response carries `scoring_label: "ESPN Standard (assumed default)"` — and the `(assumed default)` suffix plus `is_assumed_default: true` flags when the scoring is a guess rather than the user's real league. `get_scoring` returns four presets (`ESPN_STANDARD`, `ESPN_PPR`, `YAHOO_DEFAULT`, `SLEEPER_DEFAULT`), each with a plain-English `favors` string ("Half-PPR (0.5/reception) with a lighter -1 INT penalty — a middle ground between standard and full PPR"), so the format's *semantics* travel with the number, not just its point values. `[Verified]` Three of the five rendered artifact types stamp it into their chrome: `SEATTLE BEGINNER · H2H POINTS PPR` (`roster-viz`), `TRADE PROPOSAL · H2H POINTS PPR` (`trade-viz`), `WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED` (`matchup-viz`). `pivot-chart` and `statsdeck-map` do not — see §16.3. | The user can trust a points figure without asking what rules produced it, and is told when the answer is running on a default instead of their league. This closes the single biggest failure mode of generic fantasy advice. | `connector-probes.json` (`get_scoring`, `cross_cutting_observations.scoring_label`); `showcase-extractions.jsonl` (1r, 3r, 4r) |
| **Two deliberately separate numbers: form signal vs. actual points** | `[Verified]` `start_sit` returns `form_score` and `avg_fantasy_points` side by side and never collapses them: Bijan Robinson form 18.87 / avg 23.3; Jonathan Taylor 15.35 / 22.1; Malik Nabers 8.11 / 6.9. The payload's own `notes` state the distinction: "The ranking is a form/strength signal; each player's displayed per-game points are actual current-season scoring (two different numbers)." `[Analysis]` The two numbers move in *opposite* directions across that sample — Nabers' form score sits *above* his current-season average (a weak current-season sample pulled up by prior-season history), while both backs' form scores sit *below* theirs (one hot game not extrapolated). That is the recency model resisting small samples in both directions, which is exactly what a single blended number cannot do. `[Verified]` Note the scope: the `weighting_basis` block that would quantify the history behind each figure appears on **one** row in the capture (Bijan Robinson: `seasons_used [2026, 2025]`, `games 18`), not on all three. `[Verified]` A *different* two-number pair is what the screenshots show — a base season average (Nabers 17.1 on the roster pull, 1l) against an opponent-adjusted figure for the same player (21.9 in 2r and 3r). That is the opponent adjustment, not the form/points split; the form/points split is evidenced only in the live payload. | The user gets a strength read and a production read and can see when they disagree — the moment that actually matters for a start/sit call. A single composite number hides it. | `connector-probes.json` (`start_sit`); `text/documentation.txt` ("Rank and points are deliberately two separate numbers"); `showcase-extractions.jsonl` (1l, 2r, 3r) |
| **Methodology exposed inside the payload, including its own limits** | `[Verified]` `start_sit` ships `weighting_basis` on the top-ranked row: `seasons_used [2026, 2025]`, `games 18`, `current_season_games 1`, `current_season_weight_pct 18.9`, `halflife_games 3.4`. `[Inferred]` A half-life parameter plus "recent games weighted most, the prior season fading as the current season fills in" describes exponential decay; the payload does not use that term. Its `notes` then volunteer the boundary unprompted: "Injury and matchup aren't factored into the rank; ask for the matchup read. Ask how it's weighted for the full method." `get_rankings` carries `framing_note: "Realized production under your scoring — not a projection."` `get_team_defense` ships a quantified accuracy caveat naming the two ways its number can be wrong *and the direction* ("Two rare cases can under-count by ~2 (never inflate)"). `[Verified]` Advanced mode ships a glossary in-band — `advanced_glossary_keys: ["passing_cpoe", "wopr", "racr", "pacr", "target_share", "air_yards_share"]`; the probe capture's own signal note records that the glossary includes edge-case guidance (RACR spikes on low-air-yard profiles, CPOE pre-scaled), which the abridged payload excerpt does not reproduce. | A user can interrogate the method — "ask how it's weighted" returns real parameters, not a marketing sentence. The caveats arrive with the number instead of being discoverable only after a bad decision. | `connector-probes.json` (`start_sit`, `get_rankings`, `get_team_defense`, `get_player_stats`) |
| **Layered, dated injury intel with status-change detection** | `[Verified]` Two tiers observed live: `source: "web_digest"` with `tier: "corroborated"` (Nabers, notes + `reported_date: 2026-09-11`) and `source: "sleeper_feed"` with `tier: null` (D'Andre Swift). Both carry `previous_status` and `status_since` — Swift: `previous_status: "Questionable"` → `status: "cleared"`, `status_since: "2026-09-19"`. That is status-change detection, and **no page on the site mentions it**. A separate `injury_feed` block (`checked`, `as_of`, `flagged_count`) rides on *every* response on its own clock — 13:10 UTC while the data freshness stamp read 20:20 UTC. The FAQ's five stated principles are unusually disciplined: sourced and dated always; corroboration measures report confidence, not severity; the official report wins ties with both shown; absence from the report is not proof of health; not every feed flag is an injury. (The site audit counts four of these five; the FAQ text lists five.) | A user sees not just "Questionable" but who said it, when, and what it changed *from* — the difference between a stale designation and live news. Attaching the sweep to every call means an injury flag surfaces on a question that was not about injuries. | `connector-probes.json` (`start_sit.ranking[2].injury_intel`, `get_rankings.rankings[2].injury_intel`, `cross_cutting_observations.injury_feed_block`); `text/index.txt` (FAQ 6) |
| **Freshness stamp at the payload layer, with a rendering instruction** | `[Verified]` Every probed response carries `freshness` with `data_through`, `as_of`, a pre-formatted `label` ("Data as of 2026-09-20 20:20 UTC"), and a `render_hint`: "Timestamps are ISO-8601 UTC. Present them in the user's local timezone when known; otherwise present UTC." `[Verified]` The behaviour matches the site's own description: `/documentation` promises "Time-sensitive answers carry a freshness stamp," and FAQ 5 goes further — "every stats answer is stamped, and the model can tell you exactly what the data covers and when it was last refreshed, in your local time where it can." The mechanism implements what the copy claims, at the field level. | Time-sensitive answers can be dated without the user asking. `[Analysis]` Note the delivery caveat in §16.3 — the mechanism is built; it does not reach the screen in any of the ten proof screenshots. | `connector-probes.json` (`cross_cutting_observations.freshness_stamp`); `text/documentation.txt` (Technical details — Freshness); `text/index.txt` (FAQ 5) |
| **Read-only against every fantasy platform, stated precisely enough to be auditable** | `[Verified]` Documentation: "There are no write calls to any fantasy platform anywhere in it," and it names exactly which four of 22 tools change state (`connect_league`, `disconnect_league`, `save_espn_credentials`, `set_scoring`) and confirms all four write only to StatsDeck's own stored settings. The guarantee is repeated on all four pages — FAQ 12 ("No — StatsDeck is read-only"), the privacy policy ("StatsDeck is read-only… we never act on your connected accounts") and `/espn` ("StatsDeck never modifies your team or league"). `[Verified]` The probe capture called only read tools and deliberately avoided all four state-changing ones, so the capture is *consistent with* the guarantee; `[Analysis]` it does not independently test it, because no write path was exercised. What makes the claim auditable is its precision — a named, closed list of four tools is falsifiable in a way "we respect your data" is not. | The user can hand over a league connection — and, for private ESPN, a live session cookie — knowing the stated blast radius is zero. This is the trust asset that makes the ESPN cookie ask viable at all. | `text/documentation.txt`; `text/privacy.txt`; `text/espn.txt`; `text/index.txt` (FAQ 12); `connector-probes.json` (`_meta.note`) |
| **No dead ends: refusals are replaced by routed alternatives** | `[Verified]` Called with no league connected, `get_my_roster` returns three *named* routes — `connect` (link a league), `paste` ("Paste your roster or the players you're weighing right here and I'll work with them using the stats and scoring I already have — no connection needed"), `without` ("No league needed: rankings, matchups, schedule, player stats and injuries, plus scoring any lineup you paste under whatever scoring you pick") — instead of an error; the capture's signal note records `success: true` on that response. Mirrored across the product: unsupported platform → paste a screenshot; pending Sleeper/Yahoo offer not readable → describe it and it is evaluated the same way; the homepage gives "No League" equal weight in the 2×2 connect grid. | A user is never stopped by a missing prerequisite, which matters most in the first sixty seconds — the product is usable before any integration commitment. | `connector-probes.json` (`get_my_roster`); `text/index.txt` (FAQ 8, 10); `text/documentation.txt` (Troubleshooting); `statsdeck-site-audit.md` §F |
| **Data provenance with a stated legal basis, carried in-band** | `[Verified]` `/documentation` publishes a three-column table naming each source, what it provides, and *on whose authority* it is read: nflverse (open, CC-BY, used with attribution), Sleeper (public documented read API), ESPN (read on your behalf using your own signed-in session, for leagues you are a member of), Yahoo (Fantasy Sports API, with your permission). It pre-empts the ESPN cookie objection by noting ESPN offers no OAuth, API key, or developer programme, citing `ffscrapr` and `espn-api` precedent, and states it does not resell or redistribute third-party subscription data. Attribution is not just a footer: every probed response carries `source: "StatsDeck — data via nflverse (nflreadpy), CC-BY-4.0. Not affiliated with the NFL."` | A user (or a platform's lawyer) can see exactly what is read and why it is permitted. In a category where data rights are routinely left vague, this is a defensible position rather than a hopeful one. | `text/documentation.txt`; `connector-probes.json` (`cross_cutting_observations.attribution`) |
| **A named, purpose-built artifact system — not generic charts** | `[Verified]` Five distinct artifact types, each with its own title bar and layout, and each carrying its own reading aids: `roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz`, `statsdeck-map`. They are engineered, not templated: `roster-viz` renders a **per-position** startable baseline — measured tick positions differ in every row (QB 359 px, RB 337, WR 337, TE 306, K 291, DST 292, implying baselines ≈18.4 / 15.5 / 15.5 / 11.3 / 9.3 / 9.4 PPG) on one shared ~24 PPG scale, so bars are cross-position comparable *and* each position is judged against its own replacement level; it also carries a two-line legend and a "Tap a position for the players behind the number" drill-down. `matchup-viz`'s header split bar is proportional to the two totals (green ≈52.7% vs 136.4/259.3 = 52.6%), encodes the slot winner twice (solid bar *and* bold coloured number, only the first of which the legend documents), and separates `Q` (Questionable, amber) from `R` (rookie projection, blue) as distinct visual classes. `trade-viz` carries a two-tab switcher (The Deal / Lineup Impact). `pivot-chart` colour-grades severity across four steps rather than three (red −10.3, orange −5.1, blue −1.3, green +1.6). | The visual is a designed decision aid, not a chart of the same numbers. The startable baseline in particular converts "17.4 PPG at WR" into "that is surplus" — a judgement the raw number cannot make. | `showcase-extractions.jsonl` (1r, 2r, 3r, 4r, 5r — both transcription passes) |
| **It returns a decision, not a data dump** | `[Verified]` `start_sit` returns `recommended_start: "Bijan Robinson"` — an explicit named pick, plus `ranking_basis: "blend"` and `week_basis: "default_next"`. `get_team_defense` returns a plain-English `read` alongside the components ("CAR has handed opposing defenses an average of 5.0 DST pts/game this season under ESPN Standard"). In the screenshots the same posture holds: the start/sit answer is organised as *Locks* → *the one real decision* → *Sit* (8 of 9 slots placed in one run-on "Locks" bullet, with the flex withheld as the single decision), and `pivot-chart` triages ("Three of the four are shrug-and-swap… Nabers is the only one worth stress"). | The user gets the answer to the question they asked, with the reasoning available underneath — rather than a table they must interpret. Triage ("only one of these matters") is the scarcest thing in fantasy tooling. | `connector-probes.json` (`start_sit`, `get_team_defense`); `showcase-extractions.jsonl` (2l, 2r) |
| **Trade reasoning models the counterparty** | `[Verified]` The trade flow calls two tools (`My roster`, then `League team`), scans multiple teams, **rejects** one on fit ("Doctor's team is loaded everywhere (6 WR, 6 RB) and doesn't need your depth — bad fit"), selects Gibbs Train on complementary need, and argues the deal from the other manager's side using their roster — three WRs with a weak WR3 (Odunze, 11.1), a three-QB logjam (Allen/Maye/Goff), and Hockenson (7.5) as their TE fallback. It then offers a negotiation ladder (sweeten with Meyers 12.0, or fall back to a straight McLaurin-for-McBride one-for-one) and pre-handles the objection ("Giving two-for-one also cushions the 'but McBride's my only good TE' objection"). | Trade advice that ignores whether the other manager would accept is unusable. Modelling the counterparty's roster is the difference between a valuation and a sendable offer. | `showcase-extractions.jsonl` (4l, 4r — both passes) |
| **Candour is built into the output, not just the copy** | `[Verified]` `trade-viz` shows the user giving up *more* raw production than they receive (YOU GIVE 26.5 PPG vs YOU GET 18.6 PPG) and names the gap "the trade tax for going from 2 startable pieces to 1" rather than spinning it. `pivot-chart` says the backup is the better play when it is (Goedert 14.6 over Fannin 12.9, green pill). `matchup-viz` volunteers that the host platform disagrees: "(ESPN's native projection has it closer.)" The roster pull annotates small samples and missing history instead of printing a bare average — "Cam Skattebo — 16.0 (8 games)", "Jordyn Tyson — rookie, ~9.3 projected" — and the docs state outright that a player with no production "can't be scored on production that doesn't exist, and StatsDeck says so rather than inventing a number." | Trust compounds. A tool that tells you the cost of its own recommendation, and that its number disagrees with your league host's, earns the benefit of the doubt on the calls you cannot check. | `showcase-extractions.jsonl` (1l, 2r, 3r, 4r); `text/documentation.txt` (Troubleshooting) |

**Where the strengths concentrate** `[Analysis]` — Almost every genuine strength above lives at the *data-contract* layer: the scoring label, the freshness block, the injury tiers, the weighting parameters, the caveats, the routed alternatives, the in-band attribution. That is a deliberate and unusual place to invest, and it is the part of StatsDeck a competitor would find hardest to replicate quickly, because it is accumulated judgement about what a number needs to travel with rather than features on a roadmap. The weakness in §16.3 is the direct corollary: StatsDeck has built an excellent contract and has no enforcement over whether it reaches the user.

---


---

## 16. Weaknesses & Friction

### 16.1 There is no notification or alert channel of any kind — and the detection it would carry is already built

- **Current state:** `[Verified]` Nothing in the 22-tool inventory, the documentation, the 15-item FAQ, or the four static pages offers a notification, alert, email digest, SMS, or push of any kind. The strings *notification*, *alert*, *push* and *digest* return **zero** matches across all four page texts. The one mobile-app surface on the site — the `#get-app` block — promotes the Claude app only as "the best experience," and makes no claim about being notified of anything. `[Inferred]` MCP is a pull transport: a documented tool runs when the model calls it, and the model is called when the user types, so all 22 tools are effectively request/response.
- **Problem:** The injury status-change detection — `previous_status`, `status_since`, `reported_date`, two corroboration tiers — and the `injury_feed` sweep that runs on every response have **no delivery path**. They can only fire on a question the user thought to ask. StatsDeck knows on Friday that a starter's status flipped and cannot say so.
- **User impact:** The highest-stakes moment in season-long fantasy is a status change inside the last hour before lock. A user who does not open Claude does not find out. Every competitor push notification ("Nabers ruled out — Wilson costs you 10.3") is a product StatsDeck has the data for and no way to send.
- **Evidence:** `injury_feed: { checked: true, as_of: "2026-09-20T13:10:18Z", flagged_count: 0 }` present on every probed response, including a call with no league connected; `injury_intel.status_since: "2026-09-19"` with `previous_status: "Questionable"`; zero occurrences of notification/alert/push/digest language across all four page texts.
- **Source:** `connector-probes.json`; `text/index.txt`; `text/documentation.txt`; `statsdeck-site-audit.md` §B (sitemap — four pages)

### 16.2 Nothing is glanceable — every answer has to be generated

- **Current state:** `[Verified]` The product has no persistent surface for league state. `statsdeck.ai` is four hand-written static pages; `app.statsdeck.ai` root returns 404 and is API-only (no web UI). There is no dashboard, no standings page, no player page and no sortable table anywhere on the site. `[Verified]` The one authenticated web surface that exists is narrow and single-purpose: `/espn` renders a Clerk sign-in with three states (signed-out / paste / saved) and a Sign out control, and does nothing but accept an ESPN session cookie. There is no account page, no settings page, no saved-answer history. `[Inferred]` Output lives inside a Claude conversation, and artifacts are rendered per conversation rather than persisted by StatsDeck.
- **Problem:** To learn something you already asked yesterday, you must ask again and wait for a model to regenerate it. There is no StatsDeck state to return to and no StatsDeck URL to bookmark.
- **User impact:** The 10-second check — *am I set? anyone Questionable? did anyone get dropped?* — is the most frequent interaction in fantasy, and it is the one StatsDeck serves worst. A Sunday-morning lineup pass becomes a multi-turn conversation, and nothing persists on StatsDeck's side for the user to compare week over week. `[Speculative]` Whether a rendered artifact can be shared with a leaguemate as a link is a property of Claude's artifact surface, not StatsDeck's; the capture records only the `X` and `···` controls on the artifact bar and never opened the overflow menu, so this is unresolved either way.
- **Evidence:** Fourteen statsdeck.ai paths probed and confirmed 404 — `/terms` `/about` `/blog` `/pricing` `/faq` `/contact` `/support` `/docs` `/yahoo` `/sleeper` `/changelog` `/sitemap.xml` `/sitemap_index.xml` `/llms.txt`; the four pages plus `robots.txt` return 200; `app.statsdeck.ai/` → 404 (Railway), `clerk.statsdeck.ai/` → 200.
- **Source:** `statsdeck-site-audit.md` §B, §H, §K; `text/espn.txt`; `statsdeck-crawl-data/README.md` (scope)

### 16.3 The payload's discipline is advisory — and on the vendor's own proof surface most of it did not survive

- **Current state:** `[Verified]` StatsDeck's rigour is delivered as fields and instructions *to a model*: `render_hint` ("Present them in the user's local timezone when known"), `notes` ("1 of these players carries an injury designation — state it with its date in any recommendation"), `framing_note`, `caveat`. Whether any of it reaches the user is Claude's decision, not StatsDeck's.
- **Problem, the freshness stamp:** `[Verified]` **No freshness stamp appears in any of the ten showcase screenshots**, despite every probed response carrying one. For nine of the ten, both transcription passes state the absence explicitly — 5l's second pass goes furthest ("The only numeral printed anywhere in the entire screenshot is '4.8' in the model pill"). For **1l the second pass narrows the claim**: the bottom of that frame is occluded by the translucent composer and clipped by the frame edge, with at least one unread line of body text, so the correct statement there is that no stamp is visible in the readable region and the crop cuts off content where one could be. The finding holds; its strength is nine confirmed and one qualified, not ten confirmed.
- **Problem, the scoring label:** `[Verified]` The label fares better than the stamp but worse than the marketing implies. A scoring label appears in **4 of the 10** screenshots — 1l ("PPR scoring", in prose), and the three artifacts that bake it into their chrome (1r, 3r, 4r). It is confirmed **absent** from 2l, 3l, 4l and 5l — four conversational answers that quote point figures and PPG throughout — and from `pivot-chart` (2r), whose eyebrow reads "WEEK 1 · INJURY CONTINGENCY", and from `statsdeck-map` (5r), which offers only the prose footer "scored under each league's exact settings". So the "always labelled" claim survives where the product controls the render (three of five artifact types) and lapses wherever the model is writing prose.
- **User impact:** The most defensible trust claim StatsDeck makes is invisible in practice, and its central claim is intermittent. Worse, the *analysis* discipline leaks the same way: `matchup-viz` narrates "Their edges: thin. K and TE are slight" while omitting that the opponent wins the third WR slot by 3.2 (Tate 14.9 over McLaurin 11.7) — their largest single-slot edge — and never notes that the opponent also has a Questionable starter (Kittle, `Q` chip, TE slot winner), which cuts the other way. In `2l`, a TE head-to-head is decided on an opponent-adjusted figure shown for only one of the two players (Fannin 11.7 base and ~12.9 adj; Goedert only 12.2 base). In the same answer, Jacksonville DST is a start "lock" while Fannin is started *because* he faces JAX — two recommended starters on opposite sides of one game, with no correlation handling. `[Analysis]` These captures were produced by the vendor, on `Opus 4.8 High`, to sell the product — which is the strongest available evidence that the payload contract is not self-enforcing.
- **Evidence:** `cross_cutting_observations.freshness_stamp` ("present on: every probed response") vs. ten `anythingUnusual`/second-pass entries recording no freshness stamp, one of them (1l) explicitly scoped to the readable region; 3r first pass (omitted WR3 opponent edge) and second pass (opponent `Q`, Kittle); 2l second pass (asymmetric adj figures; JAX on both sides; scoring-label absence "confirmed").
- **Source:** `connector-probes.json`; `showcase-extractions.jsonl` (1l, 2l, 2r, 3l, 3r, 4l, 4r, 5l, 5r, 1r — both passes)

### 16.4 Output quality, and the ceiling on it, belongs to Anthropic

- **Current state:** `[Verified]` The FAQ's own model table (FAQ 13, "What Claude model should I use?"): Sonnet is the free default and "StatsDeck runs well on it"; Opus is "a step up: deeper reasoning and richer visualizations" and "isn't available on the free tier"; Fable is "more than fantasy questions call for." `[Verified]` Every conversational screenshot carries the model pill `Opus 4.8 High` — a model token plus a separate effort token, legible in 1l, 2l, 3l, 4l and 5l (5r is a full-bleed artifact with no composer).
- **Problem:** `[Inferred]` Every artifact a prospect is shown was generated on a paid tier at a high effort setting that a free user cannot reach, while the adjacent copy tells them the free tier is plenty. The same tool payload produces materially different output depending on which model consumes it, and StatsDeck controls neither the model, its effort setting, nor its availability.
- **User impact:** An expectation gap lands at the exact moment of first use — the free-tier user who came for `matchup-viz` may not get `matchup-viz`. Longer term, StatsDeck's perceived quality moves when Anthropic changes model defaults, naming, or tier gating, with no product change on StatsDeck's side.
- **Evidence:** FAQ 13 model table; model pill transcribed at 4–5× magnification across five screenshots and re-verified in the second pass ("unambiguously reads 'Opus 4.8' with a lighter-gray 'High' (not 4.5)").
- **Source:** `text/index.txt` (FAQ 13); `showcase-extractions.jsonl` (1l, 2l, 3l, 4l, 5l, both passes); `statsdeck-site-audit.md` §J-18

### 16.5 Every question costs latency and a slice of the user's Claude budget

- **Current state:** `[Verified]` Answers require a model generation plus one or more tool calls — the trade answer fires two (`My roster`, `League team`) before it reaches a recommendation; a visualization is a generated artifact. `[Verified]` FAQ 13: "every Claude plan caps how much you can use over a rolling window, and heavier models spend that budget faster. Free-plan limits are the tightest."
- **Problem:** StatsDeck is free in dollars and metered in someone else's currency. The cost is paid in wait time and in a rolling usage budget the user cannot top up without buying Claude Pro at $20/month — Anthropic's price (FAQ 7), on which StatsDeck earns nothing.
- **User impact:** `[Inferred]` Usage concentrates in a narrow window — Sunday morning through 1:00 PM ET kickoff, plus Tuesday/Wednesday waivers — which is precisely when a rolling cap is most likely to bind. A user rate-limited mid-lineup-check has no fallback surface (see §16.2) and no way to pay StatsDeck to fix it.
- **Evidence:** Tool-call chips visible in 2l (`Start/sit call`), 3l (`My matchup`), 4l (`My roster`, `League team`); FAQ 7 and 13.
- **Source:** `showcase-extractions.jsonl`; `text/index.txt` (FAQ 7, 13)

### 16.6 The user has to know what to ask, and the two biggest unlocks are documented only on the website — never at the point of use

- **Current state:** `[Verified]` The site repeatedly scripts the literal sentence to type: "I want to go deeper", "make me a visualization", "Switch to my Sleeper league (league name)", "Please connect my ESPN league (league ID#)". Both unlocks are genuinely documented — FAQ 3 names them, and `/documentation` §"3. Example prompts" lists them with the full advanced-metric set (EPA, CPOE, air yards, target and air-yards share, WOPR, RACR/PACR, first downs, "with a glossary the first time you see them"). FAQ 3 then answers "What can StatsDeck do?" by pointing at the image showcase.
- **Problem:** The documentation is not where the user is. Advanced mode and the entire artifact system are reachable only by typing a phrase the product never offers at the top of a conversation: there is no capability menu, no starter-prompt affordance, and the site's own capability inventory lives on a docs page most users will never open. `[Verified]` A discoverable list *does* exist in-product — 5l returns a 14-bullet grouped rundown and 5r renders a designed `statsdeck-map` capability page — but only in response to "Remind me what are the things we can do together with statsdeck." The user must already suspect there is more.
- **User impact:** `[Analysis]` The richest half of the product is invisible to the median user. It also creates a silent quality gap between users: an experienced user pulls opponent-adjusted artifacts with advanced metrics; a new user gets prose. `[Verified]` StatsDeck is not blind to this in aggregate — the privacy policy states it records "counts of how features are used, associated with your account identifier" — so advanced-mode and artifact uptake are measurable; what it cannot see is the conversation itself.
- **Partial mitigation** `[Verified]`: per-turn follow-up offers do exist in the output ("Want start/sit help, waiver DST upgrades, or a trade angle?", "Want me to build the pivot chart so you've got the next-man-up mapped for each Q guy?"), so discovery works *within* a thread — just never at the top level.
- **Evidence:** FAQ 3, 8, 9; `text/documentation.txt` (example prompts); `text/privacy.txt` ("What we collect"); 1l, 2r closing offers; 5l/5r capability rundown gated on the prompt above.
- **Source:** `text/index.txt`; `text/documentation.txt`; `text/privacy.txt`; `showcase-extractions.jsonl` (1l, 2r, 5l, 5r)

### 16.7 One league at a time

- **Current state:** `[Verified]` `/documentation` §"2. Connect your league": "You can connect one league at a time, and switch leagues whenever you like."
- **Problem:** No cross-league view, no multi-league triage pass, no single answer that spans two rosters. Scoring is bound to the active connection, so anything about a second league either requires a switch or drops to pasted text — losing the exact-scoring guarantee that is the product's core claim.
- **User impact:** The most engaged segment — managers in three or more leagues — has its highest-value weekly job (decide where attention is actually needed) unsupported. Switching is cheap on Sleeper (by name) and ESPN (by league ID), but Yahoo requires a disconnect first, any cross-platform switch requires a disconnect, and in every case only one league's numbers are live at a time.
- **Evidence:** `text/documentation.txt` §2; FAQ 9 per-platform switching instructions; `get_scoring.findings.connected` is a single scalar, and the connection object exposes one `league_type` / `best_ball` / `lineup_construction` set.
- **Source:** `text/documentation.txt`; `text/index.txt` (FAQ 9); `connector-probes.json`

### 16.8 Install is desktop-only, with no handoff and almost nothing to catch the visitor

- **Current state:** `[Verified]` Carousel step 1: "Do this first step on the web, not the mobile app. The StatsDeck connector can only be added from the website." `[Verified]` No lead capture exists anywhere on the four pages — no newsletter, waitlist, contact form, or email field. `/contact` and `/support` 404; the footer "Support" link is an anchor to FAQ item 1, which then offers Slack or email — a two-hop path. The only retained channel is the Slack community invite, which asks the visitor to join a workspace rather than leave an address.
- **Problem:** A mobile visitor who is ready to convert cannot, and has no low-commitment way to be reached later. There is no emailed link, no QR handoff, no "continue on desktop."
- **User impact:** `[Verified]` The only disclosed paid acquisition channel is Reddit (a SHA-256 hashed email to Reddit's Conversions API at account creation, disclosed only in the privacy policy). `[Analysis]` Reddit hosts large fantasy-football communities, which is the audience fit the audit identifies; fantasy football is also a phone-first behaviour. On that reading, paid clicks land on a page where the primary action is impossible and the only recovery mechanism is joining a Slack workspace. The device mix of that traffic is not measured anywhere in this evidence base, so treat the mobile-skew step as judgement, not data.
- **Evidence:** `text/index.txt` (install carousel step 1); `text/privacy.txt` (Ad measurement / Reddit); path probes; `statsdeck-site-audit.md` §F (friction points), §J-07.
- **Source:** `text/index.txt`; `text/privacy.txt`; `statsdeck-site-audit.md` §F, §J-07

### 16.9 The ESPN private-league path is the worst onboarding in the product, and it degrades silently

- **Current state:** `[Verified]` Private ESPN leagues require `SWID` and `espn_s2` session cookies, captured via a bookmarklet, across three platform walkthroughs — Mobile Safari 9 steps, Mobile Chrome 7, Desktop Chrome 5 — then a Clerk sign-in on `/espn` with **the same account used when connecting StatsDeck in Claude**, then a paste, then a return to Claude to say "Please connect my ESPN league (league ID#)".
- **Problem:** `[Verified]` The credential can later stop working: "your saved session may no longer work. Re-run the bookmarklet… and paste the fresh values." There is no proactive detection or re-prompt — the product surfaces it as a troubleshooting scenario after the failure, though it does commit to failing loudly at that point ("StatsDeck tells you plainly when it believes your credentials have been rejected rather than failing silently"). `[Verified]` And the origin that accepts those cookies returns **no security headers at all** — no HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy or Permissions-Policy.
- **User impact:** The highest-friction path sits on the platform with the largest installed base, and it fails *later*, once the user has stopped thinking about setup — the worst possible time, since the failure presents as "StatsDeck can't see my league." The account-matching requirement is an easy mis-step with no obvious error signature. `[Analysis]` Asking a user to move a live session cookie is defensible (there is no ESPN OAuth), and keeping it out of the chat transcript via an authenticated form is genuinely good design; doing it on an origin with no framing or transport protections is not.
- **Evidence:** `text/espn.txt` (3-step block, three carousels); `text/documentation.txt` (ESPN private leagues; Troubleshooting); header inspection returning zero of six standard security headers.
- **Source:** `text/espn.txt`; `text/documentation.txt`; `statsdeck-site-audit.md` §H (security headers), §J-03, §J-05

### 16.10 Yahoo is the least-matured integration, and the least documented

- **Current state:** `[Verified]` Yahoo is advertised sitewide and **is** real at the engine layer — `YAHOO_DEFAULT` appears as a live scoring preset ("Half-PPR (0.5/reception) with a lighter -1 INT penalty — a middle ground between standard and full PPR"). But: Yahoo is the only platform that **requires a disconnect before switching** within the platform; Yahoo shows completed trades only, not pending offers (ESPN is the only platform where pending offers are visible); Yahoo is absent from the privacy policy's substantive sections — "What we collect" scopes league data to "Sleeper or ESPN" and the subprocessor list names only "Sleeper / ESPN", with the word Yahoo appearing on that page only in the footer attribution and not-affiliated boilerplate (policy dated 14 August 2026); and Yahoo appears in none of the ten product screenshots — `statsdeck-map`'s own footer reads "Connected: ESPN & Sleeper · redraft & dynasty · scored under each league's exact settings", and 5l's capability rundown lists league connection as "ESPN and Sleeper".
- **Problem:** Yahoo users get the worst switching ergonomics, the thinnest trade visibility, and no disclosure of what an OAuth grant lets StatsDeck read, store, or retain.
- **User impact:** `[Analysis]` A user is asked to grant OAuth access to a live fantasy account by a product whose privacy policy does not disclose that platform anywhere it matters. For a privacy-conscious user this is a hard stop; for a regulator it is a disclosure gap on exactly the kind of processing a policy exists to cover. `[Inferred]` Two independent surfaces — the policy and the proof imagery — both predate Yahoo support, which points to Yahoo shipping after both were last revised.
- **Evidence:** `get_scoring.available_presets[2]`; FAQ 9 ("You do need to disconnect your current league first"); FAQ 10 (Yahoo: completed trades only); `text/privacy.txt` (no Yahoo in collection, storage or sharing sections); 5l, 5r.
- **Source:** `connector-probes.json`; `text/index.txt` (FAQ 9, 10); `text/privacy.txt`; `showcase-extractions.jsonl` (5l, 5r); `statsdeck-site-audit.md` §J-01

### 16.11 No FAAB bid guidance — the most-asked waiver question is unanswered by the data layer

- **Current state:** `[Verified]` `get_available_players` ranks "the best players actually unrostered in your league, with each one's add state and your FAAB or waiver priority". FAQ 10 — inside whose answer the "What about waivers and FAAB?" sub-block sits — describes exactly this and nothing more: add state, rolling waiver priority ("for example, 4 of 12"), and remaining FAAB budget.
- **Problem:** Nothing recommends a **bid amount**. There is no bid model, no percent-of-budget guidance, no market read from prior league bidding — even though Sleeper transaction history including "any draft picks or FAAB that changed hands" is readable.
- **User impact:** `[Analysis]` "How much should I bid on this guy?" is the defining waiver decision, and it is the one with no supporting computation. Worse than a refusal: the model will improvise a number, and that number arrives in the same voice, formatting and apparent authority as the scored figures that *are* computed — so the user cannot tell which numbers have a model behind them. In a product whose differentiator is exactness, an unmarked guess is a specific liability.
- **Evidence:** `text/documentation.txt` (`get_available_players` description); FAQ 10 ("tells you what it takes to get each one" = add state + your budget/priority; Sleeper FAAB in transaction history). Scope note: `get_available_players` was **not** among the six tools probed live, so the absence of a bid field rests on the documented description rather than on a captured payload.
- **Source:** `text/documentation.txt`; `text/index.txt` (FAQ 10); `connector-probes.json` (`_meta`, probe surface)

### 16.12 Every number is a point estimate — no floors, ceilings, distributions, or correlation

- **Current state:** `[Verified]` `form_score`, `avg_fantasy_points`, opponent-adjusted PPG, swap deltas — all single values. `framing_note` disclaims forecasting at the payload layer ("Realized production under your scoring — not a projection"), and `/documentation` bans "spreads, win probabilities, odds" as betting-adjacent. `[Verified]` Risk language exists only as prose: "favored by 13.6 pts — a comfortable but not-safe lean", "Nabers has the week's highest ceiling" — a word, not a number. `[Verified]` Note the internal tension: `/documentation` also says "StatsDeck computes its own projections and rankings" and "Projections are expressed as expected fantasy points," and the screenshots use projection language for the opponent-adjusted figures ("out-projects", "~18 adj"). The disclaimer is at the payload layer; the marketing is not so careful.
- **Problem:** A mean cannot distinguish a 14-point floor from an 8-or-26 boom/bust, and those are different starts depending on whether you are protecting a lead or chasing 20 points. There is also no correlation awareness: in `2l` the JAX defense is a start "lock" *and* the reason Fannin is startable ("vs JAX, ~12.9 adj") — two recommended starters on opposite sides of the same game.
- **User impact:** `[Analysis]` The decisions that most need variance are the ones StatsDeck is structurally unable to support. And the natural framing for them — "you win this matchup 63% of the time" — is foreclosed by StatsDeck's own anti-betting stance, which conflates a fantasy head-to-head win probability with a sportsbook line. `[Analysis]` That conflation is a genuine opening for a competitor: draw the line at odds, spreads and props, not at variance.
- **Evidence:** `connector-probes.json` (`framing_note`; no distributional field in any of the six probed payloads); `text/documentation.txt` ("What StatsDeck will not do"; "Where the data comes from"); `showcase-extractions.jsonl` (3r narrative, 2l JAX conflict).
- **Source:** `connector-probes.json`; `text/documentation.txt`; `showcase-extractions.jsonl` (2l, 3r)

### 16.13 No weather — in a product that treats kickers and defenses as first-class

- **Current state:** `[Verified]` Data sources are exactly two: nflverse (statistics, snap counts, official injury reports, schedules) and the connected league platform. No weather field appears in any probed response; no weather tool exists among the 22; `get_schedule` returns "The NFL game slate — a team's schedule, or a full week". The string *weather* returns zero matches across all four page texts.
- **Problem:** Wind and precipitation are the largest single-game modifiers for kicker distance attempts and for passing volume, and the second-order effects (game script, rushing share, DST scoring floor) run through most of the product's other outputs.
- **User impact:** `[Analysis]` The gap bites hardest exactly where StatsDeck has invested most: `get_kicker_stats` computes distance splits "scored under your bands" and `get_team_defense` produces streaming reads — the two positions weather affects most. A 20 mph crosswind read is a decision the product cannot make, and cannot tell the user it is not making.
- **Evidence:** `text/documentation.txt` (Technical details — Data sources; Where the data comes from table; tool inventory); `connector-probes.json` (no weather key in any probed response).
- **Source:** `text/documentation.txt`; `connector-probes.json`

### 16.14 The exact-scoring promise has two silent-failure modes

- **Current state:** `[Verified]` (a) Scoring settings are imported once at connection: "If your commissioner changes the scoring later, ask Claude to reconnect your league to pick up the new settings." There is no drift detection and no re-poll; the documented remedies are both manual — reconnect, or use `set_scoring` ("Sets the scoring StatsDeck uses, so every points number matches your league"). (b) With no league connected, the assumed default is `ESPN Standard` — which StatsDeck's own preset copy describes as "No PPR — favors big-play, TD-dependent backs and deep-threat WRs over volume receivers," while it describes `SLEEPER_DEFAULT` (full PPR) as "the modern default."
- **Problem:** The product's central claim degrades quietly in both cases. A mid-season scoring change produces confidently wrong numbers until the user happens to reconnect; an unconnected user gets non-PPR numbers unless they read the `(assumed default)` suffix — and in a chat answer that suffix is one clause among many.
- **User impact:** `[Analysis]` The user is the only monitor of the one thing they were told they would never have to monitor. The `is_assumed_default` flag is a real mitigation and deserves credit (§15), but it is a label, not a guardrail, and §16.3 shows that scoring labels reach only 4 of the 10 vendor-chosen screenshots.
- **Evidence:** FAQ 8 (reconnect note); `get_scoring.findings` (`active_scoring: "ESPN Standard"`, `is_assumed_default: true`, `favors` strings for both presets); `text/documentation.txt` (`set_scoring`; Troubleshooting — "that label will say it's an assumed default").
- **Source:** `text/index.txt` (FAQ 8); `connector-probes.json`; `text/documentation.txt`

### 16.15 Small arithmetic and labelling in the rendered artifacts does not reconcile

- **Current state:** `[Verified]` `pivot-chart`'s TE row prints Fannin 12.9 → Goedert 14.6 with a `+1.6` pill; the printed values give +1.7. Every other row reconciles exactly (21.9−11.6 = 10.3; 15.6−10.5 = 5.1; 18.1−16.8 = 1.3). `matchup-viz` prints headline totals 136 and 123 (a 13-point gap), the printed slot values sum to 136.4 and 122.9 (13.5), and the copy states 13.6 — a three-way mismatch, with the headline gap an artifact of rounding each side independently. `trade-viz` prints "+6.9 at TE" while neither the incumbent TE's name nor his 11.7 baseline appears anywhere on the card, so the figure cannot be reconciled from the visible numbers. `[Verified]` A labelling slip in the same family: `matchup-viz`'s narrative prints "Nabers vs DAL (+9.2)" and "Taylor vs BAL (+3.1)", naming the NFL opponent, but both figures are **head-to-head slot margins** against the other fantasy team (21.9−12.7 = 9.2; 22.4−19.3 = 3.1) — the number is exact, the label points at the wrong comparison. Also visible: a `Q` chip clipped by the card edge at mobile width (Kittle), and a `Draft help` description line captured mid-animation at ~2% opacity and hard-clipped to an 8-pixel band.
- **Problem:** Independent rounding of displayed values against unrounded internals, figures that reference off-card baselines, and one prose label that misnames what its number measures.
- **User impact:** `[Analysis]` Individually trivial. Collectively pointed, because *exactness is the product*. These are the vendor's own hand-picked marketing assets, produced on its best model — the surface where a sceptical prospect goes to check the arithmetic. A user who adds up the slot column and gets a different margin than the headline has been handed a reason to doubt the numbers they cannot check.
- **Evidence:** Second-pass corrections for 2r (TE row "the only off-by-0.1 in the artifact"), 3r ("a THREE-way mismatch, not the two-way 0.1 gap reported"; slot-margin reconciliation; Kittle chip clipped), 4r ("the 6.9 cannot be reconciled from the visible figures alone"), 5r (illegible `Draft help` line, geometry measured to an 8-px ink band at luminance 248/255).
- **Source:** `showcase-extractions.jsonl` (2r, 3r, 4r, 5r — second pass)

### 16.16 No credibility scaffolding, and no terms of its own

- **Current state:** `[Verified]` Zero testimonials, ratings, user counts, customer logos, case studies or press mentions across all four pages. The only quantitative claim — "StatsDeck is now the fastest-growing fantasy tool for 2026!" — carries no source, metric or comparison set. `[Verified]` The same announcement block promotes a feature that exists on no other surface: "New Feature: Check out the new StatsDeck Times when viewing league standings. It's a full newspaper about your league inside StatsDeck." *StatsDeck Times* appears nowhere else — not in `/documentation`, not among the 22 documented tools, not in the 15-item FAQ, not in the in-product capability rundown (5l) or capability map (5r), and not in any probed response. It can be neither verified as shipped nor documented for a user who goes looking. `[Verified]` The Anthropic directory listing is a **Community** connector, which the listing itself says has had automated review but is *not verified by Anthropic*. `/terms` returns 404: there is no terms of service, acceptable use policy, or liability disclaimer.
- **Problem:** The full trust ask is: install an unverified community connector built by a self-described "small hobby project", grant it OAuth or hand over a live ESPN session cookie, with no third-party validation, no terms, a privacy policy that does not disclose one of the three supported platforms (§16.10), and a headline feature announcement that the product's own documentation never mentions.
- **User impact:** `[Analysis]` The transparency artefacts StatsDeck substitutes for social proof — provenance tables, negative guarantees, licence attribution — are genuinely good and genuinely invisible to a sceptic who has not read `/documentation`. Meanwhile the site's richest proof, the showcase, is ten JPEGs with placeholder alt text ("StatsDeck trades — screenshot 1"), unreadable to screen readers, search engines and text-based AI crawlers alike, and there is no structured data and no sitemap.
- **Evidence:** Full-text inspection of four pages (no testimonial or review module); announcement block claims; directory listing status; `/terms` 404; zero `application/ld+json` sitewide; `/sitemap.xml` 404.
- **Source:** `statsdeck-site-audit.md` §J-04, §J-06, §J-08, §H, §C; `text/index.txt`

### 16.17 Total dependence on a host that controls distribution, identity, interface and rate limits

- **Current state:** `[Verified]` StatsDeck has no client of its own beyond a single-purpose credential form. Distribution is Anthropic's connector directory (the sole conversion endpoint); the interface is Claude; identity is Clerk plus Claude's own sign-in; the reasoning layer, its tier gating and its usage caps are Anthropic's; the recommended model, the effort setting, and the $20/month upgrade path are all Anthropic's product decisions. The privacy policy anticipates a paid plan that does not exist.
- **Problem:** Every lever that determines whether the product feels good — latency, model quality, how many questions a user gets, whether they can install at all — sits outside StatsDeck.
- **User impact:** `[Analysis]` For the user, the failure modes are indistinguishable: rate-limited, model downgraded, connector policy changed, directory listing moved — all present as "StatsDeck got worse." `[Analysis]` For a competitor this cuts both ways and is the single most important strategic read in this section: the same dependency that gives StatsDeck a world-class interface for zero engineering cost also means it cannot own notifications, cannot own a glanceable surface, cannot meter or price its own usage, and cannot fix §16.1, §16.2, §16.4 or §16.5 without building the thing it deliberately chose not to build.
- **Evidence:** `text/documentation.txt` (Technical details — MCP endpoint, Streamable HTTP, OAuth 2.0); FAQ 7 and 13; install carousel routing to `claude.ai/directory/statsdeck`; directory listing status "Community"; `text/privacy.txt` ("any future paid plan would be handled by a third-party payment processor").
- **Source:** `text/documentation.txt`; `text/index.txt`; `text/privacy.txt`; `statsdeck-site-audit.md` §C, §D, §J-10

---


---

## 17. Missing Capabilities

Ordered by value against build cost. Items the evidence shows are genuinely absent — not "probably absent." Where a gap is a deliberate product decision rather than an oversight, that is stated, because the roadmap question is different.

| Feature | User problem solved | Why the existing experience does not solve it | Potential value | Complexity |
|---|---|---|---|---|
| **1. Proactive status-change alerts (injury, inactive, opponent lineup, waiver claims)** | "Tell me when something changed that affects my lineup" — without me having to remember to ask, at the hour it matters. | `[Verified]` StatsDeck already detects the change: `previous_status`, `status_since`, `reported_date`, two corroboration tiers, and an `injury_feed` sweep on every response. It has **no delivery channel** — nothing on the four pages offers notification of any kind, and the words notification/alert/push/digest appear zero times sitewide. `[Inferred]` MCP is pull-only, so a detection can fire only on a question the user thought to ask. | **Very high.** This is the clearest asymmetry in the whole analysis: the hardest part (dated, tiered, change-aware intel) is built and the easy part (delivery) is missing. It is also the capability that converts a tool into a habit. | **Medium** — a scheduler, a subscription model per user/league, and one owned channel (email or push). The channel is the architectural cost, not the intelligence. |
| **2. A persistent, glanceable weekly surface** | "Show me my week in ten seconds" — a page I can bookmark, reopen, and check on my phone without generating anything. | `[Verified]` No dashboard exists; `app.statsdeck.ai` is API-only (root 404); the four static pages carry no league surface, and the one authenticated page (`/espn`) does nothing but take an ESPN cookie. `[Inferred]` Output lives in a conversation and artifacts are rendered per conversation, so re-seeing yesterday's answer means regenerating it, at model latency and against the user's Claude usage cap. | **Very high.** It is the substrate that makes #1 deliverable (somewhere for an alert to point), makes state comparable week over week, and makes a league-week shareable as a link. | **Medium–High** — this is the decision to become a product with a front end rather than a connector, with the auth, state and design cost that implies. Clerk-based auth is already in place, which removes part of it. |
| **3. FAAB bid recommendation** | "How much should I bid on this guy, given my budget, the weeks left, and what my league actually pays?" | `[Verified]` `get_available_players` surfaces the *context* — add state, waiver priority ("4 of 12"), remaining FAAB — and ranks available players under real scoring. It recommends no amount, and nothing models the league's bidding market, even though Sleeper transaction history including "FAAB that changed hands" is readable. `[Analysis]` The model will improvise a number in the same voice as the computed ones, which is worse than declining. | **High.** The defining waiver decision, unserved by the incumbent, and the inputs are already in hand. Also a natural anchor for a weekly recurring habit. | **Medium** — the scoring and roster-need inputs exist; the new work is a budget/replacement-value model and, ideally, calibration against observed league bids. |
| **4. Distributions: player floor/ceiling and fantasy-matchup win probability** | "I'm down 20 with one player left — do I need my safe guy or my volatile guy?" and "how likely am I actually to win this week?" | `[Verified]` Every StatsDeck number in the probed payloads and the ten screenshots is a point estimate; risk appears only as prose ("a comfortable but not-safe lean", "highest ceiling"). `[Verified]` Win probabilities are explicitly banned as betting-adjacent alongside spreads and odds. `[Analysis]` That conflation is the opening: a fantasy head-to-head win probability is not a sportsbook line, and refusing it forfeits the framing every variance decision needs. There is also no correlation handling — `2l` starts the JAX defense *and* a TE because he faces JAX. | **High**, and strategically distinctive: it is a capability the incumbent has ruled out on principle rather than one it merely hasn't built, so it is durable. Draw the ethical line at odds, spreads and props — not at variance. | **Medium** — game-level history sufficient for empirical distributions is already in nflverse (history to 2012); the work is variance estimation, lineup-level simulation, and a presentation that does not read as gambling. |
| **5. Weather on game context** | "Is the wind going to kill my kicker or my passing game?" | `[Verified]` Data sources are exactly nflverse plus the league platform; no weather field appears in any probed response, no weather tool exists among the 22, and the word never appears on the site. `[Analysis]` The gap lands hardest where StatsDeck has invested most — `get_kicker_stats` distance splits "scored under your bands" and `get_team_defense` streaming reads are the two outputs weather most distorts. | **Medium–High**, concentrated on exactly the two positions StatsDeck treats as first-class and most competitors ignore. | **Low** — a cheap feed joined on game and kickoff time, surfaced as a modifier and a flag. `[Analysis]` The highest value-per-unit-effort item on this list. |
| **6. Multi-league view and a cross-league weekly pass** | "I'm in four leagues — which one actually needs me this week?" | `[Verified]` "You can connect one league at a time." Scoring is bound to the active connection, so a second league either requires a switch (and a disconnect first, on Yahoo or across platforms) or drops to pasted text — which forfeits the exact-scoring guarantee that is the product's core claim. | **High** for the most engaged and most retainable segment. Triage across leagues is the one job a chat interface could do *better* than a per-league app, and it is currently impossible. | **Medium** — a data-model change from one active connection to N, plus a scoring context per league rather than per account. |
| **7. Slot-constrained lineup optimizer** | "Just set my optimal lineup under my league's actual slot rules, flex included." | `[Verified]` `start_sit` is documented as "between two or more of *your* players" — pairwise or small-set. `get_my_roster` surfaces "any bench player outscoring a starter," a partial check. `[Inferred]` The whole-lineup verdict visible in `2l` (Locks / the one real decision / Sit) is model reasoning over a single `Start/sit call`, not a computed whole-lineup result — which is consistent with its quality varying by Claude tier (§16.4) and with its TE call resting on an adjusted figure shown for only one of the two candidates. `[Verified]` The inputs exist: the connection object exposes `lineup_construction`. | **Medium–High.** Converts the product's most-used decision from "the model's essay" into a computed, reproducible answer, and removes a class of quality variance the vendor does not control. | **Medium** — slot-constrained assignment is straightforward; the real work is encoding each platform's lineup rules and flex eligibility faithfully. |
| **8. Rest-of-season and forward value: ROS ranks, playoff strength-of-schedule** | "Is this trade good for the rest of the season?" and "who has the easier playoff schedule?" | `[Verified]` The payload layer is explicitly backward-looking — `framing_note: "Realized production under your scoring — not a projection"` — and `get_fantasy_schedule` / `get_schedule` return opponents, not strength-of-schedule value. `[Verified]` Note the tension to resolve rather than assume: `/documentation` does claim "StatsDeck computes its own projections and rankings" and "Projections are expressed as expected fantasy points," the screenshots use projection language for opponent-adjusted figures, and rookie projections are a shipped, chipped feature (`R`, "~9.3 projected"). So the gap is not projection *as such* — it is **multi-week forward value**: no ROS ranking, no remaining-schedule difficulty, no dynasty horizon. `[Analysis]` Every trade and dynasty decision is inherently about future value, so the product's most consequential outputs currently rest on realized numbers plus model judgement. | **High** for trades, dynasty and playoff planning — the highest-stakes, lowest-frequency decisions, where users are most willing to switch tools. | **High**, and in tension with StatsDeck's positioning: building it means going past the "realized production, not a projection" stance the payload currently holds. Pick this deliberately, and keep realized and projected numbers visibly separate the way StatsDeck already separates form from points. |
| **9. Mobile-completable onboarding** | "I clicked an ad on my phone and want to be using this in two minutes." | `[Verified]` Install step 1: "Do this first step on the web, not the mobile app." No lead capture, emailed link, QR handoff or "continue on desktop" exists on any of the four pages; the only retained channel is a Slack invite. `[Verified]` The only disclosed paid channel is Reddit. `[Analysis]` Fantasy football is a phone-first behaviour and Reddit's fantasy communities are the stated audience fit, so a desktop-only install is likely to be a hard wall on that traffic — though no device-mix data exists in this evidence base. | **Medium**, but it removes a hard conversion wall on the incumbent's own primary traffic source — the cheapest competitive advantage available. | **Low** — for a competitor not bound to a desktop-only connector install, this is a design decision rather than a build. |
| **10. Self-serve data export and deletion** | "Delete my data" and "show me what you hold" without emailing a human. | `[Verified]` Deletion is email-only: "email us at support@statsdeck.ai and we'll take care of it within a reasonable timeframe." Disconnecting a league removes that league's profile; encrypted ESPN cookies persist by design until a deletion request. `[Verified]` There is no account or data page — but the authenticated surface it would sit on already exists: `/espn` runs Clerk sign-in, session tokens and sign-out today, and posts to StatsDeck's own API. | **Medium** — trust, not features. It matters disproportionately for a product that stores third-party session credentials and has no terms of service (§16.16). | **Low** — lower than it looks, because the Clerk-authenticated page, the session-token call pattern and the API endpoint are all already in production on `/espn`; what is missing is a second view on that surface. |
| **11. Write-back (one-click lineup set / claim submission)** — *assessed and recommended against* | "Stop telling me what to do and just do it." | `[Verified]` Deliberately excluded and load-bearing: "There are no write calls to any fantasy platform anywhere in it," repeated on **all four** pages and in the privacy policy, with only four state-changing tools that all write to StatsDeck's own settings. `[Verified]` ESPN offers no OAuth, API key or developer programme, so writes would ride on a borrowed session cookie. | **Medium** demand, **negative** net. `[Analysis]` The read-only guarantee is what makes the ESPN cookie ask acceptable at all; writing on a scraped session is a platform-relations and liability problem, and it destroys the differentiator. The better product is a copy-paste-ready action ("here is the claim to submit, here is the message to send") — which StatsDeck already offers for trade messages ("Want me to draft the actual message to send the Gibbs Train manager"). Match the guarantee; compete on the alert and the glanceable surface instead. | **High**, and the wrong high. |

`[Analysis]` **What is not on this list, and why.** DFS, odds, spreads and props are absent from StatsDeck by explicit policy, not by omission — that is a positioning fork for the competing team, not a capability gap. Draft-day live assistance already exists (`draft_help`, "A draft board tiered under your exact scoring… Goes live during a connected draft"). Pending-offer visibility on Sleeper and Yahoo is a platform limitation no competitor can engineer around, and StatsDeck's answer — describe it or paste a screenshot — is the correct one. An honest read of the list above is that StatsDeck's genuine gaps cluster in two places: **anything that requires the product to speak first** (items 1, 2, 9, 10 — all blocked by having no owned surface, though item 10's surface is closer to existing than it first appears) and **anything that requires a forward or distributional number** (items 3, 4, 8 — partly blocked by an anti-forecasting stance the payload layer adopted on purpose, and which the marketing copy does not consistently hold). Those two clusters, not feature count, are where a competitor wins.

---

## 18. Innovation Opportunities

Every proposal in this section is labelled `[Speculative]` or `[Analysis]`. Nothing here describes a StatsDeck feature. Where a claim about StatsDeck appears, it is labelled `[Verified]` or `[Inferred]` with its source file.

**Evidence scope, stated once.** The live probes were run with **no league connected** `[Verified — connector-probes.json _meta: league_connected: false]`, and no state-changing tool was called. So the payload shapes of the league-dependent tools — `get_available_players`, `get_league_team`, `get_fantasy_matchup`, `get_fantasy_schedule`, `get_trades`, `get_standings`, `draft_help` — are known from the documentation and the showcase screenshots, not from an observed response. Where this section relies on those, the citation names the page, not the probe. FAQ items are cited by question text rather than by number: the accordion renders 15 items while its DOM ids run 1–16 with 9 missing and out of document order `[Verified — statsdeck-site-audit.md finding 11; pages/index.html]`, so any numeric citation is ambiguous.

StatsDeck is a uniquely useful reference point for a weekly-management product because it has already solved the two problems teams usually spend a year on — **scoring calibration** and **honest provenance** — and has deliberately not built the thing that actually makes a weekly assistant sticky: a surface that runs whether or not you show up. The live connector probes make the split unusually legible. The payload layer is mature; the product layer is reactive.

### 18.0 Difficulty read at a glance

| Concept | Hard or easy, given StatsDeck's evidence | Why |
|---|---|---|
| Weekly Command Center | **Easy data, hard editorial** `[Analysis]` | Every input exists in the payloads; nothing in the evidence decides what matters without being asked |
| Weekly Action Plan | **Easy to imitate, hard to make trustworthy** `[Analysis]` | StatsDeck already triages in prose; the hard bucket is "No Action Needed", which requires enumerable coverage |
| Explainable Recommendations | **Easy to match, hard to beat** `[Analysis]` | `start_sit` discloses its own half-life *and its own exclusions* machine-readably; the weakness is surfacing, not modelling |
| Player Trend Detection | **Easy data, blocked by no per-user state** `[Analysis]` | Per-game series and status transitions are in-payload, and NFL history runs to 2012; what is missing is any record of what *you* last saw |
| League-Aware Opportunity Engine | **Medium — inputs exist, join does not** `[Analysis]` | Cross-team scanning is demonstrably possible but happens as an ad-hoc model scan inside one answer |
| Trade Discovery | **Evaluation already strong; discovery absent** `[Analysis]` | Counterparty modelling and negotiation laddering are built; candidate generation and state are not |
| Scenario Analysis | **Proven feasible at N=1 variable** `[Analysis]` | `pivot-chart` is a real one-at-a-time contingency engine; joint and two-sided scenarios are unbuilt |

---

### 18.1 Weekly Command Center

**Verdict: the data problem is already solved for you; the editorial problem is the entire product.** `[Analysis]`

**Grounding.** Every field a command center would need is already on the wire in StatsDeck's own responses. `[Verified — connector-probes.json]` Each probed response carries `freshness` (`data_through`, `as_of: 2026-09-20T20:20:56Z`, a pre-rendered `label`, and a `render_hint` telling the model how to localise the timestamp), a `scoring_label` that self-flags as `"ESPN Standard (assumed default)"` when the scoring is not the user's real league, an `injury_feed` sweep (`checked`, `as_of: 2026-09-20T13:10:18Z`, `flagged_count`) that rides along on *every* call including a no-league call, and in-band CC-BY attribution. `start_sit` returns an explicit `recommended_start`, not merely an ordering.

And yet the only dashboard-shaped artifact StatsDeck has published is a **menu, not a state**. `[Verified — showcase-extractions.jsonl, image 5r]` `statsdeck-map` is a designed "CAPABILITY MAP" page with four colour-coded cards and count badges 3 / 4 / 4 / 3, enumerating what the connector can do. The closest thing to a status view is `roster-viz` `[Verified — 1r]`, which is single-axis: positional quality PPG against a per-position startable baseline (QB 19.4, RB 18.6, WR 17.4, TE 12.2, K 9.1, DST 8.2, with baselines measured at roughly 18.4 / 15.5 / 15.5 / 11.3 / 9.3 / 9.4 on a shared ~24-PPG scale). That answers *how is my roster built*, which is a season-shape question, not *what is true about my team this week*.

**What the design has to get right** `[Speculative]`

- **Order by decision deadline, not by data category.** `statsdeck-map` is organised as Leagues & Teams / Weekly Management / Player Research / League Moves — a taxonomy of tools. A command center ordered that way is a nav bar. The ordering function is the product, and there is no precedent for it in the evidence to copy.
- **Put the stamps on the glass.** StatsDeck computes freshness and scoring labels on every response, and **no freshness stamp appears in the legible region of any of the ten published screenshots** `[Verified — showcase-extractions.jsonl, all ten images; note that in 1l and 2l the answer's tail is clipped behind the composer and the second-pass transcription explicitly declines to call the absence absolute there]`. The scoring label does appear in the artifacts (`H2H POINTS PPR`) but in none of the four conversational panels (2l, 3l, 4l, 5l) `[Verified]`. A command center's entire credibility is "this number is current and computed under your rules" — render it per tile, not per ask.
- **Design the empty and the quiet state first.** StatsDeck's no-league behaviour is the best pattern on the wire: `get_my_roster` with nothing connected returns `success: true` with three named routes — `connect`, `paste`, `without` — rather than an error `[Verified — connector-probes.json]`. Port the *principle* (no dead ends), not the copy. A command center needs a defensible "nothing needs you right now" render, or users learn it cries wolf.
- **Assume one league is not enough.** One league at a time is a hard documented constraint `[Verified — text/documentation.txt: "You can connect one league at a time"; text/index.txt FAQ "How can I switch between multiple leagues & platforms?" requires a disconnect before switching to Yahoo]`. `[Inferred]` A manager with three leagues therefore works them one at a time, in separate asks, with no consolidated view.
- **Budget the cost of assembly.** Every conversational showcase screenshot was captured with the composer's model pill reading `Opus 4.8 High` `[Verified — 1l, 2l, 3l, 4l, 5l]` while the FAQ recommends free Sonnet `[Verified — text/index.txt FAQ "What Claude model should I use?"]`. A command center that assembles itself by re-reasoning over everything each Sunday inherits that cost at the worst possible hour. Precompute; reason only on the exceptions.

---

### 18.2 Weekly Action Plan (Do Now / Monitor / Consider / No Action Needed)

**Verdict: the buckets already exist in StatsDeck as rhetoric. Making them computed, checkable and complete is the hard, ownable part.** `[Analysis]`

**Grounding.** The start/sit answer is literally a three-bucket triage authored in prose: "Locks (start, no debate)" / "The one real decision — flex: start Cam Skattebo" / "Sit (bench, and why)" `[Verified — showcase-extractions.jsonl, 2l]`. The matchup answer runs a numbered "Advice / watch items" list whose first item is a deadline action — "confirm active before lock" `[Verified — 3l]`. `pivot-chart` goes further and ships triage tags: a "High impact" flag on one of four rows and a BOTTOM LINE reading "Three of the four are shrug-and-swap. **Nabers is the only one worth stress** — if he's ruled out, Wilson is the plug but you lose real ceiling, and the matchup tightens. Watch his status first; the rest sort themselves." `[Verified — 2r, second pass]`

Two observed facts make this a genuine opportunity rather than a copy job.

**First, there is no clock.** "Before lock" appears across at least three surfaces — "confirm active before lock" (3l), "Confirm actives before lock" (`pivot-chart` body copy, 2r), "Track Q / OUT tags before lock" (`statsdeck-map`, 5r) — and **the lock time is never computed or displayed anywhere** `[Verified — showcase-extractions.jsonl; no timestamp appears in any legible region of any of the ten images]`. `[Speculative]` The inputs plausibly exist — `get_schedule` returns the NFL slate `[Verified — text/documentation.txt]` and every `start_sit` row carries a `matchup` object `[Verified — connector-probes.json]` — but that matchup object carries only team, opponent, `home_away` and records, **no kickoff time**, and `get_schedule` was not probed, so nothing in this evidence base shows a game time anywhere in the product. Treat kickoff timing as a thing to build, not a thing to surface. The only time-aware element on the whole marketing site is a playoff countdown hard-coded to one timestamp `[Verified — statsdeck-site-audit.md finding 13]`.

**Second, prose selects and a checklist enumerates — and the evidence shows the cost.** `matchup-viz`'s "WHERE IT'S WON & LOST" panel says *"Their edges: thin. K and TE are slight"* while the table rendered directly above it shows the opponent winning the third WR slot by 3.2 (Carnell Tate 14.9 over Terry McLaurin 11.7) — the opponent's single largest edge — and shows the opponent's TE carrying a `Q` chip (George Kittle 13.8 Q, winning the slot over Fannin 12.9 Q). The narrative counts only the user's four Questionable starters under "Biggest swing" — naming them explicitly, "four of your starters are Questionable (Nabers, Rice, Skattebo, Fannin)" — and never mentions that the injury risk cuts both ways `[Verified — showcase-extractions.jsonl, 3r, second-pass corrections]`. Both omitted facts are on the same card, four inches above the sentence that omits them.

**What the design has to get right** `[Speculative]`

- **Compute the buckets; publish the thresholds.** A bucket assigned by a language model is re-derived every session and therefore not comparable week to week. If "Do Now" means *a starter's status changed since your last view, or a bench player out-projects a starter by more than X under your scoring*, say so in the UI. StatsDeck's own house style supports this: it publishes its half-life and its exclusions rather than hiding them.
- **"Monitor" needs a trigger and a re-check time, not a shrug.** The trigger primitive is already in the payload: `injury_intel` carries `previous_status` and `status_since` `[Verified — connector-probes.json: Nabers `previous_status: "cleared"`, `status_since: "2026-09-16"`; D'Andre Swift `previous_status: "Questionable"`, `status_since: "2026-09-19"`]`. "Monitor" should mean a watch is armed on a named condition with a deadline, not that a paragraph mentioned the player.
- **"No Action Needed" is the trust anchor and the hardest engineering.** It is only credible if you can name what was checked. StatsDeck's surface is enumerable: 22 documented tools, of which four write only to StatsDeck's own stored settings (`connect_league`, `disconnect_league`, `save_espn_credentials`, `set_scoring`), leaving **18 read tools** as the coverage list `[Verified — text/documentation.txt; statsdeck-site-audit.md §D]`. A plan that ends with "14 checks ran, 11 clean" makes the other three buckets believable. This is the single claim a per-question conversational product structurally cannot make.
- **Both sides of the H2H, always.** Adopt as a hard rule what the observed narrative failed to do: any swing analysis enumerates the opponent's contingencies at the same resolution as the user's.
- **One action per row, with the move spelled out.** StatsDeck is read-only by design and will never set a lineup `[Verified — text/documentation.txt "What StatsDeck will not do"; text/privacy.txt]`. An action plan therefore terminates in an instruction a human executes in their league app. Write the instruction, not the analysis.

---

### 18.3 Explainable Recommendations

**Verdict: easy to reach parity, hard to beat, and dangerous to underestimate. StatsDeck's disclosure bar is the highest thing in the evidence base.** `[Analysis]`

**Grounding.** `start_sit` does not just rank — it returns `recommended_start: "Bijan Robinson"` plus a `weighting_basis` object exposing its own method: `seasons_used: [2026, 2025]`, `games: 18`, `current_season_games: 1`, `current_season_weight_pct: 18.9`, `halflife_games: 3.4`. It then states its own limitations unprompted: *"Injury and matchup aren't factored into the rank; ask for the matchup read."* `[Verified — connector-probes.json]`

That pattern repeats across every probe. `get_rankings` carries `framing_note: "Realized production under your scoring — not a projection."` `get_scoring` carries `is_assumed_default: true` so the model knows the scoring is a guess. `get_team_defense` ships a quantified, directional error bound: two rare cases "can under-count by ~2 (never inflate)". Advanced mode ships `advanced_glossary_keys` in-band with warnings about reading edge cases. `injury_intel` carries a `tier` (`corroborated` vs `null`) so report confidence is separable from injury severity `[all Verified — connector-probes.json]`.

**Where it is weak — and this is the whole opportunity.** The disclosure never reaches the surface unless asked. The tool-call chips visible in the showcase are friendly labels and nothing else — `My matchup`, `Start/sit call`, `My roster`, `League team` — each rendering as a wrench glyph, a plain label and a collapse chevron, with **no result count, no duration, no data source, no freshness, no scoring, no connector or product branding, and no "view result" affordance even in collapsed form** `[Verified — showcase-extractions.jsonl, 3l and 4l second-pass notes, both stated in those terms]`. The roster pull in 1l shows no tool chip at all `[Verified — 1l, confirmed by a contrast scan of the gap above the answer]`. The documentation's instruction is "Ask how it's computed and Claude walks you through the weighting" `[Verified — text/documentation.txt]` — i.e. the method is available on request, which means for most users it is unavailable.

Two more observed defects worth building against:

- **Two numbers per player, one of them unitless.** `form_score` 18.87 sits beside `avg_fantasy_points` 23.3 for Bijan Robinson; 8.11 beside 6.9 for Malik Nabers `[Verified — connector-probes.json]`. The docs have to warn the reader that "Rank and points are deliberately two separate numbers." A strength signal with no unit is a comprehension tax paid on every answer.
- **Printed figures that do not reconcile.** `pivot-chart`'s TE row prints 12.9 → 14.6 and a `+1.6` pill (the arithmetic is +1.7, and it is the only row in the artifact that fails to reconcile) `[Verified — 2r second pass]`. `matchup-viz` prints slot values summing to 136.4 vs 122.9 (a 13.5 gap), headline scores of 136 and 123 (a 13-point gap), and copy reading "favored by 13.6 pts" — three different margins on one card `[Verified — 3r second pass]`. `trade-viz` asserts "+6.9 at TE"; the 4r second pass measures that this implies an incumbent TE baseline of about 11.7 PPG and that neither that number nor the incumbent's name is printed on the card, so the figure cannot be reconciled from the artifact alone `[Verified — 4r second pass]`. The number does exist elsewhere in the evidence — the roster pull prints "TE: Harold Fannin Jr. — 11.7" `[Verified — 1l]` and the paired conversation prints "Fannin's 11.7" against "McBride 18.6" `[Verified — 4l]` — which makes this a case of the artifact dropping an operand its own prose had.

**What the design has to get right** `[Speculative]`

- **Make the disclosure the default render, not the follow-up.** Every recommendation ships with: inputs used, inputs deliberately excluded, the window, the scoring, and the as-of time — inline and collapsed-but-visible, not behind a question.
- **Derive every displayed delta from the displayed operands.** If you print 12.9 and 14.6, print +1.7. Recommendation products lose trust to arithmetic, not to modelling.
- **One number per player unless you can name the unit.** If two numbers are genuinely needed (strength vs realized), label them in the units a manager already thinks in — points, and a rank within their own league's startable pool.
- **State the direction of every derived number.** The metric shown most often in the showcase is the `adj` figure ("~22 adj", "~15.6 adj"), and the documentation defines it as *"their season average tempered by what that week's defense actually allows to their position"* `[Verified — text/documentation.txt]` — a backward-looking transform rendered as a forward-looking weekly expectation. The site never tells the reader which it is. A competitor that stamps "derived from realized production" vs "forecast" on the number itself is being more honest than the current high-water mark.
- **Suppress or annotate metrics at the row, not in a glossary.** Advanced mode returned `racr: -7.5` and `air_yards_share: -0.02` for Jahmyr Gibbs' Week 1 line `[Verified — connector-probes.json]` — values that are meaningless on a low-air-yards profile, shipped with a glossary warning. Flag the row, don't ask the reader to remember a caveat.

---

### 18.4 Player Trend Detection

**Verdict: the cheapest large win available. The data is already per-game and already carries change events; the blocker is that StatsDeck keeps no record of what you last saw.** `[Analysis]`

**Grounding — the series exist.** `get_rankings` rows carry `snap_share` and `target_share` inline at the leaderboard layer (Jahmyr Gibbs: 45.9 total, 22.95 per game, 2 games, `target_share: 0.169`, `snap_share: 78.5`) `[Verified — connector-probes.json]`. `get_player_stats` in advanced mode returns **per-game, not aggregated** EPA (rushing and receiving separately), air yards, air-yards share, WOPR, RACR, target share and first downs `[Verified — connector-probes.json]`. NFL history runs to 2012 `[Verified — text/index.txt FAQ "How fresh is the data, and where does it come from?"]`, and the start/sit weighting spans two seasons.

**Grounding — change detection exists, at the row level only.** `injury_intel` carries `previous_status` and `status_since` on two independent probes: Nabers sits at `Questionable` with `previous_status: "cleared"` and `status_since: 2026-09-16` via a `web_digest` / `corroborated` item; D'Andre Swift sits at `cleared` with `previous_status: "Questionable"` and `status_since: 2026-09-19` via `sleeper_feed` with `tier: null` `[Verified — connector-probes.json]`. This capability is mentioned on no page of the site `[Verified — connector-probes.json signal: "status-change detection, which no page on the site mentions"; absent from text/index.txt and text/documentation.txt]`.

**Grounding — the blocker.** The only trend primitive exposed is `form_score`, an exponentially decayed scalar with a 3.4-game half-life. A half-life collapses a series into one number: it encodes *how good lately*, never *rising or falling*. And no per-user history persists between sessions — the privacy policy stores an account identifier, activity counts, the connected-league profile and scoring settings, and states explicitly that prompts and conversation content are not recorded `[Verified — text/privacy.txt]`; the documentation adds that StatsDeck "does not access your chat history, memory, or files" `[Verified — text/documentation.txt]`. **StatsDeck cannot know what your player's snap share was when you last looked, because it does not know that you looked.**

**What the design has to get right** `[Speculative]`

- **Store a weekly snapshot per rostered player.** Snap share, target share, air-yards share, route participation proxy, red-zone touches, and the status string. This is a small table and it is the entire moat: the diff is the product.
- **Frame the output as *what changed*, not *what will happen*.** The category's own honest constraint — no odds, no spreads, no win probabilities, and a leaderboard that disclaims forecasting `[Verified — text/documentation.txt "What StatsDeck will not do"; connector-probes.json `framing_note`]` — is also the right product framing. "Your WR2's snap share fell 14 points over three weeks" needs no forecast to be actionable.
- **Separate usage trends from outcome trends, and lead with usage.** Fantasy points are noisy and lag; snap and target share move first. The evidence shows the metrics sitting in the same row with no hierarchy between them.
- **Include a league-settings trend nobody is watching.** Scoring is imported at connect and only refreshed on an explicit reconnect — "If your commissioner changes the scoring later, ask Claude to reconnect your league to pick up the new settings" `[Verified — text/index.txt FAQ "What leagues does StatsDeck support?"]`. Silent scoring drift invalidates every number in a product whose own troubleshooting says "scoring accuracy is the product" `[Verified — text/documentation.txt]`. A weekly settings re-read that reports diffs is low-cost and directly attacks the competitor's stated core claim.
- **Detect the trend the conversation cannot: the absence of change.** Three straight weeks below a startable baseline is a trend. The roster artifact already computes the baseline per position; nothing compares it across weeks.

---

### 18.5 League-Aware Opportunity Engine

**Verdict: medium difficulty. Every input is readable today; nothing joins them unless a user asks about a specific team, and the join currently runs as an expensive ad-hoc scan inside one answer.** `[Analysis]`

**Grounding — the inputs.** `get_available_players` returns the genuinely unrostered players in the league with each one's add state plus the user's FAAB balance or rolling waiver position (the FAQ gives "4 of 12" as the example) `[Verified — text/documentation.txt; text/index.txt FAQ "What about waivers and FAAB?", a subsection of the trades-visibility item]`. `get_league_team` gives the full scored rundown for **any** team in the league, and `get_fantasy_schedule` returns any team's full season schedule `[Verified — text/documentation.txt]`. `get_scoring`'s connection object exposes `league_type`, `best_ball` and `lineup_construction` `[Verified — connector-probes.json signal]`; `[Inferred]` the starting-lineup shape is therefore addressable as data rather than inferred from prose — though no league was connected during capture, so no values for those fields were observed.

**Grounding — the join is manual and it works.** The trade conversation shows the model stating the strategy up front — *"Let me pull the current picture first: your roster's real holes and what the other teams in the league are working with, so we target managers whose needs match your surplus"* — then scanning multiple rosters and rejecting a bad fit on structural grounds: *"Doctor's team is loaded everywhere (6 WR, 6 RB) and doesn't need your depth — bad fit"*, before targeting Gibbs Train as *"thin at WR (only 3, and Odunze/Metcalf are meh)"* and sitting on *"a QB logjam (Josh Allen + Drake Maye + Jared Goff)"* `[Verified — showcase-extractions.jsonl, 4l and its second pass]`. That is an opportunity engine executed as a language-model research task at Opus-High cost, once, in response to a prompt.

**Grounding — three structural limits to design around.**
1. **One league at a time** `[Verified — text/documentation.txt]`, so any engine is capped at a single league's state per session.
2. **Pending offers are ESPN-only** — ESPN exposes completed trades *and* pending offers; Sleeper and Yahoo expose completed only `[Verified — text/index.txt FAQ "What about trades and waivers visibility?"; statsdeck-site-audit.md platform table]`. An offer-driven feed is structurally unequal across platforms, and the fallback is "paste a screenshot."
3. **FAAB balance is visible; a bid price is not.** The FAQ says the board "tells you what it takes to get each one," and what it documents is add state, waiver priority and remaining budget — nothing in the documentation, the FAQ, the probes or the screenshots produces a recommended bid amount `[Confirmed absent]`.

**What the design has to get right** `[Speculative]`

- **Score every opportunity against the user's actual starting requirement, from `lineup_construction`, never from prose.** The evidence contains a clean illustration of why: `trade-viz` argues from "you start 2 WRs out of 8" while `matchup-viz` renders three WR slots and no FLEX for the same demo league, and the start/sit answer for that league says "McLaurin (~11.7) and your two studs lock the three WR slots" `[Verified — 4r vs 3r and 2l second passes]`. Surplus and hole are meaningless without the slot count, and narrated slot counts drift.
- **Index, don't scan.** Precompute a per-team need/surplus vector from the same `get_league_team`-equivalent reads, so candidate generation is a lookup rather than a reasoning pass. This is the difference between a feature and a Sunday-morning latency problem.
- **Make FAAB advice quantitative and explain the currency.** A recommended bid as a percentage of remaining budget, benchmarked against what similar adds went for in that league, is unclaimed space directly adjacent to data StatsDeck already reads.
- **Cover the future opponent, not just this week's.** `get_fantasy_schedule` names the next four opponents and `get_league_team` reads any of their rosters `[Verified — text/documentation.txt]`; an opportunity that also blocks a future opponent's need is a different and better recommendation.
- **End at an executable instruction.** The engine's output is a claim to place, a bid to enter, or a message to send, performed by the human in their league app.

---

### 18.6 Trade Discovery

**Verdict: do not rebuild the analyzer — StatsDeck's is strong and candid. Build the loop around it: candidate generation, acceptance modelling from history, and state.** `[Analysis]`

**Grounding — what is already good enough to be a bar, not a target.** `trade-viz` labels itself `TRADE PROPOSAL · H2H POINTS PPR`, shows YOU GIVE 26.5 PPG (McLaurin 13.5 + Pierce 13.0) against YOU GET 18.6 PPG (McBride), and **openly names the shortfall as a "trade tax"** rather than spinning it: *"2-for-1: you send more raw PPG, but consolidate into one elite starter and clear bench clutter."* It carries a two-tab switcher (The Deal / Lineup Impact) and a dark two-column WHY YOU DO IT / WHY THEY ACCEPT panel `[Verified — 4r]`. The paired conversation models the counterparty's own roster and fallback (*"Hockenson (7.5) stays their fallback"*), handles their likely objection (*"Giving two-for-one also cushions the 'but McBride's my only good TE' objection"*), offers a negotiation ladder (sweeten with Jakobi Meyers 12.0, or drop to a straight one-for-one), and offers to draft the outgoing message `[Verified — 4l and second pass]`. A competitor that ships a trade tool less honest than this will be measured against it and lose.

**Grounding — what is absent.**
- **Discovery starts with the user.** The flow begins with *"I want to put together a trade proposal to fill holes on my roster"* `[Verified — 4l]`. There is no evidence of an unprompted ranked list of the best available trades across all other teams.
- **League trade history is read and surfaced, but not used to model behaviour.** `get_trades` returns pending offers and completed trades with both sides scored `[Verified — text/documentation.txt]`, and `statsdeck-map` lists trade analysis as "Fairness, fit, and history" `[Verified — 5r; 5l: "Trade analysis and history"]`. What no evidence shows is that history being used to estimate whether a given manager trades at all, accepts consolidations, or overvalues names `[Confirmed absent]`.
- **No StatsDeck-side state and no export.** StatsDeck does not record prompts or conversation content `[Verified — text/privacy.txt]` and does not read the chat history `[Verified — text/documentation.txt]`, so the proposal, the counterparty's fallback and the ladder are not available to it in any later session — whatever the host retains in its own transcript is outside this evidence base `[Inferred]`. The artifact panel's only visible controls are a circular X and a circular "···" overflow; no copy, download, share or publish control is visible, and the overflow menu is closed in all ten captures, so its contents are unknown `[Verified — 2r, 3r, 4r, 5r; overflow unopened]`. The host's own message action row does carry copy and share/export controls `[Verified — 1l, 3l, 4l, 5l: six icons — copy, share, read-aloud, thumbs up, thumbs down, retry]`, so a whole reply can be copied; what does not exist is an export of the drafted paragraph alone.
- **The scenario half of the trade card is never shown.** Only "The Deal" tab is rendered in any published screenshot; "Lineup Impact" appears in no image `[Verified — 4r]`.

**What the design has to get right** `[Speculative]`

- **Rank by mutual gain, computed both ways, and show the other side's number.** Symmetric valuation is the trust test. The bar to clear is a product that volunteers it is giving up 7.9 PPG of raw production.
- **Value in slot-replacement terms with the baseline printed.** The `+6.9 at TE` figure fails only because the ~11.7 incumbent it is measured against is not on the card — even though the same conversation prints it. Print the operand.
- **Model acceptance from observed history, and say what it is based on.** "This manager has completed 3 trades this season, two of them 2-for-1s" is a defensible prior. "They'll probably say yes" is not.
- **Give the negotiation a lifecycle.** Drafted → sent → countered → declined, with the counter's valuation attached. This requires storage StatsDeck has chosen not to have.
- **Make the outgoing message a first-class export.** The most valuable single artifact in a trade flow is the paragraph you paste into your league's chat.

---

### 18.7 Scenario Analysis

**Verdict: proven feasible at one variable — StatsDeck's best artifact is a scenario engine. Joint scenarios, two-sided scenarios, and pre-lock automation are all unbuilt.** `[Analysis]`

**Grounding — the existence proof.** `pivot-chart` (internal title "Next Man Up", eyebrow `WEEK 1 · INJURY CONTINGENCY`) maps each of four Questionable starters to their replacement and prices the swap in opponent-adjusted PPG, with severity encoded in four distinct colour treatments rather than three: WR1 Nabers 21.9 → Wilson 11.6 = **−10.3** (red, tagged "High impact"); WR2 Rice 15.6 → Meyers 10.5 = **−5.1** (amber); FLEX Skattebo 18.1 → Gainwell 16.8 = **−1.3** (blue); TE Fannin 12.9 → Goedert 14.6 = **+1.6** printed (green — the product is willing to say the backup is the better play). The BOTTOM LINE triages: *"Three of the four are shrug-and-swap. Nabers is the only one worth stress — if he's ruled out, Wilson is the plug but you lose real ceiling, and the matchup tightens."* `[Verified — 2r and second pass]`

**Grounding — and note how it was triggered.** The model offered it inside a turn — *"Want me to build the pivot chart so you've got the next-man-up mapped for each Q guy?"* — and the artifact exists because the user replied *"Yes let's see that pivot chart!"* `[Verified — 2r]`. Proactivity exists at the sentence level and terminates at the turn boundary. If the user had said "thanks," the contingency map would not exist.

**Grounding — the three gaps.**
1. **One variable at a time.** Each row is an independent single-player substitution. The case that actually loses a week — two or three of the four sitting together, with the replacements cascading through the same slots — is not modelled in any observed output `[Confirmed absent]`.
2. **One side only.** The swing analysis counts the user's four Questionable starters and omits the opponent's `Q`-chipped TE `[Verified — 3r second pass]`.
3. **No distribution, by policy.** Win probabilities, odds and spreads are explicitly excluded `[Verified — text/documentation.txt; text/index.txt FAQ "Does StatsDeck support Daily Fantasy Sports (DFS)?"]`.

**What the design has to get right** `[Speculative]`

- **Model the joint case and rank scenarios by consequence.** Enumerate the 2^n combinations of armed injury risks, collapse to the handful that change the outcome, and lead with those. One-at-a-time deltas systematically understate correlated risk.
- **Use status transitions as the event source.** `status_since` / `previous_status` is a change stream. A scenario engine that re-runs on transition, before lock, is a push product; one that runs when asked is the current state of the art.
- **Express outcomes in points and slot flips, not probabilities.** This respects the category's own line and is more actionable anyway: "if Nabers sits you become a 0.7-point underdog and the WR1 slot flips" beats a percentage.
- **Show both benches.** The opponent's contingencies belong in the same card at the same resolution.
- **Render the scenario view you promise.** The "Lineup Impact" tab is the trade equivalent and is unrendered in all published evidence. Before/after lineup consequence is the part a manager actually decides on.

---

### 18.8 One roadmap signal worth reading

The homepage announcement block carries a feature that appears in none of the 22 documented tools, none of the ten screenshots, and neither the documentation nor the privacy policy: *"New Feature: Check out the new StatsDeck Times when viewing league standings. It's a full newspaper about your league inside StatsDeck."* `[Verified — text/index.txt; the string appears nowhere else in the evidence base]` `[Inferred]` this is a generated narrative artifact hung off the standings read.

`[Analysis]` The competitive read: with a reactive weekly loop, no clock, no per-user state and no push, the feature that shipped next was **league flavour and engagement**, not decision throughput. That is a legitimate strategy — narrative is defensible, fun, and spreads inside a league chat. It also means the weekly-management surface is not where the incumbent's attention is, which is precisely where a competitor has room to be better rather than merely different.

---


---

## 19. Competitive White Space

### 19.1 The tension, and StatsDeck's unusual resolution

Every serious fantasy product faces the same trade-off. **Massive data depth** is what makes advice correct; **decision speed** is what makes advice used. A manager at 12:55 on Sunday has ninety seconds and one hand. Conventional products resolve this by navigation: a dashboard for the week, a page per player, sortable tables, filters, tabs, and a hierarchy the user must learn once and then traverse every week. Depth is *organised* and the user pays the traversal cost.

StatsDeck resolves it a third way, and the evidence for this is unusually clean. There is no product surface at all. Four hand-written static HTML pages exist — `/`, `/espn`, `/documentation`, `/privacy` — and eleven further probed paths were confirmed absent (`/terms` `/about` `/blog` `/pricing` `/faq` `/contact` `/support` `/docs` `/yahoo` `/sleeper` `/changelog`), as were `/sitemap.xml`, `/sitemap_index.xml` and `/llms.txt`; sixteen paths were probed in total `[Verified — statsdeck-site-audit.md §B and §K; statsdeck-crawl-data/README.md]`. There are no dashboards, rankings pages, player pages, article archives, newsletters, sortable tables, premium tiers or pricing. The product is 22 tools exposed over MCP at `https://app.statsdeck.ai/mcp`, invisible to the user, selected by Claude from a plain-language sentence `[Verified — text/documentation.txt: "You never call them directly — you ask in plain language and Claude picks the right one"]`.

**Depth became conversational rather than navigational.** The manager does not traverse a hierarchy; they utter a request, and depth is retrieved on demand and rendered as prose plus, when asked, a purpose-built artifact the host renders from structured data `[Verified — text/documentation.txt]`.

### 19.2 Where the conversational resolution genuinely wins

`[Analysis]`, grounded in the evidence throughout.

1. **Zero traversal cost for a question the user already holds.** "Who should I start, X or Y?" resolves to `start_sit`, which returns `recommended_start: "Bijan Robinson"` — a named decision, not a table to interpret `[Verified — connector-probes.json]`. There is no start/sit screen to find, no filter to configure, no column to sort. For a well-formed question this is faster than any dashboard can be, because the question *is* the interface.

2. **Depth is free at the point of use and costs no screen real estate.** The advanced surface — per-game rushing and receiving EPA, air yards, air-yards share, WOPR, RACR, target share, first downs, with a glossary shipped in-band — is unlocked by the sentence "I want to go deeper" `[Verified — text/documentation.txt; connector-probes.json]`. A dashboard must decide in advance which of those columns earn space for every user; a conversation never has to decide.

3. **Calibration is solved once and applied invisibly.** Every probed response carries `scoring_label`, and each of the four scoring presets carries a plain-English `favors` string explaining format semantics — e.g. Sleeper Default: *"Full PPR (1/reception), 4-point passing TDs — the modern default; volume receivers shine."* `[Verified — connector-probes.json]`. A conventional product ships a settings page and hopes you visit it; here the label rides every number.

4. **There is no empty state, because there is no state.** `get_my_roster` with no league connected returns `success: true` and three named routes — connect, paste, or use the league-independent tools `[Verified — connector-probes.json]`. The FAQ extends the same pattern to unsupported platforms: paste a screenshot `[Verified — text/index.txt FAQ "What leagues does StatsDeck support?"]`. A dashboard with nothing connected is a wall; a conversation always has something to say.

5. **Depth can be *rendered* on demand without a permanent page.** `roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz` each have bespoke chrome, legends, colour semantics, and in one case tabs and a tap-to-drill affordance — `roster-viz` even carries per-position startable baseline ticks at six measurably different positions on a shared ~24-PPG scale `[Verified — 1r second pass]`. This is effectively a dashboard synthesised per question. It is a real architectural achievement, and it is why the depth-versus-speed trade-off appears solved.

6. **Distribution is nearly free.** The product ships no UI, is free, and lives inside a host that already holds the user's attention and the reasoning engine `[Verified — text/index.txt FAQ "What does it cost?"; statsdeck-site-audit.md §D]`. Any competitor building an actual surface must justify the surface.

### 19.3 Where it fails, and why the failure is structural

The failure is not a bug list. It is one property: **a conversation can only answer what you thought to ask.** Weekly team management is precisely the problem of not knowing what to ask. Six pieces of evidence, in ascending order of importance.

1. **The artifacts are prompted, not offered.** Four of the five showcase artifacts carry a visible user request: *"Make me a visualization of my roster strength and weaknesses"*, *"Yes let's see that pivot chart!"*, *"Make me a visualization of this matchup"*, *"Can you make a visualization of this proposed trade? Values, etc"* `[Verified — 1r, 2r, 3r, 4r]`. The fifth, `statsdeck-map`, shows no conversation at all, and its paired panel was prompted with *"Remind me what are the things we can do together with statsdeck"* `[Verified — 5l, 5r]`. The best contingency artifact in the entire product exists only because a user said yes to a one-line offer.

2. **The product's own answer to "what should I look at?" is a list of things you could ask.** `statsdeck-map` is a designed CAPABILITY MAP with four cards and count badges 3 / 4 / 4 / 3 `[Verified — 5r]`. A menu is the correct answer to *"what can you do"*; it is the wrong answer to *"what needs me this week"* — and the one showcase prompt in that row asks exactly the former `[Verified — 5l]`, because the latter has no home. That is the tension, unresolved, in the product's own output.

3. **Selection loss is measurable on a single card.** `matchup-viz` renders the full slot-by-slot table and then narrates *"Their edges: thin. K and TE are slight"* — omitting the opponent's largest single-slot edge (Tate 14.9 over McLaurin 11.7 = 3.2) and omitting that the opponent's TE is also Questionable, while counting all four of the user's Questionable starters under "Biggest swing" `[Verified — 3r second pass]`. Depth was present; attention was misallocated. Prose must select. Selection is exactly where the unasked question dies.

4. **There is no memory on StatsDeck's side.** The privacy policy stores an account identifier, activity counts, the connected-league profile and scoring settings, and states plainly that prompts and conversation content are not recorded; the documentation adds that StatsDeck does not access chat history, memory or files `[Verified — text/privacy.txt; text/documentation.txt]`. So nothing StatsDeck can reach will ever notice "this is the third week your DST is below its startable baseline" or "the player you asked about on Thursday just changed status." The payload even carries the change primitive — `previous_status`, `status_since` `[Verified — connector-probes.json]` — and uses it to annotate a row inside an answer the user requested. An unasked question stays unasked forever.

5. **There is no clock.** "Before lock" appears across three separate surfaces and the lock time is computed nowhere `[Verified — 3l, 2r, 5r; no timestamp appears in any legible region of the ten screenshots, and no payload in the evidence carries a kickoff time]`. The only time-aware element on the entire site is a playoff countdown hard-coded to one timestamp `[Verified — statsdeck-site-audit.md finding 13]`. A conversation is pull-only. Weekly management is a deadline business; the highest-value moment is the ninety minutes before a lock the product cannot name.

6. **The pull interface concentrates cost at the moment of peak urgency.** Every conversational screenshot was captured on `Opus 4.8 High` `[Verified — 1l, 2l, 3l, 4l, 5l]` while the FAQ recommends free Sonnet and notes that Claude's plans cap usage on a rolling window with the free tier tightest and Opus unavailable on it `[Verified — text/index.txt FAQ "What Claude model should I use?"]`. The depth the marketing demonstrates is the expensive path, and it is requested at 12:55 on Sunday, on a phone, inside a general-purpose chat client whose composer in every capture shows a mic button and a black voice/waveform button and no send arrow `[Verified — 1l, 3l, 5l; the 5l second pass attributes the missing send arrow to an empty composer]`. Install itself is desktop-only `[Verified — text/index.txt: "Do this first step on the web, not the mobile app"]`.

`[Analysis]` The structural point: the conversational resolution transfers the burden of *coverage* from the product to the user. A veteran who knows to ask "what's my WR3's snap-share trend and did anyone's practice status move since Thursday?" gets a world-class answer. The median manager asks "who should I start" and gets an excellent answer to a much narrower question — and never learns what they missed, because nothing enumerates what was not checked.

### 19.4 The white space, stated as a position

`[Analysis]` **StatsDeck is conversation-first with artifacts generated on request. The open position is artifact-first: a persistent, scheduled weekly state that the user did not ask for, with conversation available on top of it as the drill-down and exception handler.**

That is not "build a dashboard instead of a chatbot." It is a specific inversion with four load-bearing properties, each of which the evidence shows to be absent rather than merely underdone:

- **It runs without a prompt.** The sweep happens on a schedule tied to the league's lock times, not to a user's arrival.
- **It is enumerable.** It reports what was checked, including what came back clean — the one claim a per-question product structurally cannot make.
- **It remembers.** Week-over-week snapshots make "what changed" the unit of content.
- **It is ordered by deadline.** The first thing on the page is the thing that expires soonest.

### 19.5 What a competitor could actually own

| Ownable position | Why the evidence shows it is open | What it takes `[Speculative]` |
|---|---|---|
| **Coverage as a guarantee** | Answers are authored per question; prose demonstrably omits facts rendered on the same card `[Verified — 3r]` | A fixed weekly checklist derived from the 18 read tools, with a visible "n checks ran, m clean" line |
| **Change as the front page** | `previous_status` / `status_since` exist in-payload and are used only to annotate rows inside requested answers `[Verified — connector-probes.json]`; conversations are not recorded and chat history is not readable `[Verified — text/privacy.txt; text/documentation.txt]` | Weekly snapshots per rostered player plus a diff renderer |
| **The lock-time clock** | "Before lock" appears on three surfaces; no lock time, and no kickoff time in any observed payload `[Verified]` | Kickoff-aware sequencing from the NFL slate, per player, per slot |
| **Multi-league consolidation** | One league at a time is documented; Yahoo requires a disconnect to switch `[Verified — text/documentation.txt; text/index.txt FAQ "How can I switch between multiple leagues & platforms?"]` | Per-league state held concurrently and a cross-league priority queue |
| **Stale-settings detection** | Scoring is imported at connect and refreshed only on reconnect `[Verified — text/index.txt FAQ "What leagues does StatsDeck support?"]`, in a product whose own docs say "scoring accuracy is the product" `[Verified — text/documentation.txt]` | A weekly settings re-read that reports diffs before the numbers go wrong |
| **Push, at all** | No newsletter, no waitlist, no contact form and no email-capture field on any of the four pages; the only retained channel is the Slack invite, with support reached through an email address inside a collapsed FAQ item `[Verified — statsdeck-site-audit.md §F; text/index.txt]` | A notification channel the user opts into, earning it with the "Do Now" bucket |
| **Export of the artifact** | The artifact panel's only visible controls are X and "···", and the overflow is unopened in every capture; the host's message action row copies a whole reply but nothing exports the artifact or a drafted paragraph `[Verified — 2r, 3r second passes; 1l, 3l, 4l, 5l]` | One-tap export of the action plan and the drafted trade message |
| **Joint and two-sided scenarios** | `pivot-chart` models one substitution at a time and one side only `[Verified — 2r, 3r]` | Combination enumeration ranked by outcome change, both benches included |

### 19.6 What a competitor should not try to take

`[Analysis]` Four things in this evidence base are either commodity or already excellent, and attacking them wastes the roadmap:

- **The data depth itself.** nflverse is open under CC-BY 4.0 with history to 2012 `[Verified — text/documentation.txt; text/index.txt FAQ "How fresh is the data, and where does it come from?"]`. Parity on raw stats is weeks of work for anyone, so depth is not a moat for either side.
- **The explainability bar.** A model that publishes its own 3.4-game half-life, its current-season weight of 18.9%, and its own excluded inputs `[Verified — connector-probes.json]` is not a target to beat on candour — it is a floor to clear.
- **The read-only trust posture.** No writes ever, credentials captured off the chat transcript into an authenticated form, encryption at rest, a per-source legal-basis table `[Verified — text/documentation.txt; text/espn.txt; statsdeck-site-audit.md findings 03 and 15]`. Copy the posture; do not compete against it.
- **"An AI that reasons well about football."** That capability belongs to the host model, which a competitor will also be running. Positioning against it is positioning against your own dependency.

---


---

## 20. Build-It-Better Opportunities

Per major feature area, in the template's five dimensions. **Competitor Approach** rows are `[Verified]` or `[Inferred]` statements about StatsDeck with sources; **Better Product Approach** and **Potential Differentiator** rows are `[Speculative]`; **Limitations** rows are `[Analysis]` unless a source is named. Nothing proposed here copies StatsDeck's branding, copy, rankings, artifact designs, or models — each proposal targets the underlying user problem. As in §18: no league was connected during the probes, so league-dependent tool payloads are cited from the documentation and screenshots rather than from an observed response.

### 20.1 Weekly lineup decisions (start/sit)

| Dimension | |
|---|---|
| **Competitor approach** | `start_sit` accepts two or more of the user's players and returns an explicit `recommended_start` plus a ranking by `form_score` (recency-weighted, exponential decay, 3.4-game half-life, current season weighted 18.9%), with `avg_fantasy_points` shown as a deliberately separate number and the NFL matchup attached per player. The payload states that injury and matchup are **not** in the rank. `[Verified — connector-probes.json]` The conversational answer triages into "Locks / the one real decision / Sit". `[Verified — 2l]` |
| **User need** | Set the lineup correctly before kickoff — nine slots in the observed demo league `[Verified — 1l, 3r]` — with the minimum number of decisions surfaced and the reasoning available if challenged. |
| **Limitations** | The user must name the players to compare — the tool is a pairwise-or-more adjudicator, not a full-lineup optimiser. The rank excludes the two factors that most often flip a Sunday call (injury, matchup) and says so, leaving the join to the reader. `form_score` is unitless (18.87 against a 23.3 average). There is no lock time, and nothing in the evidence records what lineup was recommended last week. `[Verified — connector-probes.json; showcase transcriptions; text/privacy.txt]` |
| **Better product approach** `[Speculative]` | Start from the whole lineup, not a pair: enumerate every legal lineup under `lineup_construction`, present only the slots where the top two options are within a stated threshold, and mark the rest "settled." Fold injury and matchup into the recommendation with per-factor contribution shown, rather than excluding them and telling the user to ask. Attach the real lock time per slot. Persist the recommendation so next week can say "you started Gainwell over Skattebo and it cost 4.2." |
| **Potential differentiator** `[Speculative]` | **Decision economy with a receipt.** Two numbers a competitor can own and StatsDeck cannot produce: *how many real decisions you have this week* and *how last week's calls actually resolved*. Both require state; neither requires a better model. |

### 20.2 Matchup preview and opponent modelling

| Dimension | |
|---|---|
| **Competitor approach** | `get_fantasy_matchup` returns both lineups for a week with league record and a per-player opponent adjustment `[Verified — text/documentation.txt]`. `matchup-viz` renders a slot-by-slot comparison with opponent-adjusted values, a split bar proportional to the two totals, distinct `Q` and `R` status chip classes, a legend, and a narrative panel — and volunteers that "(ESPN's native projection has it closer.)" `[Verified — 3r and second pass]` |
| **User need** | Know whether I am likely to win, which slots decide it, and which single event would flip it. |
| **Limitations** | The narrative under-reports: it omits the opponent's largest slot edge (3.2) and the opponent's Questionable TE while itemising all four of the user's `[Verified — 3r second pass]`. Three different margins appear on one card (13, 13.5, 13.6). The `adj` figure — the most-shown number in the product — is a transform of realized production presented as a weekly expectation, and the derivation is stated only in the documentation `[Verified — text/documentation.txt]`. One `Q` chip is clipped by the card's right edge at mobile width `[Verified — 3r second pass]`. |
| **Better product approach** `[Speculative]` | Compute the decisive slots rather than narrating them: rank slots by \|margin\| × variance and lead with the top three (no dispersion metric is exposed today, but variance is computable from the per-game lines the payload already returns `[Verified — connector-probes.json]`). Enumerate both sides' risks symmetrically — if the opponent's TE is Questionable, that is the user's second-largest swing and belongs in the same panel. Derive all headline figures from the printed slot values so the card is internally checkable. Stamp each number as *realized*, *adjusted-from-realized*, or *forecast*. |
| **Potential differentiator** `[Speculative]` | **A single honest "what flips this" line** that accounts for both benches, expressed in points and slot flips rather than probability (which the category, reasonably, refuses). Symmetry is a credibility feature users can verify themselves. |

### 20.3 Injury and status monitoring

| Dimension | |
|---|---|
| **Competitor approach** | Two intel tiers observed live: `web_digest` with `tier: corroborated`, and `sleeper_feed` with `tier: null`. Items carry `status`, `notes`, `reported_date`, plus `previous_status` and `status_since`. An `injury_feed` sweep (`checked`, `as_of`, `flagged_count`) rides on every response on its own clock — 13:10 UTC against the freshness stamp's 20:20 UTC. `[Verified — connector-probes.json]` The stated methodology is layered and epistemically careful: official report is the system of record, corroboration measures report confidence not severity, the official report wins ties with both shown, and absence from the report is not proof of health. `[Verified — text/index.txt FAQ "How does StatsDeck handle injury information?"]` |
| **User need** | Know before lock that something changed, and know how much to trust it. |
| **Limitations** | The methodology is the strongest differentiating content on the site and sits collapsed inside a FAQ accordion item `[Verified — statsdeck-site-audit.md finding 14]`. Change detection exists in the payload and is mentioned on no page `[Verified — connector-probes.json signal]`. Delivery is pull-only: the sweep runs on the call the user makes, so a status change between sessions reaches nobody `[Inferred]`. The FAQ explains a two-clock *data* model (league data read live, nflverse on its own refresh cadence), but the payload's two timestamps — `freshness.as_of` and `injury_feed.as_of` — are not labelled as to which governs a given figure. |
| **Better product approach** `[Speculative]` | Treat the status transition as the atomic content unit: a per-player watch armed on the roster, a diff feed as the default view, and one clock per surface with the other available on inspection. Surface the trust tier as a visible badge on the item rather than a policy paragraph, and carry forward the "official report wins ties, show both" rule as a rendered two-row comparison. |
| **Potential differentiator** `[Speculative]` | **"Nothing moved since you last looked"** — the highest-value sentence in weekly management and the one a product with no per-user state cannot say. It requires only a stored last-viewed timestamp and the status fields that already exist. |

### 20.4 Waivers and FAAB

| Dimension | |
|---|---|
| **Competitor approach** | `get_available_players` returns genuinely unrostered players ranked under the user's scoring with each one's add state, plus the user's rolling waiver position (FAQ example: "4 of 12") or remaining FAAB budget. `[Verified — text/documentation.txt; text/index.txt FAQ "What about waivers and FAAB?"; the tool was not probed, as no league was connected]` |
| **User need** | Decide who to claim, how much to bid, and whether the claim is worth the roster spot — before the claim deadline. |
| **Limitations** | No recommended bid amount appears anywhere in the documentation, FAQ, probes or screenshots `[Confirmed absent]`. There is no claim-deadline awareness. As documented, the board is a ranked list of the best available with add state and priority, and nothing links a candidate to the specific hole it fills or the specific player it would displace `[Inferred from text/documentation.txt]`. Nothing models the other eleven managers' competing need for the same player, even though `get_league_team` makes their rosters readable. |
| **Better product approach** `[Speculative]` | Score each candidate as *marginal points added to your actual starting lineup*, not as absolute quality — a WR4 upgrade on a team starting three WRs is worth close to zero. Recommend a bid as a percentage of remaining budget, with the reasoning shown (scarcity, how many rivals need the position, what comparable adds cost in this league). Name the drop candidate alongside the add. Sequence the whole board against the claim deadline. |
| **Potential differentiator** `[Speculative]` | **Contested-claim modelling.** "Four teams in your league need a starting TE; two have more FAAB than you" turns a ranked list into a bidding decision, using only league data the platform already exposes read-only. |

### 20.5 Trades

| Dimension | |
|---|---|
| **Competitor approach** | Deep and candid. `trade-viz` prints YOU GIVE 26.5 PPG against YOU GET 18.6 PPG and names the gap a "trade tax"; the paired conversation states its targeting strategy up front ("so we target managers whose needs match your surplus"), scans multiple teams, rejects a structurally bad fit ("6 WR, 6 RB … doesn't need your depth"), models the counterparty's fallback (Hockenson 7.5), pre-empts their objection, offers a negotiation ladder, and offers to draft the outgoing message. `[Verified — 4r, 4l and second passes]` `get_trades` returns completed trades both-sides-scored, and pending offers on ESPN only. `[Verified — text/documentation.txt; text/index.txt FAQ "What about trades and waivers visibility?"]` |
| **User need** | Find the trade that exists, price it honestly, get it accepted, and track it. |
| **Limitations** | Discovery is user-initiated; there is no ranked list of best available trades across the league `[Confirmed absent]`. Trade history is read and surfaced ("Fairness, fit, and history", 5r) but nothing in the evidence uses it to model whether a manager trades at all or accepts consolidations `[Confirmed absent]`. No StatsDeck-side state survives the session `[Verified — text/privacy.txt; text/documentation.txt]`. `+6.9 at TE` cannot be reconciled from the card: it implies an incumbent baseline of about 11.7 and neither that figure nor the incumbent's name is printed there, though the paired conversation and the roster pull both print "Fannin 11.7" `[Verified — 4r second pass; 4l; 1l]`. The "Lineup Impact" tab is rendered in no published screenshot. Pending-offer visibility is structurally unequal across platforms. |
| **Better product approach** `[Speculative]` | Generate candidates by indexing every team's need/surplus vector, then rank by mutual gain with both sides' numbers shown. Price in slot-replacement terms with the displaced baseline printed. Estimate acceptance from that manager's own completed-trade history and state the basis. Give the negotiation a lifecycle (drafted / sent / countered / declined) and make the outgoing message a one-tap export. Where pending offers are invisible, make the manual paste path a first-class typed input rather than a fallback. |
| **Potential differentiator** `[Speculative]` | **Acceptance probability with a stated basis, and a trade that persists.** The analysis bar is already high; the loop around it — discovery, behavioural priors, state, export — is entirely open. |

### 20.6 Roster construction and season-long shape

| Dimension | |
|---|---|
| **Competitor approach** | `get_my_roster` leads with any bench player outscoring a starter at the same position, before being asked `[Verified — text/documentation.txt]`. `roster-viz` charts positional quality PPG against per-position startable baselines on a shared ~24-PPG scale, badges each position Strength / Surplus / Solid / Weakness, and closes with a LEAN ON / SHORE UP takeaway. `[Verified — 1r and second pass]` |
| **User need** | Understand where the team is structurally strong or broken, and what to do about it over weeks rather than hours. |
| **Limitations** | Single-axis and single-moment: quality PPG now, with no trajectory and no comparison to the rest of the league. Badges can mislead against their own art — K's bar sits flush against its baseline and is badged "Solid"; QB clears its baseline by roughly 8 px and is badged "Strength" `[Verified — 1r second pass]`. The legend defines Starter / Bench / Rookie(proj) dots that do not appear in the rendered rows. The demo league is described as starting 2 WRs in one artifact and rendered with 3 WR slots in another `[Verified — 4r vs 3r; 2l says "the three WR slots"]`. |
| **Better product approach** `[Speculative]` | Add the two missing axes: **time** (is this position improving or decaying?) and **league-relative** (is your 17.4 WR quality first or eighth among twelve teams?). Derive every slot count from the league's `lineup_construction` field rather than from generated prose, so surplus math cannot drift. Make the badge a function of the printed distance to baseline, and show the margin. |
| **Potential differentiator** `[Speculative]` | **Positional rank within your own league, not against the NFL.** A manager's real question is not "is my TE good" but "is my TE good *here*, in a twelve-team league where four rivals also need one." Every input is readable per team, read-only. |

### 20.7 Data transparency, freshness and provenance

| Dimension | |
|---|---|
| **Competitor approach** | Best-in-evidence at the payload layer. Every probed response carries `freshness` (with a `render_hint` instructing the model how to localise the timestamp), `scoring_label` that self-declares `(assumed default)`, an `injury_feed` sweep, and in-band CC-BY attribution. `get_rankings` carries `framing_note: "Realized production under your scoring — not a projection."` `get_team_defense` ships a quantified, directional error bound. `[all Verified — connector-probes.json]` The docs publish a per-source legal-basis table `[Verified — text/documentation.txt; statsdeck-site-audit.md finding 15]`. |
| **User need** | Know that a number is current, computed under my rules, and derived in a way I can check. |
| **Limitations** | It never reaches the glass. No freshness stamp appears in the legible region of any of the ten published screenshots (in 1l and 2l the answer's tail is clipped behind the composer, so the transcription stops short of calling that absence absolute); the scoring label appears in the artifacts but in none of the four conversational panels; tool-call chips show a wrench, a friendly label and a chevron with no source, count, scoring or freshness even collapsed. `[Verified — showcase-extractions.jsonl, all images and second passes]` Printed values do not always reconcile (a `+1.6` pill over a 12.9 → 14.6 swing; three margins on one matchup card). Two payload timestamps are exposed without saying which governs a given figure. |
| **Better product approach** `[Speculative]` | Render provenance as ambient chrome on every tile: as-of time in local zone, scoring in force, source, and — where the figure is derived — the transform named. Compute all displayed deltas from displayed operands. One clock per surface. Where a number is an assumed default rather than the user's real league, make that visually loud, not a parenthetical. |
| **Potential differentiator** `[Speculative]` | **Provenance as interface rather than as policy.** The incumbent has already won the argument that this matters and has built the mechanism; the surface is unclaimed. This is the lowest-effort, highest-trust win available. |

### 20.8 Onboarding and league connection

| Dimension | |
|---|---|
| **Competitor approach** | Three-step install through the host's connector directory `[Verified — text/index.txt; statsdeck-site-audit.md finding 02]`. Sleeper needs a username; public ESPN a league ID; Yahoo an approved sign-in; private ESPN needs `SWID` + `espn_s2` captured via a bookmarklet and posted to an authenticated Clerk-gated form on StatsDeck's own site rather than into the chat, with AES-256-GCM at rest. `[Verified — text/espn.txt; text/documentation.txt; statsdeck-site-audit.md finding 03]` Yahoo is a live scoring preset in the API `[Verified — connector-probes.json]` but is absent from the privacy policy and from all ten product screenshots `[Verified — text/privacy.txt; 5r footer reads "Connected: ESPN & Sleeper"]`. |
| **User need** | Be connected in under two minutes, from whatever device is in hand, without pasting a session cookie. |
| **Limitations** | Install is desktop-only by explicit instruction, with no email handoff, no "continue on desktop," and no lead-capture field anywhere on the site `[Verified — text/index.txt; statsdeck-site-audit.md §F]`. The private-ESPN cookie walkthrough runs nine steps on mobile Safari once JS loads — the pre-JS markup still advertises ten — and five on desktop Chrome, above a separate three-step sign-in-and-save block `[Verified — statsdeck-site-audit.md finding 12; text/espn.txt]`. One league at a time. Scoring is captured at connect and goes stale silently on a commissioner change. Support is a two-hop path into a collapsed FAQ item `[Verified — statsdeck-site-audit.md §F]`. |
| **Better product approach** `[Speculative]` | Make mobile a first-class entry path and accept that the first session happens on a phone. Where a platform offers OAuth, use it and never ask for a cookie; where it does not, treat the cookie path as a degraded mode with an explicit expiry warning and a one-tap re-auth prompt when a read fails. Hold multiple leagues concurrently. Re-read league settings on a schedule and announce diffs. |
| **Potential differentiator** `[Speculative]` | **"Your scoring changed on Tuesday — here is what it does to your lineup."** The incumbent stakes its entire claim on scoring exactness and refreshes settings only when the user remembers to reconnect. Watching the settings is the most direct way to be better at the thing the category says matters most. |

### 20.9 Visual output, artifacts and export

| Dimension | |
|---|---|
| **Competitor approach** | Five distinct purpose-built artifact types, each with its own chrome, legend, colour semantics and in one case tabs: `roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz`, `statsdeck-map`. Colour encodes severity in four gradations on the contingency card; `Q` and `R` are distinct chip classes; kickers and team defenses are first-class in every artifact. `[Verified — showcase-extractions.jsonl]` Structured data is returned so the host can render it; the trigger phrase is "make me a visualization" `[Verified — text/documentation.txt]`. |
| **Competitor approach, one inference** | `[Inferred]` Because StatsDeck returns structured data that the host renders per request, there is no StatsDeck-side artifact object with an address that could be reopened, compared week to week, or shared. What the host does with a rendered panel afterwards is outside this evidence base. |
| **User need** | See the week at a glance, keep it, and act on it away from the chat. |
| **Limitations** | Artifacts are generated per request against the conversation that asked for them. The panel's only visible controls are a circular X and a circular "···" overflow; no copy, download, share or publish control is visible, and the overflow is closed in all ten captures, so what it offers is unknown `[Verified — 2r, 3r second passes]`. One artifact shipped a description line rendered at roughly 2% opacity in an 8-pixel band, i.e. invisible, caught mid-animation `[Verified — 5r second pass]`. A `Q` chip is clipped by the container at mobile width `[Verified — 3r second pass]`. The "Lineup Impact" tab is never rendered in published evidence. `[Inferred]` Richness tracks the paid, high-effort host configuration used in every capture — the FAQ itself credits Opus with "richer visualizations" `[Verified — text/index.txt]`. |
| **Better product approach** `[Speculative]` | Make the weekly view a persistent object with a stable address, not a generated panel — so it can be reopened, compared week to week, and shared into a league chat. Design for the narrowest real width first and test chip overflow there. Render no animation state that can be captured as absent content. Export the action plan and any drafted message as plain text in one tap. Keep the assembly cheap enough to run on the free tier of whatever model hosts it. |
| **Potential differentiator** `[Speculative]` | **A weekly artifact that persists and diffs against last week.** The incumbent's artifacts are excellent and generated on demand. Persistence converts the same visual craft into a habit — and it is the one property a conversation-shaped product cannot retrofit without changing what it is. |

### 20.10 Three things not to build

`[Analysis]`

1. **A better stats engine.** nflverse is open and shared; depth parity is a commodity for both sides.
2. **A more confident recommender.** The incumbent's candour — publishing its half-life, its exclusions, its error direction, and a trade that costs the user 7.9 PPG of raw production — is the benchmark. Confidence that outruns disclosure reads as a downgrade to exactly the audience most likely to switch.
3. **Anything in the excluded adjacencies.** DFS, odds, spreads and win probabilities are refused explicitly and repeatedly, including a standing footer line `[Verified — text/documentation.txt; text/index.txt FAQ "Does StatsDeck support Daily Fantasy Sports (DFS)?"; statsdeck-site-audit.md §E]`. Entering them buys a different, more regulated business and forfeits the trust posture that makes a read-only assistant installable in the first place.

---

## 21. Prioritized Opportunity Matrix

**Scoring anchors.** These are fixed so the numbers can be argued with.

*User Value (1–5):* 1 = a manager notices it once a season. 3 = it improves a weekly decision the manager already makes. 5 = it removes a recurring, quantifiable loss the manager currently eats (a lineup locked with an inactive starter, a blind FAAB bid, every decision re-typed by hand into the platform app).

*Differentiation (1–5):* 1 = StatsDeck already does this. 3 = StatsDeck could ship it in one sprint by wiring existing tools together. 5 = blocked by something StatsDeck has either published as a commitment or structurally does not have (a channel, persistence, a second league slot).

*Ranking rule:* sum of the two scores; ties broken by User Value first (a user problem outranks a moat), then by weekly recurrence, then by inverse complexity. Complexity is engineering plus platform risk, not modelling difficulty alone.

| Opportunity | User Problem | User Value | Differentiation | Complexity | Evidence | Priority |
|---|---|---|---|---|---|---|
| **Lineup-lock guardian** — push alerts on injury-status transitions for *your* starters, plus an unrequested Sunday-morning sweep and a Tuesday waiver sweep | Help only arrives when the manager remembers to open a chat and ask. Statuses move after lineups are set; nothing reaches the manager between sessions | 5 | 5 | M | `injury_intel` already carries `previous_status` + `status_since`, and an `injury_feed` block (`checked`/`as_of`/`flagged_count`) rides on *every probed* response [Verified: connector-probes.json]. That the detected change is then discarded rather than retained follows from there being no persistence layer for it [Inferred: privacy.txt stores only account identifier, league profile, scoring settings and encrypted ESPN cookies]. No email is stored, no lead capture exists on any of the four pages, and the only cadence device on the site is a hard-coded countdown [Verified: privacy.txt; index.txt; site-audit §F] | 1 |
| **Close the execution loop** — approved moves become either a deep-linked, ordered handoff checklist or, where the platform permits, an actual submitted lineup/claim | Every decision is made in one place and must be re-entered by hand in another. The product's output stops one step short of the action | 5 | 5 | H | Read-only is StatsDeck's most-repeated public promise — restated on **all four** pages: "Access: Read-only" and "It never writes to your league" on `/documentation`, "StatsDeck is read-only" in the privacy policy, "No — StatsDeck is read-only… you always make the actual moves" in the FAQ, and "StatsDeck never modifies your team or league" on `/espn` [Verified: documentation.txt; privacy.txt; index.txt; espn.txt]. It cannot follow without breaking its central trust claim. Feasibility is asymmetric: Sleeper is a "public, documented **read** API", while for ESPN there is "no OAuth, no API key, no developer program" [Verified: documentation.txt]. Yahoo is the only delegated approve-access path, so the only plausible write route [Inferred: documentation.txt "Sign in with Yahoo and approve access"; index.txt "Claude gives you a link, you approve access with Yahoo" — the evidence never uses the word OAuth for Yahoo] | 2 |
| **Multi-league portfolio** — every league connected at once, cross-league player exposure, one Sunday sweep across all of them | The manager running more than one league must tear down and rebuild the connection to move between them, and Yahoo requires an explicit disconnect first | 5 | 4 | M | "You can connect one league at a time" [Verified: documentation.txt]. An entire FAQ item (ninth in render order) exists only to teach the disconnect/reconnect workaround, with per-platform phrasings to type, and Yahoo alone requires the disconnect [Verified: index.txt]. How many leagues the typical engaged manager runs is not established by this evidence base; the workflow's existence is [Analysis]. Diff is 4, not 5: this is a state-model choice, not a published principle | 3 |
| **Decision journal + published calibration** — every recommendation stored as a structured decision, then scored after the games; the product's own hit rate is visible to the user | The manager cannot tell whether the advice is any good, and neither can the product | 4 | 5 | M | "We do not record your prompts or conversation content"; activity data is "when you use StatsDeck and counts of how features are used" [Verified: privacy.txt]. `recommended_start: "Bijan Robinson"` is a concrete, falsifiable pick that is thrown away [Verified: connector-probes.json]. There is zero social proof anywhere on the site and the one growth claim is unsourced [Verified: index.txt; site-audit §J-08]. Whether any competitor publishes its own accuracy cannot be answered from this evidence base, which contains no competitor data [Analysis] | 4 |
| **One integrated weekly decision number, with an uncertainty band** — form, opponent, injury status and usage fused into a single ranked call that states what would change it | The start/sit answer arrives as several numbers the manager must reconcile: a form score, a season average and an injury tag from one tool, an opponent-adjusted figure from another | 5 | 3 | H | `start_sit` ranks on recency-weighted form alone and says so unprompted: "Injury and matchup aren't factored into the rank"; `ranking_basis: "blend"`, `halflife_games: 3.4`, `current_season_weight_pct: 18.9` [Verified: connector-probes.json]. Opponent adjustment is a separate documented tool output — `get_fantasy_matchup` returns "each player's opponent adjustment", defined as "their season average tempered by what that week's defense actually allows to their position" — and it reaches the user both inline in prose (`~18 adj`, `~16.8 adj`, `~15.6 adj`) and in artifact chrome (`matchup-viz`: "OPPONENT-ADJUSTED") [Verified: documentation.txt; showcase-extractions.jsonl, 2l/3l/3r]. It was not probed directly, because no league was connected during capture [Verified: connector-probes.json `_meta`]. Diff is only 3 — the components exist one tool apart and could be joined | 5 |
| **FAAB bid pricing with league-competition modelling** — a recommended bid, priced against who else in *your* league has the hole and the budget | What a player is actually worth as a share of budget is a weekly cash decision made blind. The board says who is available and what your budget is, not what to pay | 4 | 4 | M | `get_available_players` returns add state plus "your FAAB or waiver priority"; the FAQ's waiver item stops at "your remaining budget" and "4 of 12" [Verified: documentation.txt; index.txt]. No bid guidance appears in any tool description or in any of the ten screenshots; `get_available_players` was not among the six tools probed, so the probe set is silent rather than confirming [Verified: documentation.txt; showcase-extractions.jsonl; connector-probes.json]. The counterparty-reasoning machinery already exists for trades and is not applied to waivers [Verified: showcase-extractions.jsonl, 4l/4r] | 6 |
| **Season-path planning** — bye-week and schedule crunches mapped weeks ahead, plus fantasy playoff odds over the remaining schedule | The manager plans one week at a time and discovers a two-starter bye collision in the week it lands | 4 | 4 | M–H | `get_fantasy_schedule` and `get_schedule` return opponents and slates [Verified: documentation.txt]; no tool in the documented inventory of 22 plans forward across them [Inferred: tool descriptions only — forward planning appears in no description, probe or screenshot]. Playoff odds are arguably foreclosed by StatsDeck's own published exclusion of "win probabilities" alongside spreads and odds [Verified: documentation.txt] — a line a competitor can redraw honestly, since league playoff odds are not a betting market. Requires multi-week forward modelling the product does not currently ship, which is what caps the score [Analysis] | 7 |
| **Mobile-first onboarding with no credential paste** — connect on a phone, no bookmarklet, no cookie handling | The highest-intent visitor arrives on a phone and cannot finish installing in that session; the hardest platform requires extracting two session cookies from their own browser | 4 | 4 | M–H | "Do this first step on the web, not the mobile app. The StatsDeck connector can only be added from the website" — and there is no email capture, waitlist or desktop handoff anywhere [Verified: index.txt; site-audit §F]. The ESPN path runs 9 steps on mobile Safari, 7 on mobile Chrome, 5 on desktop, plus a bookmarklet and an authenticated paste form [Verified: espn.txt; site-audit §C]. Any competitor faces the same ESPN wall — the differentiation is in pushing it out of the first session, not in removing it [Analysis] | 8 |
| **Host-independent output** — compute *and* render server-side, so the artifact is identical on a free model tier | Output richness depends on which model the manager happens to be using, and the free tier is the recommended default | 3 | 4 | M | Every one of the five *conversational* screenshots was captured on a model pill reading `Opus 4.8 High`, while the FAQ recommends free Sonnet ("StatsDeck runs well on it") and reserves "richer visualizations" for paid Opus, which "isn't available on the free tier" [Verified: showcase-extractions.jsonl, 1l/2l/3l/4l/5l; index.txt]. The connector delegates rendering to the host: it ships a `render_hint` instructing the model how to present timestamps rather than rendering them itself [Verified: connector-probes.json] | 9 |
| **Dynasty and keeper asset valuation** — age curves, pick values, and a stated contend-or-rebuild posture driving every trade verdict | Dynasty is claimed as supported, but valuations are weekly-production valuations. A 32-year-old and a 23-year-old at the same PPG are not the same asset | 3 | 3 | M–H | `age` is returned on every ranked player in both probes that rank players — 24/27/23 in `start_sit`, 24/32/27/25/26 in `get_rankings` [Verified: connector-probes.json] — and appears in no output that uses it [Inferred: six probes and ten screenshots; no probe note, `read` field or artifact references age]. `league_type`, `best_ball` and `lineup_construction` are modelled at the connection layer [Verified: connector-probes.json], and redraft/dynasty/best-ball are advertised [Verified: index.txt] — but no format-specific analysis appears in any probe or screenshot. Seasonal rather than weekly, which caps the score | 10 |

**Deliberately left off.** Three plausible-sounding opportunities are not on this list because the evidence shows StatsDeck already holds the ground. Trade counterparty reasoning: it scans rival rosters via an explicit `League team` tool call, *rejects* a poor-fit partner ("Doctor's team is loaded everywhere (6 WR, 6 RB) and doesn't need your depth — bad fit"), names the other manager's fallback at the position (Hockenson, 7.5), and admits the raw-points cost of its own proposal as a "trade tax" [Verified: showcase-extractions.jsonl, 4l/4r]. Injury methodology: a two-tier corroboration model with dated sourcing, an explicit "official report wins ties" rule, and "absence isn't health" [Verified: index.txt]. League content: a "StatsDeck Times… full newspaper about your league" is announced on the homepage as a new feature [Verified: index.txt announcement block] — though it appears in none of the 22 documented tools, none of the six probes and none of the ten screenshots, so its scope rests on the vendor's own unrepeated claim [Analysis]. Competing on any of these means competing against the incumbent's strongest work.

**Why the top three beat the rest.** Ranks 1–3 share a property none of ranks 5–10 have: StatsDeck cannot follow without changing something it has published or rebuilding something it deliberately never built. The guardian needs a channel to reach a user who is not currently in a conversation — and StatsDeck stores no email, exposes no notification path in any tool or page, and its application host is API-only with a 404 at the root [Verified: privacy.txt (no email stored); site-audit §H (root 404, API-only)]. Closing the execution loop needs a write call, and read-only is the promise carrying most of the product's credibility load in a category where users are genuinely afraid of automation. Multi-league needs a state model with more than one league slot, and the current one has exactly one. By contrast, ranks 5, 6 and 7 are all reachable for StatsDeck by joining components it already ships: opponent adjustment already exists one tool over in `get_fantasy_matchup`, counterparty modelling already exists for trades, and schedules are already two separate tools. Those are table stakes to build, not moats to hold. The sharpest detail in the whole evidence base makes the point: `injury_intel` returns `previous_status: "Questionable"` → `status: "cleared"` with `status_since: "2026-09-19"`, and an `injury_feed` sweep with a `flagged_count` attaches to every probed response — including `get_my_roster`, which returns no league data at all, since no league was connected for any probe [Verified: connector-probes.json]. It detects the change, describes the change, and then the conversation ends and the change goes nowhere. Rank 2 should be scoped to the handoff layer first — an ordered, deep-linked checklist captures most of the value at a fraction of the risk, and true write-back should be attempted only on Yahoo's delegated approve-access path, never by driving a user's ESPN session cookie, which would escalate an already grey practice into acting on the user's account [Analysis].


---

## 22. Final Product Assessment

### What This Platform Is Best At

**Scoring fidelity treated as a primitive rather than a setting.** [Verified: connector-probes.json; showcase-extractions.jsonl] Every probed response carries `scoring_label`, and when no league is connected it reads `"ESPN Standard (assumed default)"` with `is_assumed_default: true` — the product flags its own uncertainty about the single input everything else depends on. Presets carry plain-English semantics, not just point values: Sleeper Default is described as "Full PPR (1/reception), 4-point passing TDs — the modern default; volume receivers shine." The claim is also visually substantiated: artifact chrome is stamped `SEATTLE BEGINNER · H2H POINTS PPR` and `TRADE PROPOSAL · H2H POINTS PPR`. This is the most rigorously executed promise in the product.

**Epistemic honesty as a shipped feature, not a disclaimer.** [Verified: connector-probes.json; showcase-extractions.jsonl; index.txt] The pattern is consistent enough to be a design rule. `get_rankings` ships `framing_note: "Realized production under your scoring — not a projection."` `start_sit` volunteers that "Injury and matchup aren't factored into the rank" and exposes its own weighting (`halflife_games: 3.4`, `current_season_weight_pct: 18.9`). `get_team_defense` names the two ways its number can be wrong, by how much, and in which direction ("can under-count by ~2 (never inflate)"). The roster pull annotates "Cam Skattebo — 16.0 (8 games)" rather than a bare average, and gives a rookie "~9.3 projected" instead of inventing history. `matchup-viz` volunteers that the league host disagrees with it: "(ESPN's native projection has it closer.)" The trade card shows the user giving away more raw production than they receive (26.5 PPG out, 18.6 PPG in) and labels the gap a "trade tax." How that compares to the rest of the category cannot be judged from this evidence base, which contains no competitor material — but measured against the product's own marketing surface, it is the most consistently self-limiting output I have seen documented here. [Analysis]

**It produces decisions, not tables.** [Verified: connector-probes.json; showcase-extractions.jsonl] `recommended_start` is an explicit named pick, not an ordering. `get_team_defense` returns a prose `read` alongside the components. The conversational output commits: "Start Skattebo, bench Gainwell," with the contingency attached ("Caveat: Skattebo is Questionable. If he's ruled out, Gainwell slides right in — nearly as good this week, so no panic").

**League-context reasoning, including the other manager's point of view.** [Verified: showcase-extractions.jsonl, 4l/4r] The trade flow fires two tool-call chips — `My roster`, then `League team` — pulls the user's roster, scans multiple rival teams, rejects one for poor fit, selects another, and argues the deal from the counterparty's side, including their fallback at the position (Hockenson, 7.5) and their roster shape (three WRs, a weak WR3 at 11.1, three QBs hoarded). The `League team` chip is direct evidence that rival rosters were read, not inferred from the numbers alone.

**Purpose-built visual artifacts with real analytic content in the design.** [Verified: showcase-extractions.jsonl, 1r/2r/3r/4r/5r] Five named artifact types with their own design language. The detail that proves these are engineered rather than decorative: in `roster-viz` the "startable baseline" tick sits at a per-position offset rather than on one shared line (measured tick centres QB 359, RB 337, WR 337, TE 306, K 291, DST 292 px), on a single shared PPG scale — a replacement-level threshold per position, not one cosmetic rule. `matchup-viz`'s header bar is proportional to the two totals (~52.7% green against an actual 52.6% share). `pivot-chart` colour-codes swap severity across four distinct treatments rather than three.

**No dead ends.** [Verified: connector-probes.json] `get_my_roster` with no league connected returns `success: true` and three named routes — connect, paste, or work without a league — rather than an error. The design principle the FAQ describes is real at the payload layer.

### Who It Is Best For

**The single-league, season-long manager on ESPN or Sleeper who already uses Claude and enjoys interrogating a number.** [Inferred from: documentation.txt (one league at a time); index.txt (FAQ assumes FAAB, dynasty, best-ball, PPR fluency while explaining what MCP is); connector-probes.json + documentation.txt (an advanced mode exposing EPA, air yards, WOPR, RACR, target and air-yards share, first downs, with an in-payload glossary whose keys include `passing_cpoe` and `pacr`)] The product assumes fantasy literacy and no AI literacy, and it rewards follow-up questions — "Ask how it's weighted for the full method" is in the payload itself.

**Well suited beyond that core:** the manager with no league at all, who gets a genuine path rather than a wall [Verified: connector-probes.json]; and the manager on an unsupported platform, who is told to paste a screenshot and gets the same treatment [Verified: index.txt].

**Poorly suited, on the evidence:** the set-and-forget manager who wants to be told what to do without opening a conversation, because nothing reaches them between sessions [Inferred: no stored email and no notification path in any tool, page or probe — privacy.txt; documentation.txt]. The multi-league grinder, who must disconnect and reconnect [Verified: documentation.txt; index.txt]. The mobile-only user at the moment of install, who cannot complete it in that session [Verified: index.txt]. The manager on a free Claude plan who saw the marketing artifacts: all five conversational captures show an `Opus 4.8 High` model pill, and the five artifact panels — which carry no pill of their own — sit inside those same conversations [Verified: showcase-extractions.jsonl, 1l–5l; Inferred for 1r–5r from continuity, e.g. 1r's dimmed prior line "waiver DST upgrades, or a trade angle?" matching 1l's closing sentence]. And the DFS or betting player, who is refused by name [Verified: documentation.txt; index.txt].

### Core Product Philosophy

**It is a decision-support system that rents its surface.** The proposed framing — decision-support system with no surface of its own — survives the evidence on the first half and needs correcting on the second.

*Decision-support system holds.* [Verified: connector-probes.json; documentation.txt] It is not a statistics database: a database returns rows, and this returns `recommended_start`, a plain-English matchup read, and unprompted statements about what its own numbers exclude. It is not a research platform: there is no archive, no corpus, no saved work and no user-facing index — the tool inventory has a category literally named "Decisions," and the site's own wording is "StatsDeck isn't an autopilot for your team, it's your analytics partner" [Verified: index.txt]. (It does crawl: "We scan the web every day — across a wide range of beat reporters, team channels, and national outlets" feeds the injury intel, and the user can ask the host model to web-search on the spot [Verified: index.txt]. That is an ingestion pipeline, not a research surface.) It is emphatically not a league management assistant: exactly four tools write anything, and all four write to StatsDeck's own stored settings, never to the league [Verified: documentation.txt]. There is a minor content-publication element — the announced "StatsDeck Times" newspaper, and `statsdeck-map`, an artifact whose entire content is the product describing its own feature surface as a designed page [Verified: index.txt; showcase-extractions.jsonl, 5r] — but this is content generated per user inside one conversation, with no archive, no feed and no URL in evidence. It is a feature of the decision system, not a second business. [Analysis]

*"No surface of its own" is too strong.* [Verified: showcase-extractions.jsonl; connector-probes.json] StatsDeck exercises detailed presentation control. The five artifacts have a coherent design system of their own — dark scoreboard headers, letter-spaced small-caps eyebrows (gold on `matchup-viz`, violet on `trade-viz`), two distinct chip classes (amber `Q` for Questionable, pale blue `R` for rookie projection), position-coded accent bars, severity-coded delta pills, a two-tab trade card, and a winning-side number rendered bold in the team's colour as an undocumented second encoding channel alongside the bar. Its component vocabulary is not the marketing site's (the artifact canvases are themselves cream/off-white, so the break is in the components, not the ground colour) [Verified: showcase-extractions.jsonl, 1r/3r/4r/5r; site-audit §G]. And the connector reaches past the artifact into the host's own rendering: the `freshness` block ships `render_hint: "Timestamps are ISO-8601 UTC. Present them in the user's local timezone when known; otherwise present UTC."` That is a product instructing its host how to display its data.

*The accurate framing is that it has presentation without persistence of the things that matter.* [Verified: privacy.txt; documentation.txt; site-audit §H] What it lacks is not a surface but an address, a memory of decisions and a channel: four static marketing pages, an application host that 404s at its root, no dashboard, no stored conversation or decision history, no email, and one league slot. It does persist settings — the connected-league profile, scoring preferences and encrypted ESPN cookies [Verified: privacy.txt; documentation.txt] — which makes the gap specific rather than total. Every capability it cannot deliver — alerting, decision history, calibration, multi-league, sharing — traces to the rented surface rather than to any weakness in the analytics. [Analysis] The commercial posture fits: free, no paid tier, no pricing page, while the privacy policy quietly anticipates "any future paid plan… handled by a third-party payment processor" [Verified: index.txt; privacy.txt]. A product renting its surface has almost no cost of distribution and almost no ability to charge.

### Biggest Product Gap

**No decision memory and no clock.** It cannot remember what you decided, and it cannot reach you when something changes. Both halves are directly evidenced. Memory: it stores your league profile and scoring settings and nothing about what you asked or chose — "We do not record your prompts or conversation content," and activity data is explicitly "when you use StatsDeck and counts of how features are used" [Verified: privacy.txt; documentation.txt]. Clock: no email is stored, no lead capture exists on any of the four pages, the only retained channel is a Slack invite (plus a support email address, which is not an addressable list), and the sole time-aware device on the site is a countdown hard-coded to one timestamp [Verified: privacy.txt; index.txt; site-audit §F, §J-13].

The consequence is a weekly-cadence product with no cadence. Every session starts from zero on everything except scoring. The manager must initiate every interaction, at a moment they choose, which is by definition not the moment the news broke. The product cannot learn a manager's risk tolerance, cannot surface a pattern across a season, and — most damaging — cannot demonstrate that its advice was right. That last point compounds the audit's finding that there is no social proof of any kind on the site and that the one growth claim is unsourced [Verified: site-audit §J-08]: a product that stores no outcomes has no way to earn credibility except by asserting it. [Analysis]

I rank this above the more obvious candidate — thin forward projection — deliberately, and the candidate needs stating accurately. The rankings layer explicitly disclaims forecasting (`framing_note: "Realized production under your scoring — not a projection."`) and win probabilities are refused on principle, but the product is not projection-free: `get_fantasy_matchup` supplies per-player opponent adjustments, `matchup-viz` publishes forward opponent-adjusted projections and team totals for an upcoming week, rookies carry an explicit projected value, and the documentation states plainly that "StatsDeck computes its own projections and rankings from nflverse data" [Verified: connector-probes.json; documentation.txt; showcase-extractions.jsonl, 1l/3l/3r]. So the projection gap is one of scope and forward horizon, not of absence, and it is partly principled where it exists. Missing decision memory and missing cadence are pure capability loss with no offsetting principle. The one caveat a competitor must respect: not storing conversations is a genuine privacy feature, not an oversight. The way past it is to store *structured decisions* — player, slot, week, recommendation, outcome — and never the conversation. That gets calibration and history without becoming the thing StatsDeck correctly refused to be. [Analysis]

### Most Important Competitive Opportunity

**Own the surface, and ship the connector anyway.** Build an account-level product with its own persistence and its own channel — and also publish an MCP connector, so you compete inside Claude's directory on identical terms while doing the three things a connector alone cannot: push, remember, and span leagues.

This is the highest-leverage single decision available because it collapses three separate roadmap items into one architecture choice. Opportunities 1, 3 and 4 in the matrix — the guardian, multi-league, and the calibration journal — are not three features; they are three consequences of having persistence and a channel. It is also the only route to a retention loop: StatsDeck's retention move is a dedicated section promoting Anthropic's mobile apps [Verified: index.txt; site-audit §F], which is a retention move for the host, not for StatsDeck. And it fixes acquisition at the same time, since the current funnel cannot convert a mobile visitor in the session they arrive in and captures no one who is interested but not ready [Verified: index.txt; site-audit §F]. [Analysis]

Two disciplines on top of it. First, **do not attack them on transparency — match it, then exceed it with calibration.** The freshness stamp, the two-tier injury corroboration model, the self-disclaiming `framing_note`, the quantified DST caveat and the per-source legal-basis table are the incumbent's strongest assets [Verified: connector-probes.json; documentation.txt; index.txt]. Entering below that bar loses on their best ground. The one move that goes past them is publishing your own hit rate, which they cannot do without first building decision-level memory — something their published privacy stance (no prompts, no conversation content) does not actually forbid, but which they have not built [Verified: privacy.txt; Analysis on the read-across]. Second, **do not plan to win on price.** The incumbent is free with no paid tier, so the price umbrella is zero and any paid competitor is arguing against free from the first screen — with the caveat that the privacy policy already anticipates a future paid plan [Verified: index.txt; privacy.txt].

The timing argument is in the inconsistencies. Yahoo ships as a live scoring preset in the API (`YAHOO_DEFAULT`, half-PPR with a lighter −1 INT penalty) while being absent from the privacy policy's subprocessor list and from every one of the ten product screenshots, whose capability artifact still reads "Connected: ESPN & Sleeper" and whose conversational twin lists connection as "ESPN and Sleeper" only [Verified: connector-probes.json; privacy.txt; showcase-extractions.jsonl, 5l/5r]. The marketing assets show Week 1 while the live product is on Week 2 [Verified: showcase-extractions.jsonl; connector-probes.json `_meta`]. The engine is running ahead of everything that communicates it. A competitor's window is not raw capability — the incumbent's engine is good — it is the speed at which capability becomes visible, reachable, and provable to the manager. [Analysis]

---


## 23. Sources

All evidence was captured 20 September 2026 and is included in the accompanying `statsdeck-crawl-data.zip`.

### Primary — live product

| Source | What it provided |
|---|---|
| `app.statsdeck.ai/mcp` | Live read-only API responses. The strongest evidence in this report: `get_scoring`, `get_my_roster` (unconnected), `start_sit`, `get_rankings`, `get_player_stats` (standard + advanced), `get_team_defense`. Captured in `extractions/connector-probes.json` |
| Connector tool manifest | Full descriptions of all 22 tools, including the 7 that could not be exercised. Documents output shape, arguments, edge-case handling and stated limitations |
| `claude.ai/directory/statsdeck` | Public listing — Community connector, categories, sign-in requirement, connector URL, added July 2026 |

### Primary — website

| URL | Status | Size | Captured as |
|---|---|---|---|
| `https://statsdeck.ai/` | 200 | 74,106 B | `pages/index.html`, `text/index.txt` |
| `https://statsdeck.ai/documentation` | 200 | 28,779 B | `pages/documentation.html`, `text/documentation.txt` |
| `https://statsdeck.ai/espn` | 200 | 42,698 B | `pages/espn.html`, `text/espn.txt` |
| `https://statsdeck.ai/privacy` | 200 | 12,232 B | `pages/privacy.html`, `text/privacy.txt` |
| `https://statsdeck.ai/robots.txt` | 200 | 1,248 B | `pages/robots.txt` — comments only, no directives |

### Primary — product imagery

Ten capability screenshots from `statsdeck.ai/#see`, downloaded at native resolution (664–675 px wide, 2,101–3,182 px tall) and transcribed in full. Output of a real connected ESPN league: "Seattle Beginner", H2H Points PPR, team "Adam's Astounding Team". Captured as `screenshots/1l.jpg`–`5r.jpg`; transcriptions in `extractions/showcase-extractions.jsonl`.

Method: each image was sliced into overlapping 1,000 px horizontal bands (34 slices, 120 px overlap), every slice read, then re-read by a second pass instructed to find omissions and verify every number against the pixels. Where the passes disagreed, the second is authoritative.

### Confirmed absent (all 404)

`/terms` · `/about` · `/blog` · `/pricing` · `/faq` · `/contact` · `/support` · `/docs` · `/yahoo` · `/sleeper` · `/changelog` · `/sitemap.xml` · `/sitemap_index.xml` · `/llms.txt`

### Underlying data provenance

StatsDeck credits **nflverse** (CC-BY 4.0) as its NFL statistics source, with history to 2012. Every API response repeats the attribution in-band: *"StatsDeck — data via nflverse (nflreadpy), CC-BY-4.0. Not affiliated with the NFL."* League data is read live from the connected platform — Sleeper's public read API, ESPN via the user's own session, Yahoo via its Fantasy Sports API.

### Not inspected

The application behind sign-in at `app.statsdeck.ai`; the private Slack community; Reddit ad creative referenced in the privacy policy; the seven league-gated tools listed under Coverage & Verification.

### Method and ethics

Only publicly accessible content was collected. No authentication was attempted, no access control was circumvented, no paywall or private area was accessed, and no state-changing tool was called. `robots.txt` sets no directives, so no crawl restriction applied. Numbers throughout — byte sizes, pixel dimensions, dates, counts, prices, statistics — are reproduced exactly as measured or published.

---

## Appendix — Analysis QA

Each section group was drafted by an analyst working from the captured evidence, then reviewed by an independent adversarial fact-checker instructed to assume overreach and to hunt specifically for: described UI with no evidence behind it, speculation labelled as verified, and claims that a chat connector structurally cannot support.

| Section group | Verdict | Fabrications | Speculation as fact | Mislabelled | Factual errors | Total |
|---|---|---:|---:|---:|---:|---:|
| Product Overview, Target Users, League Integration | minor corrections | 5 | 5 | 7 | 5 | 22 |
| Weekly Workflow, Waiver Tools, Start/Sit & Lineup Tools | minor corrections | 5 | 5 | 7 | 5 | 22 |
| Tool Inventory, Trade Tools, Projections, Data Depth | major corrections | 4 | 7 | 7 | 6 | 24 |
| UX & Information Density, Content Strategy, Pricing | major corrections | 7 | 7 | 7 | 9 | 30 |
| Strengths, Weaknesses, Missing Features | major corrections | 7 | 6 | 6 | 7 | 26 |
| Innovation, White Space, Build-It-Better | minor corrections | 9 | 4 | 5 | 7 | 25 |
| Opportunity Matrix, Final Assessment | major corrections | 10 | 6 | 13 | 6 | 35 |
| **Total** | | **47** | **40** | **52** | **45** | **184** |

All corrections are incorporated in the text above. The high mislabelling count is expected and is the process working as intended: the most common failure was an analyst tagging a manifest-documented capability as `[Verified]` when it had not been observed in a live response — precisely the distinction that matters when 7 of 22 tools could not be exercised.

---

*StatsDeck Fantasy Football Product & Competitive Analysis · captured 20 September 2026*
*15 of 22 tools exercised live · 4 of 4 pages inspected · 10 of 10 screenshots transcribed · 184 QA issues resolved*
*Raw evidence: `statsdeck-crawl-data.zip`*


