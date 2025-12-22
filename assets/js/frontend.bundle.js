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
  function parseSmartValue(val, contextNode) {
    if (typeof val !== "string") return val;
    if (val === "calc_scroll_width_neg") val = "calc(sw * -1)";
    if (val === "calc_scroll_width") val = "calc(sw)";
    if (val === "calc_100vh") val = "calc(vh)";
    if (val.match(/^calc\s*\((.*)\)$/i)) {
      const expression = val.match(/^calc\s*\((.*)\)$/i)[1];
      return () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cw = contextNode.clientWidth || 0;
        const ch = contextNode.clientHeight || 0;
        const totalScrollW = contextNode.scrollWidth - cw;
        const sw = totalScrollW > 0 ? totalScrollW : 0;
        const center = (vw - cw) / 2;
        const vcenter = (vh - ch) / 2;
        const end = vw - cw;
        const varsMap = {
          sw,
          cw,
          ch,
          vw,
          vh,
          center,
          vcenter,
          end
        };
        let cleanExpr = expression;
        Object.keys(varsMap).forEach((key) => {
          const regex = new RegExp(`\\b${key}\\b`, "gi");
          cleanExpr = cleanExpr.replace(regex, "");
        });
        if (!/^[0-9\.\+\-\*\/\(\)\s]*$/.test(cleanExpr)) {
          console.warn("[ScrollCrafter] Unsafe calc expression:", expression);
          return 0;
        }
        let finalExpr = expression;
        const sortedKeys = Object.keys(varsMap).sort((a, b) => b.length - a.length);
        sortedKeys.forEach((key) => {
          const regex = new RegExp(`\\b${key}\\b`, "gi");
          finalExpr = finalExpr.replace(regex, varsMap[key]);
        });
        try {
          return new Function("return " + finalExpr)();
        } catch (e) {
          console.error("[ScrollCrafter] Calc error:", e);
          return 0;
        }
      };
    }
    return val;
  }
  function parseMacros(vars, contextNode) {
    if (!vars || typeof vars !== "object") return vars;
    const out = { ...vars };
    Object.keys(out).forEach((key) => {
      const val = out[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        out[key] = parseMacros(val, contextNode);
        return;
      }
      out[key] = parseSmartValue(val, contextNode);
    });
    return out;
  }
  function buildMediaQuery(targetSlug, isStrict, sortedBreakpoints) {
    if (!sortedBreakpoints || !Array.isArray(sortedBreakpoints)) return null;
    const currentIndex = sortedBreakpoints.findIndex((bp) => bp.key === targetSlug);
    if (currentIndex === -1) return null;
    const currentBp = sortedBreakpoints[currentIndex];
    const maxQuery = `(max-width: ${currentBp.value}px)`;
    if (!isStrict) {
      return maxQuery;
    }
    let minQuery = "";
    if (currentIndex > 0) {
      const prevBp = sortedBreakpoints[currentIndex - 1];
      const minVal = prevBp.value + 1;
      minQuery = `(min-width: ${minVal}px) and `;
    } else {
      return maxQuery;
    }
    return `${minQuery}${maxQuery}`;
  }
  registerWidget("scroll_animation", (node, config) => {
    var _a, _b;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    const logPrefix = `[ScrollCrafter][${config.id || "anim"}]`;
    const logConfig = (label, cfg) => {
      var _a2, _b2, _c;
      if (!debug) return;
      console.group(`${logPrefix} ${label}`);
      console.log("Method:", (_a2 = cfg.animation) == null ? void 0 : _a2.method);
      console.log("Vars:", (_b2 = cfg.animation) == null ? void 0 : _b2.vars);
      console.log("Vars2:", (_c = cfg.animation) == null ? void 0 : _c.vars2);
      console.log("Target:", cfg.target || config.target);
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
      if (targetConfig.type === "wrapper") {
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
      const method = animConfig.method || "from";
      const calcContext = elements[0];
      const vars = parseMacros({ ...animConfig.vars }, calcContext);
      const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, calcContext) : null;
      if (vars.scrollTrigger) {
        vars.scrollTrigger.trigger = contextNode;
        if (config.id) vars.scrollTrigger.id = "sc-" + config.id;
      }
      if (vars2 && vars2.scrollTrigger) {
        vars2.scrollTrigger.trigger = contextNode;
        if (config.id) vars2.scrollTrigger.id = "sc-" + config.id;
      }
      if (method === "fromTo" && vars2) {
        return gsap.fromTo(elements, vars, vars2);
      } else if (typeof gsap[method] === "function") {
        return gsap[method](elements, vars);
      }
      if (debug) console.warn(`${logPrefix} Unknown GSAP method:`, method);
      return null;
    };
    const mm = gsap.matchMedia();
    mm.add("(min-width: 0px)", () => {
      if (config.animation) {
        logConfig("Global config", config);
        createTween(config, node);
      }
    });
    const sysBreakpoints = ((_b = window.ScrollCrafterConfig) == null ? void 0 : _b.breakpoints) || [];
    if (config.media) {
      Object.keys(config.media).forEach((mediaSlug) => {
        const mediaAnim = config.media[mediaSlug];
        const isStrict = !!(mediaAnim.strict || mediaAnim.animation && mediaAnim.animation.strict);
        const query = buildMediaQuery(mediaSlug, isStrict, sysBreakpoints);
        if (query) {
          mm.add(query, (context) => {
            const merged = {
              ...config,
              animation: mediaAnim
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

  // assets/src/frontend/widgets/scroll-timeline.js
  function buildMediaQuery2(targetSlug, isStrict, sortedBreakpoints) {
    if (!sortedBreakpoints || !Array.isArray(sortedBreakpoints)) return null;
    const currentIndex = sortedBreakpoints.findIndex((bp) => bp.key === targetSlug);
    if (currentIndex === -1) return null;
    const currentBp = sortedBreakpoints[currentIndex];
    const maxQuery = `(max-width: ${currentBp.value}px)`;
    if (!isStrict) {
      return maxQuery;
    }
    let minQuery = "";
    if (currentIndex > 0) {
      const prevBp = sortedBreakpoints[currentIndex - 1];
      const minVal = prevBp.value + 1;
      minQuery = `(min-width: ${minVal}px) and `;
    }
    return `${minQuery}${maxQuery}`;
  }
  function parseSmartValue2(val, contextNode) {
    if (typeof val !== "string") return val;
    if (val === "calc_scroll_width_neg") val = "calc(sw * -1)";
    if (val === "calc_scroll_width") val = "calc(sw)";
    if (val === "calc_100vh") val = "calc(vh)";
    if (val.match(/^calc\s*\((.*)\)$/i)) {
      const expression = val.match(/^calc\s*\((.*)\)$/i)[1];
      return () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cw = contextNode.clientWidth || 0;
        const ch = contextNode.clientHeight || 0;
        const totalScrollW = contextNode.scrollWidth - cw;
        const sw = totalScrollW > 0 ? totalScrollW : 0;
        const center = (vw - cw) / 2;
        const end = vw - cw;
        const vcenter = (vh - ch) / 2;
        const varsMap = {
          sw,
          cw,
          ch,
          vw,
          vh,
          center,
          vcenter,
          end
        };
        let cleanExpr = expression;
        Object.keys(varsMap).forEach((key) => {
          const regex = new RegExp(`\\b${key}\\b`, "gi");
          cleanExpr = cleanExpr.replace(regex, "");
        });
        if (!/^[0-9\.\+\-\*\/\(\)\s]*$/.test(cleanExpr)) {
          console.warn("[ScrollCrafter] Unsafe characters in calc expression:", expression);
          return 0;
        }
        let finalExpr = expression;
        const sortedKeys = Object.keys(varsMap).sort((a, b) => b.length - a.length);
        sortedKeys.forEach((key) => {
          const regex = new RegExp(`\\b${key}\\b`, "gi");
          finalExpr = finalExpr.replace(regex, varsMap[key]);
        });
        try {
          return new Function("return " + finalExpr)();
        } catch (e) {
          console.error("[ScrollCrafter] Calc error:", e);
          return 0;
        }
      };
    }
    return val;
  }
  function parseMacros2(vars, contextNode) {
    if (!vars || typeof vars !== "object") return vars;
    const out = { ...vars };
    Object.keys(out).forEach((key) => {
      const val = out[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        out[key] = parseMacros2(val, contextNode);
        return;
      }
      out[key] = parseSmartValue2(val, contextNode);
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
    if (targetCfg.selector && targetCfg.type !== "wrapper") {
      const found = pinElem.querySelectorAll(targetCfg.selector);
      if (found.length) mainTargets = Array.from(found);
    }
    const timelineVars = { ...configData.timelineVars || {} };
    if (timelineVars.defaults) {
      timelineVars.defaults = parseMacros2(timelineVars.defaults, pinElem);
    }
    if (!timelineVars.scrollTrigger) timelineVars.scrollTrigger = {};
    const st = timelineVars.scrollTrigger;
    if (!st.trigger) st.trigger = pinElem;
    if (st.pin === true) st.pin = pinElem;
    if (typeof st.invalidateOnRefresh === "undefined") st.invalidateOnRefresh = true;
    if (typeof st.anticipatePin === "undefined") st.anticipatePin = 0.5;
    if (globalConfig.id && !st.id) st.id = `sc-${globalConfig.id}`;
    const tl = gsap.timeline(timelineVars);
    const steps = configData.steps || [];
    steps.forEach((step, index) => {
      const method = step.method || "to";
      const position = step.position;
      if (method === "addLabel") {
        const label = step.vars;
        if (typeof label === "string") tl.addLabel(label, position);
        return;
      }
      if (method === "call") return;
      let targets = mainTargets;
      if (step.selector) {
        const found = pinElem.querySelectorAll(step.selector);
        if (!found.length) {
          if (debug) console.warn(`${logPrefix} Step ${index + 1}: selector "${step.selector}" not found`);
          return;
        }
        targets = Array.from(found);
      }
      const vars = parseMacros2(step.vars || {}, pinElem);
      const vars2 = step.vars2 ? parseMacros2(step.vars2, pinElem) : null;
      try {
        if (method === "fromTo" && vars2) tl.fromTo(targets, vars, vars2, position);
        else if (typeof tl[method] === "function") tl[method](targets, vars, position);
      } catch (e) {
        if (debug) console.error(`${logPrefix} Error step ${index + 1}`, e);
      }
    });
    return tl;
  }
  registerWidget("scroll_timeline", (node, config) => {
    var _a, _b;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    const sysBreakpoints = ((_b = window.ScrollCrafterConfig) == null ? void 0 : _b.breakpoints) || [];
    const logPrefix = `[ScrollCrafter][timeline:${config.id || "tl"}]`;
    let gsap;
    try {
      gsap = getGsap();
      getScrollTrigger();
    } catch (e) {
      if (debug) console.error(`${logPrefix} GSAP missing`, e);
      return;
    }
    const mm = gsap.matchMedia();
    mm.add("(min-width: 0px)", () => {
      if (config.steps && config.steps.length > 0) {
        createTimeline(node, config, config, debug, logPrefix, gsap);
      }
    });
    if (config.media) {
      Object.keys(config.media).forEach((mediaSlug) => {
        const mediaConfig = config.media[mediaSlug];
        const isStrict = !!mediaConfig.strict;
        const query = buildMediaQuery2(mediaSlug, isStrict, sysBreakpoints);
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
