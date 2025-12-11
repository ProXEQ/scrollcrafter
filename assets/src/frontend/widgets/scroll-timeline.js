import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

/**
 * Minimalny helper: makra na function-based values.
 * Nie próbuje zgadywać layoutu – używa wyłącznie contextNode,
 * który jest wrapperem widgetu (node).
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

    if (typeof val === 'string') {
      if (val === 'calc_100vh') {
        out[key] = () => window.innerHeight;
      } else if (val === 'calc_100vw') {
        out[key] = () => window.innerWidth;
      } else if (val === 'calc_scroll_width') {
        out[key] = () => {
          const el = contextNode;
          return el.scrollWidth - el.clientWidth;
        };
      } else if (val === 'calc_scroll_width_neg' || val === 'calc_horizontal_scroll') {
        out[key] = () => {
          const el = contextNode;
          if (el.scrollWidth <= el.clientWidth) return 0;
          return -(el.scrollWidth - el.clientWidth);
        };
      }
    }
  });

  return out;
}

/**
 * Neutralny wybór elementu do pina:
 * pinujemy dokładnie węzeł, który ma data-scrollcrafter-config.
 */
function getPinElement(node) {
  return node;
}

registerWidget('scroll_timeline', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;
  const logPrefix = `[ScrollCrafter][timeline:${config.id || 'unknown'}]`;

  let gsap;
  let ScrollTrigger;
  try {
    gsap = getGsap();
    ScrollTrigger = getScrollTrigger();
  } catch (e) {
    if (debug) console.error(`${logPrefix} GSAP/ScrollTrigger missing`, e);
    return;
  }

  const pinElem = getPinElement(node);

  // --- TARGETY ---
  const targetCfg = config.target || {};
  let mainTargets = [pinElem];

  if (targetCfg.selector && targetCfg.type !== 'wrapper') {
    const found = pinElem.querySelectorAll(targetCfg.selector);
    if (found.length) {
      mainTargets = Array.from(found);
    }
  }

  // --- TIMELINE VARS ---
  const timelineVars = { ...(config.timelineVars || {}) };

  // Defaults (duration, ease, itp.)
  if (timelineVars.defaults) {
    timelineVars.defaults = parseMacros(timelineVars.defaults, pinElem);
  }

  // ScrollTrigger – bez zgadywania, używamy tego, co dał backend.
  if (!timelineVars.scrollTrigger) {
    timelineVars.scrollTrigger = {};
  }

  const st = timelineVars.scrollTrigger;

  if (!st.trigger) {
    st.trigger = pinElem;
  }
  if (st.pin === true) {
    st.pin = pinElem;
  }

  // Minimalne anty-glitche, ale neutralne:
  if (typeof st.invalidateOnRefresh === 'undefined') {
    st.invalidateOnRefresh = true;
  }
  if (typeof st.anticipatePin === 'undefined') {
    st.anticipatePin = 0.5;
  }

  if (config.id && !st.id) {
    st.id = `sc-${config.id}`;
  }

  // ŻADNYCH auto-end, fastScrollEnd, scroller=window – użytkownik kontroluje to w DSL.

  const tl = gsap.timeline(timelineVars);

  const steps = config.steps || [];

  steps.forEach((step, index) => {
    const method = step.method || 'to';
    const position = step.position;

    if (method === 'addLabel') {
      const label = step.vars;
      if (typeof label === 'string') tl.addLabel(label, position);
      return;
    }

    if (method === 'call') {
      return;
    }

    let targets = mainTargets;

    if (step.selector) {
      const found = pinElem.querySelectorAll(step.selector);
      if (!found.length) {
        if (debug) {
          console.warn(
            `${logPrefix} Step ${index + 1}: selector "${step.selector}" not found in`,
            pinElem
          );
        }
        return;
      }
      targets = Array.from(found);
    }

    const vars = parseMacros(step.vars || {}, pinElem);
    const vars2 = step.vars2 ? parseMacros(step.vars2, pinElem) : null;

    try {
      if (method === 'fromTo' && vars2) {
        tl.fromTo(targets, vars, vars2, position);
      } else if (typeof tl[method] === 'function') {
        tl[method](targets, vars, position);
      } else if (debug) {
        console.warn(`${logPrefix} Unknown method "${method}"`);
      }
    } catch (e) {
      if (debug) console.error(`${logPrefix} Error in step ${index + 1}`, e);
    }
  });
});
