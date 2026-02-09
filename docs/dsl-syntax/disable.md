# The [disable] Section

The `[disable]` section allows you to completely disable animations for specific breakpoints or conditions.

## When to Use

Use `[disable]` when you want to:
- Turn off animations on mobile devices
- Respect user accessibility preferences
- Disable complex animations on slow devices
- Create desktop-only or mobile-only effects

## Syntax

```ini
[disable @mobile]
```

You can disable multiple breakpoints:

```ini
[disable @mobile @tablet]
```

## How It Works

When a breakpoint is disabled:
1. No animation is created for that breakpoint
2. No GSAP scripts are loaded for that breakpoint
3. The element remains in its natural state

## Examples

### Disable on Mobile
```ini
[animation]
from: x=-100, opacity=0
duration: 1

[scroll]
scrub: 1

[disable @mobile]
```

Mobile users will see no animation - the element stays visible and static.

### Disable on Mobile and Tablet
```ini
[animation]
from: scale=0.8, opacity=0
duration: 0.8

[disable @mobile @tablet]
```

Only desktop users will see the animation.

### Disable for Reduced Motion
```ini
[animation]
from: y=100, opacity=0
duration: 1
ease: power3.out

[disable @reduced-motion]
```

Users who have "reduce motion" enabled in their OS settings won't see the animation.

## Available Tags

### Breakpoint Tags
These depend on your ScrollCrafter settings. Default:

| Tag | Description |
|-----|-------------|
| `@mobile` | Mobile devices (default: up to 767px) |
| `@tablet` | Tablet devices (default: 768px - 1024px) |

Custom breakpoints defined in **Settings → ScrollCrafter** are also available.

### Special Tags

| Tag | Description |
|-----|-------------|
| `@reduced-motion` | Users with prefers-reduced-motion enabled |

## Combining with Responsive Overrides

You can use both `[disable]` and responsive overrides together:

```ini
// Desktop animation
[animation]
from: x=-200, rotation=-45
duration: 1.5

// Simpler tablet animation
[animation @tablet]
from: x=-100
duration: 1

// No animation on mobile
[disable @mobile]
```

## Best Practices

1. **Consider performance**: Disable heavy animations on mobile
2. **Respect accessibility**: Always consider `@reduced-motion`
3. **Test thoroughly**: Check all breakpoints during preview

---

**Next:** [Breakpoints →](../responsive/breakpoints.md)
