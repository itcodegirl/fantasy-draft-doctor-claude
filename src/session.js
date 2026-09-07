/**
 * Panel session: owns the active league and all message coordination.
 *
 * Extracted from sidepanel.js with storage injected, because the bugs that live here
 * are asynchronous ones that helper-level tests cannot reach -- a message arriving
 * mid-transition, a triggering message dropped on adoption, state saved under the wrong
 * league's key.
 *
 * Five invariants this module exists to hold:
 *
 *   0. The transition lock is RELEASED before queued messages are drained. A queued
 *      message can request an adoption, which schedules another transition on the
 *      same promise chain; awaiting the drain from inside a chain callback makes the
 *      chain wait on work chained behind itself. That deadlocked first-time startup.
 *
 *   1. A league transition is ATOMIC. Everything is loaded into locals first, then
 *      activeLeagueId / state / pool / config are installed together with no await
 *      between them. Assigning the id before awaiting storage left a window where the
 *      id named the destination while state and config still belonged to the departing
 *      league -- so a message routed as "accept" mutated the old config, which was then
 *      thrown away when the load completed.
 *
 *   2. Messages arriving DURING a transition are queued, not processed. Serializing the
 *      switches alone does not serialize the message handling that races with them.
 *      EVERY entry point that loads a league -- switchTo, init and importPayload --
 *      goes through the same guard and the same chain. init() outside it meant a
 *      message could adopt a league during startup only for the delayed load to
 *      overwrite it.
 *
 *   3. A league is never taken silently once one is active; it is offered, and the
 *      message that raised the offer is RETAINED so accepting it replays that identity.
 *      Keeping only the league number lost the destination's teamId.
 *
 *   4. The pause rule applies to cached replay as well as inbound messages, or manual
 *      mode silently ends at the next reload.
 */

import { createState, deserialize, applySnapshot, observeFrame } from './store.js';
import { createLog } from './calibration.js';
import {
  DEFAULT_CONFIG, routeLeague, gatePatch,
  KEY_ACTIVE, keyState, keyPool, keyConfig, keySnapshot, keySettings, keyCalibration,
} from './panel-logic.js';

export function createSession(opts) {
  const storage = opts.storage;
  const now = opts.now || (() => Date.now());
  const onError = opts.onError || (() => {});

  let activeLeagueId = null;
  let state = createState();
  let pool = {};
  let config = Object.assign({}, DEFAULT_CONFIG);
  // Installed in the same atomic block as the four above. It is per-league like they are,
  // and a half-switched session must never score one league's forecasts against another's
  // picks.
  let calibration = createLog();
  // Per-league offer context: { leagueId, identity, latest }. The identity message is
  // held SEPARATELY from whatever arrived last. Keeping only "the message that raised
  // the offer" meant a snapshot from the offered league, arriving before the user
  // decided, displaced the identity -- and accepting then lost the destination teamId.
  let offerContext = null;

  // Counter, not a boolean: two switches can be queued at once, and the first one
  // finishing must not reopen the window while the second is still pending.
  let transitionDepth = 0;
  let queued = [];
  let chain = Promise.resolve();

  const api = {
    get activeLeagueId() { return activeLeagueId; },
    get state() { return state; },
    get pool() { return pool; },
    get config() { return config; },
    get calibration() { return calibration; },
    setCalibration(next) { calibration = next; },
    get pendingLeagueOffer() { return offerContext ? offerContext.leagueId : null; },
    get transitioning() { return transitionDepth > 0; },
    get queuedCount() { return queued.length; },
    clearOffer() { offerContext = null; },
    setConfig(patch) { Object.assign(config, patch); },
    /**
     * Flip a validation gate on the ACTIVE league. Throws if passing without a note.
     * Nothing in the extension can flip these automatically; a human records the check.
     */
    setGate(gate, passed, notes) {
      const patch = gatePatch(gate, passed, notes, now());
      Object.assign(config, patch);
      return patch;
    },
    handleMessage, switchTo, acceptOffer, init, flush, savePool, importPayload,
  };

  /**
   * Take the outstanding offer, then replay the message that raised it so the
   * destination's identity (notably teamId) survives the switch.
   */
  async function acceptOffer() {
    if (!offerContext) return false;
    const ctx = offerContext;
    const switched = await switchTo(ctx.leagueId);
    offerContext = null;
    if (switched) {
      // Identity first so teamId lands; then the latest message if it was something
      // else. The store's own staleness rules handle an out-of-date snapshot.
      if (ctx.identity) apply(ctx.identity);
      if (ctx.latest && ctx.latest !== ctx.identity) apply(ctx.latest);
    }
    return switched;
  }

  // ------------------------------------------------------------- persistence

  async function flush() {
    if (activeLeagueId == null) return;
    try {
      const put = {};
      put[keyState(activeLeagueId)] = state;
      put[keyConfig(activeLeagueId)] = config;
      put[keyCalibration(activeLeagueId)] = calibration;
      await storage.set(put);
    } catch (e) { onError(e); }
  }

  async function savePool() {
    if (activeLeagueId == null) return;
    try {
      const put = {};
      put[keyPool(activeLeagueId)] = pool;
      await storage.set(put);
    } catch (e) { onError(e); }
  }

  /**
   * Load a league and install it atomically. Every await happens BEFORE anything is
   * assigned; the install itself is synchronous.
   */
  async function loadLeague(id) {
    if (id == null) {
      activeLeagueId = null;
      state = createState();
      pool = {};
      config = Object.assign({}, DEFAULT_CONFIG);
      calibration = createLog();
      return;
    }

    const keys = [keyState(id), keyPool(id), keyConfig(id), keySnapshot(id), keySettings(id),
      keyCalibration(id)];
    const got = (await storage.get(keys)) || {};

    const nextState = got[keys[0]] ? deserialize(got[keys[0]]) : createState();
    const nextPool = got[keys[1]] || {};
    const nextConfig = Object.assign({}, DEFAULT_CONFIG, got[keys[2]] || {});
    const stored = got[keys[5]];
    const nextCalibration = stored && Array.isArray(stored.forecasts) ? stored : createLog();
    if (got[keys[4]]) nextConfig.espnSettings = got[keys[4]];
    nextConfig.leagueId = id;
    nextState.leagueId = id;

    // Replay the sensor's cached snapshot into the NEW state before installing it, so
    // no partially-populated context is ever visible. Pass the snapshot's own
    // completion time so a stale cache cannot advertise fresh sync.
    //
    // The pause rule applies HERE too. Gating only inbound messages meant reopening a
    // paused session quietly re-synced from cache -- manual mode has to survive a
    // reload or it is not a mode, just a filter.
    const cached = got[keys[3]];
    if (cached && Array.isArray(cached.picks) && !nextConfig.syncPaused) {
      applySnapshot(nextState, { leagueId: cached.leagueId, picks: cached.picks },
        cached.startedAt, cached.completedAt || cached.startedAt);
      const cachedCurrentPick = Number(cached.currentPick);
      if (Number.isInteger(cachedCurrentPick) && cachedCurrentPick > 0) {
        nextState.currentPick = Math.max(Number(nextState.currentPick) || 0, cachedCurrentPick);
      }
    }

    // --- atomic install: no awaits between these lines ---
    activeLeagueId = id;
    state = nextState;
    pool = nextPool;
    config = nextConfig;
    calibration = nextCalibration;
    // --- end atomic install ---
  }

  // --------------------------------------------------------------- switching

  /**
   * Run `fn` holding the transition lock, then RELEASE the lock before returning.
   *
   * The depth is incremented synchronously, so the gap between "transition requested"
   * and "chain runs" is guarded too.
   *
   * Draining deliberately does NOT happen in here. A queued message can request an
   * adoption, which schedules another transition on this same chain -- awaiting that
   * from inside a chain callback makes the chain wait on work chained behind itself.
   * That circular wait deadlocked first-time startup.
   */
  function runExclusive(fn) {
    transitionDepth++;
    const run = chain.then(fn).catch((e) => { onError(e); return false; });
    chain = run.then(() => {}, () => {});          // chain advances either way
    return run.then(
      (v) => { transitionDepth--; return v; },
      (e) => { transitionDepth--; throw e; }
    );
  }

  /** Await a transition, then drain queued messages with the lock already released. */
  async function afterTransition(p) {
    const v = await p;
    await drainIfIdle();
    return v;
  }

  async function drainIfIdle() {
    if (transitionDepth > 0 || !queued.length) return;
    const pending = queued;
    queued = [];
    for (const m of pending) await handleMessage(m);
  }

  function switchTo(leagueId) {
    const id = Number(leagueId);
    if (!id || id === activeLeagueId) return chain.then(() => false);
    return afterTransition(runExclusive(async () => {
      if (activeLeagueId != null) await flush();  // persist the league we are leaving
      await loadLeague(id);
      await storage.set({ [KEY_ACTIVE]: id });
      offerContext = null;
      return true;
    }));
  }

  // ---------------------------------------------------------------- messages

  async function handleMessage(msg) {
    if (!msg || !msg.type) return 'ignored';

    // A message that lands mid-transition would be evaluated against a half-installed
    // context. Hold it until the new league is fully in place.
    if (transitionDepth > 0) {
      queued.push(msg);
      return 'queued';
    }

    const route = routeLeague(msg.leagueId, activeLeagueId);

    if (route === 'ignore') return 'ignored';

    if (route === 'offer-switch') {
      const id = Number(msg.leagueId);
      if (!offerContext || offerContext.leagueId !== id) {
        offerContext = { leagueId: id, identity: null, latest: null };
      }
      // Identity gets its own slot so a later non-identity message from the same
      // league cannot displace it.
      if (msg.type === 'dc.identity') offerContext.identity = msg;
      offerContext.latest = msg;
      return 'offered';
    }

    if (route === 'adopt') {
      // switchTo drains the queue itself, after the lock is released.
      const switched = await switchTo(Number(msg.leagueId));
      // Replay the triggering message. Previously adoption returned without
      // processing it, so the identity message that established the league also
      // carried the teamId -- and that teamId was silently dropped.
      if (switched) return apply(msg);
      return 'ignored';
    }

    return apply(msg);
  }

  function apply(msg) {
    // Manual mode is a real switch, not a display label. Live data is refused at the
    // door so the board genuinely stops moving on its own.
    if (config.syncPaused && (msg.type === 'dc.observation'
      || msg.type === 'dc.snapshot' || msg.type === 'dc.current-pick')) {
      return 'paused';
    }

    if (msg.type === 'dc.observation') {
      const r = observeFrame(state, {
        playerId: msg.playerId,
        teamId: msg.teamId,
        lineupSlotId: msg.lineupSlotId,
        leagueId: msg.leagueId,
      }, now());
      return r.accepted ? 'observed' : 'rejected';
    }

    if (msg.type === 'dc.snapshot') {
      // Only successful, complete snapshots reach here; the sensor drops the rest.
      const r = applySnapshot(state, { leagueId: msg.leagueId, picks: msg.picks },
        msg.startedAt, msg.completedAt || now());
      const currentPick = Number(msg.currentPick);
      if (r.applied && Number.isInteger(currentPick) && currentPick > 0) {
        state.currentPick = Math.max(Number(state.currentPick) || 0, currentPick);
      }
      return r.applied ? 'applied' : ('refused:' + r.reason);
    }

    if (msg.type === 'dc.current-pick') {
      const pick = Number(msg.currentPick);
      if (Number.isInteger(pick) && pick > 0) {
        state.currentPick = Math.max(Number(state.currentPick) || 0, pick);
      }
      return 'current-pick';
    }

    if (msg.type === 'dc.pool') {
      pool = msg.players || {};
      return 'pool';
    }

    if (msg.type === 'dc.settings') {
      config.espnSettings = msg.settings || null;
      return 'settings';
    }

    if (msg.type === 'dc.identity') {
      const teamId = Number(msg.teamId);
      const teamCount = Number(config.espnSettings && config.espnSettings.size) || 20;
      const configuredTeamIsInvalid = !Number.isInteger(Number(config.myTeamId))
        || Number(config.myTeamId) < 1 || Number(config.myTeamId) > teamCount;
      if (Number.isInteger(teamId) && teamId >= 1 && teamId <= teamCount
          && (config.myTeamId == null || configuredTeamIsInvalid)) {
        // A settings import can contain a league id in the team field. Prefer the
        // authenticated ESPN draft identity whenever the configured value is invalid.
        config.myTeamId = teamId;
        return 'identity:team-set';
      }
      return 'identity';
    }

    if (msg.type === 'dc.scoring-validation') {
      config.scoringValidated = !!msg.passed;
      config.scoringNotes = msg.notes || null;
      return 'validation';
    }

    if (msg.type === 'dc.transport-validation') {
      config.transportValidated = !!msg.passed;
      return 'validation';
    }

    return 'ignored';
  }

  // ------------------------------------------------------------------- setup

  /**
   * Startup is a transition like any other, and must be coordinated like one. Loading
   * outside the guard meant a message arriving during the storage read could adopt a
   * league, only for the delayed load to overwrite it.
   */
  function init() {
    return afterTransition(runExclusive(async () => {
      const got = (await storage.get([KEY_ACTIVE])) || {};
      const id = got[KEY_ACTIVE];
      if (id != null) await loadLeague(Number(id));
      return true;
    }));
  }

  /**
   * Install an imported payload. The pool is replaced unconditionally: keeping the
   * previous league's players when the import had none left them in memory and then
   * saved them under the imported league's key.
   */
  function importPayload(parsed) {
    // Same lock and chain as switchTo and init: an import racing a switch could
    // otherwise interleave and save one league's data under another's key.
    return afterTransition(runExclusive(async () => {
      const nextConfig = parsed.config;
      const nextState = parsed.state ? deserialize(parsed.state) : createState();
      nextState.leagueId = parsed.leagueId;

      // --- atomic install ---
      activeLeagueId = parsed.leagueId;
      state = nextState;
      config = nextConfig;
      // Replaced unconditionally. Keeping the previous league's players when the
      // import had none left them in memory and then saved them under the imported
      // league's key.
      pool = parsed.pool || {};
      // --- end atomic install ---

      offerContext = null;

      await storage.set({ [KEY_ACTIVE]: parsed.leagueId });
      await flush();
      await savePool();
      return true;
    }));
  }

  return api;
}
