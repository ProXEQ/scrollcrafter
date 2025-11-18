import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

registerWidget('scroll_timeline', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;

  let gsap; let ScrollTrigger;
  try {
    gsap = getGsap();
    ScrollTrigger = getScrollTrigger();
  } catch (e) {
    if (debug) console.error('[ScrollCrafter][scroll_timeline] GSAP error', e);
    return;
  }

  const selector = config?.target?.selector;
  const elements = selector ? node.ownerDocument.querySelectorAll(selector) : [node];
  if (!elements.length) {
    if (debug) console.warn('[ScrollCrafter][scroll_timeline] no target', selector);
    return;
  }

  const steps = config?.timeline?.steps || [];
  const defaults = config?.timeline?.defaults || {};

  const stConfig = {
    trigger: elements[0],
    start: config?.scrollTrigger?.start || 'top 80%',
    end: config?.scrollTrigger?.end || 'bottom 20%',
    toggleActions: config?.scrollTrigger?.toggleActions || 'play none none reverse',
    ...(typeof config?.scrollTrigger?.scrub !== 'undefined' ? { scrub: config.scrollTrigger.scrub } : {}),
    ...(typeof config?.scrollTrigger?.markers !== 'undefined'
        ? { markers: !!config.scrollTrigger.markers }
        : { markers: !!window.ScrollCrafterConfig?.debug }),
    ...(typeof config?.scrollTrigger?.pin !== 'undefined' ? { pin: !!config.scrollTrigger.pin } : {}),
    ...(typeof config?.scrollTrigger?.pinSpacing !== 'undefined' ? { pinSpacing: !!config.scrollTrigger.pinSpacing } : {}),
    ...(typeof config?.scrollTrigger?.anticipatePin !== 'undefined' ? { anticipatePin: Number(config.scrollTrigger.anticipatePin) } : {}),
    ...(typeof config?.scrollTrigger?.snap !== 'undefined' ? { snap: config.scrollTrigger.snap } : {}),
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
