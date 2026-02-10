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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Fix: Recalculate ScrollTrigger positions after full page load.
// When the browser navigates to a #hash anchor, it scrolls AFTER DOMContentLoaded.
// Pin spacers calculated during init() at scrollY=0 have wrong positions.
window.addEventListener('load', () => {
  const ScrollTrigger = getScrollTrigger();
  if (!ScrollTrigger) return;

  if (window.location.hash) {
    // Hash navigation detected — browser will scroll to anchor at unpredictable time.
    // Strategy: clear cached positions, wait for browser to settle, then recalculate everything.
    let refreshed = false;
    const doRefresh = () => {
      if (refreshed) return;
      refreshed = true;
      ScrollTrigger.clearScrollMemory();
      ScrollTrigger.refresh(true);
    };

    // Primary: delayed refresh (300ms covers most hash-scroll timings)
    setTimeout(doRefresh, 300);

    // Safety net: if scroll happens after our timeout, catch it
    const onScroll = () => {
      window.removeEventListener('scroll', onScroll);
      // Small delay to let the scroll position fully settle
      setTimeout(doRefresh, 100);
    };
    window.addEventListener('scroll', onScroll, { once: true, passive: true });
  } else {
    // No hash — standard refresh after layout settles
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  }
});

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
