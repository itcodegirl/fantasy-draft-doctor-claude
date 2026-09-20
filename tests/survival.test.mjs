import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  erf, normalCdf, normalPdf, gaussianHazard, adpSigma,
  needMultipliers, survivalProbabilities, FILLED_WEIGHT, EPSILON,
} from '../src/survival.js';
import { starterDemand, eligiblePositions, POSITIONS, FLEX_POSITIONS } from '../src/autodraft.js';
import { readSlots } from '../src/recommender.js';

const slots = readSlots({ 0: 1, 2: 2, 4: 2, 6: 1, 16: 1, 17: 1, 23: 1, 20: 7 });
const TEAMS = 12;
const POS = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

const players = {};
for (let i = 1; i <= 120; i++) {
  players[String(i)] = { id: i, name: 'P' + i, pos: POS[i % 6], rank: i, adp: i, proj: 300 - i };
}
const slotMap = {};
for (let s = 1; s <= TEAMS; s++) slotMap[s] = 100 + s;
const draftedThrough = (n) => Array.from({ length: n }, (_, i) => String(i + 1));
const everyTeam = (counts) => Object.fromEntries(
  Array.from({ length: TEAMS }, (_, i) => [String(101 + i), { ...counts }]),
);
const OPEN = { QB: 0, RB: 0, WR: 0, TE: 0, DST: 0, K: 0 };
const RB_SATURATED = { QB: 1, RB: 3, WR: 0, TE: 1, DST: 1, K: 1 };
const ALL_FULL = { QB: 1, RB: 3, WR: 2, TE: 1, DST: 1, K: 1 };

const base = {
  players, slots, teams: TEAMS, currentPick: 40, nextPick: 63, slotMap,
  draftedPlayerIds: draftedThrough(40), attributedPicks: 40, totalPicks: 40,
};

// -------------------------------------------------------------------- gaussian

test('the hazard rises monotonically across the whole range', () => {
  let previous = -Infinity;
  for (let z = -4; z <= 8; z += 0.25) {
    const h = gaussianHazard(z);
    assert.ok(h > previous, 'hazard fell at z=' + z);
    previous = h;
  }
});

test('the Mills tail branch agrees with the direct ratio where they meet', () => {
  const direct = normalPdf(4) / (1 - normalCdf(4));
  const relative = Math.abs(gaussianHazard(4) - direct) / direct;
  assert.ok(relative < 0.01, 'branches disagree by ' + (relative * 100).toFixed(2) + '%');
});

test('a faller has a far larger hazard than a player at his ADP', () => {
  // The defect this module exists to fix: a player whose ADP was 20 and who is somehow
  // still available at pick 40 is the most likely next pick, not the least.
  const atAdp = gaussianHazard(0);
  const faller = gaussianHazard((40 - 20) / adpSigma(20));
  assert.ok(faller > atAdp * 3, 'faller hazard ' + faller + ' vs at-ADP ' + atAdp);
});

test('erf and normalCdf match known values', () => {
  assert.ok(Math.abs(erf(0)) < 1e-9);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-9);
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
});

test('adpSigma is floored, rises with ADP, and honours an observed spread', () => {
  assert.equal(adpSigma(0), 1);
  assert.ok(adpSigma(100) > adpSigma(10));
  assert.equal(adpSigma(100, 4.2), 4.2);
});

// ------------------------------------------------------------------------ need

test('starterDemand and eligiblePositions never drift apart', () => {
  // Two need models disagreeing is the exact disease phase3-wip carries. This is the guard.
  for (let qb = 0; qb <= 2; qb++) {
    for (let rb = 0; rb <= 4; rb++) {
      for (let wr = 0; wr <= 4; wr++) {
        for (let te = 0; te <= 2; te++) {
          const counts = { QB: qb, RB: rb, WR: wr, TE: te, DST: 0, K: 0 };
          const demand = starterDemand(counts, slots);
          const eligible = eligiblePositions(counts, slots);
          const wanted = POSITIONS.filter((pos) => demand[pos] > 0
            || (FLEX_POSITIONS.indexOf(pos) !== -1 && demand.FLEX > 0));
          if (wanted.length) {
            assert.deepEqual(eligible, wanted, JSON.stringify(counts));
          } else {
            assert.deepEqual(eligible, ['QB', 'RB', 'WR', 'TE'], JSON.stringify(counts));
          }
        }
      }
    }
  }
});

test('an unfilled position outranks a filled one, and nothing is ever zeroed', () => {
  const m = needMultipliers(RB_SATURATED, slots);
  assert.ok(m.WR > m.RB, 'WR ' + m.WR + ' should beat saturated RB ' + m.RB);
  assert.equal(m.RB, FILLED_WEIGHT, 'a saturated position sits on the floor');
  for (const pos of POSITIONS) assert.ok(m[pos] > 0, pos + ' was zeroed');
});

test('an open FLEX keeps a third RB live even with both RB starters filled', () => {
  // "Two RBs and zero WRs is not taking a third RB" is too strong: with the flex open,
  // a third RB is a legitimate flex play, and the model says so.
  const m = needMultipliers({ RB: 2, WR: 0, QB: 0, TE: 0, DST: 0, K: 0 }, slots);
  assert.ok(m.RB > FILLED_WEIGHT, 'RB should not be on the floor while the flex is open');
  assert.ok(m.WR > m.RB, 'the wide-open WR slot still outranks it');
});

// -------------------------------------------------------------------- survival

test('exactly one player is consumed per modelled pick', () => {
  const r = survivalProbabilities({ ...base, countsByTeam: everyTeam(OPEN) });
  assert.equal(r.modelledPicks, 22);
  assert.ok(Math.abs(r.takenMass - 22) < 1e-6, 'takenMass was ' + r.takenMass);
});

test('no probability is ever exactly 0 or exactly 1', () => {
  const r = survivalProbabilities({ ...base, countsByTeam: everyTeam(OPEN) });
  const values = Object.values(r.byPlayerId);
  assert.ok(values.length > 20);
  for (const p of values) {
    assert.ok(p >= EPSILON && p <= 1 - EPSILON, 'probability escaped the clamp: ' + p);
  }
});

test('a roster with every starter filled is byte-identical to the ADP-only model', () => {
  // A uniform multiplier cancels in normalisation. This falls out of the design rather
  // than being special-cased, so it is worth pinning down.
  const conditioned = survivalProbabilities({ ...base, countsByTeam: everyTeam(ALL_FULL) });
  const market = survivalProbabilities({ ...base, countsByTeam: everyTeam(ALL_FULL), conditioning: false });
  for (const id of Object.keys(market.byPlayerId)) {
    assert.equal(conditioned.byPlayerId[id], market.byPlayerId[id], 'player ' + id);
  }
  assert.equal(conditioned.conditioningStrength, 0);
  assert.ok(conditioned.assumptions.some((a) => /ADP-only forecast/.test(a)));
});

test('need conditioning moves survival in the direction the roster state implies', () => {
  // The core assertion of the whole feature.
  const market = survivalProbabilities({ ...base, countsByTeam: everyTeam(OPEN), conditioning: false });
  const conditioned = survivalProbabilities({ ...base, countsByTeam: everyTeam(RB_SATURATED) });
  // Compare where the numbers can actually move. A player one pick into the window is
  // pinned at the clamp floor under every model, so measuring there proves nothing.
  const movable = (pos) => String(Object.keys(market.byPlayerId).map(Number).sort((a, b) => a - b)
    .find((id) => players[String(id)].pos === pos
      && market.byPlayerId[String(id)] > 0.1 && market.byPlayerId[String(id)] < 0.9));
  const rbId = movable('RB');
  const wrId = movable('WR');
  assert.ok(rbId !== 'undefined' && wrId !== 'undefined', 'fixture has no movable players');
  assert.ok(conditioned.byPlayerId[rbId] > market.byPlayerId[rbId] + 0.02,
    'RBs should last longer when every opponent is RB-saturated: '
    + market.byPlayerId[rbId] + ' -> ' + conditioned.byPlayerId[rbId]);
  assert.ok(conditioned.byPlayerId[wrId] < market.byPlayerId[wrId] - 0.02,
    'WRs should go sooner, because that is where the demand went: '
    + market.byPlayerId[wrId] + ' -> ' + conditioned.byPlayerId[wrId]);
});

test('soft, not hard: a saturated position still gets taken', () => {
  const r = survivalProbabilities({ ...base, countsByTeam: everyTeam(RB_SATURATED) });
  const rbId = String(Object.keys(r.byPlayerId).map(Number).sort((a, b) => a - b)
    .find((id) => players[String(id)].pos === 'RB' && r.byPlayerId[String(id)] > 0.1));
  assert.ok(r.byPlayerId[rbId] < 0.99,
    'the best RB survived with p=' + r.byPlayerId[rbId] + '; one BPA manager must remain possible');
});

test('a longer window depletes strictly more than a short one', () => {
  const short = survivalProbabilities({ ...base, nextPick: 43, countsByTeam: everyTeam(OPEN) });
  const long = survivalProbabilities({ ...base, nextPick: 63, countsByTeam: everyTeam(OPEN) });
  const id = String(Object.keys(long.byPlayerId).map(Number).sort((a, b) => a - b)[3]);
  assert.ok(long.byPlayerId[id] < short.byPlayerId[id]);
  assert.ok(Math.abs(short.takenMass - 2) < 1e-6);
});

test('an autodraft pick is pinned out of the window, not modelled inside it', () => {
  const projected = [{ overallPickNumber: 41, teamId: 101, playerId: 43, name: 'P43', pos: 'RB' }];
  const r = survivalProbabilities({ ...base, countsByTeam: everyTeam(OPEN), projected });
  assert.equal(r.pinnedPicks, 1);
  assert.equal(r.modelledPicks, 21);
  assert.equal(r.byPlayerId['43'], undefined, 'a pinned player carries no probability');
  assert.ok(Math.abs(r.takenMass - 21) < 1e-6, 'the identity still holds over the shrunken window');
});

test('with nothing attributable the model degrades exactly to ADP-only', () => {
  const market = survivalProbabilities({ ...base, countsByTeam: {}, conditioning: false });
  const degraded = survivalProbabilities({
    ...base, countsByTeam: everyTeam(RB_SATURATED), attributedPicks: 0, totalPicks: 40,
  });
  for (const id of Object.keys(market.byPlayerId)) {
    assert.equal(degraded.byPlayerId[id], market.byPlayerId[id], 'player ' + id);
  }
  assert.equal(degraded.attributionRate, 0);
});

test('a conflicted slot disables conditioning for that pick only', () => {
  const r = survivalProbabilities({
    ...base, countsByTeam: everyTeam(RB_SATURATED),
    slotMapConflicts: [{ slot: 3, had: 103, saw: 999, pick: 27 }],
  });
  assert.equal(r.unconditionedPicks, 2, 'slot 3 owns two picks in a 22-pick window');
  assert.equal(r.conditionedPicks, 20);
  assert.equal(r.basis, 'need-conditioned', 'one bad slot must not disable the feature');
});

test('rank is never substituted for a missing ADP', () => {
  const withoutAdp = { ...players, 41: { id: 41, name: 'NoAdp', pos: 'RB', rank: 41, adp: null } };
  const a = survivalProbabilities({ ...base, players: withoutAdp, countsByTeam: everyTeam(OPEN) });
  assert.ok(a.noAdpPlayerIds.includes('41'));
  assert.equal(a.byPlayerId['41'], undefined);
  assert.ok(a.assumptions.some((s) => /never substituted for ADP/.test(s)));

  const shifted = { ...withoutAdp, 41: { id: 41, name: 'NoAdp', pos: 'RB', rank: 999, adp: null } };
  const b = survivalProbabilities({ ...base, players: shifted, countsByTeam: everyTeam(OPEN) });
  assert.deepEqual(b.byPlayerId, a.byPlayerId, 'changing rank alone changed a survival number');
});

test('the result does not depend on the order players arrive in', () => {
  const forward = survivalProbabilities({ ...base, countsByTeam: everyTeam(RB_SATURATED) });
  const reversedPool = Object.fromEntries(Object.entries(players).reverse());
  const reversed = survivalProbabilities({
    ...base, players: reversedPool, countsByTeam: everyTeam(RB_SATURATED),
  });
  assert.deepEqual(reversed.byPlayerId, forward.byPlayerId);
});

test('a window with no picks in it reports nothing rather than guessing', () => {
  const r = survivalProbabilities({ ...base, nextPick: 41, countsByTeam: everyTeam(OPEN) });
  assert.equal(r.basis, 'none');
  assert.deepEqual(r.byPlayerId, {});
});
