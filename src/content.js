/**
 * ISOLATED-world content script. A SENSOR, not a system of record.
 *
 * It observes and reports. It owns no draft state and decides nothing. The side panel
 * holds state and applies the reconciliation rules, which is what lets the board work
 * with no ESPN tab open.
 *
 * Single file by necessity: MV3 manifest content scripts cannot be ES modules.
 *
 * Two delivery paths, deliberately:
 *   - runtime messages, for immediacy while the panel is open
 *   - chrome.storage writes, so a panel that was closed self-heals on reopen instead
 *     of silently missing everything that happened meanwhile
 *
 * Fetching happens here because lm-api-reads.fantasy.espn.com was observed reflecting
 * arbitrary origins with Access-Control-Allow-Credentials: true, so a content script on
 * espn.com can read it with the browser's own cookies and no host_permissions. That was
 * an observation, not a guarantee -- every origin must be re-tested, and a failure here
 * degrades to manual entry rather than breaking the board.
 *
 * We never read, request, or transmit espn_s2 or SWID. The browser attaches them.
 */
(() => {
  'use strict';

  const CHANNEL = '__draft_copilot_bridge__';
  const API = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl';
  const SEASON = 2026;

  // defaultPositionId enum. NOT the lineupSlot enum -- they collide at 16, and using
  // the wrong one silently relabels every TE as a WR.
  const POS = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DST' };

  let leagueId = null;
  let scoring = null;
  let poolLoaded = false;
  let consecutiveFailures = 0;

  const log = (m, x) => console.log('[DraftCopilot/sensor]', m, x === undefined ? '' : x);

  const send = (msg) => {
    try {
      chrome.runtime.sendMessage(msg, () => { void chrome.runtime.lastError; });
    } catch (_) { /* panel closed or context torn down */ }
  };

  // ------------------------------------------------------------ bridge in

  document.addEventListener(CHANNEL, (ev) => {
    const d = ev.detail || {};
    const p = d.payload || {};

    if (d.kind === 'identity') {
      const next = p.leagueId ? Number(p.leagueId) : null;
      // Identity changing invalidates everything cached for the previous league.
      // Without this, poolLoaded and scoring from league A suppress the loads that
      // league B needs, and B silently runs on A's data.
      if (next && next !== leagueId) {
        leagueId = next;
        scoring = null;
        poolLoaded = false;
        consecutiveFailures = 0;
        log('league identity changed to ' + next + '; sensor caches cleared');
      }
      send({ type: 'dc.identity', leagueId: p.leagueId, teamId: p.teamId });
      boot();
    } else if (d.kind === 'ws-open' && p.isDraft) {
      send({ type: 'dc.transport', transport: 'websocket' });
    } else if (d.kind === 'sse-open' && p.isDraft) {
      send({ type: 'dc.transport', transport: 'sse' });
    } else if (d.kind === 'frame') {
      // The frame carries the league of the connection that produced it. Never fall
      // back to the module-level value: an older socket can emit after a newer one
      // changed it, and async Blob decoding delays delivery further.
      parseFrames(p.data, p.leagueId);
    }
  });

  /**
   * SELECTED <teamId> <playerId> <slotId>
   *
   * Note there is no overall pick number in this payload, so nothing downstream can
   * check pick monotonicity from a frame. That is precisely why frames are reported as
   * provisional observations rather than as picks.
   */
  function parseFrames(raw, frameLeagueId) {
    if (typeof raw !== 'string' || !raw) return;
    // A frame without its originating connection's league cannot be attributed, and
    // guessing is exactly the bug. Drop it rather than mislabel it.
    if (frameLeagueId == null) {
      log('frame dropped: no connection league identity');
      return;
    }
    const league = Number(frameLeagueId);
    if (!league) return;

    for (const line of raw.split('\n')) {
      const t = line.trim().split(/\s+/);
      if (!t[0]) continue;
      const verb = t[0].toUpperCase();
      if ((verb === 'SELECTED' && t.length >= 4) || (verb === 'SOLD' && t.length >= 5)) {
        send({
          type: 'dc.observation',
          playerId: Number(t[2]),
          teamId: Number(t[1]),
          lineupSlotId: Number(t[3]),
          leagueId: league,
          observedAt: Date.now(),
        });
      }
    }
  }

  // ---------------------------------------------------------------- fetching

  async function espn(url, filter) {
    const headers = { accept: 'application/json' };
    // Casing matters. A lowercase or wrongly nested filter is ignored silently and
    // returns the entire player universe (~39MB) with no error.
    if (filter) headers['X-Fantasy-Filter'] = JSON.stringify(filter);
    const res = await fetch(url, { credentials: 'include', headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // Takes the league id explicitly. Closing over the mutable module-level `leagueId`
  // meant a request could be built for league A and its response labelled league B if
  // identity changed mid-flight.
  const leagueUrlFor = (id, views) =>
    API + '/seasons/' + SEASON + '/segments/0/leagues/' + id
    + '?' + views.map((v) => 'view=' + v).join('&');

  function statPoints(statId, posId) {
    const it = scoring && scoring[statId];
    if (!it) return 0;
    // .points reads 0.0 for receptions; the real per-position values are in the
    // overrides map keyed by defaultPositionId.
    if (it.overrides && it.overrides[posId] !== undefined) return Number(it.overrides[posId]);
    return Number(it.points) || 0;
  }

  async function loadSettings() {
    const reqLeague = leagueId;               // pin identity for the whole request
    if (!reqLeague) return;
    const data = await espn(leagueUrlFor(reqLeague, ['mSettings']));
    const s = data.settings || {};
    scoring = {};
    for (const it of ((s.scoringSettings || {}).scoringItems || [])) {
      scoring[it.statId] = { points: it.points || 0, overrides: it.pointsOverrides || null };
    }
    const dump = {
      leagueId: reqLeague,
      size: s.size,
      lineupSlotCounts: (s.rosterSettings || {}).lineupSlotCounts || null,
      scoringItems: (s.scoringSettings || {}).scoringItems || [],
      // Recorded for hand-verification in Phase 2, not consumed as truth yet.
      receptionByPos: { QB: statPoints(53, 1), RB: statPoints(53, 2), WR: statPoints(53, 3), TE: statPoints(53, 4) },
    };
    send({ type: 'dc.settings', leagueId: reqLeague, settings: dump });
    await chrome.storage.local.set({ 'dc.espnSettings': dump, ['dc.espnSettings.' + reqLeague]: dump });
    log('settings cached', dump.receptionByPos);
  }

  /**
   * A snapshot is only reported when the request SUCCEEDS. A failed fetch is not
   * evidence about anything and must never reach the state machine, where it would
   * wrongly advance pending-expiry counters.
   */
  async function snapshot() {
    const reqLeague = leagueId;               // pin identity for the whole request
    if (!reqLeague) return;
    const startedAt = Date.now();
    let data;
    try {
      data = await espn(leagueUrlFor(reqLeague, ['mDraftDetail']));
      consecutiveFailures = 0;
    } catch (e) {
      consecutiveFailures++;
      log('snapshot failed (not reported)', String(e));
      send({ type: 'dc.snapshot-failed', error: String(e), failures: consecutiveFailures });
      return;
    }

    // A 200 is not the same as a complete body. Never synthesise an empty pick list
    // from missing data: downstream that reads as "the draft is empty" and reverses
    // every confirmed pick.
    const dd = data.draftDetail;
    if (!dd || !Array.isArray(dd.picks)) {
      log('snapshot incomplete (not reported): no draftDetail.picks');
      send({ type: 'dc.snapshot-incomplete', leagueId: reqLeague });
      return;
    }

    const picks = [];
    for (const p of dd.picks) {
      // Unfilled slots carry playerId 0/-1. D/ST live in a negative band and are real.
      const id = p.playerId;
      const valid = typeof id === 'number' && (id > 0 || (id <= -16000 && id >= -16100));
      if (!valid) continue;
      picks.push({
        overallPickNumber: p.overallPickNumber,
        playerId: id,
        teamId: p.teamId,
        roundId: p.roundId,
        roundPickNumber: p.roundPickNumber,
        lineupSlotId: p.lineupSlotId,
        autoDraftTypeId: p.autoDraftTypeId,
        keeper: !!p.keeper,
      });
    }

    const pageText = document.body && document.body.innerText;
    const clockMatch = typeof pageText === 'string'
      ? pageText.match(/ON THE CLOCK\s*:\s*PICK\s+(\d+)/i)
      : null;
    const currentPick = clockMatch ? Number(clockMatch[1]) : null;

    // startedAt doubles as the idempotency key: this snapshot is delivered twice on
    // purpose (message for speed, storage for panel-was-closed recovery) and the state
    // machine must recognise the second copy. completedAt is the real freshness stamp,
    // so a cached snapshot replayed later cannot claim to be just-confirmed.
    const payload = {
      type: 'dc.snapshot',
      leagueId: reqLeague,          // the league this data actually came from
      picks: picks,
      currentPick: currentPick,
      startedAt: startedAt,
      completedAt: Date.now(),
    };
    send(payload);
    try {
      await chrome.storage.local.set({ ['dc.lastSnapshot.' + reqLeague]: payload });
    } catch (e) {
      log('snapshot storage write failed', String(e));
    }
  }

  async function loadPool() {
    const reqLeague = leagueId;               // pin identity for the whole request
    if (!reqLeague) return;
    const filter = { players: { limit: 500, sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'PPR' } } };
    const url = API + '/seasons/' + SEASON + '/segments/0/leagues/' + reqLeague + '?view=kona_player_info';
    const data = await espn(url, filter);
    if (!Array.isArray(data.players)) {
      log('pool response incomplete (not reported)');
      return;
    }

    const out = {};
    for (const entry of data.players) {
      const p = entry.player || {};
      const ranks = p.draftRanksByRankType || {};
      const ppr = ranks.PPR || {};
      let proj = null;
      for (const s of (p.stats || [])) {
        if (s.statSourceId === 1 && s.seasonId === SEASON && !s.scoringPeriodId) {
          if (typeof s.appliedTotal === 'number') proj = Math.round(s.appliedTotal * 10) / 10;
          break;
        }
      }
      out[p.id] = {
        id: p.id,
        name: p.fullName,
        pos: POS[p.defaultPositionId] || ('pos' + p.defaultPositionId),
        posId: p.defaultPositionId,
        proTeamId: p.proTeamId,
        byeWeek: Number.isInteger(p.byeWeek) ? p.byeWeek
          : (Number.isInteger(p.byeWeekId) ? p.byeWeekId : null),
        // rank and adp are DIFFERENT measurements. Kept separate, never substituted.
        rank: ppr.rank != null ? ppr.rank : null,
        adp: entry.ownership && entry.ownership.averageDraftPosition != null
          ? entry.ownership.averageDraftPosition : null,
        injury: p.injuryStatus || null,
        eligible: p.eligibleSlots || [],
        proj: proj,
      };
    }
    poolLoaded = true;
    send({ type: 'dc.pool', leagueId: reqLeague, players: out });
    try {
      // Namespaced per league: a mock draft's pool must never overwrite the real one.
      await chrome.storage.local.set({ ['dc.pool.' + reqLeague]: out });
    } catch (e) {
      send({ type: 'dc.storage-error', error: String(e) });
    }
    log('pool cached: ' + Object.keys(out).length);
  }

  // -------------------------------------------------------------- bootstrap

  function detectLeagueId() {
    const m = location.href.match(/leagueId=(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  let booting = false;
  async function boot() {
    if (booting) return;
    booting = true;
    try {
      if (!leagueId) leagueId = detectLeagueId();
      if (!leagueId) { log('no leagueId yet'); return; }
      if (!scoring) await loadSettings();
      await snapshot();
      if (!poolLoaded) await loadPool();
    } catch (e) {
      log('boot error', String(e));
      send({ type: 'dc.sensor-error', error: String(e) });
    } finally {
      booting = false;
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg && msg.type === 'dc.refresh') {
      boot().then(() => reply({ ok: true })).catch((e) => reply({ ok: false, error: String(e) }));
      return true;
    }
    return false;
  });

  // Reconciliation poll. Slow by default; freshness vs. trust is measured in Phase 1
  // and this interval is one of the knobs that gets tuned from that measurement.
  setInterval(() => { if (leagueId) snapshot(); }, 20000);

  boot();
  setTimeout(boot, 5000);
  log('sensor ready on ' + location.pathname);
})();
