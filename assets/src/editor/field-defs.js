// assets/src/editor/field-defs.js

// Wspólne wartości dla właściwości CSS (używane w animation i steps)
const COMMON_VARS = [
  { label: 'opacity=0', detail: 'hide' },
  { label: 'opacity=1', detail: 'show' },
  { label: 'autoAlpha=0', detail: 'hide + visibility:hidden' },
  { label: 'x=100', detail: 'move right 100px' },
  { label: 'x=-100', detail: 'move left 100px' },
  { label: 'y=50', detail: 'move down 50px' },
  { label: 'y=-50', detail: 'move up 50px' },
  { label: 'scale=0.5', detail: 'shrink' },
  { label: 'scale=1.2', detail: 'grow' },
  { label: 'rotation=360', detail: 'spin' },
  { label: 'filter=blur(10px)', detail: 'blur effect' },
  { label: 'backgroundColor=#ff0000', detail: 'change color' },
  { label: 'transformOrigin=center center', detail: 'pivot point' }
];

// Wspólne wartości dla Easingu
const COMMON_EASES = [
  { label: 'none', detail: 'Linear' },
  { label: 'power1.out', detail: 'Subtle' },
  { label: 'power2.out', detail: 'Standard' },
  { label: 'power3.out', detail: 'Strong' },
  { label: 'power4.out', detail: 'Sharp' },
  { label: 'back.out(1.7)', detail: 'Overshoot' },
  { label: 'elastic.out(1, 0.3)', detail: 'Bouncy' },
  { label: 'circ.out', detail: 'Circular' },
  { label: 'expo.out', detail: 'Exponential' },
  { label: 'sine.inOut', detail: 'Smooth wave' }
];

export const FIELD_DEFS = {
  // --- [animation] ---
  animation: {
    type: {
      label: 'type:', detail: 'method',
      values: [
        { label: 'from', detail: 'Animate from state' }, 
        { label: 'to', detail: 'Animate to state' }, 
        { label: 'fromTo', detail: 'Control start & end' },
        { label: 'set', detail: 'Instant change' }
      ]
    },
    from: { 
      label: 'from:', detail: 'start vars', 
      values: COMMON_VARS 
    },
    to: { 
      label: 'to:', detail: 'end vars', 
      values: COMMON_VARS 
    },
    duration: { 
      label: 'duration:', detail: 'seconds',
      values: [{ label: '0.5' }, { label: '1' }, { label: '2' }]
    },
    delay: { label: 'delay:', detail: 'seconds' },
    ease: {
      label: 'ease:', detail: 'timing function',
      values: COMMON_EASES
    },
    stagger: { 
        label: 'stagger:', detail: 'seconds/object', 
        values: [{ label: '0.1' }, { label: '0.2' }, { label: '{ amount: 1, from: "center" }' }]
    },
    repeat: { label: 'repeat:', detail: 'count (-1 = infinite)', values: [{ label: '-1' }, { label: '1' }] },
    yoyo: { label: 'yoyo:', detail: 'bool', values: [{ label: 'true' }] }
  },

  // --- [scroll] ---
  scroll: {
    trigger: { label: 'trigger:', detail: 'selector (default: self)' },
    start: { 
      label: 'start:', detail: 'trigger & viewport', 
      values: [
        { label: 'top 80%', detail: 'trigger-top hits viewport-80%' }, 
        { label: 'top center', detail: 'trigger-top hits viewport-center' },
        { label: 'top bottom', detail: 'start when visible' }
      ] 
    },
    end: { 
      label: 'end:', detail: 'trigger & viewport', 
      values: [
        { label: 'bottom 20%', detail: 'trigger-bottom hits viewport-20%' }, 
        { label: 'bottom top', detail: 'end when fully invisible' },
        { label: '+=500', detail: 'scroll 500px from start' }
      ] 
    },
    scrub: { 
      label: 'scrub:', detail: 'bool/lag', 
      values: [{ label: 'true', detail: 'Sync with scroll' }, { label: '1', detail: '1s smooth lag' }] 
    },
    pin: { 
      label: 'pin:', detail: 'bool/selector', 
      values: [{ label: 'true', detail: 'Pin trigger element' }] 
    },
    pinSpacing: { label: 'pinSpacing:', detail: 'bool', values: [{ label: 'true' }, { label: 'false' }] },
    anticipatePin: { label: 'anticipatePin:', detail: 'number', values: [{ label: '1' }] },
    once: { label: 'once:', detail: 'bool', values: [{ label: 'true', detail: 'Play only once' }] },
    markers: { label: 'markers:', detail: 'debug', values: [{ label: 'true' }] },
    toggleActions: { 
      label: 'toggleActions:', detail: 'onEnter onLeave onEnterBack onLeaveBack', 
      values: [
        { label: 'play none none reverse', detail: 'Default' }, 
        { label: 'play pause resume reset', detail: 'Replayable' },
        { label: 'restart none none none', detail: 'Always restart' }
      ]
    },
    snap: { 
        label: 'snap:', detail: 'number/array', 
        values: [{ label: '1 / (items.length - 1)' }, { label: '0.5' }] 
    }
  },

  // --- [target] ---
  target: {
    selector: { 
        label: 'selector:', detail: 'CSS selector', 
        info: 'Scope: current widget children. Use ".class" or "tag".' 
    },
  },

  // --- [timeline] ---
  timeline: {
    'timeline.defaults.duration': { label: 'timeline.defaults.duration:', detail: 'seconds' },
    'timeline.defaults.ease': { label: 'timeline.defaults.ease:', detail: 'ease', values: COMMON_EASES },
    'timeline.defaults.stagger': { label: 'timeline.defaults.stagger:', detail: 'seconds' },
    'timeline.repeat': { label: 'timeline.repeat:', detail: 'count' },
    'timeline.repeatDelay': { label: 'timeline.repeatDelay:', detail: 'seconds' },
    'timeline.yoyo': { label: 'timeline.yoyo:', detail: 'bool' },
  },

  // --- [step.N] ---
  'step.*': {
    type: { 
        label: 'type:', detail: 'method', 
        values: [
            { label: 'to' }, { label: 'from' }, { label: 'fromTo' }, 
            { label: 'set' }, { label: 'addLabel' }
        ] 
    },
    selector: { 
        label: 'selector:', detail: 'override target', 
        info: 'Target a specific child just for this step' 
    }, 
    
    // Position Parameter (Kluczowa poprawka względem Twojego kodu)
    position: { 
        label: 'position:', detail: 'timeline placement', 
        values: [
            { label: '<', detail: 'Start with previous' }, 
            { label: '>', detail: 'Start after previous' },
            { label: '-=0.5', detail: 'Overlap 0.5s' },
            { label: '+=1', detail: 'Wait 1s' }
        ] 
    },

    // Standard Animation Props
    from: { label: 'from:', detail: 'start vars', values: COMMON_VARS },
    to: { label: 'to:', detail: 'end vars' , values: COMMON_VARS },
    
    // startAt to obiekt "reset" przed animacją (GSAP specific)
    startAt: { label: 'startAt:', detail: 'immediate setup vars', values: COMMON_VARS },

    duration: { label: 'duration:', detail: 'seconds' },
    delay: { label: 'delay:', detail: 'seconds (in step)' },
    ease: { label: 'ease:', detail: 'ease', values: COMMON_EASES },
    stagger: { label: 'stagger:', detail: 'seconds' },
    
    // Dla type: addLabel
    label: { label: 'label:', detail: 'string name' }
  },
};

export const SECTION_HEADERS = [
  { label: '[animation]', type: 'keyword', detail: 'Single Tween' },
  { label: '[scroll]', type: 'keyword', detail: 'ScrollTrigger Config' },
  { label: '[timeline]', type: 'keyword', detail: 'Timeline Defaults' },
  { label: '[target]', type: 'keyword', detail: 'Override Target' },
  { label: '[step.1]', type: 'keyword', detail: 'First Step' },
  { label: '[step.2]', type: 'keyword', detail: 'Next Step...' },
];
