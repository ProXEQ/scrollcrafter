# Example: Fade In on Scroll

A simple, elegant fade-in animation when an element enters the viewport.

## The Code

```ini
[animation]
type: from
from: opacity=0, y=40
duration: 0.8
ease: power2.out

[scroll]
start: top 85%
toggleActions: play none none reverse
```

## What It Does

1. Element starts invisible (`opacity=0`) and 40px below its position (`y=40`)
2. When the element's top crosses 85% of the viewport, it fades in and slides up
3. When scrolling back up past the trigger, it reverses

## Variations

### Faster Fade (Subtle)
```ini
[animation]
from: opacity=0, y=20
duration: 0.5
ease: power1.out
```

### Slower Fade (Dramatic)
```ini
[animation]
from: opacity=0, y=80
duration: 1.2
ease: power3.out
```

### Fade Without Movement
```ini
[animation]
from: opacity=0
duration: 0.6
```

### Fade From Side
```ini
[animation]
from: opacity=0, x=-50
duration: 0.8
ease: power2.out
```

### Fade With Scale
```ini
[animation]
from: opacity=0, scale=0.9
duration: 0.8
ease: power2.out
```

## With Stagger (Multiple Items)

When targeting multiple elements (like cards in a grid):

```ini
[target]
selector: .card

[animation]
from: opacity=0, y=30
stagger: 0.1
duration: 0.6
ease: power2.out

[scroll]
start: top 85%
```

## Responsive Version

```ini
[animation]
from: opacity=0, y=50
duration: 0.8

[animation @mobile]
from: opacity=0, y=30
duration: 0.5

[scroll]
start: top 85%

[scroll @mobile]
start: top 90%
```

## Play Once (No Reverse)

```ini
[scroll]
start: top 85%
once: true
```

---

**Next:** [Horizontal Scroll →](./horizontal-scroll.md)
