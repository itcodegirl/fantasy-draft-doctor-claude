/**
 * Scoring-gated draft recommendation engine.
 *
 * ESPN's `proj` is used as the scoring-system-specific projection. Expert ranks are
 * an additional consensus signal, never a replacement for league scoring. The result
 * is deliberately explainable: starter gain, expert rank, availability, need, and
 * bye conflicts are returned separately so the user can disagree with the weighting.
 */

import { analyzeAutodraft, POSITIONS, FLEX_POSITIONS } from './autodraft.js';
import { survivalProbabilities } from './survival.js';

const SLOT_TO_POS = {
  0: 'QB', 2: 'RB', 4: 'WR', 6: 'TE', 16: 'DST', 17: 'K', 23: 'FLEX',
};

export function readSlots(lineupSlotCounts) {
  const slots = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0, FLEX: 0, BENCH: 0 };
  for (const [rawId, rawCount] of Object.entries(lineupSlotCounts || {})) {
    const count = Number(rawCount) || 0;
    const id = String(rawId);
    const pos = SLOT_TO_POS[id];
    if (pos) slots[pos] += count;
    else if (id === '20') slots.BENCH += count;
  }
  return slots;
}

export function snakePick(slot, round, teams) {
  return round % 2 === 1
    ? (round - 1) * teams + slot
    : (round - 1) * teams + (teams - slot + 1);
}

export function nextPickFor(slot, currentPick, teams, rounds = 20) {
  if (!Number.isInteger(slot) || slot < 1 || slot > teams) return null;
  for (let round = 1; round <= rounds; round++) {
    const pick = snakePick(slot, round, teams);
    if (pick > currentPick) return pick;
  }
  return currentPick + teams;
}

/** Infer the draft slot from the user's first-round pick once ESPN has reported it. */
export function inferDraftSlot(picks = [], myTeamId, teams) {
  const size = Number(teams);
  if (!Number.isInteger(size) || size < 2 || myTeamId == null) return null;
  const firstRound = picks
    .map((p) => Number(p.overallPickNumber))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= size
      && picks.find((p) => Number(p.overallPickNumber) === n
        && Number(p.teamId) === Number(myTeamId)));
  return firstRound.length ? Math.min(...firstRound) : null;
}

function playerId(p) { return String(p.id); }
function pickPlayerId(p) { return String(p.playerId); }

function rosterLineupPoints(roster, slots) {
  const byPos = Object.fromEntries(POSITIONS.map((pos) => [pos, []]));
  for (const p of roster) {
    if (byPos[p.pos] && Number.isFinite(p.proj)) byPos[p.pos].push(p);
  }
  for (const list of Object.values(byPos)) list.sort((a, b) => b.proj - a.proj);

  const used = Object.fromEntries(POSITIONS.map((pos) => [pos, 0]));
  let total = 0;
  for (const pos of POSITIONS) {
    const starters = slots[pos] || 0;
    for (let i = 0; i < starters; i++) {
      const p = byPos[pos][used[pos]++];
      if (p) total += p.proj;
    }
  }
  for (let i = 0; i < (slots.FLEX || 0); i++) {
    let bestPos = null;
    let best = null;
    for (const pos of FLEX_POSITIONS) {
      const p = byPos[pos][used[pos]];
      if (p && (!best || p.proj > best.proj)) { best = p; bestPos = pos; }
    }
    if (!best) break;
    total += best.proj;
    used[bestPos]++;
  }
  return total;
}

function rosterNeeds(roster, slots) {
  const counts = Object.fromEntries(POSITIONS.map((pos) => [pos, 0]));
  for (const p of roster) if (counts[p.pos] != null) counts[p.pos]++;
  const needs = {};
  for (const pos of POSITIONS) needs[pos] = Math.max((slots[pos] || 0) - counts[pos], 0);
  const flexFilled = Math.max(
    counts.RB - (slots.RB || 0), 0
  ) + Math.max(counts.WR - (slots.WR || 0), 0)
    + Math.max(counts.TE - (slots.TE || 0), 0);
  needs.FLEX = Math.max((slots.FLEX || 0) - flexFilled, 0);
  return { counts, needs };
}

function expertRankFor(experts, p) {
  const value = experts && experts[playerId(p)];
  if (value == null) return null;
  const rank = typeof value === 'object' ? value.rank : value;
  return Number.isFinite(Number(rank)) && Number(rank) > 0 ? Number(rank) : null;
}

function byeFor(p, byeWeeks) {
  const direct = p.byeWeek;
  if (Number.isInteger(direct) && direct > 0) return direct;
  const mapped = byeWeeks && byeWeeks[playerId(p)];
  return Number.isInteger(Number(mapped)) && Number(mapped) > 0 ? Number(mapped) : null;
}

function clamp(n, lo, hi) { return Math.min(Math.max(n, lo), hi); }

export function recommend(input) {
  const {
    players, picks = [], slots, teams, mySlot, myTeamId, scoringValidated,
    unavailablePlayerIds = [], currentPick: observedCurrentPick = 0,
    autodraftDetection = true, survivalModel = true, survivalConditioning = true,
    includeMarketBaseline = false,
  } = input;
  if (!scoringValidated) return { error: 'Pass the scoring validation gate before using recommendations.' };
  if (!players || !Object.keys(players).length) return { error: 'Player pool not loaded yet.' };
  if (!slots || !teams) return { error: 'League roster settings are not loaded yet.' };
  if (!mySlot) return { error: 'Set your draft slot to calculate your next pick.' };
  if (myTeamId == null) return { error: 'Set your team id to calculate roster needs.' };

  const recordedPick = picks.reduce((max, p) => Math.max(max, Number(p.overallPickNumber) || 0), 0);
  const livePick = Number(observedCurrentPick);
  const currentPick = Number.isInteger(livePick) && livePick > 0
    ? Math.max(recordedPick, livePick)
    : recordedPick;
  const nextPick = nextPickFor(Number(mySlot), currentPick, Number(teams));
  if (nextPick == null) return { error: 'Draft slot must be between 1 and the league team count.' };
  const roster = picks.filter((p) => Number(p.teamId) === Number(myTeamId))
    .map((p) => players[pickPlayerId(p)]).filter(Boolean);
  const drafted = new Set(picks.map((p) => pickPlayerId(p)));
  const unavailable = new Set(Array.from(unavailablePlayerIds, String));
  const available = Object.values(players).filter((p) => !drafted.has(playerId(p))
    && !unavailable.has(playerId(p)) && Number.isFinite(p.proj));
  const { counts, needs } = rosterNeeds(roster, slots);
  // Teams being autodrafted have knowable future picks, so the players they will take
  // are gone with near-certainty rather than "probably gone" by ADP. Only high-confidence
  // teams are projected; see autodraft.js.
  const autodraft = autodraftDetection
    ? analyzeAutodraft({ players, picks, slots, teams, currentPick, nextPick })
    : null;
  const doomedBy = {};
  if (autodraft) for (const row of autodraft.projected) doomedBy[String(row.playerId)] = row;
  // A SEPARATE channel from `doomedBy`. That one is a deterministic claim about an
  // autodrafter; this one is a probability about a human, and the two must never be
  // collapsed into the same sentence. Deliberately does not touch `score` or
  // `lastsToNextTurn` -- the number ships first, and the calibration harness decides
  // whether it has earned the right to move the ranking.
  const survival = (survivalModel && autodraft)
    ? survivalProbabilities({
      players, slots, teams,
      currentPick, nextPick,
      countsByTeam: autodraft.countsByTeam,
      slotMap: autodraft.slotMap,
      slotMapConflicts: autodraft.slotMapConflicts,
      projected: autodraft.projected,
      draftedPlayerIds: autodraft.draftedPlayerIds,
      unavailablePlayerIds,
      attributedPicks: autodraft.attributedPicks,
      totalPicks: autodraft.totalPicks,
      conditioning: survivalConditioning,
    })
    : null;
  // The ADP-only run from the SAME board. The calibration harness needs both numbers
  // captured at the same moment, because a lone Brier score cannot say whether need
  // conditioning beat ADP -- only the skill score against this baseline can.
  if (survival && includeMarketBaseline && survivalConditioning) {
    survival.marketByPlayerId = survivalProbabilities({
      players, slots, teams, currentPick, nextPick,
      countsByTeam: autodraft.countsByTeam,
      slotMap: autodraft.slotMap,
      slotMapConflicts: autodraft.slotMapConflicts,
      projected: autodraft.projected,
      draftedPlayerIds: autodraft.draftedPlayerIds,
      unavailablePlayerIds,
      attributedPicks: autodraft.attributedPicks,
      totalPicks: autodraft.totalPicks,
      conditioning: false,
    }).byPlayerId;
  } else if (survival) {
    survival.marketByPlayerId = null;
  }
  const baseline = rosterLineupPoints(roster, slots);
  const maxProj = Math.max(...available.map((p) => p.proj), 1);
  const expertRanks = available.map((p) => expertRankFor(input.experts, p)).filter((n) => n != null);
  const maxExpertRank = Math.max(...expertRanks, 1);
  const ranked = available.map((p) => Number(p.rank)).filter((n) => Number.isFinite(n) && n > 0);
  const maxRank = Math.max(...ranked, 1);
  const adps = available.map((p) => Number(p.adp)).filter((n) => Number.isFinite(n) && n > 0);
  const maxAdp = Math.max(...adps, 1);

  const rows = available.map((p) => {
    const after = rosterLineupPoints(roster.concat([p]), slots);
    const starterGain = Math.max(after - baseline, 0);
    const adp = Number.isFinite(Number(p.adp)) ? Number(p.adp) : null;
    const expertRank = expertRankFor(input.experts, p);
    const expertScore = expertRank == null ? 0 : clamp(1 - ((expertRank - 1) / maxExpertRank), 0, 1);
    // House consensus: ESPN rank and ADP are separate signals, combined only here
    // into a local market signal. Neither is relabelled as the other.
    const rankScore = Number.isFinite(Number(p.rank)) && Number(p.rank) > 0
      ? clamp(1 - ((Number(p.rank) - 1) / maxRank), 0, 1) : null;
    const adpScore = adp == null ? null : clamp(1 - ((adp - 1) / maxAdp), 0, 1);
    const houseScore = rankScore == null && adpScore == null
      ? 0 : ((rankScore == null ? 0 : rankScore) + (adpScore == null ? 0 : adpScore))
        / ((rankScore == null ? 0 : 1) + (adpScore == null ? 0 : 1));
    const consensusScore = expertRank == null ? houseScore : (expertScore * 0.7 + houseScore * 0.3);
    const byeWeek = byeFor(p, input.byeWeeks);
    const byeConflicts = byeWeek == null ? 0 : roster.filter((r) => byeFor(r, input.byeWeeks) === byeWeek).length;
    const positionNeed = Math.min((needs[p.pos] || 0) + (FLEX_POSITIONS.includes(p.pos) ? needs.FLEX || 0 : 0), 2);
    const takenByAutodraft = doomedBy[playerId(p)] || null;
    // A projected autodraft pick beats the ADP guess outright: one is a simulation of a
    // deterministic opponent, the other is a league-average tendency.
    const lastsToNextTurn = takenByAutodraft ? false : (adp == null ? null : adp >= nextPick);
    const urgency = takenByAutodraft
      ? 1
      : (adp == null ? 0 : clamp((nextPick - adp) / 25, -1, 1));
    const projectionScore = (p.proj / maxProj) * 10;
    const fitScore = starterGain * 0.35;
    const consensusComponent = consensusScore * 5;
    const needComponent = positionNeed * 2;
    const byePenalty = byeConflicts * 2;
    const totalScore = projectionScore + fitScore + consensusComponent + needComponent
      + urgency - byePenalty;
    return {
      id: p.id, name: p.name, pos: p.pos, proj: p.proj, adp: adp,
      expertRank, houseScore, byeWeek, byeConflicts, starterGain,
      need: needs[p.pos] || 0, flexNeed: FLEX_POSITIONS.includes(p.pos) ? needs.FLEX || 0 : 0,
      lastsToNextTurn, score: totalScore,
      takenByAutodraft: takenByAutodraft
        ? { teamId: takenByAutodraft.teamId, overallPickNumber: takenByAutodraft.overallPickNumber }
        : null,
      survivalToNextTurn: takenByAutodraft || !survival
        ? null : (survival.byPlayerId[playerId(p)] != null ? survival.byPlayerId[playerId(p)] : null),
      survivalBasis: takenByAutodraft ? 'autodraft-projected'
        : (!survival || survival.byPlayerId[playerId(p)] == null ? 'not-modelled' : survival.basis),
      why: explain(p, { starterGain, expertRank, houseScore, byeWeek, byeConflicts, positionNeed, lastsToNextTurn, nextPick, takenByAutodraft }),
    };
  }).sort((a, b) => b.score - a.score);

  return {
    currentPick, nextPick, round: Math.ceil(nextPick / Number(teams)),
    roster, counts, needs, scoring: input.scoringSummary || null,
    expertsAvailable: expertRanks.length,
    autodraft,
    survival,
    consensusSource: expertRanks.length ? 'imported expert rankings blended with ESPN rank/ADP' : 'house model: ESPN rank + ADP',
    availableCount: available.length,
    recommendations: rows.slice(0, 5),
  };
}

function explain(p, f) {
  const bits = [Math.round(f.starterGain * 10) / 10 + ' projected starter points added'];
  if (f.expertRank != null) bits.push('expert consensus #' + f.expertRank);
  else if (f.houseScore > 0) bits.push('house rank/ADP signal ' + Math.round(f.houseScore * 100) + '%');
  if (f.positionNeed || (FLEX_POSITIONS.includes(p.pos) && f.positionNeed)) bits.push('fills ' + p.pos + ' need');
  if (f.takenByAutodraft) {
    bits.push('team ' + f.takenByAutodraft.teamId + ' is autodrafting — projected gone at pick '
      + f.takenByAutodraft.overallPickNumber);
  } else if (f.lastsToNextTurn === false) bits.push('unlikely to last to pick ' + f.nextPick);
  if (f.byeConflicts) bits.push(f.byeConflicts + ' roster bye conflict' + (f.byeConflicts === 1 ? '' : 's'));
  if (f.byeWeek != null) bits.push('bye week ' + f.byeWeek);
  return bits.join(' · ');
}

/** Parse a simple expert consensus CSV with playerId or name plus rank. */
export function parseExpertCsv(raw, players) {
  const lines = String(raw || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('Expert CSV must include a header and at least one row');
  const rows = lines.map(parseCsvLine);
  const header = rows.shift().map((x) => x.replace(/^\uFEFF/, '').trim().toLowerCase());
  // FantasyPros exports the overall rank column as `RK`; accept that and
  // the common ECR/overall aliases alongside the documented `rank` form.
  const rankIndex = header.findIndex((h) => [
    'rank', 'rk', 'expert rank', 'consensus rank', 'overall rank', 'overall', 'ecr',
  ].includes(h));
  const idIndex = header.findIndex((h) => ['playerid', 'player id', 'id'].includes(h));
  const nameIndex = header.findIndex((h) => ['name', 'player', 'player name'].includes(h));
  const byeIndex = header.findIndex((h) => ['bye', 'bye week', 'bye_week', 'byeweek'].includes(h));
  if (rankIndex < 0 || (idIndex < 0 && nameIndex < 0)) throw new Error('CSV needs playerId or name plus rank columns');

  const byName = new Map(Object.values(players || {}).map((p) => [String(p.name || '').trim().toLowerCase(), p]));
  const expertRanks = {};
  const byeWeeks = {};
  let matched = 0;
  for (const row of rows) {
    const rank = Number(row[rankIndex]);
    if (!Number.isFinite(rank) || rank <= 0) continue;
    let p = idIndex >= 0 ? players[String(row[idIndex]).trim()] : null;
    if (!p && nameIndex >= 0) p = byName.get(String(row[nameIndex] || '').trim().toLowerCase());
    if (!p) continue;
    const id = playerId(p);
    if (expertRanks[id] == null || rank < expertRanks[id]) expertRanks[id] = rank;
    if (byeIndex >= 0 && Number.isInteger(Number(row[byeIndex])) && Number(row[byeIndex]) > 0) {
      byeWeeks[id] = Number(row[byeIndex]);
    }
    matched++;
  }
  if (!matched) throw new Error('No CSV rows matched the cached player pool');
  return { expertRanks, byeWeeks, matched };
}

function parseCsvLine(line) {
  const out = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"' && quoted) { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out;
}
