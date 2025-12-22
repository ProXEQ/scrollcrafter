=== ScrollCrafter – Scroll Animations DSL for Elementor ===
Contributors: ProXEQ
Donate link: https://pixelmobs.com/donate
Tags: elementor, animation, scroll, gsap, scrolltrigger
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 8.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A DSL-based scroll animation editor for Elementor powered by GSAP and ScrollTrigger.

== Description ==

ScrollCrafter adds a dedicated DSL editor to Elementor that lets you describe complex scroll-based animations in a compact, readable syntax.   
Under the hood, the plugin converts your script into GSAP and ScrollTrigger configuration, so you get full control without writing JavaScript. [web:424]

**Key features** 

* Elementor-integrated modal editor for any widget, section, or container.
* CodeMirror 6 editor with syntax highlighting, autocomplete and inline linting.
* Declarative scroll configuration mapped to ScrollTrigger options (start, end, scrub, once, snap, markers, pin, etc.).
* Timeline mode with `[timeline]` and `[step.N]` sections for advanced sequences.
* Server-side REST validation to catch DSL errors before they hit the front-end.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/scrollcrafter` directory, or install the plugin through the WordPress Plugins screen directly.
2. Activate the plugin through the “Plugins” screen in WordPress.
3. Ensure GSAP and ScrollTrigger are loaded on the front-end (via your theme or another plugin).
4. Edit a page with Elementor, select an element and open the ScrollCrafter DSL editor control.

== Frequently Asked Questions ==

= Do I need to include GSAP myself? =

Yes. ScrollCrafter expects GSAP and the ScrollTrigger plugin to be available on the front-end; it only generates configuration for them. 

= Does this work without Elementor? =

Currently ScrollCrafter integrates with the Elementor editor and requires Elementor to be active. 

= Can I use my own selectors? =

Yes. Use the `[target]` section with a `selector:` field to point the DSL to any valid CSS selector. 

== Screenshots ==

1. DSL editor modal attached to the Elementor panel. 
2. Autocomplete for sections, fields and values. [web:189]
3. Lint markers showing DSL validation errors. [web:188]

== Changelog ==

= 1.0.0 =
* Initial public release with Elementor integration, DSL editor, autocomplete and validation. 

== Upgrade Notice ==

= 1.0.0 =
First public release of ScrollCrafter. Install if you want a DSL-based way to define GSAP ScrollTrigger animations in Elementor. 
