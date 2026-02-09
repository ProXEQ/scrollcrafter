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

/**
 * Initialize Lenis smooth scrolling
 * @param {Object} options - Lenis options
 */
export function initSmoothScroll(options = {}) {
    // Check if Lenis is available
    if (typeof window.Lenis === 'undefined') {
        console.warn('[ScrollCrafter] Lenis not loaded. Smooth scroll unavailable.');
        return null;
    }

    // Check if already initialized
    if (lenisInstance) {
        console.log('[ScrollCrafter] Lenis already initialized, returning existing instance.');
        return lenisInstance;
    }

    const defaultOptions = {
        lerp: 0.1,              // Smoothness factor (0-1, lower = smoother)
        duration: 1.2,          // Duration of scroll animation
        smoothWheel: true,      // Smooth mouse wheel
        smoothTouch: false,     // Smooth touch (can feel laggy on mobile)
        wheelMultiplier: 1,     // Wheel scroll speed multiplier
        touchMultiplier: 2,     // Touch scroll speed multiplier
        infinite: false,        // Infinite scroll
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
        lenisInstance = new window.Lenis(finalOptions);

        // Integrate with GSAP ticker for smooth animation
        if (window.gsap) {
            window.gsap.ticker.add((time) => {
                lenisInstance.raf(time * 1000);
            });

            // Disable GSAP's default lag smoothing for smoother experience
            window.gsap.ticker.lagSmoothing(0);
        }

        // Integrate with ScrollTrigger
        if (window.ScrollTrigger) {
            lenisInstance.on('scroll', window.ScrollTrigger.update);

            // Update ScrollTrigger on resize
            window.addEventListener('resize', () => {
                window.ScrollTrigger.refresh();
            });
        }

        if (window.ScrollCrafterConfig?.debug) {
            console.log('[ScrollCrafter] Lenis smooth scroll initialized', finalOptions);
        }

        return lenisInstance;
    } catch (error) {
        console.error('[ScrollCrafter] Failed to initialize Lenis:', error);
        return null;
    }
}

/**
 * Destroy Lenis instance
 */
export function destroySmoothScroll() {
    if (lenisInstance) {
        lenisInstance.destroy();
        lenisInstance = null;
        if (window.ScrollCrafterConfig?.debug) {
            console.log('[ScrollCrafter] Lenis destroyed');
        }
    }
}

/**
 * Get current Lenis instance
 * @returns {Object|null}
 */
export function getLenisInstance() {
    return lenisInstance;
}

/**
 * Pause smooth scrolling
 */
export function pauseSmoothScroll() {
    if (lenisInstance) {
        lenisInstance.stop();
    }
}

/**
 * Resume smooth scrolling
 */
export function resumeSmoothScroll() {
    if (lenisInstance) {
        lenisInstance.start();
    }
}

/**
 * Scroll to a target element or position
 * @param {string|number|HTMLElement} target - Target selector, position, or element
 * @param {Object} options - Scroll options
 */
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

// Auto-initialize if config says so
if (typeof window !== 'undefined') {
    const shouldInit = window.ScrollCrafterConfig?.smoothScroll?.enabled;

    if (shouldInit) {
        // Wait for DOM and GSAP to be ready
        const init = () => {
            const options = window.ScrollCrafterConfig?.smoothScroll?.options || {};
            initSmoothScroll(options);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            // Small delay to ensure GSAP is loaded
            setTimeout(init, 100);
        }
    }
}

// Expose API globally for advanced users
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
