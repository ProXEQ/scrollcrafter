import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

/**
 * Helper: Bezpieczny parser wyrażeń matematycznych (Rozszerzony)
 * Obsługuje: sw (scrollWidth), cw (clientWidth), vw (viewportWidth), center, end
 */
function parseSmartValue(val, contextNode) {
  if (typeof val !== 'string') return val;

  if (val === 'calc_scroll_width_neg') val = 'calc(sw * -1)';
  if (val === 'calc_scroll_width') val = 'calc(sw)';
  if (val === 'calc_100vh') val = 'calc(vh)';

  if (val.match(/^calc\s*\((.*)\)$/i)) {
    let expression = val.match(/^calc\s*\((.*)\)$/i)[1];

    // Support unit-like syntax: 100sw -> 100 * sw
    // Only for dimensions (sw, cw, ch, vw, vh), not for keywords like center/end
    expression = expression.replace(/(\d)\s*(sw|cw|ch|vw|vh)\b/gi, '$1 * $2');

    return (index, target) => {
      const el = target || contextNode;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cw = el.clientWidth || 0;
      const ch = el.clientHeight || 0;

      const totalScrollW = el.scrollWidth - cw;
      const sw = totalScrollW > 0 ? totalScrollW : 0;

      const center = (vw - cw) / 2;
      const vcenter = (vh - ch) / 2;
      const end = vw - cw;

      const varsMap = {
        sw: sw, cw: cw, ch: ch, vw: vw, vh: vh,
        center: center, vcenter: vcenter, end: end
      };

      let cleanExpr = expression;
      Object.keys(varsMap).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        cleanExpr = cleanExpr.replace(regex, '');
      });

      if (!/^[0-9\.\+\-\*\/\(\)\s]*$/.test(cleanExpr)) {
        console.warn('[ScrollCrafter] Unsafe calc expression:', expression);
        return 0;
      }

      let finalExpr = expression;
      const sortedKeys = Object.keys(varsMap).sort((a, b) => b.length - a.length);

      sortedKeys.forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        finalExpr = finalExpr.replace(regex, varsMap[key]);
      });

      try {
        return new Function('return ' + finalExpr)();
      } catch (e) {
        console.error('[ScrollCrafter] Calc error:', e);
        return 0;
      }
    };
  }
  return val;
}

/**
 * Helper: Rekurencyjne parsowanie obiektu vars
 */
function parseMacros(vars, contextNode) {
  if (!vars || typeof vars !== 'object') return vars;
  const out = { ...vars };
  Object.keys(out).forEach((key) => {
    const val = out[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = parseMacros(val, contextNode);
      return;
    }
    out[key] = parseSmartValue(val, contextNode);
  });
  return out;
}

/**
 * Helper: Buduje Media Query
 */
function buildMediaQuery(targetSlug, isStrict, sortedBreakpoints) {
  if (!sortedBreakpoints || !Array.isArray(sortedBreakpoints)) return null;

  const currentIndex = sortedBreakpoints.findIndex(bp => bp.key === targetSlug);
  if (currentIndex === -1) return null;

  const currentBp = sortedBreakpoints[currentIndex];
  const maxQuery = `(max-width: ${currentBp.value}px)`;

  if (!isStrict) {
    return maxQuery;
  }

  let minQuery = '';
  if (currentIndex > 0) {
    const prevBp = sortedBreakpoints[currentIndex - 1];
    const minVal = prevBp.value + 1;
    minQuery = `(min-width: ${minVal}px) and `;
  } else {
    return maxQuery;
  }
  return `${minQuery}${maxQuery}`;
}

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
          // Check if elements already have split data and revert first
          elements.forEach(el => {
            if (el._splitText) {
              if (debug) console.log(`${logPrefix} Reverting existing SplitText`);
              el._splitText.revert();
            }
          });

          const split = new SplitText(elements, { type: animConfig.split });

          // Store reference for cleanup
          elements.forEach(el => { el._splitText = split; });

          // Priority: chars > words > lines
          if (split.chars && split.chars.length) elements = split.chars;
          else if (split.words && split.words.length) elements = split.words;
          else if (split.lines && split.lines.length) elements = split.lines;

          if (debug) console.log(`${logPrefix} SplitText created, elements count: ${elements.length}`);

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

    // Fix: Disable CSS transitions to prevent conflict with GSAP
    gsap.set(elements, {
      transition: "none",
      // Force individual transforms to 'none' if they exist to prevent conflicts with 'transform' property
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

    if (method === 'fromTo' && vars2) {
      return gsap.fromTo(elements, vars, vars2);
    } else if (typeof gsap[method] === 'function') {
      return gsap[method](elements, vars);
    }

    if (debug) console.warn(`${logPrefix} Unknown GSAP method:`, method);
    return null;
  };

  const mm = gsap.matchMedia();
  const sysBreakpoints = window.ScrollCrafterConfig?.breakpoints || [];

  // Ensure sorted by value
  const sortedBps = [...sysBreakpoints].sort((a, b) => a.value - b.value);

  let prevMax = 0;
  const rangeConfig = [];

  // Build ranges for defined breakpoints
  sortedBps.forEach(bp => {
    const min = prevMax + 1;
    const max = bp.value;
    prevMax = max;

    const query = min === 1
      ? `(max-width: ${max}px)`
      : `(min-width: ${min}px) and (max-width: ${max}px)`;

    rangeConfig.push({ slug: bp.key, query });
  });

  // Add Desktop/Default (above last breakpoint)
  rangeConfig.push({
    slug: '_default_desktop',
    query: `(min-width: ${prevMax + 1}px)`
  });

  // Register Contexts
  const tweens = [];

  rangeConfig.forEach(range => {
    mm.add(range.query, () => {
      let activeConfig = config.animation; // Default to global/base

      // Check for override
      if (range.slug !== '_default_desktop' && config.media && config.media[range.slug]) {
        activeConfig = config.media[range.slug];
        logConfig(`Active: ${range.slug} (Override)`, { ...config, animation: activeConfig });
      } else {
        logConfig(`Active: ${range.slug} (Global)`, config);
      }

      if (activeConfig) {
        const tween = createTween({ ...config, animation: activeConfig }, node);
        if (tween) tweens.push(tween);

        // Force play if this is a manual preview
        const isManualPreview = (window.ScrollCrafterForcePreview === config.id) ||
          (window.parent && window.parent.ScrollCrafterForcePreview === config.id) ||
          (node.getAttribute('data-sc-preview') === 'yes');

        if (isManualPreview && tween) {
          if (debug) console.log(`${logPrefix} Manual preview detected, force playing animation`);

          if (tween.scrollTrigger) {
            const st = tween.scrollTrigger;
            // For Pin/Scrub, animate progress to show effect without breaking structure
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
            // For non-ScrollTrigger animations
            tween.restart(true);
          }
        }
      }
    });
  });

  return () => {
    if (debug) console.log(`${logPrefix} Cleaning up...`);
    mm.revert(); // Revert matchMedia
    tweens.forEach(t => {
      if (t.scrollTrigger) {
        // Very important for Pin: kill(true) removes the spacer and reverts DOM
        t.scrollTrigger.kill(true);
      }
      t.kill();
    });
  };
});
