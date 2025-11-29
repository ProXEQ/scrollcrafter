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

// 1. Standardowy start na froncie
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 2. Obsługa Popupów Elementora
window.addEventListener('elementor/popup/show', (event) => {
  initWidgetsInScope(event.target);
});

// 3. Obsługa Edytora i Live Preview
window.addEventListener('elementor/frontend/init', () => {
  if (!window.elementorFrontend) return;

  // Nasłuchuj na renderowanie dowolnego elementu
  elementorFrontend.hooks.addAction('frontend/element_ready/global', ($scope) => {
    const node = $scope[0]; 

    if (elementorFrontend.isEditMode()) {
      // KROK KLUCZOWY: Usuń martwe triggery przed inicjalizacją nowych
      cleanupDetachedTriggers();
    }

    initWidgetsInScope(node);
  });
});

/**
 * Usuwa instancje ScrollTrigger podpięte do elementów, które nie istnieją już w DOM.
 * Rozwiązuje problem duplikowania animacji przy edycji w Elementorze.
 */
function cleanupDetachedTriggers() {
  try {
    const ScrollTrigger = getScrollTrigger();
    const triggers = ScrollTrigger.getAll();
    
    triggers.forEach((st) => {
      const triggerElem = st.trigger;
      
      // Sprawdź czy element triggera nadal znajduje się w dokumencie
      const isDetached = triggerElem && !document.body.contains(triggerElem);
      
      if (isDetached) {
        st.kill(true); // true = reset styles (ważne!)
        if (window.ScrollCrafterConfig?.debug) {
            // eslint-disable-next-line no-console
            console.log('[ScrollCrafter] Killed detached trigger', st);
        }
      }
    });
  } catch (e) {
    // GSAP może nie być jeszcze załadowany
  }
}
