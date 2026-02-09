# The [scroll] Section

The `[scroll]` section connects your animation to scroll position using GSAP ScrollTrigger.

## Basic Syntax

```ini
[scroll]
start: top 80%
end: bottom 20%
scrub: true
```

## Properties Reference

### start

When the animation should start. Format: `[element position] [viewport position]`

```ini
start: top 80%      // Element's top hits 80% of viewport
start: top center   // Element's top hits center of viewport
start: center center // Element's center hits center of viewport
start: top top      // Element's top hits top of viewport
```

**Element positions:** `top`, `center`, `bottom`
**Viewport positions:** `top`, `center`, `bottom`, or percentage (`80%`)

### end

When the animation should end.

```ini
end: bottom 20%     // Element's bottom hits 20% of viewport
end: bottom top     // Element's bottom hits top of viewport
end: +=500          // 500px after start point
end: +=100%         // 100% of element height after start
```

### scrub

Link animation progress directly to scroll position.

| Value | Description |
|-------|-------------|
| `true` | Instant scrubbing |
| `1` | 1 second smoothing (recommended) |
| `0.5` | Half second smoothing |
| `false` | No scrubbing (plays once) |

```ini
scrub: 1    // Smooth scrubbing with 1s lag
```

> **Tip:** Use `scrub: 1` or higher for smoother animations.

### pin

Pin the element while scrolling through the animation.

```ini
pin: true
```

Use with `scrub` for horizontal scroll and parallax effects:

```ini
[scroll]
pin: true
scrub: 1
end: +=2000    // 2000px of scroll while pinned
```

### pinSpacing

Control spacing added when pinning.

```ini
pinSpacing: true     // Add space (default)
pinSpacing: false    // Don't add space (element overlaps next)
```

### markers

Show debug markers (only visible to logged-in WordPress users).

```ini
markers: true
```

Or use `Ctrl+K` in the editor to toggle markers during preview.

### toggleActions

Control animation behavior at different scroll states (only when NOT using `scrub`).

Format: `onEnter onLeave onEnterBack onLeaveBack`

```ini
toggleActions: play none none reverse
```

**Available actions:**
| Action | Description |
|--------|-------------|
| `play` | Play forward |
| `pause` | Pause |
| `resume` | Resume from paused state |
| `reverse` | Play backward |
| `restart` | Restart from beginning |
| `reset` | Reset to start state |
| `complete` | Jump to end state |
| `none` | Do nothing |

**Common patterns:**
```ini
toggleActions: play none none reverse    // Default - reverses on scroll up
toggleActions: play none none none       // Play once, never reverse
toggleActions: restart none none reverse // Restart each time
```

### once

Only trigger animation once (don't reverse on scroll up).

```ini
once: true
```

### trigger

Use a different element as the scroll trigger.

```ini
[scroll]
trigger: .my-section    // CSS selector
start: top center
```

### snap

Snap to specific progress points.

```ini
snap: 0.5              // Snap every 50%
snap: 0.25             // Snap every 25%
```

### anticipatePin

Pre-offset pinning to prevent jumping (in pixels).

```ini
anticipatePin: 1       // Usually 1 is enough
```

## Examples

### Basic Scroll-Triggered Fade
```ini
[animation]
from: opacity=0, y=30
duration: 0.8

[scroll]
start: top 85%
toggleActions: play none none reverse
```

### Scrubbed Progress Animation
```ini
[animation]
from: x=-100%
duration: 1

[scroll]
start: top bottom
end: top center
scrub: 1
```

### Pinned Section
```ini
[animation]
type: to
to: x=-200%

[scroll]
pin: true
scrub: 1
start: top top
end: +=3000
```

### Using External Trigger
```ini
[target]
selector: .animated-element

[scroll]
trigger: .section-wrapper
start: top center
end: bottom center
scrub: 1
```

---

**Next:** [Timeline →](./timeline.md)
