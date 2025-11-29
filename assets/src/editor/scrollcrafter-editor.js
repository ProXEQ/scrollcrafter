import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightSpecialChars, drawSelection, lineNumbers, placeholder } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import { defaultKeymap } from '@codemirror/commands';
import { autocompletion, completionStatus, acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@codemirror/highlight';
import { StreamLanguage } from '@codemirror/language';
import { linter, lintGutter, forceLinting } from '@codemirror/lint'; // forceLinting przyda się przy otwarciu

import { FIELD_DEFS, SECTION_HEADERS } from './field-defs';

// ---------- CONFIG ----------
const DEBUG = true;
const log = (...args) => DEBUG && console.log('[SC Editor]', ...args);

// Stan globalny walidacji (dla przycisku Apply)
let lastValidationState = {
    valid: true,
    hasCriticalErrors: false,
    diagnostics: []
};

// ---------- API HELPER (Single Source of Truth) ----------
async function fetchValidation(scriptContent) {
    const apiRoot = window.wpApiSettings?.root || '/wp-json/';
    const nonce = window.wpApiSettings?.nonce || '';

    try {
        const res = await fetch(`${apiRoot}scrollcrafter/v1/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
            body: JSON.stringify({ script: scriptContent, mode: 'auto' })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        log('[SC Validation] Response received');
        return await res.json();
    } catch (e) {
        console.error('[SC Validation] Error:', e);
        return { ok: false, errors: [{ message: 'Validation API unreachable', line: 1 }] };
    }
}

// ---------- DSL Language & Theme ----------
const dslLanguage = StreamLanguage.define({
  startState() { return {}; },
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.peek() === '#') { stream.skipToEnd(); return 'comment'; }
    if (stream.peek() === '[') {
      stream.next();
      while (!stream.eol()) { const ch = stream.next(); if (ch === ']') break; }
      return 'keyword';
    }
    if (stream.match(/^[a-zA-Z0-9_.]+(?=:)/)) return 'propertyName';
    if (stream.peek() === ':') { stream.next(); return null; }
    if (stream.match(/^-?\d*\.?\d+/)) return 'number';
    stream.next(); return null;
  },
});

const dslHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: '#ffcc66' },
  { tag: tags.keyword, color: '#7ab6ff', fontWeight: 'bold' },
  { tag: tags.comment, color: '#76839a', fontStyle: 'italic' },
  { tag: tags.number, color: '#89ddff' },
]);

const dslTheme = EditorView.theme({
    '&': { backgroundColor: '#14161d', color: '#f5f5f5', fontSize: '12px' },
    '.cm-content': { fontFamily: 'Menlo, Monaco, Consolas, monospace', padding: '6px 8px' },
    '.cm-scroller': { overflow: 'auto' },
    '.cm-line': { padding: '0 2px' },
    '.cm-tooltip': { backgroundColor: '#21252b', border: '1px solid #181a1f', color: '#f5f5f5' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#2c313a', color: '#fff' }
  }, { dark: true }
);

// ---------- Autocomplete Logic ----------
function getSectionFieldDefs(sectionName) {
  if (!sectionName) return null;
  if (FIELD_DEFS[sectionName]) return FIELD_DEFS[sectionName];
  if (sectionName.startsWith('step.')) return FIELD_DEFS['step.*'];
  return null;
}
function getFieldCompletionsForSection(sectionName) {
  const defs = getSectionFieldDefs(sectionName);
  if (!defs) return [];
  return Object.values(defs).map(def => ({
    label: def.label, type: 'property', detail: def.detail, info: def.info
  }));
}
function withSlashApply(options, slashPos) {
  return options.map((opt) => ({
    ...opt,
    apply: (view, completion, from, to) => {
      view.dispatch({
        changes: { from: slashPos, to: to, insert: completion.label + ' ' },
        selection: { anchor: slashPos + completion.label.length + 1 }
      });
      setTimeout(() => { startCompletion(view); }, 20);
    }
  }));
}
function getCurrentSection(state, pos) {
  const line = state.doc.lineAt(pos);
  for (let ln = line.number; ln >= 1; ln--) {
    const text = state.doc.line(ln).text.trim();
    if (text.startsWith('[') && text.endsWith(']')) {
      let name = text.slice(1, -1).trim().toLowerCase();
      if (name.startsWith('step.')) return { name: 'step.*', inSection: true };
      return { name, inSection: true };
    }
  }
  return { name: null, inSection: false };
}
function filterMissingKeys(sectionName, state, pos) {
  const line = state.doc.lineAt(pos);
  const used = new Set();
  for (let ln = line.number - 1; ln >= 1; ln--) {
    const text = state.doc.line(ln).text.trim();
    if (text.startsWith('[') && text.endsWith(']')) break;
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0) {
       used.add(text.slice(0, colonIndex + 1).trim());
    }
  }
  return getFieldCompletionsForSection(sectionName).filter(entry => !used.has(entry.label));
}

function dslCompletionSource(context) {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const lineText = line.text;
  const textBefore = lineText.slice(0, pos - line.from);

  if (textBefore.includes('#')) return null;
  const { name: sectionName } = getCurrentSection(state, pos);

  // 1. Slash
  const word = context.matchBefore(/\/[a-zA-Z0-9_.]*/);
  if (word) {
      if (!sectionName) return null;
      let options = filterMissingKeys(sectionName, state, pos);
      if (sectionName === 'timeline') options.push({ label: '[step.1]', type: 'keyword', detail: 'New step' });
      if (!options.length) return null;
      return { from: word.from + 1, options: withSlashApply(options, word.from) };
  }
  // 2. Value
  const matchValueContext = textBefore.match(/([a-zA-Z0-9_.]+):\s*([^:]*)$/);
  if (matchValueContext) {
      const rawKey = matchValueContext[1];
      const filterText = matchValueContext[2] || '';
      const defs = getSectionFieldDefs(sectionName);
      if (defs && defs[rawKey] && defs[rawKey].values) {
          return {
              from: pos - filterText.length, 
              options: defs[rawKey].values.map(v => ({ label: v.label, type: 'enum', detail: v.detail, apply: v.label }))
          };
      }
      return null;
  }
  // 3. Keys
  if (textBefore.trim() === '') {
       const options = sectionName ? getFieldCompletionsForSection(sectionName) : [];
       return { from: pos, options: [...options, ...SECTION_HEADERS] };
  }
  if (textBefore.trim().startsWith('[')) return { from: line.from + lineText.indexOf('['), options: SECTION_HEADERS };
  if (sectionName) {
      const w = context.matchBefore(/[a-zA-Z0-9_.]+/);
      if (w) return { from: w.from, options: getFieldCompletionsForSection(sectionName) };
  }
  return null;
}

// ---------- LINTER ENGINE (CORE) ----------
const dslLinter = linter(async (view) => {
  const doc = view.state.doc.toString();
  
  // Aktualizacja Status Bar - "Checking..."
  const statusEl = document.querySelector('.sc-dsl-editor__status-text');
  if (statusEl) {
      statusEl.textContent = 'Checking...';
      statusEl.style.color = '#abb2bf';
  }

  // Pobieramy dane z API
  const data = await fetchValidation(doc);
  
  const diagnostics = [];
  let hasErrors = false;

  const mapDiag = (list, severity) => {
      (list || []).forEach(item => {
          const msg = item.message || String(item);
          let lineNo = parseInt(item.line || 1, 10);
          lineNo = Math.max(Math.min(lineNo, view.state.doc.lines), 1);
          
          const ln = view.state.doc.line(lineNo);
          diagnostics.push({
              from: ln.from,
              to: ln.to,
              severity: severity,
              message: msg,
              source: 'ScrollCrafter'
          });
          if (severity === 'error') hasErrors = true;
      });
  };

  mapDiag(data.errors, 'error');
  mapDiag(data.warnings, 'warning');

  // Aktualizacja globalnego stanu
  lastValidationState = {
      valid: !hasErrors,
      hasCriticalErrors: hasErrors,
      diagnostics: diagnostics,
      rawData: data
  };

  // Aktualizacja Status Bar - Wynik
  if (statusEl) {
      if (hasErrors) {
          const errCount = data.errors ? data.errors.length : 0;
          statusEl.textContent = `Found ${errCount} error(s). Fix them before applying.`;
          statusEl.parentElement.className = 'sc-dsl-editor__status sc-dsl-editor__status--error';
      } else if (data.warnings && data.warnings.length > 0) {
          statusEl.textContent = `Valid (with ${data.warnings.length} warnings).`;
          statusEl.parentElement.className = 'sc-dsl-editor__status sc-dsl-editor__status--warning';
      } else {
          statusEl.textContent = 'Script is valid.';
          statusEl.parentElement.className = 'sc-dsl-editor__status sc-dsl-editor__status--ok';
      }
  }

  return diagnostics;

}, { delay: 500 }); // Szybki feedback (0.5s)


// ---------- Editor Init ----------
let cmView = null;

function createEditor(parentNode, initialDoc) {
  if (cmView) { cmView.destroy(); cmView = null; }

  // Reset stanu przy otwarciu
  lastValidationState = { valid: true, hasCriticalErrors: false, diagnostics: [] };

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, { key: "Tab", run: acceptCompletion }]),
      highlightSpecialChars(),
      drawSelection(),
      lineNumbers(),
      placeholder('Start with [animation]...'),
      dslTheme,
      dslLanguage,
      syntaxHighlighting(dslHighlightStyle),
      autocompletion({ override: [dslCompletionSource], activateOnTyping: true }),
      
      lintGutter(),
      dslLinter, // Linter działa automatycznie w tle
      
      EditorView.lineWrapping
    ]
  });

  cmView = new EditorView({ state, parent: parentNode });
  
  // Wymuś pierwsze sprawdzenie zaraz po otwarciu (bez czekania na pisanie)
  // forceLinting(cmView); 

  return cmView;
}

function getEditorDoc() { return cmView ? cmView.state.doc.toString() : ''; }

// ---------- Elementor UI Integration ----------
(function ($) {
  const MODAL_ID = 'scrollcrafter-dsl-editor';

  const ensureModal = () => {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'sc-dsl-editor';
    modal.innerHTML = `
      <div class="sc-dsl-editor__backdrop"></div>
      <div class="sc-dsl-editor__panel">
        <div class="sc-dsl-editor__header">
          <div class="sc-dsl-editor__title">
            <span class="sc-dsl-editor__title-main">ScrollCrafter DSL Editor</span>
            <span class="sc-dsl-editor__title-sub"></span>
          </div>
          <button type="button" class="sc-dsl-editor__close">&times;</button>
        </div>
        <div class="sc-dsl-editor__body">
          <div class="sc-dsl-editor__editor-container"><div class="sc-dsl-editor__editor" id="sc-dsl-editor-cm"></div></div>
          <div class="sc-dsl-editor__status"><span class="sc-dsl-editor__status-text">Ready</span></div>
        </div>
        <div class="sc-dsl-editor__footer">
          <button type="button" class="elementor-button sc-dsl-editor__btn sc-dsl-editor__btn--ghost sc-dsl-editor__cancel">Cancel</button>
          <button type="button" class="elementor-button elementor-button-default sc-dsl-editor__btn sc-dsl-editor__apply">Apply</button>
          <button type="button" class="elementor-button elementor-button-success sc-dsl-editor__btn sc-dsl-editor__apply-preview">Apply & Preview</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  };

  const openEditorForCurrentElement = () => {
    const panelView = elementor.getPanelView();
    const currentPageView = panelView ? panelView.currentPageView : null;
    if (!currentPageView || !currentPageView.model) return;

    const model = currentPageView.model;
    const settings = model.get('settings');
    const currentScript = settings.get('scrollcrafter_script') || '';
    const elementId = model.get('id');
    const elementType = model.get('widgetType') || model.get('elType') || 'Element';

    const modal = ensureModal();
    const statusText = modal.querySelector('.sc-dsl-editor__status-text');
    modal.querySelector('.sc-dsl-editor__title-sub').textContent = `${elementType} (${elementId})`;
    
    // Reset statusu UI
    statusText.textContent = 'Checking...';
    modal.querySelector('.sc-dsl-editor__status').className = 'sc-dsl-editor__status';

    createEditor(modal.querySelector('#sc-dsl-editor-cm'), currentScript);

    const close = () => modal.classList.remove('sc-dsl-editor--open');
    
    const bindClose = (selector) => {
        const el = modal.querySelector(selector);
        el.onclick = close;
    };
    bindClose('.sc-dsl-editor__close');
    bindClose('.sc-dsl-editor__cancel');
    bindClose('.sc-dsl-editor__backdrop');

    // --- LOGIKA PRZYCISKU (NOWA) ---
    // Nie robimy fetch(), ufamy Linterowi
    modal.querySelector('.sc-dsl-editor__apply-preview').onclick = () => {
      const currentCode = getEditorDoc();

      // Sprawdzamy ostatni znany stan walidacji
      if (lastValidationState.hasCriticalErrors) {
          // Zablokuj zapis, pokaż alert lub scrolluj do błędu
          log('[SC Editor] Critical errors found, blocking apply.');
          const firstErr = lastValidationState.diagnostics.find(d => d.severity === 'error');
          if (firstErr && cmView) {
              // Scroll do błędu
              cmView.dispatch({
                  selection: { anchor: firstErr.from },
                  scrollIntoView: true
              });
              // Focus
              cmView.focus();
          }
          // Animacja błędu
          modal.classList.add('sc-shake');
          setTimeout(() => modal.classList.remove('sc-shake'), 500);
          return;
      }

      // Jeśli OK lub tylko Warningi -> Zapisz
      settings.set('scrollcrafter_script', currentCode);
      if (model.trigger) model.trigger('change', model);
      if (currentPageView.render) currentPageView.render();
      log('[SC Editor] Script applied to element', elementId);

      statusText.textContent = 'Applied!';
      setTimeout(close, 1500);
    };
    
    // Apply Only (bez preview)
    modal.querySelector('.sc-dsl-editor__apply').onclick = modal.querySelector('.sc-dsl-editor__apply-preview').onclick;

    modal.classList.add('sc-dsl-editor--open');
  };

  $(window).on('elementor/init', () => {
    if (elementor.channels && elementor.channels.editor) {
      elementor.channels.editor.on('scrollcrafter:open_editor', openEditorForCurrentElement);
    }
  });

})(jQuery);
