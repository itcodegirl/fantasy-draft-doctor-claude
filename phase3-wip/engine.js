/**
 * Draft valuation engine.
 *
 * Signal hygiene is the organising rule here -- each input gets exactly one job,
 * so nothing is counted twice:
 *
 *   projections   -> raw talent          (used once, inside V)
 *   baseline      -> positional scarcity (used once, inside V)
 *   E[games]      -> availability        (multiplies V, once)
 *   ADP / sigma   -> urgency ONLY        (never added to value)
 *   tier          -> cliff size ONLY     (never added to value)
 *   roster state  -> marginal fit ONLY   (via starterGain)
 *
 * Everything is in fantasy points, so the blend weights are interpretable rather
 * than magic numbers.
 */

const FLEX_ELIGIBLE = ['RB', 'WR', 'TE'];

// --------------------------------------------------------------------- math

/** Abramowitz & Stegun 7.1.26 error function; plenty accurate for draft work. */
export function erf(x) {
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

export function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * ADP standard deviation.
 *
 * Do NOT use the popular sigma = ADP/4 heuristic -- it is roughly 3x too wide at
 * ADP 100. This linear fit was measured against real 2026 ADP/stdev pairs. If a
 * Fantasy Football Calculator stdev is available for the player, prefer it: their
 * free API publishes a real per-player stdev.
 */
export function adpSigma(adp, observed) {
  if (observed != null && observed > 0) return Math.max(observed, 0.5);
  if (adp == null) return 12;
  return Math.max(1.0 + 0.08 * adp, 0.5);
}

// ---------------------------------------------------------------- baselines

/**
 * Replacement rank per position, derived by greedy flex allocation.
 *
 * The closed-form Harstad multipliers (1.22 / 1.56 / 1.81) are disputed -- a
 * verification pass put RB at 1.41 and WR at 1.50 -- so we avoid the contested
 * constants entirely and simulate the allocation instead. This self-corrects for
 * any lineup shape and needs no fitted weights.
 *
 * Note the naive "N x starters" rule (RB24 for a 12-team 2RB league) is about 30%
 * too shallow and will badly undervalue depth.
 */
export function computeBaselines(playersByPos, slots, leagueSize) {
  const N = leagueSize;
  const base = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
    base[pos] = N * (slots[pos] || 0);
  }

  const flexSlots = slots.FLEX || 0;
  if (flexSlots > 0) {
    const ptr = {};
    for (const pos of FLEX_ELIGIBLE) ptr[pos] = base[pos];

    for (let i = 0; i < N * flexSlots; i++) {
      let bestPos = null;
      let bestVal = -Infinity;
      for (const pos of FLEX_ELIGIBLE) {
        const list = playersByPos[pos] || [];
        const cand = list[ptr[pos]];
        if (cand && cand.proj != null && cand.proj > bestVal) {
          bestVal = cand.proj;
          bestPos = pos;
        }
      }
      if (!bestPos) break;
      ptr[bestPos] += 1;
      base[bestPos] += 1;
    }
  }
  return base;
}

/** Smooth the baseline across ranks r-1, r, r+1 rather than trusting one player. */
export function replacementPoints(playersByPos, baselines) {
  const out = {};
  for (const pos of Object.keys(baselines)) {
    const list = playersByPos[pos] || [];
    const r = baselines[pos];
    const vals = [];
    for (const idx of [r - 2, r - 1, r]) {
      if (idx >= 0 && list[idx] && list[idx].proj != null) vals.push(list[idx].proj);
    }
    if (!vals.length) {
      const last = list[list.length - 1];
      out[pos] = last && last.proj != null ? last.proj : 0;
    } else {
      out[pos] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  return out;
}

// -------------------------------------------------------------------- value

const INJURY_GAMES = {
  ACTIVE: 1.0,
  NORMAL: 1.0,
  QUESTIONABLE: 0.96,
  DOUBTFUL: 0.85,
  OUT: 0.75,
  SUSPENSION: 0.75,
  INJURY_RESERVE: 0.45,
  IR: 0.45,
  PUP: 0.5,
  NFI: 0.5,
};

/** Availability enters here and ONLY here. No separate risk discount anywhere. */
export function expectedGamesFactor(player) {
  const s = (player.injury || 'ACTIVE').toUpperCase();
  return INJURY_GAMES[s] != null ? INJURY_GAMES[s] : 1.0;
}

export function valueOf(player, replPts) {
  if (player.proj == null) return null;
  const base = replPts[player.pos];
  if (base == null) return null;
  return (player.proj - base) * expectedGamesFactor(player);
}

// ----------------------------------------------------------------- survival

/**
 * Probability each available player is gone before pick P.
 *
 * The renormalisation step is the one everybody skips: exactly K players will be
 * taken before your next turn, so the marginal probabilities must sum to K.
 * Without it the survival vector is internally inconsistent and every downstream
 * expectation is biased.
 */
export function survivalProbabilities(available, currentPick, myNextPick) {
  const K = Math.max(myNextPick - currentPick - 1, 0);
  const rows = available.map((p) => {
    const sigma = adpSigma(p.adp, p.adpStdev);
    const adp = p.adp != null ? p.adp : (p.rank != null ? p.rank : 500);
    const z = (myNextPick - 0.5 - adp) / sigma;
    return { id: p.id, pGone: Math.min(Math.max(normalCdf(z), 0), 1) };
  });

  if (K === 0) {
    const zero = {};
    for (const r of rows) zero[r.id] = 0;
    return zero;
  }

  for (let iter = 0; iter < 3; iter++) {
    const total = rows.reduce((a, r) => a + r.pGone, 0);
    if (total <= 0) break;
    const scale = K / total;
    for (const r of rows) r.pGone = Math.min(Math.max(r.pGone * scale, 0), 1);
  }

  const out = {};
  for (const r of rows) out[r.id] = r.pGone;
  return out;
}

/**
 * Expected best available at a position at your next pick -- the expectation over
 * "the first one that survives". VONA is the difference against taking now.
 */
export function expectedBestAtPosition(sortedPosPlayers, pGone, replPts) {
  let cumulativeGone = 1;
  let expected = 0;
  for (const p of sortedPosPlayers) {
    const gone = pGone[p.id] != null ? pGone[p.id] : 0.5;
    const avail = 1 - gone;
    const v = valueOf(p, replPts);
    if (v == null) continue;
    expected += v * avail * cumulativeGone;
    cumulativeGone *= gone;
    if (cumulativeGone < 0.001) break;
  }
  return expected;
}

// ------------------------------------------------------------- roster fit

/**
 * Best achievable starting-lineup points for a roster. Fill dedicated slots first,
 * then flex from whatever is left. Empty slots are charged at replacement level so
 * a hole is priced as a real cost rather than as zero.
 */
export function optimalLineupPoints(roster, slots, replPts) {
  const pool = {};
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
    pool[pos] = roster.filter((p) => p.pos === pos)
      .sort((a, b) => (b.proj || 0) - (a.proj || 0));
  }
  let total = 0;
  const used = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 };

  for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
    const need = slots[pos] || 0;
    for (let i = 0; i < need; i++) {
      const p = pool[pos][used[pos]];
      if (p && p.proj != null) { total += p.proj; used[pos] += 1; }
      else total += replPts[pos] != null ? replPts[pos] : 0;
    }
  }

  const flexNeed = slots.FLEX || 0;
  for (let i = 0; i < flexNeed; i++) {
    let best = null;
    let bestPos = null;
    for (const pos of FLEX_ELIGIBLE) {
      const p = pool[pos][used[pos]];
      if (p && p.proj != null && (!best || p.proj > best.proj)) { best = p; bestPos = pos; }
    }
    if (best) { total += best.proj; used[bestPos] += 1; }
    else {
      const fallback = Math.max(replPts.RB || 0, replPts.WR || 0, replPts.TE || 0);
      total += fallback;
    }
  }
  return total;
}

/**
 * What this player adds to MY optimal lineup. One function produces every behavior
 * a pile of hand-written positional rules would try to encode: the 4th RB scores
 * low automatically because he only displaces a flex, and an empty TE slot scores
 * high because it is currently charged at replacement.
 */
export function starterGain(player, roster, slots, replPts) {
  const before = optimalLineupPoints(roster, slots, replPts);
  const after = optimalLineupPoints(roster.concat([player]), slots, replPts);
  return after - before;
}

// ------------------------------------------------------------------- tiers

/**
 * Gap-based tiering on projected points within a position. Deterministic, which
 * matters for a draft tool -- an EM/GMM approach gives different tiers run to run.
 * The threshold adapts over a rolling window so it does not over-cut once the
 * curve flattens out.
 */
export function computeTiers(sortedPosPlayers, windowSize = 15) {
  const tiers = [];
  let tier = 1;
  const gaps = [];
  for (let i = 0; i < sortedPosPlayers.length - 1; i++) {
    const a = sortedPosPlayers[i].proj;
    const b = sortedPosPlayers[i + 1].proj;
    gaps.push(a != null && b != null ? a - b : 0);
  }

  let sizeInTier = 0;
  for (let i = 0; i < sortedPosPlayers.length; i++) {
    tiers.push(tier);
    sizeInTier += 1;
    const lo = Math.max(0, i - windowSize);
    const hi = Math.min(gaps.length, i + windowSize);
    const win = gaps.slice(lo, hi);
    if (!win.length) continue;
    const mean = win.reduce((a, b) => a + b, 0) / win.length;
    const sd = Math.sqrt(win.reduce((a, b) => a + (b - mean) * (b - mean), 0) / win.length);
    const gap = gaps[i];
    if (gap != null && sizeInTier >= 2 && (gap > mean + sd || sizeInTier >= 8)) {
      tier += 1;
      sizeInTier = 0;
    }
  }
  return tiers;
}

// ----------------------------------------------------------- run detection

/**
 * Positional run intensity as a Poisson z-score. No published formula for this
 * exists, so it is built from first principles: compare observed picks at a
 * position in the last window against the number ADP says to expect.
 *
 * A run only matters if a cliff follows it. A run with a flat tier behind it means
 * the room is clearing worthless players and you should let them.
 */
export function detectRuns(recentPicks, availableByPos, windowStart, windowEnd, leagueSize) {
  const out = {};
  const M = windowEnd - windowStart;
  if (M <= 0) return out;

  for (const pos of ['QB', 'RB', 'WR', 'TE', 'DST', 'K']) {
    let lambda = 0;
    for (const p of availableByPos[pos] || []) {
      const sigma = adpSigma(p.adp, p.adpStdev);
      const adp = p.adp != null ? p.adp : 500;
      lambda += normalCdf((windowEnd - adp) / sigma) - normalCdf((windowStart - adp) / sigma);
    }
    let observed = 0;
    for (const pick of recentPicks) {
      if (pick.pos === pos) {
        const d = windowEnd - (pick.overallPickNumber || windowEnd);
        observed += Math.exp(-d / leagueSize); // recency weight
      }
    }
    const z = (observed - lambda) / Math.sqrt(Math.max(lambda, 1));
    out[pos] = { observed: Math.round(observed * 10) / 10, expected: Math.round(lambda * 10) / 10, z: z };
  }
  return out;
}

// ------------------------------------------------- market price curve (Vhat)

/**
 * Expected value at a given ADP, fit as V = c*ln(ADP) + k by least squares.
 * "Underpriced" means beating this curve, which is a different question from
 * "highest value", and is what makes the value recommendation distinct.
 */
export function fitMarketCurve(rows) {
  const pts = rows.filter((r) => r.adp != null && r.adp > 0 && r.v != null);
  if (pts.length < 5) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of pts) {
    const x = Math.log(p.adp);
    sx += x; sy += p.v; sxx += x * x; sxy += x * p.v;
  }
  const n = pts.length;
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const c = (n * sxy - sx * sy) / denom;
  const k = (sy - c * sx) / n;
  return { c: c, k: k, predict: (adp) => c * Math.log(Math.max(adp, 1)) + k };
}
