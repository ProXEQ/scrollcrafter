# Troubleshooting

Common issues and their solutions.

## Animation Issues

### Animation Doesn't Play

**Possible causes:**

1. **Missing scroll trigger**: Animation plays instantly on page load
   ```ini
   [scroll]
   start: top 80%    // Add this
   ```

2. **Element not visible**: Check if element is hidden by CSS

3. **Wrong selector**: Verify CSS selector matches element
   ```ini
   [target]
   selector: .correct-class
   ```

4. **Script error**: Check browser console (F12) for errors

### Animation Plays But Looks Wrong

1. **Wrong animation type**:
   - `from` = Animate FROM values TO current state
   - `to` = Animate TO values FROM current state
   
2. **Values not applying**: Make sure using `=` not `:` in properties
   ```ini
   // ✅ Correct
   from: opacity=0, y=50
   
   // ❌ Wrong
   from: opacity:0, y:50
   ```

### Animation Jumps/Flickers

1. **Elementor transitions conflict**:
   Add `transition: none` to element CSS
   
2. **Use anticipatePin for pinned sections**:
   ```ini
   [scroll]
   pin: true
   anticipatePin: 1
   ```

### Animation Reverses Unexpectedly

Check `toggleActions`:
```ini
[scroll]
toggleActions: play none none none    // Never reverse
```

Or use `once`:
```ini
[scroll]
once: true
```

---

## SplitText Issues

### Text Disappears

1. **Animation not completing**: Ensure duration is set
2. **Stagger too long**: Reduce stagger amount
3. **SplitText not loaded**: Check GSAP license includes SplitText

### Wrong Characters Animated

When switching breakpoints (desktop → mobile), SplitText may need different types:

```ini
[animation]
split: words

[animation @mobile]
split: chars    // Different type on mobile
```

### Layout Breaks After Split

Add CSS:
```css
.your-text-element * {
  display: inline-block;
}
```

---

## Scroll Trigger Issues

### Trigger Fires Too Early/Late

Adjust start position:
```ini
[scroll]
start: top 80%    // Try different values: 70%, 90%, center
```

### Pinning Overlaps on Page Reload

If you refresh the page while a pinned element is visible and sections start overlapping:

1. **The "Absolute Zero" Fix**: ScrollCrafter (v1.2.2+) automatically implements this. It forces a scroll to the top and clears memory to ensure accurate pixel-perfect measurements.
2. **Lazy Loading Images**: If you have images below the pinned section, ensure they have fixed aspect ratios or `min-height` set. If they load *after* GSAP calculates the pin, they will push the layout and break the pin.
3. **Lenis Synchronization**: If using Smooth Scroll, ScrollCrafter automatically pauses Lenis during the measurement phase to prevent conflicts.

### Element "Falls Off Tracks" / Jittery Pin

Often happens in Chrome with Smooth Scroll enabled:

1. **Check Transition CSS**: Ensure the element (and its parents) do not have CSS `transition` applied to `transform`, `margin`, or `padding`.
2. **Horizontal Scroll Jitter**: If using very fast scrolls, avoid `fastScrollEnd: true` unless necessary, as it can cause abrupt jumps.
3. **Invalidate on Refresh**: Ensure `invalidateOnRefresh: true` is set (this is default in recent versions) for responsive sections.

### Markers Not Showing

1. Only visible to logged-in WordPress users (security).
2. Enable in editor with `Ctrl+K` or in DSL:
   ```ini
   [scroll]
   markers: true
   ```

---

## Performance Issues

### Page Feels Slow

1. **Too many animations**: Limit to 5-10 per page
2. **Complex SplitText**: Use `words` instead of `chars`
3. **Large images**: Optimize images before animating

### Mobile Lag

1. **Disable heavy animations**:
   ```ini
   [disable @mobile]
   ```

2. **Simplify mobile animations**:
   ```ini
   [animation @mobile]
   from: opacity=0    // Simple fade only
   duration: 0.3
   ```

---

## Editor Issues

### Preview Not Working

1. **Refresh Elementor**: Save and reload editor
2. **Clear cache**: Browser and WordPress caches
3. **Check console**: Look for JavaScript errors

### Autocomplete Not Showing

1. Type slowly and wait
2. Make sure you're in the DSL editor (not regular text field)
3. Autocomplete works after `:` for values

### Changes Not Saving

1. **Click Save button** or press `Cmd+S`
2. **Update Elementor page** after saving DSL
3. Check for validation errors (red markers)

---

## Validation Warnings

### "Unknown key in [section]"

You've used a property that doesn't exist. Check spelling:
```ini
// ❌ Wrong
duraton: 1

// ✅ Correct
duration: 1
```

### "GSAP ignores toggleActions when scrub is enabled"

Remove one:
```ini
[scroll]
scrub: 1
// toggleActions is ignored when scrub is active
```

### "Consider adding scrub when using pin"

For pinned sections, scrub creates smoother experience:
```ini
[scroll]
pin: true
scrub: 1    // Recommended
```

---

## Getting Help

1. **Check documentation**: You're here! 📚
2. **Browser console**: Errors often have helpful messages
3. **GSAP docs**: [greensock.com/docs](https://greensock.com/docs)
4. **Report bugs**: [GitHub Issues](https://github.com/ProXEQ/scrollcrafter/issues)
5. **Discussions**: [GitHub Discussions](https://github.com/ProXEQ/scrollcrafter/discussions)

---

**Back to:** [Documentation Home →](./README.md)
