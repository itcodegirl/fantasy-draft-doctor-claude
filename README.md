# Draft Copilot

Read-only draft assistant for your own ESPN fantasy football draft.
**It never submits a pick.** You always select the player yourself in ESPN.

League `1689086286` · 12 teams · full PPR · snake · 16 rounds
Draft: **Sept 7 2026, 4:00pm local Central (CDT)** · slot revealed 3:00pm

---

## What this currently does

**Tracking plus a scoring-gated recommendation.** The board shows names, positions, ESPN
rank, ADP, and drafted state. It records picks automatically when live sync works;
manual entry remains available as a fallback. After scoring validation, the panel can recommend a next pick using
ESPN's scoring-specific projections, your roster needs, the remaining player pool,
  the local house model, optional expert consensus imported by CSV, and bye-week conflicts.

Recommendations are **deliberately hidden** until scoring validation passes (below).
Tracking without valuation is useful. Valuation on unvalidated scoring is worse than
nothing, because it looks authoritative.

Teams being autodrafted by ESPN are detected from their pick pattern, and the players
they will take before your next turn are named rather than guessed at. See
**Autodraft detection** below.

The badge in the header tells you which mode you're in: `tracking only` or
`projections shown`. Note the second one means exactly what it says — ESPN's projected
points become visible and the recommendation panel becomes available when the league
settings and roster setup are complete.

---

## Install

No build step. No npm. The folder *is* the extension.

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right) — Chrome 134+ disables unpacked extensions
   when this is off, so it has to stay on
3. **Load unpacked** → select the `espn-draft-copilot` folder
4. Pin it from the puzzle-piece menu
5. Click the toolbar icon to open the side panel

The panel cannot open itself — Chrome requires a user gesture. Click the icon once when
you start the draft.

### Moving it to the draft laptop

Copy the folder, then Load unpacked there. **Chrome derives the extension ID from the
folder path, so the copy is a different extension with empty storage.** Use
**Export settings** on this machine and **Import settings** on the other. Do not assume
your setup travels with the folder — it does not.

---

## Phase 1 — Transport validation (do this tonight)

**Goal is evidence, not features.** Until this passes, live sync is unproven.

1. Go to `fantasy.espn.com/football/mockdraftlobby` and join a mock.
2. Open DevTools → **Network** → filter **WS**, then **Fetch/XHR**.
3. Open the Draft Copilot side panel.
4. Let several picks happen. Record:

| Check | What you're looking for |
|---|---|
| Transport | Is there a `fantasydraft.espn.com` WebSocket? Or an EventSource on `/sse`? Or neither (polling only)? |
| Frame shape | Click the WS → Messages. Do frames look like `SELECTED <team> <player> <slot>`? |
| Console | `[DraftCopilot/sensor] sensor ready` and `pool cached: N` should appear |
| Panel | Do picks appear automatically and leave the available-player list? |
| **Latency** | The header shows `frame → confirmation: median Xs`. **This is the number that matters.** |

5. **Reload the page mid-mock.** Confirm the pick log survives and rebuilds.

### On latency specifically

A working WebSocket hook does **not** prove recommendations stay current. Live ESPN
selections are removed immediately, while REST reconciliation fills in metadata and
corrects the pick number when available. The sensor also reads the current ESPN
"ON THE CLOCK: PICK N" indicator so recommendation timing stays correct when the REST
pick list is temporarily partial. Reconciliation polls every 20s.

### If Phase 1 fails

Live sync gets disabled. **The board still works** — mark picks manually as they happen.
That is the whole reason it was built first.

---

## Phase 2 — Scoring validation (gates valuation and recommendations)

Independent of transport.

1. With the panel open on an ESPN league page, open the service worker console and run:
   `chrome.storage.local.get('dc.espnSettings', console.log)`
2. Confirm `receptionByPos` shows **1.0** for WR/RB/TE (full PPR).
3. Confirm `lineupSlotCounts` matches QB1/RB2/WR2/TE1/FLEX1/DST1/K1 + bench.
4. Hand-verify 5 players' projected points against the scoring items.
5. **This verifies arithmetic only.** It cannot tell you whether ESPN's projections
   already embed expected missed games. If that stays unknown, record it as unknown and
   apply no injury multiplier — do not guess.

Only when this passes should valuation be switched on.

### Expert rankings and bye weeks

The panel uses a built-in house model by default: ESPN rank, ADP, projections, roster fit,
and draft availability. If you want an additional expert signal, use **Import expert CSV**
to load a consensus file. The required columns are
`playerId` or `name`, plus `rank`; an optional `byeWeek` column is used to avoid stacking
players on the same bye week. Rows are matched against the cached ESPN player pool, and
the number of matched rows is shown in the panel. The recommender reports when no expert
file or bye data is available, and does not pretend that missing data was verified.

### Recording a gate

Both gates are flipped **from the panel**, in the *Validation status* section. Nothing
in the extension flips them automatically. To mark one passed you must type a note
saying what you verified — the gate is a record that a human did the check, not a
toggle, and a bare `PASS` is indistinguishable from a misclick. *Revoke* clears it.

Gates are **per league**. Passing transport in a mock draft records it on the mock's
league; you record it again on your real league once you have seen it there. The panel
shows the live-frame evidence it has for the *current* league beside the transport gate
so the decision is informed without being automatic.

### Autodraft detection

Managers who do not show up are drafted for them by ESPN, straight down a ranked list.
That makes their next picks knowable, and every player they will take is a player that
cannot survive to your next turn. In a 12-team room, two autodrafters remove a large
share of the uncertainty about who is left when you pick.

Detection is **behavioural**: the board replays the draft and asks, for each team, whether
it took the top-ranked player it was *allowed* to take. It does not read
`autoDraftTypeId` off the pick record — that field's shape was observed in a different
league and has never been seen in this one.

**ESPN does not walk the overall ranked list.** It fills roster slots, so once a team has
its starting quarterback it stops taking quarterbacks. Matching on overall rank looks
correct for three or four rounds and then silently breaks, which is exactly when the
projection is worth the most. `autodraft.js` models eligibility instead: while a starting
slot is open only positions that fill one qualify, FLEX keeps RB/WR/TE open, and once
every starter is filled the bench opens to everything except K and DST.

That eligibility rule is a **model, not an observation**, so detection reports a trailing
streak and a confidence level rather than a boolean:

| Confidence | Trigger | Effect |
|---|---|---|
| medium | 3 straight top-eligible picks | Named in the panel. **Never** used to mark a player gone. |
| high | 4 or more | Feeds the projection; matching players are reported as taken before your next pick. |

The streak is **trailing**, not cumulative, so a manager who arrives late and takes over
stops being projected on their first off-list pick.

Human picks are not guessed. Picks between now and your turn that belong to live managers
are counted and reported as unpredicted rather than filled in — the panel says how many.
A projected player replaces the ADP guess (`unlikely to last to pick N`) with the specific
claim `team N is autodrafting — projected gone at pick M`.

Known blind spots: a manager who set a pre-draft queue and left autodrafts off *their*
list, not ESPN's, and will not be detected. That is a false negative, not a false positive.
Picks that arrive without a `teamId` cannot be attributed to anyone and are skipped.

---

## Draft-day sequence

| Time | Action |
|---|---|
| Tonight | Phase 1 + Phase 2. Export settings. Print a static ranked sheet as last-resort backup. |
| Tomorrow AM | Load on the draft laptop, import settings, run one more mock |
| 3:00pm | Slot revealed → enter it in Setup |
| 3:45pm | Open ESPN draft room + side panel. Confirm `synced` and a recent `last confirmed` |
| 4:00pm | Draft. **You click every pick yourself.** |

If anything looks wrong mid-draft, uncheck "Hide drafted" and work manually. The board
never blocks you.

---

## Design notes

**Live frames are automatically accepted.** `CustomEvent` is a public channel and validation
cannot reject a well-formed forgery carrying plausible IDs, so this is an intentional
read-only tradeoff: a valid ESPN live selection is recorded immediately to keep drafted
players off the recommendation board. REST reconciliation later fills in metadata and
corrects the assigned overall pick when available.

**Snapshots are versioned, but omissions are not undrafts.** Older responses are refused
whole. A newer response that omits a previously confirmed row is treated as a partial live
response, not as a commissioner undo, because putting that player back on the board is
more dangerous for a read-only assistant. Use the local undo action if a correction is
needed.

**A 200 is not a complete body.** A response missing `draftDetail.picks` is refused, never
read as "the draft is empty" — that interpretation would reverse every confirmed pick at
once.

**League switching is offered, not automatic.** With a mock draft and the real draft open
in two tabs, auto-switching made the board thrash. A foreign league raises a prompt; the
switch itself is serialized so overlapping loads cannot interleave.

**League transitions are atomic, and messages during one are queued.** Storage is read
into locals first, then league id / state / pool / config are installed together with no
await between them. Setting the id before awaiting storage left a window where the id
named the destination while state still belonged to the departing league. Serializing the
switches alone is not enough — the message handling that races them is queued too, and
the window opens synchronously when a switch is *requested*, not when the promise chain
gets a turn.

**Frames carry the identity of the connection that produced them.** `hook.js` captures the
league from each socket's own JOIN URL and stamps it on every frame, and only recognised
draft connections are relayed at all. Reading a module-level "current league" downstream
was wrong: an older socket can emit after a newer one changed it, and async Blob decoding
delays delivery further. A frame without connection identity is dropped, not guessed at.

**Manual mode is a real switch.** When on, the session refuses live snapshots and
observations at the door. It is not a display filter.

**Live pick conflicts do not interrupt the draft.** Automatic live selections are not
held behind *Keep mine* / *Use ESPN* approval buttons. Manual entries and explicit local
undo remain available for recovery, while REST metadata is merged when it agrees.

**Pick number is not a version.** Commissioner undo legitimately reduces the count and a
correction changes the player at the same number. Stale-vs-reversal is decided by
comparing the snapshot's **request-start time** against when we confirmed the pick.

**Rank ≠ ADP.** `draftRanksByRankType.PPR.rank` and `ownership.averageDraftPosition` are
different measurements, kept separate, never substituted.

**Credentials.** The extension never reads, requests, or transmits `espn_s2` or `SWID`.
The browser attaches cookies to ordinary same-site requests. Permissions are `storage`
and `sidePanel` only.

---

## Tests

```bash
node --test tests/*.test.mjs
```

111 tests. (Passing the directory rather than the glob fails on some Node builds.)

**`session.test.mjs` (23)** — the panel's *asynchronous* coordination, run against a fake
storage with an injected delay so transition windows are real rather than instantaneous:
a message racing a league switch, the triggering message on adoption, state written under
the wrong league's key, import clearing a previous pool, and manual mode actually
refusing live data, the pause rule surviving a reload, init being coordinated like any
other transition, an accepted switch offer carrying the destination identity even when a
later snapshot arrived first, and first-time startup not deadlocking when a message queues
during it.

**`store.js` (31)** — duplicates, corrections at the same pick number, commissioner undo,
stale and out-of-order responses, wrong-league frames, well-formed forgeries, malformed
messages, failed-request expiry, manual-vs-snapshot conflicts, reversal tombstones,
snapshot idempotency, metadata absorption on agreement, whole-snapshot staleness, refusal of incomplete bodies, and post-observation-only expiry.

**`panel-logic.js` and `recommender.js`** — export/import round-trip with the pool intact,
freshness read from completion time rather than apply time, league routing, scoring-gated
next-pick ranking, expert CSV matching, roster needs, snake picks, and bye-week conflicts.

**`autodraft.js` (17)** — slot inversion against the snake, slot maps built from a later
round when the first is unattributed, the positional filter that overall-rank matching
gets wrong, trailing streaks broken by a manager taking over, keepers and unattributed
picks excluded from evidence, human picks counted as unpredicted rather than guessed,
medium confidence refusing to declare anyone gone, and the recommender's explanation
naming the autodrafting team. The wording of the panel's summary line is tested too, in
`panel.test.mjs`: a claim about certainty deserves a test.

The panel's pure logic lives in `panel-logic.js` specifically so it can be tested without
a DOM. An earlier build kept that logic inline in `sidepanel.js` with no tests at all,
which is how six defects shipped while `store.js` had twenty passing tests.

---

## Known limits

- The recommendation is a transparent ranking aid, not a guarantee. ESPN's projection is
  the scoring-system-specific primary signal; the house rank/ADP signal, optional expert
  consensus, roster fit, availability, and bye conflicts adjust the ordering and are shown
  beside each candidate.
- Transport claims come from ESPN's JS bundle and **have not been observed live**. Phase 1
  exists to settle that.
- `pointsOverrides` / `autoDraftTypeId` shapes come from a **different league**, not this one.
  Autodraft detection therefore ignores `autoDraftTypeId` and works from pick behaviour alone.
- Autodraft **projection has not been observed against a live ESPN autodraft**. The
  eligibility model is reasoned from ESPN's roster rules, not measured. Watch it in a mock
  before trusting it: if the panel names a team and its next pick is not the player shown,
  the model is wrong for this league.
- This remains an ESPN-projection assistant unless you import an expert CSV. It does not
  fetch or claim a particular publisher's consensus automatically.
- Disney's Terms of Use prohibit automated access. Absence of documented enforcement is
  not permission.
