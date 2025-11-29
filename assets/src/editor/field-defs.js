// assets/src/editor/field-defs.js

export const FIELD_DEFS = {
  animation: {
    type: {
      label: 'type:', detail: 'tween type',
      values: [{ label: 'from' }, { label: 'to' }, { label: 'fromTo' }]
    },
    from: { label: 'from:', detail: 'vars (y=50, opacity=0)' },
    to: { label: 'to:', detail: 'vars (y=0, opacity=1)' },
    duration: { 
      label: 'duration:', detail: 'seconds',
      values: [{ label: '0.5' }, { label: '1' }, { label: '2' }]
    },
    delay: { label: 'delay:', detail: 'seconds' },
    ease: {
      label: 'ease:', detail: 'gsap ease',
      values: [
        { label: 'power1.out' }, { label: 'power2.out' }, { label: 'back.out(1.7)' },
        { label: 'elastic.out(1, 0.3)' }, { label: 'none' }
      ]
    },
    stagger: { label: 'stagger:', detail: 'seconds' },
  },

  scroll: {
    start: { label: 'start:', detail: 'position', values: [{ label: 'top 80%' }, { label: 'top center' }] },
    end: { label: 'end:', detail: 'position', values: [{ label: 'bottom 20%' }] },
    scrub: { label: 'scrub:', detail: 'bool/num', values: [{ label: 'true' }, { label: '1' }] },
    once: { label: 'once:', detail: 'bool', values: [{ label: 'true' }, { label: 'false' }] },
    markers: { label: 'markers:', detail: 'bool', values: [{ label: 'true' }, { label: 'false' }] },
    toggleActions: { 
      label: 'toggleActions:', detail: 'actions', 
      values: [{ label: 'play none none reverse' }, { label: 'play pause resume reset' }]
    },
    pin: { label: 'pin:', detail: 'bool', values: [{ label: 'true' }] },
    pinSpacing: { label: 'pinSpacing:', detail: 'bool', values: [{ label: 'true' }] },
  },

  target: {
    selector: { label: 'selector:', detail: 'css selector' },
  },

  timeline: {
    'timeline.defaults.duration': { label: 'timeline.defaults.duration:', detail: 'seconds' },
    'timeline.defaults.ease': { label: 'timeline.defaults.ease:', detail: 'ease' },
    'timeline.defaults.stagger': { label: 'timeline.defaults.stagger:', detail: 'seconds' },
  },

  'step.*': {
    type: { label: 'type:', detail: 'tween type', values: [{ label: 'from' }, { label: 'to' }, { label: 'fromTo' }] },
    selector: { label: 'selector:', detail: 'child selector', info: 'Target specific children (e.g. h2)' }, 
    from: { label: 'from:', detail: 'vars', values: [
        { label: 'x=calc_horizontal_scroll' }, 
        { label: 'x=calc_100vw' },
        { label: 'opacity=0' }
    ]},
    to: { label: 'to:', detail: 'vars' , values: [
        { label: 'x=calc_horizontal_scroll' }, 
        { label: 'x=calc_100vw' },
        { label: 'opacity=1' }
    ] },
    duration: { label: 'duration:', detail: 'seconds' },
    delay: { label: 'delay:', detail: 'seconds' },
    ease: { label: 'ease:', detail: 'ease', values: [{ label: 'power2.out' }] },
    stagger: { label: 'stagger:', detail: 'seconds' },
    startAt: { label: 'startAt:', detail: 'position', values: [{ label: '<' }, { label: '+=0.5' }] },
  },
};

export const SECTION_HEADERS = [
  { label: '[animation]', type: 'keyword' },
  { label: '[scroll]', type: 'keyword' },
  { label: '[target]', type: 'keyword' },
  { label: '[timeline]', type: 'keyword' },
  { label: '[step.1]', type: 'keyword' },
];
