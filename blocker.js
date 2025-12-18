// blocker.js

function deepQuery(selector, root = document, visited = new Set()) {
  if (visited.has(root)) return null;
  visited.add(root);

  const direct = root.querySelector(selector);
  if (direct) return direct;

  const hosts = root.querySelectorAll('*');
  for (const host of hosts) {
    if (host.shadowRoot) {
      const found = deepQuery(selector, host.shadowRoot, visited);
      if (found) return found;
    }
  }
  return null;
}

let blockerObserver = null;

const TARGET_SELECTORS = [
  'ytd-rich-grid-renderer', // Homepage videos
  'ytd-watch-next-secondary-results-renderer' // Watch page recommendations
];

function isTargetPage() {
  const path = window.location.pathname;
  // Homepage is '/' or empty
  // Watch page starts with '/watch'
  // Search results is '/results' (added to prevent flashing of stale homepage content during navigation)
  return path === '/' || path.startsWith('/watch') || path.startsWith('/results');
}

function startWatchingChips() {
  // If already observing, do nothing
  if (blockerObserver) return;

  blockerObserver = new MutationObserver(() => {
    const shouldHide = isTargetPage();

    TARGET_SELECTORS.forEach(selector => {
      const el = deepQuery(selector, document);
      if (el) {
        // Only hide if we are on a target page AND blocking is enabled (implied by observer running)
        // If we navigated away, we should show it.
        el.style.display = shouldHide ? 'none' : '';
      }
    });
  });

  blockerObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

let isBlockingEnabled = false;

function tryEnableTheaterMode(attempts = 0) {
  if (attempts > 20) return; // Give up after ~10 seconds
  if (!location.pathname.startsWith('/watch')) return;

  const app = document.querySelector('ytd-watch-flexy');
  if (app) {
    if (!app.hasAttribute('theater')) {
      const btn = document.querySelector('.ytp-size-button');
      if (btn) {
        btn.click();
      } else {
        // Button might not be ready
        setTimeout(() => tryEnableTheaterMode(attempts + 1), 500);
      }
    }
  } else {
    // App element not ready
    setTimeout(() => tryEnableTheaterMode(attempts + 1), 500);
  }
}

document.addEventListener('yt-navigate-finish', () => {
  if (isBlockingEnabled) {
    tryEnableTheaterMode();
  }
});

function updateBlockerState(shouldBlock) {
  isBlockingEnabled = shouldBlock;
  if (shouldBlock) {
    startWatchingChips();
    // Immediately try to update visibility based on page
    const shouldHide = isTargetPage();
    TARGET_SELECTORS.forEach(selector => {
      const el = deepQuery(selector, document);
      if (el) el.style.display = shouldHide ? 'none' : '';
    });
    // Try to enable theater mode if on watch page
    tryEnableTheaterMode();
  } else {
    // Stop watching if we were (optional, but good for performance)
    if (blockerObserver) {
      blockerObserver.disconnect();
      blockerObserver = null;
    }
    // Show the element again
    TARGET_SELECTORS.forEach(selector => {
      const el = deepQuery(selector, document);
      if (el) el.style.display = '';
    });
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.ytBlocker) {
    updateBlockerState(changes.ytBlocker.newValue);
  }
});

chrome.storage.sync.get('ytBlocker').then(res => {
  updateBlockerState(res.ytBlocker);
});


