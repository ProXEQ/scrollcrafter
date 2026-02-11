const registry = {};

const initializedNodes = new WeakSet();
const pendingInits = new Map();
const previewLocks = new Set();

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

  const nodes = [];
  if (root.hasAttribute && root.hasAttribute('data-scrollcrafter-config')) {
    nodes.push(root);
  }
  if (root.querySelectorAll) {
    root.querySelectorAll('[data-scrollcrafter-config]').forEach(n => nodes.push(n));
  }

  nodes.forEach((node) => {
    const widgetId = node.getAttribute('data-id');

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

    if (force) {
      if (widgetId) {
        if (pendingInits.has(widgetId)) {
          clearTimeout(pendingInits.get(widgetId));
        }

        pendingInits.set(widgetId, setTimeout(() => {
          pendingInits.delete(widgetId);
          if (!previewLocks.has(widgetId)) {
            doInitWidget(node, force);
          }
        }, 250));

        return;
      }
    }

    doInitWidget(node, force);
  });
}

function doInitWidget(node, force) {
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
