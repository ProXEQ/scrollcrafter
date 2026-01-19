import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

/**
 * Helper: Buduje Media Query z obsługą Strict
 * @param {string} targetSlug - np. 'tablet'
 * @param {boolean} isStrict - czy włączono tryb strict
 * @param {Array} sortedBreakpoints - tablica z Configu [{key:'mobile', value:767}, ...]
 */
/**
 * Helper: Bezpieczny parser wyrażeń matematycznych (Rozszerzony)
 */
function parseSmartValue(val, contextNode) {
  if (typeof val !== 'string') return val;

  if (val === 'calc_scroll_width_neg') val = 'calc(sw * -1)';
  if (val === 'calc_scroll_width') val = 'calc(sw)';
  if (val === 'calc_100vh') val = 'calc(vh)';

  if (val.match(/^calc\s*\((.*)\)$/i)) {
    let expression = val.match(/^calc\s*\((.*)\)$/i)[1];

    // Support unit-like syntax: 100sw -> 100 * sw
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
      const end = vw - cw;
      const vcenter = (vh - ch) / 2;

      const varsMap = { sw, cw, ch, vw, vh, center, vcenter, end };

      let cleanExpr = expression;
      Object.keys(varsMap).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        cleanExpr = cleanExpr.replace(regex, '');
      });

      if (!/^[0-9\.\+\-\*\/\(\)\s]*$/.test(cleanExpr)) {
        console.warn('[ScrollCrafter] Unsafe characters in calc expression:', expression);
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

function getPinElement(node) {
  return node;
}

function createTimeline(node, configData, globalConfig, debug, logPrefix, gsap) {
  const pinElem = getPinElement(node);

  const targetCfg = configData.target || globalConfig.target || {};
  let mainTargets = [pinElem];

  if (targetCfg.selector && targetCfg.type !== 'wrapper') {
    const found = pinElem.querySelectorAll(targetCfg.selector);
    if (found.length) mainTargets = Array.from(found);
  }

  const timelineVars = { ...(configData.timelineVars || {}) };
  if (timelineVars.defaults) {
    timelineVars.defaults = parseMacros(timelineVars.defaults, pinElem);
  }

  if (!timelineVars.scrollTrigger) timelineVars.scrollTrigger = {};
  const st = timelineVars.scrollTrigger;

  if (!st.trigger) st.trigger = pinElem;
  if (st.pin === true) st.pin = pinElem;

  // Fix Elementor Jump: Disable CSS transitions on pinned element to prevent conflicts
  if (st.pin) {
    gsap.set(st.pin, { transition: "none" });
  }
  if (typeof st.invalidateOnRefresh === 'undefined') st.invalidateOnRefresh = true;
  if (typeof st.anticipatePin === 'undefined') st.anticipatePin = 0.5;
  if (globalConfig.id && !st.id) st.id = `sc-${globalConfig.id}`;

  const tl = gsap.timeline(timelineVars);

  const steps = configData.steps || [];
  steps.forEach((step, index) => {
    const method = step.method || 'to';
    const position = step.position;

    if (method === 'addLabel') {
      const label = step.vars;
      if (typeof label === 'string') tl.addLabel(label, position);
      return;
    }
    if (method === 'call') return;

    let targets = mainTargets;
    if (step.selector) {
      const found = pinElem.querySelectorAll(step.selector);
      if (!found.length) {
        if (debug) console.warn(`${logPrefix} Step ${index + 1}: selector "${step.selector}" not found`);
        return;
      }
      targets = Array.from(found);
    }

    const vars = parseMacros(step.vars || {}, pinElem);
    const vars2 = step.vars2 ? parseMacros(step.vars2, pinElem) : null;

    // --- SplitText Support (Timeline) ---
    if (step.split && window.SplitText) {
      try {
        const split = new SplitText(targets, { type: step.split });
        if (split.chars && split.chars.length) targets = split.chars;
        else if (split.words && split.words.length) targets = split.words;
        else if (split.lines && split.lines.length) targets = split.lines;

        if (targets.length) {
          gsap.set(targets, { display: 'inline-block' });
        }
      } catch (e) {
        if (debug) console.warn(`${logPrefix} SplitText error:`, e);
      }
    }

    if (debug) {
      console.log(`${logPrefix} Step ${index + 1}: method=${method}, targets=${targets.length}`, targets);
    }

    try {
      if (method === 'fromTo' && vars2) tl.fromTo(targets, vars, vars2, position);
      else if (typeof tl[method] === 'function') tl[method](targets, vars, position);
    } catch (e) {
      if (debug) console.error(`${logPrefix} Error step ${index + 1}`, e);
    }
  });

  return tl;
}


registerWidget('scroll_timeline', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;
  const logPrefix = `[ScrollCrafter][timeline:${config.id || 'tl'}]`;

  const logConfig = (label, cfg) => {
    if (!debug) return;
    console.group(`${logPrefix} ${label}`);
    console.log('Details:', cfg);
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
  rangeConfig.forEach(range => {
    mm.add(range.query, () => {
      let activeConfig = config; // Default to global config struct (which has steps)
      // For timeline, config IS the container of steps.
      // Media overrides usually provide different 'steps' or 'timelineVars'.

      let isOverride = false;
      if (range.slug !== '_default_desktop' && config.media && config.media[range.slug]) {
        // Merge override logic for timeline is complex (handled in PHP builder mostly?)
        // PHP builder returns a processed `config` where `media` contains FULL config objects for that media?
        // Let's check Timeline_Config_Builder.
        // It returns 'media' => [ slug => mediaConfig ].
        // So we should use that.

        if (config.media[range.slug]) {
          activeConfig = config.media[range.slug];
          isOverride = true;
        }
      }

      // Validation: Ensure activeConfig has steps
      if (activeConfig && activeConfig.steps && activeConfig.steps.length > 0) {
        if (isOverride) {
          logConfig(`Active: ${range.slug} (Override)`, activeConfig);
          // Pass 'config' as global context if needed? createTimeline uses activeConfig as configData, and config as globalConfig
          createTimeline(node, activeConfig, config, debug, logPrefix + `[${range.slug}]`, gsap);
        } else {
          logConfig(`Active: ${range.slug} (Global)`, activeConfig);
          createTimeline(node, activeConfig, config, debug, logPrefix, gsap);
        }
      }
    });
  });

  if (debug && config.media) {
    const knownSlugs = new Set(sortedBps.map(b => b.key));
    Object.keys(config.media).forEach(k => {
      if (!knownSlugs.has(k)) {
        console.warn(`${logPrefix} Unknown breakpoint slug used:`, k);
      }
    });
  }
});
