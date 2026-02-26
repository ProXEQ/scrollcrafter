import { initWidgetsInScope } from './core/registry';
import { getGsap, getScrollTrigger } from './core/gsap-loader';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';
import './preview-player';
import './core/smooth-scroll';

// ─── Browser Scroll Restoration Fix ───────────────────────────────────────────
const debug = !!window.ScrollCrafterConfig?.debug;
const logPrefix = '[ScrollCrafter]';

// 2026 Absolute Zero: Force manual restoration to prevent browser mid-page jumps
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// ─── ScrollTrigger Configuration ───────────────────────────────────────────────

function configureScrollTrigger() {
  const ST = getScrollTrigger();
  if (!ST) return;

  // Wipe any remembered scroll positions before initializing
  ST.clearScrollMemory('all');

  ST.config({
    ignoreMobileResize: true,
  });

  // Prevent browser/Lenis battle during initial load by normalizing scroll logic
  ST.normalizeScroll(true);
}

// ─── Simple debounced refresh (editor-only, popups, etc.) ──────────────────────
let _editorRefreshTimer = null;
function debouncedEditorRefresh() {
  clearTimeout(_editorRefreshTimer);
  _editorRefreshTimer = setTimeout(() => {
    const ST = getScrollTrigger();
    if (ST) ST.refresh();
  }, 200);
}

// ─── Initialization ────────────────────────────────────────────────────────────
function init() {
  // Hard reset scroll to top immediately to ensure clean parsing of elements
  window.scrollTo(0, 0);

  configureScrollTrigger();
  initWidgetsInScope(document);

  // Sort triggers so pins are calculated in correct DOM order
  requestAnimationFrame(() => {
    const ST = getScrollTrigger();
    if (ST) ST.sort();
  });
}

// Early init to ensure GSAP can hide elements immediately (prevents flicker)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── Window Load: Final Refresh ────────────────────────────────────────────────
// This is the ONE safe place to do a forced refresh: all images, fonts, and
// resources are loaded, so pin-spacer calculations will be correct.
window.addEventListener('load', () => {
  const ST = getScrollTrigger();
  if (!ST) return;

  if (window.location.hash) {
    ST.clearScrollMemory();
  }

  // Use rAF to ensure the browser has finished final layout
  requestAnimationFrame(() => {
    ST.refresh(true);
    if (debug) console.log(`${logPrefix} Final ScrollTrigger refresh on window.load`);
  });
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
// Font loading can shift layout before window.load fires. This is safe because
// it happens early, before the user has scrolled deep into pinned sections.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    const ST = getScrollTrigger();
    if (ST) ST.refresh();
  });
}

// ─── Elementor Popup Support ───────────────────────────────────────────────────
window.addEventListener('elementor/popup/show', (e) => {
  initWidgetsInScope(e.target);
  const ST = getScrollTrigger();
  if (ST) ST.refresh();
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
        debouncedEditorRefresh();
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
