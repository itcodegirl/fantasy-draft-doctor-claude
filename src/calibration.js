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

/**
 * Score the model against the ADP-only baseline.
 *
 * `skill` is 1 - brier/baseline: positive means the need conditioning earned its place,
 * negative means it did not. Reporting it is the point. An empty log returns n: 0 and NO
 * score, because a Brier of 0.0 reads as a perfect forecaster.
 */
export function brierReport(log, { minCoverage = 1 } = {}) {
  const forecasts = (log && log.forecasts ? log.forecasts : [])
    .filter((f) => f.settled && (f.coverage == null || f.coverage >= minCoverage));
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
  const modelBrier = brier(model);
  const marketBrier = brier(market);
  const rate = model.length ? model.reduce((a, [, o]) => a + o, 0) / model.length : null;
  return {
    n: model.length,
    scoredPicks: forecasts.length,
    brier: modelBrier,
    baselineBrier: marketBrier,
    climatologyBrier: rate == null ? null : brier(model.map(([, o]) => [rate, o])),
    skill: (modelBrier == null || !marketBrier) ? null : 1 - (modelBrier / marketBrier),
    excluded: (log && log.forecasts ? log.forecasts : [])
      .filter((f) => f.settled && f.coverage != null && f.coverage < minCoverage).length,
  };
}
