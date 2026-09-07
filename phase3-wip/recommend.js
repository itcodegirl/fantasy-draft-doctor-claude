/**
 * Turns draft state into three recommendations that optimise DIFFERENT objectives.
 *
 * The point of three slots is not to print rows 1-3 of one ranked list. Each answers
 * a different question, so they diverge by construction:
 *
 *   BEST VALUE  -> who is underpriced relative to where the market is taking him?
 *   BEST FIT    -> which hole in MY lineup closes now and will not close later?
 *   BEST UPSIDE -> who wins the league if it breaks right?
 *
 * If all three ever return the same player, that is real signal, not a bug, and we
 * say so explicitly rather than padding the list.
 */

import {
  computeBaselines, replacementPoints, valueOf, survivalProbabilities,
  expectedBestAtPosition, starterGain, computeTiers, detectRuns, fitMarketCurve,
  adpSigma,
} from './engine.js';

const SLOT_TO_POS = {
  0: 'QB', 2: 'RB', 4: 'WR', 6: 'TE', 16: 'DST', 17: 'K', 23: 'FLEX',
};

/** Translate ESPN lineupSlotCounts into the shape the engine wants. */
export function readSlots(lineupSlotCounts) {
  const slots = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0, FLEX: 0, BENCH: 0 };
  for (const id of Object.keys(lineupSlotCounts || {})) {
    const n = lineupSlotCounts[id];
    if (!n) continue;
    const pos = SLOT_TO_POS[id];
    if (pos) slots[pos] += n;
    else if (id === '20') slots.BENCH += n;
  }
  return slots;
}

/** Overall pick number for a given draft slot and round in an N-team snake. */
export function snakePick(slot, round, N) {
  return round % 2 === 1
    ? (round - 1) * N + slot
    : (round - 1) * N + (N - slot + 1);
}

export function myPickNumbers(slot, N, rounds) {
  const out = [];
  for (let r = 1; r <= rounds; r++) out.push(snakePick(slot, r, N));
  return out;
}

/**
 * Per-team roster need from live picks. Every opponent's unfilled starting slots are
 * visible, which is the whole basis for predicting the picks between your turns
 * rather than falling back on league-average ADP.
 */
export function buildTeamNeeds(picks, players, slots, leagueSize) {
  const teams = {};
  for (let t = 1; t <= leagueSize; t++) {
    teams[t] = {
      teamId: t,
      counts: { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 },
      picks: [],
      autoDraft: false,
      reachDeltas: [],
    };
  }
  for (const pick of picks) {
    const t = teams[pick.teamId];
    if (!t) continue;
    const pl = players && players[pick.playerId];
    const pos = pl ? pl.pos : null;
    if (pos && t.counts[pos] != null) t.counts[pos] += 1;
    t.picks.push(pick);

    // ESPN hands us the autodraft flag directly -- this is not inference.
    // autoDraftTypeId 3 means the pick was made by ESPN's own list.
    if (pick.autoDraftTypeId === 3) t.autoDraft = true;

    // How far from market did this manager reach? Small samples, so this is only
    // ever used as a soft prior, never as a hard prediction.
    if (pl && pl.adp != null && pick.overallPickNumber != null) {
      t.reachDeltas.push(pl.adp - pick.overallPickNumber);
    }
  }

  for (const t of Object.values(teams)) {
    t.needs = {};
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
      t.needs[pos] = Math.max((slots[pos] || 0) - t.counts[pos], 0);
    }
    const flexFilled = Math.max(
      (t.counts.RB - (slots.RB || 0)) + (t.counts.WR - (slots.WR || 0)) + (t.counts.TE - (slots.TE || 0)), 0
    );
    t.needs.FLEX = Math.max((slots.FLEX || 0) - flexFilled, 0);
    t.avgReach = t.reachDeltas.length
      ? t.reachDeltas.reduce((a, b) => a + b, 0) / t.reachDeltas.length
      : null;
  }
  return teams;
}

/**
 * How much this room is drifting from national ADP. A reach-heavy room means value
 * falls further than expected and you can wait longer; a value-heavy room means the
 * opposite. Measured live rather than assumed.
 */
export function marketDrift(picks, players) {
  const deltas = [];
  for (const pick of picks) {
    const pl = players && players[pick.playerId];
    if (pl && pl.adp != null && pick.overallPickNumber != null) {
      deltas.push(pl.adp - pick.overallPickNumber);
    }
  }
  if (deltas.length < 8) return null;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return { picks: deltas.length, meanDelta: Math.round(mean * 10) / 10 };
}

// -------------------------------------------------------------------- main

export function recommend(input) {
  const {
    players, picks, slots, leagueSize, mySlot, rounds, myTeamId,
  } = input;

  if (!players || !Object.keys(players).length) {
    return { error: 'Player pool not loaded yet.' };
  }

  const draftedIds = new Set(picks.map((p) => p.playerId));
  const currentPick = picks.length;
  const round = Math.floor(currentPick / leagueSize) + 1;

  const all = Object.values(players).filter((p) => p.proj != null);
  const available = all.filter((p) => !draftedIds.has(p.id));

  const byPosAll = groupByPos(all);
  const byPosAvail = groupByPos(available);

  const baselines = computeBaselines(byPosAll, slots, leagueSize);
  const replPts = replacementPoints(byPosAll, baselines);

  // Tiers computed on the FULL pool so tier identity is stable as players go off
  // the board -- recomputing on the remaining pool would renumber tiers every pick.
  const tierOf = {};
  for (const pos of Object.keys(byPosAll)) {
    const list = byPosAll[pos];
    const tiers = computeTiers(list);
    list.forEach((p, i) => { tierOf[p.id] = tiers[i]; });
  }

  const myPicks = mySlot ? myPickNumbers(mySlot, leagueSize, rounds) : [];
  const nextPick = myPicks.find((n) => n > currentPick) || (currentPick + leagueSize);
  const followingPick = myPicks.find((n) => n > nextPick) || (nextPick + leagueSize);
  const picksUntilNextTurn = Math.max(followingPick - nextPick - 1, 0);

  const pGone = survivalProbabilities(available, nextPick, followingPick);

  const myRoster = picks
    .filter((p) => myTeamId != null && p.teamId === myTeamId)
    .map((p) => players[p.playerId])
    .filter(Boolean);

  const teams = buildTeamNeeds(picks, players, slots, leagueSize);
  const drift = marketDrift(picks, players);

  const recentStart = Math.max(currentPick - 2 * leagueSize, 0);
  const recentPicks = picks
    .filter((p) => (p.overallPickNumber || 0) > recentStart)
    .map((p) => ({
      overallPickNumber: p.overallPickNumber,
      pos: players[p.playerId] ? players[p.playerId].pos : null,
    }));
  const runs = detectRuns(recentPicks, byPosAvail, recentStart, currentPick, leagueSize);

  // Per-position expectation of what survives to the following pick -> VONA.
  const expectedNext = {};
  for (const pos of Object.keys(byPosAvail)) {
    expectedNext[pos] = expectedBestAtPosition(byPosAvail[pos], pGone, replPts);
  }

  // Roster-fit weight ramps across the draft: round 1 is nearly pure value because
  // you have no roster yet; late rounds are nearly pure fit.
  const w = clamp(0.15 + 0.70 * (round - 1) / Math.max(rounds - 1, 1), 0.15, 0.85);

  const rows = available.map((p) => {
    const v = valueOf(p, replPts);
    const gain = starterGain(p, myRoster, slots, replPts);
    const gone = pGone[p.id] != null ? pGone[p.id] : 0.5;
    const vona = v != null ? v - (expectedNext[p.pos] || 0) : null;

    // Urgency is expressed in points and only ever enters as urgency.
    const urgency = vona != null ? Math.max(vona, 0) * gone : 0;

    return {
      player: p,
      v: v,
      starterGain: gain,
      pGone: gone,
      pAvail: 1 - gone,
      vona: vona,
      urgency: urgency,
      tier: tierOf[p.id],
      rosterValue: w * gain + (1 - w) * (v || 0),
    };
  }).filter((r) => r.v != null);

  const curve = fitMarketCurve(rows.map((r) => ({ adp: r.player.adp, v: r.v })));
  for (const r of rows) {
    r.vhat = curve && r.player.adp != null ? curve.predict(r.player.adp) : null;
    r.surplus = r.vhat != null ? r.v - r.vhat : null;

    // Upside proxy: how unsettled the market is about this player relative to how
    // unsettled it usually is at that ADP. Real projection percentiles are not
    // published anywhere free, so dispersion stands in for ceiling.
    const sigma = adpSigma(r.player.adp, r.player.adpStdev);
    const expectedSigma = adpSigma(r.player.adp, null);
    r.dispersion = expectedSigma > 0 ? sigma / expectedSigma : 1;
  }

  const eligible = rows.filter((r) => passesGates(r, round, rounds, myRoster, slots));

  const bestValue = pick(eligible, (r) => (r.surplus != null ? r.surplus : r.v));
  const bestFit = pick(eligible, (r) => r.starterGain + 0.5 * r.urgency);
  const bestUpside = pick(eligible, (r) => upsideScore(r));

  const board = eligible.slice().sort((a, b) => b.rosterValue + 0.5 * b.urgency - (a.rosterValue + 0.5 * a.urgency));

  return {
    currentPick,
    round,
    nextPick,
    followingPick,
    picksUntilNextTurn,
    baselines,
    replPts,
    weightRosterFit: Math.round(w * 100) / 100,
    myRoster,
    teams,
    runs,
    drift,
    autoDraftTeams: Object.values(teams).filter((t) => t.autoDraft).map((t) => t.teamId),
    recommendations: dedupe([
      label(bestValue, 'BEST VALUE', explainValue(bestValue, runs)),
      label(bestFit, 'BEST FIT', explainFit(bestFit, slots, myRoster)),
      label(bestUpside, 'BEST UPSIDE', explainUpside(bestUpside)),
    ]),
    board: board.slice(0, 60),
  };
}

// ----------------------------------------------------------------- helpers

function groupByPos(list) {
  const out = {};
  for (const p of list) {
    if (!out[p.pos]) out[p.pos] = [];
    out[p.pos].push(p);
  }
  for (const pos of Object.keys(out)) {
    out[pos].sort((a, b) => (b.proj || 0) - (a.proj || 0));
  }
  return out;
}

function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

function pick(rows, scoreFn) {
  let best = null;
  let bestScore = -Infinity;
  for (const r of rows) {
    const s = scoreFn(r);
    if (s != null && s > bestScore) { bestScore = s; best = r; }
  }
  return best;
}

function upsideScore(r) {
  // Truncated expectation in spirit: score only the part above the market curve so
  // downside is floored at zero rather than counted against a boom pick.
  const above = r.surplus != null ? Math.max(r.surplus, 0) : Math.max(r.v, 0);
  return above * (1 + 0.6 * (r.dispersion - 1)) + 0.25 * Math.max(r.v, 0);
}

/**
 * Hard gates rather than soft penalties. A penalty gets steamrolled by a large VBD
 * number; a gate does not.
 */
function passesGates(r, round, rounds, myRoster, slots) {
  const pos = r.player.pos;
  const roundsLeft = rounds - round;
  if ((pos === 'K' || pos === 'DST') && roundsLeft > 1) return false;
  if (pos === 'QB' && roundsLeft > 2) {
    const haveQB = myRoster.filter((p) => p.pos === 'QB').length;
    if (haveQB >= (slots.QB || 1)) return false;
  }
  return true;
}

function label(row, slot, why) {
  if (!row) return null;
  return {
    slot: slot,
    id: row.player.id,
    name: row.player.name,
    pos: row.player.pos,
    tier: row.tier,
    adp: row.player.adp != null ? Math.round(row.player.adp * 10) / 10 : null,
    proj: row.player.proj,
    value: Math.round(row.v * 10) / 10,
    surplus: row.surplus != null ? Math.round(row.surplus * 10) / 10 : null,
    starterGain: Math.round(row.starterGain * 10) / 10,
    pAvailNextTurn: Math.round(row.pAvail * 100),
    vona: row.vona != null ? Math.round(row.vona * 10) / 10 : null,
    injury: row.player.injury,
    why: why,
  };
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    if (!r) continue;
    if (seen.has(r.id)) {
      out.push(Object.assign({}, r, { duplicateOf: r.id, why: r.why + ' (same player as another slot -- that agreement is signal)' }));
      continue;
    }
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

// Explanations are raw numbers, never a composite score. A composite is not
// actionable under a 90-second clock; "6 RBs in the last 12 picks" is.

function explainValue(row, runs) {
  if (!row) return '';
  const bits = [];
  if (row.surplus != null) {
    bits.push('worth ' + Math.round(row.surplus) + ' pts more than typical at ADP ' + Math.round(row.player.adp || 0));
  }
  bits.push(Math.round(row.pAvail * 100) + '% chance he lasts to your next turn');
  const run = runs[row.player.pos];
  if (run && run.z >= 2) {
    bits.push(run.observed + ' ' + row.player.pos + 's gone in the last window vs ' + run.expected + ' expected');
  }
  return bits.join(' - ');
}

function explainFit(row, slots, myRoster) {
  if (!row) return '';
  const have = myRoster.filter((p) => p.pos === row.player.pos).length;
  const need = slots[row.player.pos] || 0;
  const bits = ['adds ' + Math.round(row.starterGain) + ' pts to your starting lineup'];
  bits.push('you have ' + have + ' ' + row.player.pos + ' for ' + need + ' starting slot' + (need === 1 ? '' : 's'));
  if (row.vona != null && row.vona > 0) {
    bits.push('waiting costs about ' + Math.round(row.vona) + ' pts at the position');
  }
  return bits.join(' - ');
}

function explainUpside(row) {
  if (!row) return '';
  const bits = [];
  if (row.dispersion > 1.15) bits.push('market is unusually split on him');
  else bits.push('ceiling play at this cost');
  bits.push('tier ' + (row.tier != null ? row.tier : '?') + ' at ' + row.player.pos);
  bits.push(Math.round(row.pAvail * 100) + '% to last');
  return bits.join(' - ');
}
