const registry = {};

const initializedNodes = new WeakSet();
const pendingInits = new Map(); // Per-widget debounce timers
const previewLocks = new Set(); // Widgets with active preview - skip normal init

// Export for preview-player.js to use
export function setPreviewLock(widgetId, locked) {
  if (locked) {
    previewLocks.add(widgetId);
  } else {
    previewLocks.delete(widgetId);
  }
}

export function registerWidget(type, initFn) {
  registry[type] = initFn;
}

export function initWidgetsInScope(root = document, force = false) {
  if (!root) {
    return;
  }

  // Find all nodes including root itself
  const nodes = [];
  if (root.hasAttribute && root.hasAttribute('data-scrollcrafter-config')) {
    nodes.push(root);
  }
  if (root.querySelectorAll) {
    root.querySelectorAll('[data-scrollcrafter-config]').forEach(n => nodes.push(n));
  }

  nodes.forEach((node) => {
    const widgetId = node.getAttribute('data-id');

    // CRITICAL: Skip initialization if this widget has active preview
    // This prevents Elementor hooks from overriding our preview animation
    if (widgetId && previewLocks.has(widgetId)) {
      if (window.ScrollCrafterConfig?.debug) {
        console.log(`[ScrollCrafter] Skipping init for ${widgetId} - preview active`);
      }
      return;
    }

    const isAlreadyInit = initializedNodes.has(node);
    if (!force && isAlreadyInit) {
      return;
    }

    // In force mode, debounce re-initialization per widget
    // This prevents Elementor's multiple rapid triggers from causing chaos
    if (force) {
      if (widgetId) {
        // Clear any pending init for this widget
        if (pendingInits.has(widgetId)) {
          clearTimeout(pendingInits.get(widgetId));
        }

        // Schedule the actual init after a short delay
        pendingInits.set(widgetId, setTimeout(() => {
          pendingInits.delete(widgetId);
          // Double-check lock before delayed init
          if (!previewLocks.has(widgetId)) {
            doInitWidget(node, force);
          }
        }, 250)); // 250ms debounce

        return; // Don't init immediately
      }
    }

    // Non-force mode: init immediately
    doInitWidget(node, force);
  });
}

function doInitWidget(node, force) {
  // --- Cleanup Stage ---
  // If we have an existing cleanup function on the node, call it.
  if (typeof node.__sc_cleanup === 'function') {
    try {
      node.__sc_cleanup();
    } catch (e) {
      console.warn('[ScrollCrafter] Cleanup error:', e);
    }
    delete node.__sc_cleanup;
  }

  const raw = node.getAttribute('data-scrollcrafter-config');
  if (!raw) return;

  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    if (window.ScrollCrafterConfig?.debug) {
      console.warn('[ScrollCrafter] Invalid config JSON:', e, node);
    }
    return;
  }

  const type = config.widget;
  if (!type || typeof registry[type] !== 'function') {
    return;
  }

  try {
    if (window.ScrollCrafterConfig?.debug) {
      console.log(`[ScrollCrafter] Initializing widget: "${type}"`, node);
    }

    // Execute registration - it MUST return a cleanup function (or attach it to node)
    const cleanup = registry[type](node, config);

    if (typeof cleanup === 'function') {
      node.__sc_cleanup = cleanup;
    }

    initializedNodes.add(node);

    node.dispatchEvent(
      new CustomEvent('scrollcrafter:init', {
        bubbles: true,
        detail: { type, config },
      }),
    );
  } catch (e) {
    console.error(`[ScrollCrafter] Init error for "${type}":`, e);
  }
}
