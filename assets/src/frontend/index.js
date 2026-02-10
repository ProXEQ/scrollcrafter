import { initWidgetsInScope } from './core/registry';
import { getScrollTrigger } from './core/gsap-loader';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';
import './preview-player'; // Direct preview API for editor
import './core/smooth-scroll'; // Lenis smooth scroll (Pro feature)

/**
 * Główna funkcja inicjalizująca.
 */
function init() {
  initWidgetsInScope(document);
}

// When the URL contains a #hash, the browser scrolls to the anchor AFTER
// DOMContentLoaded. If we init ScrollTrigger before that scroll happens,
// pin positions are calculated at scrollY=0 — causing pin overlaps.
// Fix: defer init() until after the browser finishes the hash scroll.
if (window.location.hash) {
  window.addEventListener('load', () => {
    // Wait for the browser to finalize hash scroll + any lazy-loaded content
    setTimeout(init, 100);
  });
} else {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // For non-hash pages: refresh after load to catch lazy images changing page height.
  // Hash pages don't need this — they already init after load.
  window.addEventListener('load', () => {
    const ST = getScrollTrigger();
    if (ST) requestAnimationFrame(() => ST.refresh());
  });
}

// bfcache: when user navigates Back/Forward, the browser may restore a cached page
// with stale ScrollTrigger positions. Re-init to recalculate everything.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    const ST = getScrollTrigger();
    if (ST) {
      ST.clearScrollMemory();
      ST.refresh(true);
    }
  }
});

// Web fonts: font swap can change element heights, shifting pin positions.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    const ST = getScrollTrigger();
    if (ST) ST.refresh();
  });
}

window.addEventListener('elementor/popup/show', (event) => {
  initWidgetsInScope(event.target);

  const ScrollTrigger = getScrollTrigger();
  if (ScrollTrigger) ScrollTrigger.refresh();
});

const registerHooks = () => {
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds

  const tryRegister = () => {
    if (!window.elementorFrontend || !window.elementorFrontend.hooks) {
      attempts++;
      if (attempts < maxAttempts) {
        if (attempts % 10 === 0 && window.ScrollCrafterConfig?.debug) {
          console.log(`[ScrollCrafter] Still waiting for elementorFrontend hooks (attempt ${attempts})...`);
        }
        setTimeout(tryRegister, 100);
      } else {
        console.warn('[ScrollCrafter] Elementor hooks not found after 5s. Animations might not initialize.');
      }
      return;
    }

    if (window.ScrollCrafterConfig?.debug) {
      console.log('[ScrollCrafter] Elementor hooks found. Registering...');
    }

    let refreshTimeout;
    const debouncedRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        const ScrollTrigger = getScrollTrigger();
        if (ScrollTrigger) {
          if (window.ScrollCrafterConfig?.debug) console.log('[ScrollCrafter] Debounced Refresh');
          ScrollTrigger.refresh();
        }
      }, 200);
    };

    elementorFrontend.hooks.addAction('frontend/element_ready/global', ($scope) => {
      const node = $scope[0];
      if (!node) return;

      if (elementorFrontend.isEditMode()) {
        const widgetId = node.getAttribute('data-id');
        if (widgetId) {
          killTriggerByWidgetId(widgetId);
        }

        // Check for force preview in multiple locations for cross-frame reliability
        const getForcePreviewFlag = (id) => {
          try {
            if (window.ScrollCrafterForcePreview === id) return true;
            if (window.parent && window.parent.ScrollCrafterForcePreview === id) return true;
            if (window.top && window.top.ScrollCrafterForcePreview === id) return true;
            if (sessionStorage.getItem('sc_force_preview') === id) return true;
          } catch (e) { }
          return false;
        };

        const allowLive = !!(window.ScrollCrafterConfig?.enableEditorAnimations);
        const isManualPreview = node.getAttribute('data-sc-preview') === 'yes' || getForcePreviewFlag(widgetId);

        if (!allowLive && !isManualPreview) return;

        if (isManualPreview) {
          setTimeout(() => {
            if (window.ScrollCrafterForcePreview === widgetId) window.ScrollCrafterForcePreview = false;
            if (window.parent && window.parent.ScrollCrafterForcePreview === widgetId) window.parent.ScrollCrafterForcePreview = false;
            if (window.top && window.top.ScrollCrafterForcePreview === widgetId) window.top.ScrollCrafterForcePreview = false;
            sessionStorage.removeItem('sc_force_preview');
          }, 100);
        }
      }

      initWidgetsInScope(node, elementorFrontend.isEditMode());

      if (elementorFrontend.isEditMode()) {
        debouncedRefresh();
      }
    });

    if (window.ScrollCrafterConfig?.debug) {
      console.log('[ScrollCrafter] Elementor hooks registered successfully');
    }
  };

  tryRegister();
};

// Start registration process
registerHooks();

// Also listen for the event as a backup if it haven't fired yet
window.addEventListener('elementor/frontend/init', registerHooks);

/**
 * Usuwa ScrollTrigger powiązany z danym widgetem (jeśli istnieje).
 */
function killTriggerByWidgetId(widgetId) {
  try {
    const ScrollTrigger = getScrollTrigger();
    if (!ScrollTrigger) return;

    const triggerId = 'sc-' + widgetId;
    const st = ScrollTrigger.getById(triggerId);

    if (st) {
      if (window.ScrollCrafterConfig?.debug) {
        console.log(`[ScrollCrafter] Killing trigger: ${triggerId}`);
      }
      st.kill(true);
    }

  } catch (e) {
    console.warn('[ScrollCrafter] Error killing trigger:', e);
  }
}
