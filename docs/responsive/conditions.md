# Multi-Tag Conditions

ScrollCrafter supports advanced conditions that combine multiple breakpoints or special tags.

> **Note:** Some conditions require ScrollCrafter Pro.

## OR Conditions

Apply animation when ANY of the conditions match:

```ini
[animation @mobile @tablet]
from: y=50, opacity=0
```

This is equivalent to: "on mobile OR tablet, use this animation"

## AND Conditions (Pro)

Apply animation when ALL conditions match:

```ini
[animation @mobile+@dark]
from: opacity=0
```

This means: "on mobile AND when dark mode is preferred"

**Syntax:** Use `+` to combine tags: `@tag1+@tag2`

## Special Tags

| Tag | Description | Availability |
|-----|-------------|--------------|
| `@reduced-motion` | User prefers reduced motion | Free |
| `@dark` | User prefers dark color scheme | Pro |
| `@retina` | High DPI display | Pro |
| `@no-hover` | Touch device (no hover) | Pro |

## Priority

When multiple conditions match, ScrollCrafter uses this priority:

1. **`@reduced-motion`** (highest - accessibility)
2. **AND conditions** (`@mobile+@dark`)
3. **OR conditions** (`@mobile @tablet`)
4. **Single breakpoint** (`@mobile`)
5. **Base config** (no tag)

## Examples

### Reduced Motion Override
```ini
[animation]
from: y=100, rotationX=45
duration: 1.5

[animation @reduced-motion]
from: opacity=0
duration: 0.3
```

Users with "reduce motion" enabled get a simple fade instead.

### Dark Mode Variations (Pro)
```ini
[animation]
from: opacity=0, y=30
// Default light mode animation

[animation @dark]
from: opacity=0, scale=1.1
// Different effect for dark mode users
```

### Mobile Dark Mode (Pro)
```ini
[animation @mobile+@dark]
from: opacity=0
duration: 0.2
// Minimal animation for mobile dark mode
```

### Touch Device Handling (Pro)
```ini
[animation]
from: scale=0.9, opacity=0
// Hover-based scaling for desktop

[animation @no-hover]
from: y=20, opacity=0
// Fallback for touch devices
```

## Feature Detection

ScrollCrafter uses CSS media queries for detection:

| Tag | Media Query |
|-----|-------------|
| `@reduced-motion` | `(prefers-reduced-motion: reduce)` |
| `@dark` | `(prefers-color-scheme: dark)` |
| `@retina` | `(-webkit-min-device-pixel-ratio: 2)` |
| `@no-hover` | `(hover: none)` |

---

**Next:** [Accessibility →](./accessibility.md)
