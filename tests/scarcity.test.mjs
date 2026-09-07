import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  takenCountDistribution, exhaustionProbability, expectedBestValue,
  computeTiers, analyzeScarcity,
} from '../src/scarcity.js';
import { EPSILON } from '../src/survival.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, a + ' !== ' + b);

// Three candidates, one pick. Hand-computable throughout.
//   P(N = 1) = .5*.7*.8 + .5*.3*.8 + .5*.7*.2 = .28 + .12 + .07 = .47
const TAKE = [0.5, 0.3, 0.2];
const K = 1;
const DENOM = 0.47;

test('the count distribution matches a hand-computed Poisson-binomial', () => {
  const dp = takenCountDistribution([0.5, 0.5], 2);
  close(dp[0], 0.25);
  close(dp[1], 0.5);
  close(dp[2], 0.25);
  close(takenCountDistribution(TAKE, 3)[1], DENOM);
});

test('skipping a member equals never passing it', () => {
  const skipped = takenCountDistribution(TAKE, 3, new Set([0]));
  const omitted = takenCountDistribution([0.3, 0.2], 3);
  for (let c = 0; c < 3; c++) close(skipped[c], omitted[c]);
});

test('conditioning on the window size is what carries the correlation', () => {
  // P(player 0 taken | exactly one taken) = .28 / .47, NOT the unconditional .5.
  close(exhaustionProbability(TAKE, [0], K, DENOM), 0.28 / 0.47, 1e-12);
});

test('a set bigger than the window can never be exhausted', () => {
  assert.equal(exhaustionProbability(TAKE, [0, 1], K, DENOM), 0);
  assert.equal(exhaustionProbability(TAKE, [], K, DENOM), 0);
});

test('exhaustion falls as the set grows', () => {
  const take = new Array(20).fill(0.5);
  const total = 10;
  const denom = takenCountDistribution(take, total)[total];
  let previous = 1;
  for (let m = 1; m <= 5; m++) {
    const p = exhaustionProbability(take, [...Array(m).keys()], total, denom);
    assert.ok(p < previous, 'exhaustion rose when the set grew to ' + m);
    previous = p;
  }
});

test('a tier is never reported as certainly gone', () => {
  // A player the model has effectively written off still cannot make the panel say 100%.
  const take = [1, 0.5, 0.5];
  const total = 2;
  const denom = takenCountDistribution(take, total)[total];
  const p = exhaustionProbability(take, [0], total, denom);
  assert.ok(p <= 1 - EPSILON, 'reported ' + p);
});

test('expected best value matches the layer-cake sum by hand', () => {
  // survives(top1) = 1 - .28/.47 = .404255...; the pair cannot both go in one pick, so
  // the bottom layer is certain.
  const ranked = [{ index: 0, value: 10 }, { index: 1, value: 6 }];
  const { expected, allGone } = expectedBestValue(TAKE, ranked, K, DENOM);
  const survivesTop = 1 - (0.28 / 0.47);
  close(expected, 4 * survivesTop + 6, 1e-9);
  close(allGone, 0, 1e-12);
});

test('the expected best is never better than the best available now', () => {
  // VONA cannot be negative: waiting cannot improve the best player on the board.
  const take = new Array(12).fill(0.4);
  const total = 5;
  const denom = takenCountDistribution(take, total)[total];
  const ranked = take.map((_, i) => ({ index: i, value: 100 - i * 7 }));
  const { expected } = expectedBestValue(take, ranked, total, denom);
  assert.ok(expected <= ranked[0].value + 1e-9, expected + ' > ' + ranked[0].value);
  assert.ok(expected > 0);
});

test('tiers cut at a real gap and cap their own size', () => {
  const flat = Array.from({ length: 20 }, (_, i) => ({ id: i, proj: 100 - i }));
  const cliff = [
    { id: 'a', proj: 100 }, { id: 'b', proj: 99 }, { id: 'c', proj: 98 },
    { id: 'd', proj: 60 }, { id: 'e', proj: 59 }, { id: 'f', proj: 58 },
  ];
  assert.deepEqual(computeTiers(cliff, 3), [1, 1, 1, 2, 2, 2], 'the 38-point drop is a tier break');
  const tiers = computeTiers(flat, 15);
  assert.ok(Math.max(...tiers) > 1, 'a perfectly flat curve still caps tier size');
  assert.deepEqual(computeTiers(flat, 15), tiers, 'tiering is deterministic');
});

test('scarcity reports nothing when survival has nothing to say', () => {
  assert.deepEqual(analyzeScarcity({ players: {}, survival: null }).vona, []);
  assert.deepEqual(analyzeScarcity({ players: {}, survival: { candidateIds: [] } }).tiers, []);
});

test('players the survival model could not price are left out, not guessed', () => {
  const players = {
    1: { id: 1, name: 'Priced', pos: 'RB', proj: 100, adp: 5 },
    2: { id: 2, name: 'Unpriced', pos: 'RB', proj: 99, adp: null },
  };
  const survival = {
    candidateIds: ['1'], byPlayerId: { 1: 0.4 }, takenMass: 1, modelledPicks: 1,
  };
  const r = analyzeScarcity({ players, survival });
  const rb = r.vona.find((v) => v.pos === 'RB');
  assert.equal(rb.depth, 1, 'the unpriced player is not in the VONA list');
  assert.equal(rb.bestNowId, 1);
  for (const t of r.tiers) assert.ok(!t.players.includes('Unpriced'));
});

test('positions are ranked by what waiting costs, tiers by how endangered they are', () => {
  const players = {};
  let id = 1;
  // RBs fall off a cliff after the first; WRs are flat, so waiting costs less.
  for (const proj of [100, 40, 39, 38]) players[id] = { id: id++, name: 'RB' + id, pos: 'RB', proj, adp: id };
  for (const proj of [90, 88, 86, 84]) players[id] = { id: id++, name: 'WR' + id, pos: 'WR', proj, adp: id };
  const ids = Object.keys(players);
  const survival = {
    candidateIds: ids,
    byPlayerId: Object.fromEntries(ids.map((k) => [k, 0.5])),
    takenMass: 4, modelledPicks: 4,
  };
  const r = analyzeScarcity({ players, survival });
  assert.equal(r.vona[0].pos, 'RB', 'the cliff position should top the list');
  for (let i = 1; i < r.tiers.length; i++) {
    assert.ok(r.tiers[i - 1].exhaustion >= r.tiers[i].exhaustion, 'tiers are not sorted');
  }
});
