(() => {
  // assets/src/frontend/core/registry.js
  var registry = {};
  function registerWidget(type, initFn) {
    registry[type] = initFn;
  }
  function initWidgetsInScope(root = document) {
    if (!root || !root.querySelectorAll) {
      return;
    }
    const nodes = root.querySelectorAll("[data-scrollcrafter-config]");
    nodes.forEach((node) => {
      var _a, _b;
      const raw = node.getAttribute("data-scrollcrafter-config");
      if (!raw) return;
      let config;
      try {
        config = JSON.parse(raw);
      } catch (e) {
        if ((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug) {
          console.warn("ScrollCrafter: invalid config JSON", e);
        }
        return;
      }
      const type = config.widget;
      if (!type || typeof registry[type] !== "function") {
        return;
      }
      try {
        registry[type](node, config);
        document.dispatchEvent(
          new CustomEvent("scrollcrafter:widget_init", {
            detail: { type, node, config }
          })
        );
      } catch (e) {
        if ((_b = window.ScrollCrafterConfig) == null ? void 0 : _b.debug) {
          console.error("ScrollCrafter: widget init error", type, e);
        }
      }
    });
  }

  // assets/src/frontend/core/gsap-loader.js
  function getGsap() {
    if (typeof window === "undefined") {
      throw new Error("GSAP not available: window is undefined");
    }
    const { gsap } = window;
    if (!gsap) {
      throw new Error("GSAP not found on window.gsap");
    }
    if (gsap.core && typeof window.ScrollTrigger !== "undefined") {
      if (!gsap.core.globals().ScrollTrigger) {
        gsap.registerPlugin(window.ScrollTrigger);
      }
    }
    return gsap;
  }
  function getScrollTrigger() {
    if (typeof window === "undefined") {
      throw new Error("ScrollTrigger not available: window is undefined");
    }
    if (!window.ScrollTrigger) {
      throw new Error("ScrollTrigger not found on window.ScrollTrigger");
    }
    return window.ScrollTrigger;
  }

  // assets/src/frontend/widgets/scroll-animation.js
  registerWidget("scroll_animation", (node, config) => {
    var _a, _b;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    if (debug) {
      console.log("[ScrollCrafter][scroll_animation] init", { node, config });
    }
    let gsap;
    let ScrollTrigger;
    try {
      gsap = getGsap();
      ScrollTrigger = getScrollTrigger();
    } catch (e) {
      if (debug) {
        console.error("[ScrollCrafter][scroll_animation] GSAP/ScrollTrigger error", e);
      }
      return;
    }
    const { target, animation, scrollTrigger } = config || {};
    const selector = target == null ? void 0 : target.selector;
    if (!selector) {
      if (debug) {
        console.warn("[ScrollCrafter][scroll_animation] missing target selector", config);
      }
      return;
    }
    const targetNodes = node.ownerDocument.querySelectorAll(selector);
    if (!targetNodes.length) {
      if (debug) {
        console.warn("[ScrollCrafter][scroll_animation] no target nodes found", selector);
      }
      return;
    }
    const elements = targetNodes;
    const animType = (animation == null ? void 0 : animation.type) || "from";
    const fromVars = (animation == null ? void 0 : animation.from) || {};
    const toVars = (animation == null ? void 0 : animation.to) || {};
    const duration = typeof (animation == null ? void 0 : animation.duration) === "number" ? animation.duration : 0.8;
    const delay = typeof (animation == null ? void 0 : animation.delay) === "number" ? animation.delay : 0;
    const ease = (animation == null ? void 0 : animation.ease) || "power2.out";
    const stagger = typeof (animation == null ? void 0 : animation.stagger) === "number" ? animation.stagger : void 0;
    const stRaw = scrollTrigger || {};
    const stConfig = {
      trigger: elements[0],
      start: stRaw.start || "top 80%",
      end: stRaw.end || "bottom 20%",
      toggleActions: stRaw.toggleActions || "play none none reverse",
      ...typeof stRaw.scrub !== "undefined" ? { scrub: stRaw.scrub } : {},
      ...typeof stRaw.once !== "undefined" ? { once: !!stRaw.once } : {},
      ...typeof stRaw.markers !== "undefined" ? { markers: !!stRaw.markers } : { markers: !!((_b = window.ScrollCrafterConfig) == null ? void 0 : _b.debug) },
      ...typeof stRaw.pin !== "undefined" ? { pin: !!stRaw.pin } : {},
      ...typeof stRaw.pinSpacing !== "undefined" ? { pinSpacing: !!stRaw.pinSpacing } : {},
      ...typeof stRaw.anticipatePin !== "undefined" ? { anticipatePin: Number(stRaw.anticipatePin) } : {},
      ...typeof stRaw.snap !== "undefined" ? { snap: stRaw.snap } : {}
    };
    const base = {
      duration,
      delay,
      ease
    };
    if (typeof stagger === "number") {
      base.stagger = stagger;
    }
    let tween;
    if (animType === "fromTo") {
      tween = gsap.fromTo(
        elements,
        { ...fromVars },
        {
          ...toVars,
          ...base
        }
      );
    } else if (animType === "to") {
      tween = gsap.to(elements, {
        ...toVars,
        ...base
      });
    } else {
      tween = gsap.from(elements, {
        ...fromVars,
        ...base
      });
    }
    ScrollTrigger.create({
      ...stConfig,
      animation: tween
    });
  });

  // assets/src/frontend/widgets/scroll-timeline.js
  function parseMacros(vars) {
    const newVars = { ...vars };
    Object.keys(newVars).forEach((key) => {
      const val = newVars[key];
      if (typeof val === "string") {
        if (val === "calc_horizontal_scroll") {
          newVars[key] = (i, target) => {
            if (target.scrollWidth <= window.innerWidth) return 0;
            return -(target.scrollWidth - window.innerWidth);
          };
        }
        if (val === "calc_100vh") {
          newVars[key] = () => window.innerHeight;
        }
        if (val === "calc_100vw") {
          newVars[key] = () => window.innerWidth;
        }
      }
    });
    return newVars;
  }
  registerWidget("scroll_timeline", (node, config) => {
    var _a, _b, _c, _d;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    let gsap;
    let ScrollTrigger;
    try {
      gsap = getGsap();
      ScrollTrigger = getScrollTrigger();
    } catch (e) {
      if (debug) console.error("[ScrollCrafter] GSAP missing", e);
      return;
    }
    const mainSelector = (_b = config == null ? void 0 : config.target) == null ? void 0 : _b.selector;
    const mainElements = mainSelector ? node.ownerDocument.querySelectorAll(mainSelector) : [node];
    if (!mainElements.length) return;
    const steps = ((_c = config == null ? void 0 : config.timeline) == null ? void 0 : _c.steps) || [];
    const defaults = ((_d = config == null ? void 0 : config.timeline) == null ? void 0 : _d.defaults) || {};
    const stRaw = (config == null ? void 0 : config.scrollTrigger) || {};
    const stConfig = {
      trigger: mainElements[0],
      start: stRaw.start || "top 80%",
      end: stRaw.end || "bottom 20%",
      toggleActions: stRaw.toggleActions || "play none none reverse",
      invalidateOnRefresh: true,
      ...typeof stRaw.fastScrollEnd !== "undefined" ? { fastScrollEnd: !!stRaw.fastScrollEnd } : {},
      ...typeof stRaw.preventOverlaps !== "undefined" ? { preventOverlaps: !!stRaw.preventOverlaps } : {},
      ...typeof stRaw.scrub !== "undefined" ? { scrub: stRaw.scrub } : {},
      ...typeof stRaw.once !== "undefined" ? { once: !!stRaw.once } : {},
      ...typeof stRaw.markers !== "undefined" ? { markers: !!stRaw.markers } : { markers: debug },
      ...typeof stRaw.pin !== "undefined" ? { pin: !!stRaw.pin } : {},
      ...typeof stRaw.pinSpacing !== "undefined" ? { pinSpacing: !!stRaw.pinSpacing } : {},
      ...typeof stRaw.anticipatePin !== "undefined" ? { anticipatePin: Number(stRaw.anticipatePin) } : {},
      ...typeof stRaw.snap !== "undefined" ? { snap: stRaw.snap } : {}
    };
    const tl = gsap.timeline({ defaults, scrollTrigger: stConfig });
    steps.forEach((step) => {
      let type = (step == null ? void 0 : step.type) || "from";
      const fromVars = parseMacros((step == null ? void 0 : step.from) || {});
      const toVars = parseMacros((step == null ? void 0 : step.to) || {});
      const hasFrom = Object.keys(fromVars).length > 0;
      const hasTo = Object.keys(toVars).length > 0;
      if (type === "to" && hasFrom) type = "fromTo";
      if (type === "from" && hasTo) type = "fromTo";
      const base = {};
      if (typeof (step == null ? void 0 : step.duration) === "number") base.duration = step.duration;
      if (typeof (step == null ? void 0 : step.delay) === "number") base.delay = step.delay;
      if (typeof (step == null ? void 0 : step.ease) === "string") base.ease = step.ease;
      if (typeof (step == null ? void 0 : step.stagger) === "number") base.stagger = step.stagger;
      const position = typeof (step == null ? void 0 : step.startAt) === "number" ? step.startAt : void 0;
      let targets = mainElements;
      if (step.selector) {
        const found = node.querySelectorAll(step.selector);
        if (found.length > 0) {
          targets = found;
        } else if (debug) {
          console.warn(`[ScrollCrafter] Step selector "${step.selector}" not found.`);
        }
      }
      if (type === "fromTo") {
        tl.fromTo(targets, { ...fromVars }, { ...toVars, ...base }, position);
      } else if (type === "to") {
        tl.to(targets, { ...toVars, ...base }, position);
      } else {
        tl.from(targets, { ...fromVars, ...base }, position);
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
  });
  window.addEventListener("elementor/frontend/init", () => {
    if (!window.elementorFrontend) return;
    elementorFrontend.hooks.addAction("frontend/element_ready/global", ($scope) => {
      const node = $scope[0];
      if (elementorFrontend.isEditMode()) {
        cleanupDetachedTriggers();
      }
      initWidgetsInScope(node);
    });
  });
  function cleanupDetachedTriggers() {
    try {
      const ScrollTrigger = getScrollTrigger();
      const triggers = ScrollTrigger.getAll();
      triggers.forEach((st) => {
        var _a;
        const triggerElem = st.trigger;
        const isDetached = triggerElem && !document.body.contains(triggerElem);
        if (isDetached) {
          st.kill(true);
          if ((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug) {
            console.log("[ScrollCrafter] Killed detached trigger", st);
          }
        }
      });
    } catch (e) {
    }
  }
})();
//# sourceMappingURL=frontend.bundle.js.map
