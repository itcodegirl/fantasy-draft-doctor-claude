/**
 * Calibration harness for the survival model.
 *
 * Pure module: no chrome.* APIs, no DOM, no network, no clock of its own.
 *
 * The survival model asserts that conditioning on opponent roster state beats
 * league-average ADP. That is a hypothesis, not a premise, and there is no historical
 * draft data in this repository to settle it. So the model ships with the thing that can
 * settle it: at each of your turns it writes down what it predicted, and once the picks
 * arrive it scores itself.
 *
 * TWO predictions are stored per player, not one. A lone Brier score says nothing about
 * whether the need model beat ADP -- only the SKILL SCORE against the ADP-only baseline
 * does, and that requires both numbers captured at the same moment from the same board.
 *
 * FIRST FORECAST WINS. Re-rendering the panel must not overwrite a prediction with a
 * later, better-informed one; that would score the model on information it did not have
 * when you would actually have acted. Same rule as first-attribution-wins in autodraft.js.
 */

export const FORECAST_VERSION = 1;

/** Players per forecast. Wide enough to score, narrow enough to stay in storage. */
export const FORECAST_WIDTH = 25;

/** Forecasts retained. Older SETTLED ones are dropped first; unsettled are never dropped. */
export const MAX_FORECASTS = 40;

export function createLog() {
  return { version: FORECAST_VERSION, forecasts: [] };
}

/**
 * Which players get scored. Deliberately the lowest-ADP available players rather than the
 * recommender's own shortlist: scoring the recommender's picks would measure the
 * recommender, and the thing under test is the survival model.
 */
export function selectForecastPlayers(available, width = FORECAST_WIDTH) {
  return available
    .filter((p) => Number.isFinite(Number(p.adp)) && Number(p.adp) > 0)
    .sort((a, b) => (Number(a.adp) - Number(b.adp)) || (String(a.id) < String(b.id) ? -1 : 1))
    .slice(0, width);
}

export function openForecast({ atPick, targetPick, entries, basis, madeAt }) {
  return {
    atPick: Number(atPick),
    targetPick: Number(targetPick),
    basis: basis || null,
    madeAt: madeAt != null ? madeAt : null,
    entries: entries.map((e) => ({
      playerId: String(e.playerId),
      p: Number(e.p),
      pMarket: e.pMarket == null ? null : Number(e.pMarket),
    })),
    settled: false,
    coverage: null,
    outcomes: null,
  };
}

/** First forecast for a target pick wins; later ones are ignored, not merged. */
export function recordForecast(log, forecast) {
  const next = log && log.forecasts ? log : createLog();
  if (!forecast || !Number.isInteger(forecast.targetPick)) return next;
  if (next.forecasts.some((f) => f.targetPick === forecast.targetPick)) return next;
  next.forecasts = next.forecasts.concat([forecast]);
  if (next.forecasts.length > MAX_FORECASTS) {
    const settledIndex = next.forecasts.findIndex((f) => f.settled);
    if (settledIndex >= 0) next.forecasts.splice(settledIndex, 1);
  }
  return next;
}

/**
 * Resolve forecasts against what actually happened. Pure function of the pick list.
 *
 * A player taken AT the target pick counts as having survived -- he was there when your
 * turn came, which is the question that was asked.
 *
 * Settling waits for a board that covers every pick number in the window. A gap means
 * live-auto numbering has not reconciled yet, and scoring against a partial board would
 * mark surviving players as taken. Coverage is recorded so a still-gapped forecast can be
 * scored separately rather than silently mixed in.
 */
export function settleForecasts(log, picks = []) {
  const next = { version: FORECAST_VERSION, forecasts: (log && log.forecasts ? log.forecasts : []).slice() };
  const takenAt = new Map();
  const numbers = new Set();
  for (const pick of picks) {
    const n = Number(pick.overallPickNumber);
    if (!Number.isInteger(n)) continue;
    numbers.add(n);
    takenAt.set(String(pick.playerId), n);
  }
  let settled = 0;
  next.forecasts = next.forecasts.map((f) => {
    if (f.settled) return f;
    const window = [];
    for (let n = f.atPick + 1; n < f.targetPick; n++) window.push(n);
    if (!window.length) return f;
    const seen = window.filter((n) => numbers.has(n)).length;
    const highest = Math.max(...numbers, 0);
    if (highest < f.targetPick - 1) return f;
    settled++;
    return Object.assign({}, f, {
      settled: true,
      coverage: seen / window.length,
      outcomes: f.entries.map((e) => {
        const at = takenAt.get(e.playerId);
        return { playerId: e.playerId, survived: !(at != null && at < f.targetPick) ? 1 : 0 };
      }),
    });
  });
  return { log: next, settled };
}

function brier(pairs) {
  if (!pairs.length) return null;
  return pairs.reduce((sum, [p, o]) => sum + ((p - o) * (p - o)), 0) / pairs.length;
}

function skillOf(model, market) {
  if (model == null || !market) return null;
  return 1 - (model / market);
}

/** Ten equal buckets of predicted probability. */
const RELIABILITY_BUCKETS = 10;

/**
 * Predicted probability against observed frequency, in deciles.
 *
 * A Brier score alone cannot tell a well-calibrated model from a timid one -- never
 * leaving 0.5 scores respectably and says nothing. The reliability table is what answers
 * "when it says about 7 in 10, does that happen 70% of the time", and `resolution` (the
 * spread of observed rates across buckets) is what answers "does it discriminate at all".
 */
function reliabilityTable(pairs) {
  const buckets = Array.from({ length: RELIABILITY_BUCKETS }, (_, i) => ({
    bucket: i,
    from: i / RELIABILITY_BUCKETS,
    to: (i + 1) / RELIABILITY_BUCKETS,
    n: 0,
    predictedSum: 0,
    observedSum: 0,
  }));
  for (const [p, o] of pairs) {
    const i = Math.min(Math.floor(p * RELIABILITY_BUCKETS), RELIABILITY_BUCKETS - 1);
    buckets[i].n += 1;
    buckets[i].predictedSum += p;
    buckets[i].observedSum += o;
  }
  return buckets
    .filter((b) => b.n > 0)
    .map((b) => ({
      bucket: b.bucket,
      from: b.from,
      to: b.to,
      n: b.n,
      predicted: b.predictedSum / b.n,
      observed: b.observedSum / b.n,
    }));
}

function resolutionOf(table, baseRate) {
  if (baseRate == null || !table.length) return null;
  const total = table.reduce((a, b) => a + b.n, 0);
  if (!total) return null;
  return table.reduce((a, b) => a + (b.n / total) * ((b.observed - baseRate) ** 2), 0);
}

function pairsOf(forecasts) {
  const model = [];
  const market = [];
  for (const f of forecasts) {
    const outcome = new Map(f.outcomes.map((o) => [o.playerId, o.survived]));
    for (const e of f.entries) {
      const o = outcome.get(e.playerId);
      if (o == null) continue;
      model.push([e.p, o]);
      if (e.pMarket != null) market.push([e.pMarket, o]);
    }
  }
  return { model, market };
}

/**
 * Score the model against the ADP-only baseline.
 *
 * `skill` is 1 - brier/baseline: positive means the need conditioning earned its place,
 * negative means it did not. Reporting it is the point. An empty log returns n: 0 and NO
 * score, because a Brier of 0.0 reads as a perfect forecaster.
 *
 * `byRound` exists because the claim under test is specifically about the MIDDLE rounds.
 * Conditioning is near-inert early -- with every starting slot open the multipliers barely
 * separate -- so an aggregate dilutes exactly the signal being claimed. It needs the league
 * size to turn a pick number into a round; without `teams` the field is null rather than
 * guessed at.
 */
export function brierReport(log, { minCoverage = 1, teams = null } = {}) {
  const all = (log && log.forecasts ? log.forecasts : []);
  const forecasts = all.filter((f) => f.settled && (f.coverage == null || f.coverage >= minCoverage));
  const { model, market } = pairsOf(forecasts);

  const modelBrier = brier(model);
  const marketBrier = brier(market);
  const rate = model.length ? model.reduce((a, [, o]) => a + o, 0) / model.length : null;
  const reliability = reliabilityTable(model);

  const size = Number(teams);
  let byRound = null;
  if (Number.isInteger(size) && size >= 2) {
    const rounds = new Map();
    for (const f of forecasts) {
      const round = Math.ceil(Number(f.targetPick) / size);
      if (!Number.isInteger(round) || round < 1) continue;
      if (!rounds.has(round)) rounds.set(round, []);
      rounds.get(round).push(f);
    }
    byRound = Array.from(rounds.keys()).sort((a, b) => a - b).map((round) => {
      const slice = pairsOf(rounds.get(round));
      const m = brier(slice.model);
      const b = brier(slice.market);
      return { round, n: slice.model.length, brier: m, baselineBrier: b, skill: skillOf(m, b) };
    });
  }

  return {
    n: model.length,
    scoredPicks: forecasts.length,
    brier: modelBrier,
    baselineBrier: marketBrier,
    climatologyBrier: rate == null ? null : brier(model.map(([, o]) => [rate, o])),
    skill: skillOf(modelBrier, marketBrier),
    baseRate: rate,
    reliability,
    resolution: resolutionOf(reliability, rate),
    byRound,
    excluded: all.filter((f) => f.settled && f.coverage != null && f.coverage < minCoverage).length,
  };
}
