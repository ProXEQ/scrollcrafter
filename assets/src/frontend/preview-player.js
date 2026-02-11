/**
 * ScrollCrafter Direct Preview Player
 * 
 * Exposes window.scPreview() for the editor to call directly,
 * bypassing Elementor's problematic hook system.
 */

import { getGsap, getScrollTrigger } from './core/gsap-loader';
import { parseMacros } from './core/utils';
import { resolveConfigForBreakpoint, getBreakpointRanges } from './core/responsive';
import { setPreviewLock } from './core/registry';

const DEBUG = !!window.ScrollCrafterConfig?.debug;
const log = (...args) => DEBUG && console.log('[SC Preview]', ...args);

const activePreview = new Map();

/**
 * Clean up any existing preview for a widget
 * IMPORTANT: Does NOT revert SplitText - that would break it for reuse!
 */
function cleanupPreview(widgetId, releaseLock = true) {
    if (activePreview.has(widgetId)) {
        const { tween, elements } = activePreview.get(widgetId);
        log(`Cleaning up existing preview for ${widgetId}`);

        if (tween) {
            if (tween.scrollTrigger) {
                tween.scrollTrigger.kill(true);
            }
            tween.progress(1);
            tween.kill();
        }

        if (elements && elements.length) {
            const gsap = getGsap();
            if (gsap) {
                gsap.set(elements, { clearProps: 'all' });
            }
        }

        activePreview.delete(widgetId);
    }

    if (releaseLock) {
        setPreviewLock(widgetId, false);
        log(`Preview lock released for ${widgetId}`);
    }
}

function createAnimation(node, animConfig, config) {
    const gsap = getGsap();
    if (!gsap) {
        console.error('[SC Preview] GSAP not available');
        return null;
    }

    const targetConfig = config.target || {};
    let elements = [];

    if (targetConfig.type === 'wrapper') {
        elements = [node];
    } else if (targetConfig.selector) {
        elements = node.querySelectorAll(targetConfig.selector);
    } else {
        elements = [node];
    }

    if (!elements.length) {
        log('No target elements found');
        return null;
    }

    const method = animConfig.method || 'from';
    let split = null;

    if (animConfig.split && window.SplitText) {
        try {
            const requestedType = animConfig.split.toLowerCase();
            const existingSplit = elements[0]?._splitText;
            const existingType = elements[0]?._splitTextType;

            const typeMatches = existingType === requestedType;
            const hasUsableSplit = existingSplit && (existingSplit.chars?.length || existingSplit.words?.length || existingSplit.lines?.length);

            if (hasUsableSplit && typeMatches) {
                log(`Reusing existing SplitText (type: ${existingType})`);
                split = existingSplit;
            } else {
                if (existingSplit) {
                    log(`Type mismatch (${existingType} vs ${requestedType}), reverting and creating new`);
                    existingSplit.revert();
                } else {
                    log('Creating fresh SplitText with type:', requestedType);
                }

                split = new SplitText(elements, { type: requestedType });

                log('SplitText result:', {
                    chars: split.chars?.length || 0,
                    words: split.words?.length || 0,
                    lines: split.lines?.length || 0
                });

                elements.forEach(el => {
                    el._splitText = split;
                    el._splitTextType = requestedType;
                });
            }

            if (requestedType.includes('char') && split.chars && split.chars.length > 0) {
                elements = split.chars;
            } else if (requestedType.includes('word') && split.words && split.words.length > 0) {
                elements = split.words;
            } else if (requestedType.includes('line') && split.lines && split.lines.length > 0) {
                elements = split.lines;
            }

            log(`SplitText: ${elements.length} elements (type: ${requestedType})`);

            if (elements.length > 0) {
                gsap.set(elements, { display: 'inline-block' });
            }
        } catch (e) {
            console.warn('[SC Preview] SplitText error:', e);
        }
    }

    const vars = parseMacros({ ...animConfig.vars }, elements[0]);
    const vars2 = animConfig.vars2 ? parseMacros({ ...animConfig.vars2 }, elements[0]) : null;

    gsap.set(elements, {
        transition: 'none',
        translate: 'none',
        rotate: 'none',
        scale: 'none'
    });

    delete vars.scrollTrigger;
    if (vars2) delete vars2.scrollTrigger;

    if (method === 'from' && vars.immediateRender === undefined) {
        vars.immediateRender = true;
    }

    log(`Creating ${method} tween for ${elements.length} elements`);

    let tween;
    if (method === 'fromTo' && vars2) {
        tween = gsap.fromTo(elements, vars, vars2);
    } else if (typeof gsap[method] === 'function') {
        tween = gsap[method](elements, vars);
    }

    if (tween && (method === 'from' || method === 'fromTo')) {
        tween.progress(1).progress(0);
    }

    return { tween, elements };
}

/**
 * Direct preview API - called from editor
 * @param {string} widgetId - Widget ID
 * @param {object} config - Full widget config from REST API
 * @param {string} breakpoint - Active breakpoint slug
 */
function scPreview(widgetId, config, breakpoint) {
    log(`Preview requested: widget=${widgetId}, breakpoint=${breakpoint}`);

    setPreviewLock(widgetId, true);
    log(`Preview lock acquired for ${widgetId}`);

    const node = document.querySelector(`[data-id="${widgetId}"]`);
    if (!node) {
        console.error(`[SC Preview] Widget ${widgetId} not found in DOM`);
        setPreviewLock(widgetId, false);
        return false;
    }

    cleanupPreview(widgetId, false);

    const ranges = getBreakpointRanges();
    let targetRange = ranges.find(r => r.slug === breakpoint);
    if (!targetRange && breakpoint === 'desktop') {
        targetRange = ranges.find(r => r.slug === '_default_desktop');
    }

    if (!targetRange) {
        targetRange = ranges[0];
    }

    const activeConfig = resolveConfigForBreakpoint(config, targetRange);
    if (!activeConfig) {
        log('No active config for breakpoint:', breakpoint);
        setPreviewLock(widgetId, false);
        return false;
    }

    log('Active config:', activeConfig);

    const result = createAnimation(node, activeConfig, config);
    if (!result || !result.tween) {
        log('Failed to create animation');
        setPreviewLock(widgetId, false);
        return false;
    }

    activePreview.set(widgetId, result);

    const originalOnComplete = result.tween.vars.onComplete;
    result.tween.vars.onComplete = function () {
        log(`Preview animation completed for ${widgetId}`);
        if (originalOnComplete) originalOnComplete.apply(this, arguments);

        setTimeout(() => {
            setPreviewLock(widgetId, false);
            log(`Preview lock released for ${widgetId}`);
        }, 2000);
    };

    log('Playing animation');
    result.tween.restart(true);

    return true;
}

function cleanupAllPreviews() {
    log(`Cleaning up all previews (${activePreview.size} active)`);
    for (const widgetId of activePreview.keys()) {
        cleanupPreview(widgetId, true);
    }
}

window.scPreview = scPreview;
window.scPreviewCleanup = cleanupPreview;
window.scPreviewCleanupAll = cleanupAllPreviews;

log('Direct Preview API initialized');
