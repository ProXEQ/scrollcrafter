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

function insertAtCursor(view, text) {
    const state = view.state;
    const range = state.selection.main;
    view.dispatch({
        changes: { from: range.from, to: range.to, insert: text },
        selection: { anchor: range.from + text.length },
        scrollIntoView: true
    });
    view.focus();
}

// --- Generator HTML Cheat Sheet ---
function renderCheatSheet(container, view) {
    if (!FIELD_DEFS) return;

    let html = '';
    const sections = [
        { key: 'animation', label: '[animation]' },
        { key: 'scroll', label: '[scroll]' },
        { key: 'timeline', label: '[timeline]' },
        { key: 'step.*', label: '[step]' } // Dla timeline
    ];

    sections.forEach(sec => {
        const fields = FIELD_DEFS[sec.key];
        if (!fields) return;

        html += `<div class="sc-cs-section">`;
        html += `<div class="sc-cs-title">${sec.label}</div>`;
        
        Object.entries(fields).forEach(([fieldName, def]) => {
            html += `<div class="sc-cs-item" data-insert="${fieldName}: ">
                        ${fieldName} <span>${def.detail || ''}</span>
                     </div>`;
        });

        html += `</div>`;
    });

    html += `<div class="sc-cs-section">
                <div class="sc-cs-title">Snippets</div>
                <div class="sc-cs-item" data-insert="[animation]\ntype: from\nfrom: opacity=0, y=50\nduration: 1\n">Fade In Up</div>
                <div class="sc-cs-item" data-insert="[scroll]\nstart: top 80%\nend: bottom 20%\nscrub: 1\nmarkers: true\n">Scroll Trigger</div>
             </div>`;

    container.innerHTML = html;
    container.querySelectorAll('.sc-cs-item').forEach(el => {
        el.addEventListener('click', () => {
            const textToInsert = el.dataset.insert;
            insertAtCursor(view, textToInsert);
        });
    });
}

// --- Inteligentny Cheat Sheet: Wykrywanie użytych kluczy ---
function updateCheatSheetState(view) {
    const state = view.state;
    const doc = state.doc;
    const selection = state.selection.main;
    
    // 1. Znajdź sekcję, w której jest kursor
    // (Używamy istniejącej logiki z getCurrentSection, ale uproszczonej)
    let currentSectionName = null;
    let usedKeys = new Set();
    
    // Szukamy nagłówka sekcji W GÓRĘ od kursora
    const currentLineNo = doc.lineAt(selection.head).number;
    
    let sectionStartLine = -1;
    let sectionEndLine = -1;

    // A. Znajdź początek sekcji [nazwa]
    for (let l = currentLineNo; l >= 1; l--) {
        const lineText = doc.line(l).text.trim();
        if (lineText.startsWith('[') && lineText.endsWith(']')) {
            currentSectionName = lineText.slice(1, -1).trim().toLowerCase();
            sectionStartLine = l;
            break;
        }
    }

    // B. Jeśli znaleźliśmy sekcję, przeskanujmy ją w dół aż do następnej sekcji lub końca
    if (currentSectionName) {
        // Normalizacja nazwy dla steps (step.1 -> step.*)
        if (currentSectionName.startsWith('step.')) currentSectionName = 'step.*';

        // Skanujemy od startu sekcji w dół
        for (let l = sectionStartLine + 1; l <= doc.lines; l++) {
            const lineText = doc.line(l).text.trim();
            // Stop jeśli nowa sekcja
            if (lineText.startsWith('[') && lineText.endsWith(']')) {
                break;
            }
            // Wyciągnij klucz (słowo przed dwukropkiem)
            const match = lineText.match(/^([a-zA-Z0-9_.]+):/);
            if (match) {
                usedKeys.add(match[1]); // np. "duration"
            }
        }
    }

    // 2. Aktualizuj UI w panelu bocznym
    const sidebar = document.getElementById('sc-cs-content');
    if (!sidebar) return;

    // Reset: usuń klasę is-used ze wszystkich
    sidebar.querySelectorAll('.sc-cs-item').forEach(el => el.classList.remove('is-used'));

    // Jeśli nie jesteśmy w żadnej sekcji, nic nie wyszarzamy (lub wszystko - kwestia decyzji)
    if (!currentSectionName) return;
    const sectionHeaders = Array.from(sidebar.querySelectorAll('.sc-cs-title'));
    const activeSidebarHeader = sectionHeaders.find(h => h.textContent.includes(currentSectionName.replace('.*', '')));
    
    if (activeSidebarHeader) {
        const parentSection = activeSidebarHeader.parentElement;
        const items = parentSection.querySelectorAll('.sc-cs-item');
        
        items.forEach(item => {
            // dataset.insert wygląda np. tak: "duration: "
            const insertText = item.dataset.insert || '';
            const keyName = insertText.split(':')[0].trim();
            
            if (usedKeys.has(keyName)) {
                item.classList.add('is-used');
            }
        });
    }
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
  
  // Update Status Bar
  const statusEl = document.querySelector('.sc-dsl-editor__status-text');
  if (statusEl) {
      statusEl.textContent = 'Checking...';
      statusEl.style.color = '#8b949e';
  }

  const data = await fetchValidation(doc);
  
  if (DEBUG) console.log('[Linter API Response]', data);

  const diagnostics = [];
  let hasErrors = false;

  const mapDiag = (list, severity) => {
      (list || []).forEach(item => {
          const msg = item.message || String(item);
          let lineNo = parseInt(item.line, 10);
          if (!lineNo || isNaN(lineNo) || lineNo < 1) {
              const match = msg.match(/'([^']+)'/) || msg.match(/"([^"]+)"/);
              if (match) {
                  const docString = view.state.doc.toString();
                  const foundIdx = docString.indexOf(match[1]);
                  if (foundIdx !== -1) {
                      lineNo = view.state.doc.lineAt(foundIdx).number;
                  } else {
                      lineNo = 1;
                  }
              } else {
                  lineNo = 1;
              }
          }

          const totalLines = view.state.doc.lines;
          if (lineNo > totalLines) lineNo = totalLines;

          const ln = view.state.doc.line(lineNo);
          const lineText = ln.text;

          let from = ln.from + (lineText.length - lineText.trimStart().length);
          let to = ln.to;

          const quotedWord = msg.match(/'([^']+)'/) || msg.match(/"([^"]+)"/);
          if (quotedWord) {
              const word = quotedWord[1];
              const idx = lineText.indexOf(word);
              if (idx !== -1) {
                  from = ln.from + idx;
                  to = from + word.length;
              }
          } else if (msg.toLowerCase().includes('section')) {
              const bracketMatch = lineText.match(/\[.*?\]/);
              if (bracketMatch) {
                  from = ln.from + bracketMatch.index;
                  to = from + bracketMatch[0].length;
              }
          }

          diagnostics.push({
              from: from,
              to: to,
              severity: severity,
              message: msg,
              source: 'ScrollCrafter'
          });
          
          if (severity === 'error') hasErrors = true;
      });
  };

  mapDiag(data.errors, 'error');
  mapDiag(data.warnings, 'warning');

  // Update Global State
  lastValidationState = {
      valid: !hasErrors,
      hasCriticalErrors: hasErrors,
      diagnostics: diagnostics,
      rawData: data
  };

  // Update UI Status
  if (statusEl) {
      const parent = statusEl.parentElement;
      if (hasErrors) {
          statusEl.textContent = `Found ${data.errors.length} error(s).`;
          parent.className = 'sc-dsl-editor__status sc-dsl-editor__status--error';
      } else if (data.warnings && data.warnings.length > 0) {
          statusEl.textContent = `Valid (${data.warnings.length} warnings).`;
          parent.className = 'sc-dsl-editor__status sc-dsl-editor__status--warning';
      } else {
          statusEl.textContent = 'Script is valid.';
          parent.className = 'sc-dsl-editor__status sc-dsl-editor__status--ok';
      }
  }

  return diagnostics;

}, { delay: 500 });


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
      EditorView.updateListener.of((update) => {
          if (update.docChanged || update.selectionSet) {
              updateCheatSheetState(update.view);
          }
      }),
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
            <span class="sc-dsl-editor__title-main">ScrollCrafter DSL</span>
            <span class="sc-dsl-editor__title-sub"></span>
          </div>
          <button type="button" class="sc-dsl-editor__close">&times;</button>
        </div>
        
        <div class="sc-dsl-editor__body">
            <!-- LEWA STRONA: EDYTOR -->
            <div class="sc-dsl-editor__main-area">
                <div class="sc-dsl-editor__editor-container">
                    <div class="sc-dsl-editor__editor" id="sc-dsl-editor-cm"></div>
                </div>
                <div class="sc-dsl-editor__status"><span class="sc-dsl-editor__status-text">Ready</span></div>
            </div>

            <!-- PRAWA STRONA: CHEAT SHEET -->
            <div class="sc-dsl-editor__sidebar">
                <div class="sc-dsl-editor__sidebar-header">
                    Cheat Sheet
                    <!-- Opcjonalnie: ikona help -->
                </div>
                <div class="sc-dsl-editor__sidebar-content" id="sc-cs-content">
                    <!-- Wygenerowane przez JS -->
                </div>
            </div>
        </div>

        <div class="sc-dsl-editor__footer">
          <button type="button" class="elementor-button sc-dsl-editor__btn sc-dsl-editor__btn--ghost sc-dsl-editor__cancel">Cancel</button>
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

    const cmInstance = createEditor(modal.querySelector('#sc-dsl-editor-cm'), currentScript);

    renderCheatSheet(modal.querySelector('#sc-cs-content'), cmInstance);

    updateCheatSheetState(cmInstance);

    const close = () => modal.classList.remove('sc-dsl-editor--open');
    
    const bindClose = (selector) => {
        const el = modal.querySelector(selector);
        el.onclick = close;
    };
    bindClose('.sc-dsl-editor__close');
    bindClose('.sc-dsl-editor__cancel');
    bindClose('.sc-dsl-editor__backdrop');

        // Helper function to trigger Elementor UI update
    const triggerElementorUpdate = (newCode) => {
        // 1. Aktualizacja modelu (Backbone)
        settings.set('scrollcrafter_script', newCode);
        
        // 2. Znalezienie fizycznego pola textarea w panelu
        // Szukamy aktywnej kontrolki w panelu, która odpowiada naszemu ustawieniu
        // Zazwyczaj ma atrybut data-setting="scrollcrafter_script"
        const controlTextarea = document.querySelector('.elementor-control-scrollcrafter_script textarea, textarea[data-setting="scrollcrafter_script"]');
        
        if (controlTextarea) {
            controlTextarea.value = newCode;
            // Kluczowe: Symulacja wpisywania tekstu przez użytkownika
            controlTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            controlTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // Fallback: Jeśli kontrolka nie jest w DOM (np. inna zakładka),
            // musimy wymusić flagę 'isDirty' w edytorze
            if (window.elementor && elementor.saver) {
                elementor.saver.setFlag('edit'); 
            }
        }
    };

    const handleApply = () => {
      const currentCode = getEditorDoc();

      // 1. Krytyczne Błędy (Errors) - BLOKADA
      if (lastValidationState.hasCriticalErrors) {
          log('[SC Editor] Critical errors found, blocking apply.');
          
          // Focus na pierwszy błąd
          const firstErr = lastValidationState.diagnostics.find(d => d.severity === 'error');
          if (firstErr && cmView) {
              cmView.dispatch({
                  selection: { anchor: firstErr.from },
                  scrollIntoView: true
              });
              cmView.focus();
          }
          
          // Efekt trzęsienia i komunikat
          const panel = modal.querySelector('.sc-dsl-editor__panel');
          panel.classList.add('sc-shake');
          setTimeout(() => panel.classList.remove('sc-shake'), 500);
          
          statusText.textContent = 'Fix errors before saving!';
          statusText.style.color = '#e06c75'; // Czerwony
          return;
      }

      // 2. Ostrzeżenia (Warnings) - POTWIERDZENIE
      const warnings = lastValidationState.diagnostics.filter(d => d.severity === 'warning');
      if (warnings.length > 0) {
          // Prosty, natywny confirm jest najbardziej niezawodny
          const proceed = confirm(`⚠️ Your code has ${warnings.length} warning(s).\n\nThis might cause unexpected behavior. Are you sure you want to save?`);
          
          if (!proceed) {
              // Focus na pierwszy warning
              if (cmView) {
                  cmView.dispatch({
                      selection: { anchor: warnings[0].from },
                      scrollIntoView: true
                  });
              }
              return; // Anuluj zapis
          }
      }

      // 3. Sukces - Zapisz i powiadom Elementora
      triggerElementorUpdate(currentCode);

      // Wymuś odświeżenie podglądu
      if (model.trigger) model.trigger('change', model);
      if (currentPageView.render) currentPageView.render();
      
      log('[SC Editor] Script applied to element', elementId);

      statusText.textContent = 'Applied!';
      statusText.style.color = '#98c379'; // Zielony
      
      setTimeout(close, 500);
    };


    // Podpięcie handlerów
    modal.querySelector('.sc-dsl-editor__apply-preview').onclick = handleApply;

    modal.classList.add('sc-dsl-editor--open');
  };

  $(window).on('elementor/init', () => {
    if (elementor.channels && elementor.channels.editor) {
      elementor.channels.editor.on('scrollcrafter:open_editor', openEditorForCurrentElement);
    }
  });

})(jQuery);
