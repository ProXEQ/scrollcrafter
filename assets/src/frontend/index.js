import { initWidgetsInScope } from './core/registry';
import { getScrollTrigger } from './core/gsap-loader';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';
import './preview-player';
import './core/smooth-scroll';

function init() {
  initWidgetsInScope(document);
}

// Early init to ensure GSAP can hide elements immediately (prevents flicker)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Separate logic for hash navigation / refresh
window.addEventListener('load', () => {
  const ST = getScrollTrigger();
  if (!ST) return;

  if (window.location.hash) {
    ST.clearScrollMemory();
    setTimeout(() => ST.refresh(true), 200);
  } else {
    // Normal load: just a quick refresh for any lazy content
    requestAnimationFrame(() => ST.refresh());
  }
});

window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    const ST = getScrollTrigger();
    if (ST) {
      ST.clearScrollMemory();
      ST.refresh(true);
    }
  }
});

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    const ST = getScrollTrigger();
    if (ST) ST.refresh();
  });
}

window.addEventListener('elementor/popup/show', (e) => {
  initWidgetsInScope(e.target);
  const ST = getScrollTrigger();
  if (ST) ST.refresh();
});

const registerHooks = () => {
  let attempts = 0;

  const tryRegister = () => {
    if (!window.elementorFrontend?.hooks) {
      if (++attempts < 50) {
        setTimeout(tryRegister, 100);
      }
      return;
    }

    let refreshTimeout;
    const debouncedRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        const ST = getScrollTrigger();
        if (ST) ST.refresh();
      }, 200);
    };

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
        debouncedRefresh();
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
