/**
 * Utility functions for ScrollCrafter frontend
 */

const compiledCalcs = new Map();

/**
 * Safely parses mathematical expressions from DSL strings
 * Supports: sw (scrollWidth), cw (clientWidth), vw (viewportWidth), center, end, etc.
 */
export function parseSmartValue(val, contextNode) {
    if (typeof val !== 'string') return val;

    // Shortcuts
    if (val === 'calc_scroll_width_neg') val = 'calc(sw * -1)';
    if (val === 'calc_scroll_width') val = 'calc(sw)';
    if (val === 'calc_100vh') val = 'calc(vh)';

    const calcMatch = val.match(/^calc\s*\((.*)\)$/i);
    if (calcMatch) {
        const expression = calcMatch[1].replace(/(\d)\s*(sw|cw|ch|vw|vh)\b/gi, '$1 * $2');

        return (index, target) => {
            const el = target || contextNode;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const cw = el.clientWidth || 0;
            const ch = el.clientHeight || 0;
            const sw = Math.max(0, el.scrollWidth - cw);

            const varsMap = {
                sw, cw, ch, vw, vh,
                center: (vw - cw) / 2,
                vcenter: (vh - ch) / 2,
                end: vw - cw
            };

            let finalExpr = expression;
            const sortedKeys = ['vcenter', 'center', 'sw', 'cw', 'ch', 'vw', 'vh', 'end']; // Sorted by length desc manually for speed

            sortedKeys.forEach(key => {
                finalExpr = finalExpr.replace(new RegExp(`\\b${key}\\b`, 'gi'), varsMap[key]);
            });

            // Use cache for the compiled function
            let fn = compiledCalcs.get(finalExpr);
            if (!fn) {
                // Basic safety check: only numbers, operators, dots, and space
                const safetyCheck = finalExpr.replace(/[0-9\.\+\-\*\/\(\)\s]/g, '');
                if (safetyCheck.length > 0) {
                    console.warn('[ScrollCrafter] Unsafe characters in result expression:', safetyCheck);
                    return 0;
                }
                try {
                    fn = new Function('return ' + finalExpr);
                    compiledCalcs.set(finalExpr, fn);
                } catch (e) {
                    console.error('[ScrollCrafter] Compile error:', e, finalExpr);
                    return 0;
                }
            }

            try {
                return fn();
            } catch (e) {
                console.error('[ScrollCrafter] Calc exec error:', e);
                return 0;
            }
        };
    }
    return val;
}

/**
 * Recursively parses object variables (macros/calcs)
 */
export function parseMacros(vars, contextNode) {
    if (!vars || typeof vars !== 'object') return vars;
    const out = { ...vars };
    Object.keys(out).forEach((key) => {
        const val = out[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            out[key] = parseMacros(val, contextNode);
            return;
        }
        out[key] = parseSmartValue(val, contextNode);
    });
    return out;
}

/**
 * Builds Media Query based on breakpoint configuration
 */
export function buildMediaQuery(targetSlug, isStrict, sortedBreakpoints) {
    if (!sortedBreakpoints || !Array.isArray(sortedBreakpoints)) return null;

    const currentIndex = sortedBreakpoints.findIndex(bp => bp.key === targetSlug);
    if (currentIndex === -1) return null;

    const currentBp = sortedBreakpoints[currentIndex];
    const maxQuery = `(max-width: ${currentBp.value}px)`;

    if (!isStrict) {
        return maxQuery;
    }

    if (currentIndex > 0) {
        const prevBp = sortedBreakpoints[currentIndex - 1];
        const minVal = prevBp.value + 1;
        return `(min-width: ${minVal}px) and ${maxQuery}`;
    }

    return maxQuery;
}
