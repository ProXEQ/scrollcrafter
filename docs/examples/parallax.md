# Example: Parallax Effect

Create depth and dimension with parallax scrolling effects.

## Basic Parallax

Move element slower than scroll (creates depth):

```ini
[animation]
type: to
to: y=-100

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

Elements with different `y` values create layered depth.

## Layered Parallax

### Background Layer (Slowest)
```ini
[target]
selector: .parallax-bg

[animation]
type: to
to: y=-50

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

### Middle Layer
```ini
[target]
selector: .parallax-mid

[animation]
type: to
to: y=-100

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

### Foreground Layer (Fastest)
```ini
[target]
selector: .parallax-fg

[animation]
type: to
to: y=-200

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

## Image Reveal Parallax

Image moves up within its container, creating a reveal effect:

```ini
[animation]
type: to
to: y=-20%

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

CSS for container:
```css
.parallax-container {
  overflow: hidden;
}

.parallax-image {
  transform: translateY(20%); /* Start offset */
}
```

## Zoom Parallax

Scale up as user scrolls:

```ini
[animation]
type: to
to: scale=1.2

[scroll]
scrub: 1
start: top bottom
end: center center
```

## Rotation Parallax

Subtle rotation on scroll:

```ini
[animation]
type: to
to: rotation=10

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

## Hero Parallax Section

Combine multiple effects:

```ini
[timeline]

[scroll]
scrub: 1
start: top top
end: bottom top

[step.1]
selector: .hero-bg
type: to
to: y=30%, scale=1.1

[step.2]
selector: .hero-title
type: to
to: y=-50%
position: <

[step.3]
selector: .hero-overlay
type: to
to: opacity=0.8
position: <
```

## Horizontal Parallax

Move element horizontally:

```ini
[animation]
type: to
to: x=100

[scroll]
scrub: 1
start: top bottom
end: bottom top
```

## Opposite Direction

Create depth by moving in opposite directions:

### Left Element
```ini
[target]
selector: .element-left

[animation]
type: to
to: x=-50

[scroll]
scrub: 1
```

### Right Element
```ini
[target]
selector: .element-right

[animation]
type: to
to: x=50

[scroll]
scrub: 1
```

## Responsive Parallax

Reduce or disable on mobile for performance:

```ini
[animation]
type: to
to: y=-100

[animation @mobile]
to: y=-30    // Reduced movement

[scroll]
scrub: 1
```

Or disable completely:
```ini
[disable @mobile]
```

## Tips

1. **Subtle is better**: Small movements (20-100px) look more natural
2. **Use scrub**: Always use `scrub: 1` for parallax
3. **Performance**: Limit parallax layers to 3-5
4. **Mobile**: Reduce or disable on mobile devices

---

**Back to:** [Documentation Home →](../README.md)
