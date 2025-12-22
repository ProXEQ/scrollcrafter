import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

/**
 * Helper: Buduje Media Query z obsługą Strict
 * @param {string} targetSlug - np. 'tablet'
 * @param {boolean} isStrict - czy włączono tryb strict
 * @param {Array} sortedBreakpoints - tablica z Configu [{key:'mobile', value:767}, ...]
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
    }
    return `${minQuery}${maxQuery}`;
}

// --- HELPERS ---
/**
 * Helper: Bezpieczny parser wyrażeń matematycznych (Rozszerzony)
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
            // 1. Podstawowe wymiary
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const cw = contextNode.clientWidth || 0;  // Szerokość elementu/kontenera
            const ch = contextNode.clientHeight || 0; // Wysokość elementu
            
            // Scroll Width (dla kontenerów horyzontalnych)
            // scrollWidth to cała zawartość, clientWidth to widok.
            // sw = ile faktycznie "wystaje" do przewinięcia.
            const totalScrollW = contextNode.scrollWidth - cw;
            const sw = totalScrollW > 0 ? totalScrollW : 0;

            // 2. Obliczone zmienne pomocnicze (NOWOŚĆ)
            
            // center: Przesunięcie potrzebne, by element o szerokości cw był na środku ekranu (vw)
            // Użyteczne przy 'x'. Jeśli x=0 to lewa krawędź, to x=center wyśrodkuje go.
            const center = (vw - cw) / 2;

            // end: Przesunięcie do prawej krawędzi (ale nie poza nią)
            const end = vw - cw;

            // vcenter: To samo dla osi Y (rzadsze w scroll triggerze poziomym, ale przydatne w animacjach)
            const vcenter = (vh - ch) / 2;
            
            // Definicje zmiennych do Regexa i podstawiania
            const varsMap = {
                sw: sw,
                cw: cw,
                ch: ch,
                vw: vw,
                vh: vh,
                center: center,
                vcenter: vcenter,
                end: end
            };

            // Krok A: Walidacja bezpieczeństwa
            // Dodajemy nowe słowa kluczowe do listy dozwolonych (usuwamy je przed testem cyfr)
            let cleanExpr = expression;
            Object.keys(varsMap).forEach(key => {
                // Usuwamy całe słowa (np. center), flagi 'gi'
                const regex = new RegExp(`\\b${key}\\b`, 'gi');
                cleanExpr = cleanExpr.replace(regex, '');
            });

            if (!/^[0-9\.\+\-\*\/\(\)\s]*$/.test(cleanExpr)) {
                console.warn('[ScrollCrafter] Unsafe characters in calc expression:', expression);
                return 0;
            }

            // Krok B: Podstawienie wartości
            let finalExpr = expression;
            // Sortujemy klucze od najdłuższych, żeby np. 'vcenter' nie zostało zamienione częściowo przez 'center'
            const sortedKeys = Object.keys(varsMap).sort((a, b) => b.length - a.length);

            sortedKeys.forEach(key => {
                const regex = new RegExp(`\\b${key}\\b`, 'gi');
                finalExpr = finalExpr.replace(regex, varsMap[key]);
            });

            // Krok C: Obliczenie
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

// Rekurencyjne parsowanie obiektu vars
function parseMacros(vars, contextNode) {
  if (!vars || typeof vars !== 'object') return vars;
  const out = { ...vars };
  Object.keys(out).forEach((key) => {
    const val = out[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = parseMacros(val, contextNode);
      return;
    }
    // Używamy nowej funkcji
    out[key] = parseSmartValue(val, contextNode);
  });
  return out;
}


function getPinElement(node) {
  return node;
}

// --- GŁÓWNA FUNKCJA KREACJI TIMELINE'U ---
function createTimeline(node, configData, globalConfig, debug, logPrefix, gsap) {
  const pinElem = getPinElement(node);

  // Targety
  const targetCfg = configData.target || globalConfig.target || {};
  let mainTargets = [pinElem];

  if (targetCfg.selector && targetCfg.type !== 'wrapper') {
    const found = pinElem.querySelectorAll(targetCfg.selector);
    if (found.length) mainTargets = Array.from(found);
  }

  // Vars
  const timelineVars = { ...(configData.timelineVars || {}) };
  if (timelineVars.defaults) {
    timelineVars.defaults = parseMacros(timelineVars.defaults, pinElem);
  }

  // ScrollTrigger
  if (!timelineVars.scrollTrigger) timelineVars.scrollTrigger = {};
  const st = timelineVars.scrollTrigger;

  if (!st.trigger) st.trigger = pinElem;
  if (st.pin === true) st.pin = pinElem;
  if (typeof st.invalidateOnRefresh === 'undefined') st.invalidateOnRefresh = true;
  if (typeof st.anticipatePin === 'undefined') st.anticipatePin = 0.5;
  if (globalConfig.id && !st.id) st.id = `sc-${globalConfig.id}`;

  const tl = gsap.timeline(timelineVars);

  // Steps
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
  // Zmiana: Pobieramy posortowane breakpointy zamiast starej mapy
  const sysBreakpoints = window.ScrollCrafterConfig?.breakpoints || [];
  const logPrefix = `[ScrollCrafter][timeline:${config.id || 'tl'}]`;

  let gsap;
  try {
    gsap = getGsap();
    getScrollTrigger();
  } catch (e) {
    if (debug) console.error(`${logPrefix} GSAP missing`, e);
    return;
  }

  const mm = gsap.matchMedia();

  // 1. Global Timeline
  // Tutaj używamy min-width: 0px jako fallback dla "wszystkiego"
  mm.add("(min-width: 0px)", () => {
     if (config.steps && config.steps.length > 0) {
         createTimeline(node, config, config, debug, logPrefix, gsap);
     }
  });

  // 2. Media Timelines
  if (config.media) {
      Object.keys(config.media).forEach((mediaSlug) => {
          const mediaConfig = config.media[mediaSlug];
          
          // Pobieramy flagę strict (którą dodał PHP Builder)
          const isStrict = !!mediaConfig.strict;

          // Budujemy query
          const query = buildMediaQuery(mediaSlug, isStrict, sysBreakpoints);

          if (query) {
              mm.add(query, () => {
                  createTimeline(node, mediaConfig, config, debug, logPrefix + `[${mediaSlug}]`, gsap);
              });
          } else {
             if (debug) console.warn(`${logPrefix} Unknown breakpoint slug: ${mediaSlug}`);
          }
      });
  }
});
