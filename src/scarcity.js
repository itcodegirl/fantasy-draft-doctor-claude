/**
 * Tier exhaustion and Value Over Next Available.
 *
 * Pure module: no chrome.* APIs, no DOM, no network, no clock of its own.
 *
 * Both answers are JOINT questions about a set of players -- "will every RB in this tier
 * be gone", "what is the best WR still there when I pick" -- and both are usually
 * answered by multiplying individual survival probabilities together. The parked
 * phase3-wip engine flags exactly that in its own output: survivals in a draft are
 * NEGATIVELY correlated, because the players compete for the same finite set of picks.
 * If one lasts, the others are likelier to last too.
 *
 * THE CONSTRUCTION. The survival model says player j is taken with probability
 * p_j = 1 - S_j, and by its sum-to-K identity those probabilities add to exactly K, the
 * number of picks in the window. The joint consistent with that is CONDITIONAL BERNOULLI:
 * independent indicators, conditioned on the total coming out at K. Conditioning is what
 * carries the correlation -- knowing one player went uses up one of the K picks, which
 * makes every other player likelier to last.
 *
 *   P(all of S gone | total = K) = prod(p_j for j in S) * P(N_rest = K - |S|) / P(N_all = K)
 *
 * Both terms are Poisson-binomial DPs, exact and deterministic.
 *
 * A NOTE ON A WRONG TURN, because it is an easy one to take: decomposing instead over
 * PICKS -- "the chance pick n lands in S is the sum of its propensities, so the count is
 * a Poisson-binomial over picks" -- looks equally principled and is not. For a single
 * player it yields 1 - prod(1 - q_n) where the model says the answer is sum(q_n), so it
 * does not even reproduce the marginals it is built from, and it understates badly.
 *
 * Everything here is exact for that joint. It inherits the survival model's own
 * approximation (mean-field roster state) and adds nothing further.
 */

import { POSITIONS } from './autodraft.js';
import { EPSILON } from './survival.js';

/** Players per position considered for VONA. Past this the value layers are noise. */
export const DEFAULT_VONA_DEPTH = 15;

/** Rolling window for the tier-gap threshold. */
export const DEFAULT_TIER_WINDOW = 15;

/**
 * Poisson-binomial: the distribution of how many of these independent indicators fire.
 * Counts above `cap` are not tracked, because every caller conditions on a total of K.
 */
export function takenCountDistribution(probabilities, cap, skip) {
  // Two buffers swapped in place. Allocating a fresh array per player is the obvious
  // way to write this and made the whole read-out cost ~56ms per render; the DP is
  // called once per tier and once per VONA prefix, so the allocations dominate.
  let dp = new Float64Array(cap + 2);
  let next = new Float64Array(cap + 2);
  dp[0] = 1;
  // Counts above what has been added so far are all zero, so there is no point sweeping
  // the full range on early players.
  let reach = 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (skip && skip.has(i)) continue;
    const p = probabilities[i];
    if (p <= 0) continue;
    const top = Math.min(reach, cap);
    next.fill(0, 0, top + 2);
    for (let c = 0; c <= top; c++) {
      const mass = dp[c];
      if (!mass) continue;
      next[c] += mass * (1 - p);
      next[c + 1] += mass * p;
    }
    const swap = dp; dp = next; next = swap;
    if (reach < cap + 1) reach++;
  }
  return dp;
}

/**
 * Probability every player in the set is gone before your turn, conditioned on the window
 * consuming exactly `totalPicks` players.
 *
 * `denominator` is P(N_all = K), which is the same for every set on a given board -- pass
 * it in rather than recomputing it per tier.
 */
export function exhaustionProbability(take, indices, totalPicks, denominator) {
  const m = indices.length;
  if (!m || totalPicks - m < 0) return 0;
  const inSet = new Set(indices);
  let allGone = 1;
  for (const i of indices) allGone *= take[i];
  if (allGone <= 0) return 0;

  const denom = denominator != null
    ? denominator
    : takenCountDistribution(take, totalPicks)[totalPicks];
  // Clamped off 1 for the same reason survival is: this is a probability about human
  // opponents, and the panel must never be able to say a tier is certainly gone.
  if (!denom) return Math.min(allGone, 1 - EPSILON);
  const restDp = takenCountDistribution(take, totalPicks, inSet);
  return Math.min(allGone * restDp[totalPicks - m] / denom, 1 - EPSILON);
}

/**
 * Expected value of the best survivor in a ranked list, by layer-cake summation:
 *
 *   E[max] = v_last * P(any survive) + sum over i of (v_i - v_{i+1}) * P(any of top i survive)
 *
 * Each layer needs only P(at least one of the top i survives) = 1 - P(all top i gone),
 * which the Poisson-binomial gives exactly. This is the step where the usual
 * implementation reaches for prod(1 - s_j) and picks up the independence error.
 *
 * The prefix grows one player at a time, so the DP is re-run over a set that is one
 * larger each round -- O(K * m^2) for a list of m, which is why the list is capped.
 */
export function expectedBestValue(take, ranked, totalPicks, denominator) {
  if (!ranked.length) return { expected: 0, allGone: 1 };
  const prefix = [];
  let expected = 0;
  let anySurvives = 0;
  for (let i = 0; i < ranked.length; i++) {
    prefix.push(ranked[i].index);
    anySurvives = 1 - exhaustionProbability(take, prefix, totalPicks, denominator);
    const layer = i + 1 < ranked.length
      ? ranked[i].value - ranked[i + 1].value
      : ranked[i].value;
    if (layer > 0) expected += layer * anySurvives;
  }
  return { expected, allGone: 1 - anySurvives };
}

/**
 * Gap-based tiering within a position, on projected points.
 *
 * Deterministic on purpose -- an EM or GMM fit gives different tiers run to run, and a
 * draft board whose tiers move while you are reading it is worse than no tiers. Ported
 * from phase3-wip/engine.js, which is not on that file's list of known defects.
 *
 * Tiers are computed over the FULL position list, drafted players included, so a tier
 * keeps its identity as the board empties. A "tier 3" that silently renumbers itself
 * every few picks cannot be talked about.
 */
export function computeTiers(sortedPosPlayers, windowSize = DEFAULT_TIER_WINDOW) {
  const gaps = [];
  for (let i = 0; i < sortedPosPlayers.length - 1; i++) {
    const a = sortedPosPlayers[i].proj;
    const b = sortedPosPlayers[i + 1].proj;
    gaps.push(Number.isFinite(a) && Number.isFinite(b) ? a - b : 0);
  }
  const tiers = [];
  let tier = 1;
  let sizeInTier = 0;
  for (let i = 0; i < sortedPosPlayers.length; i++) {
    tiers.push(tier);
    sizeInTier += 1;
    const win = gaps.slice(Math.max(0, i - windowSize), Math.min(gaps.length, i + windowSize));
    if (!win.length) continue;
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const sd = Math.sqrt(win.reduce((a, b) => a + (b - mean) * (b - mean), 0) / win.length);
    if (sizeInTier >= 2 && (gaps[i] > mean + sd || sizeInTier >= 8)) {
      tier += 1;
      sizeInTier = 0;
    }
  }
  return tiers;
}

function byPositionSorted(players) {
  const out = {};
  for (const p of Object.values(players || {})) {
    if (!POSITIONS.includes(p.pos) || !Number.isFinite(Number(p.proj))) continue;
    (out[p.pos] = out[p.pos] || []).push(p);
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => (Number(b.proj) - Number(a.proj)) || (String(a.id) < String(b.id) ? -1 : 1));
  }
  return out;
}

/**
 * Tier and VONA read-out for the current board.
 *
 * VONA is the drop-off between the best player at a position now and the best one
 * expected to survive to your turn. It is the question a draft actually asks -- not "who
 * is best" but "at which position do I lose the most by waiting".
 *
 * Note the replacement level cancels: VONA is a DIFFERENCE of values at the same
 * position, so shifting both by a baseline leaves it unchanged. That is why this works
 * off raw projections without needing replacement-level machinery.
 */
export function analyzeScarcity(input) {
  const {
    players = {}, survival, unavailablePlayerIds = [],
    vonaDepth = DEFAULT_VONA_DEPTH, tierWindow = DEFAULT_TIER_WINDOW,
  } = input || {};
  const empty = { vona: [], tiers: [], modelledPicks: 0 };
  if (!survival || !survival.candidateIds || !survival.candidateIds.length) return empty;
  const totalPicks = Math.round(survival.takenMass);
  if (!Number.isInteger(totalPicks) || totalPicks < 1) return empty;

  // p_j = 1 - S_j, which sum to exactly the window length by the model's own identity.
  const take = survival.candidateIds.map((id) => 1 - survival.byPlayerId[String(id)]);
  // P(N_all = K) is shared by every set on this board, so it is paid for once.
  const denominator = takenCountDistribution(take, totalPicks)[totalPicks];

  const indexOf = new Map(survival.candidateIds.map((id, i) => [String(id), i]));
  const unavailable = new Set(Array.from(unavailablePlayerIds, String));
  const byPos = byPositionSorted(players);

  const vona = [];
  const tiers = [];
  for (const pos of POSITIONS) {
    const list = byPos[pos];
    if (!list || !list.length) continue;
    const tierOf = computeTiers(list, tierWindow);

    // Available AND modelled. A player the survival model could not price -- no ADP, or
    // past the candidate cap -- is left out rather than assigned a guess.
    const live = [];
    for (let i = 0; i < list.length; i++) {
      const id = String(list[i].id);
      if (unavailable.has(id)) continue;
      const index = indexOf.get(id);
      if (index == null) continue;
      live.push({ player: list[i], index, tier: tierOf[i], value: Number(list[i].proj) });
    }
    if (!live.length) continue;

    const ranked = live.slice(0, vonaDepth).map((r) => ({ index: r.index, value: r.value }));
    const { expected, allGone } = expectedBestValue(take, ranked, totalPicks, denominator);
    vona.push({
      pos,
      bestNow: live[0].player.name,
      bestNowId: live[0].player.id,
      bestNowValue: live[0].value,
      expectedValue: expected,
      vona: live[0].value - expected,
      depth: ranked.length,
      allGone,
    });

    const grouped = new Map();
    for (const row of live) {
      if (!grouped.has(row.tier)) grouped.set(row.tier, []);
      grouped.get(row.tier).push(row);
    }
    for (const [tier, rows] of grouped) {
      tiers.push({
        pos,
        tier,
        remaining: rows.length,
        exhaustion: exhaustionProbability(take, rows.map((r) => r.index), totalPicks, denominator),
        players: rows.map((r) => r.player.name),
      });
    }
  }

  vona.sort((a, b) => b.vona - a.vona);
  tiers.sort((a, b) => b.exhaustion - a.exhaustion);
  return { vona, tiers, modelledPicks: survival.modelledPicks };
}
