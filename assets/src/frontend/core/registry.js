const registry = {};

const initializedNodes = new WeakSet();

export function registerWidget(type, initFn) {
  registry[type] = initFn;
}

export function initWidgetsInScope(root = document) {
  if (!root || !root.querySelectorAll) {
    return;
  }

  const nodes = root.querySelectorAll('[data-scrollcrafter-config]');
  
  nodes.forEach((node) => {
    if (initializedNodes.has(node)) {
        return;
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
      registry[type](node, config);
      
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
