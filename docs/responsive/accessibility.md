# Accessibility (A11Y)

ScrollCrafter includes built-in support for accessible animations, respecting user preferences and WCAG guidelines.

## Reduced Motion Support

The `@reduced-motion` tag detects users who have enabled "Reduce Motion" in their operating system settings.

### Using @reduced-motion

```ini
[animation]
from: y=100, rotationX=45, scale=0.8
duration: 1.5
ease: elastic.out

[animation @reduced-motion]
from: opacity=0
duration: 0.3
ease: power1.out
```

### Or Disable Completely

```ini
[animation]
from: x=-200, rotation=-45
duration: 1

[disable @reduced-motion]
```

## Best Practices

### 1. Provide Simpler Alternatives

Instead of complex transforms, use simple fades:

**❌ Problematic for some users:**
```ini
[animation]
from: rotationX=90, scale=0
duration: 2
```

**✅ Better with fallback:**
```ini
[animation]
from: rotationX=90, scale=0
duration: 2

[animation @reduced-motion]
from: opacity=0
duration: 0.3
```

### 2. Reduce Duration

Keep animations under 0.5s for reduced motion:

```ini
[animation @reduced-motion]
from: opacity=0
duration: 0.3      // Short and subtle
```

ScrollCrafter will warn you if `@reduced-motion` animations exceed 0.5s.

### 3. Avoid Certain Properties

For `@reduced-motion`, avoid:
- `rotation`, `rotationX`, `rotationY`
- `scale` (dramatic changes)
- `skewX`, `skewY`
- Elastic/bounce easing

**Safe properties:**
- `opacity`
- Small `x`/`y` movements (< 20px)
- `backgroundColor`, `color`

### 4. No Flashing

Never create flashing effects. WCAG requires no more than 3 flashes per second.

## Automatic Validation

ScrollCrafter provides warnings when your `@reduced-motion` animation may not follow best practices:

- ⚠️ Duration > 0.5s
- ⚠️ Using rotation, scale, or skew properties
- ⚠️ Using elastic or bounce easing

## Testing

### In Browser

1. **Chrome/Edge:** DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion`
2. **Firefox:** about:config → `ui.prefersReducedMotion` → 1
3. **Safari:** System Preferences → Accessibility → Display → Reduce Motion

### In macOS

System Preferences → Accessibility → Display → Reduce Motion

### In Windows

Settings → Ease of Access → Display → Show animations in Windows

### In iOS

Settings → Accessibility → Motion → Reduce Motion

## Resources

- [WCAG 2.1 - Motion Animation](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [prefers-reduced-motion MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [A11Y Project - Reduced Motion](https://www.a11yproject.com/posts/understanding-vestibular-disorders/)

---

**Next:** [Calc Expressions →](../advanced/calc.md)
