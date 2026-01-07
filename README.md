# ScrollCrafter – The Ultimate GSAP Scroll Animation DSL for Elementor

ScrollCrafter transforms Elementor into a powerhouse of motion design. It introduces a dedicated **DSL (Domain Specific Language)** editor that lets you construct advanced, production-grade scroll animations powered by GSAP and ScrollTrigger using a clean, readable, and type-safe syntax.

Say goodbye to messy JavaScript snippets and "spaghetti code" in your Elementor widgets. ScrollCrafter gives you IDE-like superpowers directly inside the builder.

## 🚀 Key Features

### ⚡ Power & Performance
-   **Smart Asset Loading**: Automatically detects usage and only loads GSAP/ScrollCrafter scripts on pages that actually use them. Saves ~150KB on non-animated pages.
-   **Defer & Async**: All frontend scripts are deferred to ensure non-blocking rendering (Core Web Vitals friendly).
-   **Production Safe**: No `eval()`. Your DSL code is safely parsed on the server, validated, and converted into optimized JSON configuration.

### 🛠 The DSL Editor
-   **Integrated Modal**: Distinct, distraction-free coding environment invoked directly from any Elementor widget, column, or container.
-   **Intelligent Autocomplete**: Context-aware suggestions for sections (`[animation]`, `[scroll]`), properties (`duration`, `scrub`), and even values (`top center`, `play none...`).
-   **Inline Validation**: Real-time error checking with precise line reporting. Typos and invalid types are flagged instantly.
-   **Keyboard Shortcuts**:
    -   `ESC`: Safely close (with confirmation to prevent accidental loss).
    -   `CMD/CTRL + S`: Quick Save & Apply.

### 🎨 Animation Capabilities
-   **GSAP Powered**: Full access to the industry-standard GSAP 3 core and ScrollTrigger.
-   **Responsive Breakpoints**: Define strict, non-overlapping responsive logic (e.g., `[animation @mobile]`).
-   **Timeline Support**: create complex sequences with `[timeline]` and `[step.N]` for multi-stage animations.
-   **Advanced Calc**: Native support for unit-mixed math like `x=calc(100vw - 50%)` or `x=calc(vw - cw)` for horizontal scrolling.
-   **Text Effects**: Built-in support for `SplitText` and `TextPlugin` (requires GSAP customization).

---

## 📦 Installation

1.  Download the plugin ZIP.
2.  Go to **WordPress Dashboard → Plugins → Add New → Upload Plugin**.
3.  Upload and activate **ScrollCrafter**.
4.  (Optional) Go to **Settings → ScrollCrafter** to configure custom Breakpoints or GSAP CDN links.

---

## 📖 DSL Syntax Guide

ScrollCrafter uses a Config-like syntax divided into **Sections** denoted by brackets `[]`.

### 1. `[target]`
Defines *what* you are animating. By default, it animates the widget you are editing.
```ini
[target]
# Use any CSS selector. 
# 'selector' is optional if you want to animate the widget wrapper itself.
selector: .my-custom-class
```

### 2. `[animation]`
Defines a simple "Tween" (single animation).
```ini
[animation]
type: from          # from, to, fromTo
from: opacity=0, y=50
duration: 1
ease: power2.out
stagger: 0.1        # Stagger if multiple elements match target
delay: 0.5
```

### 3. `[scroll]`
Connects your animation to the scrollbar (ScrollTrigger).
```ini
[scroll]
trigger: .section-container  # Optional trigger element
start: top 80%               # When top of element hits 80% viewport height
end: bottom 20%
scrub: 1                     # Smooth scrubbing (1s lag)
pin: true                    # Pin element during scroll
markers: true                # Debug markers
```

### 4. `[timeline]` & `[step.N]`
For complex sequences. Steps execute one after another.
```ini
[timeline]
timeline.defaults.ease: none

[scroll]
pin: true
scrub: 1
end: +=2000

[step.1]
selector: .box-1
type: to
to: x=500

[step.2]
selector: .box-2
type: from
from: scale=0
position: <                  # Run at same time as previous step
```

### 5. Responsive Overrides (`@slug`)
Override settings for specific breakpoints. You must define these breakpoints in **Settings → ScrollCrafter**.
```ini
[animation]
from: x=500

[animation @mobile]
from: x=0, y=100  # On mobile, slide up instead of left
```

---

## ⚙️ Configuration

Go to **Settings → ScrollCrafter** to manage global options.

### Breakpoints
Define your responsive breakpoints. ScrollCrafter uses a **Strict Range** system to prevent conflicts (e.g., Mobile style bleeding into Tablet).
Example:
-   `mobile`: 767px
-   `tablet`: 1024px

### GSAP Loading
Choose how GSAP is loaded:
1.  **Local (Default)**: Uses bundled GSAP files (safe, GDPR compliant).
2.  **CDN (GSAP Public)**: Loads from jsDelivr.
3.  **Custom CDN**: Provide your own links (e.g., for GSAP Business/Club plugins like SplitText).

---

## 🛠 Troubleshooting

**"Animation jumps when pinning ends"**
This is often caused by Elementor's default CSS transitions conflicting with GSAP.
*Fix:* ScrollCrafter automatically forces `transition: none` on pinned elements to prevent this.

**"Horizontal scroll doesn't move"**
Ensure you have `scrub: 1` (or true) in your `[scroll]` section. Without scrub, the animation plays once instantly.

**"Editor validates but nothing happens"**
Check the browser console (F12). Ensure the target element actually exists on the page.

---

## 📝 Changelog

### 1.1.0
-   **New**: Smart Asset Loading - assets only load on pages where ScrollCrafter is used. 
-   **New**: `defer` attribute added to all scripts for faster page loads.
-   **New**: Strict Breakpoint Logic - better isolation of responsive rules in JS.
-   **New**: Keyboard Shortcuts (`ESC` to cancel, `CMD+S` to save).
-   **Impr**: `calc()` engine now supports unit-like syntax (e.g., `100sw`) and dynamic context (fixes `vw - cw` issues).
-   **Fix**: Resolved "Jumping Pin" issue with Elementor transitions.

### 1.0.0
-   Initial release with DSL Editor, Validator, and Elementor Integration.
