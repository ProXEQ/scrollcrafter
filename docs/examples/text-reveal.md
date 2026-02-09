# Example: Text Reveal

Create stunning text reveal animations using SplitText.

## Word-by-Word Reveal

```ini
[animation]
split: words
from: opacity=0, y=30
stagger: 0.08
duration: 0.6
ease: power2.out

[scroll]
start: top 80%
```

## Character Cascade

```ini
[animation]
split: chars
from: opacity=0, y=50, rotation=15
stagger.amount: 1
stagger.from: start
duration: 0.5
ease: back.out(1.7)

[scroll]
start: top 75%
```

## Line-by-Line Slide

```ini
[animation]
split: lines
from: opacity=0, y=100%
stagger: 0.2
duration: 0.8
ease: power3.out

[scroll]
start: top 80%
```

## Scrubbed Text Reveal

Link text reveal to scroll progress:

```ini
[animation]
split: words
from: opacity=0, y=20
stagger.amount: 1
duration: 1
ease: none

[scroll]
scrub: 1
start: top 70%
end: top 30%
```

## Random Character Reveal

```ini
[animation]
split: chars
from: opacity=0, scale=0
stagger.amount: 0.8
stagger.from: random
duration: 0.4
ease: elastic.out(1, 0.5)
```

## Center Outward

```ini
[animation]
split: chars
from: opacity=0, x=20
stagger.amount: 0.6
stagger.from: center
duration: 0.5
ease: power2.out
```

## Typewriter Effect

```ini
[animation]
split: chars
from: opacity=0
stagger: 0.05
duration: 0.1
ease: none

[scroll]
start: top 80%
once: true
```

## Headline + Subtitle Combo

Use timeline for sequenced text reveals:

```ini
[timeline]

[scroll]
start: top 70%

[step.1]
selector: h1
split: words
from: opacity=0, y=40
stagger: 0.1
duration: 0.8

[step.2]
selector: .subtitle
split: words
from: opacity=0
stagger: 0.05
duration: 0.5
position: <0.4    // Start before step.1 finishes
```

## Responsive Text Animation

Simpler on mobile:

```ini
[animation]
split: chars
from: opacity=0, rotation=20, y=30
stagger.amount: 1.2
duration: 0.6

[animation @mobile]
split: words      // Words instead of chars
from: opacity=0, y=20
stagger: 0.1
duration: 0.5
```

## With Reduced Motion

```ini
[animation]
split: words
from: opacity=0, y=50, rotation=-5
stagger.amount: 1
duration: 0.8

[animation @reduced-motion]
from: opacity=0
duration: 0.3
// No split = entire text fades at once
```

---

**Next:** [Parallax Effect →](./parallax.md)
