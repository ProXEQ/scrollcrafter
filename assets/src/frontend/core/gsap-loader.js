// gsap-loader.js
export function getGsap() {
  if (typeof window === 'undefined') {
    throw new Error('GSAP not available: window is undefined');
  }

  const { gsap } = window;
  if (!gsap) {
    throw new Error('GSAP not found on window.gsap');
  }

  if (gsap.core && typeof window.ScrollTrigger !== 'undefined') {
    if (!gsap.core.globals().ScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }
  }

  return gsap;
}

export function getScrollTrigger() {
  if (typeof window === 'undefined') {
    throw new Error('ScrollTrigger not available: window is undefined');
  }

  if (!window.ScrollTrigger) {
    throw new Error('ScrollTrigger not found on window.ScrollTrigger');
  }

  return window.ScrollTrigger;
}
