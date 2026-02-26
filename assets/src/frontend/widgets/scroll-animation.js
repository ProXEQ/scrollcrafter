import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';
import { parseMacros } from '../core/utils';
import { createResponsiveContext } from '../core/responsive';

registerWidget('scroll_animation', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;
  const logPrefix = `[ScrollCrafter][${config.id || 'anim'}]`;

  const logConfig = (label, cfg) => {
    if (!debug) return;
    console.group(`${logPrefix} ${label}`);
    console.log('Method:', cfg.animation?.method);
    console.log('Vars:', cfg.animation?.vars);
    console.log('Vars2:', cfg.animation?.vars2);
    console.log('Target:', cfg.target || config.target);
    console.groupEnd();
  };

  let gsap;
  try {
    gsap = getGsap();
    getScrollTrigger();
  } catch (e) {
    if (debug) console.error(`${logPrefix} GSAP missing`, e);
    return;
  }

  const createTween = (cfg, contextNode) => {
    const targetConfig = cfg.target || config.target || {};
    let elements = [];

    if (targetConfig.type === 'wrapper') {
      elements = [contextNode];
    } else if (targetConfig.selector) {
      elements = contextNode.querySelectorAll(targetConfig.selector);
    } else {
      elements = [contextNode];
    }

    if (!elements.length) {
      if (debug) console.warn(`${logPrefix} No elements found for selector:`, targetConfig.selector);
      return null;
    }

    const animConfig = cfg.animation || {};
    const method = animConfig.method || 'from';

    const calcContext = elements[0];

    // --- SplitText Support ---
    if (animConfig.split) {
      if (window.SplitText) {
        try {
          const requestedType = animConfig.split.toLowerCase();
          const existingSplit = elements[0]?._splitText;
          const existingType = elements[0]?._splitTextType;
          let split;

          const typeMatches = existingType === requestedType;
          const hasUsableSplit = existingSplit && (existingSplit.chars?.length || existingSplit.words?.length || existingSplit.lines?.length);

          if (hasUsableSplit && typeMatches) {
            split = existingSplit;
          } else {
            if (existingSplit) {
              existingSplit.revert();
            }

            split = new SplitText(elements, { type: requestedType });

            elements.forEach(el => {
              el._splitText = split;
              el._splitTextType = requestedType;
            });
          }

          if (requestedType.includes('char') && split.chars && split.chars.length) elements = split.chars;
          else if (requestedType.includes('word') && split.words && split.words.length) elements = split.words;
          else if (requestedType.includes('line') && split.lines && split.lines.length) elements = split.lines;

          if (elements.length) {
            gsap.set(elements, { display: 'inline-block', backfaceVisibility: 'hidden' });
          }
        } catch (e) {
          if (debug) console.warn(`${logPrefix} SplitText error:`, e);
        }
      } else {
        if (debug) console.warn(`${logPrefix} SplitText not found`);
      }
    }

    const vars = parseMacros({ ...animConfig.vars }, calcContext);
    const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, calcContext) : null;

    // Standardize variables — map opacity to autoAlpha for visibility-aware handling
    const ensureAutoAlpha = (v) => {
      if (v && v.opacity !== undefined) {
        v.autoAlpha = v.opacity;
        delete v.opacity;
      }
    };
    ensureAutoAlpha(vars);
    ensureAutoAlpha(vars2);

    // Apply defaults and ScrollTrigger
    if (vars.scrollTrigger) {
      vars.scrollTrigger.trigger = contextNode;
      if (config.id) vars.scrollTrigger.id = 'sc-' + config.id;
      if (typeof vars.scrollTrigger.invalidateOnRefresh === 'undefined') vars.scrollTrigger.invalidateOnRefresh = true;
      if (vars.scrollTrigger.pin) {
        if (typeof vars.scrollTrigger.anticipatePin === 'undefined') vars.scrollTrigger.anticipatePin = 0.8;
        if (typeof vars.scrollTrigger.pinSpacing === 'undefined') vars.scrollTrigger.pinSpacing = true;
        if (typeof vars.scrollTrigger.fastScrollEnd === 'undefined') vars.scrollTrigger.fastScrollEnd = true;
      }
    }
    if (vars2 && vars2.scrollTrigger) {
      vars2.scrollTrigger.trigger = contextNode;
      if (config.id) vars2.scrollTrigger.id = 'sc-' + config.id;
    }

    if (method === 'from' || method === 'fromTo') {
      vars.immediateRender = true;

      // FAIL-SAFE: Hide elements only if they animate FROM opacity 0
      if (vars.autoAlpha === 0 || vars.opacity === 0) {
        elements.forEach(el => {
          if (el.style) el.style.visibility = 'hidden';
        });
      }
    }

    // Forces GSAP to apply the initial state immediately without waiting for next tick
    if (vars.scrollTrigger) {
      vars.immediateRender = true;
    }

    let tween;
    const tweenVars = { ...vars, overwrite: 'auto', lazy: false };

    if (method === 'fromTo' && vars2) {
      tween = gsap.fromTo(elements, tweenVars, { ...vars2, overwrite: 'auto' });
    } else if (typeof gsap[method] === 'function') {
      tween = gsap[method](elements, tweenVars);
    }

    if (!tween && debug) console.warn(`${logPrefix} Unknown GSAP method:`, method);
    return tween;
  };

  const tweens = [];

  const handlePreview = (tween) => {
    const isManualPreview = (window.ScrollCrafterForcePreview === config.id) ||
      (window.parent && window.parent.ScrollCrafterForcePreview === config.id) ||
      (node.getAttribute('data-sc-preview') === 'yes');

    if (isManualPreview && tween) {
      if (debug) console.log(`${logPrefix} Manual preview detected, force playing animation`);

      if (tween.scrollTrigger) {
        const st = tween.scrollTrigger;
        if (st.pin || (st.vars && st.vars.scrub)) {
          if (debug) console.log(`${logPrefix} Pin/Scrub detected, animating progress`);
          gsap.fromTo(st, { progress: 0 }, {
            progress: 1,
            duration: 1.5,
            ease: "power1.inOut"
          });
        } else {
          st.disable();
          tween.restart(true);
        }
      } else {
        tween.restart(true);
      }
    }
  };

  const cleanup = createResponsiveContext(gsap, config, (activeConfig, range) => {
    logConfig(`Active: ${range.slug}`, { ...config, animation: activeConfig });

    const tween = createTween({ ...config, animation: activeConfig }, node);
    if (tween) {
      tweens.push(tween);
      handlePreview(tween);
    }
    return tween;
  }, node);

  return () => {
    if (debug) console.log(`${logPrefix} Cleaning up...`);
    cleanup();
    tweens.forEach(t => {
      if (t.scrollTrigger) {
        t.scrollTrigger.kill(true);
      }
      t.kill();
    });
  };
});
