// registry.js
const registry = {};

// WeakSet jest idealny do śledzenia obiektów DOM bez wycieków pamięci.
// Gdy element zniknie z DOM, zniknie też z tego Setu.
const initializedNodes = new WeakSet();

export function registerWidget(type, initFn) {
  registry[type] = initFn;
}

export function initWidgetsInScope(root = document) {
  if (!root || !root.querySelectorAll) {
    return;
  }

  // Pobieramy tylko te, które mają konfigurację
  const nodes = root.querySelectorAll('[data-scrollcrafter-config]');
  
  nodes.forEach((node) => {
    // 1. Zabezpieczenie przed podwójną inicjalizacją
    if (initializedNodes.has(node)) {
        // Opcjonalnie: można sprawdzić czy config się zmienił, ale w WP zazwyczaj
        // zmiana configu wiąże się z wymianą całego węzła DOM, więc to wystarczy.
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
      // 2. Uruchomienie widgetu
      registry[type](node, config);
      
      // 3. Oznaczenie jako zainicjalizowany
      initializedNodes.add(node);

      // 4. Dispatch eventu
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
