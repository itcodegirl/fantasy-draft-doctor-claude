import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLog, selectForecastPlayers, openForecast, recordForecast,
  settleForecasts, brierReport, FORECAST_WIDTH,
} from '../src/calibration.js';

const entries = (pairs) => pairs.map(([playerId, p, pMarket]) => ({ playerId, p, pMarket }));
const forecast = (over) => openForecast(Object.assign({
  atPick: 10, targetPick: 15, basis: 'need-conditioned', madeAt: 1000,
  entries: entries([['1', 0.9, 0.5], ['2', 0.2, 0.5]]),
}, over));
const picksThrough = (n, taken = {}) => Array.from({ length: n }, (_, i) => ({
  overallPickNumber: i + 1, playerId: taken[i + 1] != null ? taken[i + 1] : 'x' + (i + 1),
}));

test('forecast players are the lowest-ADP available, deterministically ordered', () => {
  const chosen = selectForecastPlayers([
    { id: 'b', adp: 12 }, { id: 'a', adp: 12 }, { id: 'c', adp: 4 }, { id: 'd', adp: null },
  ], 3);
  assert.deepEqual(chosen.map((p) => p.id), ['c', 'a', 'b'], 'ties break by id, no-ADP dropped');
});

test('the default width is respected', () => {
  const pool = Array.from({ length: 60 }, (_, i) => ({ id: String(i), adp: i + 1 }));
  assert.equal(selectForecastPlayers(pool).length, FORECAST_WIDTH);
});

test('the first forecast for a pick wins and later ones are ignored', () => {
  // Re-rendering must not rescore the model on information it did not have at the time.
  let log = recordForecast(createLog(), forecast({}));
  log = recordForecast(log, forecast({ entries: entries([['1', 0.01, 0.01]]) }));
  assert.equal(log.forecasts.length, 1);
  assert.equal(log.forecasts[0].entries.length, 2);
  assert.equal(log.forecasts[0].entries[0].p, 0.9);
});

test('a board that does not reach the target pick will not settle', () => {
  const log = recordForecast(createLog(), forecast({}));
  const { settled } = settleForecasts(log, picksThrough(12));
  assert.equal(settled, 0, 'settling early would mark surviving players as taken');
});

test('settling resolves survival, and a player taken AT the target pick survived', () => {
  const log = recordForecast(createLog(), forecast({}));
  // Player 2 goes at pick 12 (inside the window); player 1 goes at 15 (the target itself).
  const { log: next, settled } = settleForecasts(log, picksThrough(15, { 12: '2', 15: '1' }));
  assert.equal(settled, 1);
  const outcomes = Object.fromEntries(next.forecasts[0].outcomes.map((o) => [o.playerId, o.survived]));
  assert.equal(outcomes['2'], 0, 'taken inside the window');
  assert.equal(outcomes['1'], 1, 'taken at your turn, so he was there when you looked');
  assert.equal(next.forecasts[0].coverage, 1);
});

test('a gapped board settles with partial coverage and is excluded from the headline', () => {
  const log = recordForecast(createLog(), forecast({}));
  const gapped = picksThrough(15, { 12: '2' }).filter((p) => p.overallPickNumber !== 13);
  const { log: next } = settleForecasts(log, gapped);
  assert.ok(next.forecasts[0].coverage < 1);
  const report = brierReport(next);
  assert.equal(report.n, 0);
  assert.equal(report.excluded, 1);
  assert.equal(brierReport(next, { minCoverage: 0 }).n, 2, 'still scoreable when asked for');
});

test('a perfect forecaster scores 0 and a maximally wrong one scores 1', () => {
  const perfect = recordForecast(createLog(), forecast({ entries: entries([['1', 1, 0.5], ['2', 0, 0.5]]) }));
  const wrong = recordForecast(createLog(), forecast({ entries: entries([['1', 0, 0.5], ['2', 1, 0.5]]) }));
  const board = picksThrough(15, { 12: '2', 15: '1' });
  assert.equal(brierReport(settleForecasts(perfect, board).log).brier, 0);
  assert.equal(brierReport(settleForecasts(wrong, board).log).brier, 1);
});

test('skill is positive when the model beats ADP and negative when it loses', () => {
  const board = picksThrough(15, { 12: '2', 15: '1' });
  const better = recordForecast(createLog(), forecast({ entries: entries([['1', 0.9, 0.5], ['2', 0.1, 0.5]]) }));
  const worse = recordForecast(createLog(), forecast({ entries: entries([['1', 0.1, 0.5], ['2', 0.9, 0.5]]) }));
  assert.ok(brierReport(settleForecasts(better, board).log).skill > 0);
  assert.ok(brierReport(settleForecasts(worse, board).log).skill < 0);
});

test('an empty log reports no score rather than a perfect one', () => {
  const report = brierReport(createLog());
  assert.equal(report.n, 0);
  assert.equal(report.brier, null, 'a Brier of 0.0 would read as a flawless forecaster');
  assert.equal(report.skill, null);
});

test('skill is null when no ADP baseline was captured', () => {
  const log = recordForecast(createLog(), forecast({ entries: entries([['1', 0.9, null], ['2', 0.2, null]]) }));
  const report = brierReport(settleForecasts(log, picksThrough(15, { 12: '2', 15: '1' })).log);
  assert.ok(report.brier != null);
  assert.equal(report.skill, null, 'without the baseline there is no claim to make');
});

test('settled forecasts are dropped before unsettled ones when the log fills', () => {
  let log = createLog();
  for (let i = 0; i < 45; i++) {
    log = recordForecast(log, forecast({ atPick: i * 3, targetPick: i * 3 + 2 }));
    log = settleForecasts(log, picksThrough(i * 3 + 2)).log;
  }
  assert.ok(log.forecasts.length <= 40);
  assert.ok(log.forecasts.some((f) => !f.settled) || log.forecasts.every((f) => f.settled));
});
