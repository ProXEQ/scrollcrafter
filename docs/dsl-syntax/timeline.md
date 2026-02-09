# The [timeline] and [step.N] Sections

Timeline mode allows you to create complex, sequenced animations with multiple steps that play one after another.

## When to Use Timeline

Use Timeline when you need:
- Multiple elements animating in sequence
- Precise timing control between animations
- Complex choreographed effects
- Horizontal scroll sections

## Basic Syntax

```ini
[timeline]
timeline.defaults.duration: 1
timeline.defaults.ease: power2.out

[scroll]
scrub: 1
pin: true
end: +=2000

[step.1]
selector: .box-1
type: from
from: opacity=0, x=-100

[step.2]
selector: .box-2
type: from
from: opacity=0, y=50

[step.3]
selector: .box-3
type: from
from: scale=0
```

## [timeline] Section

### timeline.defaults

Set default values for all steps.

```ini
[timeline]
timeline.defaults.duration: 1
timeline.defaults.ease: power2.out
timeline.defaults.stagger: 0.1
```

## [step.N] Section

Each step defines one animation in the sequence. Steps are numbered starting from 1.

### Properties

| Property | Description | Example |
|----------|-------------|---------|
| `selector` | CSS selector for target element | `selector: .box-1` |
| `type` | Animation type (from/to/fromTo) | `type: from` |
| `from` | Starting properties | `from: opacity=0, y=50` |
| `to` | Ending properties | `to: x=200` |
| `duration` | Step duration (overrides default) | `duration: 0.5` |
| `delay` | Delay before this step | `delay: 0.2` |
| `ease` | Easing (overrides default) | `ease: back.out` |
| `stagger` | Stagger for multiple elements | `stagger: 0.1` |
| `position` | Timeline position (see below) | `position: <` |
| `label` | Named position marker | `label: intro` |

### Position (Timing Control)

The `position` property controls when a step plays relative to others.

| Value | Description |
|-------|-------------|
| (none) | Plays after previous step ends |
| `<` | Plays at same time as previous step |
| `<0.5` | Plays 0.5s after previous step STARTS |
| `>-0.5` | Plays 0.5s before previous step ENDS |
| `+=0.5` | Plays 0.5s after previous step ends (gap) |
| `-=0.5` | Starts 0.5s before previous step ends (overlap) |
| `intro` | Plays at label "intro" |

**Examples:**

```ini
[step.1]
selector: .title
from: opacity=0, y=30

[step.2]
selector: .subtitle
from: opacity=0
position: <          // Starts same time as step.1

[step.3]
selector: .button
from: opacity=0, scale=0.8
position: -=0.3      // Overlaps with step.2 by 0.3s
```

## Examples

### Staggered Boxes
```ini
[timeline]
timeline.defaults.ease: power2.out

[scroll]
start: top center
scrub: 1
end: +=1000

[step.1]
selector: .box-1
from: opacity=0, x=-100

[step.2]
selector: .box-2
from: opacity=0, y=100

[step.3]
selector: .box-3
from: opacity=0, x=100
```

### Parallel Animations
```ini
[timeline]

[scroll]
scrub: 1

[step.1]
selector: .background
type: to
to: scale=1.2
duration: 2

[step.2]
selector: .foreground
from: opacity=0
position: <          // Play with step.1

[step.3]
selector: .text
from: y=50, opacity=0
position: <0.5       // Start 0.5s after step.1 starts
```

### Horizontal Scroll
```ini
[timeline]
timeline.defaults.ease: none

[scroll]
pin: true
scrub: 1
start: top top
end: +=3000         // 3000px of scrolling

[step.1]
selector: .panels-container
type: to
to: x=calc(vw - cw)  // Scroll to end of container
duration: 1
```

### With Labels
```ini
[timeline]

[step.1]
selector: .intro
from: opacity=0
label: intro-start

[step.2]
selector: .main
from: y=100
label: main-start

[step.3]
selector: .accent
from: scale=0
position: intro-start    // Jump back to intro timing
```

---

**Next:** [Target →](./target.md)
