# Example: Horizontal Scroll

Create a horizontal scrolling section where content moves sideways as the user scrolls vertically.

## Basic Horizontal Scroll

```ini
[timeline]
timeline.defaults.ease: none

[scroll]
pin: true
scrub: 1
start: top top
end: +=3000

[step.1]
selector: .horizontal-container
type: to
to: x=calc(vw - cw)
```

## HTML/CSS Structure

For this to work, you need:

```html
<div class="horizontal-wrapper">
  <div class="horizontal-container">
    <div class="panel">Panel 1</div>
    <div class="panel">Panel 2</div>
    <div class="panel">Panel 3</div>
  </div>
</div>
```

```css
.horizontal-wrapper {
  overflow: hidden;
}

.horizontal-container {
  display: flex;
  width: fit-content;
}

.panel {
  width: 100vw;
  height: 100vh;
  flex-shrink: 0;
}
```

## How It Works

1. **`pin: true`** - Pins the section while scrolling
2. **`end: +=3000`** - Creates 3000px of scroll distance
3. **`x=calc(vw - cw)`** - Moves container from start to end

The `calc(vw - cw)` expression calculates how far to move:
- `vw` = viewport width
- `cw` = container width
- Result = negative distance to scroll the entire container

## With Panel Animations

Add individual panel animations:

```ini
[timeline]
timeline.defaults.ease: none

[scroll]
pin: true
scrub: 1
end: +=4000

[step.1]
selector: .horizontal-container
type: to
to: x=calc(vw - cw)

[step.2]
selector: .panel:nth-child(1) h2
from: opacity=0, y=50
position: 0          // Start at timeline beginning

[step.3]
selector: .panel:nth-child(2) h2
from: opacity=0, x=-50
position: 0.33       // At 33% through scroll

[step.4]
selector: .panel:nth-child(3) h2
from: opacity=0, scale=0.8
position: 0.66       // At 66% through scroll
```

## Responsive Horizontal Scroll

Disable on mobile where horizontal scroll doesn't work well:

```ini
[timeline]
timeline.defaults.ease: none

[scroll]
pin: true
scrub: 1
end: +=3000

[step.1]
selector: .horizontal-container
type: to
to: x=calc(vw - cw)

// Disable entire effect on mobile
[disable @mobile]
```

Alternatively, use shorter scroll distance on tablet:

```ini
[scroll @tablet]
end: +=1500
```

## Snap Points

Add snapping to each panel:

```ini
[scroll]
pin: true
scrub: 1
end: +=3000
snap: 0.33    // Snap every 33% (3 panels)
```

## Tips

1. **Smooth scrolling**: Use `scrub: 1` or higher for smoother movement
2. **Scroll distance**: Make `end` roughly `panel_width * (num_panels - 1)`
3. **Performance**: Keep panel count reasonable (3-5 panels)
4. **Mobile**: Consider mobile alternatives or disable

## Common Issues

### Content Jumps When Pinning Ends

Add transition override in CSS:
```css
.horizontal-wrapper {
  transition: none !important;
}
```

### Scroll Distance Doesn't Feel Right

Adjust the `end: +=XXXX` value. Larger = slower scroll, smaller = faster.

---

**Next:** [Text Reveal →](./text-reveal.md)
