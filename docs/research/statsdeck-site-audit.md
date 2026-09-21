# StatsDeck Site Audit

**Website scrape & structured analysis of <https://statsdeck.ai/>**

| | |
|---|---|
| **Inspected** | 20 September 2026 |
| **Pages found** | 4 |
| **Pages inspected** | 4 of 4 |
| **Paths probed** | 16 |
| **External listings verified** | 1 |
| **Showcase screenshots transcribed** | 10 (34 native-resolution slices) |
| **Live product** | Real ESPN league connected; used through a full 16-round draft |

---

## A. Executive Summary

StatsDeck is not a website with a product attached — it is a landing surface whose entire job is to walk a fantasy-football manager through installing a Claude connector, then get out of the way. The product lives inside Claude; the site exists to explain, de-risk, and instruct.

### What it is

A marketing and documentation site for **StatsDeck**, a free, beta-stage **MCP (Model Context Protocol) connector for Claude** that supplies fantasy-football context — your roster, your league's exact scoring rules, and current NFL statistics — so Claude can reason over real data instead of memory. The site sells no software of its own; the conversion event is adding a connector inside claude.ai.

### Who it targets

Season-long fantasy football managers on **Sleeper, ESPN, or Yahoo** who already use, or are willing to sign up for, Claude. The copy assumes fluency with fantasy vocabulary (FAAB, waiver priority, PPR, best ball, dynasty) but explicitly does *not* assume fluency with AI tooling — the FAQ explains what an MCP connector is, which Claude model to choose, and how usage limits work. A secondary audience is addressed directly: users with no connected league at all, who are told they can still use the tool.

### What it offers

One product, free, in beta, with **22 documented tools** spanning league connection, roster and matchup analysis, start/sit and draft decisions, and league-wide NFL data. Fantasy statistics come from **nflverse** (CC-BY 4.0); league data is read live from the user's platform. The service is **strictly read-only** against fantasy platforms and explicitly excludes DFS, odds, and betting.

### How it positions itself

Against Claude itself, not against other fantasy tools. The central argument, stated plainly in the FAQ: Claude already reasons well about football but is "working from memory" with no access to your league or current data — StatsDeck closes that gap. Positioning is anti-hype and deliberately modest: a self-described "small hobby project," an "analytics partner" rather than an autopilot, with a whole FAQ entry conceding that AI in fantasy football is "a polarizing question."

### The five findings that matter most

1. **The site is four hand-written static HTML pages** — no CMS, no framework, no build output, inline CSS and vanilla JS throughout, served from Cloudflare. It is small, fast to author, and entirely hand-maintained.
2. **The onboarding was recently cut from seven steps to three**, and the old path is still visible in dead code. Installation now routes through Anthropic's connector directory instead of a manual MCP-URL paste.
3. **The privacy policy has fallen out of sync with the product.** It is dated 14 August 2026 and names only Sleeper and ESPN; Yahoo support is advertised across the rest of the site.
4. **Trust engineering is the site's strongest feature and its main substitute for social proof.** There are no testimonials, review counts, or user numbers anywhere — the credibility load is carried by read-only guarantees, sourced-and-dated injury policy, explicit betting refusal, and unusually candid documentation about data freshness.
5. **The main product-proof section is entirely images — and they hold the richest product detail on the site.** Five capability rows are ten tall JPEGs (2.72 MB) with generic alt text. Transcribed, they reveal a named artifact system, a proprietary opponent-adjusted metric, and friendly tool-call labels that appear in no page text anywhere. None of it is indexable or accessible.

### Coverage & limitations

All four publicly reachable pages were inspected in full, both as raw HTML source and as rendered pages in a browser. Sixteen paths were probed to confirm the site's true extent.

**The ten showcase screenshots were fully transcribed.** Each was downloaded at native resolution, sliced into horizontal bands (34 in total), and read — with a second pass per screenshot checking for missed content. Findings are in section D. The lightbox reuses the same source files and the site carries no `srcset` or `<picture>`, so these are the highest-resolution versions published.

**The live product was exercised against a real league.** A public 10-team ESPN redraft league (`Chicago Pro H2H Points PPR League`) was connected and StatsDeck was used to make every pick across a full 16-round draft. This closes the coverage gap noted in earlier versions of this report, where seven league-gated tools could not be tested. Findings 20–23 come from that session; raw responses are in `extractions/live-league-probes.json`.

**Not inspected:** the private Slack community (requires joining), and the matchup, standings, schedule and trade tools — those need a completed draft *and* a played week, and the league has no results yet. Reddit ad creative referenced in the privacy policy is off-site and was not reviewed.

**Two runtime caveats:** the Google Analytics and Google Fonts requests are verified present in page source but were not observed firing in the inspection browser, which appears to block them; and the Claude directory listing is a client-rendered page, read in the browser rather than from raw HTML.

---

## B. Website Structure

The site has no navigation menu. There are four pages and one repeated call to action; everything else is on-page anchors within a long homepage.

### Sitemap

```text
statsdeck.ai/                 Homepage — long-scroll landing page, 9 anchored sections
│
├── #top              Hero
├── #announcement     Beta Team Announcements
├── #start            Join the beta — 3-step install carousel
├── #connect-league   Connect My League — 4-way accordion
├── #get-app          Get the Claude App — iOS / Android badges
├── #see              Capability showcase — 5 image rows
├── #faq              FAQ — 15 accordion items
├── #playoffs         Countdown to the Playoffs
└── (closing CTA + footer)
│
├── /espn             Connect a private ESPN league — 3 walkthroughs + auth form
├── /documentation    Full product docs — tools, data sources, troubleshooting
└── /privacy          Privacy Policy — last updated 2026-08-14

Confirmed absent (404):  /terms  /about  /blog  /pricing  /faq  /contact
                         /support  /docs  /yahoo  /sleeper  /changelog
                         /sitemap.xml  /sitemap_index.xml  /llms.txt
```

### Navigation model

- **Primary navigation: none.** The sticky header carries only the logo, a "Beta" pill, and a single *Add to Claude* button. Both the pill and the button point to the same anchor, `#start`.
- **Secondary navigation: the footer.** Four links — Documentation, Privacy policy, Support (an anchor to FAQ item 1), and Add to Claude. Subpages carry a reduced variant of the same footer plus a back-to-home link.
- **In-page navigation** does the real work: five separate links point at `#connect-league`, four at `#start`, three at `#see`.
- **Internal link graph is tiny.** The homepage links out to only two of its three subpages — `/espn` (from the ESPN accordion tile) and `/documentation` / `/privacy` (footer only). No subpage links to another subpage except through the footer.

### URL conventions

Flat, single-segment, lowercase, no trailing slashes, no extensions, no query parameters anywhere. Every page declares a self-referential canonical. There is no path hierarchy at all — no `/docs/…` tree, no dated posts, no collection or category paths.

### Page templates

Three distinct templates, all hand-authored rather than generated:

- **Landing template** (`/`) — full sticky header, badge row, section blocks, accordions, carousels, image showcase, countdown, dual-CTA footer.
- **Utility/walkthrough template** (`/espn`, `/documentation`) — compact brand bar with a back link, an eyebrow label, a single H1, long-form body, reduced footer.
- **Policy template** (`/privacy`) — same compact bar, dated H1, prose sections, minimal footer.

---

## C. Key Pages Reviewed

All four pages returned HTTP 200 and were inspected end to end.

| Page | URL | Type | Purpose | Important findings |
|---|---|---|---|---|
| **Homepage**<br>*StatsDeck — Smarter Fantasy Football* | `statsdeck.ai/` | Landing | Explain the product, prove it with screenshots, walk the visitor through installing the connector and linking a league. | H1 *Welcome to Smarter Fantasy Football*. 74 KB of HTML, 9 anchored sections, 15-item FAQ carrying most of the substantive copy. Hero CTA is education-first (*See what StatsDeck can do*), not signup-first. Playoff countdown to Week 15, Thu 17 Dec 2026, 5:15 PM PT / 8:15 PM ET. |
| **ESPN setup**<br>*Connect a private ESPN league* | `statsdeck.ai/espn` | Walkthrough + auth form | Get an ESPN session cookie out of the user's browser and into StatsDeck so a private league can be read. | The only page with an authenticated form. Three tabbed walkthroughs — Mobile Safari (9 steps), Mobile Chrome (7), Desktop Chrome (5). Ships a bookmarklet that reads the cookie values. Sign-in handled by Clerk; the cookie is posted to `app.statsdeck.ai/espn/credentials`, never into the chat transcript. |
| **Documentation** | `statsdeck.ai/documentation` | Docs | Reference for setup, the full tool inventory, data provenance, technical specs, and troubleshooting. | The most information-dense page on the site. Lists all 22 tools in four groups, names the MCP server URL, transport and auth, and states data sources with their legal basis. Contains an explicit "What StatsDeck will not do" section and five troubleshooting scenarios. |
| **Privacy Policy** | `statsdeck.ai/privacy` | Policy | Disclose collection, use, storage, retention, and sharing. | Dated **14 August 2026**. Names every subprocessor: Clerk, Google, Railway, Cloudflare, Reddit, Sleeper/ESPN, nflverse. Discloses a one-time SHA-256 hashed email to Reddit's Conversions API for ad attribution. **Omits Yahoo entirely** despite Yahoo support being advertised sitewide. |

### External destination inspected

The install CTA routes to Anthropic's connector directory, which is the actual conversion endpoint. Its listing was read to verify the product's public registration:

| Field | Value |
|---|---|
| Listing | claude.ai/directory/statsdeck — StatsDeck, tagline "Smarter fantasy football" |
| Status | **Community** connector — the page states community connectors have undergone automated review but are not verified by Anthropic |
| Categories | Media and entertainment · Data |
| Sign-in | Required |
| Connector URL | `https://app.statsdeck.ai/mcp` |
| Added | July 2026 |
| Tools listed | 18 shown alphabetically behind a "Show all" control — consistent with the 22 documented on `/documentation` |

The listing's description text is reused *verbatim* from the opening of `/documentation` — the same two paragraphs, unchanged.

---

## D. Products / Services

### The offer

| Attribute | Detail |
|---|---|
| Product | StatsDeck — a custom MCP connector for Claude |
| Price | **Free.** Stated flatly in the FAQ: StatsDeck is completely free. No paid tier, no trial, no pricing page exists. |
| Adjacent cost | Claude itself is free with rolling usage limits; the FAQ notes paid Claude plans start at **$20/month** (Claude Pro) and that the free tier is enough for most managers |
| Stage | Beta — signalled by a header pill, a "Join the beta" section heading, and a "Beta Team Announcements" block |
| Platforms | Sleeper · ESPN (public and private) · Yahoo |
| League types | Redraft, dynasty, best ball; standard, PPR, half-PPR, and custom scoring |
| Coverage | NFL — QB, RB, WR, TE, K, and team defenses |
| Access model | **Read-only.** No write calls to any fantasy platform |
| Explicitly excluded | DFS, odds, betting, spreads, win probabilities |
| Guarantee | No money-back guarantee exists — the product is free. The functional guarantees offered instead are read-only access, no conversation storage, and deletion on request |

### Tool inventory — 22 tools in four groups

Named on `/documentation`. Users never call these directly; Claude selects them from natural-language requests.

**Connection (5)**

| Tool | Function |
|---|---|
| `connect_league` | Links a Sleeper, ESPN, or Yahoo league so answers use the real roster and scoring |
| `disconnect_league` | Unlinks the league; confirms first and names the league before changing anything |
| `save_espn_credentials` | Stores encrypted ESPN session cookies for private-league reads |
| `get_scoring` | Shows the scoring currently in use, and what else is available |
| `set_scoring` | Sets the scoring used, so every points number matches the league |

**Your league (7)**

| Tool | Function |
|---|---|
| `get_my_roster` | Team rundown — starters and bench scored, strengths, holes, roster construction, and any bench player outscoring a starter |
| `get_league_team` | The same rundown for any other team in the league |
| `get_fantasy_matchup` | Head-to-head for a week: both lineups, league record, per-player opponent adjustment |
| `get_fantasy_schedule` | Full season schedule for any team, with records and scores once played |
| `get_standings` | League standings, best to worst, with records |
| `get_available_players` | Waiver/free-agent board with add state and FAAB or waiver priority |
| `get_trades` | Pending offers and completed trades, both sides scored |

**Decisions (2)**

| Tool | Function |
|---|---|
| `start_sit` | Ranked start/sit call between two or more players, with each one's real NFL opponent |
| `draft_help` | Draft board tiered under exact scoring to expose value cliffs; goes live during a connected draft |

**NFL data (8)**

| Tool | Function |
|---|---|
| `get_player_stats` | Player production with fantasy points under your scoring |
| `get_rankings` | League-wide leaderboards by position and metric |
| `get_snap_counts` | Snap counts and snap share for several players at once |
| `get_team_defense` | Team defense/DST scoring with components and opponent generosity |
| `get_kicker_stats` | Kicker game lines and distance splits, scored under your bands |
| `get_team_roster` | An NFL team's real roster and depth chart |
| `get_injuries` | The official weekly injury report |
| `get_schedule` | The NFL game slate — a team's schedule, or a full week |

The documentation is precise about state: exactly four tools write anything — `connect_league`, `disconnect_league`, `save_espn_credentials`, `set_scoring` — and all four write only to StatsDeck's own stored settings, never to the user's league.

### Feature tiers inside the product

Rather than pricing tiers, StatsDeck has conversational depth tiers — two phrases unlock more capability, and the site teaches both:

- **"I want to go deeper"** — an advanced mode that widens player rows with efficiency and opportunity metrics: EPA, CPOE, air yards, target and air-yards share, WOPR, RACR/PACR, first downs, with a glossary on first use.
- **"Make me a visualization"** — returns structured data Claude renders as charts, tables, or layouts. The showcase screenshots confirm this in practice, displaying named artifacts such as `roster-viz` and `pivot-chart`.

### What the showcase screenshots actually demonstrate

*(Confidence: High — all ten screenshots transcribed at native resolution, each with a completeness re-read)*

This is the single largest body of product information on the site, and none of it exists as text. Every screenshot is a real Claude conversation against one consistent demo league.

**The demo league.** An **ESPN** league named `SEATTLE BEGINNER`, format `H2H POINTS PPR`. The user's team is "Adam's Astounding Team"; the Week 1 opponent is "Smokey the Bear"; rival managers named include "Gibbs Train!" and "Doctor's team". Figures are internally consistent across all five rows — Jacksonville DST 8.2, Terry McLaurin 13.5, and Malik Nabers, Rashee Rice, Cam Skattebo and Harold Fannin Jr. carry the same values wherever they reappear.

**A named artifact system.** The site's text only promises "a clean visual." The screenshots show five distinct, purpose-built artifact types, each with its own title bar, layout, legend, and controls:

| Artifact | Row | What it renders |
|---|---|---|
| `roster-viz` | Rosters & Draft Help | Positional strength chart — six position rows with rostered count, colour-coded bar, a **startable-baseline tick**, quality PPG, and a Strength / Surplus / Solid / Weakness badge; dark "LEAN ON" / "SHORE UP" takeaway card |
| `pivot-chart` | Start / Sit | "Next Man Up" injury-contingency card — each Questionable starter mapped to a replacement with a colour-coded point delta and a "High impact" triage tag |
| `matchup-viz` | Matchups | Head-to-head "tale of the tape" — dark scoreboard, nine slot-by-slot rows with both sides' opponent-adjusted projections, Q and R status chips, and a "WHERE IT'S WON & LOST" analysis card |
| `trade-viz` | Trades | Trade-proposal card with a **two-tab switcher** (The Deal / Lineup Impact), YOU GIVE vs YOU GET totals in PPG, and a dark "WHY YOU DO IT" / "WHY THEY ACCEPT" panel |
| `statsdeck-map` | All The Things | A designed "CAPABILITY MAP" page — four colour-coded cards (Leagues & Teams 3, Weekly Management 4, Player Research 4, League Moves 3) enumerating the connector's own feature surface |

**"Opponent-adjusted" is the product's signature metric.** It appears in every row and is stamped into artifact chrome — `matchup-viz` headers read `WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED`, and its legend reads "Bars = opponent-adjusted PPG · solid = slot winner". The conversational answers use an `adj` suffix inline (e.g. "Skattebo (~18 adj vs DAL)"). The site's prose mentions opponent adjustment only in passing on `/documentation`.

**Tool-call chips use friendly labels, not tool names.** Collapsed, expandable chips are visible in three rows — `Start/sit call`, `My matchup`, `My roster`, `League team`. These map to the documented `start_sit`, `get_fantasy_matchup`, `get_my_roster` and `get_league_team`. That naming layer appears nowhere in the site's text.

**The scoring label claim is visually substantiated.** Every artifact header carries its scoring format — `H2H POINTS PPR` on the matchup and trade cards, `SEATTLE BEGINNER · H2H POINTS PPR` on the roster chart. This is the site's central promise, demonstrated rather than asserted.

**Capabilities visible only in the screenshots:**

- **Per-position startable baselines.** The baseline tick sits at a measurably different position in every row of `roster-viz` (QB, RB and WR ticks furthest right; K and DST furthest left), so it is a position-specific replacement-level threshold, not one shared line.
- **Cross-checking the platform's own projection.** `matchup-viz` states the margin and then adds that ESPN's native projection has it closer — an explicit reconciliation against the host platform's number.
- **Rookie-projection flagging as a first-class UI element.** `R` chips mark players projected without NFL history (Jeremiyah Love, Carnell Tate), alongside `Q` chips for Questionable.
- **Small-sample and no-history honesty, visible in output.** The roster pull annotates "Cam Skattebo — 16.0 (8 games)" and "Jordyn Tyson — rookie, ~9.3 projected" rather than presenting a bare average.
- **Two deliberately separate numbers.** The roster pull shows season averages (Nabers 17.1); the matchup and contingency artifacts show opponent-adjusted values for the same players (Nabers 21.9). This is the rank-vs-points separation the documentation describes, shown in practice.
- **Kickers and team defenses are first-class** in every artifact, not omitted as afterthoughts.
- **Trade reasoning models the counterparty.** The trade row scans other managers' rosters, rejects a poor-fit team, and argues the deal from the other manager's perspective, including their fallback at the position.

### Platform capability differences

A recurring and unusually honest pattern: the site documents where each integration is weaker rather than flattening the differences.

| Platform | Connection method | Trade visibility | Switching leagues |
|---|---|---|---|
| **Sleeper** | Username only — one step, public read API | Completed trades, including draft picks and FAAB | By name; no disconnect needed within Sleeper |
| **ESPN** (public) | League ID only | Completed trades **and pending offers** — the only platform where pending offers are visible | By league ID; no disconnect needed within ESPN |
| **ESPN** (private) | League ID + `SWID` and `espn_s2` session cookies, captured on `/espn`; one-time | *(as above)* | *(as above)* |
| **Yahoo** | OAuth-style sign-in and approval; one-time | Completed trades only | **Must disconnect first** — the only platform requiring it |

Where a platform cannot be read, the site offers a manual fallback in the same breath: describe the offer or paste a screenshot into Claude, and it is evaluated the same way. Unsupported platforms get the same answer — screenshots still work.

### Upsells, cross-sells, subscriptions

There are no upsells or cross-sells in the commercial sense. The only "upgrade" paths promoted are other companies' products: **Claude Pro at $20/month** for higher limits and access to the Opus model, and the **Claude mobile apps** on iOS and Android, promoted in a dedicated section positioned after the install flow — a retention move, not a revenue one. The FAQ includes a model-selection table recommending Sonnet (free, default) as sufficient, with Opus as a paid step up and Fable characterised as more than fantasy questions require.

One forward-looking commercial signal appears in the privacy policy only: it states that card details are not collected directly and that any future paid plan would be handled by a third-party payment processor. *(Confidence: High)*

---

## E. Messaging & Positioning

### Primary value proposition

**Direct evidence.** The meta description states the offer compactly: fantasy football analytics inside Claude, computed on your league's real scoring and your real roster. The FAQ makes the competitive argument explicit — Claude reasons about football well but works from memory, without access to your league or current NFL data, and StatsDeck fills that gap with your actual roster, your league's exact scoring, and the nflverse dataset.

**Interpretation.** The positioning is unusual and deliberate: the named competitor is *the host AI itself*, not other fantasy tools. No rival product is mentioned anywhere on the site. This frames StatsDeck as an accessory rather than a replacement, which lowers the perceived switching cost to near zero — you are not asked to abandon a tool, only to add context to one you may already use.

### Target audience

**Direct evidence.** Hero badges declare the scope: add-on for Claude; 2026 fantasy football, NFL; built on nflverse. The FAQ names supported league types (redraft, dynasty, best ball) and states the product is built for season-long fantasy football, not DFS.

**Interpretation.** Three concentric audiences are addressed in sequence: managers with a supported league (primary), managers on unsupported platforms (told to paste screenshots), and users with no league at all (given a dedicated "No League" accordion tile). This last group is a deliberate widening of the funnel — the product is made usable before any integration commitment.

### Pain points addressed

- **Wrong numbers.** Generic fantasy advice doesn't match your league's scoring — answered by the repeated "your league's exact scoring" promise and a labelled scoring stamp on every response.
- **Stale data.** Answered by a long freshness FAQ that concedes limits rather than overclaiming.
- **Injury uncertainty.** Answered with a layered, explicitly sourced-and-dated injury methodology.
- **Fear of automated action.** Answered by the read-only guarantee, repeated on three of four pages.
- **Setup friction.** Answered with step-by-step screenshot carousels for every path, and a dedicated page for the hardest one.

### Brand voice

Plain-spoken, technically candid, and self-deprecating. Three characteristics stand out:

- **It concedes limitations before being asked.** The freshness FAQ states outright that "fresh" isn't the same as real-time, explains that stat lines update in waves through game day, and notes the NFL issues stat corrections through the following Wednesday.
- **It refuses adjacent markets on principle.** The footer runs a standing line: a stats tool, not a betting tool. DFS gets its own FAQ entry answered with a flat "No."
- **It answers the awkward question directly.** One FAQ asks whether AI belongs in fantasy football and calls it polarizing before arguing StatsDeck is an analytics partner, not an autopilot — then concedes that no AI can predict the future. A second asks, in the site's own joking words, whether StatsDeck is built by a faceless corporation bent on AI world domination, and answers that it started as a small hobby project.

### Recurring terminology

`your league's exact scoring` · `read-only` · `opponent adjustment` · `nflverse` · `"I want to go deeper"` · `"make me a visualization"` · `freshness stamp` · `sourced and dated` · `analytics partner, not an autopilot` · `Beta`

### Objections addressed, in FAQ order

The FAQ is the site's real body copy — 15 items that function as a sequenced objection-handling script:

1. How do I give feedback or ask a question?
2. What is StatsDeck?
3. What can StatsDeck do?
4. Can't Claude do all of this already?
5. How fresh is the data, and where does it come from?
6. How does StatsDeck handle injury information?
7. What does it cost?
8. What leagues does StatsDeck support?
9. How can I switch between multiple leagues & platforms?
10. What about trades and waivers visibility?
11. What about waivers and FAAB?
12. Does StatsDeck support Daily Fantasy Sports (DFS)?
13. Does StatsDeck make changes to my team for me?
14. What Claude model should I use?
15. Does AI have a place in fantasy football? / Who built this?

Notably, cost is answered *seventh*, not first, and the sequence ends on two philosophical questions rather than a sales close.

### Trust-building language

- **Independence disclaimer**, repeated in every footer: not affiliated with, endorsed by, or sponsored by Anthropic, ESPN, Sleeper, Yahoo, or the NFL.
- **Attribution as credibility** — nflverse credited with its CC-BY 4.0 licence in every footer and in a hero badge; a separate Yahoo Fantasy attribution link.
- **Legal-basis table** on `/documentation` stating, per source, on whose authority data is read.
- **Negative claims as promises** — a "What StatsDeck will not do" section and a "What we don't do" list in the privacy policy.

### Urgency and scarcity

**Essentially absent.** There is no limited-time offer, no seat cap, no countdown-to-signup, and no exit intent. The only timer on the site counts down to the fantasy playoffs — a real calendar event with no bearing on availability.

The one soft-pressure element is the announcement claim that StatsDeck is now the fastest-growing fantasy tool for 2026. **No source, metric, or comparison set is given anywhere on the site.** *(Confidence: High — quoted directly from the announcement block; the substance of the claim is unverifiable from public pages.)*

---

## F. UX & Conversion Patterns

### The primary journey

There is exactly one conversion path, and the homepage is ordered to serve it:

```text
1. Land        Hero · badges · H1 · platform logos
                 ↓  CTA is "See what StatsDeck can do" → #see, not a signup
2. Believe     #see — 5 rows of real Claude-conversation screenshots
                 ↓
3. Install     #start — 3-step carousel → claude.ai/directory/statsdeck
                 ↓  "Connect League" button on final step scrolls to ↓
4. Connect     #connect-league — pick Sleeper / ESPN / Yahoo / No League
                 ↓  ESPN branches out to /espn (the one high-friction path)
5. Retain      #get-app — iOS & Android badges for the Claude app
```

### What the design does well

- **The hero refuses to ask for the signup.** The single hero button sends visitors to proof, not to install. The install CTA is parked in the sticky header, always reachable but never the thing pushed first. For a free beta product whose value is hard to imagine, showing before asking is the right order.
- **Friction is isolated, not averaged.** Three of four platforms resolve inside an accordion on the homepage. ESPN — the only one needing browser cookies — is the sole tile that leaves the page, so its complexity never taxes the other three.
- **The dead end is designed.** "No League" is given equal visual weight in the 2×2 grid and answers with a usable path rather than a wall.
- **The install flow ends by starting the next one.** On the carousel's final step the Next button relabels itself "Connect League" and scrolls to the league section instead of advancing — the two sequential tasks are chained without the user having to find step two.
- **Credentials bypass the chat transcript.** On `/espn`, the ESPN cookie is pasted into an authenticated form on StatsDeck's own site rather than into a Claude conversation. The page explicitly instructs the user to sign in with the same account used when connecting StatsDeck in Claude.

### Friction points and gaps

- **Desktop is mandatory for install.** The first carousel step warns that this step must be done on the web, not the mobile app. Any mobile visitor who arrives ready to convert cannot — and there is no way to send themselves a link, no email capture, no "continue on desktop" handoff.
- **No lead capture exists anywhere.** No newsletter, no waitlist, no contact form, no email field on any of the four pages. A visitor who is interested but not ready is unrecoverable; the only retained channel is Slack.
- **No social proof of any kind.** No testimonials, ratings, user counts, logos, or case studies. The one quantitative claim — fastest-growing — is unsourced.
- **The proof section is very heavy.** Ten JPEGs totalling 2.72 MB, some over 3,000 px tall, sit between the install flow and the FAQ. They are lazy-loaded, but a visitor who scrolls the intended path downloads all of them.
- **Support is a two-hop path.** The footer's "Support" link is an anchor to FAQ item 1, which then offers Slack or email. There is no direct contact page — `/contact` and `/support` both 404.
- **The showcase is unreadable to assistive technology** and to search engines. Alt text is generic — "StatsDeck rosters — screenshot 1" and similar.

### Interaction mechanics

- **Single-open accordions** with correct `aria-expanded` / `aria-controls` wiring, used twice on the homepage (league picker, FAQ) with separate ID namespaces, and again as the tab sets on `/espn`.
- **Linear steppers** with Back/Next and an "n / total" counter — the install carousel and all three ESPN walkthroughs share one interaction grammar.
- **A shared lightbox**, instantiated once and reused by every showcase image, with a labelled dialog role and a close control.
- **Reduced-motion respected** — smooth scrolling is skipped when the user's system requests it.
- **Sticky-header offsets handled explicitly** — anchor targets carry `scroll-margin-top: 90px` with a source comment noting the header measures roughly 73 px on desktop and 106 px on mobile.

### Mobile behaviour

*(Confidence: High — verified at 375×812)*

The layout adapts cleanly. The header stacks into two rows (logo and CTA, then the Beta pill), hero badges wrap to two lines, the primary CTA goes near-full-width, and the platform logo row stays horizontal. No horizontal overflow was observed.

---

## G. Visual System

A coherent, hand-built design system expressed as CSS custom properties in the homepage's inline stylesheet — an editorial "newsprint meets scoreboard" look rather than a typical SaaS palette.

### Design tokens

*(Confidence: High — read directly from `:root`)*

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F8F7F3` | Page ground (warm cream) |
| `--paper-2` | `#FFFFFF` | Raised surface |
| `--ink` | `#34373E` | Body text |
| `--ink-soft` | `#5C616B` | Secondary text |
| `--line` | `#E6E3DB` | Hairline rules |
| `--line-2` | `#D6D2C8` | Stronger borders |
| `--field` | `#2B2E34` | Dark field |
| `--brand` | `#2693BE` | Primary accent (cyan-blue) |
| `--brand-dark` | `#1F7CA1` | Accent hover/active |
| `--brand-soft` | `#E2F1F7` | Accent tint |
| `--gold` | `#FFCA08` | Beta / attention |
| `--gold-dark` | `#C99700` | Gold text on light |
| `--verified` | `#179E5C` | Semantic positive |
| `--verified-soft` | `#E4F4EC` | Positive tint |
| `--warn` | `#B9762A` | Semantic caution |
| `--warn-soft` | `#F6ECDD` | Caution tint |

Layout tokens: `--maxw: 1080px`, `--radius: 14px`.

The neutrals are warm — a cream paper ground with beige rules — while the accent is a cool cyan-blue. Gold reads as the beta/attention colour; green and amber are reserved semantic pairs, each with a soft companion tint.

### Typography — three families, three jobs

| Role | Typeface | Usage |
|---|---|---|
| Display | **Saira Condensed** 500/600/700 | All headings and the `.display` class. Condensed, sporty, does the scoreboard work. |
| Body | **Inter** 400/500/600 | Running text at 1.6 line-height, with antialiasing and `optimizeLegibility` set on `body`. |
| Data | **JetBrains Mono** 400/500/700 | Badges, counters, and utility labels. |
| Delivery | Google Fonts | One stylesheet request with `display=swap`, preceded by preconnects to both font hosts. |

### Recurring components

- **Badge pills** — uppercase condensed type, letter-spaced, pill-radius, hairline border on paper. Used for hero context badges and the gold Beta pill.
- **Buttons** — solid cyan primary with uppercase condensed label; a bordered secondary on paper. Consistent across hero, carousel, and closing CTA.
- **Accordion tiles** — bordered rectangles in a 2×2 grid, uppercase centred labels, expanding to reveal prose.
- **Carousel module** — square image, caption block with reserved minimum height so the nav row never shifts between slides, then Back / counter / Next.
- **Showcase pair** — the site's signature module: a two-up row of tall phone-shaped screenshots under a condensed H2. Left screenshot shows the conversational answer; right shows a generated visualization artifact. Repeated five times without variation.
- **Announcement card** — bordered card with copy on the left and a square figure on the right.
- **Countdown grid** — four numeric cells (days/hours/minutes/seconds) in oversized display type, replaced wholesale by a "Playoffs are live!" message when the target passes.

### Imagery & illustration

- **Product imagery is exclusively real screenshots** of Claude conversations — no mockups, no stock photography, no illustration of the product. All ten were transcribed; see section D for their contents.
- **The artifacts have their own design language**, distinct from the marketing site: dark scoreboard headers with letter-spaced uppercase eyebrows (`WEEK 1 · INJURY CONTINGENCY`), colour-coded status chips (`Q`, `R`), semantic colour for gain and loss (rust-red gives, dark-green gets), position badges, tabbed panels, and dark two-column takeaway cards. The site's cream-and-cyan palette does not appear inside them.
- **Each screenshot carries a `StatsDeck AI — FOR ✳ Claude` lockup** composited below the captured frame: the wordmark in dark navy with "AI" in amber, a layered card-deck glyph with a gold four-point sparkle, and the Anthropic starburst between "FOR" and "Claude".
- **The screenshots were captured on a paid, high-effort configuration.** The Claude composer's model pill reads `Opus 4.8 High` in every conversational screenshot — a model token plus a separate effort token.
- **Iconography is minimal and inline.** A flat football is hand-authored as inline SVG with a rotation transform and five lace strokes, and appears twice — once in the hero, once beside the announcement heading. A clipboard icon is likewise inline SVG.
- **Third-party logos** (Sleeper, ESPN, Yahoo, App Store, Google Play) are supplied as fixed 96×96 PNGs.
- **A text fallback is wired for the logo** — if `logo.png` fails, an `onerror` handler reveals a styled "StatsDeck AI" wordmark instead.

### Layout grammar

A single 1080 px content column with 24 px side padding, vertically segmented into full-width section blocks separated by hairline rules. Headings are centred in most sections; body copy is left-aligned. The rhythm is consistently section → heading → supporting line → module. Type scales are fluid, using `clamp()` with viewport units.

---

## H. Technical Observations

### Stack

*(Confidence: High unless noted)*

| Layer | Finding |
|---|---|
| Site architecture | Hand-written static HTML. No CMS, no framework, no build artifacts, no hydration payload, no JS bundles. CSS is inline in `<style>`; all behaviour is vanilla JS in IIFEs at the end of each document, extensively commented. |
| Marketing host | Cloudflare — `Server: cloudflare`, `CF-Cache-Status: HIT`, resolving to 104.21.19.21 / 172.67.184.121. Static hosting on Cloudflare Pages or equivalent. *(Medium confidence on the specific product.)* |
| Application backend | `app.statsdeck.ai` → CNAME `akgxapr1.up.railway.app` — **Railway**, matching the hosting provider named in the privacy policy. Its root returns 404: API-only, no web UI. |
| Authentication | **Clerk.** ClerkJS loads from the vanity frontend-API host `clerk.statsdeck.ai` with a live publishable key on a data attribute. Used on `/espn` for `openSignIn`, session tokens, and sign-out. |
| MCP endpoint | `https://app.statsdeck.ai/mcp` — transport **Streamable HTTP**, auth **OAuth 2.0** (stated on `/documentation` and corroborated by the Claude directory listing). |
| Credential endpoint | `POST https://app.statsdeck.ai/espn/credentials`, authorised with a Clerk session token obtained via `Clerk.session.getToken()`. |
| Analytics | **GA4**, measurement ID `G-68LC4BTCQ8`, loaded via `gtag.js` on all four pages. **Cloudflare RUM** also active — a `POST /cdn-cgi/rum` beacon returning 204 was observed at runtime. |
| Fonts | Google Fonts, single request, with preconnects. |
| Encryption at rest | ESPN session cookies stored **AES-256-GCM** (stated on both `/documentation` and `/privacy`). *(Medium — a stated claim, not externally verifiable.)* |

### SEO posture

| Signal | State | Note |
|---|---|---|
| Titles & meta descriptions | Present on all 4 pages | Distinct and well-written per page |
| Canonical tags | Present on all 4 pages | Self-referential, absolute |
| Open Graph / Twitter | Complete on all 4 pages | og:type, title, description, url, and a fully dimensioned 1200×630 image with alt; twitter:card set to summary_large_image |
| Heading hierarchy | Valid | One H1 per page, H2 section heads below it |
| **Structured data** | **None** | Zero `application/ld+json` blocks sitewide. The 15-item FAQ is a natural FAQPage candidate; the tool inventory suits SoftwareApplication |
| **XML sitemap** | **Absent** | `/sitemap.xml` and `/sitemap_index.xml` both 404 |
| **robots.txt** | **No directives** | 1,248 bytes of Cloudflare content-signal boilerplate — comments only. No User-agent, Allow, Disallow, or Sitemap line, and no content-signal values are actually set, so nothing is granted or restricted |
| meta robots | Absent | Default indexable |
| `llms.txt` | Absent | 404 |
| Custom 404 | **None** | Unknown paths return status 404 with an empty body |
| Indexable body copy | Thin on the highest-value section | The entire capability showcase is images with generic alt text |

### Security headers

*(Confidence: High)*

**None are set.** The response to `GET /` carries no `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. Headers returned are limited to content type, connection, Cloudflare cache status, `Cache-Control: public, max-age=0, must-revalidate`, server, and alt-svc.

This matters more than it would on a pure brochure site, because `/espn` is a live authenticated page that accepts ESPN session cookies and posts them to an API with a bearer token. Absent framing and transport protections on that origin are a real gap rather than a hygiene nitpick.

### Page weight & image handling

| Item | Measurement |
|---|---|
| HTML | Homepage 74,106 B · `/espn` 42,698 B · `/documentation` 28,779 B · `/privacy` 12,232 B |
| Showcase images | **2,790,331 B** across 10 JPEGs — largest single file 500,448 B. All carry `loading="lazy"` and explicit width/height, so layout is stable and initial paint is unaffected |
| Accordion images | `connect-league/sleeper-fixed.jpg` 255,920 B and `connect-league/yahoo-connect2-v2.png` 462,042 B — **717,962 B** inside the Connect My League panels |
| Eager assets | `logo.png` 159,720 B — a large PNG for a small header mark, loaded on every page. `og-1200x630-v1.png` 176,345 B. `favicon-512.png` 108,753 B, also reused as the announcement figure |
| Fully-scrolled homepage | Roughly **3.85 MB** with all accordions opened — showcase, accordion panels, carousel steps, logo and favicon together |
| Formats | JPEG and PNG only — no WebP or AVIF, and **zero `srcset` or `<picture>` across all four pages**. Screenshots up to 3,182 px tall are served at full size to every device, and the lightbox re-serves the same file rather than a larger one |
| Rendering | Fully server-delivered static HTML; JS only enhances. Content is readable with scripting disabled, though carousels then show their static first slide |
| Console | No errors or warnings logged on load |

### Cache-busting convention

*(Confidence: High)*

Both carousel scripts carry image-override maps with versioned filenames — `desktop-4b`, `safari-8b`, `chrome-6b`, `6-new-aug26`, `7-new`. A source comment explains the practice: never overwrite an existing image filename, because a stale CDN edge entry once kept serving old bytes. This is a hand-rolled substitute for content-hashed asset names — effective, and a clear marker of static-site authoring without a build pipeline.

---

## I. Repeated Patterns

Deduplicated: each pattern is stated once with representative examples rather than re-reported per page.

### Structural patterns

- **One template, three variants.** The compact brand bar with a back-arrow home link, eyebrow label, single H1, and reduced footer repeats byte-similar across `/espn`, `/documentation`, and `/privacy`.
- **The footer disclaimer block is the site's constant.** The nflverse CC-BY credit, the independence disclaimer naming Anthropic, ESPN, Sleeper, Yahoo and the NFL, and the Yahoo Fantasy attribution link appear on all four pages, verbatim.
- **Accordion and stepper grammars are reused, not reinvented.** Source comments on the FAQ explicitly note it mirrors the league-picker's ARIA pattern in its own ID namespace.

### Content patterns

- **Capability claims are always paired with a limit.** Trades are answered with per-platform visibility differences; freshness with a wave-by-wave schedule and a stat-correction caveat; injuries with a corroboration hierarchy that states the official report wins ties. The pattern holds across the FAQ and the documentation.
- **Every unsupported path gets a fallback in the same sentence.** Unsupported platform, pending offer invisible, no league connected — each is answered with "paste a screenshot" or an equivalent manual route rather than a refusal.
- **Copy is reused across surfaces rather than rewritten.** The documentation's opening two paragraphs appear verbatim as the Claude directory listing description.
- **Provenance is attached to every data claim** — source and date on injury intel, a freshness stamp on stats answers, a scoring label on every points figure, and a legal-basis column in the data-sources table.

### Conversion patterns

- **One CTA, many entrances.** "Add to Claude" / `#start` appears in the sticky header, the Beta pill, and the closing CTA; `#connect-league` is linked five times, including from all three hero platform logos. There is no competing secondary conversion anywhere.
- **Sequential tasks are chained.** Install ends by scrolling to connect; connect's ESPN branch ends by telling the user the exact sentence to say back in Claude.
- **Exact phrasing is scripted for the user.** The site repeatedly supplies the literal words to type — the ESPN connect sentence, "I want to go deeper," "make me a visualization," and per-platform league-switching phrasings. This is conversion copy for a chat interface, where the CTA is a sentence rather than a button.

### Visual patterns

- **Every proof module is a two-up screenshot pair** under a condensed H2 — conversational answer left, generated visualization right, five times.
- **Uppercase condensed type marks every interactive or label element** — buttons, badges, accordion tiles, tab labels, step counters.
- **Hairline rules separate sections; radius and fill are reserved** for cards, pills, and buttons rather than applied to every block.

---

## J. Notable Findings

Ranked by strategic significance. Each is stated with its evidence, source, and confidence.

### 01 — The privacy policy has fallen out of sync with the product: Yahoo is missing

**Confidence:** High

**Finding:** Yahoo is advertised as a supported platform across the homepage, documentation, and every footer, but the privacy policy never mentions it. Its "What we collect" section scopes league data to "Sleeper or ESPN," and its subprocessor list names only Sleeper/ESPN for platform reads. The policy is dated 14 August 2026, suggesting Yahoo support shipped after the last policy revision.

**Evidence:** Homepage FAQ names Sleeper, ESPN, and Yahoo as supported; `/documentation` lists Yahoo in its platforms line and its data-sources table with basis "through Yahoo's Fantasy Sports API"; every footer carries a Yahoo Fantasy attribution link. The privacy policy contains neither.

**Corroborating evidence from the showcase.** Yahoo is missing from the product screenshots too. The `statsdeck-map` capability artifact carries a footer reading "Connected: ESPN & Sleeper · redraft & dynasty · scored under each league's exact settings", and the conversational capability rundown beside it lists league connection as "ESPN and Sleeper" only. Two independent surfaces — the legal policy and the marketing imagery — both predate Yahoo support.

**Source:** `statsdeck.ai/privacy` · `statsdeck.ai/documentation` · `statsdeck.ai/` · `statsdeck.ai/#see` (images `5l.jpg`, `5r.jpg`)

**Why it matters:** Yahoo access is OAuth-granted and user-authorised, which is exactly the kind of processing a privacy policy is expected to disclose. The showcase corroboration turns this from a possible oversight into a clear pattern: Yahoo shipped, and the policy and proof assets were never revised. This is the single most actionable defect on the site.

### 02 — Onboarding was cut from seven steps to three; the old flow survives as dead code

**Confidence:** High

**Finding:** The install carousel now runs three steps, routing users to Anthropic's connector directory. The previous seven-step flow, which had users copy an MCP URL and paste it into Claude's custom-connector dialog, is still present in the source as unreferenced code.

**Evidence:** The script sets `TOTAL = 3` with three captions, yet still declares an unused `MCP_URL` constant and a clipboard `COPY_ICON`; a CSS comment reserves caption height "across all 7 slides"; a JS comment references "the MCP URL (caption 5)"; and the image override map points steps 2 and 3 at files named `6-new-aug26` and `7-new` — the old step numbering.

**Source:** `statsdeck.ai/` (inline script, connect-carousel IIFE)

**Why it matters:** A major friction reduction — manual URL paste replaced by a directory install. The filename `6-new-aug26` dates the change to around August 2026, consistent with the directory listing's July 2026 addition.

### 03 — Credential capture was deliberately moved off the chat transcript

**Confidence:** High

**Finding:** Rather than having users paste ESPN session cookies into a Claude conversation, `/espn` hosts a three-state authenticated form: sign in with Clerk, paste, save. The cookie goes straight to StatsDeck's API with a session token.

**Evidence:** Step 2 on `/espn` instructs the user to sign in with the same account used when connecting StatsDeck in Claude; the script resolves signed-out / paste / saved states from Clerk and posts to `app.statsdeck.ai/espn/credentials` using `Clerk.session.getToken()`. Source comments label this "S96-b direct entry."

**Source:** `statsdeck.ai/espn`

**Why it matters:** Genuinely good security design: a long-lived session credential never enters a chat log. It is undercut by the total absence of security headers on the same origin (finding 05).

### 04 — The most persuasive content on the site is invisible to search engines and screen readers

**Confidence:** High

**Finding:** The capability showcase — five rows covering rosters/draft, start/sit, matchups, trades, and general use — contains no text at all beyond its five H2s. It is ten JPEGs with placeholder-grade alt text.

**Evidence:** Section markup consists of five `.showcase-row` blocks, each an H2 plus two `<img>` elements. Alt values follow the pattern "StatsDeck trades — screenshot 1". Combined weight 2,790,331 B; tallest image 3,182 px.

Transcribing them establishes the scale of the loss. The images contain five named artifact types (`roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz`, `statsdeck-map`), the product's signature opponent-adjusted metric, per-position startable baselines, Q and R status chips, a two-tab trade card, the friendly tool-call labels, and roughly sixty player-and-number data points — **none of which appears as text anywhere on the site.**

**Source:** `statsdeck.ai/#see`

**Why it matters:** The hero's only CTA sends visitors here, so it is the designated proof surface. It holds the richest product detail the company has published, and search engines, screen readers, and text-based AI crawlers all see five generic headings and ten files called "screenshot 1". Descriptive alt text and a short text caption per row would recover most of it.

### 05 — No security headers on an origin that handles session credentials

**Confidence:** High

**Finding:** Not one of HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy is returned.

**Evidence:** Header inspection of `GET https://statsdeck.ai/` returns only content type, connection, CF cache status, Cache-Control, server, and alt-svc. A case-insensitive match across the six standard security headers returns zero.

**Source:** `statsdeck.ai/` (response headers)

**Why it matters:** On a brochure site this is hygiene. Here the same origin serves `/espn`, which renders a Clerk sign-in and accepts ESPN cookies — clickjacking and transport protections are load-bearing.

### 06 — No Terms of Service exists

**Confidence:** High

**Finding:** The site publishes a detailed privacy policy but no terms of service, acceptable use policy, or disclaimer page.

**Evidence:** `/terms` returns 404. No footer or body link to terms exists on any of the four pages. The Claude directory listing notes that directory submission is governed by Anthropic's Software Directory Terms — an Anthropic document, not StatsDeck's.

**Source:** `statsdeck.ai/terms` (404) · all four page footers

**Why it matters:** The service holds accounts, stores third-party credentials, and gives advice affecting real decisions, with no liability disclaimer or usage terms of its own.

### 07 — Reddit is the paid acquisition channel, disclosed only in the privacy policy

**Confidence:** High

**Finding:** At account creation, a SHA-256 hash of the user's email is sent to Reddit's Conversions API for ad attribution. This is the only evidence of paid marketing anywhere on the site.

**Evidence:** The privacy policy devotes a section to it, specifying one-way SHA-256, once at account creation, server-side, with no browser or cookie involvement, and no league, activity, or conversation data shared.

**Source:** `statsdeck.ai/privacy`

**Why it matters:** It reveals both the channel and its audience fit — Reddit hosts large fantasy-football communities. Server-side CAPI rather than a browser pixel is also a deliberately privacy-forward implementation.

### 08 — No social proof of any kind, anywhere

**Confidence:** High

**Finding:** Zero testimonials, reviews, ratings, user counts, customer logos, case studies, or press mentions across all four pages.

**Evidence:** Full-text inspection of all four pages finds no testimonial, review, or quote module. The only quantitative growth claim — fastest-growing fantasy tool for 2026 — carries no source or metric.

**Source:** `statsdeck.ai/` · `/espn` · `/documentation` · `/privacy`

**Why it matters:** Highly unusual for a consumer product page. Credibility is carried instead by transparency artifacts — provenance tables, negative guarantees, licence attributions — and by third-party placement in Anthropic's directory. Coherent with the modest "hobby project" voice, but it leaves the growth claim unsupported.

### 09 — Cloudflare RUM collects data the privacy policy does not name

**Confidence:** Medium

**Finding:** A Cloudflare real-user-monitoring beacon fires on page load. The policy's analytics section names only Google Analytics.

**Evidence:** Network inspection recorded `POST https://statsdeck.ai/cdn-cgi/rum` returning 204 on homepage load. The privacy policy's "Website analytics" section describes Google Analytics only; Cloudflare is listed as a subprocessor solely for hosting and serving the site.

**Source:** `statsdeck.ai/` (runtime network) · `statsdeck.ai/privacy`

**Why it matters:** Arguably covered by the Cloudflare hosting entry, but the policy is otherwise so specific that this reads as an oversight. Medium confidence on materiality, high on the observation.

### 10 — A monetization path is signalled only in the privacy policy

**Confidence:** High

**Finding:** The product is repeatedly and unambiguously free, but the policy anticipates a paid plan.

**Evidence:** Under "What we don't do," the policy states card details are not collected directly and that any future paid plan would be handled by a third-party payment processor. No pricing page exists (`/pricing` 404s) and the FAQ says only that StatsDeck is completely free.

**Source:** `statsdeck.ai/privacy`

**Why it matters:** The clearest available signal that free-in-beta is a stage rather than a permanent position.

### 11 — A FAQ item was removed; the numbering still shows the gap

**Confidence:** High

**Finding:** The FAQ renders 15 items, but the ID sequence runs 1–16 with 9 absent.

**Evidence:** Question IDs `faq-q1`–`faq-q16` and answer IDs `faq-a1`–`faq-a16` are present with the 9 pair missing entirely; the rendered count is 15.

**Source:** `statsdeck.ai/#faq`

**Why it matters:** Minor and purely cosmetic, but it confirms active hand-editing and means any external deep link to `#faq-q9` now resolves to nothing.

### 12 — A stale step count sits in the ESPN page's no-JS markup

**Confidence:** High

**Finding:** The static HTML advertises a 10-step Safari walkthrough; the script that drives it defines nine.

**Evidence:** Server-rendered markup contains the counter text "1 / 10" and alt text "ESPN Safari step 1 of 10", while the script declares `safari: { dir:'safari', count:9 }`. The rendered page shows "1 / 9" once JS runs — verified in the browser.

**Source:** `statsdeck.ai/espn`

**Why it matters:** Affects only the pre-JS frame and no-script users, but it is the kind of drift a build step would have caught — a cost of hand-maintained static HTML.

### 13 — A seasonal engagement hook is hard-coded to a single date

**Confidence:** Medium

**Finding:** The playoff countdown targets one fixed timestamp and self-replaces when it passes.

**Evidence:** The script sets `Date.UTC(2026, 11, 18, 1, 15, 0)` with a comment identifying it as Week 15 kickoff, Thu 17 Dec 2026, 5:15 PM PT. On expiry the grid is replaced with "Playoffs are live!". The section labels it Week 15 – Fantasy Football, 5:15 PM PT / 8:15 PM ET.

**Source:** `statsdeck.ai/#playoffs`

**Why it matters:** A genuine return-visit hook tied to a real event rather than manufactured scarcity — but it requires manual editing each season, and after the date passes the section becomes a static message.

### 14 — The injury methodology is more rigorous than the category norm

**Confidence:** High

**Finding:** A full FAQ entry sets out a layered injury model with explicit epistemics rather than a single status field.

**Evidence:** The official NFL weekly report is named the system of record; between reports, dated intel is split into fast "feed designations" treated as flags to verify and "corroborated reports" confirmed against reporting. Four stated principles follow: always sourced and dated; corroboration measures report confidence, not injury severity; the official report wins ties, with both shown; and absence from the report is not proof of health, since IR players drop off entirely. Users are told they can ask Claude to run a live web search for the latest.

**Source:** `statsdeck.ai/#faq`

**Why it matters:** The strongest single piece of differentiating content on the site — and it is buried inside a collapsed accordion item rather than surfaced as a feature.

### 15 — Documentation states data provenance with legal basis per source

**Confidence:** High

**Finding:** A three-column table names each data source, what it provides, and the authority under which it is read — including a pre-emptive defence of the ESPN cookie practice.

**Evidence:** nflverse is credited as open CC-BY data used with attribution; Sleeper via its public documented read API; ESPN read on the user's behalf using their own signed-in session; Yahoo through its Fantasy Sports API with permission. The page states StatsDeck does not resell or redistribute third-party subscription data, and notes that ESPN offers no OAuth, API key, or developer program for third-party tools — citing the long-standing open-source precedent of `ffscrapr` and `espn-api`.

**Source:** `statsdeck.ai/documentation`

**Why it matters:** Unusually mature for a beta hobby project, and a meaningful competitive asset in a category where data rights are frequently ambiguous.

### 16 — The product has a named artifact system the site never names

**Confidence:** High

**Finding:** StatsDeck does not return generic charts. It returns five distinct, purpose-built visual artifacts, each with its own identifier, layout, legend, and interaction model — including a tabbed trade card and a self-describing capability map.

**Evidence:** Artifact title bars read `roster-viz`, `pivot-chart`, `matchup-viz`, `trade-viz`, and `statsdeck-map`. `trade-viz` carries a two-tab switcher ("The Deal" / "Lineup Impact"); `roster-viz` invites "Tap a position for the players behind the number"; `matchup-viz` includes a legend reading "Bars = opponent-adjusted PPG · solid = slot winner".

**Source:** `statsdeck.ai/#see` (images `1r`, `2r`, `3r`, `4r`, `5r`)

**Why it matters:** The site's FAQ reduces this to one sentence about asking for "a clean visual." A named, designed artifact system with drill-downs and tabs is a far stronger differentiator than that sentence conveys, and it is completely absent from the site's text.

### 17 — "Opponent-adjusted" is the signature metric, and it is buried

**Confidence:** High

**Finding:** Opponent adjustment is the analytic idea the entire product rests on. It appears in every showcase row, is stamped into artifact headers, and is explained in artifact legends — but the site's prose mentions it only in passing.

**Evidence:** `matchup-viz` headers read `WEEK 1 · H2H POINTS PPR · OPPONENT-ADJUSTED`; `pivot-chart` body copy states "Numbers are opponent-adjusted PPG"; conversational answers use an inline `adj` suffix throughout ("Gainwell vs CIN (~16.8 adj)"). On the text side it surfaces only inside `/documentation` example prompts, as "an opponent adjustment: their season average tempered by what that week's defense actually allows to their position."

**Source:** `statsdeck.ai/#see` · `statsdeck.ai/documentation`

**Why it matters:** This is the clearest proprietary-method claim StatsDeck makes, and it is visible only to people who look closely at screenshots. It is a candidate for promotion to a named, text-level feature.

### 18 — Marketing screenshots were captured on a paid, high-effort model while the copy recommends the free one

**Confidence:** High

**Finding:** Every conversational screenshot shows the Claude composer's model pill reading `Opus 4.8 High`. The FAQ tells readers Sonnet is the free default and that StatsDeck runs well on it.

**Evidence:** The model pill is legible in `1l`, `2l`, `3l`, `4l` and `5l`, rendered two-tone — "Opus 4.8" in near-black, "High" in lighter grey. The FAQ's model table lists Sonnet as "Fast and capable, and free for everyone," with Opus as a paid step up offering "richer visualizations."

**Source:** `statsdeck.ai/#see` · `statsdeck.ai/#faq`

**Why it matters:** Not deceptive — the FAQ is explicit that Opus produces richer visualizations, and the showcase is exactly where those appear. But every artifact a visitor is shown was produced on a paid tier at a high effort setting, while the adjacent copy says the free tier is plenty. A one-line note under the showcase would close the gap honestly.

### 19 — The freshness stamp is real and thorough, but never reaches the marketing

**Confidence:** High

**Finding:** The documentation's freshness claim is fully implemented. Every connector response carries a structured freshness block — and none of the ten showcase screenshots shows it.

**Evidence:** Verified first-hand against the live connector (read-only probes, no league connected). Every response carries:

```json
"freshness": {
  "data_through": "regular season — in progress",
  "as_of": "2026-09-20T20:20:56Z",
  "label": "Data as of 2026-09-20 20:20 UTC",
  "render_hint": "Timestamps are ISO-8601 UTC. Present them in the user's local timezone when known; otherwise present UTC."
}
```

A separate `injury_feed` block (`checked`, `as_of`, `flagged_count`) rides along on every call, on its own clock. Every response also carries `scoring_label: "ESPN Standard (assumed default)"`, flagging when the scoring is assumed rather than the user's real league. In the screenshots, by contrast, scoring labels are prominent but no "as of" timestamp appears anywhere.

**Source:** live connector at `app.statsdeck.ai/mcp` · `statsdeck.ai/#see` · `statsdeck.ai/documentation`

**Why it matters:** This corrects an inference drawn from the screenshots alone. The mechanism is not merely present — it is more sophisticated than the documentation describes, carrying a `render_hint` that tells the model how to localise the timestamp. The gap is purely one of marketing: the site's most defensible trust claim is fully built and never shown on the proof surface.

### 20 — StatsDeck is blind to an in-progress draft, and the documentation says otherwise

**Confidence:** High

**Finding:** During a live draft, StatsDeck's league-state tools return stale pre-draft data while reporting success. The website documentation claims the opposite.

**Evidence:** Verified during a full 16-round ESPN draft.

- `get_available_players`, called after ~35 picks, returned `board_state: "all_free_agents"`, `pool_size: 528`, and listed **Jahmyr Gibbs, Amon-Ra St. Brown, Derrick Henry, Jaxon Smith-Njigba and Jonathan Taylor as available**. All were drafted; Gibbs had been taken at pick 2 by the connected team itself. The payload's own note read *"these are players not on any roster in your league."*
- `get_my_roster` with `refresh: true`, called with nine players rostered, returned `starters: []`, `bench: []`, `strength: null`, and `hole: {position: "QB", type: "hard"}` — naming QB as a hard hole while Patrick Mahomes sat on the roster.
- Both payloads carried `draft_status: "drafting"`, so the product knows a draft is underway and still serves stale state.

**This settles a contradiction flagged earlier in this report.** The website says `draft_help` *"Goes live during a connected draft."* The tool manifest says *"StatsDeck does not track live draft picks; during a live draft it serves the pre-draft board."* **The manifest is correct; the website documentation is wrong.**

**Source:** live connector against ESPN league 1107638816 · `statsdeck.ai/documentation`

**Why it matters:** The draft is the single highest-stakes hour of a fantasy season, and it is the one moment the product's league awareness switches off without saying so. Worth noting the limitation is not solely StatsDeck's: ESPN's own public read API returned `playerId: -1` for all 160 picks throughout the live draft, so the upstream data simply isn't published in real time. But a tool reporting `success: true` with a confidently wrong roster is worse than one that declines.

### 21 — Bye weeks are not modelled anywhere

**Confidence:** High

**Finding:** No ranking, recommendation or roster tool accounts for bye weeks.

**Evidence:** `start_sit` was called nine times across the draft. No response contained a bye-week field. Its `recommended_start` was overridden on bye grounds four times, including Alec Pierce (bye 13, which would have stacked a third starter into an already-thin week) and Aaron Jones (bye 6, the roster's worst week, where four starters were already out). The tools disclose that *"injury and matchup aren't factored into the rank"* but never mention byes.

**Source:** live connector, nine `start_sit` calls

**Why it matters:** Bye management is a core season-long task, and StatsDeck imports the league's lineup rules (`Starts 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DST`) so it has the structure needed to reason about it. Every ranking is nonetheless a context-free player comparison — no positional need, no slots already filled, no schedule. This is the clearest gap between "player analytics" and "team management."

### 22 — `draft_help` accepts a scoring format and silently ignores it

**Confidence:** High

**Finding:** The `scoring_format` parameter has no effect on output.

**Evidence:** Called with `scoring_format: "PPR"` before a league was connected, `draft_help` returned `scoring: "ESPN Standard"` and a note conceding it: *"You mentioned PPR scoring — to tier under the user's real format, suggest they set their scoring... this tool won't change it on its own."* The resulting board was materially wrong for a PPR league. After `set_scoring` to `ESPN_PPR`, Ja'Marr Chase moved from WR9 (11.81) to WR6 (17.91), Justin Jefferson from WR10 (11.58) to WR9 (16.99), and the RB board reordered — Kenneth Walker III fell from RB1 to RB3 while Ashton Jeanty rose to RB1.

**Source:** live connector, two `draft_help` calls before and after `set_scoring`

**Why it matters:** A parameter that is accepted, documented and ignored is worse than one that doesn't exist. The failure is silent unless the caller reads the note, and it produces a plausible-looking board under the wrong rules — precisely the error the product exists to prevent.

### 23 — `connect_league` rejects the exact team name but accepts a fragment

**Confidence:** High

**Finding:** The team matcher failed on the literal team name and succeeded on a one-word substring.

**Evidence:** `team_query: "Jenna's Finest Team"` — the exact string the tool itself had just listed — returned `needs_pick` with *"A few teams could match that."* `team_query: "Jenna"` connected immediately. Eight of the league's ten teams end in the word "Team," which suggests the matcher tokenizes and scores on common words rather than preferring an exact match.

**Source:** live connector, ESPN league 1107638816

**Why it matters:** Minor but squarely on the critical path — this is the first thing a new user does. The disambiguation flow is otherwise well designed: it lists every team and returns a `next_call` block naming the field to fill.

---

## K. Evidence & Source URLs

### Pages inspected in full

| URL | Status | HTML size | Method |
|---|---|---|---|
| `https://statsdeck.ai/` | 200 | 74,106 B | Raw source + rendered (desktop & 375×812 mobile) |
| `https://statsdeck.ai/espn` | 200 | 42,698 B | Raw source + rendered |
| `https://statsdeck.ai/documentation` | 200 | 28,779 B | Raw source |
| `https://statsdeck.ai/privacy` | 200 | 12,232 B | Raw source |
| `https://claude.ai/directory/statsdeck` | 200 | — | Rendered (client-side app; raw HTML is a shell) |

### Anchors cited

`/#top` · `/#announcement` · `/#start` · `/#connect-league` · `/#get-app` · `/#see` · `/#faq` · `/#faq-q1` · `/#playoffs`

### Technical endpoints checked

| Endpoint | Result |
|---|---|
| `statsdeck.ai/robots.txt` | 200, comments only |
| `statsdeck.ai/sitemap.xml` | 404 |
| `statsdeck.ai/sitemap_index.xml` | 404 |
| `statsdeck.ai/llms.txt` | 404 |
| `app.statsdeck.ai/` | 404 (Railway) |
| `clerk.statsdeck.ai/` | 200 (Clerk) |

### Paths probed and confirmed absent (all 404)

`/terms` · `/about` · `/blog` · `/pricing` · `/faq` · `/contact` · `/support` · `/docs` · `/yahoo` · `/sleeper` · `/changelog`

### Assets measured

- `/img/whygood/1l–5r.jpg` (10 files, 2,790,331 B) — **all downloaded and transcribed**
- `/img/connect-league/sleeper-fixed.jpg` (255,920 B)
- `/img/connect-league/yahoo-connect2-v2.png` (462,042 B)
- `/logo.png` (159,720 B)
- `/favicon-512.png` (108,753 B)
- `/og-1200x630-v1.png` (176,345 B)
- `/img/connect/1.png`, `6-new-aug26.png`, `7-new.png`
- `/img/platform/{sleeper,espn,yahoo}-logo-v1.png`
- `/img/app/app-store.png`, `google-play.png`

### Outbound links found on the site

- `claude.ai/`
- `claude.ai/directory/statsdeck`
- `apps.apple.com` — Claude for iOS
- `play.google.com` — Claude for Android
- `join.slack.com/t/statsdeck` — community invite
- `football.fantasysports.yahoo.com` — attribution
- `mailto:Support@StatsDeck.ai`

### Method

Pages were retrieved over HTTPS with a standard desktop browser user agent and analysed as raw HTML, then re-checked rendered in a browser to confirm JavaScript-dependent content (accordion and carousel state, step counters, responsive layout) and to observe runtime network and console behaviour. No authentication was attempted, no access control was circumvented, and no restricted area was accessed. `robots.txt` sets no directives, so no crawl restriction applied.

**Showcase transcription.** The ten `/img/whygood/` JPEGs are 664–675 px wide and 2,101–3,182 px tall — too tall to read whole. Each was downloaded at native resolution and sliced into overlapping 1,000 px horizontal bands (34 slices in total, 120 px overlap so no line was cut). Every slice was read, then re-read by a second pass instructed to find omissions and check every reported number against the pixels. Reported figures are those confirmed by both passes; where the second pass corrected the first, the correction stands. Regions occluded by the Claude composer or clipped by the frame edge are noted as unreadable rather than guessed.

Figures — byte sizes, pixel dimensions, dates, counts, and prices — are reproduced exactly as measured or as published. Where a claim rests on the site's own assertion rather than independent verification (encryption at rest, growth claims, data-refresh cadence), it is labelled as such rather than restated as fact.

---

*StatsDeck Site Audit · statsdeck.ai · inspected 20 September 2026*
*4 of 4 public pages inspected · 16 paths probed · 1 external listing verified · 10 showcase screenshots transcribed*
*Live product exercised against a real ESPN league through a full 16-round draft*
*23 findings · all traceable to the sources in section K.*
