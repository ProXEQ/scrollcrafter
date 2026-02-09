# The [target] Section

The `[target]` section allows you to animate elements other than the widget itself.

## When to Use

By default, ScrollCrafter animates the Elementor widget you're editing. Use `[target]` when you want to:
- Animate child elements within the widget
- Animate elements with a specific class
- Animate multiple elements with stagger

## Basic Syntax

```ini
[target]
selector: .my-element

[animation]
from: opacity=0, y=50
```

## Properties

### selector

CSS selector for the element(s) to animate.

```ini
[target]
selector: .my-custom-class
```

**Examples:**
```ini
selector: .card           // Elements with class "card"
selector: #hero-title     // Element with ID "hero-title"
selector: h2              // All h2 elements
selector: .item:first-child   // First .item element
```

## Combining with Scroll Trigger

You can use `trigger` in `[scroll]` to separate which element triggers the animation from which element gets animated:

```ini
[target]
selector: .floating-image     // This gets animated

[scroll]
trigger: .content-section     // This triggers the animation
start: top center
```

## Examples

### Animate Child Elements
```ini
[target]
selector: .card-image

[animation]
from: scale=1.2, opacity=0
duration: 0.8
```

### Stagger Multiple Items
```ini
[target]
selector: .list-item

[animation]
from: opacity=0, x=-30
stagger: 0.1
duration: 0.6
```

### Animate Heading Text
```ini
[target]
selector: h2

[animation]
split: words
from: opacity=0, y=20
stagger.amount: 0.8
```

### Trigger and Target Different Elements
```ini
[target]
selector: .reveal-content

[scroll]
trigger: .trigger-zone
start: top 70%
end: bottom 30%
scrub: 1

[animation]
from: clipPath=inset(0 100% 0 0)
```

---

**Next:** [Disable →](./disable.md)
