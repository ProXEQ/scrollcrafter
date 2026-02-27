/**
 * Lenis Smooth Scroll Integration
 * MIT License - Copyright (c) 2022 Studio Freight
 * 
 * This module integrates Lenis with GSAP ScrollTrigger for smooth scrolling.
 * Pro feature only.
 * 
 * @module smooth-scroll
 */

let lenisInstance = null;

export function initSmoothScroll(options = {}) {
    const debug = !!window.ScrollCrafterConfig?.debug;
    if (typeof window.Lenis === 'undefined') {
        if (debug) console.warn('[ScrollCrafter] Lenis not loaded. Smooth scroll unavailable.');
        return null;
    }

    if (lenisInstance) {
        if (debug) console.log('[ScrollCrafter] Lenis already initialized, returning existing instance.');
        return lenisInstance;
    }

    const defaultOptions = {
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        lenisInstance = new window.Lenis(finalOptions);

        if (window.gsap) {
            window.gsap.ticker.add((time) => {
                lenisInstance.raf(time * 1000);
            });

            window.gsap.ticker.lagSmoothing(0);
        }

        if (window.ScrollTrigger) {
            lenisInstance.on('scroll', window.ScrollTrigger.update);

            // CRITICAL: Pause Lenis during ScrollTrigger refresh cycle.
            // When ST.refresh() runs, GSAP temporarily scrolls to Y=0 to measure
            // pin-spacer positions. If Lenis is active, it fights this temporary
            // scroll, corrupting all pin calculations. This is the documented
            // standard integration for Lenis + GSAP.
            window.ScrollTrigger.addEventListener('refreshInit', () => {
                if (lenisInstance) lenisInstance.stop();
            });
            window.ScrollTrigger.addEventListener('refresh', () => {
                if (lenisInstance) lenisInstance.start();
            });

            window.addEventListener('resize', () => {
                window.ScrollTrigger.refresh();
            });
        }

        if (window.ScrollCrafterConfig?.debug) {
            console.log('[ScrollCrafter] Lenis smooth scroll initialized', finalOptions);
        }

        return lenisInstance;
    } catch (error) {
        if (window.ScrollCrafterConfig?.debug) {
            console.error('[ScrollCrafter] Failed to initialize Lenis:', error);
        }
        return null;
    }
}

export function destroySmoothScroll() {
    if (lenisInstance) {
        lenisInstance.destroy();
        lenisInstance = null;
        if (window.ScrollCrafterConfig?.debug) {
            console.log('[ScrollCrafter] Lenis destroyed');
        }
    }
}

export function getLenisInstance() {
    return lenisInstance;
}

export function pauseSmoothScroll() {
    if (lenisInstance) {
        lenisInstance.stop();
    }
}

export function resumeSmoothScroll() {
    if (lenisInstance) {
        lenisInstance.start();
    }
}

export function scrollTo(target, options = {}) {
    if (lenisInstance) {
        lenisInstance.scrollTo(target, {
            offset: 0,
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Expo ease out
            ...options
        });
    }
}

if (typeof window !== 'undefined') {
    const shouldInit = window.ScrollCrafterConfig?.smoothScroll?.enabled;

    if (shouldInit) {
        const init = () => {
            const options = window.ScrollCrafterConfig?.smoothScroll?.options || {};
            initSmoothScroll(options);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    }
}
if (typeof window !== 'undefined') {
    window.ScrollCrafterSmooth = {
        init: initSmoothScroll,
        destroy: destroySmoothScroll,
        getInstance: getLenisInstance,
        pause: pauseSmoothScroll,
        resume: resumeSmoothScroll,
        scrollTo: scrollTo
    };
}
