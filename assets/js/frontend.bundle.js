(() => {
  // assets/src/frontend/core/registry.js
  var registry = {};
  var initializedNodes = /* @__PURE__ */ new WeakSet();
  var pendingInits = /* @__PURE__ */ new Map();
  var previewLocks = /* @__PURE__ */ new Set();
  function setPreviewLock(widgetId, locked) {
    if (locked) {
      previewLocks.add(widgetId);
    } else {
      previewLocks.delete(widgetId);
    }
  }
  function registerWidget(type, initFn) {
    registry[type] = initFn;
  }
  function initWidgetsInScope(root = document, force = false) {
    if (!root) {
      return;
    }
    const nodes = [];
    if (root.hasAttribute && root.hasAttribute("data-scrollcrafter-config")) {
      nodes.push(root);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll("[data-scrollcrafter-config]").forEach((n) => nodes.push(n));
    }
    nodes.forEach((node) => {
      var _a4;
      const widgetId = node.getAttribute("data-id");
      if (widgetId && previewLocks.has(widgetId)) {
        if ((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug) {
          console.log(`[ScrollCrafter] Skipping init for ${widgetId} - preview active`);
        }
        return;
      }
      const isAlreadyInit = initializedNodes.has(node);
      if (!force && isAlreadyInit) {
        return;
      }
      if (force) {
        if (widgetId) {
          if (pendingInits.has(widgetId)) {
            clearTimeout(pendingInits.get(widgetId));
          }
          pendingInits.set(widgetId, setTimeout(() => {
            pendingInits.delete(widgetId);
            if (!previewLocks.has(widgetId)) {
              doInitWidget(node, force);
            }
          }, 250));
          return;
        }
      }
      doInitWidget(node, force);
    });
  }
  function doInitWidget(node, force) {
    var _a4, _b2;
    if (typeof node.__sc_cleanup === "function") {
      try {
        node.__sc_cleanup();
      } catch (e) {
        console.warn("[ScrollCrafter] Cleanup error:", e);
      }
      delete node.__sc_cleanup;
    }
    const raw = node.getAttribute("data-scrollcrafter-config");
    if (!raw) return;
    let config;
    try {
      config = JSON.parse(raw);
    } catch (e) {
      if ((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug) {
        console.warn("[ScrollCrafter] Invalid config JSON:", e, node);
      }
      return;
    }
    const type = config.widget;
    if (!type || typeof registry[type] !== "function") {
      return;
    }
    try {
      if ((_b2 = window.ScrollCrafterConfig) == null ? void 0 : _b2.debug) {
        console.log(`[ScrollCrafter] Initializing widget: "${type}"`, node);
      }
      const cleanup = registry[type](node, config);
      if (typeof cleanup === "function") {
        node.__sc_cleanup = cleanup;
      }
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

  // assets/src/frontend/core/utils.js
  var compiledCalcs = /* @__PURE__ */ new Map();
  function parseSmartValue(val, contextNode) {
    if (typeof val !== "string") return val;
    if (val === "calc_scroll_width_neg") val = "calc(sw * -1)";
    if (val === "calc_scroll_width") val = "calc(sw)";
    if (val === "calc_100vh") val = "calc(vh)";
    const calcMatch = val.match(/^calc\s*\((.*)\)$/i);
    if (calcMatch) {
      const expression = calcMatch[1].replace(/(\d)\s*(sw|cw|ch|vw|vh)\b/gi, "$1 * $2");
      return (index, target) => {
        const el = target || contextNode;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cw = el.clientWidth || 0;
        const ch = el.clientHeight || 0;
        const sw = Math.max(0, el.scrollWidth - cw);
        const varsMap = {
          sw,
          cw,
          ch,
          vw,
          vh,
          center: (vw - cw) / 2,
          vcenter: (vh - ch) / 2,
          end: vw - cw
        };
        let finalExpr = expression;
        const sortedKeys = ["vcenter", "center", "sw", "cw", "ch", "vw", "vh", "end"];
        sortedKeys.forEach((key) => {
          finalExpr = finalExpr.replace(new RegExp(`\\b${key}\\b`, "gi"), varsMap[key]);
        });
        let fn = compiledCalcs.get(finalExpr);
        if (!fn) {
          const safetyCheck = finalExpr.replace(/[0-9\.\+\-\*\/\(\)\s]/g, "");
          if (safetyCheck.length > 0) {
            console.warn("[ScrollCrafter] Unsafe characters in result expression:", safetyCheck);
            return 0;
          }
          try {
            fn = new Function("return " + finalExpr);
            compiledCalcs.set(finalExpr, fn);
          } catch (e) {
            console.error("[ScrollCrafter] Compile error:", e, finalExpr);
            return 0;
          }
        }
        try {
          return fn();
        } catch (e) {
          console.error("[ScrollCrafter] Calc exec error:", e);
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

  // assets/src/frontend/core/responsive.js
  var cachedRanges = null;
  var cachedSpecialConditions = null;
  var SPECIAL_QUERIES = {
    "reduced-motion": "(prefers-reduced-motion: reduce)"
  };
  var PRO_SPECIAL_QUERIES = {
    "dark": "(prefers-color-scheme: dark)",
    "retina": "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)",
    "no-hover": "(hover: none)"
  };
  function buildBreakpointRanges() {
    var _a4;
    const sysBreakpoints = ((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.breakpoints) || [];
    if (!sysBreakpoints.length) {
      return [{ slug: "_default_desktop", query: "(min-width: 1px)", min: 1, max: Infinity }];
    }
    const sortedBps = [...sysBreakpoints].sort((a, b) => a.value - b.value);
    const ranges = [];
    let prevMax = 0;
    sortedBps.forEach((bp) => {
      const min = prevMax + 1;
      const max = bp.value;
      prevMax = max;
      const query = min === 1 ? `(max-width: ${max}px)` : `(min-width: ${min}px) and (max-width: ${max}px)`;
      ranges.push({ slug: bp.key, query, min, max });
    });
    ranges.push({
      slug: "_default_desktop",
      query: `(min-width: ${prevMax + 1}px)`,
      min: prevMax + 1,
      max: Infinity
    });
    return ranges;
  }
  function getBreakpointRanges() {
    if (cachedRanges === null) {
      cachedRanges = buildBreakpointRanges();
    }
    return cachedRanges;
  }
  function isPro() {
    var _a4;
    return !!((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.isPro);
  }
  function isSpecialConditionActive(tag) {
    let query = SPECIAL_QUERIES[tag];
    if (!query && isPro()) {
      query = PRO_SPECIAL_QUERIES[tag];
    }
    if (!query) return false;
    if (cachedSpecialConditions === null) {
      cachedSpecialConditions = {};
    }
    if (cachedSpecialConditions[tag] === void 0) {
      cachedSpecialConditions[tag] = window.matchMedia(query).matches;
    }
    return cachedSpecialConditions[tag];
  }
  function isReducedMotionPreferred() {
    return isSpecialConditionActive("reduced-motion");
  }
  function resolveConfigForBreakpoint(config, range) {
    var _a4;
    if (config.disabled && config.disabled.includes(range.slug)) {
      return null;
    }
    if (isReducedMotionPreferred() && ((_a4 = config.conditions) == null ? void 0 : _a4["reduced-motion"])) {
      return config.conditions["reduced-motion"];
    }
    if (range.slug !== "_default_desktop") {
      if (config.conditions) {
        for (const condition of Object.values(config.conditions)) {
          if (condition.tags && condition.tags.includes(range.slug)) {
            return condition.config || condition;
          }
        }
      }
      if (config.media && config.media[range.slug]) {
        return config.media[range.slug];
      }
    }
    return config.animation || config;
  }
  function createResponsiveContext(gsap, config, callback, $widget = null) {
    var _a4, _b2, _c;
    const debug = !!((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug);
    const ranges = getBreakpointRanges();
    const results = [];
    const disabledBreakpoints = config.disabled || [];
    const forceBreakpoint = ((_b2 = $widget == null ? void 0 : $widget.getAttribute) == null ? void 0 : _b2.call($widget, "data-scrollcrafter-force-breakpoint")) || ((_c = $widget == null ? void 0 : $widget.attr) == null ? void 0 : _c.call($widget, "data-scrollcrafter-force-breakpoint")) || null;
    if (forceBreakpoint) {
      if (debug) console.log(`[SC Responsive] Force breakpoint detected: ${forceBreakpoint}`);
      let targetRange = ranges.find((r) => r.slug === forceBreakpoint);
      if (!targetRange && forceBreakpoint === "desktop") {
        targetRange = ranges.find((r) => r.slug === "_default_desktop");
      }
      if (targetRange && !disabledBreakpoints.includes(targetRange.slug)) {
        const activeConfig = resolveConfigForBreakpoint(config, targetRange);
        if (activeConfig) {
          if (debug) console.log(`[SC Responsive] Active (forced): ${targetRange.slug}`, activeConfig);
          const result = callback(activeConfig, targetRange);
          if (result) results.push(result);
        }
      }
      return () => {
        if (debug) console.log("[SC Responsive] Cleanup (forced mode - no matchMedia)");
        return results;
      };
    }
    const mm = gsap.matchMedia();
    ranges.forEach((range) => {
      if (disabledBreakpoints.includes(range.slug)) {
        if (debug) console.log(`[SC Responsive] Skipping disabled: ${range.slug}`);
        return;
      }
      mm.add(range.query, () => {
        const activeConfig = resolveConfigForBreakpoint(config, range);
        if (activeConfig) {
          if (debug) {
            console.log(`[SC Responsive] Active: ${range.slug}`, activeConfig);
          }
          const result = callback(activeConfig, range);
          if (result) results.push(result);
        }
      });
    });
    return () => {
      if (debug) console.log("[SC Responsive] Cleaning up matchMedia contexts");
      mm.revert();
      return results;
    };
  }

  // assets/src/frontend/widgets/scroll-animation.js
  registerWidget("scroll_animation", (node, config) => {
    var _a4;
    const debug = !!((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug);
    const logPrefix = `[ScrollCrafter][${config.id || "anim"}]`;
    const logConfig = (label, cfg) => {
      var _a5, _b2, _c;
      if (!debug) return;
      console.group(`${logPrefix} ${label}`);
      console.log("Method:", (_a5 = cfg.animation) == null ? void 0 : _a5.method);
      console.log("Vars:", (_b2 = cfg.animation) == null ? void 0 : _b2.vars);
      console.log("Vars2:", (_c = cfg.animation) == null ? void 0 : _c.vars2);
      console.log("Target:", cfg.target || config.target);
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
    const createTween = (cfg, contextNode) => {
      var _a5, _b2, _c, _d, _e;
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
      if (animConfig.split) {
        if (window.SplitText) {
          try {
            const requestedType = animConfig.split.toLowerCase();
            const existingSplit = (_a5 = elements[0]) == null ? void 0 : _a5._splitText;
            const existingType = (_b2 = elements[0]) == null ? void 0 : _b2._splitTextType;
            let split;
            const typeMatches = existingType === requestedType;
            const hasUsableSplit = existingSplit && (((_c = existingSplit.chars) == null ? void 0 : _c.length) || ((_d = existingSplit.words) == null ? void 0 : _d.length) || ((_e = existingSplit.lines) == null ? void 0 : _e.length));
            if (hasUsableSplit && typeMatches) {
              split = existingSplit;
            } else {
              if (existingSplit) {
                existingSplit.revert();
              }
              split = new SplitText(elements, { type: requestedType });
              elements.forEach((el) => {
                el._splitText = split;
                el._splitTextType = requestedType;
              });
            }
            if (requestedType.includes("char") && split.chars && split.chars.length) elements = split.chars;
            else if (requestedType.includes("word") && split.words && split.words.length) elements = split.words;
            else if (requestedType.includes("line") && split.lines && split.lines.length) elements = split.lines;
            if (elements.length) {
              gsap.set(elements, { display: "inline-block", backfaceVisibility: "hidden" });
            }
          } catch (e) {
            if (debug) console.warn(`${logPrefix} SplitText error:`, e);
          }
        } else {
          if (debug) console.warn(`${logPrefix} SplitText not found`);
        }
      }
      const vars = parseMacros({ ...animConfig.vars }, calcContext);
      const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, calcContext) : null;
      const ensureAutoAlpha = (v) => {
        if (v && v.opacity !== void 0) {
          v.autoAlpha = v.opacity;
          delete v.opacity;
        }
      };
      ensureAutoAlpha(vars);
      ensureAutoAlpha(vars2);
      if (vars.scrollTrigger) {
        vars.scrollTrigger.trigger = contextNode;
        if (config.id) vars.scrollTrigger.id = "sc-" + config.id;
        if (typeof vars.scrollTrigger.invalidateOnRefresh === "undefined") vars.scrollTrigger.invalidateOnRefresh = true;
        if (typeof vars.scrollTrigger.anticipatePin === "undefined" && vars.scrollTrigger.pin) vars.scrollTrigger.anticipatePin = 0.5;
      }
      if (vars2 && vars2.scrollTrigger) {
        vars2.scrollTrigger.trigger = contextNode;
        if (config.id) vars2.scrollTrigger.id = "sc-" + config.id;
      }
      if (method === "from" || method === "fromTo") {
        vars.immediateRender = true;
        if (vars.autoAlpha === 0 || vars.opacity === 0) {
          elements.forEach((el) => {
            if (el.style) el.style.visibility = "hidden";
          });
        }
      }
      let tween;
      const tweenVars = { ...vars, overwrite: "auto" };
      if (method === "fromTo" && vars2) {
        tween = gsap.fromTo(elements, tweenVars, { ...vars2, overwrite: "auto" });
      } else if (typeof gsap[method] === "function") {
        tween = gsap[method](elements, tweenVars);
      }
      if (!tween && debug) console.warn(`${logPrefix} Unknown GSAP method:`, method);
      return tween;
    };
    const tweens = [];
    const handlePreview = (tween) => {
      const isManualPreview = window.ScrollCrafterForcePreview === config.id || window.parent && window.parent.ScrollCrafterForcePreview === config.id || node.getAttribute("data-sc-preview") === "yes";
      if (isManualPreview && tween) {
        if (debug) console.log(`${logPrefix} Manual preview detected, force playing animation`);
        if (tween.scrollTrigger) {
          const st = tween.scrollTrigger;
          if (st.pin || st.vars && st.vars.scrub) {
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
          tween.restart(true);
        }
      }
    };
    const cleanup = createResponsiveContext(gsap, config, (activeConfig, range) => {
      logConfig(`Active: ${range.slug}`, { ...config, animation: activeConfig });
      const tween = createTween({ ...config, animation: activeConfig }, node);
      if (tween) {
        tweens.push(tween);
        handlePreview(tween);
      }
      return tween;
    }, node);
    return () => {
      if (debug) console.log(`${logPrefix} Cleaning up...`);
      cleanup();
      tweens.forEach((t) => {
        if (t.scrollTrigger) {
          t.scrollTrigger.kill(true);
        }
        t.kill();
      });
    };
  });

  // assets/src/frontend/widgets/scroll-timeline.js
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
      timelineVars.defaults = parseMacros(timelineVars.defaults, pinElem);
    }
    if (!timelineVars.scrollTrigger) timelineVars.scrollTrigger = {};
    const st = timelineVars.scrollTrigger;
    if (!st.trigger) st.trigger = pinElem;
    if (st.pin === true) st.pin = pinElem;
    if (st.pin) {
      gsap.set(st.pin, { transition: "none" });
    }
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
      const vars = parseMacros(step.vars || {}, pinElem);
      const vars2 = step.vars2 ? parseMacros(step.vars2, pinElem) : null;
      const ensureAutoAlpha = (v) => {
        if (v && v.opacity !== void 0) {
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
          const split = new SplitText(targets, { type: step.split });
          if (split.chars && split.chars.length) targets = split.chars;
          else if (split.words && split.words.length) targets = split.words;
          else if (split.lines && split.lines.length) targets = split.lines;
          if (targets.length) {
            gsap.set(targets, { display: "inline-block", backfaceVisibility: "hidden" });
          }
        } catch (e) {
          if (debug) console.warn(`${logPrefix} SplitText error:`, e);
        }
      }
      if (method === "from" || method === "fromTo") {
        vars.immediateRender = true;
        if (vars.autoAlpha === 0 || vars.opacity === 0) {
          targets.forEach((el) => {
            if (el.style) el.style.visibility = "hidden";
          });
        }
      }
      try {
        let stepTween;
        const tweenVars = { ...vars, overwrite: "auto" };
        if (method === "fromTo" && vars2) {
          stepTween = tl.fromTo(targets, tweenVars, { ...vars2, overwrite: "auto" }, position);
        } else if (typeof tl[method] === "function") {
          stepTween = tl[method](targets, tweenVars, position);
        }
      } catch (e) {
        if (debug) console.error(`${logPrefix} Error step ${index + 1}`, e);
      }
    });
    return tl;
  }
  registerWidget("scroll_timeline", (node, config) => {
    var _a4;
    const debug = !!((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug);
    const logPrefix = `[ScrollCrafter][timeline:${config.id || "tl"}]`;
    const logConfig = (label, cfg) => {
      if (!debug) return;
      console.group(`${logPrefix} ${label}`);
      console.log("Details:", cfg);
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
      const isManualPreview = window.ScrollCrafterForcePreview === config.id || window.parent && window.parent.ScrollCrafterForcePreview === config.id || node.getAttribute("data-sc-preview") === "yes";
      if (isManualPreview && tl) {
        if (debug) console.log(`${logPrefix} Manual preview detected, force playing timeline`);
        if (tl.scrollTrigger) {
          const st = tl.scrollTrigger;
          if (st.pin || st.vars && st.vars.scrub) {
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
      timelines.forEach((t) => {
        if (t.scrollTrigger) {
          t.scrollTrigger.kill(true);
        }
        t.kill();
      });
    };
  });

  // assets/src/frontend/preview-player.js
  var _a;
  var DEBUG = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
  var log = (...args) => DEBUG && console.log("[SC Preview]", ...args);
  var activePreview = /* @__PURE__ */ new Map();
  function cleanupPreview(widgetId, releaseLock = true) {
    if (activePreview.has(widgetId)) {
      const { tween, elements } = activePreview.get(widgetId);
      log(`Cleaning up existing preview for ${widgetId}`);
      if (tween) {
        if (tween.scrollTrigger) {
          tween.scrollTrigger.kill(true);
        }
        tween.progress(1);
        tween.kill();
      }
      if (elements && elements.length) {
        const gsap = getGsap();
        if (gsap) {
          gsap.set(elements, { clearProps: "all" });
        }
      }
      activePreview.delete(widgetId);
    }
    if (releaseLock) {
      setPreviewLock(widgetId, false);
      log(`Preview lock released for ${widgetId}`);
    }
  }
  function createAnimation(node, animConfig, config) {
    var _a4, _b2, _c, _d, _e, _f, _g, _h;
    const gsap = getGsap();
    if (!gsap) {
      console.error("[SC Preview] GSAP not available");
      return null;
    }
    const targetConfig = config.target || {};
    let elements = [];
    if (targetConfig.type === "wrapper") {
      elements = [node];
    } else if (targetConfig.selector) {
      elements = node.querySelectorAll(targetConfig.selector);
    } else {
      elements = [node];
    }
    if (!elements.length) {
      log("No target elements found");
      return null;
    }
    const method = animConfig.method || "from";
    let split = null;
    if (animConfig.split && window.SplitText) {
      try {
        const requestedType = animConfig.split.toLowerCase();
        const existingSplit = (_a4 = elements[0]) == null ? void 0 : _a4._splitText;
        const existingType = (_b2 = elements[0]) == null ? void 0 : _b2._splitTextType;
        const typeMatches = existingType === requestedType;
        const hasUsableSplit = existingSplit && (((_c = existingSplit.chars) == null ? void 0 : _c.length) || ((_d = existingSplit.words) == null ? void 0 : _d.length) || ((_e = existingSplit.lines) == null ? void 0 : _e.length));
        if (hasUsableSplit && typeMatches) {
          log(`Reusing existing SplitText (type: ${existingType})`);
          split = existingSplit;
        } else {
          if (existingSplit) {
            log(`Type mismatch (${existingType} vs ${requestedType}), reverting and creating new`);
            existingSplit.revert();
          } else {
            log("Creating fresh SplitText with type:", requestedType);
          }
          split = new SplitText(elements, { type: requestedType });
          log("SplitText result:", {
            chars: ((_f = split.chars) == null ? void 0 : _f.length) || 0,
            words: ((_g = split.words) == null ? void 0 : _g.length) || 0,
            lines: ((_h = split.lines) == null ? void 0 : _h.length) || 0
          });
          elements.forEach((el) => {
            el._splitText = split;
            el._splitTextType = requestedType;
          });
        }
        if (requestedType.includes("char") && split.chars && split.chars.length > 0) {
          elements = split.chars;
        } else if (requestedType.includes("word") && split.words && split.words.length > 0) {
          elements = split.words;
        } else if (requestedType.includes("line") && split.lines && split.lines.length > 0) {
          elements = split.lines;
        }
        log(`SplitText: ${elements.length} elements (type: ${requestedType})`);
        if (elements.length > 0) {
          gsap.set(elements, { display: "inline-block" });
        }
      } catch (e) {
        console.warn("[SC Preview] SplitText error:", e);
      }
    }
    const vars = parseMacros({ ...animConfig.vars }, elements[0]);
    const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, elements[0]) : null;
    gsap.set(elements, {
      transition: "none",
      translate: "none",
      rotate: "none",
      scale: "none"
    });
    delete vars.scrollTrigger;
    if (vars2) delete vars2.scrollTrigger;
    if (method === "from" && vars.immediateRender === void 0) {
      vars.immediateRender = true;
    }
    log(`Creating ${method} tween for ${elements.length} elements`);
    let tween;
    if (method === "fromTo" && vars2) {
      tween = gsap.fromTo(elements, vars, vars2);
    } else if (typeof gsap[method] === "function") {
      tween = gsap[method](elements, vars);
    }
    if (tween && (method === "from" || method === "fromTo")) {
      tween.progress(1).progress(0);
    }
    return { tween, elements };
  }
  function scPreview(widgetId, config, breakpoint) {
    log(`Preview requested: widget=${widgetId}, breakpoint=${breakpoint}`);
    setPreviewLock(widgetId, true);
    log(`Preview lock acquired for ${widgetId}`);
    const node = document.querySelector(`[data-id="${widgetId}"]`);
    if (!node) {
      console.error(`[SC Preview] Widget ${widgetId} not found in DOM`);
      setPreviewLock(widgetId, false);
      return false;
    }
    cleanupPreview(widgetId, false);
    const ranges = getBreakpointRanges();
    let targetRange = ranges.find((r) => r.slug === breakpoint);
    if (!targetRange && breakpoint === "desktop") {
      targetRange = ranges.find((r) => r.slug === "_default_desktop");
    }
    if (!targetRange) {
      targetRange = ranges[0];
    }
    const activeConfig = resolveConfigForBreakpoint(config, targetRange);
    if (!activeConfig) {
      log("No active config for breakpoint:", breakpoint);
      setPreviewLock(widgetId, false);
      return false;
    }
    log("Active config:", activeConfig);
    const result = createAnimation(node, activeConfig, config);
    if (!result || !result.tween) {
      log("Failed to create animation");
      setPreviewLock(widgetId, false);
      return false;
    }
    activePreview.set(widgetId, result);
    const originalOnComplete = result.tween.vars.onComplete;
    result.tween.vars.onComplete = function() {
      log(`Preview animation completed for ${widgetId}`);
      if (originalOnComplete) originalOnComplete.apply(this, arguments);
      setTimeout(() => {
        setPreviewLock(widgetId, false);
        log(`Preview lock released for ${widgetId}`);
      }, 2e3);
    };
    log("Playing animation");
    result.tween.restart(true);
    return true;
  }
  function cleanupAllPreviews() {
    log(`Cleaning up all previews (${activePreview.size} active)`);
    for (const widgetId of activePreview.keys()) {
      cleanupPreview(widgetId, true);
    }
  }
  window.scPreview = scPreview;
  window.scPreviewCleanup = cleanupPreview;
  window.scPreviewCleanupAll = cleanupAllPreviews;
  log("Direct Preview API initialized");

  // assets/src/frontend/core/smooth-scroll.js
  var lenisInstance = null;
  function initSmoothScroll(options = {}) {
    var _a4;
    if (typeof window.Lenis === "undefined") {
      console.warn("[ScrollCrafter] Lenis not loaded. Smooth scroll unavailable.");
      return null;
    }
    if (lenisInstance) {
      console.log("[ScrollCrafter] Lenis already initialized, returning existing instance.");
      return lenisInstance;
    }
    const defaultOptions = {
      lerp: 0.1,
      duration: 1.2,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false
    };
    const finalOptions = { ...defaultOptions, ...options };
    try {
      lenisInstance = new window.Lenis(finalOptions);
      if (window.gsap) {
        window.gsap.ticker.add((time) => {
          lenisInstance.raf(time * 1e3);
        });
        window.gsap.ticker.lagSmoothing(0);
      }
      if (window.ScrollTrigger) {
        lenisInstance.on("scroll", window.ScrollTrigger.update);
        window.addEventListener("resize", () => {
          window.ScrollTrigger.refresh();
        });
      }
      if ((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug) {
        console.log("[ScrollCrafter] Lenis smooth scroll initialized", finalOptions);
      }
      return lenisInstance;
    } catch (error) {
      console.error("[ScrollCrafter] Failed to initialize Lenis:", error);
      return null;
    }
  }
  function destroySmoothScroll() {
    var _a4;
    if (lenisInstance) {
      lenisInstance.destroy();
      lenisInstance = null;
      if ((_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.debug) {
        console.log("[ScrollCrafter] Lenis destroyed");
      }
    }
  }
  function getLenisInstance() {
    return lenisInstance;
  }
  function pauseSmoothScroll() {
    if (lenisInstance) {
      lenisInstance.stop();
    }
  }
  function resumeSmoothScroll() {
    if (lenisInstance) {
      lenisInstance.start();
    }
  }
  function scrollTo(target, options = {}) {
    if (lenisInstance) {
      lenisInstance.scrollTo(target, {
        offset: 0,
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        // Expo ease out
        ...options
      });
    }
  }
  var _a2, _b;
  if (typeof window !== "undefined") {
    const shouldInit = (_b = (_a2 = window.ScrollCrafterConfig) == null ? void 0 : _a2.smoothScroll) == null ? void 0 : _b.enabled;
    if (shouldInit) {
      const init2 = () => {
        var _a4, _b2;
        const options = ((_b2 = (_a4 = window.ScrollCrafterConfig) == null ? void 0 : _a4.smoothScroll) == null ? void 0 : _b2.options) || {};
        initSmoothScroll(options);
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init2);
      } else {
        setTimeout(init2, 100);
      }
    }
  }
  if (typeof window !== "undefined") {
    window.ScrollCrafterSmooth = {
      init: initSmoothScroll,
      destroy: destroySmoothScroll,
      getInstance: getLenisInstance,
      pause: pauseSmoothScroll,
      resume: resumeSmoothScroll,
      scrollTo
    };
  }

  // assets/src/frontend/index.js
  function init() {
    initWidgetsInScope(document);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("load", () => {
    const ST = getScrollTrigger();
    if (!ST) return;
    if (window.location.hash) {
      ST.clearScrollMemory();
      setTimeout(() => ST.refresh(true), 200);
    } else {
      requestAnimationFrame(() => ST.refresh());
    }
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      const ST = getScrollTrigger();
      if (ST) {
        ST.clearScrollMemory();
        ST.refresh(true);
      }
    }
  });
  var _a3;
  if ((_a3 = document.fonts) == null ? void 0 : _a3.ready) {
    document.fonts.ready.then(() => {
      const ST = getScrollTrigger();
      if (ST) ST.refresh();
    });
  }
  window.addEventListener("elementor/popup/show", (e) => {
    initWidgetsInScope(e.target);
    const ST = getScrollTrigger();
    if (ST) ST.refresh();
  });
  var registerHooks = () => {
    let attempts = 0;
    const tryRegister = () => {
      var _a4;
      if (!((_a4 = window.elementorFrontend) == null ? void 0 : _a4.hooks)) {
        if (++attempts < 50) {
          setTimeout(tryRegister, 100);
        }
        return;
      }
      let refreshTimeout;
      const debouncedRefresh = () => {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          const ST = getScrollTrigger();
          if (ST) ST.refresh();
        }, 200);
      };
      elementorFrontend.hooks.addAction("frontend/element_ready/global", ($scope) => {
        var _a5;
        const node = $scope[0];
        if (!node) return;
        if (elementorFrontend.isEditMode()) {
          const widgetId = node.getAttribute("data-id");
          if (widgetId) killTriggerByWidgetId(widgetId);
          const getForcePreviewFlag = (id) => {
            var _a6, _b2;
            try {
              if (window.ScrollCrafterForcePreview === id) return true;
              if (((_a6 = window.parent) == null ? void 0 : _a6.ScrollCrafterForcePreview) === id) return true;
              if (((_b2 = window.top) == null ? void 0 : _b2.ScrollCrafterForcePreview) === id) return true;
              if (sessionStorage.getItem("sc_force_preview") === id) return true;
            } catch (e) {
            }
            return false;
          };
          const allowLive = !!((_a5 = window.ScrollCrafterConfig) == null ? void 0 : _a5.enableEditorAnimations);
          const isManualPreview = node.getAttribute("data-sc-preview") === "yes" || getForcePreviewFlag(widgetId);
          if (!allowLive && !isManualPreview) return;
          if (isManualPreview) {
            setTimeout(() => {
              var _a6, _b2;
              if (window.ScrollCrafterForcePreview === widgetId) window.ScrollCrafterForcePreview = false;
              if (((_a6 = window.parent) == null ? void 0 : _a6.ScrollCrafterForcePreview) === widgetId) window.parent.ScrollCrafterForcePreview = false;
              if (((_b2 = window.top) == null ? void 0 : _b2.ScrollCrafterForcePreview) === widgetId) window.top.ScrollCrafterForcePreview = false;
              sessionStorage.removeItem("sc_force_preview");
            }, 100);
          }
        }
        initWidgetsInScope(node, elementorFrontend.isEditMode());
        if (elementorFrontend.isEditMode()) {
          debouncedRefresh();
        }
      });
    };
    tryRegister();
  };
  registerHooks();
  window.addEventListener("elementor/frontend/init", registerHooks);
  function killTriggerByWidgetId(widgetId) {
    try {
      const ST = getScrollTrigger();
      if (!ST) return;
      const st = ST.getById("sc-" + widgetId);
      if (st) st.kill(true);
    } catch (e) {
    }
  }
})();
//# sourceMappingURL=frontend.bundle.js.map
