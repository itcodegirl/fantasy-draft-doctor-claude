/**
 * State machine tests. Run: node --test tests/
 *
 * These cover the failure modes that silently corrupt draft state. Each maps to a
 * required test in the plan.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, observeFrame, applySnapshot, manualPick, undoPick,
  confirmPending, rejectPending, confirmedPlayerIds, pendingPlayerIds,
  openConflicts, confirmedCount, latencyStats, isValidPlayerId,
  findConfirmedByPlayer, PENDING_EXPIRY_SNAPSHOTS, resetForLeague, deserialize,
} from '../src/store.js';

const snap = (picks, leagueId = 1) => ({ leagueId, picks });
const P = (n, playerId, teamId = 1) => ({ overallPickNumber: n, playerId, teamId });

function fresh() {
  const s = createState();
  s.leagueId = 1;
  return s;
}

// ---------------------------------------------------------------- validation

test('player id validation accepts real ids and the D/ST band, rejects empty slots', () => {
  assert.equal(isValidPlayerId(4685382), true);
  assert.equal(isValidPlayerId(-16033), true);   // D/ST
  assert.equal(isValidPlayerId(0), false);       // unfilled slot
  assert.equal(isValidPlayerId(-1), false);      // unfilled slot
  assert.equal(isValidPlayerId(-99999), false);
  assert.equal(isValidPlayerId('4685382'), false);
  assert.equal(isValidPlayerId(NaN), false);
});

test('malformed bridge messages are rejected', () => {
  const s = fresh();
  assert.equal(observeFrame(s, { playerId: 'abc' }, 1000).accepted, false);
  assert.equal(observeFrame(s, { playerId: 0 }, 1000).accepted, false);
  assert.equal(observeFrame(s, {}, 1000).accepted, false);
  assert.equal(s.pending.length, 0);
});

test('frames carrying a different league id are rejected', () => {
  const s = fresh();
  const r = observeFrame(s, { playerId: 111, teamId: 2, leagueId: 999 }, 1000);
  assert.equal(r.accepted, false);
  assert.equal(r.reason, 'wrong league');
  assert.equal(s.pending.length, 0);
});

// ------------------------------------------------------------- provisionality

test('a well-formed live selection is automatically recorded and removed', () => {
  const s = fresh();
  observeFrame(s, { playerId: 111, teamId: 2, leagueId: 1 }, 1000);

  assert.equal(pendingPlayerIds(s).has(111), false);
  assert.equal(confirmedPlayerIds(s).has(111), true);
  assert.equal(findConfirmedByPlayer(s, 111).source, 'live-auto');
  assert.equal(confirmedCount(s), 1);
});

test('a live selection remains drafted when REST has not caught up', () => {
  const s = fresh();
  observeFrame(s, { playerId: 111, teamId: 2, leagueId: 1 }, 1000);

  applySnapshot(s, snap([]), 1100, 1200);
  assert.equal(s.pending.length, 0);
  applySnapshot(s, snap([]), 2100, 2200);
  assert.equal(confirmedPlayerIds(s).has(111), true);
  assert.equal(openConflicts(s).length, 0);
});

test('a wrong-league REST snapshot does not affect an automatic live pick', () => {
  const s = fresh();
  observeFrame(s, { playerId: 111, teamId: 2, leagueId: 1 }, 1000);

  const r = applySnapshot(s, snap([], 999), 1100, 1200);
  assert.equal(r.applied, false);
  assert.equal(confirmedPlayerIds(s).has(111), true);
});

test('a REST snapshot supplies metadata for an automatic live pick', () => {
  const s = fresh();
  observeFrame(s, { playerId: 111, teamId: 2, leagueId: 1 }, 1000);
  applySnapshot(s, snap([P(1, 111, 2)]), 1100, 3500);

  assert.equal(s.pending.length, 0);
  assert.equal(confirmedPlayerIds(s).has(111), true);
  assert.equal(s.confirmed[1].playerId, 111);
});

// ------------------------------------------------------------------ duplicates

test('duplicate SELECTED events for one pick collapse automatically', () => {
  const s = fresh();
  assert.equal(observeFrame(s, { playerId: 111, leagueId: 1 }, 1000).accepted, true);
  assert.equal(observeFrame(s, { playerId: 111, leagueId: 1 }, 1001).accepted, false);
  assert.equal(confirmedCount(s), 1);
});

test('a repeated snapshot does not duplicate confirmed picks', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111), P(2, 222)]), 100, 200);
  applySnapshot(s, snap([P(1, 111), P(2, 222)]), 300, 400);
  assert.equal(confirmedCount(s), 2);
});

// ----------------------------------------------------------------- corrections

test('same pick number with a different player is treated as a correction', () => {
  const s = fresh();
  applySnapshot(s, snap([P(5, 111, 3)]), 100, 200);
  assert.equal(s.confirmed[5].playerId, 111);

  const r = applySnapshot(s, snap([P(5, 222, 3)]), 300, 400);
  assert.equal(r.corrected, 1);
  assert.equal(s.confirmed[5].playerId, 222);
  assert.equal(confirmedPlayerIds(s).has(111), false, 'the replaced player returns to the pool');
});

// ------------------------------------------------------------------ reversals

test('a partial snapshot does not put drafted players back on the board', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111), P(2, 222), P(3, 333)]), 100, 200);
  assert.equal(confirmedCount(s), 3);

  // ESPN may return only the rows it currently has in its live response.
  const r = applySnapshot(s, snap([P(1, 111), P(2, 222)]), 300, 400);
  assert.equal(r.reversed, 0);
  assert.equal(confirmedCount(s), 3);
  assert.equal(confirmedPlayerIds(s).has(333), true);
});

// --------------------------------------------------------------------- staleness

test('a stale response never erases a newer confirmed selection', () => {
  const s = fresh();
  // Snapshot A is issued at t=100 but has not returned yet.
  const staleStartedAt = 100;

  // Meanwhile a newer snapshot lands and confirms pick 3.
  applySnapshot(s, snap([P(1, 111), P(2, 222), P(3, 333)]), 500, 600);
  assert.equal(confirmedCount(s), 3);

  // Now the old in-flight response finally arrives, missing pick 3.
  const r = applySnapshot(s, snap([P(1, 111), P(2, 222)]), staleStartedAt, 700);
  assert.equal(r.reversed, 0, 'must not treat old data as a reversal');
  assert.ok(r.ignoredStale >= 1);
  assert.equal(confirmedCount(s), 3, 'newer selection survives');
  assert.equal(confirmedPlayerIds(s).has(333), true);
});

test('a response issued before a newer event does not overwrite the newer player', () => {
  const s = fresh();
  applySnapshot(s, snap([P(7, 999)]), 500, 600);

  // In-flight older request that thinks pick 7 was someone else.
  const r = applySnapshot(s, snap([P(7, 111)]), 100, 700);
  assert.equal(r.corrected, 0);
  assert.equal(r.ignoredStale, 1);
  assert.equal(s.confirmed[7].playerId, 999);
});

// ----------------------------------------------------------- manual + conflicts

test('manual picks survive and are not silently overwritten by a contradicting snapshot', () => {
  const s = fresh();
  manualPick(s, { playerId: 111, teamId: 4, overallPickNumber: 9 }, 1000);
  assert.equal(s.confirmed[9].source, 'manual');

  const r = applySnapshot(s, snap([P(9, 222, 4)]), 2000, 2100);
  assert.equal(r.conflicts, 1);
  assert.equal(r.corrected, 0);
  assert.equal(s.confirmed[9].playerId, 111, 'user correction is preserved pending resolution');

  const c = openConflicts(s);
  assert.equal(c[0].kind, 'snapshot-contradicts-manual');
  assert.equal(c[0].detail.manualPlayerId, 111);
  assert.equal(c[0].detail.snapshotPlayerId, 222);
});

test('a snapshot missing a manual pick leaves it intact without approval UI', () => {
  const s = fresh();
  manualPick(s, { playerId: 111, teamId: 4, overallPickNumber: 9 }, 1000);

  const r = applySnapshot(s, snap([]), 2000, 2100);
  assert.equal(r.reversed, 0);
  assert.equal(r.conflicts, 0);
  assert.equal(s.confirmed[9].playerId, 111);
  assert.equal(openConflicts(s).length, 0);
});

test('manual pick refuses a player already drafted', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111)]), 100, 200);
  const r = manualPick(s, { playerId: 111, teamId: 2 }, 300);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'already drafted');
});

test('manual pick auto-assigns the next open pick number', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111), P(2, 222)]), 100, 200);
  const r = manualPick(s, { playerId: 333, teamId: 3 }, 300);
  assert.equal(r.overallPickNumber, 3);
});

test('undo removes the highest pick by default', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111), P(2, 222)]), 100, 200);
  const r = undoPick(s);
  assert.equal(r.ok, true);
  assert.equal(r.removed.playerId, 222);
  assert.equal(confirmedCount(s), 1);
  assert.equal(confirmedPlayerIds(s).has(222), false);
});

test('legacy pending records can still be resolved during state migration', () => {
  const s = fresh();
  s.pending.push({ playerId: 111, teamId: 2, observedAt: 1000, successfulSnapshots: 0 });
  confirmPending(s, 111, 1100);
  assert.equal(confirmedPlayerIds(s).has(111), true);
  assert.equal(findConfirmedByPlayer(s, 111).source, 'manual');

  s.pending.push({ playerId: 222, teamId: 3, observedAt: 1200, successfulSnapshots: 0 });
  rejectPending(s, 222);
  assert.equal(s.pending.length, 0);
  assert.equal(confirmedPlayerIds(s).has(222), false);
});

// ------------------------------------------------------------------ ordering

test('an out-of-order snapshot arriving after a correction keeps the newest state', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111)]), 100, 200);
  applySnapshot(s, snap([P(1, 222)]), 300, 400);   // correction
  applySnapshot(s, snap([P(1, 111)]), 150, 500);   // older in-flight response
  assert.equal(s.confirmed[1].playerId, 222);
});

// =====================================================================
// Regression tests for defects the original 20 did not catch.
// =====================================================================

test('REGRESSION: an explicit local undo remains protected from stale REST data', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111), P(2, 222), P(3, 333)]), 100, 200);

  // Local undo removes pick 3.
  undoPick(s, 3, 400);
  assert.equal(confirmedPlayerIds(s).has(333), false, 'reversal applied');

  // An older in-flight response, issued before the undo, still lists pick 3.
  applySnapshot(s, snap([P(1, 111), P(2, 222), P(3, 333)]), 250, 500);

  assert.equal(confirmedPlayerIds(s).has(333), false,
    'stale add must not bring the reversed player back');
  assert.equal(confirmedCount(s), 2);
});

test('REGRESSION: a pick re-drafted AFTER a local undo is still accepted', () => {
  const s = fresh();
  applySnapshot(s, snap([P(3, 333)]), 100, 200);
  undoPick(s, 3, 400);                              // undo
  applySnapshot(s, snap([P(3, 444)]), 500, 600);   // genuinely new, newer than the undo
  assert.equal(s.confirmed[3].playerId, 444, 'legitimate later pick must not be blocked');
});

test('REGRESSION: the same snapshot applied twice does not duplicate automatic picks', () => {
  const s = fresh();
  observeFrame(s, { playerId: 111, leagueId: 1 }, 1000);

  // The sensor both messages and storage-writes each snapshot, so the panel can
  // ingest one fetch through two paths.
  applySnapshot(s, snap([]), 1100, 1200);
  applySnapshot(s, snap([]), 1100, 1201);  // identical fetch, second path

  assert.equal(confirmedCount(s), 1);
  assert.equal(confirmedPlayerIds(s).has(111), true);
});

test('REGRESSION: REST metadata fills in on an agreeing pick', () => {
  const s = fresh();
  // User marks a player manually; they do not know the team id.
  manualPick(s, { playerId: 111, teamId: null, overallPickNumber: 1 }, 1000);
  assert.equal(s.confirmed[1].teamId, null);

  // ESPN later confirms the same player and knows the team.
  applySnapshot(s, snap([{ overallPickNumber: 1, playerId: 111, teamId: 7, roundId: 1 }]), 2000, 2100);

  assert.equal(s.confirmed[1].teamId, 7, 'agreement must still absorb metadata');
  assert.equal(s.confirmed[1].playerId, 111);
});

test('REGRESSION: switching leagues isolates state', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111)]), 100, 200);
  assert.equal(confirmedCount(s), 1);

  resetForLeague(s, 2);
  assert.equal(confirmedCount(s), 0, 'mock draft state must not carry into the real league');
  assert.equal(s.leagueId, 2);
  assert.equal(s.pending.length, 0);

  // And a snapshot from the old league is now irrelevant.
  const r = applySnapshot(s, snap([P(1, 111)], 1), 300, 400);
  assert.equal(r.applied, false);
});

test('REGRESSION: snapshot completion time is tracked separately from apply time', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111)]), 100, 200);
  assert.equal(s.lastSnapshotCompletedAt, 200);

  // Replaying a cached snapshot much later must not claim fresh confirmation.
  applySnapshot(s, snap([P(1, 111)]), 100, 999999);
  assert.equal(s.lastSnapshotCompletedAt, 200, 'a replay must not advance freshness');
});

// =====================================================================
// Round 2: snapshot integrity. A full-draft snapshot is a COMPLETE picture,
// so an older one has nothing to contribute and must be refused wholesale.
// =====================================================================

test('REGRESSION: an older snapshot cannot introduce a previously unseen pick', () => {
  const s = fresh();
  // Newer snapshot says the draft is empty.
  applySnapshot(s, snap([]), 500, 600);

  // An older response arrives carrying a pick we have never recorded. Tombstones
  // cannot help here -- there was never a reversal to remember.
  const r = applySnapshot(s, snap([P(1, 111)]), 100, 700);

  assert.equal(r.applied, false, 'a snapshot older than the newest applied is refused');
  assert.equal(confirmedCount(s), 0);
  assert.equal(confirmedPlayerIds(s).has(111), false);
});

test('REGRESSION: an out-of-order older snapshot does not remove an automatic live pick', () => {
  const s = fresh();
  observeFrame(s, { playerId: 111, leagueId: 1 }, 1000);
  applySnapshot(s, snap([]), 2000, 2100);          // newest
  applySnapshot(s, snap([]), 1500, 2200);          // older, refused
  assert.equal(confirmedPlayerIds(s).has(111), true);
});

test('REGRESSION: a snapshot with no picks array is refused, not read as an empty draft', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111), P(2, 222)]), 100, 200);
  assert.equal(confirmedCount(s), 2);

  // A successful HTTP response whose body lacked draftDetail.picks.
  const r = applySnapshot(s, { leagueId: 1 }, 300, 400);
  assert.equal(r.applied, false);
  assert.equal(r.reason, 'incomplete snapshot');
  assert.equal(confirmedCount(s), 2, 'missing data must never erase confirmed picks');

  assert.equal(applySnapshot(s, { leagueId: 1, picks: null }, 500, 600).applied, false);
  assert.equal(applySnapshot(s, { leagueId: 1, picks: 'nope' }, 700, 800).applied, false);
  assert.equal(confirmedCount(s), 2);
});

test('a genuinely empty draft IS accepted when picks is a real empty array', () => {
  const s = fresh();
  const r = applySnapshot(s, snap([]), 100, 200);
  assert.equal(r.applied, true, 'an empty array is data; a missing field is not');
});

test('REGRESSION: pre-observation snapshots cannot undo an automatic live pick', () => {
  const s = fresh();
  // Two requests are already in flight when the frame arrives.
  const inFlightA = 900;
  const inFlightB = 950;
  observeFrame(s, { playerId: 111, leagueId: 1 }, 1000);

  // Both return successfully, but neither could have known about a pick made after
  // they were issued.
  applySnapshot(s, snap([]), inFlightB, 1100);
  applySnapshot(s, snap([]), inFlightA, 1150);
  assert.equal(confirmedPlayerIds(s).has(111), true);

  // Later snapshots still do not silently return it to the pool in automatic mode.
  applySnapshot(s, snap([]), 2000, 2100);
  applySnapshot(s, snap([]), 3000, 3100);
  assert.equal(confirmedPlayerIds(s).has(111), true);
});

test('REGRESSION: a local undo tombstone blocks an older snapshot from resurrecting a pick', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111)]), 100, 200);
  undoPick(s, 1, 250);

  const r = applySnapshot(s, snap([P(1, 111)]), 200, 300);

  assert.equal(r.applied, true);
  assert.equal(r.ignoredStale, 1);
  assert.equal(confirmedCount(s), 0);
  assert.equal(s.reversed[1], 250);
});

test('REGRESSION: malformed pick numbers are refused without mutating state', () => {
  const s = fresh();
  applySnapshot(s, snap([P(1, 111)]), 100, 200);

  const r = applySnapshot(s, {
    leagueId: 1,
    picks: [{ overallPickNumber: 'not-a-number', playerId: 222 }],
  }, 300, 400);

  assert.equal(r.applied, false);
  assert.equal(r.reason, 'invalid pick number');
  assert.equal(confirmedCount(s), 1);
  assert.equal(s.confirmed[1].playerId, 111);
});

test('REGRESSION: malformed imported state is normalized to safe shapes', () => {
  const s = deserialize({
    leagueId: 1,
    confirmed: { bad: null, 1: { playerId: 111 }, 2: { playerId: 0 } },
    pending: [{ playerId: 222 }, null, { playerId: 0 }],
    conflicts: [null, { id: 4 }],
    reversed: { 1: '250', bad: 'x' },
    latencySamples: [100, 'bad', -1],
  });

  assert.deepEqual(Object.keys(s.confirmed), ['1', '2']);
  assert.equal(s.pending.length, 0);
  assert.deepEqual(s.conflicts, [{ id: 4 }]);
  assert.deepEqual(s.reversed, { 1: 250 });
  assert.deepEqual(s.latencySamples, [100]);
});
