/**
 * MAIN-world hook. Runs at document_start, before ESPN's own bundle.
 *
 * ESPN's draft room does NOT poll REST for picks. It opens:
 *   wss://fantasydraft.espn.com/game-{gameId}/league-{leagueId}/JOIN?1=..&2=..&3=teamId&..
 * with an EventSource fallback at the same path under /sse. Transport selection is
 * ratio-based, so BOTH must be patched or we silently miss drafts that fall back.
 *
 * Frames are newline-terminated, space-delimited plaintext. The one that matters:
 *   SELECTED <teamId> <playerId> <slotId>
 *
 * This script stays deliberately dumb: it forwards raw frames and lets the ISOLATED
 * world parse them. Less logic here means less to break in a context we cannot debug
 * easily mid-draft.
 *
 * chrome.runtime is undefined in the MAIN world (since Chrome 111), so the only way
 * out is a CustomEvent. We use CustomEvent rather than postMessage because ESPN has
 * its own message listeners on window.
 */
(() => {
  'use strict';

  const CHANNEL = '__draft_copilot_bridge__';
  const send = (kind, payload) => {
    try {
      document.dispatchEvent(new CustomEvent(CHANNEL, { detail: { kind, payload, t: Date.now() } }));
    } catch (_) {
      /* never let instrumentation break the page */
    }
  };

  send('hook-installed', { url: location.href });

  // ---------------------------------------------------------------- WebSocket

  const NativeWebSocket = window.WebSocket;
  if (NativeWebSocket) {
    const PatchedWebSocket = function (url, protocols) {
      const ws = protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols);

      const isDraft = typeof url === 'string' && /fantasydraft\.|\/JOIN\?/i.test(url);
      send('ws-open', { url: String(url), isDraft });

      // League identity is captured PER CONNECTION, here, and carried on every frame
      // this socket emits. Reading a module-level "current league" downstream is unsafe:
      // an older socket can emit after a newer one changed it, and Blob decoding is
      // async, so delivery order does not establish which connection produced a frame.
      let connLeagueId = null;
      let connTeamId = null;

      if (isDraft) {
        // The JOIN URL's parameter 3 is the viewer's own teamId. This is how we
        // identify which team is the user without asking them to configure it.
        try {
          const q = new URLSearchParams(String(url).split('?')[1] || '');
          connLeagueId = q.get('2');
          connTeamId = q.get('3');
          send('identity', {
            gameId: q.get('1'),
            leagueId: connLeagueId,
            teamId: connTeamId,
            userProfileId: q.get('4'),
          });
        } catch (_) { /* ignore */ }
      }

      // Only recognised draft connections are relayed at all. Previously this listener
      // was attached to every socket on the page, so unrelated traffic was forwarded
      // into the draft parser.
      if (isDraft) {
        const relay = (ev) => {
          if (typeof ev.data === 'string') {
            send('frame', { url: String(url), data: ev.data, transport: 'ws', leagueId: connLeagueId });
          } else if (ev.data instanceof Blob) {
            ev.data.text()
              .then((txt) => send('frame', { url: String(url), data: txt, transport: 'ws', leagueId: connLeagueId }))
              .catch(() => {});
          }
        };
        ws.addEventListener('message', relay);
      }
      ws.addEventListener('close', () => send('ws-close', { url: String(url) }));
      ws.addEventListener('error', () => send('ws-error', { url: String(url) }));

      // Some code paths assign .onmessage directly rather than using addEventListener.
      // addEventListener above already covers us, so we only need to not break them.
      return ws;
    };

    PatchedWebSocket.prototype = NativeWebSocket.prototype;
    PatchedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = NativeWebSocket.OPEN;
    PatchedWebSocket.CLOSING = NativeWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = NativeWebSocket.CLOSED;

    try {
      Object.defineProperty(window, 'WebSocket', {
        configurable: true,
        writable: true,
        value: PatchedWebSocket,
      });
    } catch (_) { /* ignore */ }
  }

  // -------------------------------------------------------------- EventSource

  const NativeEventSource = window.EventSource;
  if (NativeEventSource) {
    const PatchedEventSource = function (url, config) {
      const es = config === undefined
        ? new NativeEventSource(url)
        : new NativeEventSource(url, config);

      const isDraft = typeof url === 'string' && /fantasydraft\.|\/JOIN\?|\/sse/i.test(url);
      send('sse-open', { url: String(url), isDraft });

      let connLeagueId = null;
      if (isDraft) {
        try {
          const q = new URLSearchParams(String(url).split('?')[1] || '');
          connLeagueId = q.get('2');
          send('identity', {
            gameId: q.get('1'),
            leagueId: connLeagueId,
            teamId: q.get('3'),
            userProfileId: q.get('4'),
          });
        } catch (_) { /* ignore */ }
      }

      // Same rule as WebSocket: relay only recognised draft connections, and carry
      // this connection's own league identity on every frame.
      if (isDraft) {
        es.addEventListener('message', (ev) => {
          if (typeof ev.data === 'string') {
            send('frame', { url: String(url), data: ev.data, transport: 'sse', leagueId: connLeagueId });
          }
        });
      }

      return es;
    };

    PatchedEventSource.prototype = NativeEventSource.prototype;
    PatchedEventSource.CONNECTING = NativeEventSource.CONNECTING;
    PatchedEventSource.OPEN = NativeEventSource.OPEN;
    PatchedEventSource.CLOSED = NativeEventSource.CLOSED;

    try {
      Object.defineProperty(window, 'EventSource', {
        configurable: true,
        writable: true,
        value: PatchedEventSource,
      });
    } catch (_) { /* ignore */ }
  }

  // -------------------------------------------------------------------- fetch
  // ESPN's own bundle fetches the league and player pool. Piggy-backing on those
  // responses gives us data without issuing duplicate requests, and tells us the
  // exact filter shapes ESPN itself uses.

  const nativeFetch = window.fetch;
  if (nativeFetch) {
    window.fetch = function (...args) {
      const req = args[0];
      const url = typeof req === 'string' ? req : (req && req.url) || '';
      const p = nativeFetch.apply(this, args);

      if (/lm-api-reads\.fantasy\.espn\.com|\/apis\/v3\/games\/ffl\//i.test(url)) {
        p.then((res) => {
          try {
            res.clone().text().then((body) => {
              // Cap forwarded size; the full player pool is ~18MB and we do not
              // want to push that through a CustomEvent.
              if (body.length <= 4_000_000) {
                send('espn-response', { url, body });
              } else {
                send('espn-response-oversize', { url, bytes: body.length });
              }
            }).catch(() => {});
          } catch (_) { /* ignore */ }
        }).catch(() => {});
      }
      return p;
    };
  }
})();
