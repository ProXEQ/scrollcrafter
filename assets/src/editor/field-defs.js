const { __, _n, sprintf } = wp.i18n;

const COMMON_VARS = [
  { label: 'opacity=0', detail: __('Fade out (0)', 'scrollcrafter') },
  { label: 'opacity=1', detail: __('Fade in (1)', 'scrollcrafter') },
  { label: 'autoAlpha=0', detail: __('Fade out + hide (visibility)', 'scrollcrafter') },
  { label: 'autoAlpha=1', detail: __('Fade in + show (visibility)', 'scrollcrafter') },
  { label: 'x=100', detail: __('Move right 100px', 'scrollcrafter') },
  { label: 'x=-100', detail: __('Move left 100px', 'scrollcrafter') },
  { label: 'y=100', detail: __('Move down 100px', 'scrollcrafter') },
  { label: 'y=-100', detail: __('Move up 100px', 'scrollcrafter') },
  { label: 'xPercent=-50', detail: __('Move left 50% of self', 'scrollcrafter') },
  { label: 'yPercent=-50', detail: __('Move up 50% of self', 'scrollcrafter') },
  { label: 'scale=0', detail: __('Scale down to 0', 'scrollcrafter') },
  { label: 'scale=1.5', detail: __('Scale up to 1.5', 'scrollcrafter') },
  { label: 'rotation=45', detail: __('Rotate 45deg', 'scrollcrafter') },
  { label: 'rotation=360', detail: __('Full spin', 'scrollcrafter') },
  { label: 'backgroundColor=#f00', detail: __('Change to Red', 'scrollcrafter') },
  { label: 'filter=blur(10px)', detail: __('Blur effect', 'scrollcrafter') },
  { label: 'transformOrigin=center top', detail: __('Pivot point: top center', 'scrollcrafter') },
];

const COMMON_EASES = [
  { label: 'none', detail: __('Linear (no ease)', 'scrollcrafter') },
  { label: 'power1.out', detail: __('Subtle ease out', 'scrollcrafter') },
  { label: 'power2.inOut', detail: __('Standard smooth', 'scrollcrafter') },
  { label: 'back.out(1.7)', detail: __('Overshoot/Elastic', 'scrollcrafter') },
  { label: 'bounce.out', detail: __('Bouncing effect', 'scrollcrafter') },
  { label: 'circ.out', detail: __('Circular curve', 'scrollcrafter') },
  { label: 'expo.inOut', detail: __('Sharp acceleration', 'scrollcrafter') },
  { label: 'steps(5)', detail: __('Stepped (5 frames)', 'scrollcrafter') }
];

export const FIELD_DEFS = {
  animation: {
    type: {
      label: 'type:', detail: __('Method', 'scrollcrafter'),
      values: [
        { label: 'from', detail: __('Animate FROM these values to current', 'scrollcrafter') },
        { label: 'to', detail: __('Animate TO these values from current', 'scrollcrafter') },
        { label: 'fromTo', detail: __('Define BOTH start and end values', 'scrollcrafter') },
        { label: 'set', detail: __('Set values immediately (no duration)', 'scrollcrafter') }
      ]
    },
    from: { label: 'from:', detail: __('Start properties (e.g. opacity=0)', 'scrollcrafter'), values: COMMON_VARS },
    to: { label: 'to:', detail: __('End properties (e.g. opacity=1)', 'scrollcrafter'), values: COMMON_VARS },

    duration: {
      label: 'duration:', detail: __('Duration in seconds', 'scrollcrafter'),
      values: [{ label: '0.5' }, { label: '1.0' }, { label: '2.0' }]
    },
    delay: { label: 'delay:', detail: __('Start delay (seconds)', 'scrollcrafter') },
    ease: { label: 'ease:', detail: __('Motion curve', 'scrollcrafter'), values: COMMON_EASES },

    stagger: {
      label: 'stagger:', detail: __('Delay between items (sec)', 'scrollcrafter'),
      values: [{ label: '0.1' }, { label: '0.2' }, { label: '{ amount: 1, from: "center" }' }]
    },
    'stagger.amount': { label: 'stagger.amount:', detail: __('Total time to split among items', 'scrollcrafter') },
    'stagger.from': {
      label: 'stagger.from:', detail: __('Start order', 'scrollcrafter'),
      values: [{ label: 'center' }, { label: 'end' }, { label: 'edges' }, { label: 'random' }]
    },
    'stagger.grid': { label: 'stagger.grid:', detail: __('Grid [rows, cols] or "auto"', 'scrollcrafter') },

    split: {
      label: 'split:', detail: __('Split text into...', 'scrollcrafter'),
      values: [{ label: 'chars', detail: __('Letters') }, { label: 'words' }, { label: 'lines' }, { label: 'chars, words' }]
    },

    'text.value': { label: 'text.value:', detail: __('New text content', 'scrollcrafter') },
    'text.delimiter': { label: 'text.delimiter:', detail: __('Typewriter cursor or char', 'scrollcrafter') },
    'text.speed': { label: 'text.speed:', detail: __('Typing speed multiplier', 'scrollcrafter') },

    repeat: {
      label: 'repeat:', detail: __('Repeat count', 'scrollcrafter'),
      values: [{ label: '-1', detail: __('Infinite') }, { label: '1', detail: __('Once') }]
    },
    yoyo: {
      label: 'yoyo:', detail: __('Return to start?', 'scrollcrafter'),
      values: [{ label: 'true', detail: __('To-Fro loop') }, { label: 'false' }]
    }
  },

  scroll: {
    trigger: { label: 'trigger:', detail: __('Element selector (default: self)', 'scrollcrafter') },

    start: {
      label: 'start:', detail: __('[trigger_pos] [viewport_pos]', 'scrollcrafter'),
      values: [
        { label: 'top center', detail: __('When top of element hits center of viewport', 'scrollcrafter') },
        { label: 'top 80%', detail: __('When top of element hits 80% viewport', 'scrollcrafter') },
        { label: 'top bottom', detail: __('As soon as element enters viewport', 'scrollcrafter') }
      ]
    },

    end: {
      label: 'end:', detail: __('[trigger_pos] [viewport_pos]', 'scrollcrafter'),
      values: [
        { label: 'bottom center', detail: __('When bottom of element hits center', 'scrollcrafter') },
        { label: 'bottom top', detail: __('When element fully leaves viewport', 'scrollcrafter') },
        { label: '+=500', detail: __('Scroll 500px from start', 'scrollcrafter') }
      ]
    },

    scrub: {
      label: 'scrub:', detail: __('Link animation to scrollbar', 'scrollcrafter'),
      values: [
        { label: 'true', detail: __('Direct sync (no smoothing)', 'scrollcrafter') },
        { label: '1', detail: __('Soft sync (1s lag)', 'scrollcrafter') }
      ]
    },

    pin: {
      label: 'pin:', detail: __('Stick element during scroll?', 'scrollcrafter'),
      values: [
        { label: 'true', detail: __('Pin the trigger element', 'scrollcrafter') },
        { label: '".selector"', detail: __('Pin another element', 'scrollcrafter') }
      ]
    },

    pinSpacing: {
      label: 'pinSpacing:', detail: __('Reserve space for pin?', 'scrollcrafter'),
      values: [{ label: 'true', detail: __('Yes (Default)') }, { label: 'false', detail: __('No (Overlay)') }]
    },

    anticipatePin: { label: 'anticipatePin:', detail: __('Pin smoothing (1)', 'scrollcrafter') },

    once: {
      label: 'once:', detail: __('Play only once?', 'scrollcrafter'),
      values: [{ label: 'true', detail: __('Kill after playing', 'scrollcrafter') }]
    },

    markers: {
      label: 'markers:', detail: __('Show debug markers', 'scrollcrafter'),
      values: [{ label: 'true' }]
    },

    toggleActions: {
      label: 'toggleActions:', detail: __('Events: Enter Leave EnterBack LeaveBack', 'scrollcrafter'),
      values: [
        { label: 'play none none reverse', detail: __('Default (Reverses on up-scroll)', 'scrollcrafter') },
        { label: 'play pause resume reset', detail: __('Replayable', 'scrollcrafter') },
        { label: 'restart none none none', detail: __('Always start from 0', 'scrollcrafter') }
      ]
    },

    snap: {
      label: 'snap:', detail: __('Snap to progress', 'scrollcrafter'),
      values: [{ label: '1 / (items.length - 1)' }, { label: '0.5' }]
    }
  },

  target: {
    selector: {
      label: 'selector:', detail: __('Target child elements', 'scrollcrafter'),
      info: __('Scope: Targets are relative to the widget. Use "h2" or ".my-class".', 'scrollcrafter')
    },
  },

  timeline: {
    'timeline.defaults.duration': { label: 'timeline.defaults.duration:', detail: __('Global duration', 'scrollcrafter') },
    'timeline.defaults.ease': { label: 'timeline.defaults.ease:', detail: __('Global ease', 'scrollcrafter'), values: COMMON_EASES },
    'timeline.defaults.stagger': { label: 'timeline.defaults.stagger:', detail: __('Global stagger', 'scrollcrafter') },
    'timeline.repeat': { label: 'timeline.repeat:', detail: __('Repeat entire timeline', 'scrollcrafter') },
    'timeline.repeatDelay': { label: 'timeline.repeatDelay:', detail: __('Delay between repeats', 'scrollcrafter') },
    'timeline.yoyo': { label: 'timeline.yoyo:', detail: __('Yoyo entire timeline', 'scrollcrafter') },
  },

  'step.*': {
    type: {
      label: 'type:', detail: __('Step Method', 'scrollcrafter'),
      values: [
        { label: 'to', detail: __('Animate TO state (default)', 'scrollcrafter') },
        { label: 'from', detail: __('Animate FROM state', 'scrollcrafter') },
        { label: 'fromTo', detail: __('Control start & end', 'scrollcrafter') },
        { label: 'set', detail: __('Instant change', 'scrollcrafter') },
        { label: 'addLabel', detail: __('Add marker to timeline', 'scrollcrafter') }
      ]
    },
    selector: {
      label: 'selector:', detail: __('Override target', 'scrollcrafter'),
      info: __('Target a specific child just for this step (e.g. ".icon")', 'scrollcrafter')
    },

    // Advanced props
    split: {
      label: 'split:', detail: __('Split text into...', 'scrollcrafter'),
      values: [{ label: 'chars', detail: __('Letters') }, { label: 'words' }, { label: 'lines' }, { label: 'chars, words' }]
    },
    'stagger.amount': { label: 'stagger.amount:', detail: __('Total time to split among items', 'scrollcrafter') },
    'stagger.from': {
      label: 'stagger.from:', detail: __('Start order', 'scrollcrafter'),
      values: [{ label: 'center' }, { label: 'end' }, { label: 'edges' }, { label: 'random' }]
    },
    'stagger.grid': { label: 'stagger.grid:', detail: __('Grid [rows, cols] or "auto"', 'scrollcrafter') },
    'text.value': { label: 'text.value:', detail: __('New text content', 'scrollcrafter') },

    position: {
      label: 'position:', detail: __('Timeline placement', 'scrollcrafter'),
      values: [
        { label: '<', detail: __('Start with previous', 'scrollcrafter') },
        { label: '>', detail: __('Start after previous', 'scrollcrafter') },
        { label: '-=0.5', detail: __('Overlap 0.5s', 'scrollcrafter') },
        { label: '+=1', detail: __('Wait 1s', 'scrollcrafter') }
      ]
    },

    from: { label: 'from:', detail: __('Start properties', 'scrollcrafter'), values: COMMON_VARS },
    to: { label: 'to:', detail: __('End properties', 'scrollcrafter'), values: COMMON_VARS },

    startAt: { label: 'startAt:', detail: __('Immediate setup vars', 'scrollcrafter'), values: COMMON_VARS },
    duration: {
      label: 'duration:', detail: __('Step duration (sec)', 'scrollcrafter'),
      values: [{ label: '0.5' }, { label: '1.0' }]
    },
    delay: { label: 'delay:', detail: __('Delay inside step', 'scrollcrafter') },
    ease: { label: 'ease:', detail: __('Step ease', 'scrollcrafter'), values: COMMON_EASES },

    stagger: {
      label: 'stagger:', detail: __('Delay between items (sec)', 'scrollcrafter'),
      values: [{ label: '0.1' }, { label: '0.2' }, { label: '{ amount: 1, from: "center" }' }]
    },

    label: { label: 'label:', detail: __('Label name for navigation', 'scrollcrafter') }
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
