(() => {
  // assets/src/frontend/core/registry.js
  var registry = {};
  var initializedNodes = /* @__PURE__ */ new WeakSet();
  function registerWidget(type, initFn) {
    registry[type] = initFn;
  }
  function initWidgetsInScope(root = document) {
    if (!root || !root.querySelectorAll) {
      return;
    }
    const nodes = root.querySelectorAll("[data-scrollcrafter-config]");
    nodes.forEach((node) => {
      var _a;
      if (initializedNodes.has(node)) {
        return;
      }
      const raw = node.getAttribute("data-scrollcrafter-config");
      if (!raw) return;
      let config;
      try {
        config = JSON.parse(raw);
      } catch (e) {
        if ((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug) {
          console.warn("[ScrollCrafter] Invalid config JSON:", e, node);
        }
        return;
      }
      const type = config.widget;
      if (!type || typeof registry[type] !== "function") {
        return;
      }
      try {
        registry[type](node, config);
        initializedNodes.add(node);
        node.dispatchEvent(
          new CustomEvent("scrollcrafter:init", {
            bubbles: true,
            detail: { type, config }
          })
        );
      } catch (e) {
        console.error(`[ScrollCrafter] Init error for "${type}":`, e);
      }
    });
  }

  // assets/src/frontend/core/gsap-loader.js
  function getGsap() {
    if (typeof window === "undefined") return null;
    const { gsap } = window;
    if (!gsap) {
      console.error("[ScrollCrafter] GSAP core not found! Make sure gsap.min.js is loaded.");
      return null;
    }
    if (window.ScrollTrigger && gsap.registerPlugin) {
      try {
        gsap.registerPlugin(window.ScrollTrigger);
      } catch (e) {
      }
    }
    return gsap;
  }
  function getScrollTrigger() {
    if (typeof window === "undefined") return null;
    if (!window.ScrollTrigger) {
      console.warn("[ScrollCrafter] ScrollTrigger not found! Animations may not work.");
      return null;
    }
    return window.ScrollTrigger;
  }

  // assets/src/frontend/widgets/scroll-animation.js
  registerWidget("scroll_animation", (node, config) => {
    var _a;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    const logPrefix = `[ScrollCrafter][${config.id || "unknown"}]`;
    let gsap;
    try {
      gsap = getGsap();
      getScrollTrigger();
    } catch (e) {
      if (debug) console.error(`${logPrefix} GSAP missing`, e);
      return;
    }
    const targetConfig = config.target || {};
    let elements = [];
    if (targetConfig.type === "wrapper") {
      elements = [node];
    } else if (targetConfig.selector) {
      elements = node.querySelectorAll(targetConfig.selector);
    }
    if (!elements.length) {
      if (debug) console.warn(`${logPrefix} No elements found for selector:`, targetConfig.selector);
      return;
    }
    const animConfig = config.animation || {};
    const method = animConfig.method || "from";
    const vars = { ...animConfig.vars };
    const vars2 = animConfig.vars2 ? { ...animConfig.vars2 } : null;
    if (vars.scrollTrigger) {
      vars.scrollTrigger.trigger = node;
      if (config.id) {
        vars.scrollTrigger.id = "sc-" + config.id;
      }
    }
    if (vars2 && vars2.scrollTrigger) {
      vars2.scrollTrigger.trigger = node;
      if (config.id) {
        vars2.scrollTrigger.id = "sc-" + config.id;
      }
    }
    try {
      if (method === "fromTo" && vars2) {
        gsap.fromTo(elements, vars, vars2);
      } else if (typeof gsap[method] === "function") {
        gsap[method](elements, vars);
      } else {
        console.warn(`${logPrefix} Unknown GSAP method:`, method);
      }
    } catch (e) {
      if (debug) console.error(`${logPrefix} Animation error`, e);
    }
  });

  // assets/src/frontend/widgets/scroll-timeline.js
  function parseMacros(vars, contextNode) {
    if (!vars || typeof vars !== "object") return vars;
    const out = { ...vars };
    Object.keys(out).forEach((key) => {
      const val = out[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        out[key] = parseMacros(val, contextNode);
        return;
      }
      if (typeof val === "string") {
        if (val === "calc_100vh") {
          out[key] = () => window.innerHeight;
        } else if (val === "calc_100vw") {
          out[key] = () => window.innerWidth;
        } else if (val === "calc_scroll_width") {
          out[key] = () => {
            const el = contextNode;
            return el.scrollWidth - el.clientWidth;
          };
        } else if (val === "calc_scroll_width_neg" || val === "calc_horizontal_scroll") {
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
  function getPinElement(node) {
    return node;
  }
  registerWidget("scroll_timeline", (node, config) => {
    var _a;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    const logPrefix = `[ScrollCrafter][timeline:${config.id || "unknown"}]`;
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
    const targetCfg = config.target || {};
    let mainTargets = [pinElem];
    if (targetCfg.selector && targetCfg.type !== "wrapper") {
      const found = pinElem.querySelectorAll(targetCfg.selector);
      if (found.length) {
        mainTargets = Array.from(found);
      }
    }
    const timelineVars = { ...config.timelineVars || {} };
    if (timelineVars.defaults) {
      timelineVars.defaults = parseMacros(timelineVars.defaults, pinElem);
    }
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
    if (typeof st.invalidateOnRefresh === "undefined") {
      st.invalidateOnRefresh = true;
    }
    if (typeof st.anticipatePin === "undefined") {
      st.anticipatePin = 0.5;
    }
    if (config.id && !st.id) {
      st.id = `sc-${config.id}`;
    }
    const tl = gsap.timeline(timelineVars);
    const steps = config.steps || [];
    steps.forEach((step, index) => {
      const method = step.method || "to";
      const position = step.position;
      if (method === "addLabel") {
        const label = step.vars;
        if (typeof label === "string") tl.addLabel(label, position);
        return;
      }
      if (method === "call") {
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
        if (method === "fromTo" && vars2) {
          tl.fromTo(targets, vars, vars2, position);
        } else if (typeof tl[method] === "function") {
          tl[method](targets, vars, position);
        } else if (debug) {
          console.warn(`${logPrefix} Unknown method "${method}"`);
        }
      } catch (e) {
        if (debug) console.error(`${logPrefix} Error in step ${index + 1}`, e);
      }
    });
  });

  // assets/src/frontend/index.js
  function init() {
    initWidgetsInScope(document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("elementor/popup/show", (event) => {
    initWidgetsInScope(event.target);
    const ScrollTrigger = getScrollTrigger();
    if (ScrollTrigger) ScrollTrigger.refresh();
  });
  window.addEventListener("elementor/frontend/init", () => {
    if (!window.elementorFrontend) return;
    elementorFrontend.hooks.addAction("frontend/element_ready/global", ($scope) => {
      const node = $scope[0];
      if (elementorFrontend.isEditMode()) {
        const widgetId = node.getAttribute("data-id");
        if (widgetId) {
          killTriggerByWidgetId(widgetId);
        }
      }
      initWidgetsInScope(node);
    });
  });
  function killTriggerByWidgetId(widgetId) {
    var _a;
    try {
      const ScrollTrigger = getScrollTrigger();
      if (!ScrollTrigger) return;
      const triggerId = "sc-" + widgetId;
      const st = ScrollTrigger.getById(triggerId);
      if (st) {
        if ((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug) {
          console.log(`[ScrollCrafter] Killing trigger: ${triggerId}`);
        }
        st.kill(true);
      }
    } catch (e) {
      console.warn("[ScrollCrafter] Error killing trigger:", e);
    }
  }
})();
//# sourceMappingURL=frontend.bundle.js.map
