/**
 * Panel logic tests. These cover the defects that shipped because sidepanel.js had no
 * tests at all while store.js had twenty.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExport, parseImport, freshness, routeLeague, gatePatch, GATES,
  keyState, keyPool, keyConfig, keySnapshot, DEFAULT_CONFIG, autodraftSummary, survivalPhrase, survivalSummary, scarcitySummary } from '../src/panel-logic.js';
import { createState, applySnapshot, manualPick, confirmedCount } from '../src/store.js';

// ------------------------------------------------------------------- export

test('export carries the whole player pool, not a count', () => {
  const pool = { 1: { id: 1, name: 'A' }, 2: { id: 2, name: 'B' }, 3: { id: 3, name: 'C' } };
  const out = buildExport(999, { myTeamId: 4 }, createState(), pool, '2026-09-06T00:00:00Z');

  assert.equal(Object.keys(out.pool).length, 3);
  assert.equal(out.pool[2].name, 'B');
  assert.equal(out.poolSize, undefined, 'a size field is not a substitute for the pool');
});

test('export/import round-trips into an offline-ready board', () => {
  const s = createState();
  s.leagueId = 42;
  applySnapshot(s, { leagueId: 42, picks: [{ overallPickNumber: 1, playerId: 111, teamId: 3 }] }, 100, 200);
  manualPick(s, { playerId: 222, teamId: 7, overallPickNumber: 2 }, 300);

  const pool = {};
  for (let i = 1; i <= 250; i++) pool[i] = { id: i, name: 'Player ' + i, pos: 'WR' };

  const json = JSON.stringify(buildExport(42, { myTeamId: 7, mySlot: 3 }, s, pool, 'x'));
  const back = parseImport(json);

  assert.equal(back.leagueId, 42);
  assert.equal(back.config.myTeamId, 7);
  assert.equal(back.config.mySlot, 3);
  assert.equal(back.poolCount, 250, 'destination machine must have a usable board');
  assert.equal(confirmedCount(back.state), 2, 'picks survive the transfer');
  assert.equal(back.state.confirmed[2].teamId, 7);
});

test('import fills defaults for fields an older export lacked', () => {
  const back = parseImport({ leagueId: 5, config: { myTeamId: 2 } });
  assert.equal(back.config.scoringValidated, DEFAULT_CONFIG.scoringValidated);
  assert.equal(back.config.leagueId, 5);
  assert.equal(back.poolCount, 0);
});

test('import refuses a file with no league id rather than half-applying', () => {
  assert.throws(() => parseImport({ config: {} }), /league id/);
  assert.throws(() => parseImport('null'), /not an object/);
});

// ---------------------------------------------------------------- freshness

test('freshness reports offline when nothing has ever been confirmed', () => {
  assert.equal(freshness(createState(), 1000).status, 'offline');
});

test('REGRESSION: replaying a cached snapshot does not claim fresh sync', () => {
  const s = createState();
  s.leagueId = 1;
  // A snapshot that completed an hour ago, replayed now on panel reopen.
  applySnapshot(s, { leagueId: 1, picks: [] }, 1000, 1000);

  const oneHourLater = 1000 + 3600 * 1000;
  const f = freshness(s, oneHourLater);
  assert.equal(f.status, 'stale', 'an hour-old cache must not read as synced');
  assert.equal(f.ageMs, 3600 * 1000);
});

test('freshness goes stale past the threshold and live inside it', () => {
  const s = createState();
  s.leagueId = 1;
  applySnapshot(s, { leagueId: 1, picks: [] }, 0, 10000);
  assert.equal(freshness(s, 10000 + 30000).status, 'live');
  assert.equal(freshness(s, 10000 + 200000).status, 'stale');
});

// ------------------------------------------------------------ league routing

test('REGRESSION: a message from another league is offered, never merged or auto-taken', () => {
  // Auto-switching made the board thrash between a mock tab and the real draft tab,
  // with overlapping loads risking mismatched state. It is now the user's call.
  assert.equal(routeLeague(999, 123), 'offer-switch', 'never switch on our own');
  assert.equal(routeLeague(123, 123), 'accept');
  assert.equal(routeLeague('123', 123), 'accept', 'string ids compare numerically');
  assert.equal(routeLeague(null, 123), 'accept', 'league-less messages are fine');
  assert.equal(routeLeague(5, null), 'adopt', 'first league seen is safe to take');
  assert.equal(routeLeague(0, 123), 'ignore');
});

test('REGRESSION: two foreign leagues never cause an automatic switch', () => {
  // A mock tab and the real draft tab both reporting must not ping-pong the board.
  for (const id of [777, 888, 777, 888]) {
    assert.equal(routeLeague(id, 123), 'offer-switch');
  }
  assert.equal(routeLeague(123, 123), 'accept', 'the active league keeps working throughout');
});

test('storage keys are namespaced per league', () => {
  assert.equal(keyState(1), 'dc.state.1');
  assert.notEqual(keyPool(1), keyPool(2));
  assert.notEqual(keyConfig(1), keyConfig(2));
  assert.notEqual(keySnapshot(1), keySnapshot(2));
});

// -------------------------------------------------- dual-delivery integration

test('REGRESSION: one fetch delivered twice counts once toward pending expiry', () => {
  const s = createState();
  s.leagueId = 1;

  // The sensor sends a runtime message AND writes to storage. The panel ingests both.
  const payload = { leagueId: 1, picks: [] };
  const startedAt = 5000;

  applySnapshot(s, payload, startedAt, 5100);  // via message
  applySnapshot(s, payload, startedAt, 5150);  // via storage.onChanged

  assert.equal(s.appliedSnapshots.length, 1, 'the same fetch must register once');
});

test('a manual pick assigned to my team lands in my roster', () => {
  const s = createState();
  s.leagueId = 1;
  const myTeamId = 7;
  manualPick(s, { playerId: 111, teamId: myTeamId }, 1000);

  const mine = Object.values(s.confirmed).filter((p) => p.teamId === myTeamId);
  assert.equal(mine.length, 1, 'Mine must record a team id or the roster stays empty');
  assert.equal(mine[0].playerId, 111);
});

test('a pick marked as someone else does not land in my roster', () => {
  const s = createState();
  s.leagueId = 1;
  manualPick(s, { playerId: 111, teamId: null }, 1000);
  const mine = Object.values(s.confirmed).filter((p) => p.teamId === 7);
  assert.equal(mine.length, 0);
});

// ------------------------------------------------------------ validation gates

test('passing a gate requires a note; revoking does not', () => {
  assert.throws(() => gatePatch('scoring', true, '', 1000), /note/);
  assert.throws(() => gatePatch('scoring', true, '   ', 1000), /note/);
  assert.throws(() => gatePatch('transport', true, null, 1000), /note/);
  assert.doesNotThrow(() => gatePatch('scoring', false, null, 1000));
});

test('gatePatch produces exactly the three fields for that gate', () => {
  const p = gatePatch('scoring', true, '  reception=1.0, 5 players hand-checked  ', 4242);
  assert.deepEqual(p, {
    scoringValidated: true,
    scoringValidatedAt: 4242,
    scoringNotes: 'reception=1.0, 5 players hand-checked',
  });
  const r = gatePatch('scoring', false, 'ignored', 9999);
  assert.deepEqual(r, { scoringValidated: false, scoringValidatedAt: null, scoringNotes: null });
});

test('gatePatch rejects unknown gates and never touches the other gate', () => {
  assert.throws(() => gatePatch('poolSize', true, 'x', 1), /unknown gate/);
  const p = gatePatch('transport', true, 'mock 12-team, 9 frames, median 3.1s', 7);
  assert.equal('scoringValidated' in p, false);
  assert.deepEqual(Object.keys(p).sort(), ['transportNotes', 'transportValidated', 'transportValidatedAt']);
  assert.deepEqual(GATES, ['transport', 'scoring']);
});

test('autodraft summary is hidden when there is nothing to report', () => {
  assert.equal(autodraftSummary(null), null);
  assert.equal(autodraftSummary({ teams: [] }), null);
});

test('a suspected autodrafter is worded as a suspicion, not a finding', () => {
  const summary = autodraftSummary({
    teams: [{ teamId: 4, confidence: 'medium' }], projected: [], unknownPicks: 0,
  });
  assert.equal(summary.tone, 'suspected');
  assert.match(summary.text, /team 4 may be autodrafting/);
  assert.doesNotMatch(summary.text, /projected taken/, 'nothing is declared gone');
});

test('a confirmed autodrafter reports the count and the gaps it cannot predict', () => {
  const summary = autodraftSummary({
    teams: [{ teamId: 3, confidence: 'high' }, { teamId: 7, confidence: 'high' }],
    projected: [{ playerId: 1 }, { playerId: 2 }, { playerId: 3 }],
    unknownPicks: 4,
  });
  assert.equal(summary.tone, 'confirmed');
  assert.match(summary.text, /team 3, team 7 are autodrafting/);
  assert.match(summary.text, /3 players projected taken before your pick/);
  assert.match(summary.text, /4 picks in between belong to live managers/);
});

test('a single projected player is not reported as "1 players"', () => {
  const summary = autodraftSummary({
    teams: [{ teamId: 3, confidence: 'high' }], projected: [{ playerId: 1 }], unknownPicks: 1,
  });
  assert.match(summary.text, /team 3 is autodrafting/);
  assert.match(summary.text, /1 player projected taken/);
  assert.match(summary.text, /1 pick in between/);
});

test('a confirmed autodrafter still mentions the ones only suspected', () => {
  const summary = autodraftSummary({
    teams: [{ teamId: 3, confidence: 'high' }, { teamId: 9, confidence: 'medium' }],
    projected: [], unknownPicks: 0,
  });
  assert.match(summary.text, /team 9 may be too/);
});

test('a probability never reaches certainty in either direction', () => {
  // The clamp keeps the numbers off 0 and 1; this keeps the WORDING off them too. The
  // certainty channel belongs to the deterministic autodraft projection and nothing else.
  const high = survivalPhrase({ survivalToNextTurn: 0.9999, survivalBasis: 'need-conditioned' }, 40);
  const low = survivalPhrase({ survivalToNextTurn: 0.0001, survivalBasis: 'need-conditioned' }, 40);
  assert.match(high, /better than 9 in 10/);
  assert.doesNotMatch(high, /100%|certain|definitely|will be/);
  assert.match(low, /less than 1 in 10/);
  assert.doesNotMatch(low, /0%|gone|no chance/);
});

test('the odds are stated coarsely, not to two significant figures', () => {
  const phrase = survivalPhrase({ survivalToNextTurn: 0.634, survivalBasis: 'need-conditioned' }, 198);
  assert.match(phrase, /about 6 in 10 still there at #198/);
  assert.doesNotMatch(phrase, /63|0\.6/, 'a precise-looking number implies precision this model lacks');
});

test('an ADP-only forecast says so rather than implying opponent modelling', () => {
  const phrase = survivalPhrase({ survivalToNextTurn: 0.5, survivalBasis: 'market-only' }, 40);
  assert.match(phrase, /ADP only/);
  assert.doesNotMatch(phrase, /need-adjusted/);
});

test('a player pinned by autodraft carries no probability at all', () => {
  // Otherwise one row would make a hard claim and a soft one about the same player.
  assert.equal(survivalPhrase({ survivalToNextTurn: null, survivalBasis: 'autodraft-projected' }, 40), null);
  assert.equal(survivalPhrase(null, 40), null);
});

test('the survival summary reports what was modelled and what was not', () => {
  const summary = survivalSummary({
    basis: 'need-conditioned', modelledPicks: 21, pinnedPicks: 1, unconditionedPicks: 2,
  });
  assert.match(summary.text, /21 picks modelled/);
  assert.match(summary.text, /1 more projected from autodraft/);
  assert.match(summary.text, /2 of them without a usable team id/);
  assert.equal(summary.uncalibrated, true);
});

test('the survival summary is hidden when there is nothing to model', () => {
  assert.equal(survivalSummary(null), null);
  assert.equal(survivalSummary({ basis: 'none', modelledPicks: 0 }), null);
});

test('the scarcity lines name the cost of waiting and the tier at risk', () => {
  const summary = scarcitySummary({
    vona: [{ pos: 'RB', bestNow: 'Ace RB', vona: 36.8 }, { pos: 'WR', bestNow: 'Bolt WR', vona: 4.1 }],
    tiers: [{ pos: 'RB', tier: 3, remaining: 4, exhaustion: 0.78 }],
  }, 198);
  assert.match(summary.lines[0], /waiting costs most at RB: about 37 projected points/);
  assert.match(summary.lines[0], /Ace RB/);
  assert.match(summary.lines[1], /about 78 in 100 that all 4 remaining RB tier-3 players are gone before #198/);
});

test('a one-player tier is not the sentence worth printing', () => {
  // "The last man in this tier will be gone" is implied by his own survival number and
  // crowds out the tiers you can still act on.
  const summary = scarcitySummary({
    vona: [],
    tiers: [{ pos: 'WR', tier: 2, remaining: 1, exhaustion: 0.99 },
      { pos: 'RB', tier: 4, remaining: 3, exhaustion: 0.42 }],
  }, 40);
  assert.equal(summary.lines.length, 1);
  assert.match(summary.lines[0], /all 3 remaining RB tier-4 players/);
});

test('a position that costs nothing to wait on is not reported as a cost', () => {
  const summary = scarcitySummary({ vona: [{ pos: 'K', bestNow: 'Kicker', vona: 0 }], tiers: [] }, 40);
  assert.equal(summary, null);
});

test('scarcity says nothing when there is nothing to say', () => {
  assert.equal(scarcitySummary(null, 40), null);
  assert.equal(scarcitySummary({ vona: [], tiers: [] }, 40), null);
});
