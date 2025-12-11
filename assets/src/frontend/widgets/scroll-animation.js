import { registerWidget } from '../core/registry';
import { getGsap, getScrollTrigger } from '../core/gsap-loader';

registerWidget('scroll_animation', (node, config) => {
  const debug = !!window.ScrollCrafterConfig?.debug;
  const logPrefix = `[ScrollCrafter][${config.id || 'unknown'}]`;

  let gsap;
  try {
    gsap = getGsap();
    getScrollTrigger(); // Upewniamy się, że plugin jest zarejestrowany
  } catch (e) {
    if (debug) console.error(`${logPrefix} GSAP missing`, e);
    return;
  }

  // 1. Rozwiązywanie targetów (elementów do animacji)
  const targetConfig = config.target || {};
  let elements = [];

  if (targetConfig.type === 'wrapper') {
    elements = [node];
  } else if (targetConfig.selector) {
    elements = node.querySelectorAll(targetConfig.selector);
  }

  if (!elements.length) {
    if (debug) console.warn(`${logPrefix} No elements found for selector:`, targetConfig.selector);
    return;
  }

  // 2. Pobranie konfiguracji z nowego JSON (zoptymalizowanego w PHP)
  const animConfig = config.animation || {};
  const method = animConfig.method || 'from'; // 'to', 'from', 'fromTo', 'set'
  
  // Obiekt vars (zawiera CSS props, duration, ease ORAZ scrollTrigger w środku)
  const vars = { ...animConfig.vars }; 
  const vars2 = animConfig.vars2 ? { ...animConfig.vars2 } : null;

  // 3. Naprawa ScrollTrigger Trigger Element
  // W PHP wrzuciliśmy scrollTrigger do vars, ale nie ustawiliśmy właściwości 'trigger'.
  // JS musi ustawić trigger na element widgetu (node), chyba że user ustawił inaczej.
  
  if (vars.scrollTrigger) {
    vars.scrollTrigger.trigger = node; // Domyślnie triggerem jest kontener widgetu
    
    // Obsługa ID dla debugowania (sc-xyz)
    if (config.id) {
        vars.scrollTrigger.id = 'sc-' + config.id;
    }
  }
  
  if (vars2 && vars2.scrollTrigger) {
    vars2.scrollTrigger.trigger = node;
    if (config.id) {
        vars2.scrollTrigger.id = 'sc-' + config.id;
    }
  }

  // 4. Uruchomienie animacji
  try {
    if (method === 'fromTo' && vars2) {
      gsap.fromTo(elements, vars, vars2);
    } else if (typeof gsap[method] === 'function') {
      gsap[method](elements, vars);
    } else {
      console.warn(`${logPrefix} Unknown GSAP method:`, method);
    }
  } catch (e) {
    if (debug) console.error(`${logPrefix} Animation error`, e);
  }
});
