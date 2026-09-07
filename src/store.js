/**
 * Draft state machine.
 *
 * Pure module: no chrome.* APIs, no DOM, no network, no clock of its own (callers pass
 * `now`). That is deliberate -- this is the highest-risk correctness surface in the
 * build, so it has to be testable in isolation.
 *
 * The central distinction:
 *
 *   CONFIRMED  a pick corroborated by a REST snapshot, or entered manually by the user.
 *   LIVE-AUTO  an observation from a live frame accepted immediately so drafted players
 *              cannot reappear in the recommendation pool.
 *
 * Live frames arrive over a CustomEvent bridge, which is a public channel. Validation
 * cannot reject a well-formed forgery carrying plausible IDs, so automatic live mode is
 * an intentional read-only trust tradeoff.
 *
 * Distinguishing a stale response from a real reversal is done with REQUEST-START TIME,
 * not pick numbers. A pick number cannot version state: a commissioner undo legitimately
 * reduces the count, and a corrected selection changes the player without changing the
 * number.
 */

export const PENDING_EXPIRY_SNAPSHOTS = 2;

export function createState() {
  return {
    leagueId: null,
    seasonId: null,
    // overallPickNumber -> pick record
    confirmed: {},
    // provisional observations from live frames
    pending: [],
    // things a human needs to resolve; never auto-resolved
    conflicts: [],
    // monotonic id for pending observations
    seq: 1,
    lastSnapshotAt: null,
    lastSnapshotStartedAt: null,
    // When the newest snapshot actually COMPLETED, which is not the same as when we
    // got around to applying it. Replaying a cached snapshot must not advertise
    // freshness it does not have.
    lastSnapshotCompletedAt: null,
    lastFrameAt: null,
    // Highest draft pick number observed in ESPN's live page. This can be ahead of
    // the REST pick list when ESPN returns only a partial snapshot.
    currentPick: 0,
    // Tombstones: pickNumber -> when it was reversed. Without these, an older
    // in-flight response that still lists a reversed pick will resurrect it, because
    // once deleted there is no confirmedAt left to compare against.
    reversed: {},
    // Idempotency keys. The sensor delivers each snapshot twice on purpose (message
    // for speed, storage for panel-was-closed recovery), so the state machine has to
    // recognise the second copy or pending-expiry counts double.
    appliedSnapshots: [],
    // Newest request-start time we have accepted. Anything older is a complete but
    // outdated picture of the draft and is refused outright.
    newestSnapshotStartedAt: null,
    // frame-to-confirmation latency samples, ms
    latencySamples: [],
  };
}

/**
 * Switching leagues -- a mock draft, then the real one -- must not carry state across.
 * Everything draft-scoped is discarded; nothing is merged.
 */
export function resetForLeague(state, leagueId) {
  const fresh = createState();
  fresh.leagueId = leagueId != null ? Number(leagueId) : null;
  fresh.seq = state.seq;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  return state;
}

// ------------------------------------------------------------------ helpers

function pickRecord(p, source, now) {
  return {
    overallPickNumber: p.overallPickNumber,
    playerId: p.playerId,
    teamId: p.teamId,
    roundId: p.roundId != null ? p.roundId : null,
    roundPickNumber: p.roundPickNumber != null ? p.roundPickNumber : null,
    lineupSlotId: p.lineupSlotId != null ? p.lineupSlotId : null,
    autoDraftTypeId: p.autoDraftTypeId != null ? p.autoDraftTypeId : null,
    keeper: !!p.keeper,
    source: source,
    confirmedAt: now,
  };
}

function addConflict(state, kind, detail, now) {
  state.conflicts.push({ id: state.seq++, kind: kind, detail: detail, at: now, resolved: false });
}

/** D/ST occupy a negative id band; 0 and -1 mark an unfilled pick slot. */
export function isValidPlayerId(id) {
  if (typeof id !== 'number' || Number.isNaN(id)) return false;
  if (id > 0) return true;
  return id <= -16000 && id >= -16100;
}

// -------------------------------------------------------------- live frames

/**
 * Record a live selection immediately. The user asked for a fully automatic draft
 * board, so a valid ESPN live event is authoritative enough to remove the player and
 * include the pick in roster/recommendation calculations. REST snapshots can still
 * correct the assigned overall pick when they become available.
 */
export function observeFrame(state, obs, now) {
  if (!isValidPlayerId(obs.playerId)) {
    return { accepted: false, reason: 'invalid playerId' };
  }
  if (obs.leagueId != null && state.leagueId != null && Number(obs.leagueId) !== Number(state.leagueId)) {
    return { accepted: false, reason: 'wrong league' };
  }
  // Already settled by a trusted path -- nothing more to add.
  if (findConfirmedByPlayer(state, obs.playerId)) {
    return { accepted: false, reason: 'already confirmed' };
  }

  const n = nextOpenPickNumber(state);
  state.confirmed[n] = pickRecord({
    overallPickNumber: n,
    playerId: obs.playerId,
    teamId: obs.teamId != null ? obs.teamId : null,
    lineupSlotId: obs.lineupSlotId != null ? obs.lineupSlotId : null,
  }, 'live-auto', now);
  state.lastFrameAt = now;
  return { accepted: true, confirmed: true, overallPickNumber: n };
}

export function findConfirmedByPlayer(state, playerId) {
  for (const k of Object.keys(state.confirmed)) {
    if (state.confirmed[k].playerId === playerId) return state.confirmed[k];
  }
  return null;
}

// ---------------------------------------------------------------- snapshots

/**
 * Apply a REST snapshot.
 *
 * `startedAt` is when the REQUEST was issued, not when it returned. That is what makes
 * stale-vs-reversal decidable: a snapshot cannot be evidence about a pick that was
 * confirmed after the snapshot was requested, because the server could not have known.
 *
 * Only successful, relevant snapshots count. A failed request is not evidence against
 * anything and must never reach this function.
 */
export function applySnapshot(state, snapshot, startedAt, now) {
  const refused = (reason) => ({
    applied: false, reason: reason,
    added: 0, corrected: 0, reversed: 0, ignoredStale: 1, conflicts: 0,
  });

  if (snapshot.leagueId != null && state.leagueId != null
      && Number(snapshot.leagueId) !== Number(state.leagueId)) {
    return { applied: false, reason: 'wrong league', added: 0, corrected: 0, reversed: 0, ignoredStale: 0, conflicts: 0 };
  }

  // A successful HTTP response is not the same as a complete one. If the body lacked
  // draftDetail.picks we must refuse it, because reading "missing" as "empty draft"
  // reverses every confirmed pick at once.
  if (!Array.isArray(snapshot.picks)) {
    return refused('incomplete snapshot');
  }

  // One fetch, two delivery paths. startedAt is generated once per fetch by the
  // sensor, so it is the natural idempotency key. Without this, every snapshot is
  // processed twice and a pending observation expires after one real fetch.
  if (startedAt != null && state.appliedSnapshots.indexOf(startedAt) !== -1) {
    return { applied: false, reason: 'duplicate snapshot', added: 0, corrected: 0, reversed: 0, ignoredStale: 0, conflicts: 0 };
  }

  // Snapshot-level staleness. An older response can introduce a pick we have never
  // seen, so refuse it wholesale. A newer response may still be partial; omissions
  // are handled below as non-destructive because they are not proof of an undo.
  if (startedAt != null && state.newestSnapshotStartedAt != null
      && startedAt < state.newestSnapshotStartedAt) {
    return refused('stale snapshot');
  }

  if (startedAt != null) {
    state.appliedSnapshots.push(startedAt);
    if (state.appliedSnapshots.length > 40) state.appliedSnapshots.shift();
    if (state.newestSnapshotStartedAt == null || startedAt > state.newestSnapshotStartedAt) {
      state.newestSnapshotStartedAt = startedAt;
    }
  }

  const incoming = {};
  for (const p of snapshot.picks || []) {
    if (!isValidPlayerId(p.playerId)) continue; // unfilled slot
    if (!isValidPickNumber(p.overallPickNumber)) {
      return refused('invalid pick number');
    }
    incoming[p.overallPickNumber] = p;
  }

  const result = { applied: true, added: 0, corrected: 0, reversed: 0, ignoredStale: 0, conflicts: 0 };

  // --- additions and corrections
  for (const key of Object.keys(incoming)) {
    const p = incoming[key];
    const existing = state.confirmed[key];

    // A live event has no overall pick number, so it is initially assigned to the
    // next open slot. When REST later supplies the real number, move that same player
    // instead of leaving a duplicate live-auto record behind.
    const liveRecord = findConfirmedByPlayer(state, p.playerId);
    if (liveRecord && Number(liveRecord.overallPickNumber) !== Number(key)
        && liveRecord.source === 'live-auto') {
      delete state.confirmed[liveRecord.overallPickNumber];
      state.confirmed[key] = pickRecord(p, 'rest', now);
      result.corrected++;
      continue;
    }

    if (!existing) {
      // A pick we previously reversed. Only a snapshot requested AFTER the reversal
      // can legitimately re-add it; an older one is just stale data describing the
      // world before the undo.
      const reversedAt = state.reversed[key];
      if (reversedAt != null && startedAt < reversedAt) {
        result.ignoredStale++;
        continue;
      }
      state.confirmed[key] = pickRecord(p, 'rest', now);
      delete state.reversed[key];
      result.added++;
      settlePending(state, p.playerId, now);
      continue;
    }

    if (existing.playerId === p.playerId) {
      // Agreement on WHO, but REST may know things the local record does not --
      // notably teamId, which a manual entry cannot supply and which the roster view
      // depends on. Absorb metadata without disturbing provenance.
      if (p.teamId != null) existing.teamId = p.teamId;
      if (p.roundId != null) existing.roundId = p.roundId;
      if (p.roundPickNumber != null) existing.roundPickNumber = p.roundPickNumber;
      if (p.lineupSlotId != null) existing.lineupSlotId = p.lineupSlotId;
      if (p.autoDraftTypeId != null) existing.autoDraftTypeId = p.autoDraftTypeId;
      settlePending(state, p.playerId, now);
      continue;
    }

    // Same pick number, different player. Either a correction, or this response is
    // older than what we already know.
    if (startedAt < existing.confirmedAt) {
      result.ignoredStale++;
      continue;
    }
    if (existing.source === 'manual') {
      // Never silently overwrite the user, and never silently keep their version.
      addConflict(state, 'snapshot-contradicts-manual', {
        overallPickNumber: Number(key),
        manualPlayerId: existing.playerId,
        snapshotPlayerId: p.playerId,
      }, now);
      result.conflicts++;
      continue;
    }
    state.confirmed[key] = pickRecord(p, 'rest', now);
    result.corrected++;
    settlePending(state, p.playerId, now);
  }

  // --- missing rows. ESPN's draft-detail response can be partial during a live
  // draft. Absence from that response is therefore not enough to undo a confirmed
  // pick; doing so would put already-drafted players back on the recommendation
  // board. Explicit local undo remains available through undoPick().
  for (const key of Object.keys(state.confirmed)) {
    if (incoming[key]) continue;
    const existing = state.confirmed[key];

    // The snapshot was requested before we learned this -- absence proves nothing.
    if (startedAt < existing.confirmedAt) {
      result.ignoredStale++;
      continue;
    }
    // Keep the record. The endpoint does not provide a reliable signal that a
    // missing row was commissioner-removed, and retaining it is safer for a
    // read-only assistant than recommending a player who was already drafted.
    result.ignoredStale++;
  }

  // --- pending expiry: only successful, relevant, POST-OBSERVATION snapshots count.
  // A request issued before we saw the frame could not possibly have known about it,
  // so it is not evidence of absence.
  const survivors = [];
  for (const obs of state.pending) {
    if (startedAt != null && startedAt <= obs.observedAt) {
      survivors.push(obs);
      continue;
    }
    obs.successfulSnapshots += 1;
    if (obs.successfulSnapshots >= PENDING_EXPIRY_SNAPSHOTS) {
      addConflict(state, 'pending-expired-uncorroborated', {
        playerId: obs.playerId,
        teamId: obs.teamId,
        observedAt: obs.observedAt,
      }, now);
      result.conflicts++;
      continue;
    }
    survivors.push(obs);
  }
  state.pending = survivors;

  state.lastSnapshotAt = now;
  state.lastSnapshotStartedAt = startedAt;
  // Freshness reflects the newest snapshot only. Applying an older cached one late
  // must not make a stale board advertise itself as just-confirmed.
  if (state.lastSnapshotCompletedAt == null || now > state.lastSnapshotCompletedAt) {
    state.lastSnapshotCompletedAt = now;
  }
  return result;
}

/** A live observation that a snapshot has now corroborated. Records latency. */
function settlePending(state, playerId, now) {
  const idx = state.pending.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return;
  const obs = state.pending[idx];
  state.pending.splice(idx, 1);
  const latency = now - obs.observedAt;
  if (latency >= 0 && latency < 15 * 60 * 1000) {
    state.latencySamples.push(latency);
    if (state.latencySamples.length > 100) state.latencySamples.shift();
  }
}

// ------------------------------------------------------------------- manual

export function manualPick(state, entry, now) {
  if (!isValidPlayerId(entry.playerId)) return { ok: false, reason: 'invalid playerId' };
  const existingByPlayer = findConfirmedByPlayer(state, entry.playerId);
  if (existingByPlayer) return { ok: false, reason: 'already drafted' };

  const n = entry.overallPickNumber != null
    ? entry.overallPickNumber
    : nextOpenPickNumber(state);

  state.confirmed[n] = pickRecord(
    { overallPickNumber: n, playerId: entry.playerId, teamId: entry.teamId },
    'manual', now
  );
  const idx = state.pending.findIndex((p) => p.playerId === entry.playerId);
  if (idx !== -1) state.pending.splice(idx, 1);
  return { ok: true, overallPickNumber: n };
}

export function undoPick(state, overallPickNumber, actionAt = Date.now()) {
  const n = overallPickNumber != null ? overallPickNumber : highestPickNumber(state);
  if (n == null || !state.confirmed[n]) return { ok: false, reason: 'no such pick' };
  const removed = state.confirmed[n];
  delete state.confirmed[n];
  // A local undo is a correction too. Without a tombstone, the next full REST
  // snapshot can resurrect the removed pick even when it was requested before this
  // action. The caller supplies the action time so reconciliation stays testable.
  state.reversed[n] = actionAt;
  return { ok: true, removed: removed };
}

/** Promote a provisional observation on the user's say-so. */
export function confirmPending(state, playerId, now) {
  const idx = state.pending.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return { ok: false, reason: 'not pending' };
  const obs = state.pending[idx];
  state.pending.splice(idx, 1);
  const n = nextOpenPickNumber(state);
  state.confirmed[n] = pickRecord(
    { overallPickNumber: n, playerId: obs.playerId, teamId: obs.teamId },
    'manual', now
  );
  return { ok: true, overallPickNumber: n };
}

export function rejectPending(state, playerId) {
  const idx = state.pending.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return { ok: false, reason: 'not pending' };
  state.pending.splice(idx, 1);
  return { ok: true };
}

export function resolveConflict(state, conflictId, resolution, now) {
  const c = state.conflicts.find((x) => x.id === conflictId);
  if (!c) return { ok: false, reason: 'no such conflict' };
  c.resolved = true;
  c.resolution = resolution;
  c.resolvedAt = now;
  return { ok: true };
}

// ------------------------------------------------------------------ queries

export function highestPickNumber(state) {
  const keys = Object.keys(state.confirmed).map(Number);
  return keys.length ? Math.max.apply(null, keys) : null;
}

export function nextOpenPickNumber(state) {
  let n = 1;
  while (state.confirmed[n]) n++;
  return n;
}

export function confirmedCount(state) {
  return Object.keys(state.confirmed).length;
}

/**
 * Player ids that are definitely off the board. Pending observations are NOT included:
 * an unconfirmed frame must not silently remove a player from the pool.
 */
export function confirmedPlayerIds(state) {
  const out = new Set();
  for (const k of Object.keys(state.confirmed)) out.add(state.confirmed[k].playerId);
  return out;
}

export function pendingPlayerIds(state) {
  return new Set(state.pending.map((p) => p.playerId));
}

export function openConflicts(state) {
  return state.conflicts.filter((c) => !c.resolved);
}

/** Observed frame-to-confirmation latency. A working hook does not prove freshness. */
export function latencyStats(state) {
  const s = state.latencySamples;
  if (!s.length) return { count: 0, medianMs: null, maxMs: null };
  const sorted = s.slice().sort((a, b) => a - b);
  return {
    count: sorted.length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    maxMs: sorted[sorted.length - 1],
  };
}

export function sortedPicks(state) {
  return Object.keys(state.confirmed)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => state.confirmed[n]);
}

// --------------------------------------------------------- serialisation

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  const base = createState();
  if (!json) return base;
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base;

    if (parsed.leagueId == null || Number.isFinite(Number(parsed.leagueId))) {
      base.leagueId = parsed.leagueId == null ? null : Number(parsed.leagueId);
    }
    if (isRecord(parsed.confirmed)) {
      for (const [key, value] of Object.entries(parsed.confirmed)) {
        const n = Number(key);
        if (!isValidPickNumber(n) || !isRecord(value) || !isValidPlayerId(value.playerId)) continue;
        base.confirmed[n] = Object.assign({}, value, { overallPickNumber: n });
      }
    }
    // Migrate state written by the former confirmation-based live flow. Those events
    // were already observed by ESPN's live channel, so automatic mode promotes them
    // on load rather than asking the user to approve them again.
    if (Array.isArray(parsed.pending)) {
      for (const p of parsed.pending) {
        if (!isRecord(p) || !isValidPlayerId(p.playerId) || findConfirmedByPlayer(base, p.playerId)) continue;
        const n = nextOpenPickNumber(base);
        base.confirmed[n] = pickRecord({
          overallPickNumber: n,
          playerId: p.playerId,
          teamId: p.teamId != null ? p.teamId : null,
          lineupSlotId: p.lineupSlotId != null ? p.lineupSlotId : null,
        }, 'live-auto', Number.isFinite(Number(p.observedAt)) ? Number(p.observedAt) : 0);
      }
    }
    if (Array.isArray(parsed.conflicts)) base.conflicts = parsed.conflicts.filter(isRecord);
    for (const c of base.conflicts) {
      if (c.resolved || c.kind !== 'pending-expired-uncorroborated'
          || !c.detail || !isValidPlayerId(c.detail.playerId)
          || findConfirmedByPlayer(base, c.detail.playerId)) continue;
      const n = nextOpenPickNumber(base);
      base.confirmed[n] = pickRecord({
        overallPickNumber: n,
        playerId: c.detail.playerId,
        teamId: c.detail.teamId != null ? c.detail.teamId : null,
      }, 'live-auto', Number.isFinite(Number(c.at)) ? Number(c.at) : 0);
      c.resolved = true;
      c.resolution = 'auto-live';
      c.resolvedAt = Number.isFinite(Number(c.at)) ? Number(c.at) : 0;
    }
    if (isRecord(parsed.reversed)) {
      for (const [key, value] of Object.entries(parsed.reversed)) {
        if (isValidPickNumber(Number(key)) && Number.isFinite(Number(value))) {
          base.reversed[key] = Number(value);
        }
      }
    }
    if (Array.isArray(parsed.appliedSnapshots)) {
      base.appliedSnapshots = parsed.appliedSnapshots.filter(Number.isFinite).slice(-40);
    }
    if (Number.isInteger(parsed.seq) && parsed.seq > 0) base.seq = parsed.seq;
    for (const key of ['lastSnapshotAt', 'lastSnapshotStartedAt', 'lastSnapshotCompletedAt', 'lastFrameAt', 'newestSnapshotStartedAt']) {
      if (parsed[key] == null || Number.isFinite(Number(parsed[key]))) base[key] = parsed[key] == null ? null : Number(parsed[key]);
    }
    if (Number.isInteger(Number(parsed.currentPick)) && Number(parsed.currentPick) >= 0) {
      base.currentPick = Number(parsed.currentPick);
    }
    if (Array.isArray(parsed.latencySamples)) {
      base.latencySamples = parsed.latencySamples.filter((n) => Number.isFinite(n) && n >= 0).slice(-100);
    }
    return base;
  } catch (_) {
    return base;
  }
}

function isRecord(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isValidPickNumber(n) {
  return Number.isInteger(Number(n)) && Number(n) >= 1;
}
