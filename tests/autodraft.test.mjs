import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slotForPick, slotMapFromPicks, eligiblePositions, bestAvailableFor,
  detectAutodrafters, projectSurvival, analyzeAutodraft,
} from '../src/autodraft.js';
import { snakePick, readSlots, recommend } from '../src/recommender.js';

// Ranks are dense 1..20 so "top eligible" is unambiguous in every assertion below.
const POOL = [
  [1, 'RB'], [2, 'WR'], [3, 'RB'], [4, 'WR'], [5, 'QB'],
  [6, 'WR'], [7, 'RB'], [8, 'QB'], [9, 'TE'], [10, 'WR'],
  [11, 'RB'], [12, 'WR'], [13, 'RB'], [14, 'WR'], [15, 'QB'],
  [16, 'TE'], [17, 'RB'], [18, 'WR'], [19, 'RB'], [20, 'WR'],
];
const players = Object.fromEntries(POOL.map(([rank, pos]) => [
  String(rank),
  { id: rank, name: 'P' + rank + ' ' + pos, pos, rank, adp: rank, proj: 300 - rank * 5 },
]));

const slots = readSlots({ 0: 1, 2: 2, 4: 2, 23: 1, 20: 5 });
const TEAMS = 4;

// 4-team snake. Team 101 sits in slot 1 and is autodrafted; 102/103/104 are humans
// deliberately drafting off ESPN's ranked list.
//   101 -> picks 1, 8, 9, 16     102 -> 2, 7, 10, 15
//   103 -> 3, 6, 11, 14          104 -> 4, 5, 12, 13
const PICKS = [
  [1, 101, 1], [2, 102, 5], [3, 103, 9], [4, 104, 12],
  [5, 104, 14], [6, 103, 16], [7, 102, 18], [8, 101, 2],
  [9, 101, 3], [10, 102, 20], [11, 103, 19], [12, 104, 17],
  [13, 104, 15], [14, 103, 13], [15, 102, 11], [16, 101, 4],
].map(([overallPickNumber, teamId, playerId]) => ({ overallPickNumber, teamId, playerId }));

test('slotForPick inverts snakePick in both odd and even rounds', () => {
  for (let round = 1; round <= 5; round++) {
    for (let slot = 1; slot <= TEAMS; slot++) {
      assert.equal(slotForPick(snakePick(slot, round, TEAMS), TEAMS), slot,
        'round ' + round + ' slot ' + slot);
    }
  }
  assert.equal(slotForPick(0, TEAMS), null);
  assert.equal(slotForPick(5, 1), null);
});

test('slot map is derived from any round, not just the first', () => {
  const laterRoundsOnly = PICKS.filter((p) => p.overallPickNumber > TEAMS);
  const { map, conflicts } = slotMapFromPicks(laterRoundsOnly, TEAMS);
  assert.deepEqual(map, { 1: 101, 2: 102, 3: 103, 4: 104 });
  assert.deepEqual(conflicts, []);
});

test('slot map records a disagreement instead of overwriting it', () => {
  const { map, conflicts } = slotMapFromPicks([
    { overallPickNumber: 1, teamId: 101, playerId: 1 },
    { overallPickNumber: 8, teamId: 999, playerId: 2 },
  ], TEAMS);
  assert.equal(map[1], 101);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].saw, 999);
});

test('a filled starting slot removes that position from the ranked list', () => {
  // The whole point of the module: ESPN does not walk the OVERALL list.
  const full = { QB: 1, RB: 2, WR: 2, TE: 0, DST: 0, K: 0 };
  assert.deepEqual(eligiblePositions(full, slots), ['RB', 'WR', 'TE'],
    'QB starter is filled, so no more quarterbacks');

  const available = [players['5'], players['9']]; // rank 5 QB, rank 9 TE
  const chosen = bestAvailableFor(full, slots, available);
  assert.equal(chosen.id, 9, 'the rank-9 TE is taken over the rank-5 QB');
});

test('once every starter is filled the bench opens, minus K and DST', () => {
  const done = { QB: 1, RB: 2, WR: 2, TE: 1, DST: 0, K: 0 };
  assert.deepEqual(eligiblePositions(done, slots), ['QB', 'RB', 'WR', 'TE']);
});

test('bestAvailableFor returns null when nothing available carries a rank', () => {
  assert.equal(bestAvailableFor({}, slots, [{ id: 99, pos: 'RB', rank: null }]), null);
});

test('a team taking the top eligible player every time is detected', () => {
  const result = detectAutodrafters({ picks: PICKS, players, slots, teams: TEAMS });
  const auto = result.byTeam['101'];
  assert.equal(auto.matches, 4);
  assert.equal(auto.streak, 4);
  assert.equal(auto.confidence, 'high');
  assert.deepEqual(result.autodrafting, [101]);
});

test('humans drafting off the ranked list are not flagged', () => {
  const result = detectAutodrafters({ picks: PICKS, players, slots, teams: TEAMS });
  for (const id of ['102', '103', '104']) {
    assert.equal(result.byTeam[id].autodrafting, false, 'team ' + id);
    assert.equal(result.byTeam[id].streak, 0, 'team ' + id);
  }
});

test('the streak is trailing, so a manager who takes over stops being projected', () => {
  const takenOver = PICKS.concat([{ overallPickNumber: 17, teamId: 101, playerId: 10 }]);
  const result = detectAutodrafters({ picks: takenOver, players, slots, teams: TEAMS });
  assert.equal(result.byTeam['101'].matches, 4, 'the earlier matches still happened');
  assert.equal(result.byTeam['101'].streak, 0, 'but the current run is broken');
  assert.equal(result.byTeam['101'].autodrafting, false);
});

test('unattributed picks leave the pool without inventing a team', () => {
  const result = detectAutodrafters({
    picks: [{ overallPickNumber: 1, teamId: null, playerId: 1 }],
    players, slots, teams: TEAMS,
  });
  assert.deepEqual(Object.keys(result.byTeam), []);
  assert.equal(result.attributedPicks, 0);
  assert.deepEqual(result.draftedPlayerIds, ['1']);
});

test('keepers are not evidence of anything', () => {
  const withKeeper = [
    { overallPickNumber: 1, teamId: 101, playerId: 1, keeper: true },
    ...PICKS.slice(1),
  ];
  const result = detectAutodrafters({ picks: withKeeper, players, slots, teams: TEAMS });
  assert.equal(result.byTeam['101'].matches, 3, 'the keeper is skipped, not counted');
  assert.equal(result.byTeam['101'].picks, 4, 'it is still one of the team\'s picks');
});

test('projection names the exact players an autodrafter will take', () => {
  const detection = detectAutodrafters({ picks: PICKS, players, slots, teams: TEAMS });
  const { map } = slotMapFromPicks(PICKS, TEAMS);
  // Pick 17 belongs to slot 1 (team 101). Its roster is RB/WR/RB/WR, so the flex is the
  // only starting slot left open besides QB -- rank 6 WR is the top eligible.
  const survival = projectSurvival({
    players, slots, teams: TEAMS, fromPick: 16, toPick: 18,
    autodrafters: [101], slotMap: map,
    countsByTeam: detection.countsByTeam, draftedPlayerIds: detection.draftedPlayerIds,
  });
  assert.equal(survival.projected.length, 1);
  assert.equal(survival.projected[0].overallPickNumber, 17);
  assert.equal(survival.projected[0].playerId, 6);
  assert.deepEqual(survival.doomedPlayerIds, ['6']);
  assert.equal(survival.unknownPicks, 0);
});

test('picks by teams that are not autodrafting are counted as unknown, never guessed', () => {
  const { map } = slotMapFromPicks(PICKS, TEAMS);
  const survival = projectSurvival({
    players, slots, teams: TEAMS, fromPick: 16, toPick: 20,
    autodrafters: [101], slotMap: map, countsByTeam: {}, draftedPlayerIds: [],
  });
  assert.equal(survival.coveredPicks, 3, 'picks 17, 18, 19');
  assert.equal(survival.unknownPicks, 2, 'slots 2 and 3 are human and stay unpredicted');
});

test('a projection window with no intervening picks projects nothing', () => {
  const survival = projectSurvival({
    players, slots, teams: TEAMS, fromPick: 16, toPick: 17,
    autodrafters: [101], slotMap: { 1: 101 },
  });
  assert.deepEqual(survival.projected, []);
});

test('medium confidence is surfaced but never used to declare a player gone', () => {
  // Three matching picks is a reasonable suspicion and a bad basis for telling
  // someone a player is unavailable.
  const prefix = PICKS.filter((p) => p.overallPickNumber <= 9);
  const analysis = analyzeAutodraft({
    picks: prefix, players, slots, teams: TEAMS, currentPick: 9, nextPick: 16,
  });
  assert.equal(analysis.teams.length, 1);
  assert.equal(analysis.teams[0].teamId, 101);
  assert.equal(analysis.teams[0].confidence, 'medium');
  assert.deepEqual(analysis.projectedFor, []);
  assert.deepEqual(analysis.doomedPlayerIds, []);
});

test('recommend marks a projected autodraft pick as gone, with the reason', () => {
  const result = recommend({
    players, picks: PICKS, currentPick: 16, slots, teams: TEAMS,
    mySlot: 2, myTeamId: 102, scoringValidated: true, experts: {}, byeWeeks: {},
  });
  assert.equal(result.nextPick, 18);
  assert.deepEqual(result.autodraft.projectedFor, [101]);
  assert.deepEqual(result.autodraft.doomedPlayerIds, ['6']);

  const doomed = result.recommendations.find((r) => r.id === 6);
  assert.ok(doomed, 'the doomed player is in the shortlist, so the warning is visible');
  assert.equal(doomed.lastsToNextTurn, false);
  assert.match(doomed.why, /team 101 is autodrafting/);
  assert.equal(doomed.takenByAutodraft.overallPickNumber, 17);
});

test('autodraft detection can be switched off without changing anything else', () => {
  const base = { players, picks: PICKS, currentPick: 16, slots, teams: TEAMS,
    mySlot: 2, myTeamId: 102, scoringValidated: true, experts: {}, byeWeeks: {} };
  const off = recommend({ ...base, autodraftDetection: false });
  assert.equal(off.autodraft, null);
  const row = off.recommendations.find((r) => r.id === 6);
  assert.ok(row);
  assert.equal(row.takenByAutodraft, null);
  // The ADP heuristic reaches the same verdict for this player by coincidence
  // (adp 6 < next pick 18), so the distinction to assert is the stated REASON.
  assert.doesNotMatch(row.why, /autodrafting/);
  assert.match(row.why, /unlikely to last to pick 18/);
});
