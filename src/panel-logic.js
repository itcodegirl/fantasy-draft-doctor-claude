/**
 * Pure panel logic, split out of sidepanel.js so it can be tested without a DOM or a
 * chrome runtime.
 *
 * These are where the silent bugs lived: export dropping the player
 * pool, freshness reading the wrong timestamp, and league routing merging a mock draft
 * into the real board. Rendering bugs are visible; these were not.
 */

export const DEFAULT_CONFIG = {
  myTeamId: null,
  mySlot: null,
  leagueId: null,
  // Validation gates. Per-league, because config is per-league: a mock draft passing
  // transport says nothing about the real league until you record it there too.
  transportValidated: false,
  transportValidatedAt: null,
  transportNotes: null,
  scoringValidated: false,
  scoringValidatedAt: null,
  scoringNotes: null,
  espnSettings: null,
  expertRanks: {},
  byeWeeksByPlayerId: {},
  // A real switch, not a label: when true the session refuses live snapshots and
  // observations outright, so "manual mode" actually stops synchronising.
  syncPaused: false,
};

export const GATES = ['transport', 'scoring'];

/**
 * Build the config patch that flips a validation gate.
 *
 * Passing a gate REQUIRES a note saying what was actually verified. A gate is a record
 * that a human did the check, not a toggle -- an unlabelled "PASS" is indistinguishable
 * from a misclick, and valuation on an unvalidated gate looks authoritative while being
 * wrong. Revoking never needs a note.
 *
 * Pure, so it can be tested without a session.
 */
export function gatePatch(gate, passed, notes, at) {
  if (GATES.indexOf(gate) === -1) throw new Error('unknown gate: ' + gate);
  const note = notes == null ? '' : String(notes).trim();
  if (passed && !note) {
    throw new Error(gate + ' gate: a note describing what was verified is required');
  }
  const patch = {};
  patch[gate + 'Validated'] = !!passed;
  patch[gate + 'ValidatedAt'] = passed ? at : null;
  patch[gate + 'Notes'] = passed ? note : null;
  return patch;
}

export const EXPORT_FORMAT_VERSION = 1;

/**
 * Build the transfer payload. The pool must be included in full: exporting only a
 * count produced an empty board on the destination machine, which is the one job
 * export has.
 */
export function buildExport(leagueId, config, state, pool, isoNow) {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    leagueId: leagueId,
    exportedAt: isoNow,
    config: config,
    state: state,
    pool: pool || {},
  };
}

/**
 * Parse a transfer payload. Throws rather than half-applying: a partially imported
 * board is worse than a refused one.
 */
export function parseImport(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') throw new Error('not an object');

  const leagueId = parsed.leagueId != null
    ? Number(parsed.leagueId)
    : (parsed.config && parsed.config.leagueId != null ? Number(parsed.config.leagueId) : null);
  if (!leagueId) throw new Error('file has no league id');

  const config = Object.assign({}, DEFAULT_CONFIG, parsed.config || {});
  config.leagueId = leagueId;

  const pool = parsed.pool && typeof parsed.pool === 'object' ? parsed.pool : {};

  return {
    leagueId: leagueId,
    config: config,
    state: parsed.state || null,
    pool: pool,
    poolCount: Object.keys(pool).length,
  };
}

/**
 * Sync freshness. Reads lastSnapshotCompletedAt -- when the snapshot actually
 * completed -- not when it was applied. Applying a cached snapshot on panel reopen
 * previously made an offline board announce itself as just-confirmed.
 */
export function freshness(state, nowMs, staleAfterMs = 90000) {
  const at = state ? state.lastSnapshotCompletedAt : null;
  if (!at) return { status: 'offline', ageMs: null, label: 'offline — manual entry' };
  const ageMs = nowMs - at;
  if (ageMs > staleAfterMs) return { status: 'stale', ageMs: ageMs, label: 'sync stale' };
  return { status: 'live', ageMs: ageMs, label: 'synced' };
}

/**
 * Decide what to do with an inbound message's league id.
 *
 * Switching is NOT automatic once a league is active. With a mock draft and the real
 * draft open in two tabs, auto-switching makes the board thrash between them, and
 * overlapping async loads can leave state from one league labelled as the other. So a
 * foreign league is offered to the user, never taken.
 *
 *   'accept'       this message belongs to the active league (or carries no league)
 *   'adopt'        nothing is active yet; first league seen is safe to take
 *   'offer-switch' a different league exists; ask, do not act
 *   'ignore'       unusable id
 */
export function routeLeague(msgLeagueId, activeLeagueId) {
  if (msgLeagueId == null) return 'accept';
  const id = Number(msgLeagueId);
  if (!id) return 'ignore';
  if (activeLeagueId == null) return 'adopt';
  return id === Number(activeLeagueId) ? 'accept' : 'offer-switch';
}

/**
 * One line summarising autodraft detection for the panel.
 *
 * Kept here rather than in `sidepanel.js` for the reason at the top of this file: the
 * wording is a claim about certainty, and a claim about certainty deserves a test. High
 * and medium confidence are phrased differently on purpose -- "is autodrafting" and
 * "may be" are not the same statement, and only the first one moves players off the board.
 *
 * Returns null when there is nothing to say, so the caller can hide the line entirely
 * rather than printing a reassuring "no autodrafters detected" that would be indistinguishable
 * from detection never having run.
 */
export function autodraftSummary(autodraft) {
  if (!autodraft || !autodraft.teams || !autodraft.teams.length) return null;
  const confirmed = autodraft.teams.filter((t) => t.confidence === 'high');
  const suspected = autodraft.teams.filter((t) => t.confidence !== 'high');
  const names = (list) => list.map((t) => 'team ' + t.teamId).join(', ');

  if (!confirmed.length) {
    return {
      tone: 'suspected',
      text: names(suspected) + ' may be autodrafting — too few straight ranked-list'
        + ' picks to project from yet.',
    };
  }

  const gone = autodraft.projected ? autodraft.projected.length : 0;
  const bits = [
    names(confirmed) + (confirmed.length === 1 ? ' is' : ' are') + ' autodrafting',
    gone === 1 ? '1 player projected taken before your pick' : gone + ' players projected taken before your pick',
  ];
  if (autodraft.unknownPicks) {
    bits.push(autodraft.unknownPicks + (autodraft.unknownPicks === 1 ? ' pick' : ' picks')
      + ' in between belong to live managers and are not predicted');
  }
  if (suspected.length) bits.push(names(suspected) + ' may be too');
  return { tone: 'confirmed', text: bits.join(' · ') + '.' };
}

/** Storage keys, namespaced per league so nothing is shared across drafts. */
export const KEY_ACTIVE = 'dc.activeLeague';
export const keyState = (id) => 'dc.state.' + id;
export const keyPool = (id) => 'dc.pool.' + id;
export const keyConfig = (id) => 'dc.config.' + id;
export const keySnapshot = (id) => 'dc.lastSnapshot.' + id;
export const keySettings = (id) => 'dc.espnSettings.' + id;
