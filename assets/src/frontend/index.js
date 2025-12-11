import { initWidgetsInScope } from './core/registry';
import { getScrollTrigger } from './core/gsap-loader';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';

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

window.addEventListener('elementor/popup/show', (event) => {
  initWidgetsInScope(event.target);
  
  const ScrollTrigger = getScrollTrigger();
  if (ScrollTrigger) ScrollTrigger.refresh();
});

window.addEventListener('elementor/frontend/init', () => {
  if (!window.elementorFrontend) return;

  elementorFrontend.hooks.addAction('frontend/element_ready/global', ($scope) => {
    const node = $scope[0]; 

    if (elementorFrontend.isEditMode()) {
      const widgetId = node.getAttribute('data-id');
      if (widgetId) {
        killTriggerByWidgetId(widgetId);
      }
    }

    initWidgetsInScope(node);
  });
});

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
