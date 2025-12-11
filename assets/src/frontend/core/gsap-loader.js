// gsap-loader.js
export function getGsap() {
  if (typeof window === 'undefined') return null;

  const { gsap } = window;
  
  if (!gsap) {
    // Zamiast crashować aplikację, logujemy błąd i zwracamy null.
    // Wywołujący musi sprawdzić if (!gsap) return;
    console.error('[ScrollCrafter] GSAP core not found! Make sure gsap.min.js is loaded.');
    return null;
  }

  // Auto-rejestracja ScrollTriggera, jeśli jest dostępny globalnie
  if (window.ScrollTrigger && gsap.registerPlugin) {
    // Sprawdź, czy już nie jest zarejestrowany, aby uniknąć ostrzeżeń GSAP
    try {
        gsap.registerPlugin(window.ScrollTrigger);
    } catch (e) {
        // Ignorujemy błędy rejestracji (np. wersje niekompatybilne)
    }
  }

  return gsap;
}

export function getScrollTrigger() {
  if (typeof window === 'undefined') return null;

  if (!window.ScrollTrigger) {
    console.warn('[ScrollCrafter] ScrollTrigger not found! Animations may not work.');
    return null;
  }

  return window.ScrollTrigger;
}
