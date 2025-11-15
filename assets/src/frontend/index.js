// index.js
import { initWidgetsInScope } from './core/registry';
import './widgets/scroll-reveal';

function init() {
  initWidgetsInScope(document);
}

// DOM gotowy.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Elementor popup / dynamic content.
document.addEventListener('elementor/popup/show', (event) => {
  initWidgetsInScope(event.target);
});
