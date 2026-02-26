import { initWidgetsInScope } from './core/registry';
import { getGsap, getScrollTrigger } from './core/gsap-loader';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';
import './preview-player';
import './core/smooth-scroll';

const debug = !!window.ScrollCrafterConfig?.debug;
const logPrefix = '[ScrollCrafter]';

// ─── ScrollTrigger Configuration ───────────────────────────────────────────────
// Apply global ScrollTrigger config as early as possible
function configureScrollTrigger() {
  const ST = getScrollTrigger();
  if (!ST) return;

  ST.config({
    limitCallbacks: true,       // Prevents redundant callback execution during rapid refreshes
    ignoreMobileResize: true,   // Prevents refresh on mobile address bar show/hide
  });
}

// ─── Debounced Refresh ─────────────────────────────────────────────────────────
let _refreshTimer = null;
function debouncedSTRefresh(delay = 200, force = false) {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    const ST = getScrollTrigger();
    if (ST) {
      if (debug) console.log(`${logPrefix} ScrollTrigger refresh (force=${force})`);
      ST.refresh(force);
    }
  }, delay);
}

// ─── ResizeObserver for Pin Stability ──────────────────────────────────────────
// Monitors body height changes caused by lazy images, ads, web fonts, etc.
// When the page layout shifts, ScrollTrigger pin calculations become stale.
// This observer catches those shifts and triggers a debounced refresh.
function setupLayoutShiftObserver() {
  if (typeof ResizeObserver === 'undefined') return;

  let lastHeight = document.body.scrollHeight;
  let rafPending = false;

  const observer = new ResizeObserver(() => {
    if (rafPending) return;
    rafPending = true;

    requestAnimationFrame(() => {
      rafPending = false;
      const currentHeight = document.body.scrollHeight;
      if (Math.abs(currentHeight - lastHeight) > 50) {
        if (debug) console.log(`${logPrefix} Layout shift detected: ${lastHeight}px → ${currentHeight}px`);
        lastHeight = currentHeight;
        debouncedSTRefresh(150);
      }
    });
  });

  observer.observe(document.body, { box: 'border-box' });

  // Stop observing after page has stabilized (8 seconds) to reduce CPU overhead
  setTimeout(() => {
    observer.disconnect();
    if (debug) console.log(`${logPrefix} Layout observer disconnected (stabilization period ended)`);
  }, 8000);
}

// ─── Safety Refresh Sequence ───────────────────────────────────────────────────
// Catches late-loading content (ads, lazy images that load after DOMContentLoaded)
function scheduleSafetyRefreshes() {
  const delays = [500, 1500, 3000];

  delays.forEach(delay => {
    setTimeout(() => {
      debouncedSTRefresh(0);
    }, delay);
  });
}

// ─── Image Load Observer ───────────────────────────────────────────────────────
// Watches for images that finish loading and triggers a refresh if they could
// have affected layout (images without explicit width/height).
function observeImageLoads() {
  const images = document.querySelectorAll('img[loading="lazy"], img:not([width])');
  if (!images.length) return;

  let pendingRefresh = false;

  images.forEach(img => {
    if (img.complete) return;

    img.addEventListener('load', () => {
      if (!pendingRefresh) {
        pendingRefresh = true;
        // Batch multiple image loads into a single refresh
        setTimeout(() => {
          pendingRefresh = false;
          debouncedSTRefresh(100);
        }, 200);
      }
    }, { once: true });
  });
}

// ─── Initialization ────────────────────────────────────────────────────────────
function init() {
  configureScrollTrigger();
  initWidgetsInScope(document);
  setupLayoutShiftObserver();
  observeImageLoads();
  scheduleSafetyRefreshes();
}

// Early init to ensure GSAP can hide elements immediately (prevents flicker)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── Window Load: Final Refresh ────────────────────────────────────────────────
window.addEventListener('load', () => {
  const ST = getScrollTrigger();
  if (!ST) return;

  if (window.location.hash) {
    ST.clearScrollMemory();
    // Force refresh after hash navigation to recalculate all positions
    setTimeout(() => ST.refresh(true), 200);
  } else {
    // Final forced refresh — all resources are now loaded
    requestAnimationFrame(() => ST.refresh(true));
  }
});

// ─── Back/Forward Cache (bfcache) ──────────────────────────────────────────────
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    const ST = getScrollTrigger();
    if (ST) {
      ST.clearScrollMemory();
      ST.refresh(true);
    }
  }
});

// ─── Web Fonts ─────────────────────────────────────────────────────────────────
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    debouncedSTRefresh(100);
  });
}

// ─── Elementor Popup Support ───────────────────────────────────────────────────
window.addEventListener('elementor/popup/show', (e) => {
  initWidgetsInScope(e.target);
  debouncedSTRefresh(100);
});

// ─── Elementor Editor Hooks ────────────────────────────────────────────────────
const registerHooks = () => {
  let attempts = 0;

  const tryRegister = () => {
    if (!window.elementorFrontend?.hooks) {
      if (++attempts < 50) {
        setTimeout(tryRegister, 100);
      }
      return;
    }

    elementorFrontend.hooks.addAction('frontend/element_ready/global', ($scope) => {
      const node = $scope[0];
      if (!node) return;

      if (elementorFrontend.isEditMode()) {
        const widgetId = node.getAttribute('data-id');
        if (widgetId) killTriggerByWidgetId(widgetId);

        const getForcePreviewFlag = (id) => {
          try {
            if (window.ScrollCrafterForcePreview === id) return true;
            if (window.parent?.ScrollCrafterForcePreview === id) return true;
            if (window.top?.ScrollCrafterForcePreview === id) return true;
            if (sessionStorage.getItem('sc_force_preview') === id) return true;
          } catch (e) { }
          return false;
        };

        const allowLive = !!window.ScrollCrafterConfig?.enableEditorAnimations;
        const isManualPreview = node.getAttribute('data-sc-preview') === 'yes' || getForcePreviewFlag(widgetId);

        if (!allowLive && !isManualPreview) return;

        if (isManualPreview) {
          setTimeout(() => {
            if (window.ScrollCrafterForcePreview === widgetId) window.ScrollCrafterForcePreview = false;
            if (window.parent?.ScrollCrafterForcePreview === widgetId) window.parent.ScrollCrafterForcePreview = false;
            if (window.top?.ScrollCrafterForcePreview === widgetId) window.top.ScrollCrafterForcePreview = false;
            sessionStorage.removeItem('sc_force_preview');
          }, 100);
        }
      }

      initWidgetsInScope(node, elementorFrontend.isEditMode());

      if (elementorFrontend.isEditMode()) {
        debouncedSTRefresh();
      }
    });
  };

  tryRegister();
};

registerHooks();
window.addEventListener('elementor/frontend/init', registerHooks);

function killTriggerByWidgetId(widgetId) {
  try {
    const ST = getScrollTrigger();
    if (!ST) return;

    const st = ST.getById('sc-' + widgetId);
    if (st) st.kill(true);
  } catch (e) { }
}
