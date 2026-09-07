import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, parseExpertCsv, readSlots, nextPickFor, inferDraftSlot } from '../src/recommender.js';

const players = {
  1: { id: 1, name: 'Alpha RB', pos: 'RB', proj: 100, adp: 8, byeWeek: 9 },
  2: { id: 2, name: 'Beta WR', pos: 'WR', proj: 96, adp: 12, byeWeek: 9 },
  3: { id: 3, name: 'Gamma WR', pos: 'WR', proj: 90, adp: 20, byeWeek: 7 },
  4: { id: 4, name: 'Delta QB', pos: 'QB', proj: 80, adp: 25, byeWeek: 10 },
};

const slots = readSlots({ 0: 1, 2: 2, 4: 2, 23: 1, 20: 5 });

test('recommendations use remaining players, roster needs, and next snake pick', () => {
  const result = recommend({
    players,
    picks: [{ overallPickNumber: 1, playerId: 1, teamId: 7 }],
    slots,
    teams: 12,
    mySlot: 1,
    myTeamId: 7,
    scoringValidated: true,
    experts: { 2: 2, 3: 10, 4: 1 },
    byeWeeks: {},
  });

  assert.equal(result.nextPick, 24);
  assert.equal(result.recommendations[0].id, 2, 'expert-ranked remaining WR fills the roster need');
  assert.equal(result.recommendations.some((r) => r.id === 1), false, 'drafted players are excluded');
});

test('bye-week conflicts affect the recommendation explanation and score', () => {
  const result = recommend({
    players,
    picks: [{ overallPickNumber: 1, playerId: 1, teamId: 7 }],
    slots,
    teams: 12,
    mySlot: 1,
    myTeamId: 7,
    scoringValidated: true,
    experts: {},
    byeWeeks: {},
  });

  const alpha = result.recommendations.find((r) => r.id === 2);
  assert.equal(alpha.byeConflicts, 1);
  assert.match(alpha.why, /bye conflict/);
});

test('recommendations stay gated until scoring is validated', () => {
  const result = recommend({ players, slots, teams: 12, mySlot: 1, myTeamId: 7 });
  assert.match(result.error, /scoring validation/);
});

test('expert CSV matches ids or names and imports optional bye weeks', () => {
  const parsed = parseExpertCsv(
    'name,rank,byeWeek\nBeta WR,2,9\nGamma WR,10,7\nUnknown,1,5\n',
    players,
  );
  assert.deepEqual(parsed.expertRanks, { 2: 2, 3: 10 });
  assert.deepEqual(parsed.byeWeeks, { 2: 9, 3: 7 });
  assert.equal(parsed.matched, 2);
});

test('recommendations exclude provisional live picks until they are resolved', () => {
  const result = recommend({
    players,
    picks: [{ overallPickNumber: 1, playerId: 1, teamId: 7 }],
    unavailablePlayerIds: new Set([2]),
    slots,
    teams: 12,
    mySlot: 1,
    myTeamId: 7,
    scoringValidated: true,
    experts: { 2: 1, 3: 10, 4: 2 },
    byeWeeks: {},
  });

  assert.equal(result.recommendations.some((r) => r.id === 2), false);
});

test('expert CSV accepts FantasyPros RK and PLAYER NAME headers', () => {
  const parsed = parseExpertCsv(
    'RK,PLAYER NAME,BYE WEEK\n2,Beta WR,9\n10,Gamma WR,7\n',
    players,
  );
  assert.deepEqual(parsed.expertRanks, { 2: 2, 3: 10 });
  assert.deepEqual(parsed.byeWeeks, { 2: 9, 3: 7 });
  assert.equal(parsed.matched, 2);
});

test('snake pick calculation handles the return half correctly', () => {
  assert.equal(nextPickFor(1, 12, 12), 24);
  assert.equal(nextPickFor(12, 12, 12), 13);
});

test('live ESPN pick progress advances recommendations beyond a partial pick list', () => {
  const result = recommend({
    players,
    picks: [{ overallPickNumber: 8, playerId: 1, teamId: 7 }],
    currentPick: 26,
    slots,
    teams: 12,
    mySlot: 5,
    myTeamId: 7,
    scoringValidated: true,
  });

  assert.equal(result.currentPick, 26);
  assert.equal(result.nextPick, 29);
});

test('draft slot is inferred from the users first-round ESPN pick', () => {
  assert.equal(inferDraftSlot([
    { overallPickNumber: 3, teamId: 8 },
    { overallPickNumber: 22, teamId: 8 },
  ], 8, 12), 3);
  assert.equal(inferDraftSlot([{ overallPickNumber: 22, teamId: 8 }], 8, 12), null);
});
