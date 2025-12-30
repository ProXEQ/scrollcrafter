export function getGsap() {
  if (typeof window === 'undefined') return null;

  const { gsap } = window;
  
  if (!gsap) {
    console.error('[ScrollCrafter] GSAP core not found! Make sure gsap.min.js is loaded.');
    return null;
  }

  if (window.ScrollTrigger && gsap.registerPlugin) {
    try {
        gsap.registerPlugin(window.ScrollTrigger);
    } catch (e) {
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
