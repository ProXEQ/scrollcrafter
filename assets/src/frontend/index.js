import { initWidgetsInScope } from './core/registry';
import './widgets/scroll-animation';
import './widgets/scroll-timeline';

function init() {
  initWidgetsInScope(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('elementor/popup/show', (event) => {
  initWidgetsInScope(event.target);
});
