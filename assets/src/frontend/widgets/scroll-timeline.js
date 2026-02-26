import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';
import { parseMacros } from '../core/utils';
import { createResponsiveContext } from '../core/responsive';

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

    // Map opacity to autoAlpha for BETTER visibility handling (prevents FOUC)
    const ensureAutoAlpha = (v) => {
      if (v && v.opacity !== undefined) {
        v.autoAlpha = v.opacity;
        delete v.opacity;
      }
    };
    ensureAutoAlpha(vars);
    ensureAutoAlpha(vars2);

    gsap.set(targets, {
      transition: "none",
      translate: "none",
      rotate: "none",
      scale: "none"
    });

    if (step.split && window.SplitText) {
      try {
        // HIDE original targets immediately to prevent FOUC
        targets.forEach(el => {
          if (el.style) el.style.visibility = 'hidden';
        });

        const split = new SplitText(targets, { type: step.split });
        if (split.chars && split.chars.length) targets = split.chars;
        else if (split.words && split.words.length) targets = split.words;
        else if (split.lines && split.lines.length) targets = split.lines;

        if (targets.length) {
          gsap.set(targets, {
            display: 'inline-block',
            backfaceVisibility: 'hidden',
            visibility: 'hidden', // Keep hidden until GSAP takes over
            lazy: false
          });
        }
      } catch (e) {
        if (debug) console.warn(`${logPrefix} SplitText error:`, e);
      }
    }

    if (method === 'from' || method === 'fromTo') {
      vars.immediateRender = true;

      // FAIL-SAFE: Ensure elements are hidden if they are starting from opacity 0 or if we split them
      if (vars.autoAlpha === 0 || vars.opacity === 0 || step.split) {
        targets.forEach(el => {
          if (el.style) el.style.visibility = 'hidden';
        });
      }
    }

    try {
      let stepTween;
      const tweenVars = { ...vars, overwrite: 'auto', lazy: false };
      if (method === 'fromTo' && vars2) {
        stepTween = tl.fromTo(targets, tweenVars, { ...vars2, overwrite: 'auto', lazy: false }, position);
      } else if (typeof tl[method] === 'function') {
        stepTween = tl[method](targets, tweenVars, position);
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

  const timelines = [];

  const handlePreview = (tl) => {
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
  };

  const cleanup = createResponsiveContext(gsap, config, (activeConfig, range) => {
    const configWithSteps = activeConfig.steps ? activeConfig : config;

    if (!configWithSteps.steps || configWithSteps.steps.length === 0) {
      return null;
    }

    logConfig(`Active: ${range.slug}`, activeConfig);
    const tl = createTimeline(node, configWithSteps, config, debug, logPrefix + `[${range.slug}]`, gsap);

    if (tl) {
      timelines.push(tl);
      handlePreview(tl);
    }
    return tl;
  }, node);

  return () => {
    if (debug) console.log(`${logPrefix} Cleaning up...`);
    cleanup();
    timelines.forEach(t => {
      if (t.scrollTrigger) {
        t.scrollTrigger.kill(true);
      }
      t.kill();
    });
  };
});
