=== ScrollCrafter – Scroll Animations DSL for Elementor ===
Contributors: ProXEQ
Donate link: https://pixelmobs.com/donate
Tags: elementor, animation, scroll, gsap, scrolltrigger, motion
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 1.1.0
Requires PHP: 8.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Professional GSAP ScrollTrigger animations in Elementor using a powerful, type-safe DSL Editor.

== Description ==

**ScrollCrafter** brings the power of code-based motion design to Elementor's visual interface. It introduces a dedicated **DSL (Domain Specific Language)** editor that allows you to script complex GSAP ScrollTrigger animations without writing a single line of raw JavaScript.

Stop struggling with limited visual controls and start crafting production-grade motion.

### 🚀 Key Features

*   **Visual DSL Editor**: Integrated modal with autocomplete, syntax highlighting, and error checking.
*   **Production Optimized**: **Smart Loading** ensures scripts only load on pages where you use them. Zero bloat.
*   **GSAP Power**: Full access to `from`, `to`, `fromTo` tweens and `[timeline]` sequences.
*   **Scroll Magic**: Declarative `[scroll]` config for pinning, scrubbing, snapping, and markers.
*   **Responsive**: Define strict breakpoint overrides (e.g., `[animation @mobile]`).
*   **Safe**: Server-side parsing and validation preventing frontend errors.

### ⚡ Performance

ScrollCrafter 1.1+ is built for speed:
1.  **Conditional Loading**: Assets are not loaded globally.
2.  **Defer**: Scripts are non-blocking.
3.  **Strict Media Queries**: CSS/JS logic is isolated per breakpoint to prevent repaint checking.

== Installation ==

1.  Upload the plugin files to the `/wp-content/plugins/scrollcrafter` directory, or install the plugin through the WordPress Plugins screen directly.
2.  Activate the plugin through the “Plugins” screen in WordPress.
3.  Go to any Elementor page, select a widget, and look for the **ScrollCrafter** section in the Content/Style tab.
4.  Click **Edit DSL** to start animating.

== Frequently Asked Questions ==

= Do I need Elementor Pro? =
No! ScrollCrafter works with both Elementor Free and Pro versions.

= Is GSAP included? =
Yes, the plugin bundles a GPL-compatible version of GSAP Core and ScrollTrigger. You can also configure it to use a CDN or valid custom links for Business Green plugins (like SplitText).

= How do I create a horizontal scroll? =
Use the `[timeline]` mode with a `[scroll]` section set to `scrub: 1` and `pin: true`.
Example DSL:
`[timeline]`
`[scroll] pin: true, scrub: 1, end: +=3000`
`[step.1] selector: .track, to: x=calc(vw - cw)`

== Screenshots ==

1. DSL editor modal attached to the Elementor panel. 
2. Autocomplete for sections, fields and values.
3. Lint markers showing DSL validation errors.

== Changelog ==

= 1.1.0 =
*   **New**: Smart Asset Loading - assets only load on pages where ScrollCrafter is used. 
*   **New**: `defer` attribute added to frontend scripts.
*   **New**: Strict Breakpoint Logic implementation.
*   **New**: Editor Keyboard Shortcuts (ESC, CMD+S).
*   **Improvement**: Enhanced `calc()` syntax support.
*   **Fix**: Resolved element jumping issues with Elementor transitions.

= 1.0.0 =
*   Initial release with DSL Editor and Validation.

== Upgrade Notice ==

= 1.1.0 =
Major performance update. Includes Smart Asset Loading and Defer attributes. Highly recommended update.
