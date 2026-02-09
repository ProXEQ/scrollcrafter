/**
 * Responsive module for ScrollCrafter
 * Handles breakpoint matching, condition resolution, and GSAP matchMedia integration
 * 
 * @module responsive
 */

// Cached breakpoint ranges - built once at startup
let cachedRanges = null;
let cachedSpecialConditions = null;

/**
 * Special condition queries (Free features)
 */
const SPECIAL_QUERIES = {
    'reduced-motion': '(prefers-reduced-motion: reduce)',
};

/**
 * Pro-only special queries (checked via Feature_Flags)
 */
const PRO_SPECIAL_QUERIES = {
    'dark': '(prefers-color-scheme: dark)',
    'retina': '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
    'no-hover': '(hover: none)',
};

/**
 * Condition priority for resolution
 */
const CONDITION_PRIORITIES = {
    'reduced-motion': 100,  // Always wins (a11y)
    'and': 50,              // AND combinations
    'or': 30,               // OR combinations
    'single': 20,           // Single breakpoint
    'modifier': 10,         // Single modifier
    'base': 0,              // No condition (default)
};

/**
 * Build breakpoint ranges from config
 * @returns {Array} Sorted array of {slug, query, min, max}
 */
function buildBreakpointRanges() {
    const sysBreakpoints = window.ScrollCrafterConfig?.breakpoints || [];
    if (!sysBreakpoints.length) {
        return [{ slug: '_default_desktop', query: '(min-width: 1px)', min: 1, max: Infinity }];
    }

    const sortedBps = [...sysBreakpoints].sort((a, b) => a.value - b.value);
    const ranges = [];
    let prevMax = 0;

    sortedBps.forEach(bp => {
        const min = prevMax + 1;
        const max = bp.value;
        prevMax = max;

        const query = min === 1
            ? `(max-width: ${max}px)`
            : `(min-width: ${min}px) and (max-width: ${max}px)`;

        ranges.push({ slug: bp.key, query, min, max });
    });

    // Desktop/Default (above last breakpoint)
    ranges.push({
        slug: '_default_desktop',
        query: `(min-width: ${prevMax + 1}px)`,
        min: prevMax + 1,
        max: Infinity
    });

    return ranges;
}

/**
 * Get cached breakpoint ranges
 * @returns {Array}
 */
export function getBreakpointRanges() {
    if (cachedRanges === null) {
        cachedRanges = buildBreakpointRanges();
    }
    return cachedRanges;
}

/**
 * Check if a special condition is currently active
 * @param {string} tag 
 * @returns {boolean}
 */
export function isSpecialConditionActive(tag) {
    const query = SPECIAL_QUERIES[tag] || PRO_SPECIAL_QUERIES[tag];
    if (!query) return false;

    // Cache the result for this session
    if (cachedSpecialConditions === null) {
        cachedSpecialConditions = {};
    }

    if (cachedSpecialConditions[tag] === undefined) {
        cachedSpecialConditions[tag] = window.matchMedia(query).matches;
    }

    return cachedSpecialConditions[tag];
}

/**
 * Check if reduced motion is preferred
 * @returns {boolean}
 */
export function isReducedMotionPreferred() {
    return isSpecialConditionActive('reduced-motion');
}

/**
 * Resolve the active config for a given breakpoint range
 * @param {Object} config - Full widget config
 * @param {Object} range - Current breakpoint range {slug, query}
 * @returns {Object|null} Active configuration or null if disabled
 */
export function resolveConfigForBreakpoint(config, range) {
    // Check if this breakpoint is disabled
    if (config.disabled && config.disabled.includes(range.slug)) {
        return null;
    }

    // Check for @reduced-motion override first (highest priority)
    if (isReducedMotionPreferred() && config.conditions?.['reduced-motion']) {
        return config.conditions['reduced-motion'];
    }

    // Check for specific breakpoint override
    if (range.slug !== '_default_desktop') {
        // Check conditions array for matching tags
        if (config.conditions) {
            for (const condition of Object.values(config.conditions)) {
                if (condition.tags && condition.tags.includes(range.slug)) {
                    return condition.config || condition;
                }
            }
        }

        // Legacy: check media object
        if (config.media && config.media[range.slug]) {
            return config.media[range.slug];
        }
    }

    // Return base config
    return config.animation || config;
}

/**
 * Build media query string for a condition
 * @param {Object} condition - {type: 'or'|'and', tags: string[]}
 * @returns {string} Media query string
 */
export function buildConditionQuery(condition) {
    const ranges = getBreakpointRanges();
    const queries = [];

    condition.tags.forEach(tag => {
        // Check if it's a special condition
        if (SPECIAL_QUERIES[tag]) {
            queries.push(SPECIAL_QUERIES[tag]);
        } else if (PRO_SPECIAL_QUERIES[tag]) {
            queries.push(PRO_SPECIAL_QUERIES[tag]);
        } else {
            // Find breakpoint range
            const range = ranges.find(r => r.slug === tag);
            if (range) {
                queries.push(range.query);
            }
        }
    });

    if (queries.length === 0) return null;

    // OR = comma separated, AND = combined with 'and'
    return condition.type === 'and'
        ? queries.join(' and ')
        : queries.join(', ');
}

/**
 * Create a responsive context using GSAP matchMedia
 * Eliminates code duplication between scroll-animation.js and scroll-timeline.js
 * 
 * @param {Object} gsap - GSAP instance
 * @param {Object} config - Widget configuration
 * @param {Function} callback - Called with (activeConfig, range) for each matching range
 * @param {HTMLElement} $widget - Optional widget element for force-breakpoint check
 * @returns {Function} Cleanup function
 */
export function createResponsiveContext(gsap, config, callback, $widget = null) {
    const debug = !!window.ScrollCrafterConfig?.debug;
    const ranges = getBreakpointRanges();
    const results = [];

    // Gather disabled breakpoints
    const disabledBreakpoints = config.disabled || [];

    // Check for forced breakpoint (from editor preview)
    const forceBreakpoint = $widget?.getAttribute?.('data-scrollcrafter-force-breakpoint')
        || $widget?.attr?.('data-scrollcrafter-force-breakpoint')
        || null;

    // If force breakpoint is set, skip matchMedia and directly use the forced breakpoint
    // The attribute stays on the widget for the entire preview session to ensure
    // all subsequent debounced refreshes use the same breakpoint
    if (forceBreakpoint) {
        if (debug) console.log(`[SC Responsive] Force breakpoint detected: ${forceBreakpoint}`);

        // Find the matching range or use desktop fallback
        let targetRange = ranges.find(r => r.slug === forceBreakpoint);
        if (!targetRange && forceBreakpoint === 'desktop') {
            targetRange = ranges.find(r => r.slug === '_default_desktop');
        }

        if (targetRange && !disabledBreakpoints.includes(targetRange.slug)) {
            const activeConfig = resolveConfigForBreakpoint(config, targetRange);
            if (activeConfig) {
                if (debug) console.log(`[SC Responsive] Active (forced): ${targetRange.slug}`, activeConfig);
                const result = callback(activeConfig, targetRange);
                if (result) results.push(result);
            }
        }

        // Return no-op cleanup since we're not using matchMedia
        return () => {
            if (debug) console.log('[SC Responsive] Cleanup (forced mode - no matchMedia)');
            return results;
        };
    }

    // Normal mode: use gsap.matchMedia
    const mm = gsap.matchMedia();

    ranges.forEach(range => {
        // Skip disabled breakpoints
        if (disabledBreakpoints.includes(range.slug)) {
            if (debug) console.log(`[SC Responsive] Skipping disabled: ${range.slug}`);
            return;
        }

        mm.add(range.query, () => {
            const activeConfig = resolveConfigForBreakpoint(config, range);

            if (activeConfig) {
                if (debug) {
                    console.log(`[SC Responsive] Active: ${range.slug}`, activeConfig);
                }
                const result = callback(activeConfig, range);
                if (result) results.push(result);
            }
        });
    });

    // Return cleanup function
    return () => {
        if (debug) console.log('[SC Responsive] Cleaning up matchMedia contexts');
        mm.revert();
        return results;
    };
}

/**
 * Get condition priority for sorting
 * @param {Object} condition 
 * @returns {number}
 */
export function getConditionPriority(condition) {
    if (!condition) return CONDITION_PRIORITIES.base;

    if (condition.tags?.includes('reduced-motion')) {
        return CONDITION_PRIORITIES['reduced-motion'];
    }

    if (condition.type === 'and') {
        return CONDITION_PRIORITIES.and;
    }

    if (condition.type === 'or' && condition.tags?.length > 1) {
        return CONDITION_PRIORITIES.or;
    }

    return CONDITION_PRIORITIES.single;
}

/**
 * Sort conditions by priority (highest first)
 * @param {Array} conditions 
 * @returns {Array}
 */
export function sortConditionsByPriority(conditions) {
    return [...conditions].sort((a, b) =>
        getConditionPriority(b) - getConditionPriority(a)
    );
}
