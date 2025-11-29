import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

/**
 * Helper: Zamienia magiczne stringi na funkcje GSAP.
 */
function parseMacros(vars) {
  const newVars = { ...vars };

  Object.keys(newVars).forEach((key) => {
    const val = newVars[key];

    if (typeof val === 'string') {
      // MACRO: calc_horizontal_scroll
      // Oblicza przesunięcie potrzebne do przewinięcia całej zawartości horyzontalnie
      if (val === 'calc_horizontal_scroll') {
        newVars[key] = (i, target) => {
           // Jeśli target jest węższy niż ekran, nie przesuwaj (lub 0)
           if (target.scrollWidth <= window.innerWidth) return 0;
           // Wzór: -(szerokość_całkowita - szerokość_okna)
           return -(target.scrollWidth - window.innerWidth);
        };
      }
      
      // MACRO: calc_100vh (Pełna wysokość ekranu)
      if (val === 'calc_100vh') {
          newVars[key] = () => window.innerHeight;
      }

      // MACRO: calc_100vw (Pełna szerokość ekranu)
      if (val === 'calc_100vw') {
          newVars[key] = () => window.innerWidth;
      }
    }
  });

  return newVars;
}

registerWidget('scroll_timeline', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;

  let gsap;
  let ScrollTrigger;
  try {
    gsap = getGsap();
    ScrollTrigger = getScrollTrigger();
  } catch (e) {
    if (debug) console.error('[ScrollCrafter] GSAP missing', e);
    return;
  }

  // 1. Target resolution
  const mainSelector = config?.target?.selector;
  const mainElements = mainSelector
    ? node.ownerDocument.querySelectorAll(mainSelector)
    : [node];

  if (!mainElements.length) return;

  const steps = config?.timeline?.steps || [];
  const defaults = config?.timeline?.defaults || {};
  const stRaw = config?.scrollTrigger || {};

  // 2. Config ScrollTrigger
  const stConfig = {
    trigger: mainElements[0],
    start: stRaw.start || 'top 80%',
    end: stRaw.end || 'bottom 20%',
    toggleActions: stRaw.toggleActions || 'play none none reverse',
    invalidateOnRefresh: true, 
    ...(typeof stRaw.fastScrollEnd !== 'undefined' ? { fastScrollEnd: !!stRaw.fastScrollEnd } : {}),
    ...(typeof stRaw.preventOverlaps !== 'undefined' ? { preventOverlaps: !!stRaw.preventOverlaps } : {}),
    ...(typeof stRaw.scrub !== 'undefined' ? { scrub: stRaw.scrub } : {}),
    ...(typeof stRaw.once !== 'undefined' ? { once: !!stRaw.once } : {}),
    ...(typeof stRaw.markers !== 'undefined'
      ? { markers: !!stRaw.markers }
      : { markers: debug }),
    ...(typeof stRaw.pin !== 'undefined' ? { pin: !!stRaw.pin } : {}),
    ...(typeof stRaw.pinSpacing !== 'undefined' ? { pinSpacing: !!stRaw.pinSpacing } : {}),
    ...(typeof stRaw.anticipatePin !== 'undefined' ? { anticipatePin: Number(stRaw.anticipatePin) } : {}),
    ...(typeof stRaw.snap !== 'undefined' ? { snap: stRaw.snap } : {}),
  };

  const tl = gsap.timeline({ defaults, scrollTrigger: stConfig });

  // 3. Steps processing
  steps.forEach((step) => {
    let type = step?.type || 'from';
    
    // PRZETWARZANIE MAKR (Dla from i to)
    const fromVars = parseMacros(step?.from || {});
    const toVars = parseMacros(step?.to || {});
    
    // Auto-fix logic (from+to present)
    const hasFrom = Object.keys(fromVars).length > 0;
    const hasTo = Object.keys(toVars).length > 0;

    if (type === 'to' && hasFrom) type = 'fromTo';
    if (type === 'from' && hasTo) type = 'fromTo';

    const base = {};
    if (typeof step?.duration === 'number') base.duration = step.duration;
    if (typeof step?.delay === 'number') base.delay = step.delay;
    if (typeof step?.ease === 'string') base.ease = step.ease;
    if (typeof step?.stagger === 'number') base.stagger = step.stagger;

    const position = typeof step?.startAt === 'number' ? step.startAt : undefined;

    let targets = mainElements;
    if (step.selector) {
      const found = node.querySelectorAll(step.selector);
      if (found.length > 0) {
        targets = found;
      } else if (debug) {
        console.warn(`[ScrollCrafter] Step selector "${step.selector}" not found.`);
      }
    }

    if (type === 'fromTo') {
      tl.fromTo(targets, { ...fromVars }, { ...toVars, ...base }, position);
    } else if (type === 'to') {
      tl.to(targets, { ...toVars, ...base }, position);
    } else {
      tl.from(targets, { ...fromVars, ...base }, position);
    }
  });
});
