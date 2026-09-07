/**
 * Autodraft detection and survival projection.
 *
 * Pure module: no chrome.* APIs, no DOM, no network, no clock. Same contract as
 * `store.js` and `recommender.js` so it can be tested without a browser.
 *
 * The idea: a manager who never showed up is drafted for them by ESPN, straight down
 * a ranked list. That team's future picks are therefore knowable, and every player it
 * will take is a player that cannot survive to your next turn. In a 12-team room two
 * autodrafters remove a large share of the uncertainty about who is left when you pick.
 *
 * Two things this deliberately does NOT do:
 *
 *   It does not read `autoDraftTypeId` off the pick record. That field exists on the
 *   record but its shape was observed in a DIFFERENT league and has never been seen in
 *   this one, so trusting it would be asserting something unverified. Detection here is
 *   purely behavioural: does this team's pick history match the ranked list or not.
 *
 *   It does not assume ESPN walks the OVERALL ranked list. ESPN autodraft fills roster
 *   slots, so once a team has its starting QB it stops taking quarterbacks. Matching on
 *   overall rank looks right for three or four rounds and then silently breaks, which is
 *   exactly when the projection is worth most. Eligibility is modelled below.
 *
 * The eligibility model is a MODEL, not an observation. It is wrong sometimes. That is
 * why detection reports a trailing streak and a confidence level instead of a boolean:
 * a wrong model shows up as a short streak and low confidence, not as a false positive
 * that quietly poisons the recommendation.
 */

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];
export const FLEX_POSITIONS = ['RB', 'WR', 'TE'];

/** Positions ESPN will not stack on a bench once the starter slot is filled. */
const SINGLETON_POSITIONS = ['K', 'DST'];

export const DEFAULT_MIN_PICKS = 3;
export const DEFAULT_MIN_STREAK = 3;

/**
 * Inverse of `recommender.snakePick`: which draft slot owns this overall pick number.
 * Defined here rather than imported so this module stays dependency-free and the
 * import graph runs one way (recommender -> autodraft).
 */
export function slotForPick(pick, teams) {
  const n = Number(pick);
  const size = Number(teams);
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(size) || size < 2) return null;
  const round = Math.ceil(n / size);
  const index = n - (round - 1) * size;
  return round % 2 === 1 ? index : size - index + 1;
}

/**
 * Map draft slot -> teamId using whatever picks have been attributed so far.
 *
 * Any round works, not just the first, because snake order is deterministic. Round 1
 * may be incomplete or unattributed on a board rebuilt from live frames, and waiting
 * for it would disable projection for the whole draft.
 *
 * First attribution wins. A later disagreement is recorded, not silently overwritten.
 */
export function slotMapFromPicks(picks = [], teams) {
  const map = {};
  const conflicts = [];
  for (const p of picks) {
    const teamId = p.teamId;
    if (teamId == null) continue;
    const slot = slotForPick(p.overallPickNumber, teams);
    if (slot == null) continue;
    if (map[slot] == null) map[slot] = Number(teamId);
    else if (map[slot] !== Number(teamId)) {
      conflicts.push({ slot, had: map[slot], saw: Number(teamId), pick: Number(p.overallPickNumber) });
    }
  }
  return { map, conflicts };
}

/**
 * Which positions this roster can still take, under the ESPN autodraft model.
 *
 * While any starting slot is unfilled, only positions that fill one are eligible. FLEX
 * keeps RB/WR/TE eligible until the flex slot is used. Once every starter is filled the
 * bench is open to everything except K and DST, which ESPN does not double up.
 *
 * Early rounds are effectively unrestricted, which is correct: with twelve starting
 * slots open nearly every position qualifies, and the ranked list does the ordering.
 */
export function eligiblePositions(counts, slots) {
  const open = {};
  let anyStarterOpen = false;
  for (const pos of POSITIONS) {
    open[pos] = ((slots && slots[pos]) || 0) - ((counts && counts[pos]) || 0) > 0;
    if (open[pos]) anyStarterOpen = true;
  }
  const flexUsed = FLEX_POSITIONS.reduce(
    (n, pos) => n + Math.max(((counts && counts[pos]) || 0) - ((slots && slots[pos]) || 0), 0), 0,
  );
  if (((slots && slots.FLEX) || 0) - flexUsed > 0) {
    for (const pos of FLEX_POSITIONS) open[pos] = true;
    anyStarterOpen = true;
  }
  if (anyStarterOpen) return POSITIONS.filter((pos) => open[pos]);
  return POSITIONS.filter((pos) => SINGLETON_POSITIONS.indexOf(pos) === -1);
}

function emptyCounts() {
  return Object.fromEntries(POSITIONS.map((pos) => [pos, 0]));
}

/** ESPN's ranked list is `rank` only. ADP is a different measurement and is never substituted. */
function rankOf(player) {
  const n = Number(player && player.rank);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Top-ranked player this roster is allowed to take. Returns null when nothing in the
 * available pool carries a usable rank, which is a "cannot judge", not a "no one left".
 */
export function bestAvailableFor(counts, slots, available) {
  const eligible = eligiblePositions(counts, slots);
  let best = null;
  let bestRank = Infinity;
  for (const p of available) {
    if (eligible.indexOf(p.pos) === -1) continue;
    const rank = rankOf(p);
    if (rank == null || rank >= bestRank) continue;
    best = p;
    bestRank = rank;
  }
  return best;
}

/**
 * Replay the draft and score each team on how often it took the top-ranked player it
 * was allowed to take.
 *
 * The streak is TRAILING, not cumulative. A manager who shows up late and takes over
 * should stop being projected immediately, and a cumulative ratio would keep asserting
 * autodraft long after the picks stopped matching.
 *
 * Picks that cannot be judged -- unknown player, no rank in the pool, keepers -- neither
 * extend nor break a streak. Breaking on missing metadata would make detection depend on
 * REST reconciliation having caught up, which it often has not mid-round.
 */
export function detectAutodrafters(input) {
  const {
    picks = [], players = {}, slots, teams,
    minPicks = DEFAULT_MIN_PICKS, minStreak = DEFAULT_MIN_STREAK,
  } = input || {};

  const ordered = picks.slice()
    .filter((p) => Number.isInteger(Number(p.overallPickNumber)))
    .sort((a, b) => Number(a.overallPickNumber) - Number(b.overallPickNumber));

  const byTeam = {};
  const countsByTeam = {};
  const drafted = new Set();
  let attributed = 0;

  const team = (id) => {
    const key = String(id);
    if (!byTeam[key]) {
      byTeam[key] = { teamId: Number(id), picks: 0, judged: 0, matches: 0, streak: 0, confidence: 'none', autodrafting: false };
      countsByTeam[key] = emptyCounts();
    }
    return byTeam[key];
  };

  for (const pick of ordered) {
    const player = players[String(pick.playerId)];
    if (pick.teamId == null) {
      // Unattributed: still leaves the pool, but tells us nothing about any team.
      if (player) drafted.add(String(player.id));
      continue;
    }
    attributed++;
    const key = String(pick.teamId);
    const row = team(key);
    const counts = countsByTeam[key];
    row.picks++;

    if (!player || rankOf(player) == null || pick.keeper) {
      if (player) {
        drafted.add(String(player.id));
        if (counts[player.pos] != null) counts[player.pos]++;
      }
      continue;
    }

    const available = [];
    for (const p of Object.values(players)) {
      if (!drafted.has(String(p.id))) available.push(p);
    }
    const expected = bestAvailableFor(counts, slots, available);
    if (expected) {
      row.judged++;
      if (String(expected.id) === String(player.id)) {
        row.matches++;
        row.streak++;
      } else {
        row.streak = 0;
      }
    }

    drafted.add(String(player.id));
    if (counts[player.pos] != null) counts[player.pos]++;
  }

  const autodrafting = [];
  for (const row of Object.values(byTeam)) {
    if (row.picks >= minPicks && row.streak >= minStreak) {
      row.autodrafting = true;
      row.confidence = row.streak > minStreak ? 'high' : 'medium';
      autodrafting.push(row.teamId);
    }
  }

  return {
    byTeam,
    autodrafting,
    attributedPicks: attributed,
    totalPicks: ordered.length,
    countsByTeam,
    draftedPlayerIds: Array.from(drafted),
  };
}

/**
 * Walk the picks between now and your next turn and name the players the known
 * autodrafters will take.
 *
 * Human picks are NOT guessed. An unknown pick removes an unknown player, so the pool
 * the next autodrafter sees is slightly wrong -- the projection is reported alongside
 * `unknownPicks` so its reach is visible rather than implied. Being wrong about who a
 * human takes is how a tool starts lying confidently.
 */
export function projectSurvival(input) {
  const {
    players = {}, slots, teams, fromPick, toPick,
    autodrafters = [], slotMap = {}, countsByTeam = {}, draftedPlayerIds = [],
  } = input || {};

  const size = Number(teams);
  const start = Number(fromPick);
  const end = Number(toPick);
  const empty = { projected: [], doomedPlayerIds: [], unknownPicks: 0, coveredPicks: 0 };
  if (!Number.isInteger(size) || size < 2) return empty;
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start + 1) return empty;

  const autos = new Set(Array.from(autodrafters, String));
  const drafted = new Set(Array.from(draftedPlayerIds, String));
  const counts = {};
  for (const [key, value] of Object.entries(countsByTeam)) counts[key] = Object.assign(emptyCounts(), value);

  const projected = [];
  let unknownPicks = 0;

  for (let n = start + 1; n < end; n++) {
    const slot = slotForPick(n, size);
    const teamId = slot == null ? null : slotMap[slot];
    if (teamId == null || !autos.has(String(teamId))) { unknownPicks++; continue; }
    const key = String(teamId);
    if (!counts[key]) counts[key] = emptyCounts();
    const available = [];
    for (const p of Object.values(players)) {
      if (!drafted.has(String(p.id))) available.push(p);
    }
    const player = bestAvailableFor(counts[key], slots, available);
    if (!player) { unknownPicks++; continue; }
    projected.push({ overallPickNumber: n, teamId: Number(teamId), playerId: player.id, name: player.name, pos: player.pos });
    drafted.add(String(player.id));
    if (counts[key][player.pos] != null) counts[key][player.pos]++;
  }

  return {
    projected,
    doomedPlayerIds: projected.map((row) => String(row.playerId)),
    unknownPicks,
    coveredPicks: Math.max(end - start - 1, 0),
  };
}

/**
 * Detection plus projection in one call, with the slot map derived from the same picks.
 *
 * Only HIGH confidence teams are projected. A medium-confidence team is surfaced to the
 * user but never used to declare a player gone: three matching picks is a reasonable
 * suspicion and a bad basis for telling someone a player is unavailable.
 */
export function analyzeAutodraft(input) {
  const { picks = [], players = {}, slots, teams, currentPick, nextPick } = input || {};
  const detection = detectAutodrafters({ picks, players, slots, teams });
  const { map, conflicts } = slotMapFromPicks(picks, teams);
  const highConfidence = Object.values(detection.byTeam)
    .filter((row) => row.confidence === 'high')
    .map((row) => row.teamId);

  const survival = projectSurvival({
    players, slots, teams,
    fromPick: currentPick,
    toPick: nextPick,
    autodrafters: highConfidence,
    slotMap: map,
    countsByTeam: detection.countsByTeam,
    draftedPlayerIds: detection.draftedPlayerIds,
  });

  return {
    teams: Object.values(detection.byTeam).filter((row) => row.autodrafting),
    autodrafting: detection.autodrafting,
    projectedFor: highConfidence,
    attributedPicks: detection.attributedPicks,
    totalPicks: detection.totalPicks,
    slotMapConflicts: conflicts,
    projected: survival.projected,
    doomedPlayerIds: survival.doomedPlayerIds,
    unknownPicks: survival.unknownPicks,
    coveredPicks: survival.coveredPicks,
  };
}
