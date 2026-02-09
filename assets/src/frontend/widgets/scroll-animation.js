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

  if (debug) {
    console.log(`${logPrefix} RAW CONFIG`, config);
  }

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
      if (debug) console.log(`${logPrefix} SplitText requested: ${animConfig.split}, SplitText available: ${typeof window.SplitText}`);

      if (window.SplitText) {
        try {
          const requestedType = animConfig.split.toLowerCase();
          const existingSplit = elements[0]?._splitText;
          const existingType = elements[0]?._splitTextType;
          let split;

          // Check if existing split matches requested type
          const typeMatches = existingType === requestedType;
          const hasUsableSplit = existingSplit && (existingSplit.chars?.length || existingSplit.words?.length || existingSplit.lines?.length);

          if (hasUsableSplit && typeMatches) {
            // Reuse existing split - same type
            if (debug) console.log(`${logPrefix} Reusing existing SplitText (type: ${existingType})`);
            split = existingSplit;
          } else {
            // Type mismatch or no existing split - create fresh
            if (existingSplit) {
              if (debug) console.log(`${logPrefix} Type mismatch (${existingType} vs ${requestedType}), reverting and creating new`);
              existingSplit.revert();
            } else {
              if (debug) console.log(`${logPrefix} Creating fresh SplitText`);
            }

            split = new SplitText(elements, { type: requestedType });

            // Store reference AND type for future checks
            elements.forEach(el => {
              el._splitText = split;
              el._splitTextType = requestedType;
            });
          }

          // Select elements based on split type
          if (requestedType.includes('char') && split.chars && split.chars.length) elements = split.chars;
          else if (requestedType.includes('word') && split.words && split.words.length) elements = split.words;
          else if (requestedType.includes('line') && split.lines && split.lines.length) elements = split.lines;

          if (debug) console.log(`${logPrefix} SplitText elements count: ${elements.length}`);

          // Fix: Elements must be inline-block for rotation to work
          if (elements.length) {
            gsap.set(elements, { display: 'inline-block' });
          }
        } catch (e) {
          console.warn(`${logPrefix} SplitText error:`, e);
        }
      } else {
        console.warn(`${logPrefix} SplitText not available! Make sure GSAP SplitText is loaded.`);
      }
    }

    const vars = parseMacros({ ...animConfig.vars }, calcContext);
    const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, calcContext) : null;

    // Fix: Disable CSS transitions and modern CSS transforms to prevent conflict with GSAP
    gsap.set(elements, {
      transition: "none",
      translate: "none",
      rotate: "none",
      scale: "none"
    });

    if (vars.scrollTrigger) {
      vars.scrollTrigger.trigger = contextNode;
      if (config.id) vars.scrollTrigger.id = 'sc-' + config.id;
    }
    if (vars2 && vars2.scrollTrigger) {
      vars2.scrollTrigger.trigger = contextNode;
      if (config.id) vars2.scrollTrigger.id = 'sc-' + config.id;
    }

    if (debug) {
      console.log(`${logPrefix} CreateTween: method=${method}, elements=${elements.length}`, elements);
      console.log(`${logPrefix} Stagger Value:`, vars.stagger ?? animConfig.stagger ?? 'none');
      console.log(`${logPrefix} Vars:`, vars);
      if (vars2) console.log(`${logPrefix} Vars2 (To):`, vars2);
    }

    // Fix: For 'from' and 'fromTo', enable immediateRender
    // so initial values (like opacity: 0) are applied immediately
    if (method === 'from') {
      if (vars.immediateRender === undefined) vars.immediateRender = true;
    } else if (method === 'fromTo' && vars2) {
      if (vars2.immediateRender === undefined) vars2.immediateRender = true;
    }

    let tween;
    if (method === 'fromTo' && vars2) {
      tween = gsap.fromTo(elements, vars, vars2);
    } else if (typeof gsap[method] === 'function') {
      tween = gsap[method](elements, vars);
    }

    // Fix: Force all elements in a stagger to their initial state.
    // This solves the issue where Icon 2 and 3 were visible while Icon 1 was animating.
    if (tween && (method === 'from' || method === 'fromTo')) {
      tween.progress(1).progress(0);
    }

    if (!tween && debug) console.warn(`${logPrefix} Unknown GSAP method:`, method);
    return tween;
  };

  // Use shared responsive context - eliminates ~75 lines of duplicated code
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
