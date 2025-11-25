# ScrollCrafter – Scroll Animations DSL for Elementor

ScrollCrafter adds a dedicated DSL editor to Elementor that lets you define advanced scroll-based animations powered by GSAP and ScrollTrigger using a readable, text-based syntax. [web:366][web:189]

## Features

- Visual DSL editor modal integrated into Elementor panel for any widget, section or container. [web:366]
- CodeMirror 6–based editor with syntax highlighting, autocomplete for sections/fields/values and inline linting. [web:189]
- Declarative scroll configuration mapped to GSAP ScrollTrigger (start, end, scrub, once, snap, markers, pin, etc.). [web:366]
- Timeline + step support for more complex animation sequences. [web:366]
- Server-side validation endpoint to catch DSL errors before they hit the front-end. [web:387]
- Designed to be safe for production – no direct eval of user code, DSL is parsed and translated to config. [web:382]

## Why ScrollCrafter?

Hand-writing ScrollTrigger configs in JavaScript inside Elementor can get messy and error-prone. [web:424]  
ScrollCrafter gives you a compact DSL with editor ergonomics similar to an IDE: autocomplete, docs hints, and validation, while still generating plain GSAP configs under the hood. [web:424][web:189]

## Requirements

- WordPress: `X.Y` or higher (fill in actual minimum). [web:414]
- PHP: `8.1` or higher (fill in actual minimum). [web:414]
- Elementor: `X.Y` or higher (fill in actual minimum). [web:414]
- GSAP + ScrollTrigger loaded on the front-end (either by the theme or a performance plugin). [web:366]

## Installation

1. Download the plugin ZIP or clone this repository into `wp-content/plugins/scrollcrafter`. [web:412]
2. Activate “ScrollCrafter” from the WordPress → Plugins screen. [web:412]
3. Make sure GSAP and ScrollTrigger are enqueued on the front-end of your site. [web:366]
4. Open any Elementor page, select an element and use the ScrollCrafter control to open the DSL editor. [web:366]

## Basic Usage

1. Open the ScrollCrafter DSL editor from the Elementor panel for a selected element. [web:366]
2. Start by defining a target and animation section: [web:410]


4. Use `/` inside a section to get autocomplete for the next available fields; type values and let inline validation highlight any issues. [web:189]

## DSL Overview

### Sections

- `[target]` – selects which element(s) will be animated using a CSS selector. [web:366]
- `[animation]` – describes a single tween (from/to/fromTo, duration, delay, ease, stagger). [web:366]
- `[scroll]` – maps animation to ScrollTrigger options (start, end, scrub, once, pin, markers, snap, etc.). [web:366]
- `[timeline]` – defines default timeline options and acts as a container for `step.*` sections. [web:366]
- `[step.N]` – individual steps in a timeline, using the same fields as `[animation]`. [web:366]

### Scroll fields (mapped to ScrollTrigger)

- `start:` – when the animation should start relative to viewport (e.g. `top 80%`). [web:366]
- `end:` – when the animation should end (e.g. `bottom 20%`). [web:366]
- `scrub:` – syncs animation progress with scroll (boolean or number for smoothing). [web:366]
- `once:` – whether the animation should only run once. [web:366]
- `pin:` / `pinSpacing:` – pin the element while the trigger is active. [web:366]
- `markers:` – enable debug markers. [web:366]
- `snap:` – snap scroll to positions (e.g. `0.1` or special modes). [web:366]

### Animation fields (mapped to GSAP tween)

- `type:` – `from`, `to` or `fromTo`. [web:366]
- `from:` / `to:` – comma-separated property list, e.g. `y=50, opacity=0`. [web:366]
- `duration:` – tween duration in seconds. [web:366]
- `delay:` – start delay in seconds. [web:366]
- `ease:` – any GSAP ease name (e.g. `power2.out`, `back.out`). [web:366]
- `stagger:` – delay between items when target matches multiple elements. [web:366]

## Validation & Linting

All scripts are POSTed to the `/scrollcrafter/v1/validate` REST endpoint, which parses the DSL, builds the GSAP/ScrollTrigger configs and returns any errors or warnings. [web:387]  
The CodeMirror editor consumes this response to show inline lint markers and error messages while you type. [web:188][web:189]

## Roadmap

- Hover tooltips with inline GSAP documentation for each field. [web:356]
- More built‑in value presets (e.g. advanced `snap` and `toggleActions` templates). [web:366]
- Export/import of DSL snippets and reusable presets per site. [web:424]

## Contributing

1. Fork the repository and create a feature branch. [web:418]
2. Run the development environment (fill in steps: `npm install`, `npm run build`, etc.). [web:415]
3. Submit a pull request with a clear description and screenshots where appropriate. [web:424]

## License

ScrollCrafter is released under the GPL‑2.0+ license, the same as WordPress itself. [web:412][web:414]


