/**
 * Side panel view. Rendering and DOM wiring only.
 *
 * All state, league coordination and persistence live in session.js, which is tested
 * with injected storage. This file deliberately holds no copy of that logic -- an
 * untested duplicate of tested logic is how the last round of defects shipped.
 */

import {
  manualPick, undoPick, confirmPending, rejectPending, resolveConflict,
  confirmedPlayerIds, pendingPlayerIds, openConflicts, latencyStats, sortedPicks,
} from './store.js';
import {
  buildExport, parseImport, freshness, autodraftSummary, survivalPhrase, survivalSummary,
  scarcitySummary,
} from './panel-logic.js';
import {
  selectForecastPlayers, openForecast, recordForecast, settleForecasts, brierReport,
} from './calibration.js';
import { createSession } from './session.js';
import { recommend, parseExpertCsv, readSlots, inferDraftSlot } from './recommender.js';

const $ = (id) => document.getElementById(id);
const now = () => Date.now();

// chrome.storage.local adapter. The session never touches chrome.* directly, which is
// what makes it testable.
const storage = {
  get: (keys) => chrome.storage.local.get(keys),
  set: (obj) => chrome.storage.local.set(obj),
};

const session = createSession({ storage, now, onError: showStorageFailure });

// Convenience accessors -- always read through the session, never cache.
const state = () => session.state;
const pool = () => session.pool;
const config = () => session.config;

function provisionalPlayerIds() {
  const ids = pendingPlayerIds(state());
  for (const c of openConflicts(state())) {
    if (c.kind === 'pending-expired-uncorroborated' && c.detail && c.detail.playerId != null) {
      ids.add(c.detail.playerId);
    }
  }
  return ids;
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; session.flush(); }, 250);
}

/** Quota failures must be visible: a half-written pool looks like a working board with
 *  players mysteriously missing. */
function showStorageFailure(e) {
  const box = $('conflicts');
  box.hidden = false;
  const div = document.createElement('div');
  div.className = 'conflict';
  div.textContent = 'Storage write failed: ' + (e && e.message ? e.message : String(e))
    + ' . Your picks may not survive a reload. Export your settings now.';
  $('conflictList').prepend(div);
}

// ------------------------------------------------------ messages from sensor

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'dc.storage-error') { showStorageFailure(new Error(msg.error)); return; }
  session.handleMessage(msg).then((outcome) => {
    if (outcome !== 'ignored') { save(); render(); }
  });
});

// The sensor also writes snapshots to storage, so a panel that was closed catches up.
function watchStorage() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const id = session.activeLeagueId;
    if (id == null) return;

    const snapKey = 'dc.lastSnapshot.' + id;
    if (changes[snapKey] && changes[snapKey].newValue) {
      const s = changes[snapKey].newValue;
      // Deduped on startedAt inside the store, so double delivery is harmless.
      session.handleMessage({
        type: 'dc.snapshot', leagueId: s.leagueId, picks: s.picks,
        currentPick: s.currentPick, startedAt: s.startedAt, completedAt: s.completedAt,
      }).then(() => { save(); render(); });
    }
    const poolKey = 'dc.pool.' + id;
    if (changes[poolKey] && changes[poolKey].newValue) {
      session.handleMessage({ type: 'dc.pool', leagueId: id, players: changes[poolKey].newValue })
        .then(() => render());
    }
  });
}

// --------------------------------------------------------------- rendering

function fmtAgo(ts) {
  if (!ts) return 'never';
  const s = Math.round((now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 90) return s + 's ago';
  return Math.round(s / 60) + 'm ago';
}

function renderStatus() {
  const dot = $('syncDot');
  const text = $('syncText');
  const f = freshness(state(), now());

  if (config().syncPaused) {
    dot.className = 'dot dot-off';
    text.textContent = 'manual mode — live data refused';
  } else {
    dot.className = 'dot ' + (f.status === 'live' ? 'dot-live' : f.status === 'stale' ? 'dot-stale' : 'dot-off');
    text.textContent = f.label;
  }
  $('confirmedAt').textContent = 'last confirmed ' + fmtAgo(state().lastSnapshotCompletedAt);

  // A working hook does not prove freshness. Show measured latency, not just liveness.
  const lat = latencyStats(state());
  const row = $('latencyRow');
  if (lat.count) {
    row.hidden = false;
    row.textContent = 'frame → confirmation: median ' + (lat.medianMs / 1000).toFixed(1)
      + 's, worst ' + (lat.maxMs / 1000).toFixed(1) + 's (' + lat.count + ' samples)';
  } else {
    row.hidden = true;
  }

  // Honest label: passing the scoring gate reveals ESPN's projected points and allows
  // the house recommendation model to run.
  const badge = $('phaseBadge');
  badge.textContent = config().scoringValidated ? 'projections shown' : 'tracking only';
  badge.className = 'badge ' + (config().scoringValidated ? 'badge-ok' : 'badge-warn');

  const league = $('leagueLabel');
  if (league) {
    league.textContent = session.activeLeagueId != null
      ? 'league ' + session.activeLeagueId : 'no league yet';
  }
}

function renderConflicts() {
  const box = $('conflicts');
  const el = $('conflictList');
  el.textContent = '';
  const offer = session.pendingLeagueOffer;
  if (offer == null) {
    // Live ESPN events are automatic now. Historical player conflicts remain in state
    // for migration/debugging, but they must not interrupt the draft with approval UI.
    box.hidden = true;
    return;
  }

  // A different league still requires an explicit switch because changing leagues
  // discards the current board; this is unrelated to approving individual picks.
  box.hidden = false;
  const div = document.createElement('div');
  div.className = 'conflict';
  const p = document.createElement('p');
  p.textContent = 'Another league (' + offer + ') is reporting data. Switch to load it.';
  div.appendChild(p);
  const go = document.createElement('button');
  go.className = 'btn btn-small';
  go.textContent = 'Switch to ' + offer;
  go.onclick = () => { session.acceptOffer().then(() => { syncInputs(); render(); }); };
  const stay = document.createElement('button');
  stay.className = 'btn btn-small';
  stay.textContent = 'Stay';
  stay.onclick = () => { session.clearOffer(); render(); };
  div.append(go, document.createTextNode(' '), stay);
  el.appendChild(div);
}

function describeConflict(c) {
  const nm = (id) => (pool()[id] ? pool()[id].name : 'player ' + id);
  if (c.kind === 'snapshot-contradicts-manual') {
    return 'Pick ' + c.detail.overallPickNumber + ': you recorded ' + nm(c.detail.manualPlayerId)
      + ', ESPN reports ' + nm(c.detail.snapshotPlayerId) + '.';
  }
  if (c.kind === 'snapshot-missing-manual-pick') {
    return 'Pick ' + c.detail.overallPickNumber + ': you recorded ' + nm(c.detail.manualPlayerId)
      + ', but ESPN no longer lists it.';
  }
  if (c.kind === 'pending-expired-uncorroborated') {
    return 'ESPN did not confirm the live event for ' + nm(c.detail.playerId)
      + '. Keep mine if it was drafted, or Use ESPN to return it to the pool.';
  }
  return c.kind;
}

function renderPending() {
  const box = $('pending');
  const el = $('pendingList');
  el.textContent = '';
  const list = state().pending;
  if (!list.length) { box.hidden = true; return; }
  box.hidden = false;

  for (const obs of list) {
    const p = pool()[obs.playerId];
    const row = document.createElement('div');
    row.className = 'item';

    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = p ? p.pos : '?';

    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = p ? p.name : 'player ' + obs.playerId;

    const ok = document.createElement('button');
    ok.className = 'btn btn-small';
    ok.textContent = 'Confirm';
    ok.onclick = () => { confirmPending(state(), obs.playerId, now()); save(); render(); };

    const no = document.createElement('button');
    no.className = 'btn btn-small';
    no.textContent = 'Reject';
    no.onclick = () => { rejectPending(state(), obs.playerId); save(); render(); };

    row.append(pos, nm, ok, no);
    el.appendChild(row);
  }
}

function renderRecommendations() {
  const box = $('recommendations');
  const list = $('recommendationList');
  const note = $('recommendationNote');
  list.textContent = '';
  note.textContent = '';
  const c = config();
  const settings = c.espnSettings;
  const picks = sortedPicks(state());
  const unavailablePlayerIds = provisionalPlayerIds();
  const inferredSlot = c.mySlot || inferDraftSlot(picks, c.myTeamId, settings && settings.size);
  if (c.mySlot == null && inferredSlot != null) {
    session.setConfig({ mySlot: inferredSlot });
    $('mySlot').value = inferredSlot;
    save();
  }
  const result = recommend({
    players: pool(),
    picks,
    currentPick: state().currentPick,
    slots: readSlots(settings && settings.lineupSlotCounts),
    teams: settings && settings.size,
    mySlot: inferredSlot,
    myTeamId: c.myTeamId,
    scoringValidated: c.scoringValidated,
    scoringSummary: settings && settings.receptionByPos,
    experts: c.expertRanks,
    byeWeeks: c.byeWeeksByPlayerId,
    unavailablePlayerIds,
    includeMarketBaseline: true,
  });
  if (result.error) {
    box.hidden = false;
    note.textContent = result.error;
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Recommendations will appear here when setup and scoring validation are complete.';
    list.appendChild(empty);
    $('recommendPick').textContent = '';
    $('autodraftNote').hidden = true;
    $('survivalNote').hidden = true;
    $('scarcityNote').hidden = true;
    $('calibrationNote').hidden = true;
    return;
  }
  box.hidden = false;
  renderAutodraftNote(result.autodraft);
  renderSurvivalNote(result.survival);
  renderScarcityNote(result.scarcity, result.nextPick);
  updateCalibration(result);
  $('recommendPick').textContent = '#' + result.nextPick + ' · round ' + result.round;
  const consensusText = result.expertsAvailable
    ? result.expertsAvailable + ' expert-ranked players blended with the house model'
    : 'Using the house model: ESPN rank + ADP + projections.';
  note.textContent = consensusText + ' Bye conflicts are penalized only when bye-week data is available.';
  result.recommendations.forEach((r, index) => {
    const row = document.createElement('div');
    row.className = 'item' + (index === 0 ? ' recommend-best' : '');
    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = index === 0 ? 'PICK' : '#' + (index + 1);
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = r.name + ' (' + r.pos + ')';
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = Math.round(r.proj * 10) / 10 + ' pts';
    row.append(pos, nm, meta);
    const why = document.createElement('div');
    why.className = 'recommend-why';
    why.textContent = r.why;
    row.appendChild(why);
    const odds = survivalPhrase(r, result.nextPick);
    if (odds) {
      const line = document.createElement('div');
      line.className = 'recommend-survival';
      line.textContent = odds;
      row.appendChild(line);
    }
    list.appendChild(row);
  });
}

/**
 * The autodraft line is hidden when there is nothing to report. An explicit "no
 * autodrafters detected" would be indistinguishable from detection not having run,
 * which is the kind of false reassurance this board is built to avoid.
 */
function renderAutodraftNote(autodraft) {
  const el = $('autodraftNote');
  const summary = autodraftSummary(autodraft);
  if (!summary) {
    el.hidden = true;
    el.textContent = '';
    el.classList.remove('autodraft-suspected');
    return;
  }
  el.hidden = false;
  el.textContent = summary.text;
  el.classList.toggle('autodraft-suspected', summary.tone === 'suspected');
}

function renderSurvivalNote(survival) {
  const el = $('survivalNote');
  const summary = survivalSummary(survival);
  if (!summary) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = summary.text + ' These are model estimates and have not been'
    + ' checked against a real draft yet.';
}

function renderScarcityNote(scarcity, nextPick) {
  const el = $('scarcityNote');
  const summary = scarcitySummary(scarcity, nextPick);
  if (!summary) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = summary.lines.join(' ');
}

/**
 * Open a forecast for this turn, settle anything the board has caught up with, and show
 * the score. The forecast is opened ONCE per target pick -- `recordForecast` refuses a
 * second one, so re-rendering cannot quietly upgrade a prediction with information it
 * did not have when it was made.
 */
function updateCalibration(result) {
  const el = $('calibrationNote');
  const survival = result.survival;
  let log = session.calibration;
  if (survival && survival.byPlayerId && result.nextPick) {
    const scored = selectForecastPlayers(
      Object.keys(survival.byPlayerId).map((id) => pool()[id]).filter(Boolean),
    );
    if (scored.length) {
      log = recordForecast(log, openForecast({
        atPick: result.currentPick,
        targetPick: result.nextPick,
        basis: survival.basis,
        madeAt: now(),
        entries: scored.map((p) => ({
          playerId: p.id,
          p: survival.byPlayerId[String(p.id)],
          pMarket: survival.marketByPlayerId ? survival.marketByPlayerId[String(p.id)] : null,
        })),
      }));
    }
  }
  const added = log.forecasts.length !== session.calibration.forecasts.length;
  const settledLog = settleForecasts(log, sortedPicks(state()));
  // Only write and flush when something actually changed. `settleForecasts` returns a
  // fresh object every call, so identity alone would flush on every render -- and a
  // forecast opened at your turn that never gets flushed is a measurement lost.
  if (added || settledLog.settled) {
    session.setCalibration(settledLog.log);
    save();
  }

  const report = brierReport(session.calibration);
  if (!report.n || report.scoredPicks < 3) {
    el.hidden = report.scoredPicks === 0;
    el.textContent = report.scoredPicks
      ? report.scoredPicks + ' of your picks scored so far \u2014 too few to judge the model.'
      : '';
    return;
  }
  el.hidden = false;
  const parts = ['survival model: Brier ' + report.brier.toFixed(3) + ' over ' + report.n
    + ' predictions across ' + report.scoredPicks + ' of your picks'];
  if (report.skill == null) {
    parts.push('no ADP baseline captured, so there is nothing to compare it against');
  } else if (report.skill > 0) {
    parts.push('ADP-only baseline ' + report.baselineBrier.toFixed(3)
      + ' (' + Math.round(report.skill * 100) + '% better)');
  } else {
    parts.push('ADP-only baseline ' + report.baselineBrier.toFixed(3)
      + ' \u2014 the need model is doing worse; treat the odds as ADP');
  }
  el.textContent = parts.join(' \u00b7 ') + '.';
}

function renderPlayers() {
  const q = $('search').value.trim().toLowerCase();
  const posf = $('posFilter').value;
  const hide = $('hideDrafted').checked;
  const drafted = confirmedPlayerIds(state());
  const pendingIds = provisionalPlayerIds();
  const players = pool();

  let rows = Object.values(players);
  if (posf) rows = rows.filter((p) => p.pos === posf);
  if (q) rows = rows.filter((p) => p.name && p.name.toLowerCase().includes(q));
  // Provisional live picks are removed from the default available board immediately.
  // They remain in the Pending confirmation section so a false event can be rejected
  // and returned to the pool without making the draft list look stale.
  if (hide) rows = rows.filter((p) => !drafted.has(p.id) && !pendingIds.has(p.id));

  // Ordered by ESPN RANK. rank and adp are different measurements; neither ever
  // substitutes for the other.
  rows.sort((a, b) => (a.rank == null ? 1e9 : a.rank) - (b.rank == null ? 1e9 : b.rank));
  const shown = rows.slice(0, 250);

  $('poolCount').textContent = rows.length + ' shown'
    + (Object.keys(players).length ? ' of ' + Object.keys(players).length : '');

  const el = $('playerList');
  el.textContent = '';
  if (!shown.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = Object.keys(players).length
      ? 'No players match.'
      : 'No player pool loaded yet. Open your ESPN draft or league page once while this panel is open.';
    el.appendChild(d);
    return;
  }

  const myTeam = config().myTeamId;
  for (const p of shown) {
    const isDrafted = drafted.has(p.id);
    const row = document.createElement('div');
    row.className = 'item' + (isDrafted ? ' drafted' : '');

    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = p.pos;

    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = p.name + (pendingIds.has(p.id) ? '  • pending' : '');

    const meta = document.createElement('span');
    meta.className = 'meta';
    const bits = [];
    if (p.rank != null) bits.push('rk ' + p.rank);
    if (p.adp != null) bits.push('adp ' + p.adp.toFixed(1));
    if (config().scoringValidated && p.proj != null) bits.push(p.proj + ' pts');
    meta.textContent = bits.join('  ');

    // Two buttons: teamId is what the roster view keys on, so a single "Mark" that
    // recorded null meant manual picks never populated your roster.
    const mine = document.createElement('button');
    mine.className = 'btn btn-small';
    mine.textContent = 'Mine';
    mine.title = myTeam == null ? 'Set your team id below first' : 'Record as your pick';
    mine.disabled = isDrafted || myTeam == null;
    mine.onclick = () => { manualPick(state(), { playerId: p.id, teamId: myTeam }, now()); save(); render(); };

    const other = document.createElement('button');
    other.className = 'btn btn-small';
    other.textContent = isDrafted ? '✓' : 'Gone';
    other.title = 'Record as taken by someone else';
    other.disabled = isDrafted;
    other.onclick = () => { manualPick(state(), { playerId: p.id, teamId: null }, now()); save(); render(); };

    row.append(pos, nm, meta, mine, other);
    el.appendChild(row);
  }
}

function renderRoster() {
  const el = $('rosterList');
  el.textContent = '';
  const myTeam = config().myTeamId;
  const mine = sortedPicks(state()).filter((p) => myTeam != null && p.teamId === myTeam);
  $('rosterCount').textContent = mine.length ? '(' + mine.length + ')' : '';
  if (!mine.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = myTeam == null ? 'Set your team id below to track your roster.' : 'No picks yet.';
    el.appendChild(d);
    return;
  }
  for (const pick of mine) {
    const p = pool()[pick.playerId];
    const row = document.createElement('div');
    row.className = 'item';
    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = p ? p.pos : '?';
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = p ? p.name : 'player ' + pick.playerId;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = 'pk ' + pick.overallPickNumber;
    row.append(pos, nm, meta);
    el.appendChild(row);
  }
}

function renderPickLog() {
  const picks = sortedPicks(state()).slice().reverse();
  $('pickCount').textContent = picks.length ? '(' + picks.length + ')' : '';
  const el = $('pickLog');
  el.textContent = '';
  if (!picks.length) {
    const d = document.createElement('div');
    d.className = 'empty';
    d.textContent = 'No picks recorded.';
    el.appendChild(d);
    return;
  }
  for (const pick of picks.slice(0, 60)) {
    const p = pool()[pick.playerId];
    const row = document.createElement('div');
    row.className = 'item';
    const n = document.createElement('span');
    n.className = 'pos';
    n.textContent = '#' + pick.overallPickNumber;
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = (p ? p.name : 'player ' + pick.playerId)
      + (pick.source === 'manual' ? '  (manual)' : '');
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = pick.teamId != null ? 'tm ' + pick.teamId : '';
    row.append(n, nm, meta);
    el.appendChild(row);
  }
}

function fmtWhen(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch (_) { return String(ts); }
}

/**
 * One gate row: status, what it means, and the control to flip it.
 *
 * Passing requires a typed note -- the gate is a record that a human did the check,
 * not a toggle. Nothing in the extension flips these on its own.
 */
function gateRow(gate, label, description, evidence) {
  const c = config();
  const passed = !!c[gate + 'Validated'];
  const wrap = document.createElement('div');
  wrap.className = 'vgate';

  const row = document.createElement('div');
  row.className = 'vrow';
  const st = document.createElement('span');
  st.className = 'vstate ' + (passed ? 'pass' : 'unknown');
  st.textContent = passed ? 'PASS' : 'NOT YET';
  const txt = document.createElement('span');
  txt.className = 'subtle';
  txt.textContent = label + ' — ' + description;
  row.append(st, txt);
  wrap.appendChild(row);

  if (evidence) {
    const ev = document.createElement('div');
    ev.className = 'subtle vevidence';
    ev.textContent = evidence;
    wrap.appendChild(ev);
  }

  const ctl = document.createElement('div');
  ctl.className = 'row vctl';

  if (passed) {
    const note = document.createElement('span');
    note.className = 'subtle';
    note.textContent = '"' + (c[gate + 'Notes'] || '') + '" · ' + fmtWhen(c[gate + 'ValidatedAt']);
    const revoke = document.createElement('button');
    revoke.className = 'btn btn-small';
    revoke.textContent = 'Revoke';
    revoke.onclick = () => { session.setGate(gate, false); save(); render(); };
    ctl.append(note, revoke);
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'What did you verify? (required)';
    input.className = 'vnote';
    const mark = document.createElement('button');
    mark.className = 'btn btn-small';
    mark.textContent = 'Mark passed';
    mark.onclick = () => {
      const note = input.value.trim();
      if (!note) {
        input.focus();
        return;
      }
      try {
        session.setGate(gate, true, note);
        save(); render();
      } catch (e) {
        showStorageFailure(e);
      }
    };
    ctl.append(input, mark);
  }
  wrap.appendChild(ctl);
  return wrap;
}

function renderValidation() {
  const el = $('validation');
  el.textContent = '';

  // Show measured evidence beside the transport gate so the decision is informed,
  // without making it automatic -- samples from a mock live on the mock's league.
  const lat = latencyStats(state());
  const transportEvidence = lat.count
    ? 'Evidence on this league: ' + lat.count + ' confirmed frame(s), median '
      + (lat.medianMs / 1000).toFixed(1) + 's'
    : 'No confirmed live frames on this league yet.';

  el.appendChild(gateRow('transport', 'Transport',
    'Live picks observed and reconciled in a mock draft', transportEvidence));
  el.appendChild(gateRow('scoring', 'Scoring',
    'League scoring dumped and arithmetic hand-verified', null));

  // Player pool is a fact, not a gate: nothing to flip.
  const n = Object.keys(pool()).length;
  const row = document.createElement('div');
  row.className = 'vrow';
  const st = document.createElement('span');
  st.className = 'vstate ' + (n > 0 ? 'pass' : 'unknown');
  st.textContent = n > 0 ? 'PASS' : 'NOT YET';
  const txt = document.createElement('span');
  txt.className = 'subtle';
  txt.textContent = 'Player pool — ' + n + ' players cached for offline use';
  row.append(st, txt);
  el.appendChild(row);
}

function render() {
  renderStatus();
  renderConflicts();
  renderPending();
  renderPlayers();
  renderRoster();
  renderPickLog();
  renderValidation();
  renderRecommendations();
}

// ------------------------------------------------------------------- wiring

function wire() {
  $('search').addEventListener('input', renderPlayers);
  $('posFilter').addEventListener('change', renderPlayers);
  $('hideDrafted').addEventListener('change', renderPlayers);

  $('undoBtn').addEventListener('click', () => { undoPick(state(), null, now()); save(); render(); });

  const pause = $('syncPaused');
  if (pause) {
    pause.addEventListener('change', (e) => {
      session.setConfig({ syncPaused: !!e.target.checked });
      save(); render();
    });
  }

  $('myTeam').addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    session.setConfig({ myTeamId: Number.isNaN(v) ? null : v });
    save(); render();
  });
  $('mySlot').addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    session.setConfig({ mySlot: Number.isNaN(v) ? null : v });
    save();
  });

  $('expertsBtn').addEventListener('click', () => $('expertsFile').click());
  $('expertsFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const parsed = parseExpertCsv(await file.text(), pool());
      session.setConfig({
        expertRanks: parsed.expertRanks,
        byeWeeksByPlayerId: Object.assign({}, config().byeWeeksByPlayerId, parsed.byeWeeks),
      });
      $('expertsStatus').textContent = parsed.matched + ' expert rows matched';
      save(); render();
    } catch (err) {
      $('expertsStatus').textContent = 'Import failed: ' + err.message;
    }
    e.target.value = '';
  });

  $('exportBtn').addEventListener('click', () => {
    const payload = buildExport(session.activeLeagueId, config(), state(), pool(),
      new Date().toISOString());
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'draft-copilot-' + (session.activeLeagueId || 'noleague') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      // "Import settings" should also accept a settings-only JSON file. Apply those
      // values to the active league without replacing its picks or player pool.
      const settingsOnly = raw && typeof raw === 'object'
        && raw.leagueId == null && raw.state == null && raw.pool == null;
      if (settingsOnly) {
        if (session.activeLeagueId == null) throw new Error('open an ESPN league before importing settings');
        const imported = raw.config && typeof raw.config === 'object' ? raw.config : raw;
        session.setConfig(Object.assign({}, imported, { leagueId: session.activeLeagueId }));
        await session.flush();
      } else {
        // Full transfer imports still use the league-scoped parser and atomic install.
        const parsed = parseImport(raw);
        await session.importPayload(parsed);
      }
      syncInputs();
      render();
    } catch (err) {
      showStorageFailure(new Error('Import failed: ' + err.message));
    }
    e.target.value = '';
  });
}

function syncInputs() {
  const c = config();
  if (c.myTeamId != null) $('myTeam').value = c.myTeamId;
  if (c.mySlot != null) $('mySlot').value = c.mySlot;
  const pause = $('syncPaused');
  if (pause) pause.checked = !!c.syncPaused;
}

// Keep relative timestamps honest without a full re-render.
setInterval(renderStatus, 5000);

(async () => {
  await session.init();
  wire();
  watchStorage();
  syncInputs();
  render();
})();
