# ScrollCrafter – Scroll Animations DSL for Elementor

ScrollCrafter adds a dedicated DSL editor to Elementor that lets you define advanced scroll-based animations powered by GSAP and ScrollTrigger using a readable, text-based syntax. 

## Features

- Visual DSL editor modal integrated into Elementor panel for any widget, section or container. 
- CodeMirror 6–based editor with syntax highlighting, autocomplete for sections/fields/values and inline linting. 
- Declarative scroll configuration mapped to GSAP ScrollTrigger (start, end, scrub, once, snap, markers, pin, etc.). 
- Timeline + step support for more complex animation sequences. 
- Server-side validation endpoint to catch DSL errors before they hit the front-end. 
- Designed to be safe for production – no direct eval of user code, DSL is parsed and translated to config. 

## Why ScrollCrafter?

Hand-writing ScrollTrigger configs in JavaScript inside Elementor can get messy and error-prone.   
ScrollCrafter gives you a compact DSL with editor ergonomics similar to an IDE: autocomplete, docs hints, and validation, while still generating plain GSAP configs under the hood. 

## Requirements

- WordPress: `X.Y` or higher (fill in actual minimum). 
- PHP: `8.1` or higher (fill in actual minimum). 
- Elementor: `X.Y` or higher (fill in actual minimum). 
- GSAP + ScrollTrigger loaded on the front-end (either by the theme or a performance plugin). 

## Installation

1. Download the plugin ZIP or clone this repository into `wp-content/plugins/scrollcrafter`. 
2. Activate “ScrollCrafter” from the WordPress → Plugins screen. 
3. Make sure GSAP and ScrollTrigger are enqueued on the front-end of your site. 
4. Open any Elementor page, select an element and use the ScrollCrafter control to open the DSL editor. 

## Basic Usage

1. Open the ScrollCrafter DSL editor from the Elementor panel for a selected element. 
2. Start by defining a target and animation section: 


4. Use `/` inside a section to get autocomplete for the next available fields; type values and let inline validation highlight any issues. 

## DSL Overview

### Sections

- `[target]` – selects which element(s) will be animated using a CSS selector. 
- `[animation]` – describes a single tween (from/to/fromTo, duration, delay, ease, stagger). 
- `[scroll]` – maps animation to ScrollTrigger options (start, end, scrub, once, pin, markers, snap, etc.). 
- `[timeline]` – defines default timeline options and acts as a container for `step.*` sections. 
- `[step.N]` – individual steps in a timeline, using the same fields as `[animation]`. 

### Scroll fields (mapped to ScrollTrigger)

- `start:` – when the animation should start relative to viewport (e.g. `top 80%`). 
- `end:` – when the animation should end (e.g. `bottom 20%`). 
- `scrub:` – syncs animation progress with scroll (boolean or number for smoothing). 
- `once:` – whether the animation should only run once. 
- `pin:` / `pinSpacing:` – pin the element while the trigger is active. 
- `markers:` – enable debug markers. 
- `snap:` – snap scroll to positions (e.g. `0.1` or special modes). 

### Animation fields (mapped to GSAP tween)

- `type:` – `from`, `to` or `fromTo`. 
- `from:` / `to:` – comma-separated property list, e.g. `y=50, opacity=0`. 
- `duration:` – tween duration in seconds. 
- `delay:` – start delay in seconds. 
- `ease:` – any GSAP ease name (e.g. `power2.out`, `back.out`). 
- `stagger:` – delay between items when target matches multiple elements. 

## Validation & Linting

All scripts are POSTed to the `/scrollcrafter/v1/validate` REST endpoint, which parses the DSL, builds the GSAP/ScrollTrigger configs and returns any errors or warnings.   
The CodeMirror editor consumes this response to show inline lint markers and error messages while you type. 

## Roadmap

- Hover tooltips with inline GSAP documentation for each field.
- More built‑in value presets (e.g. advanced `snap` and `toggleActions` templates). 
- Export/import of DSL snippets and reusable presets per site. 

## Contributing

1. Fork the repository and create a feature branch.
2. Run the development environment (fill in steps: `npm install`, `npm run build`, etc.). 
3. Submit a pull request with a clear description and screenshots where appropriate. 

## License

ScrollCrafter is released under the GPL‑2.0+ license, the same as WordPress itself. 


