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

// 3. Obsługa Edytora i Live Preview (Elementor)
window.addEventListener('elementor/frontend/init', () => {
  if (!window.elementorFrontend) return;

  // Nasłuchuj na renderowanie dowolnego elementu (przy zmianie ustawień)
  elementorFrontend.hooks.addAction('frontend/element_ready/global', ($scope) => {
    const node = $scope[0]; 

    // Jeśli jesteśmy w trybie edycji, czyścimy stare instancje przed stworzeniem nowych
    if (elementorFrontend.isEditMode()) {
      cleanupDetachedTriggers();
    }

    initWidgetsInScope(node);
  });
});

/**
 * Usuwa instancje ScrollTrigger podpięte do elementów, które nie istnieją już w DOM.
 * Rozwiązuje problem duplikowania animacji i "walki" triggerów po odświeżeniu widgetu.
 */
function cleanupDetachedTriggers() {
  try {
    const ScrollTrigger = getScrollTrigger();
    if (!ScrollTrigger) return;

    const triggers = ScrollTrigger.getAll();
    
    triggers.forEach((st) => {
      const triggerElem = st.trigger;
      
      // Sprawdź czy element triggera nadal znajduje się w aktywnym dokumencie
      const isDetached = triggerElem && !document.body.contains(triggerElem);
      
      if (isDetached) {
        st.kill(true); // true = reset styles (przywraca CSS do stanu pierwotnego)
        // Opcjonalne logowanie dla debugowania
        // if (window.ScrollCrafterConfig?.debug) console.log('[ScrollCrafter] Killed detached trigger', st);
      }
    });
    
    // Wymuś odświeżenie po czyszczeniu
    ScrollTrigger.refresh();
    
  } catch (e) {
    // GSAP może nie być jeszcze załadowany lub inna kolizja - ignorujemy bezpiecznie
  }
}
