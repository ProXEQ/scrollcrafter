# Smooth Scroll (Pro Feature)

ScrollCrafter Pro includes built-in smooth scrolling powered by [Lenis](https://lenis.darkroom.engineering/), making scroll-linked animations buttery smooth on all devices.

## Why Smooth Scroll?

| Without | With Lenis |
|---------|------------|
| Scroll feels "stepped" on Windows | Smooth inertia-based scrolling |
| `scrub` animations look choppy | Animations flow naturally |
| Mouse wheel = discrete jumps | Mouse wheel = continuous motion |

## Enabling Smooth Scroll

1. Go to **Settings → ScrollCrafter**
2. Find the **"Smooth Scroll (Lenis)"** option
3. Check the checkbox to enable
4. Optionally adjust **Smoothness (lerp)** value

## Settings

### Smoothness (lerp)

| Value | Feel |
|-------|------|
| `0.05` | Very smooth, noticeable lag |
| `0.08-0.12` | Recommended - balanced |
| `0.15-0.2` | Quick response, less smooth |

> [!TIP]
> Start with the default `0.1` and adjust based on your preference.

## JavaScript API

For advanced users, Lenis is exposed globally:

```javascript
// Access the Lenis instance
const lenis = window.ScrollCrafterSmooth.getInstance();

// Programmatic scroll to element
window.ScrollCrafterSmooth.scrollTo('#section-2', {
    offset: -100,
    duration: 1.5
});

// Pause/resume smooth scrolling
window.ScrollCrafterSmooth.pause();
window.ScrollCrafterSmooth.resume();

// Destroy Lenis (useful for SPA transitions)
window.ScrollCrafterSmooth.destroy();
```

## Compatibility

- ✅ Works with all ScrollCrafter animations
- ✅ Integrates with GSAP ScrollTrigger automatically
- ✅ Works with Elementor popups
- ✅ Supports touch devices (optional)

## Performance

Lenis adds minimal overhead (~5KB gzipped). It's recommended for sites where smooth scrolling enhances the user experience, especially those with many scroll-linked animations.

> [!CAUTION]
> Smooth scrolling changes the native scroll behavior. Some users prefer native scrolling. Consider your audience.
