import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

registerWidget('scroll_timeline', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;

  let gsap;
  let ScrollTrigger;
  try {
    gsap = getGsap();
    ScrollTrigger = getScrollTrigger();
  } catch (e) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.error('[ScrollCrafter][scroll_timeline] GSAP/ScrollTrigger error', e);
    }
    return;
  }

  const selector = config?.target?.selector;
  const elements = selector
    ? node.ownerDocument.querySelectorAll(selector)
    : [node];

  if (!elements.length) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn('[ScrollCrafter][scroll_timeline] no target elements for selector', selector);
    }
    return;
  }

  const steps = config?.timeline?.steps || [];
  const defaults = config?.timeline?.defaults || {};
  const stRaw = config?.scrollTrigger || {};

  const stConfig = {
    trigger: elements[0],
    start: stRaw.start || 'top 80%',
    end: stRaw.end || 'bottom 20%',
    toggleActions: stRaw.toggleActions || 'play none none reverse',
    ...(typeof stRaw.scrub !== 'undefined' ? { scrub: stRaw.scrub } : {}),
    ...(typeof stRaw.once !== 'undefined' ? { once: !!stRaw.once } : {}),
    ...(typeof stRaw.markers !== 'undefined'
      ? { markers: !!stRaw.markers }
      : { markers: !!window.ScrollCrafterConfig?.debug }),
    ...(typeof stRaw.pin !== 'undefined' ? { pin: !!stRaw.pin } : {}),
    ...(typeof stRaw.pinSpacing !== 'undefined' ? { pinSpacing: !!stRaw.pinSpacing } : {}),
    ...(typeof stRaw.anticipatePin !== 'undefined'
      ? { anticipatePin: Number(stRaw.anticipatePin) }
      : {}),
    ...(typeof stRaw.snap !== 'undefined' ? { snap: stRaw.snap } : {}),
  };

  const tl = gsap.timeline({ defaults, scrollTrigger: stConfig });

  steps.forEach((step) => {
    const type = step?.type || 'from';
    const fromVars = step?.from || {};
    const toVars = step?.to || {};
    const duration = typeof step?.duration === 'number' ? step.duration : undefined;
    const delay = typeof step?.delay === 'number' ? step.delay : undefined;
    const ease = step?.ease;
    const stagger = typeof step?.stagger === 'number' ? step.stagger : undefined;
    const position = typeof step?.startAt === 'number' ? step.startAt : undefined;

    const base = {};
    if (typeof duration === 'number') base.duration = duration;
    if (typeof delay === 'number') base.delay = delay;
    if (typeof ease === 'string') base.ease = ease;
    if (typeof stagger === 'number') base.stagger = stagger;

    if (type === 'fromTo') {
      tl.fromTo(elements, { ...fromVars }, { ...toVars, ...base }, position);
    } else if (type === 'to') {
      tl.to(elements, { ...toVars, ...base }, position);
    } else {
      tl.from(elements, { ...fromVars, ...base }, position);
    }
  });
});
