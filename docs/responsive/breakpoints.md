# Responsive Breakpoints

ScrollCrafter supports responsive animations that change based on screen size. You can define different animation properties for each breakpoint.

## Basic Syntax

Add `@breakpoint` to any section to override it for that screen size:

```ini
[animation]
from: x=-200, opacity=0
duration: 1

[animation @mobile]
from: y=50, opacity=0
duration: 0.5
```

## Default Breakpoints

| Breakpoint | Max Width | Description |
|------------|-----------|-------------|
| `@mobile` | 767px | Phones |
| `@tablet` | 1024px | Tablets |
| (none) | 1025px+ | Desktop (default) |

## Custom Breakpoints

You can define custom breakpoints in **Settings → ScrollCrafter → Breakpoints**.

Format:
```
mobile: 767
tablet: 1024
laptop: 1440
```

Then use them:
```ini
[animation @laptop]
from: x=-300
```

## How Breakpoints Work

ScrollCrafter uses **strict ranges** to prevent overlapping:

| Breakpoint | Range |
|------------|-------|
| mobile | 0 - 767px |
| tablet | 768px - 1024px |
| desktop | 1025px+ |

This means:
- At 767px → `@mobile` applies
- At 768px → `@tablet` applies
- At 1025px → default (desktop) applies

## Responsive Overrides

### Animation Properties
```ini
[animation]
from: x=-200, scale=0.8
duration: 1.5
ease: power3.out

[animation @tablet]
from: x=-100
duration: 1

[animation @mobile]
from: y=50, opacity=0
duration: 0.5
ease: power2.out
```

### Scroll Properties
```ini
[scroll]
start: top 60%
end: bottom 40%
scrub: 1
pin: true

[scroll @mobile]
start: top 80%
end: bottom 20%
pin: false
scrub: false
```

### Timeline Steps
```ini
[step.1]
selector: .box
from: x=-200, rotation=-45

[step.1 @mobile]
from: y=30, opacity=0
```

## Partial Overrides

You only need to specify properties you want to change. Other properties are inherited from the base config:

```ini
[animation]
from: x=-200, opacity=0
duration: 1
ease: power2.out

[animation @mobile]
from: y=50         // Only changes 'from', keeps duration and ease
```

## Complete Example

```ini
// Desktop: Complex horizontal slide
[animation]
from: x=-100%, rotation=-10, opacity=0
duration: 1.2
ease: power3.out

[scroll]
scrub: 1
pin: true
end: +=1500

// Tablet: Simpler animation
[animation @tablet]
from: x=-50%, opacity=0
duration: 1

[scroll @tablet]
end: +=800

// Mobile: Basic fade
[animation @mobile]
from: y=30, opacity=0
duration: 0.6

[scroll @mobile]
pin: false
scrub: false
start: top 85%
```

## Tips

1. **Start with desktop**: Design your desktop animation first
2. **Simplify for mobile**: Reduce complexity on smaller screens
3. **Test in preview**: Use Elementor's responsive mode to test each breakpoint
4. **Performance matters**: Consider disabling heavy animations on mobile with `[disable @mobile]`

---

**Next:** [Conditions →](./conditions.md)
