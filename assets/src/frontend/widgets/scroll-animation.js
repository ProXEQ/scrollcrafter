import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

registerWidget('scroll_animation', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;

  if (debug) {
    // eslint-disable-next-line no-console
    console.log('[ScrollCrafter][scroll_animation] init', { node, config });
  }

  let gsap;
  let ScrollTrigger;

  try {
    gsap = getGsap();
    ScrollTrigger = getScrollTrigger();
  } catch (e) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.error('[ScrollCrafter][scroll_animation] GSAP/ScrollTrigger error', e);
    }
    return;
  }

  const { target, animation, scrollTrigger } = config || {};

  const selector = target?.selector;
  if (!selector) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn('[ScrollCrafter][scroll_animation] missing target selector', config);
    }
    return;
  }

  const targetNodes = node.ownerDocument.querySelectorAll(selector);
  if (!targetNodes.length) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn('[ScrollCrafter][scroll_animation] no target nodes found', selector);
    }
    return;
  }

  const elements = targetNodes;

  const animType = animation?.type || 'from';
  const fromVars = animation?.from || {};
  const toVars = animation?.to || {};
  const duration = typeof animation?.duration === 'number' ? animation.duration : 0.8;
  const delay = typeof animation?.delay === 'number' ? animation.delay : 0;
  const ease = animation?.ease || 'power2.out';
  const stagger = typeof animation?.stagger === 'number' ? animation.stagger : undefined;

  const stRaw = scrollTrigger || {};

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

  const base = {
    duration,
    delay,
    ease,
  };
  if (typeof stagger === 'number') {
    base.stagger = stagger;
  }

  let tween;

  if (animType === 'fromTo') {
    tween = gsap.fromTo(
      elements,
      { ...fromVars },
      {
        ...toVars,
        ...base,
      },
    );
  } else if (animType === 'to') {
    tween = gsap.to(elements, {
      ...toVars,
      ...base,
    });
  } else {
    tween = gsap.from(elements, {
      ...fromVars,
      ...base,
    });
  }

  ScrollTrigger.create({
    ...stConfig,
    animation: tween,
  });
});
