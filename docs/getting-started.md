# Getting Started with ScrollCrafter

This guide will walk you through creating your first scroll animation in Elementor using ScrollCrafter.

## Prerequisites

- WordPress 6.0+
- Elementor (6.0+)
- ScrollCrafter plugin installed and activated

## Step 1: Open the DSL Editor

1. Edit any page with Elementor
2. Select any widget, column, or container
3. Look for the **ScrollCrafter** section in the panel
4. Click **"Edit DSL"** button

![Editor Button](./assets/editor-button.png)

## Step 2: Write Your First Animation

In the DSL editor, paste this code:

```ini
[animation]
type: from
from: opacity=0, y=100
duration: 1
ease: power2.out

[scroll]
start: top 80%
```

### What this does:
- **`type: from`** - Animates FROM the specified values TO the current state
- **`from: opacity=0, y=100`** - Starts invisible and 100px below
- **`duration: 1`** - Animation lasts 1 second
- **`ease: power2.out`** - Smooth deceleration
- **`start: top 80%`** - Triggers when element's top reaches 80% of viewport

## Step 3: Preview

1. Click the **▶ Preview** button in the editor
2. Watch your animation play instantly
3. Make adjustments and preview again

## Step 4: Save

1. Press `Cmd+S` (Mac) or `Ctrl+S` (Windows) to save
2. Or click the **Save** button
3. Update your Elementor page

## Next Steps

- Learn about [Animation Properties](./dsl-syntax/animation.md)
- Add [Scroll Triggers](./dsl-syntax/scroll.md)
- Create [Responsive Animations](./responsive/breakpoints.md)

---

## Quick Reference

### Animation Types

| Type | Description |
|------|-------------|
| `from` | Animate FROM values TO current state |
| `to` | Animate TO values FROM current state |
| `fromTo` | Animate FROM values TO other values |

### Common Easing

| Ease | Description |
|------|-------------|
| `power1.out` | Gentle slowdown |
| `power2.out` | Medium slowdown |
| `power3.out` | Strong slowdown |
| `back.out(1.7)` | Slight overshoot |
| `elastic.out` | Bouncy effect |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save & Apply |
| `Esc` | Close editor |
| `Ctrl + K` | Toggle markers |
