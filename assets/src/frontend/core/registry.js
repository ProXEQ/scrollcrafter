const registry = {};

const initializedNodes = new WeakSet();

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
    const isAlreadyInit = initializedNodes.has(node);
    if (!force && isAlreadyInit) {
      return;
    }

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
  });
}
