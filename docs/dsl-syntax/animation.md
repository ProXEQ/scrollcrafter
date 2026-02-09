# The [animation] Section

The `[animation]` section defines how your element animates. It controls properties like opacity, position, scale, and timing.

## Basic Syntax

```ini
[animation]
type: from
from: opacity=0, y=50
duration: 1
ease: power2.out
```

## Properties Reference

### type / method

Defines the animation direction.

| Value | Description |
|-------|-------------|
| `from` | Animate FROM specified values TO current state (default) |
| `to` | Animate TO specified values FROM current state |
| `fromTo` | Animate FROM one set of values TO another |

```ini
[animation]
type: from
from: opacity=0, scale=0.8
```

```ini
[animation]
type: to
to: x=200, rotation=45
```

```ini
[animation]
type: fromTo
from: opacity=0, y=-50
to: opacity=1, y=0
```

### from / to

Comma-separated list of CSS/GSAP properties.

**Transform Properties:**
| Property | Description | Example |
|----------|-------------|---------|
| `x` | Horizontal position | `x=100`, `x=-50%` |
| `y` | Vertical position | `y=50`, `y=100px` |
| `scale` | Uniform scale | `scale=0.5` |
| `scaleX` | Horizontal scale | `scaleX=1.5` |
| `scaleY` | Vertical scale | `scaleY=0` |
| `rotation` | Z-axis rotation (deg) | `rotation=45` |
| `rotationX` | X-axis rotation | `rotationX=90` |
| `rotationY` | Y-axis rotation | `rotationY=180` |
| `skewX` | Horizontal skew | `skewX=10` |
| `skewY` | Vertical skew | `skewY=5` |

**Appearance Properties:**
| Property | Description | Example |
|----------|-------------|---------|
| `opacity` | Transparency (0-1) | `opacity=0` |
| `backgroundColor` | Background color | `backgroundColor=#ff0000` |
| `color` | Text color | `color=#333` |
| `borderRadius` | Border radius | `borderRadius=50%` |

**Advanced:**
| Property | Description | Example |
|----------|-------------|---------|
| `clipPath` | CSS clip-path | `clipPath=inset(0 100% 0 0)` |
| `filter` | CSS filter | `filter=blur(10px)` |

### duration

Animation duration in seconds.

```ini
duration: 0.5    // Half second
duration: 1      // One second
duration: 2.5    // Two and a half seconds
```

### delay

Delay before animation starts (seconds).

```ini
delay: 0.5
```

### ease

GSAP easing function. See [GSAP Easing](https://greensock.com/docs/v3/Eases).

**Common values:**
```ini
ease: none           // Linear
ease: power1.out     // Gentle slowdown
ease: power2.out     // Medium slowdown (recommended)
ease: power3.out     // Strong slowdown
ease: power4.out     // Very strong slowdown
ease: back.out(1.7)  // Slight overshoot
ease: elastic.out    // Bouncy
ease: bounce.out     // Bounce effect
```

**In/Out variants:**
- `.in` - Start slow, end fast
- `.out` - Start fast, end slow (most natural)
- `.inOut` - Slow start and end

### stagger

Delay between multiple elements (when selector matches multiple).

```ini
stagger: 0.1
```

**Advanced stagger:**
```ini
stagger.amount: 1        // Total time across all elements
stagger.from: start      // start, end, center, random
```

### split

Enable SplitText for text animations.

```ini
split: words    // Animate each word
split: chars    // Animate each character  
split: lines    // Animate each line
```

See [SplitText Guide](../advanced/splittext.md) for details.

### repeat / yoyo

Loop animation.

```ini
repeat: -1       // Infinite loop
repeat: 3        // Repeat 3 times
yoyo: true       // Reverse on each repeat
```

## Examples

### Fade In From Below
```ini
[animation]
type: from
from: opacity=0, y=50
duration: 0.8
ease: power2.out
```

### Scale Up With Rotation
```ini
[animation]
type: from
from: scale=0, rotation=-180
duration: 1.2
ease: back.out(1.7)
```

### Slide In From Left
```ini
[animation]
type: from
from: x=-100%, opacity=0
duration: 1
ease: power3.out
```

### Clip Reveal (Wipe Effect)
```ini
[animation]
type: from
from: clipPath=inset(0 100% 0 0)
duration: 1
ease: power2.inOut
```

---

**Next:** [Scroll Trigger →](./scroll.md)
