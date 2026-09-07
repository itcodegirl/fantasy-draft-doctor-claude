/**
 * Need-conditioned survival probability.
 *
 * Pure module: no chrome.* APIs, no DOM, no network, no clock of its own. Same contract
 * as `store.js` and `autodraft.js`.
 *
 * The question is "will this player still be there at my next turn". Today the only
 * answer is `adp >= nextPick` -- a league-average threshold that ignores who is actually
 * picking in between. But every opponent's unfilled starting slots are derivable from the
 * pick list, and a team with two RBs and no WRs is unlikely to take a third RB.
 *
 * THREE DESIGN DECISIONS, each of which the obvious implementation gets wrong:
 *
 * 1. HAZARD, NOT DENSITY. A player whose ADP was 20 and who is somehow still on the board
 *    at pick 40 has a near-zero ADP *density* there -- and is the single most likely next
 *    pick. Weighting by density would make the model most wrong about exactly the players
 *    it matters most about. The hazard phi(z)/(1-Phi(z)) is the probability of going now
 *    GIVEN still being available, which is the quantity this problem actually asks for.
 *
 * 2. SUBTRACT, DO NOT MULTIPLY. Each pick's propensities are normalised to sum to 1, so
 *    they are unconditional. Survival updates as S -= q. Writing S *= (1 - q) would treat
 *    an unconditional probability as a conditional one and consume sum(S*q) per pick
 *    instead of exactly 1, quietly losing mass. Because every pick removes exactly one
 *    unit, sum over players of (1 - S) equals the number of modelled picks EXACTLY. The
 *    parked phase3-wip engine chased that same constraint with a three-iteration rescale
 *    that does not converge once players saturate at 1.0.
 *
 * 3. NEED IS A MULTIPLIER ON MARKET, NEVER A SUBSTITUTE. A kicker's starting slot is open
 *    from pick 1, but kickers have an ADP around 150 and the hazard keeps them out of
 *    round 3 without a special case.
 *
 * WHAT THIS IS NOT: the roster state carried through the window is a mean-field
 * expectation -- real-valued counts fed into a non-linear need function. That understates
 * variance. It is an approximation, it is not measured here, and `assumptions` says so.
 *
 * The sigma fit is inherited from the parked phase3-wip engine, which claims it was
 * fitted against real ADP pairs. That measurement is NOT in this repository, so it is an
 * inherited assertion rather than something this codebase has verified.
 */

import { POSITIONS, FLEX_POSITIONS, starterDemand, slotForPick } from './autodraft.js';

/** Floor on the need multiplier. Non-zero by decision: best-player-available is real, and
 *  one such manager must not invalidate the whole window. */
export const FILLED_WEIGHT = 0.25;

/** How fast the multiplier saturates in unfilled slots. 1.0 -> demand 1 gives 0.72,
 *  demand 2 gives 0.90. Wanting a second WR matters much less than wanting a first. */
export const DEMAND_SCALE = 1.0;

/** Probabilities are clamped inside (0,1). A survival of exactly 1 renders as certainty,
 *  and this model is never entitled to certainty -- that channel belongs to the
 *  deterministic autodraft projection. */
export const EPSILON = 1e-4;

/** Candidates considered, by ascending ADP. Beyond this survival is ~1 anyway. */
export const DEFAULT_CANDIDATE_LIMIT = 200;

/** Above this z the Abramowitz & Stegun erf loses its remaining significant digits. */
const MILLS_SWITCH = 4;

/** Spread below which the multipliers cannot meaningfully separate positions. */
const NEGLIGIBLE_CONDITIONING = 0.05;

// ------------------------------------------------------------------- gaussian

/** Abramowitz & Stegun 7.1.26. Absolute error ~1.5e-7. */
export function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
    + 0.254829592) * t * Math.exp(-z * z);
  return sign * y;
}

export function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function normalPdf(z) {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/**
 * Hazard of a standard normal: phi(z) / (1 - Phi(z)).
 *
 * The tail branch is not an optimisation, it is a correctness fix. `1 - normalCdf(z)` at
 * z = 5 is about 2.9e-7, smaller than the A&S error term itself, so the ratio degrades
 * into noise precisely for the fallen players whose hazard should be largest. Above the
 * switch point an asymptotic inverse Mills ratio is used instead. The two branches agree
 * to well under 1% where they meet.
 */
export function gaussianHazard(z) {
  if (z > MILLS_SWITCH) {
    const z2 = z * z;
    return z / (1 - (1 / z2) + (3 / (z2 * z2)) - (15 / (z2 * z2 * z2)));
  }
  const tail = 1 - normalCdf(z);
  if (tail <= 0) return gaussianHazard(MILLS_SWITCH);
  return normalPdf(z) / tail;
}

/**
 * Spread of the market around a player's ADP. Inherited from phase3-wip/engine.js, which
 * rejects the common sigma = ADP/4 heuristic as roughly three times too wide at ADP 100.
 * `observed` is honoured when ESPN supplies a standard deviation; it currently never does.
 */
export function adpSigma(adp, observed) {
  if (Number.isFinite(Number(observed)) && Number(observed) > 0) return Number(observed);
  return Math.max(1.0 + 0.08 * (Number(adp) || 0), 0.5);
}

// ----------------------------------------------------------------------- need

/**
 * Per-position multiplier for one roster, in [FILLED_WEIGHT, 1].
 *
 * Only the PENALTY is parameterised. Down-weighting a team's RBs shrinks the denominator
 * when the propensities are normalised, so its WRs rise in relative share on their own --
 * there is no separate boost term and therefore no way to double-count need.
 *
 * A roster with every starter filled gets a uniform multiplier across all positions,
 * which cancels in normalisation. That pick falls back to pure market, which is the right
 * treatment of a manager with nothing left to fill, and it falls out rather than being
 * special-cased.
 */
export function needMultipliers(counts, slots, filledWeight = FILLED_WEIGHT, demandScale = DEMAND_SCALE) {
  const demand = starterDemand(counts, slots);
  const out = {};
  for (const pos of POSITIONS) {
    const total = demand[pos] + (FLEX_POSITIONS.indexOf(pos) === -1 ? 0 : demand.FLEX);
    out[pos] = filledWeight + (1 - filledWeight) * (1 - Math.exp(-total / demandScale));
  }
  return out;
}

// ------------------------------------------------------------------ survival

function clampProbability(p) {
  return Math.min(Math.max(p, EPSILON), 1 - EPSILON);
}

function copyCounts(source) {
  const out = {};
  for (const [key, value] of Object.entries(source || {})) {
    out[key] = Object.assign(Object.fromEntries(POSITIONS.map((pos) => [pos, 0])), value);
  }
  return out;
}

/**
 * Probability each available player is still on the board at your next turn.
 *
 * Autodraft picks are PINNED, not modelled: the projected player is removed from the
 * candidate pool before the probabilistic pass and the window shrinks by one. Pinning
 * inside the loop would try to consume a full unit of mass from a player whose survival
 * had already been partly eaten by earlier picks, and the sum-to-K identity would quietly
 * stop holding.
 */
export function survivalProbabilities(input) {
  const {
    players = {}, slots, teams, currentPick, nextPick,
    countsByTeam = {}, slotMap = {}, projected = [], draftedPlayerIds = [],
    unavailablePlayerIds = [], slotMapConflicts = [],
    attributedPicks = null, totalPicks = null,
    conditioning = true,
    filledWeight = FILLED_WEIGHT, demandScale = DEMAND_SCALE,
    candidateLimit = DEFAULT_CANDIDATE_LIMIT,
  } = input || {};

  const assumptions = [];
  const size = Number(teams);
  const from = Number(currentPick);
  const to = Number(nextPick);
  const windowLength = Math.max(to - from - 1, 0);
  const empty = {
    basis: 'none', byPlayerId: {}, windowPicks: [], candidates: 0,
    pinnedPicks: 0, modelledPicks: 0, conditionedPicks: 0, unconditionedPicks: 0,
    conditioningStrength: 0, takenMass: 0, noAdpPlayerIds: [], attributionRate: null, assumptions,
  };
  if (!Number.isInteger(size) || size < 2 || !windowLength) return empty;

  const pinned = new Map();
  for (const row of projected) pinned.set(String(row.playerId), row);
  const unavailable = new Set([
    ...Array.from(draftedPlayerIds, String),
    ...Array.from(unavailablePlayerIds, String),
    ...pinned.keys(),
  ]);

  // Ascending ADP: the players in genuine contention over the next few picks. Anything
  // past the cap survives with probability ~1 and is reported as unmodelled rather than
  // silently assigned a number.
  const noAdpPlayerIds = [];
  const pool = [];
  for (const p of Object.values(players)) {
    const id = String(p.id);
    if (unavailable.has(id)) continue;
    const adp = Number(p.adp);
    // Rank is NOT substituted for ADP. They are different measurements, and feeding a
    // rank into ADP arithmetic is the defect the parked engine carries.
    if (!Number.isFinite(adp) || adp <= 0) { noAdpPlayerIds.push(id); continue; }
    pool.push({ id, pos: p.pos, adp, sigma: adpSigma(adp, p.adpStdev) });
  }
  pool.sort((a, b) => (a.adp - b.adp) || (a.id < b.id ? -1 : 1));
  const candidates = pool.slice(0, candidateLimit);
  if (!candidates.length) return Object.assign(empty, { noAdpPlayerIds });
  if (noAdpPlayerIds.length) {
    assumptions.push(noAdpPlayerIds.length + ' available players carry no ADP and are not modelled;'
      + ' ESPN rank is never substituted for ADP');
  }

  // Attribution confidence. Manual picks for opposing teams carry no teamId, so roster
  // state is only as good as the share of picks that could be attributed. At zero
  // attribution the conditioned model degrades EXACTLY to the market-only model.
  const attributionRate = (Number.isFinite(attributedPicks) && Number.isFinite(totalPicks) && totalPicks > 0)
    ? attributedPicks / totalPicks
    : (Object.keys(countsByTeam).length ? 1 : 0);
  if (conditioning && attributionRate < 1) {
    assumptions.push('only ' + Math.round(attributionRate * 100) + '% of picks carry a team id;'
      + ' need conditioning is scaled down to match');
  }

  // A slot whose team id disagreed between picks cannot be trusted to name an opponent.
  // Live-auto picks carry a synthesized overall pick number until REST reconciles, so this
  // is per-slot rather than global -- one stale frame must not disable the feature.
  const conflictedSlots = new Set(slotMapConflicts.map((c) => String(c.slot)));

  const counts = copyCounts(countsByTeam);
  const survival = new Map(candidates.map((c) => [c.id, 1]));
  const windowPicks = [];
  let pinnedPicks = 0;
  let conditionedPicks = 0;
  let unconditionedPicks = 0;
  let strengthTotal = 0;

  for (let n = from + 1; n < to; n++) {
    const slot = slotForPick(n, size);
    const teamId = slot == null ? null : slotMap[slot];
    const pinnedHere = projected.find((row) => Number(row.overallPickNumber) === n);
    if (pinnedHere) {
      windowPicks.push({ overallPickNumber: n, teamId: pinnedHere.teamId, basis: 'autodraft-projected' });
      pinnedPicks++;
      continue;
    }

    const key = String(teamId);
    const trustTeam = conditioning && teamId != null && !conflictedSlots.has(String(slot));
    let multipliers = null;
    if (trustTeam) {
      if (!counts[key]) counts[key] = Object.fromEntries(POSITIONS.map((pos) => [pos, 0]));
      const raw = needMultipliers(counts[key], slots, filledWeight, demandScale);
      multipliers = {};
      let lo = Infinity;
      let hi = -Infinity;
      for (const pos of POSITIONS) {
        // Blend toward 1 by how much of the board we could actually attribute.
        multipliers[pos] = 1 + attributionRate * (raw[pos] - 1);
        lo = Math.min(lo, multipliers[pos]);
        hi = Math.max(hi, multipliers[pos]);
      }
      // SPREAD, not distance from 1. The propensities are normalised, so only relative
      // differences between positions survive -- a roster with every starter filled gets
      // a uniform multiplier that cancels completely. Scoring that by |f - 1| would report
      // maximum conditioning at the one point where the effect is exactly zero.
      strengthTotal += hi - lo;
      conditionedPicks++;
    } else {
      unconditionedPicks++;
    }

    let total = 0;
    const weights = [];
    for (const c of candidates) {
      const s = survival.get(c.id);
      if (s <= 0) { weights.push(0); continue; }
      const z = (n - c.adp) / c.sigma;
      const w = s * gaussianHazard(z) * (multipliers ? (multipliers[c.pos] || 1) : 1);
      weights.push(w);
      total += w;
    }

    if (total > 0) {
      for (let i = 0; i < candidates.length; i++) {
        const q = weights[i] / total;
        if (!q) continue;
        const c = candidates[i];
        survival.set(c.id, Math.max(survival.get(c.id) - q, 0));
        // Mean-field roster update: this pick contributes exactly one unit of expected
        // roster, spread across positions by where it probably landed.
        if (trustTeam && counts[key][c.pos] != null) counts[key][c.pos] += q;
      }
    }
    windowPicks.push({
      overallPickNumber: n, teamId: teamId == null ? null : Number(teamId),
      basis: trustTeam ? 'need-conditioned' : 'market-only',
    });
  }

  // Reported BEFORE the epsilon clamp. The sum-to-K identity holds on the raw values;
  // clamping perturbs it by up to EPSILON per candidate, so a caller checking the
  // invariant has to be handed the unclamped total.
  let takenMass = 0;
  for (const s of survival.values()) takenMass += 1 - s;

  const byPlayerId = {};
  for (const [id, s] of survival) byPlayerId[id] = clampProbability(s);

  const modelledPicks = windowLength - pinnedPicks;
  const conditioningStrength = conditionedPicks ? strengthTotal / conditionedPicks : 0;
  if (conditionedPicks && conditioningStrength < NEGLIGIBLE_CONDITIONING) {
    assumptions.push('opponent rosters are too alike to separate the positions right now,'
      + ' so this is effectively an ADP-only forecast');
  }
  assumptions.push('opponent roster state is carried forward as an expectation, which understates variance');
  assumptions.push('the ADP spread fit is inherited from phase3-wip and is not measured in this repository');

  return {
    basis: conditionedPicks ? 'need-conditioned' : 'market-only',
    byPlayerId,
    windowPicks,
    candidates: candidates.length,
    pinnedPicks,
    modelledPicks,
    conditionedPicks,
    unconditionedPicks,
    conditioningStrength,
    takenMass,
    noAdpPlayerIds,
    attributionRate,
    assumptions,
  };
}
