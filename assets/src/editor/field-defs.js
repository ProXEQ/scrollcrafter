const { __, _n, sprintf } = wp.i18n;

const COMMON_VARS = [
  { label: 'opacity=0', detail: __('hide', 'scrollcrafter') },
  { label: 'opacity=1', detail: __('show', 'scrollcrafter') },
  { label: 'autoAlpha=0', detail: __('hide + visibility:hidden', 'scrollcrafter') },
  { label: 'x=100', detail: __('move right 100px', 'scrollcrafter') },
  { label: 'x=-100', detail: __('move left 100px', 'scrollcrafter') },
  { label: 'xPercent=50', detail: __('move 50% of container width', 'scrollcrafter') },
  { label: 'y=50', detail: __('move down 50px', 'scrollcrafter') },
  { label: 'y=-50', detail: __('move up 50px', 'scrollcrafter') },
  { label: 'yPercent=-100', detail: __('move up 100% of container height', 'scrollcrafter') },
  { label: 'scale=0.5', detail: __('shrink', 'scrollcrafter') },
  { label: 'scale=1.2', detail: __('grow', 'scrollcrafter') },
  { label: 'rotation=360', detail: __('spin', 'scrollcrafter') },
  { label: 'filter=blur(10px)', detail: __('blur effect', 'scrollcrafter') },
  { label: 'backgroundColor=#ff0000', detail: __('change color', 'scrollcrafter') },
  { label: 'borderRadius=50%', detail: __('make round', 'scrollcrafter') },
  { label: 'transformOrigin=center center', detail: __('pivot point', 'scrollcrafter') },
  { label: 'x=calc(sw * -1)', detail: __('full scroll left', 'scrollcrafter') },
  { label: 'x=calc((sw * -1) + center)', detail: __('scroll & center', 'scrollcrafter') },
  { label: 'x=calc(end)', detail: __('align right', 'scrollcrafter') },
];

const COMMON_EASES = [
  { label: 'none', detail: __('Linear', 'scrollcrafter') },
  { label: 'power1.out', detail: __('Subtle', 'scrollcrafter') },
  { label: 'power2.out', detail: __('Standard', 'scrollcrafter') },
  { label: 'power3.out', detail: __('Strong', 'scrollcrafter') },
  { label: 'power4.out', detail: __('Sharp', 'scrollcrafter') },
  { label: 'back.out(1.7)', detail: __('Overshoot', 'scrollcrafter') },
  { label: 'elastic.out(1, 0.3)', detail: __('Bouncy', 'scrollcrafter') },
  { label: 'circ.out', detail: __('Circular', 'scrollcrafter') },
  { label: 'expo.out', detail: __('Exponential', 'scrollcrafter') },
  { label: 'sine.inOut', detail: __('Smooth wave', 'scrollcrafter') }
];

export const FIELD_DEFS = {
  animation: {
    type: {
      label: 'type:', detail: __('method', 'scrollcrafter'),
      values: [
        { label: 'from', detail: __('Animate from state', 'scrollcrafter') },
        { label: 'to', detail: __('Animate to state', 'scrollcrafter') }, 
        { label: 'fromTo', detail: __('Control start & end', 'scrollcrafter') },
        { label: 'set', detail: __('Instant change', 'scrollcrafter') }
      ]
    },
    from: { 
      label: 'from:', detail: __('start vars', 'scrollcrafter'),
      values: COMMON_VARS 
    },
    to: { 
      label: 'to:', detail: __('end vars', 'scrollcrafter'), 
      values: COMMON_VARS 
    },
    duration: { 
      label: 'duration:', detail: __('seconds', 'scrollcrafter'),
      values: [{ label: '0.5' }, { label: '1' }, { label: '2' }]
    },
    delay: { label: 'delay:', detail: __('seconds', 'scrollcrafter') },
    ease: {
      label: 'ease:', detail: __('timing function', 'scrollcrafter'),
      values: COMMON_EASES
    },
    stagger: { 
        label: 'stagger:', detail: __('seconds/object', 'scrollcrafter'), 
        values: [{ label: '0.1' }, { label: '0.2' }, { label: '{ amount: 1, from: "center" }' }]
    },
    repeat: { label: 'repeat:', detail: __('count (-1 = infinite)', 'scrollcrafter'), values: [{ label: '-1' }, { label: '1' }] },
    yoyo: { label: 'yoyo:', detail: __('bool', 'scrollcrafter'), values: [{ label: 'true' }] }
  },

  scroll: {
    trigger: { label: 'trigger:', detail: __('selector (default: self)', 'scrollcrafter') },
    start: { 
      label: 'start:', detail: __('trigger & viewport', 'scrollcrafter'), 
      values: [
        { label: 'top 80%', detail: __('trigger-top hits viewport-80%', 'scrollcrafter') }, 
        { label: 'top center', detail: __('trigger-top hits viewport-center', 'scrollcrafter') },
        { label: 'top bottom', detail: __('start when visible', 'scrollcrafter') }
      ] 
    },
    end: { 
      label: 'end:', detail: __('trigger & viewport', 'scrollcrafter'), 
      values: [
        { label: 'bottom 20%', detail: __('trigger-bottom hits viewport-20%', 'scrollcrafter') }, 
        { label: 'bottom top', detail: __('end when fully invisible', 'scrollcrafter') },
        { label: '+=500', detail: __('scroll 500px from start', 'scrollcrafter') }
      ] 
    },
    scrub: { 
      label: 'scrub:', detail: __('bool/lag', 'scrollcrafter'), 
      values: [{ label: 'true', detail: __('Sync with scroll', 'scrollcrafter') }, { label: '1', detail: __('1s smooth lag', 'scrollcrafter') }] 
    },
    pin: { 
      label: 'pin:', detail: __('bool/selector', 'scrollcrafter'), 
      values: [{ label: 'true', detail: __('Pin trigger element', 'scrollcrafter') }] 
    },
    pinSpacing: { label: 'pinSpacing:', detail: __('bool', 'scrollcrafter'), values: [{ label: 'true' }, { label: 'false' }] },
    anticipatePin: { label: 'anticipatePin:', detail: __('number', 'scrollcrafter'), values: [{ label: '1' }] },
    once: { label: 'once:', detail: __('bool', 'scrollcrafter'), values: [{ label: 'true', detail: __('Play only once', 'scrollcrafter') }] },
    markers: { label: 'markers:', detail: __('debug', 'scrollcrafter'), values: [{ label: 'true' }] },
    toggleActions: { 
      label: 'toggleActions:', detail: __('onEnter onLeave onEnterBack onLeaveBack', 'scrollcrafter'), 
      values: [
        { label: 'play none none reverse', detail: __('Default', 'scrollcrafter') }, 
        { label: 'play pause resume reset', detail: __('Replayable', 'scrollcrafter') },
        { label: 'restart none none none', detail: __('Always restart', 'scrollcrafter') }
      ]
    },
    snap: { 
        label: 'snap:', detail: __('number/array', 'scrollcrafter'), 
        values: [{ label: '1 / (items.length - 1)' }, { label: '0.5' }] 
    }
  },

  target: {
    selector: { 
        label: 'selector:', detail: __('CSS selector', 'scrollcrafter'), 
        info: __('Scope: current widget children. Use ".class" or "tag".', 'scrollcrafter')
    },
  },

  timeline: {
    'timeline.defaults.duration': { label: 'timeline.defaults.duration:', detail: __('seconds', 'scrollcrafter') },
    'timeline.defaults.ease': { label: 'timeline.defaults.ease:', detail: __('ease', 'scrollcrafter'), values: COMMON_EASES },
    'timeline.defaults.stagger': { label: 'timeline.defaults.stagger:', detail: __('seconds', 'scrollcrafter') },
    'timeline.repeat': { label: 'timeline.repeat:', detail: __('count', 'scrollcrafter') },
    'timeline.repeatDelay': { label: 'timeline.repeatDelay:', detail: __('seconds', 'scrollcrafter') },
    'timeline.yoyo': { label: 'timeline.yoyo:', detail: __('bool', 'scrollcrafter') },
  },

  'step.*': {
    type: { 
        label: 'type:', detail: __('method', 'scrollcrafter'), 
        values: [
            { label: 'to' }, { label: 'from' }, { label: 'fromTo' }, 
            { label: 'set' }, { label: 'addLabel' }
        ] 
    },
    selector: { 
        label: 'selector:', detail: __('override target', 'scrollcrafter'), 
        info: __('Target a specific child just for this step', 'scrollcrafter') 
    }, 
    
    position: { 
        label: 'position:', detail: __('timeline placement', 'scrollcrafter'), 
        values: [
            { label: '<', detail: __('Start with previous', 'scrollcrafter') }, 
            { label: '>', detail: __('Start after previous', 'scrollcrafter') },
            { label: '-=0.5', detail: __('Overlap 0.5s', 'scrollcrafter') },
            { label: '+=1', detail: __('Wait 1s', 'scrollcrafter') }
        ] 
    },

    from: { label: 'from:', detail: __('start vars', 'scrollcrafter'), values: COMMON_VARS },
    to: { label: 'to:', detail: __('end vars', 'scrollcrafter') , values: COMMON_VARS },

    startAt: { label: 'startAt:', detail: __('immediate setup vars', 'scrollcrafter'), values: COMMON_VARS },
    duration: { label: 'duration:', detail: __('seconds', 'scrollcrafter') },
    delay: { label: 'delay:', detail: __('seconds (in step)', 'scrollcrafter') },
    ease: { label: 'ease:', detail: __('ease', 'scrollcrafter'), values: COMMON_EASES },
    stagger: { label: 'stagger:', detail: __('seconds', 'scrollcrafter') },

    label: { label: 'label:', detail: __('string name', 'scrollcrafter') }
  },
};

export const SECTION_HEADERS = [
  { label: '[animation]', type: 'keyword', detail: __('Single Tween', 'scrollcrafter') },
  { label: '[scroll]', type: 'keyword', detail: __('ScrollTrigger Config', 'scrollcrafter') },
  { label: '[timeline]', type: 'keyword', detail: __('Timeline Defaults', 'scrollcrafter') },
  { label: '[target]', type: 'keyword', detail: __('Override Target', 'scrollcrafter') },
  { label: '[step.1]', type: 'keyword', detail: __('First Step', 'scrollcrafter') },
  { label: '[step.2]', type: 'keyword', detail: __('Next Step...', 'scrollcrafter') },
];
