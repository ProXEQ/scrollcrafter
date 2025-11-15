// registry.js
const registry = {};

export function registerWidget(type, initFn) {
  registry[type] = initFn;
}

export function initWidgetsInScope(root = document) {
  if (!root || !root.querySelectorAll) {
    return;
  }

  const nodes = root.querySelectorAll('[data-scrollcrafter-config]');
  nodes.forEach((node) => {
    const raw = node.getAttribute('data-scrollcrafter-config');
    if (!raw) return;

    let config;
    try {
      config = JSON.parse(raw);
    } catch (e) {
      if (window.ScrollCrafterConfig?.debug) {
        // eslint-disable-next-line no-console
        console.warn('ScrollCrafter: invalid config JSON', e);
      }
      return;
    }

    const type = config.widget;
    if (!type || typeof registry[type] !== 'function') {
      return;
    }

    try {
      registry[type](node, config);
      document.dispatchEvent(
        new CustomEvent('scrollcrafter:widget_init', {
          detail: { type, node, config },
        }),
      );
    } catch (e) {
      if (window.ScrollCrafterConfig?.debug) {
        // eslint-disable-next-line no-console
        console.error('ScrollCrafter: widget init error', type, e);
      }
    }
  });
}
