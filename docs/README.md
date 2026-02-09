# ScrollCrafter Documentation

Welcome to the ScrollCrafter documentation! This guide will help you master scroll animations in Elementor using our powerful DSL (Domain Specific Language).

## 📚 Table of Contents

### Getting Started
- [Quick Start Guide](./getting-started.md) - Your first animation in 5 minutes

### DSL Syntax Reference
- [Animation](./dsl-syntax/animation.md) - The `[animation]` section
- [Scroll Trigger](./dsl-syntax/scroll.md) - The `[scroll]` section
- [Timeline](./dsl-syntax/timeline.md) - Multi-step animations with `[timeline]` and `[step.N]`
- [Target](./dsl-syntax/target.md) - The `[target]` section
- [Disable](./dsl-syntax/disable.md) - Disabling animations per breakpoint

### Responsive Design
- [Breakpoints](./responsive/breakpoints.md) - Using `@mobile`, `@tablet`, etc.
- [Conditions](./responsive/conditions.md) - Multi-tag conditions (OR, AND)
- [Accessibility](./responsive/accessibility.md) - `@reduced-motion` support

### Advanced Topics
- [Calc Expressions](./advanced/calc.md) - Dynamic values with `calc()`
- [SplitText](./advanced/splittext.md) - Text reveal animations
- [Timeline Steps](./advanced/timeline-steps.md) - Complex sequenced animations

### Examples
- [Fade In on Scroll](./examples/fade-in.md)
- [Horizontal Scroll](./examples/horizontal-scroll.md)
- [Text Reveal](./examples/text-reveal.md)
- [Parallax Effect](./examples/parallax.md)

### Troubleshooting
- [Common Issues & FAQ](./troubleshooting.md)

---

## Quick Example

```ini
[animation]
type: from
from: opacity=0, y=50
duration: 1
ease: power2.out

[scroll]
start: top 80%
end: bottom 20%
```

This creates a simple fade-in animation that triggers when the element enters the viewport.

---

## Need Help?

- 🐛 [Report a Bug](https://github.com/ProXEQ/scrollcrafter/issues)
- 💬 [Discussions](https://github.com/ProXEQ/scrollcrafter/discussions)
