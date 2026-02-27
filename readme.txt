=== ScrollCrafter Legacy (for Elementor) ===
Contributors: PixelMobs
Donate link: https://buymeacoffee.com/pixelmobs
Tags: elementor, animation, scroll, gsap, scrolltrigger
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 1.2.3
Requires PHP: 8.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Professional GSAP ScrollTrigger animations in Elementor using a powerful, type-safe DSL Editor.

**Note:** This is the **Legacy** version of ScrollCrafter. It is now in maintenance mode, focusing on stability and bug fixes for Elementor and GSAP. New features and the next-generation global motion engine will be available in the upcoming ScrollCrafter.

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

= 1.2.1 =
* Fix: Resolved FOUC (Flash of Unstyled Content) and visibility issues for SplitText animations, especially with scrub.
* New: Native support for popular cache plugins (WP Rocket, LiteSpeed, Autoptimize, etc.) with automatic purging on save.
* New: Added "Clear All Caches" button in the Performance tab.

= 1.2.0 =
* Transition: ScrollCrafter is now fully Open Source! All previous Pro features (Smooth Scroll, Special Condition Tags, Custom Breakpoints) are now available to everyone for free.
* Removal: Completely removed Freemius SDK and all licensing/tracking logic.
* UI: Redesigned Admin panel with consolidated features and new "Client Mode".
* New: Added project support link (BuyMeACoffee).
* Fix: Resolved GSAP/SplitText re-initialization issues and hardened ScrollTrigger pin resilience.

= 1.1.10 =
* New (DSL Editor): Integrated Elementor Global CSS Variables (colors) into autocomplete suggestions.
* New (DSL Editor): Added "Copy to Clipboard" button for quick script export.
* New (DSL Editor UI): Replaced emojis with high-quality Material Design SVG icons.
* Performance: Implemented transient caching for parsed configurations to optimize frontend rendering.
* Performance: Optimized SVG icons with currentColor for seamless theme integration.
* Bugfix: Resolved "fail-safe" stagger visibility issues and prevent FOUC during initialization.
* Bugfix: Hardened ScrollTrigger pin resilience against lazy-loaded images, custom fonts, and bfcache.
* Bugfix: Improved hash navigation handling with clearScrollMemory and deferred initialization.
* Bugfix: Resolved regressions in SplitText animation re-initialization.

= 1.1.9 =
* New: Lenis smooth scroll integration with global and per-page control.
* New: Elementor Page Settings panel for per-page smooth scroll overrides.
* New: Client Mode toggle in Settings to hide developer-facing tabs for clean client handoff.
* New: fastScrollEnd and preventOverlaps properties in [scroll] DSL section.
* New: Comprehensive user documentation (DSL syntax, examples, troubleshooting).
* Bugfix: Prevented pin overlap issues on fast scroll and hash anchor navigation.
* Bugfix: Resolved PHP Fatal Error (Cannot redeclare sc_is_pro()) when activating Pro alongside free plugin.

= 1.1.8 =
* New: Redesigned isolated Preview System bypassing Elementor hooks for reliable playback.
* New: Direct scPreview() API with preview lock mechanism to prevent conflicts.
* New: Loading overlay (gray + spinner) during preview initialization.
* Performance: Implemented lightweight REST validation mode (lint_only) to eliminate Editor lag.
* Performance: Added session-based client-side caching in the DSL Editor.
* Bugfix: SplitText now properly handles breakpoint-specific types (words/chars/lines).
* Bugfix: SplitText type mismatch detection with smart revert and recreation.
* Bugfix: Fixed unknown keys in [animation], [target], and step sections being silently ignored.
* Bugfix: Fixed autocomplete suggestions not appearing after from: and to: fields.
* Validation: Added logic warnings for scrub/toggleActions, pin/scrub, and start/end ordering.
* Security: Removed custom CDN URL input fields to prevent arbitrary script injection.

= 1.1.7 =
* Fix: Standardized editor initialization to resolve "Open Editor" button non-responsiveness (GitHub Issue #1).
* Fix: Implemented internal GSAP synchronization for staggers to prevent lagging elements from appearing early.
* Optimization: Added caching for mathematical expressions in animations.
* Optimization: Implemented granular script enqueuing for GSAP plugins.
* Optimization: Added preload hints for GSAP core for faster first paint.

= 1.1.6 =
*   **New**: Official Freemius integration for licensing and seamless updates.
= 1.2.3 =
*   **Fix**: Resolved "hard/stiff" scroll feeling when Lenis smooth scroll is disabled. Restored native browser scrolling by removing global normalization.
*   **Improvement**: Hardened "Absolute Zero" reload stability without affecting native scroll feel.

= 1.2.2 =
*   **Fix**: Implemented "Absolute Zero" reload stability to prevent pin overlap when refreshing mid-page.
*   **Fix**: Synchronized Lenis smooth scroll with ScrollTrigger refresh cycles to prevent layout corruption.
*   **Fix**: Resolved Chrome-specific pin jitter and element "falling off tracks" during fast scrolling.
*   **Improvement**: Streamlined ScrollTrigger refresh logic for better performance.

= 1.2.1 =
*   **Fix**: Resolved FOUC (Flash of Unstyled Content) and visibility issues for SplitText animations.
*   **New**: Native support for popular cache plugins (WP Rocket, LiteSpeed, etc.) with automatic purging.

= 1.2.0 =
*   **Transition**: ScrollCrafter is now fully Open Source! All previous Pro features are free.
*   **Removal**: Completely removed Freemius SDK and licensing logic.
*   **UI**: Redesigned Admin panel with consolidated features.

= 1.1.10 =
*   **New**: Preview button in Code Editor modal for instant animation preview.
*   **New**: Markers toggle (Ctrl+K) - shows GSAP markers during preview only.
*   **New**: Loading overlay during preview initialization.
*   **Security**: Markers require logged-in WordPress user.
*   **Improvement**: Fixed Ghost Mode visibility.
*   **Fix**: SplitText re-initialization and ScrollTrigger cleanup improvements.

= 1.1.3 =
*   **New**: Automated GitHub release workflow.
*   **Improvement**: Security improvements and code cleanup.

= 1.1.2 =
*   **Fix**: Bug fixes and general code cleanup.

= 1.1.1 =
*   **New**: SplitText support for text animations.
*   **New**: Pro version foundation.

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

= 1.1.4 =
Editor Preview improvements with visual loading feedback and markers toggle. Security enhancement for markers.

= 1.1.0 =
Major performance update. Includes Smart Asset Loading and Defer attributes. Highly recommended update.
