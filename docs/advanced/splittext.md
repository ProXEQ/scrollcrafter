# SplitText Animations

SplitText allows you to animate text by splitting it into words, characters, or lines. This creates stunning text reveal effects.

> **Note:** SplitText requires GSAP Club/Business license for commercial use. See [GSAP Licensing](https://greensock.com/licensing/).

## Basic Syntax

```ini
[animation]
split: words
from: opacity=0, y=30
stagger: 0.1
```

## Split Types

| Type | Description | Use Case |
|------|-------------|----------|
| `words` | Each word animates separately | Headlines, quotes |
| `chars` | Each character animates | Dramatic reveals |
| `lines` | Each line animates | Paragraphs, captions |

## Properties

### split

The type of split to apply:

```ini
split: words     // Split by word
split: chars     // Split by character
split: lines     // Split by line
```

### stagger

Essential for text animations - time between each element:

```ini
stagger: 0.1              // 0.1s between each word/char
stagger.amount: 1         // Total 1s spread across all
stagger.from: start       // Direction of stagger
```

**stagger.from options:**
| Value | Description |
|-------|-------------|
| `start` | First to last (default) |
| `end` | Last to first |
| `center` | Center outward |
| `random` | Random order |

## Examples

### Word-by-Word Fade In
```ini
[animation]
split: words
from: opacity=0, y=20
stagger: 0.08
duration: 0.5
ease: power2.out

[scroll]
start: top 80%
```

### Character Reveal
```ini
[animation]
split: chars
from: opacity=0, y=50, rotation=20
stagger.amount: 1
stagger.from: start
duration: 0.6
ease: back.out(1.7)
```

### Lines Slide Up
```ini
[animation]
split: lines
from: opacity=0, y=100%
stagger: 0.15
duration: 0.8
ease: power3.out

[scroll]
start: top 85%
```

### Random Character Scramble
```ini
[animation]
split: chars
from: opacity=0, scale=0
stagger.amount: 0.8
stagger.from: random
ease: elastic.out(1, 0.5)
```

### Scrubbed Text Reveal
```ini
[animation]
split: words
from: opacity=0, y=30
stagger.amount: 1
duration: 1

[scroll]
scrub: 1
start: top 80%
end: top 30%
```

## Responsive SplitText

Different split types for different breakpoints:

```ini
[animation]
split: chars
from: opacity=0, rotation=45
stagger.amount: 1.5

[animation @mobile]
split: words          // Simpler on mobile
from: opacity=0, y=20
stagger: 0.1
```

## Timeline with SplitText

```ini
[timeline]

[step.1]
selector: .headline
split: words
from: opacity=0, y=50
stagger.amount: 0.8

[step.2]
selector: .subheadline
split: words
from: opacity=0
stagger: 0.05
position: <0.3       // Start 0.3s after step.1 starts
```

## Tips

### 1. Keep It Readable
Don't animate too many characters at once. It becomes overwhelming:

**✅ Good:**
```ini
split: words
stagger: 0.08
```

**❌ Too Much:**
```ini
split: chars
stagger: 0.01    // 100 chars = 1s of animation start
```

### 2. Consider Performance
Character-level animations can be heavy. On mobile, consider:
- Using `split: words` instead of `chars`
- Reducing stagger amount
- Disabling on mobile: `[disable @mobile]`

### 3. Font Loading
Ensure fonts are loaded before animation triggers, or SplitText may calculate wrong positions.

## Troubleshooting

### Text Disappears After Animation

This usually means the animation didn't complete properly. Check:
- Is `duration` set?
- Is `stagger` not too long?

### Characters/Words Not Animating

- Make sure the element contains text (not an image)
- Check that SplitText is loaded (GSAP Club feature)

### Layout Breaks

SplitText wraps elements - this can affect layout:
- Avoid split on elements with complex CSS
- Use `display: inline-block` on parent if needed

---

**Next:** [Examples →](../examples/fade-in.md)
