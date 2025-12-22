import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

/**
 * Helper: Bezpieczny parser wyrażeń matematycznych (Rozszerzony)
 * Obsługuje: sw (scrollWidth), cw (clientWidth), vw (viewportWidth), center, end
 */
function parseSmartValue(val, contextNode) {
    if (typeof val !== 'string') return val;

    // Kompatybilność wsteczna
    if (val === 'calc_scroll_width_neg') val = 'calc(sw * -1)';
    if (val === 'calc_scroll_width') val = 'calc(sw)';
    if (val === 'calc_100vh') val = 'calc(vh)';

    if (val.match(/^calc\s*\((.*)\)$/i)) {
        const expression = val.match(/^calc\s*\((.*)\)$/i)[1];

        return () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const cw = contextNode.clientWidth || 0;
            const ch = contextNode.clientHeight || 0;
            
            const totalScrollW = contextNode.scrollWidth - cw;
            const sw = totalScrollW > 0 ? totalScrollW : 0;

            // Zmienne pomocnicze
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
            // Sortujemy klucze od najdłuższych
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

  // --- Helper: Tworzenie i uruchamianie Tweena ---
  const createTween = (cfg, contextNode) => {
    // Określenie targetu (elementu do animacji)
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

    // Przetwarzanie Makr i Calc() w vars
    // Używamy pierwszego elementu jako kontekstu do obliczeń (np. clientWidth)
    const calcContext = elements[0]; 

    const vars = parseMacros({ ...animConfig.vars }, calcContext);
    const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, calcContext) : null;

    // Obsługa ScrollTrigger
    if (vars.scrollTrigger) {
      vars.scrollTrigger.trigger = contextNode;
      if (config.id) vars.scrollTrigger.id = 'sc-' + config.id;
    }
    if (vars2 && vars2.scrollTrigger) {
      vars2.scrollTrigger.trigger = contextNode;
      if (config.id) vars2.scrollTrigger.id = 'sc-' + config.id;
    }

    if (method === 'fromTo' && vars2) {
      return gsap.fromTo(elements, vars, vars2);
    } else if (typeof gsap[method] === 'function') {
      return gsap[method](elements, vars);
    }
    
    if (debug) console.warn(`${logPrefix} Unknown GSAP method:`, method);
    return null;
  };

  // --- GŁÓWNA LOGIKA MATCH MEDIA ---
  const mm = gsap.matchMedia();

  // 1. Global (domyślna animacja)
  mm.add("(min-width: 0px)", () => {
    if (config.animation) {
       logConfig('Global config', config);
       createTween(config, node);
    }
  });

  const sysBreakpoints = window.ScrollCrafterConfig?.breakpoints || [];

  // 2. Media Overrides
  if (config.media) {
    Object.keys(config.media).forEach((mediaSlug) => {
      const mediaAnim = config.media[mediaSlug];
      const isStrict = !!(mediaAnim.strict || (mediaAnim.animation && mediaAnim.animation.strict));

      const query = buildMediaQuery(mediaSlug, isStrict, sysBreakpoints);

      if (query) {
        mm.add(query, (context) => {
          const merged = {
            ...config,
            animation: mediaAnim,
          };
          logConfig(`Media override: ${mediaSlug} (strict: ${isStrict})`, merged);
          createTween(merged, node);
        });
      } else {
        if (debug) console.warn(`${logPrefix} Unknown or invalid breakpoint slug:`, mediaSlug);
      }
    });
  }
});
