import { initWidgetsInScope, initSingleWidget } from './core/registry';
import { getScrollTrigger } from './core/gsap-loader';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';

/**
 * Główna funkcja inicjalizująca.
 */
function init() {
  // Inicjalizacja globalna (dla frontendu)
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

// 3. Obsługa Edytora i Live Preview (KRYTYCZNE)
window.addEventListener('elementor/frontend/init', () => {
  if (!elementorFrontend) return;

  // Nasłuchuj na załadowanie dowolnego elementu (widgetu, sekcji, kontenera)
  elementorFrontend.hooks.addAction('frontend/element_ready/global', ($scope) => {
    const node = $scope[0]; // jQuery object -> DOM Node

    // Jeśli jesteśmy w edytorze, musimy posprzątać stare triggery dla tego elementu
    // zanim dodamy nowe, aby uniknąć duplikatów.
    if (elementorFrontend.isEditMode()) {
      cleanupTriggersInScope(node);
    }

    // Próbujemy zainicjować ten konkretny element (jeśli ma config)
    // Funkcja initWidgetsInScope przeszukuje też dzieci, więc zadziała dla kontenerów.
    initWidgetsInScope(node);
  });
});

/**
 * Helper do usuwania starych ScrollTriggerów powiązanych z elementem.
 * GSAP trzyma referencje globalnie, więc przy re-renderze w Elementorze
 * stare triggery mogą zostać osierocone i powodować błędy.
 */
function cleanupTriggersInScope(scopeNode) {
  try {
    const ScrollTrigger = getScrollTrigger();
    const triggers = ScrollTrigger.getAll();
    
    triggers.forEach((st) => {
      // Sprawdzamy, czy trigger (lub jego animowany element) znajduje się wewnątrz odświeżanego zakresu
      const triggerElem = st.trigger;
      const animElem = st.animation?.targets ? st.animation.targets()[0] : null;

      if (scopeNode.contains(triggerElem) || (animElem && scopeNode.contains(animElem))) {
        st.kill(true); // true = reset styles
        
        if (window.ScrollCrafterConfig?.debug) {
            // eslint-disable-next-line no-console
            console.log('[ScrollCrafter] Killed trigger during re-render', st);
        }
      }
    });
  } catch (e) {
    // Ignorujemy błędy czyszczenia (np. jeśli GSAP jeszcze nie jest załadowany)
  }
}
