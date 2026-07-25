// Installs a browser-only counter over fetch/XMLHttpRequest so Run Game
// Check can report a real, live count of outbound network calls instead
// of a hard-coded "no external requests" claim.

let externalRequestCount = 0;
let installed = false;

export function installNetworkMonitor(win) {
  const target = win || (typeof window !== 'undefined' ? window : null);
  if (!target || installed) return;
  installed = true;

  const originalFetch = target.fetch ? target.fetch.bind(target) : null;
  if (originalFetch) {
    target.fetch = (...args) => {
      externalRequestCount += 1;
      return originalFetch(...args);
    };
  }

  if (target.XMLHttpRequest) {
    const OriginalXHR = target.XMLHttpRequest;
    const originalOpen = OriginalXHR.prototype.open;
    OriginalXHR.prototype.open = function patchedOpen(...args) {
      externalRequestCount += 1;
      return originalOpen.apply(this, args);
    };
  }
}

export function getExternalRequestCount() {
  return externalRequestCount;
}
