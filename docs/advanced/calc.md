# Calc Expressions

ScrollCrafter supports dynamic `calc()` expressions for values that depend on element or viewport dimensions.

## Basic Syntax

```ini
[animation]
type: to
to: x=calc(100vw - 50%)
```

## Available Variables

| Variable | Description |
|----------|-------------|
| `vw` | Viewport width (100vw = full width) |
| `vh` | Viewport height (100vh = full height) |
| `sw` | Scroll container width |
| `cw` | Container/element width |
| `ch` | Container/element height |
| `center` | Horizontal center position |
| `vcenter` | Vertical center position |
| `end` | End position (width - container) |

## Operators

Standard math operators are supported:
- `+` Addition
- `-` Subtraction
- `*` Multiplication
- `/` Division
- `()` Parentheses for grouping

## Common Patterns

### Move to Viewport Edge
```ini
to: x=calc(100vw - cw)    // Move to right edge
to: x=calc(-100vw + cw)   // Move to left edge
to: y=calc(100vh - ch)    // Move to bottom
```

### Center Element
```ini
to: x=calc(50vw - cw / 2)  // Horizontal center
to: y=calc(50vh - ch / 2)  // Vertical center
```

### Horizontal Scroll
```ini
to: x=calc(vw - cw)        // Full horizontal scroll
to: x=calc(vw - sw)        // Scroll within container
```

## Examples

### Full-Width Horizontal Scroll
```ini
[timeline]

[scroll]
pin: true
scrub: 1
end: +=3000

[step.1]
selector: .horizontal-container
type: to
to: x=calc(vw - cw)
```

### Slide to Screen Edge
```ini
[animation]
type: to
to: x=calc(100vw)
duration: 1

[scroll]
scrub: 1
```

### Centered Popup Effect
```ini
[animation]
type: from
from: x=calc(50vw - cw / 2), y=calc(50vh - ch / 2), scale=0
```

### Parallax with Offset
```ini
[animation]
type: to
to: y=calc(vh * 0.5)

[scroll]
scrub: 1
```

## Security

For security, only the following are allowed in calc expressions:
- Numbers (including decimals)
- Mathematical operators: `+`, `-`, `*`, `/`
- Parentheses: `()`, `[]`
- Approved variables: `vw`, `vh`, `sw`, `cw`, `ch`, `center`, `vcenter`, `end`

Using other characters or expressions will result in a validation error.

## Troubleshooting

### "Unsafe characters in calc()"

Your expression contains characters that aren't allowed. Check for:
- Function calls like `min()`, `max()`
- CSS units like `px`, `%` (use raw numbers)
- Variable names not in the approved list

### Animation Not Moving

Make sure you have `scrub: true` when using calc for scroll-linked animations:

```ini
[scroll]
scrub: 1    // Required for continuous scroll animation
```

### Element Jumps

Try using `ease: none` for scrubbed calc animations:

```ini
[animation]
to: x=calc(vw - cw)
ease: none    // Smoother for scrubbing

[scroll]
scrub: 1
```

---

**Next:** [SplitText →](./splittext.md)
