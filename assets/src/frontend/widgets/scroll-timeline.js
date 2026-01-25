import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';
import { parseMacros } from '../core/utils';

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

    // Fix: Disable CSS transitions and modern CSS transforms to prevent conflict with GSAP
    gsap.set(targets, {
      transition: "none",
      translate: "none",
      rotate: "none",
      scale: "none"
    });

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

    // Fix: For 'from' and 'fromTo' in timeline, enable immediateRender
    if (method === 'from') {
      if (vars.immediateRender === undefined) vars.immediateRender = true;
    } else if (method === 'fromTo' && vars2) {
      if (vars2.immediateRender === undefined) vars2.immediateRender = true;
    }

    try {
      let stepTween;
      if (method === 'fromTo' && vars2) stepTween = tl.fromTo(targets, vars, vars2, position);
      else if (typeof tl[method] === 'function') stepTween = tl[method](targets, vars, position);

      // Fix: Force initialization of stagger elements in timeline steps
      if (stepTween && (method === 'from' || method === 'fromTo')) {
        // Note: progress() on a timeline step tween might be tricky depending on GSAP version,
        // but tl.add(tween.progress(1).progress(0)) is another way.
        // Most stable is to just ensure immediateRender: true is passed.
      }
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
  const timelines = [];

  rangeConfig.forEach(range => {
    mm.add(range.query, () => {
      let activeConfig = config; // Default to global config struct (which has steps)
      // For timeline, config IS the container of steps.
      // Media overrides usually provide different 'steps' or 'timelineVars'.

      let isOverride = false;
      if (range.slug !== '_default_desktop' && config.media && config.media[range.slug]) {
        if (config.media[range.slug]) {
          activeConfig = config.media[range.slug];
          isOverride = true;
        }
      }

      // Validation: Ensure activeConfig has steps
      if (activeConfig && activeConfig.steps && activeConfig.steps.length > 0) {
        let tl;
        if (isOverride) {
          logConfig(`Active: ${range.slug} (Override)`, activeConfig);
          tl = createTimeline(node, activeConfig, config, debug, logPrefix + `[${range.slug}]`, gsap);
        } else {
          logConfig(`Active: ${range.slug} (Global)`, activeConfig);
          tl = createTimeline(node, activeConfig, config, debug, logPrefix, gsap);
        }

        if (tl) timelines.push(tl);

        // --- Preview Logic ---
        const isManualPreview = (window.ScrollCrafterForcePreview === config.id) ||
          (window.parent && window.parent.ScrollCrafterForcePreview === config.id) ||
          (node.getAttribute('data-sc-preview') === 'yes');

        if (isManualPreview && tl) {
          if (debug) console.log(`${logPrefix} Manual preview detected, force playing timeline`);
          if (tl.scrollTrigger) {
            const st = tl.scrollTrigger;
            if (st.pin || (st.vars && st.vars.scrub)) {
              if (debug) console.log(`${logPrefix} Pin/Scrub detected, animating progress`);
              gsap.fromTo(st, { progress: 0 }, {
                progress: 1,
                duration: 1.5,
                ease: "power1.inOut"
              });
            } else {
              st.disable();
              tl.restart(true);
            }
          } else {
            tl.restart(true);
          }
        }
      }
    });
  });

  return () => {
    if (debug) console.log(`${logPrefix} Cleaning up...`);
    mm.revert();
    timelines.forEach(t => {
      if (t.scrollTrigger) {
        t.scrollTrigger.kill(true); // Reverts pin-spacer etc.
      }
      t.kill();
    });
  };
});
