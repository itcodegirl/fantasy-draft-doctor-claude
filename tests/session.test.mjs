/**
 * Session integration tests.
 *
 * These exercise the panel's ASYNCHRONOUS coordination, which helper-level tests could
 * not reach: messages racing a league transition, the triggering message on adoption,
 * and state being written under the wrong league's key.
 *
 * Storage is faked with a controllable delay so the transition window is real rather
 * than instantaneous.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/session.js';
import { KEY_ACTIVE, keyState, keyPool, keyConfig, keySnapshot, keyCalibration } from '../src/panel-logic.js';
import { confirmedPlayerIds, confirmedCount } from '../src/store.js';

/** Fake chrome.storage.local with an injectable delay on get, to widen the race window. */
function fakeStorage(initial = {}, delayMs = 0) {
  const data = Object.assign({}, initial);
  const wait = () => (delayMs ? new Promise((r) => setTimeout(r, delayMs)) : Promise.resolve());
  return {
    data,
    async get(keys) {
      await wait();
      const out = {};
      for (const k of [].concat(keys)) if (k in data) out[k] = data[k];
      return out;
    },
    async set(obj) {
      await wait();
      Object.assign(data, obj);
    },
  };
}

let clock = 1000;
const now = () => (clock += 10);

// ------------------------------------------------------------- atomic switch

test('REGRESSION: a message during a transition does not mutate the departing league', async () => {
  const storage = fakeStorage({
    [KEY_ACTIVE]: 100,
    [keyConfig(100)]: { leagueId: 100, myTeamId: 1 },
  }, 5);
  const s = createSession({ storage, now });
  await s.init();
  assert.equal(s.activeLeagueId, 100);
  assert.equal(s.config.myTeamId, 1);

  // Start a switch, then fire a message for the DESTINATION league while the load is
  // still awaiting storage. Previously activeLeagueId was set first, so this routed as
  // "accept" and wrote the destination's teamId onto league 100's config -- which was
  // then discarded when the load finished.
  const switching = s.switchTo(200);
  const result = await s.handleMessage({ type: 'dc.identity', leagueId: 200, teamId: 9 });
  assert.equal(result, 'queued', 'mid-transition messages are held, not applied');

  await switching;
  assert.equal(s.activeLeagueId, 200);

  // The departing league's config must be untouched by the destination's message.
  const saved100 = storage.data[keyConfig(100)];
  assert.equal(saved100.myTeamId, 1, 'league 100 config was not corrupted');
});

test('REGRESSION: a queued message is applied after the transition, not lost', async () => {
  const storage = fakeStorage({ [KEY_ACTIVE]: 100 }, 5);
  const s = createSession({ storage, now });
  await s.init();

  const switching = s.switchTo(200);
  await s.handleMessage({ type: 'dc.identity', leagueId: 200, teamId: 9 });
  await switching;
  // Drain happens on the next handled message or on adoption; force one through.
  await s.handleMessage({ type: 'dc.identity', leagueId: 200, teamId: 9 });

  assert.equal(s.activeLeagueId, 200);
  assert.equal(s.config.myTeamId, 9, 'the destination identity survived the transition');
});

test('state and config are saved under the league they belong to', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });

  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 3 });
  await s.handleMessage({
    type: 'dc.snapshot', leagueId: 100,
    picks: [{ overallPickNumber: 1, playerId: 111, teamId: 3 }],
    startedAt: 10, completedAt: 20,
  });
  await s.flush();

  await s.switchTo(200);
  await s.handleMessage({
    type: 'dc.snapshot', leagueId: 200,
    picks: [{ overallPickNumber: 1, playerId: 999, teamId: 5 }],
    startedAt: 30, completedAt: 40,
  });
  await s.flush();

  const a = storage.data[keyState(100)];
  const b = storage.data[keyState(200)];
  assert.equal(Object.values(a.confirmed)[0].playerId, 111);
  assert.equal(Object.values(b.confirmed)[0].playerId, 999);
  assert.notEqual(storage.data[keyConfig(100)], storage.data[keyConfig(200)]);
});

// --------------------------------------------------------------- adoption

test('REGRESSION: the identity message that triggers adoption is not discarded', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });

  // Nothing active yet: this adopts league 1 AND carries teamId 7.
  const r = await s.handleMessage({ type: 'dc.identity', leagueId: 1, teamId: 7 });

  assert.equal(s.activeLeagueId, 1);
  assert.equal(s.config.myTeamId, 7,
    'adoption must replay the triggering message; teamId was previously dropped');
  assert.equal(r, 'identity:team-set');
});

test('live current-pick progress is retained for recommendation timing', async () => {
  const storage = fakeStorage({});
  const s = createSession({ storage, now });

  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 5 });
  const result = await s.handleMessage({
    type: 'dc.current-pick', leagueId: 100, currentPick: 26,
  });

  assert.equal(result, 'current-pick');
  assert.equal(s.state.currentPick, 26);
  await s.flush();
  assert.equal(storage.data[keyState(100)].currentPick, 26);
});

test('cached snapshots carry current-pick progress when the panel was closed', async () => {
  const storage = fakeStorage({});
  const s = createSession({ storage, now });

  await s.handleMessage({ type: 'dc.identity', leagueId: 101, teamId: 5 });
  await s.handleMessage({
    type: 'dc.snapshot', leagueId: 101, picks: [], currentPick: 26,
    startedAt: 10, completedAt: 20,
  });

  assert.equal(s.state.currentPick, 26);
});

test('an invalid imported team id is repaired from the ESPN identity', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 5 });
  s.setConfig({ myTeamId: 1021832390 });

  const result = await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 5 });
  assert.equal(result, 'identity:team-set');
  assert.equal(s.config.myTeamId, 5);
});

test('adoption replays a snapshot message too', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });

  const r = await s.handleMessage({
    type: 'dc.snapshot', leagueId: 55,
    picks: [{ overallPickNumber: 1, playerId: 111, teamId: 2 }],
    startedAt: 10, completedAt: 20,
  });

  assert.equal(s.activeLeagueId, 55);
  assert.equal(r, 'applied');
  assert.equal(confirmedPlayerIds(s.state).has(111), true, 'the adopting snapshot was applied');
});

// ----------------------------------------------------------------- offering

test('a foreign league is offered, never taken, and the active board keeps working', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });

  const r = await s.handleMessage({ type: 'dc.identity', leagueId: 777, teamId: 4 });
  assert.equal(r, 'offered');
  assert.equal(s.activeLeagueId, 100, 'board did not move');
  assert.equal(s.pendingLeagueOffer, 777);
  assert.equal(s.config.myTeamId, 1, 'the foreign identity did not touch our config');

  // The active league still functions while an offer is outstanding.
  const r2 = await s.handleMessage({
    type: 'dc.snapshot', leagueId: 100,
    picks: [{ overallPickNumber: 1, playerId: 222, teamId: 1 }],
    startedAt: 10, completedAt: 20,
  });
  assert.equal(r2, 'applied');
});

test('two competing foreign leagues never move the board', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });

  for (const id of [777, 888, 777, 888]) {
    await s.handleMessage({ type: 'dc.identity', leagueId: id, teamId: 2 });
    assert.equal(s.activeLeagueId, 100);
  }
});

// ------------------------------------------------------------------- import

test('REGRESSION: importing a payload with no players clears the previous pool', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });

  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });
  await s.handleMessage({ type: 'dc.pool', leagueId: 100, players: { 1: { id: 1, name: 'Old' } } });
  assert.equal(Object.keys(s.pool).length, 1);

  await s.importPayload({ leagueId: 200, config: { leagueId: 200, myTeamId: 5 }, state: null, pool: {} });

  assert.equal(Object.keys(s.pool).length, 0,
    "an empty import must not leave the previous league's players in memory");
  assert.deepEqual(storage.data[keyPool(200)], {},
    "and must not save them under the imported league's key");
});

test('importing a payload with players installs them', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.importPayload({
    leagueId: 300,
    config: { leagueId: 300, myTeamId: 2 },
    state: null,
    pool: { 7: { id: 7, name: 'Imported' } },
  });
  assert.equal(s.activeLeagueId, 300);
  assert.equal(s.pool[7].name, 'Imported');
  assert.equal(storage.data[KEY_ACTIVE], 300);
});

// -------------------------------------------------------------- cached replay

test('a cached snapshot is replayed into the new league before it becomes visible', async () => {
  const storage = fakeStorage({
    [KEY_ACTIVE]: 100,
    [keySnapshot(100)]: {
      leagueId: 100,
      picks: [{ overallPickNumber: 1, playerId: 111, teamId: 2 }],
      startedAt: 500, completedAt: 600,
    },
  }, 2);
  const s = createSession({ storage, now });
  await s.init();

  assert.equal(confirmedCount(s.state), 1);
  assert.equal(s.state.lastSnapshotCompletedAt, 600,
    'freshness comes from the snapshot, not from load time');
});

test('a cached snapshot with a missing picks array is not replayed', async () => {
  const storage = fakeStorage({
    [KEY_ACTIVE]: 100,
    [keySnapshot(100)]: { leagueId: 100, startedAt: 500, completedAt: 600 },
  }, 1);
  const s = createSession({ storage, now });
  await s.init();
  assert.equal(confirmedCount(s.state), 0);
  assert.equal(s.state.lastSnapshotCompletedAt, null);
});

// ------------------------------------------------------------- manual mode

test('REGRESSION: manual mode actually stops synchronising, not just filtering', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });

  s.setConfig({ syncPaused: true });

  const snap = await s.handleMessage({
    type: 'dc.snapshot', leagueId: 100,
    picks: [{ overallPickNumber: 1, playerId: 111, teamId: 2 }],
    startedAt: 10, completedAt: 20,
  });
  const obs = await s.handleMessage({ type: 'dc.observation', leagueId: 100, playerId: 222, teamId: 3 });

  assert.equal(snap, 'paused');
  assert.equal(obs, 'paused');
  assert.equal(confirmedCount(s.state), 0, 'no live data may reach state while paused');
  assert.equal(s.state.pending.length, 0);

  // Resuming lets data flow again.
  s.setConfig({ syncPaused: false });
  const after = await s.handleMessage({
    type: 'dc.snapshot', leagueId: 100,
    picks: [{ overallPickNumber: 1, playerId: 111, teamId: 2 }],
    startedAt: 30, completedAt: 40,
  });
  assert.equal(after, 'applied');
  assert.equal(confirmedCount(s.state), 1);
});

// =====================================================================
// Round 3: pause on replay, coordinated init, identity through an accepted offer.
// =====================================================================

test('REGRESSION: manual mode is honoured on reload, not just on incoming messages', async () => {
  // A paused session whose sensor cached a snapshot before the panel closed.
  const storage = fakeStorage({
    [KEY_ACTIVE]: 100,
    [keyConfig(100)]: { leagueId: 100, myTeamId: 1, syncPaused: true },
    [keySnapshot(100)]: {
      leagueId: 100,
      picks: [{ overallPickNumber: 1, playerId: 111, teamId: 2 }],
      startedAt: 500, completedAt: 600,
    },
  }, 2);
  const s = createSession({ storage, now });
  await s.init();

  assert.equal(s.config.syncPaused, true);
  assert.equal(confirmedCount(s.state), 0,
    'cached replay must obey the pause rule, or reopening silently re-syncs');
  assert.equal(s.state.lastSnapshotCompletedAt, null);
});

test('a cached snapshot IS replayed when not paused', async () => {
  const storage = fakeStorage({
    [KEY_ACTIVE]: 100,
    [keyConfig(100)]: { leagueId: 100, syncPaused: false },
    [keySnapshot(100)]: {
      leagueId: 100,
      picks: [{ overallPickNumber: 1, playerId: 111, teamId: 2 }],
      startedAt: 500, completedAt: 600,
    },
  }, 2);
  const s = createSession({ storage, now });
  await s.init();
  assert.equal(confirmedCount(s.state), 1);
});

test('REGRESSION: a message during init cannot be overwritten by the delayed load', async () => {
  const storage = fakeStorage({ [KEY_ACTIVE]: 1 }, 10);
  const s = createSession({ storage, now });

  const initing = s.init();
  // Arrives while init is still awaiting storage. Previously this adopted league 2,
  // and then init's load stomped it back to league 1.
  const r = await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 9 });
  assert.equal(r, 'queued', 'init must hold the transition guard like any switch');

  await initing;
  assert.equal(s.activeLeagueId, 1, 'the persisted league loads deterministically');
  // The queued message is then routed normally -- offered, not silently applied.
  assert.equal(s.pendingLeagueOffer, 2);
});

test('REGRESSION: accepting a switch offer carries the destination identity', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 1, teamId: 3 });
  assert.equal(s.config.myTeamId, 3);

  // League 2 reports, carrying its own teamId. It is offered, not taken.
  const r = await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 7 });
  assert.equal(r, 'offered');
  assert.equal(s.pendingLeagueOffer, 2);

  await s.acceptOffer();

  assert.equal(s.activeLeagueId, 2);
  assert.equal(s.config.myTeamId, 7,
    'the offer must retain the triggering message, not just the league number');
  assert.equal(s.pendingLeagueOffer, null);
});

test('accepting an offer with no stored message still switches cleanly', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 1, teamId: 3 });
  await s.handleMessage({ type: 'dc.snapshot', leagueId: 9, picks: [], startedAt: 1, completedAt: 2 });
  assert.equal(s.pendingLeagueOffer, 9);
  await s.acceptOffer();
  assert.equal(s.activeLeagueId, 9);
  assert.equal(s.pendingLeagueOffer, null);
});

test('declining an offer leaves the board and its config untouched', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 1, teamId: 3 });
  await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 7 });
  s.clearOffer();
  assert.equal(s.activeLeagueId, 1);
  assert.equal(s.config.myTeamId, 3);
  assert.equal(s.pendingLeagueOffer, null);
});

test('an import racing a switch does not interleave', async () => {
  const storage = fakeStorage({}, 4);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });

  // Fire both without awaiting the first: they must serialize, last one wins cleanly.
  const switching = s.switchTo(200);
  const importing = s.importPayload({
    leagueId: 300, config: { leagueId: 300, myTeamId: 8 }, state: null,
    pool: { 5: { id: 5, name: 'Imported' } },
  });
  await Promise.all([switching, importing]);

  assert.equal(s.activeLeagueId, 300);
  assert.equal(s.config.myTeamId, 8);
  assert.equal(s.pool[5].name, 'Imported');
  assert.equal(storage.data[KEY_ACTIVE], 300);
  // League 200's own keys must not have been handed the imported league's data.
  assert.equal(storage.data[keyPool(200)], undefined);
});

// =====================================================================
// Round 4: startup deadlock, and offer context surviving later messages.
// =====================================================================

/** Fails the test rather than hanging the runner if a promise never settles. */
function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timed out: ' + label)), ms)),
  ]);
}

test('REGRESSION: first-time init does not deadlock when a message queues during it', async () => {
  const storage = fakeStorage({}, 8);          // empty storage, first run
  const s = createSession({ storage, now });

  const initing = s.init();
  const queuedResult = await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 7 });
  assert.equal(queuedResult, 'queued');

  // init drains the queue; the queued message wants to adopt, which schedules another
  // transition. If draining is awaited from inside the chain, that adoption is chained
  // behind the init that is waiting for it -- a circular wait.
  await withTimeout(initing, 2000, 'init() never settled');

  assert.equal(s.transitioning, false, 'the transition guard must not be left held');
  assert.equal(s.activeLeagueId, 2, 'the queued message adopted its league');
  assert.equal(s.config.myTeamId, 7);
});

test('REGRESSION: a queued adoption during a switch also completes', async () => {
  const storage = fakeStorage({ [KEY_ACTIVE]: 1 }, 6);
  const s = createSession({ storage, now });
  await withTimeout(s.init(), 2000, 'init');

  const switching = s.switchTo(2);
  await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 4 });
  await withTimeout(switching, 2000, 'switchTo() never settled');

  assert.equal(s.transitioning, false);
  assert.equal(s.activeLeagueId, 2);
});

test('REGRESSION: a later snapshot does not erase the offered identity', async () => {
  const storage = fakeStorage({}, 2);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 1, teamId: 3 });

  // League 2 offers, carrying its teamId...
  await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 7 });
  // ...then a league 2 snapshot arrives before the user decides.
  await s.handleMessage({
    type: 'dc.snapshot', leagueId: 2,
    picks: [{ overallPickNumber: 1, playerId: 111, teamId: 5 }],
    startedAt: 10, completedAt: 20,
  });
  assert.equal(s.pendingLeagueOffer, 2);

  await s.acceptOffer();

  assert.equal(s.activeLeagueId, 2);
  assert.equal(s.config.myTeamId, 7,
    'the identity must be retained separately from whatever message arrived last');
});

test('an offer for a different league resets the retained context', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 1, teamId: 3 });

  await s.handleMessage({ type: 'dc.identity', leagueId: 2, teamId: 7 });
  await s.handleMessage({ type: 'dc.identity', leagueId: 3, teamId: 9 });
  assert.equal(s.pendingLeagueOffer, 3);

  await s.acceptOffer();
  assert.equal(s.activeLeagueId, 3);
  assert.equal(s.config.myTeamId, 9, "league 2's identity must not leak into league 3");
});

// ------------------------------------------------------------- validation gates

test('a gate flipped from the panel persists through flush and reload', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });

  assert.equal(s.config.scoringValidated, false);
  s.setGate('scoring', true, 'reception=1.0 for RB/WR/TE; 5 players hand-checked');
  assert.equal(s.config.scoringValidated, true);
  assert.equal(typeof s.config.scoringValidatedAt, 'number');
  await s.flush();

  // Fresh session over the same storage, as after a panel reopen.
  const s2 = createSession({ storage, now });
  await s2.init();
  assert.equal(s2.activeLeagueId, 100);
  assert.equal(s2.config.scoringValidated, true, 'the gate must survive a reload');
  assert.equal(s2.config.scoringNotes, 'reception=1.0 for RB/WR/TE; 5 players hand-checked');
});

test('gates are per league: a mock passing transport does not open the real league', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });

  await s.handleMessage({ type: 'dc.identity', leagueId: 999, teamId: 4 });   // mock
  s.setGate('transport', true, 'mock: 9 frames, median 3.1s, reload recovered');
  await s.flush();

  await s.switchTo(100);                                                        // real league
  assert.equal(s.config.transportValidated, false,
    'evidence from the mock league is not silently transferred');

  await s.switchTo(999);
  assert.equal(s.config.transportValidated, true, 'the mock keeps its own record');
});

test('setGate refuses to pass without a note and leaves config untouched', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });
  assert.throws(() => s.setGate('scoring', true, ''), /note/);
  assert.equal(s.config.scoringValidated, false);
  assert.equal(s.config.scoringValidatedAt, null);
});

test('revoking a gate clears its note and timestamp', async () => {
  const storage = fakeStorage({}, 1);
  const s = createSession({ storage, now });
  await s.handleMessage({ type: 'dc.identity', leagueId: 100, teamId: 1 });
  s.setGate('transport', true, 'ok');
  s.setGate('transport', false);
  assert.equal(s.config.transportValidated, false);
  assert.equal(s.config.transportValidatedAt, null);
  assert.equal(s.config.transportNotes, null);
});

test('the calibration log is per-league and survives a switch in both directions', async () => {
  // It rides the same atomic install as state/pool/config. A half-switched session that
  // scored one league's forecasts against another league's picks would be silently wrong
  // in exactly the way this file exists to catch.
  const storage = fakeStorage({
    [KEY_ACTIVE]: 100,
    [keyConfig(100)]: { leagueId: 100 },
    [keyCalibration(100)]: { version: 1, forecasts: [{ targetPick: 13, entries: [], settled: false }] },
    [keyCalibration(200)]: { version: 1, forecasts: [{ targetPick: 27, entries: [], settled: false }] },
  }, 5);
  const s = createSession({ storage, now });
  await s.init();
  assert.equal(s.calibration.forecasts[0].targetPick, 13);

  await s.switchTo(200);
  assert.equal(s.calibration.forecasts[0].targetPick, 27, 'the mock draft log did not follow us');

  s.setCalibration({ version: 1, forecasts: [{ targetPick: 99, entries: [], settled: false }] });
  await s.switchTo(100);
  assert.equal(s.calibration.forecasts[0].targetPick, 13, 'league 100 got its own log back');
  assert.equal(storage.data[keyCalibration(200)].forecasts[0].targetPick, 99,
    'the departing league persisted its own log, not the destination\'s');
});

test('a league with no stored calibration log starts empty rather than undefined', async () => {
  const storage = fakeStorage({ [KEY_ACTIVE]: 300, [keyConfig(300)]: { leagueId: 300 } }, 0);
  const s = createSession({ storage, now });
  await s.init();
  assert.deepEqual(s.calibration.forecasts, []);
});
