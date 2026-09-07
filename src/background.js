/**
 * Service worker. Deliberately almost empty.
 *
 * No state lives here and nothing tries to keep it alive. The side panel owns state
 * and persists to chrome.storage.local, so worker termination is harmless. Alarms
 * cannot keep a worker alive anyway -- they only wake a dead one -- and their 30s
 * floor is waived for unpacked extensions, so a keepalive that works in development
 * silently degrades once packed.
 */

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    // The panel cannot be opened programmatically without a user gesture, so the
    // toolbar click is the entry point.
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((e) => console.warn('[DraftCopilot] setPanelBehavior failed', e));
  }
});
