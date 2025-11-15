// widgets/scroll-reveal.js
import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

registerWidget('scroll_reveal', (node, config) => {
  const gsap = getGsap();
  const ScrollTrigger = getScrollTrigger();

  const {
    target,
    animation,
    scrollTrigger,
    advanced,
  } = config;

  if (!target || !target.selector) return;

  const targetNodes = node.ownerDocument.querySelectorAll(target.selector);
  if (!targetNodes.length) return;

  const childSelector = advanced?.childSelector || null;
  const elements = childSelector
    ? node.querySelectorAll(childSelector)
    : targetNodes;

  if (!elements.length) return;

  if (advanced?.disableOnMobile) {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      return;
    }
  }

  const animType = animation?.type || 'from';
  const fromVars = animation?.from || {};
  const toVars = animation?.to || {};
  const duration = animation?.duration ?? 0.8;
  const delay = animation?.delay ?? 0;
  const ease = animation?.ease || 'power2.out';
  const stagger = animation?.stagger ?? 0;

  const stConfig = {
    trigger: targetNodes[0],
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
        stagger,
      },
    );
  } else if (animType === 'to') {
    tween = gsap.to(elements, {
      ...toVars,
      duration,
      delay,
      ease,
      stagger,
    });
  } else {
    tween = gsap.from(elements, {
      ...fromVars,
      duration,
      delay,
      ease,
      stagger,
    });
  }

  ScrollTrigger.create({
    ...stConfig,
    animation: tween,
  });

  document.dispatchEvent(
    new CustomEvent('scrollcrafter:scroll_reveal:init', {
      detail: { node, config, tween },
    }),
  );
});
