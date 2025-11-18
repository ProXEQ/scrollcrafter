import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

registerWidget('scroll_animation', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;

    // eslint-disable-next-line no-console
    console.log('[ScrollCrafter][scroll_animation] init', { node, config });

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

  const { target, animation, scrollTrigger } = config;

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
  const duration = animation?.duration ?? 0.8;
  const delay = animation?.delay ?? 0;
  const ease = animation?.ease || 'power2.out';

  const stConfig = {
    trigger: elements[0],
    start: scrollTrigger?.start || 'top 80%',
    end: scrollTrigger?.end || 'bottom 20%',
    toggleActions: scrollTrigger?.toggleActions || 'play none none reverse',
    once: !!scrollTrigger?.once,
    scrub: !!scrollTrigger?.scrub,
    markers: !!window.ScrollCrafterConfig?.debug,
  };

  let tween;

  if (animType === 'fromTo') {
    tween = gsap.fromTo(
      elements,
      { ...fromVars },
      {
        ...toVars,
        duration,
        delay,
        ease,
      },
    );
  } else if (animType === 'to') {
    tween = gsap.to(elements, {
      ...toVars,
      duration,
      delay,
      ease,
    });
  } else {
    tween = gsap.from(elements, {
      ...fromVars,
      duration,
      delay,
      ease,
    });
  }

  ScrollTrigger.create({
    ...stConfig,
    animation: tween,
  });
});
