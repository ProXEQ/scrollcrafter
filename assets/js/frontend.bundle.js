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
    var _a, _b, _c, _d;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    console.log("[ScrollCrafter][scroll_animation] init", { node, config });
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
    const { target, animation, scrollTrigger } = config;
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
    const duration = (_b = animation == null ? void 0 : animation.duration) != null ? _b : 0.8;
    const delay = (_c = animation == null ? void 0 : animation.delay) != null ? _c : 0;
    const ease = (animation == null ? void 0 : animation.ease) || "power2.out";
    const stConfig = {
      trigger: elements[0],
      start: (scrollTrigger == null ? void 0 : scrollTrigger.start) || "top 80%",
      end: (scrollTrigger == null ? void 0 : scrollTrigger.end) || "bottom 20%",
      toggleActions: (scrollTrigger == null ? void 0 : scrollTrigger.toggleActions) || "play none none reverse",
      once: !!(scrollTrigger == null ? void 0 : scrollTrigger.once),
      scrub: !!(scrollTrigger == null ? void 0 : scrollTrigger.scrub),
      markers: !!((_d = window.ScrollCrafterConfig) == null ? void 0 : _d.debug)
    };
    let tween;
    if (animType === "fromTo") {
      tween = gsap.fromTo(
        elements,
        { ...fromVars },
        {
          ...toVars,
          duration,
          delay,
          ease
        }
      );
    } else if (animType === "to") {
      tween = gsap.to(elements, {
        ...toVars,
        duration,
        delay,
        ease
      });
    } else {
      tween = gsap.from(elements, {
        ...fromVars,
        duration,
        delay,
        ease
      });
    }
    ScrollTrigger.create({
      ...stConfig,
      animation: tween
    });
  });

  // assets/src/frontend/widgets/scroll-timeline.js
  registerWidget("scroll_timeline", (node, config) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    const debug = !!((_a = window.ScrollCrafterConfig) == null ? void 0 : _a.debug);
    let gsap;
    let ScrollTrigger;
    try {
      gsap = getGsap();
      ScrollTrigger = getScrollTrigger();
    } catch (e) {
      if (debug) console.error("[ScrollCrafter][scroll_timeline] GSAP error", e);
      return;
    }
    const selector = (_b = config == null ? void 0 : config.target) == null ? void 0 : _b.selector;
    const elements = selector ? node.ownerDocument.querySelectorAll(selector) : [node];
    if (!elements.length) {
      if (debug) console.warn("[ScrollCrafter][scroll_timeline] no target", selector);
      return;
    }
    const steps = ((_c = config == null ? void 0 : config.timeline) == null ? void 0 : _c.steps) || [];
    const defaults = ((_d = config == null ? void 0 : config.timeline) == null ? void 0 : _d.defaults) || {};
    const stConfig = {
      trigger: elements[0],
      start: ((_e = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _e.start) || "top 80%",
      end: ((_f = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _f.end) || "bottom 20%",
      toggleActions: ((_g = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _g.toggleActions) || "play none none reverse",
      ...typeof ((_h = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _h.scrub) !== "undefined" ? { scrub: config.scrollTrigger.scrub } : {},
      ...typeof ((_i = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _i.markers) !== "undefined" ? { markers: !!config.scrollTrigger.markers } : { markers: !!((_j = window.ScrollCrafterConfig) == null ? void 0 : _j.debug) },
      ...typeof ((_k = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _k.pin) !== "undefined" ? { pin: !!config.scrollTrigger.pin } : {},
      ...typeof ((_l = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _l.pinSpacing) !== "undefined" ? { pinSpacing: !!config.scrollTrigger.pinSpacing } : {},
      ...typeof ((_m = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _m.anticipatePin) !== "undefined" ? { anticipatePin: Number(config.scrollTrigger.anticipatePin) } : {},
      ...typeof ((_n = config == null ? void 0 : config.scrollTrigger) == null ? void 0 : _n.snap) !== "undefined" ? { snap: config.scrollTrigger.snap } : {}
    };
    const tl = gsap.timeline({ defaults, scrollTrigger: stConfig });
    steps.forEach((step) => {
      const type = (step == null ? void 0 : step.type) || "from";
      const fromVars = (step == null ? void 0 : step.from) || {};
      const toVars = (step == null ? void 0 : step.to) || {};
      const duration = typeof (step == null ? void 0 : step.duration) === "number" ? step.duration : void 0;
      const delay = typeof (step == null ? void 0 : step.delay) === "number" ? step.delay : void 0;
      const ease = step == null ? void 0 : step.ease;
      const stagger = typeof (step == null ? void 0 : step.stagger) === "number" ? step.stagger : void 0;
      const position = typeof (step == null ? void 0 : step.startAt) === "number" ? step.startAt : void 0;
      const base = {};
      if (typeof duration === "number") base.duration = duration;
      if (typeof delay === "number") base.delay = delay;
      if (typeof ease === "string") base.ease = ease;
      if (typeof stagger === "number") base.stagger = stagger;
      if (type === "fromTo") {
        tl.fromTo(elements, { ...fromVars }, { ...toVars, ...base }, position);
      } else if (type === "to") {
        tl.to(elements, { ...toVars, ...base }, position);
      } else {
        tl.from(elements, { ...fromVars, ...base }, position);
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
  document.addEventListener("elementor/popup/show", (event) => {
    initWidgetsInScope(event.target);
  });
})();
//# sourceMappingURL=frontend.bundle.js.map
