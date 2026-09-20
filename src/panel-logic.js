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

// 2 added the calibration log. Nothing reads the version, so v1 files still import --
// the bump is a record that the shape changed.
export const EXPORT_FORMAT_VERSION = 2;

/**
 * Build the transfer payload. The pool must be included in full: exporting only a
 * count produced an empty board on the destination machine, which is the one job
 * export has.
 */
export function buildExport(leagueId, config, state, pool, isoNow, calibration) {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    leagueId: leagueId,
    exportedAt: isoNow,
    config: config,
    state: state,
    pool: pool || {},
    // The measurement record travels with the board. Without this a mock draft's evidence
    // is stranded in one browser profile's extension storage, which makes the harness
    // unfalsifiable in practice however carefully it scores.
    calibration: calibration && Array.isArray(calibration.forecasts) ? calibration : null,
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

  const calibration = parsed.calibration && Array.isArray(parsed.calibration.forecasts)
    ? parsed.calibration
    : null;

  return {
    leagueId: leagueId,
    config: config,
    state: parsed.state || null,
    pool: pool,
    poolCount: Object.keys(pool).length,
    // Null for a v1 file, which the caller turns into an empty log rather than leaving
    // undefined to propagate into the report.
    calibration: calibration,
    calibrationCount: calibration ? calibration.forecasts.length : 0,
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

/**
 * How a survival probability is allowed to be said out loud.
 *
 * "About 6 in 10" rather than "63%": two significant figures imply a precision this model
 * does not have. The buckets at the ends exist so the wording can never reach certainty --
 * a clamped 0.9999 must not print as "100%", because the certainty channel belongs to the
 * deterministic autodraft projection and nothing else.
 */
export function survivalPhrase(row, nextPick) {
  if (!row || row.survivalToNextTurn == null) return null;
  const p = row.survivalToNextTurn;
  const at = ' still there at #' + nextPick;
  let odds;
  if (p >= 0.9) odds = 'better than 9 in 10';
  else if (p <= 0.1) odds = 'less than 1 in 10';
  else odds = 'about ' + Math.round(p * 10) + ' in 10';
  const qualifier = row.survivalBasis === 'need-conditioned'
    ? ' (need-adjusted)'
    : ' (ADP only \u2014 opponent rosters not usable)';
  return odds + at + qualifier;
}

/**
 * The line under the recommendation list. Returns null when there is nothing to say, for
 * the same reason `autodraftSummary` does: an explicit "nothing to report" cannot be told
 * apart from the model never having run.
 */
export function survivalSummary(survival) {
  if (!survival || survival.basis === 'none' || !survival.modelledPicks) return null;
  const bits = [survival.modelledPicks + ' pick' + (survival.modelledPicks === 1 ? '' : 's')
    + ' modelled before your turn'];
  if (survival.pinnedPicks) {
    bits.push(survival.pinnedPicks + ' more projected from autodraft');
  }
  bits.push(survival.basis === 'need-conditioned'
    ? 'conditioned on opponent roster needs'
    : 'ADP only');
  if (survival.unconditionedPicks) {
    bits.push(survival.unconditionedPicks + ' of them without a usable team id');
  }
  return { text: bits.join(' \u00b7 ') + '.', uncalibrated: true };
}

/**
 * The two scarcity lines: which position waiting costs the most at, and which tier is
 * closest to emptying before your turn.
 *
 * A one-player tier is skipped. "The last man in this tier will be gone" is trivially
 * implied by his own survival number and crowds out the tiers you can still act on --
 * the useful sentence is about a group you might still get one of.
 */
export function scarcitySummary(scarcity, nextPick) {
  if (!scarcity || (!scarcity.vona.length && !scarcity.tiers.length)) return null;
  const lines = [];

  const top = scarcity.vona.filter((v) => v.vona > 0)[0];
  if (top) {
    lines.push('waiting costs most at ' + top.pos + ': about '
      + Math.round(top.vona) + ' projected points between ' + top.bestNow
      + ' and whoever is left at #' + nextPick + '.');
  }

  const tier = scarcity.tiers.filter((t) => t.remaining >= 2)[0];
  if (tier) {
    lines.push('about ' + Math.round(tier.exhaustion * 100) + ' in 100 that all '
      + tier.remaining + ' remaining ' + tier.pos + ' tier-' + tier.tier
      + ' players are gone before #' + nextPick + '.');
  }
  return lines.length ? { lines } : null;
}

/** Storage keys, namespaced per league so nothing is shared across drafts. */
export const KEY_ACTIVE = 'dc.activeLeague';
export const keyState = (id) => 'dc.state.' + id;
export const keyPool = (id) => 'dc.pool.' + id;
export const keyConfig = (id) => 'dc.config.' + id;
export const keySnapshot = (id) => 'dc.lastSnapshot.' + id;
export const keySettings = (id) => 'dc.espnSettings.' + id;
// Its own key rather than a field on state: a local undo or a league reset must not wipe
// the record of how well the model has been predicting.
export const keyCalibration = (id) => 'dc.calibration.' + id;
