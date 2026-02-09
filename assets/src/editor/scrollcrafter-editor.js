import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightSpecialChars, drawSelection, lineNumbers, placeholder } from '@codemirror/view';
import { history, historyKeymap, defaultKeymap } from '@codemirror/commands';
import { autocompletion, acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle, StreamLanguage } from '@codemirror/language';
import { tags } from '@codemirror/highlight';
import { linter, lintGutter } from '@codemirror/lint';
import { FIELD_DEFS, SECTION_HEADERS } from './field-defs';

// Używamy globalnego wp.i18n
const { __, _n, sprintf } = wp.i18n;

const DEBUG = !!window.ScrollCrafterConfig?.debug;
const log = (...args) => {
  if (DEBUG) console.log('[SC Editor]', ...args);
  // Always log registration and critical triggers even in non-debug for troubleshooting
  if (args[0] && (args[0].includes('Init') || args[0].includes('Triggered'))) {
    console.log('[SC Editor-Critical]', ...args);
  }
};

log('Script loaded. Waiting for elementor/init...');

const BREAKPOINTS = window.ScrollCrafterConfig?.breakpoints || [];
const BREAKPOINT_SLUGS = Array.isArray(BREAKPOINTS)
  ? BREAKPOINTS.map(bp => bp.key)
  : Object.keys(BREAKPOINTS);

/**
 * Detect active breakpoint based on iframe/viewport width
 * @param {HTMLIFrameElement} iframe - The Elementor preview iframe
 * @returns {string} - Active breakpoint slug (e.g., 'mobile', 'tablet', 'desktop')
 */
function getActiveBreakpoint(iframe) {
  const width = iframe?.offsetWidth || window.innerWidth;

  // BREAKPOINTS is sorted by value ascending: [{key: 'mobile', value: 767}, {key: 'tablet', value: 1024}]
  if (Array.isArray(BREAKPOINTS) && BREAKPOINTS.length > 0) {
    for (const bp of BREAKPOINTS) {
      if (width <= bp.value) {
        return bp.key;
      }
    }
  }

  return 'desktop';
}

function getDynamicHeaders() {
  let headers = [...SECTION_HEADERS];
  const responsiveSections = ['animation', 'scroll', 'step.1'];
  BREAKPOINT_SLUGS.forEach(slug => {
    responsiveSections.forEach(secKey => {
      headers.push({
        label: `[${secKey} @${slug}]`,
        type: 'keyword',
        detail: `Responsive: ${slug}`,
        boost: -1
      });
    });
  });
  return headers;
}

let lastValidationState = { valid: true, hasCriticalErrors: false, diagnostics: [] };
const validationCache = new Map();

async function fetchValidation(scriptContent, options = {}) {
  const isLintOnly = options.lintOnly || false;
  const apiRoot = window.wpApiSettings?.root || '/wp-json/';
  const nonce = window.wpApiSettings?.nonce || '';

  // Use session cache for linting to avoid redundant calls
  const cacheKey = `${isLintOnly ? 'lint:' : 'full:'}${scriptContent}`;
  if (validationCache.has(cacheKey)) {
    if (DEBUG) console.log('[SC Cache] Returning cached result');
    return validationCache.get(cacheKey);
  }

  try {
    const res = await fetch(`${apiRoot}scrollcrafter/v1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
      body: JSON.stringify({
        script: scriptContent,
        mode: options.mode || 'auto',
        lint_only: isLintOnly,
        widget_id: options.widgetId || 'preview'
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Cache the result
    validationCache.set(cacheKey, data);
    return data;
  } catch (e) {
    console.error('[SC Validation] Error:', e);
    return { ok: false, errors: [{ message: 'Validation API unreachable', line: 1 }] };
  }
}

const dslLanguage = StreamLanguage.define({
  startState() { return {}; },
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/^\/\//)) { stream.skipToEnd(); return 'comment'; }
    if (stream.peek() === '[') {
      stream.next();
      while (!stream.eol()) { const ch = stream.next(); if (ch === ']') break; }
      return 'keyword';
    }
    if (stream.match(/^[a-zA-Z0-9_.]+(?=:)/)) return 'propertyName';
    if (stream.match(/^#[a-fA-F0-9]{3,6}\b/)) return 'atom';
    if (stream.match(/^#[a-zA-Z0-9_-]+/)) return 'string';
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
  { tag: tags.atom, color: '#c678dd' },
  { tag: tags.string, color: '#98c379' },
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

function getSectionFieldDefs(sectionName) {
  if (!sectionName) return null;
  let baseName = sectionName.split('@')[0].trim();
  if (FIELD_DEFS[baseName]) return FIELD_DEFS[baseName];
  if (baseName.startsWith('step.')) return FIELD_DEFS['step.*'];
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

function renderCheatSheet(container, view) {
  if (!container || !FIELD_DEFS) return; // Zabezpieczenie przed null

  let html = '';
  const sections = [
    { key: 'animation', label: '[animation]' },
    { key: 'scroll', label: '[scroll]' },
    { key: 'timeline', label: '[timeline]' },
    { key: 'step.*', label: '[step]' }
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

  const bpList = BREAKPOINT_SLUGS.length ? BREAKPOINT_SLUGS.join(', ') : 'No breakpoints defined';
  html += `<div class="sc-cs-section">
                <div class="sc-cs-title">Responsive (@)</div>
                <div class="sc-cs-info" style="font-size:10px; color:#aaa; margin-bottom:5px;">Available: ${bpList}</div>
                <div class="sc-cs-item" data-insert="[animation @mobile]\n">Override Animation</div>
                <div class="sc-cs-item" data-insert="[scroll @mobile]\n">Override Scroll</div>
             </div>`;

  // New Conditions section
  html += `<div class="sc-cs-section">
                <div class="sc-cs-title">Conditions</div>
                <div class="sc-cs-item" data-insert="[animation @mobile @tablet]\nfrom: opacity=0\n">OR: Mobile or Tablet</div>
                <div class="sc-cs-item" data-insert="[disable @mobile]\n">Disable on Mobile</div>
                <div class="sc-cs-item" data-insert="[animation @reduced-motion]\nfrom: opacity=0\nduration: 0.2\n">@reduced-motion (a11y)</div>
             </div>`;

  html += `<div class="sc-cs-section">
                <div class="sc-cs-title">Snippets</div>
                <div class="sc-cs-item" data-insert="[animation]\ntype: from\nfrom: opacity=0, y=50\nduration: 1\n">Fade In Up</div>
                <div class="sc-cs-item" data-insert="[scroll]\nstart: top 80%\nend: bottom 20%\nscrub: 1\nmarkers: true\n">Scroll Trigger</div>
                <div class="sc-cs-item" data-insert="[animation]\ntype: from\nfrom: opacity=0\n\n[animation @mobile]\nfrom: opacity=1\n">Responsive Fade</div>
             </div>`;

  container.innerHTML = html;
  container.querySelectorAll('.sc-cs-item').forEach(el => {
    el.addEventListener('click', () => {
      const textToInsert = el.dataset.insert;
      insertAtCursor(view, textToInsert);
    });
  });
}

function updateCheatSheetState(view) {
  const state = view.state;
  const doc = state.doc;
  const selection = state.selection.main;
  let currentSectionName = null;
  let usedKeys = new Set();
  const currentLineNo = doc.lineAt(selection.head).number;
  let sectionStartLine = -1;

  for (let l = currentLineNo; l >= 1; l--) {
    const lineText = doc.line(l).text.trim();
    if (lineText.startsWith('[') && lineText.endsWith(']')) {
      currentSectionName = lineText.slice(1, -1).trim().toLowerCase();
      sectionStartLine = l;
      break;
    }
  }

  if (currentSectionName) {
    let baseName = currentSectionName.split('@')[0].trim();
    if (baseName.startsWith('step.')) baseName = 'step.*';

    for (let l = sectionStartLine + 1; l <= doc.lines; l++) {
      const lineText = doc.line(l).text.trim();
      if (lineText.startsWith('[') && lineText.endsWith(']')) break;
      const match = lineText.match(/^([a-zA-Z0-9_.]+):/);
      if (match) usedKeys.add(match[1]);
    }
    currentSectionName = baseName;
  }

  const sidebar = document.getElementById('sc-cs-content');
  if (!sidebar) return;

  sidebar.querySelectorAll('.sc-cs-item').forEach(el => el.classList.remove('is-used'));

  if (!currentSectionName) return;
  const sectionHeaders = Array.from(sidebar.querySelectorAll('.sc-cs-title'));
  const activeSidebarHeader = sectionHeaders.find(h => h.textContent.includes(currentSectionName));

  if (activeSidebarHeader) {
    const parentSection = activeSidebarHeader.parentElement;
    const items = parentSection.querySelectorAll('.sc-cs-item');
    items.forEach(item => {
      const insertText = item.dataset.insert || '';
      const keyName = insertText.split(':')[0].trim();
      if (usedKeys.has(keyName)) item.classList.add('is-used');
    });
  }
}

function getCurrentSection(state, pos) {
  const line = state.doc.lineAt(pos);
  for (let ln = line.number; ln >= 1; ln--) {
    const text = state.doc.line(ln).text.trim();
    if (text.startsWith('[') && text.endsWith(']')) {
      let name = text.slice(1, -1).trim().toLowerCase();
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

  const { name: sectionName } = getCurrentSection(state, pos);

  // Handle @ breakpoint tag completions in section headers like [animation @...]
  // or [disable @...]
  const atMatch = context.matchBefore(/@[a-zA-Z0-9_-]*/);
  if (atMatch && textBefore.includes('[')) {
    // Build breakpoint options
    const bpOptions = BREAKPOINT_SLUGS.map(slug => ({
      label: '@' + slug,
      type: 'variable',
      detail: `Breakpoint: ${slug}`,
      boost: 2
    }));

    // Add special condition tags
    const specialTags = [
      { label: '@reduced-motion', type: 'variable', detail: 'Accessibility: prefers-reduced-motion', boost: 1 },
      { label: '@dark', type: 'variable', detail: 'Pro: Dark mode', boost: 0 },
      { label: '@retina', type: 'variable', detail: 'Pro: High DPI display', boost: 0 },
    ];

    const allOptions = [...bpOptions, ...specialTags];

    return {
      from: atMatch.from,
      options: allOptions
    };
  }

  // Handle /slash command completions
  const word = context.matchBefore(/\/[a-zA-Z0-9_.]*/);
  if (word) {
    if (!sectionName) return null;
    let options = filterMissingKeys(sectionName, state, pos);
    if (sectionName.startsWith('timeline')) {
      options.push({ label: '[step.1]', type: 'keyword', detail: 'New step' });
    }
    if (!options.length) return null;
    return { from: word.from + 1, options: withSlashApply(options, word.from) };
  }

  // Handle value completions (e.g., from: opacity, ease: power1.out)
  const matchValueContext = textBefore.match(/([a-zA-Z0-9_.]+):\s*([^:]*)$/);
  if (matchValueContext) {
    const rawKey = matchValueContext[1];
    const filterText = matchValueContext[2] || '';
    const defs = getSectionFieldDefs(sectionName);

    if (defs && defs[rawKey] && defs[rawKey].values) {
      // Check if this is a from/to/startAt field - these need special handling for CSS properties
      const isCssPropertyField = ['from', 'to', 'startAt'].includes(rawKey);

      // Find what's after the last comma (for multi-property fields)
      const lastCommaIdx = filterText.lastIndexOf(',');
      const currentWord = lastCommaIdx >= 0 ? filterText.slice(lastCommaIdx + 1).trim() : filterText.trim();

      const options = defs[rawKey].values.map(v => {
        if (isCssPropertyField) {
          // For CSS properties, insert "property=" and keep cursor after =
          return {
            label: v.label,
            type: 'variable',
            detail: v.detail,
            info: v.info,
            apply: (view, completion, from, to) => {
              const insertText = completion.label + '=';
              view.dispatch({
                changes: { from: pos - currentWord.length, to: pos, insert: insertText },
                selection: { anchor: pos - currentWord.length + insertText.length }
              });
            }
          };
        } else {
          return { label: v.label, type: 'enum', detail: v.detail, apply: v.label };
        }
      });

      return {
        from: pos - currentWord.length,
        options: options.filter(opt => opt.label.toLowerCase().startsWith(currentWord.toLowerCase()))
      };
    }
    return null;
  }

  // Block header/field suggestions if typing a CSS selector (e.g., #myElement)
  if (textBefore.includes('#')) return null;

  if (textBefore.trim() === '') {
    const options = sectionName ? getFieldCompletionsForSection(sectionName) : [];
    const headers = getDynamicHeaders();
    return { from: pos, options: [...options, ...headers] };
  }

  if (textBefore.trim().startsWith('[')) {
    return { from: line.from + lineText.indexOf('['), options: getDynamicHeaders() };
  }

  if (sectionName) {
    const w = context.matchBefore(/[a-zA-Z0-9_.]+/);
    if (w) return { from: w.from, options: getFieldCompletionsForSection(sectionName) };
  }
  return null;
}

const dslLinter = linter(async (view) => {
  const doc = view.state.doc.toString();
  const statusEl = document.querySelector('.sc-dsl-editor__status-text');

  // Bezpieczne pobranie ikony (jeśli istnieje)
  let iconEl = null;
  if (statusEl) {
    iconEl = statusEl.parentElement.querySelector('.sc-dsl-editor__status-icon');
  }

  if (statusEl) {
    statusEl.textContent = __('Checking...', 'scrollcrafter');
    statusEl.style.color = '#8b949e';
  }

  // Use lightweight linting during typing
  const data = await fetchValidation(doc, { lintOnly: true });
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
      if (lineNo > view.state.doc.lines) lineNo = view.state.doc.lines;

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

      diagnostics.push({ from, to, severity, message: msg, source: 'ScrollCrafter' });
      if (severity === 'error') hasErrors = true;
    });
  };

  mapDiag(data.errors, 'error');
  mapDiag(data.warnings, 'warning');

  lastValidationState = { valid: !hasErrors, hasCriticalErrors: hasErrors, diagnostics, rawData: data };

  if (statusEl) {
    const parent = statusEl.closest('.sc-dsl-editor__status'); // Pobieramy kontener nadrzędny
    if (hasErrors) {
      const errorMsg = sprintf(
        _n('Found %d error.', 'Found %d errors.', data.errors.length, 'scrollcrafter'),
        data.errors.length
      );
      statusEl.textContent = errorMsg;
      if (iconEl) iconEl.textContent = '✕';
      if (parent) parent.className = 'sc-dsl-editor__status sc-dsl-editor__status--error';
    } else if (data.warnings && data.warnings.length > 0) {
      const warnMsg = sprintf(
        _n('Valid (%d warning).', 'Valid (%d warnings).', data.warnings.length, 'scrollcrafter'),
        data.warnings.length
      );
      statusEl.textContent = warnMsg;
      if (iconEl) iconEl.textContent = '⚠';
      if (parent) parent.className = 'sc-dsl-editor__status sc-dsl-editor__status--warning';
    } else {
      statusEl.textContent = __('Script is valid.', 'scrollcrafter');
      if (iconEl) iconEl.textContent = '✔';
      if (parent) parent.className = 'sc-dsl-editor__status sc-dsl-editor__status--ok';
    }
  }
  return diagnostics;
}, { delay: 500 });

let cmView = null;
function createEditor(parentNode, initialDoc) {
  if (cmView) { cmView.destroy(); cmView = null; }
  lastValidationState = { valid: true, hasCriticalErrors: false, diagnostics: [] };

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, { key: "Tab", run: acceptCompletion }]),
      highlightSpecialChars(),
      drawSelection(),
      lineNumbers(),
      placeholder(__('Start with [animation]...', 'scrollcrafter')),
      dslTheme,
      dslLanguage,
      syntaxHighlighting(dslHighlightStyle),
      autocompletion({
        override: [dslCompletionSource],
        activateOnTyping: true,
        maxRenderedOptions: 20,
        icons: true,
        addToOptions: [
          {
            render: function (completion, state) {
              if (!completion.info) return null;
              const el = document.createElement('div');
              el.className = 'sc-completion-info-inline';
              el.textContent = typeof completion.info === 'function' ? '' : completion.info;
              return el;
            },
            position: 50
          }
        ]
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged || update.selectionSet) updateCheatSheetState(update.view);
      }),
      // Re-trigger autocomplete after typing comma (for multi-value CSS properties)
      EditorView.inputHandler.of((view, from, to, text) => {
        if (text === ',') {
          setTimeout(() => {
            const pos = view.state.selection.main.head;
            const line = view.state.doc.lineAt(pos);
            const textBeforeCursor = line.text.slice(0, pos - line.from);
            // Match from:/to:/startAt: followed by any content ending with comma
            if (textBeforeCursor.match(/(?:from|to|startAt):\s*.+,\s*$/)) {
              startCompletion(view);
            }
          }, 100);
        }
        return false;
      }),
      lintGutter(),
      dslLinter,
      EditorView.lineWrapping
    ]
  });
  cmView = new EditorView({ state, parent: parentNode });
  return cmView;
}
function getEditorDoc() { return cmView ? cmView.state.doc.toString() : ''; }

(function ($) {
  const MODAL_ID = 'scrollcrafter-dsl-editor';
  const ensureModal = () => {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'sc-dsl-editor';

    // POPRAWIONA STRUKTURA HTML
    modal.innerHTML = `
      <div class="sc-dsl-editor__backdrop"></div>
      <div class="sc-dsl-editor__panel">
        
        <!-- HEADER -->
          <div class="sc-dsl-editor__header">
          <div class="sc-dsl-editor__title">
            <span class="sc-dsl-editor__title-main">ScrollCrafter DSL</span>
            <span class="sc-dsl-editor__title-sub"></span>
          </div>
          <div class="sc-dsl-editor__header-actions">
              <button type="button" class="sc-dsl-editor__btn-icon sc-dsl-editor__markers-toggle" title="${__('Show GSAP Markers (Ctrl+K)', 'scrollcrafter')}">📍</button>
              <button type="button" class="sc-dsl-editor__btn-icon sc-dsl-editor__ghost-toggle" title="${__('Ghost Mode (Ctrl+G)', 'scrollcrafter')}">👁</button>
              <button type="button" class="sc-dsl-editor__btn-icon sc-dsl-editor__minimize" title="${__('Minimize (Ctrl+M)', 'scrollcrafter')}">－</button>
              <button type="button" class="sc-dsl-editor__close" title="${__('Close', 'scrollcrafter')}">&times;</button>
          </div>
        </div>
        
        <!-- BODY: EDYTOR + SIDEBAR -->
        <div class="sc-dsl-editor__body">
            <div class="sc-dsl-editor__main-area">
                <div class="sc-dsl-editor__editor-container">
                    <div class="sc-dsl-editor__editor" id="sc-dsl-editor-cm"></div>
                </div>
                <!-- Status został przeniesiony do footera -->
            </div>
            
            <!-- PRZYWRÓCONY SIDEBAR -->
            <div class="sc-dsl-editor__sidebar">
                <div class="sc-dsl-editor__sidebar-header">${__('Cheat Sheet', 'scrollcrafter')}</div>
                <div class="sc-dsl-editor__sidebar-content" id="sc-cs-content"></div>
            </div>
        </div>
        
        <!-- FOOTER: STATUS + BUTTONY -->
        <div class="sc-dsl-editor__footer">
          <div class="sc-dsl-editor__status">
            <span class="sc-dsl-editor__status-icon">●</span>
            <span class="sc-dsl-editor__status-text">${__('Ready', 'scrollcrafter')}</span>
          </div>
          <div class="sc-dsl-editor__actions">
              <button type="button" class="elementor-button sc-dsl-editor__btn sc-dsl-editor__btn--ghost sc-dsl-editor__cancel">${__('Cancel', 'scrollcrafter')}</button>
              <button type="button" class="elementor-button sc-dsl-editor__btn sc-dsl-editor__btn--preview sc-dsl-editor__preview">▶ ${__('Preview', 'scrollcrafter')}</button>
              <button type="button" class="elementor-button elementor-button-success sc-dsl-editor__btn sc-dsl-editor__apply">${__('Apply', 'scrollcrafter')}</button>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  };

  const openEditorForCurrentElement = () => {
    log('Triggered: openEditorForCurrentElement');
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
    const statusIcon = modal.querySelector('.sc-dsl-editor__status-icon');

    modal.querySelector('.sc-dsl-editor__title-sub').textContent = `${elementType} (${elementId})`;

    statusText.textContent = __('Checking...', 'scrollcrafter');
    if (statusIcon) statusIcon.textContent = '●';

    // Reset klasy statusu
    const statusContainer = modal.querySelector('.sc-dsl-editor__status');
    if (statusContainer) statusContainer.className = 'sc-dsl-editor__status';

    const cmInstance = createEditor(modal.querySelector('#sc-dsl-editor-cm'), currentScript);
    renderCheatSheet(modal.querySelector('#sc-cs-content'), cmInstance);
    updateCheatSheetState(cmInstance);

    const handleGlobalKey = (e) => {
      // ESC handling
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (modal.classList.contains('sc-dsl-editor--ghost')) {
          modal.classList.remove('sc-dsl-editor--ghost');
          return;
        }
        if (modal.classList.contains('sc-dsl-editor--minimized')) {
          modal.classList.remove('sc-dsl-editor--minimized');
          return;
        }

        if (confirm(__('Are you sure you want to discard changes and close?', 'scrollcrafter'))) {
          close();
        }
      }

      // Keyboard Shortcuts (Ctrl/Cmd + ...)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          toggleGhost();
        }
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          toggleMinimize();
        }
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleApply();
        }
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          toggleMarkers();
        }
      }
    };

    const close = () => {
      modal.classList.remove('sc-dsl-editor--open');
      window.removeEventListener('keydown', handleGlobalKey, { capture: true });
    };

    const bindClose = (selector) => {
      const el = modal.querySelector(selector);
      if (el) el.onclick = close;
    };

    const triggerElementorUpdate = (newCode) => {
      settings.set('scrollcrafter_script', newCode);
      const controlTextarea = document.querySelector('.elementor-control-scrollcrafter_script textarea, textarea[data-setting="scrollcrafter_script"]');
      if (controlTextarea) {
        controlTextarea.value = newCode;
        controlTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        controlTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        if (window.$e && window.$e.run) {
          window.$e.run('document/save/set-is-modified', { status: true });
        }
      }
    };

    const toggleGhost = () => {
      modal.classList.toggle('sc-dsl-editor--ghost');
      const isGhost = modal.classList.contains('sc-dsl-editor--ghost');
      statusText.textContent = isGhost ? __('Ghost Mode Active (Scroll now!)', 'scrollcrafter') : __('Ready', 'scrollcrafter');
    };

    const toggleMarkers = () => {
      modal.classList.toggle('sc-dsl-editor--markers');
      const isMarkers = modal.classList.contains('sc-dsl-editor--markers');
      window.ScrollCrafterShowMarkers = isMarkers;

      // Update button visual state
      const markersBtn = modal.querySelector('.sc-dsl-editor__markers-toggle');
      if (markersBtn) {
        markersBtn.classList.toggle('sc-btn--active', isMarkers);
      }

      statusText.textContent = isMarkers ? __('Markers enabled for preview', 'scrollcrafter') : __('Ready', 'scrollcrafter');
    };

    const toggleMinimize = () => {
      modal.classList.toggle('sc-dsl-editor--minimized');
    };

    const handlePreview = async () => {
      if (lastValidationState.hasCriticalErrors) {
        showShake();
        return;
      }

      // First apply the current code
      const currentCode = getEditorDoc();
      triggerElementorUpdate(currentCode);

      // Close modal smoothly
      modal.classList.remove('sc-dsl-editor--open');

      // Wait for modal to close, then trigger preview
      setTimeout(async () => {
        await handlePreviewOutside();
      }, 300);
    };

    const showShake = () => {
      const panel = modal.querySelector('.sc-dsl-editor__panel');
      panel.classList.add('sc-shake');
      setTimeout(() => panel.classList.remove('sc-shake'), 500);
      statusText.textContent = __('Fix errors before preview!', 'scrollcrafter');
      statusText.style.color = '#e06c75';
    };

    const handleApply = () => {
      const currentCode = getEditorDoc();
      if (lastValidationState.hasCriticalErrors) {
        showShake();
        return;
      }
      triggerElementorUpdate(currentCode);
      if (model.trigger) model.trigger('change', model);
      if (currentPageView.render) currentPageView.render();

      statusText.textContent = __('Applied!', 'scrollcrafter');
      statusText.style.color = '#98c379';
      setTimeout(close, 500);
    };

    // Events
    window.addEventListener('keydown', handleGlobalKey, { capture: true });

    bindClose('.sc-dsl-editor__close');
    bindClose('.sc-dsl-editor__cancel');
    bindClose('.sc-dsl-editor__backdrop');

    const applyBtn = modal.querySelector('.sc-dsl-editor__apply');
    if (applyBtn) applyBtn.onclick = handleApply;

    const previewBtn = modal.querySelector('.sc-dsl-editor__preview');
    if (previewBtn) previewBtn.onclick = handlePreview;

    const ghostBtn = modal.querySelector('.sc-dsl-editor__ghost-toggle');
    if (ghostBtn) ghostBtn.onclick = toggleGhost;

    const markersBtn = modal.querySelector('.sc-dsl-editor__markers-toggle');
    if (markersBtn) markersBtn.onclick = toggleMarkers;

    const minimizeBtn = modal.querySelector('.sc-dsl-editor__minimize');
    if (minimizeBtn) minimizeBtn.onclick = toggleMinimize;

    modal.classList.add('sc-dsl-editor--open');
  };

  const handlePreviewOutside = async () => {
    log('Triggered: handlePreviewOutside');
    const panelView = elementor.getPanelView();
    const currentPageView = panelView ? panelView.currentPageView : null;
    if (!currentPageView || !currentPageView.model) {
      log('Error: currentPageView or model not found in handlePreviewOutside');
      return;
    }

    const widgetId = currentPageView.model.id;
    const script = currentPageView.model.get('settings').get('scrollcrafter_script');

    log('Fetching config and triggering preview for widget:', widgetId);

    try {
      // 1. Set global flag locally
      window.ScrollCrafterForcePreview = widgetId;
      sessionStorage.setItem('sc_force_preview', widgetId);

      // 2. Get iframe and widget reference
      const previewIframe = elementor.$preview[0];
      const previewWindow = previewIframe?.contentWindow;
      const $widget = previewWindow?.jQuery('[data-id="' + widgetId + '"]');

      // 3. Detect current breakpoint based on iframe width
      const activeBreakpoint = getActiveBreakpoint(previewIframe);
      log('Active breakpoint detected:', activeBreakpoint);

      // 4. Show loading overlay (positioned OVER widget via parent, not inside to avoid SplitText corruption)
      let $loadingOverlay = null;
      if ($widget && $widget.length) {
        const widgetOffset = $widget.offset();
        const widgetWidth = $widget.outerWidth();
        const widgetHeight = $widget.outerHeight();

        $loadingOverlay = previewWindow.jQuery(`
          <div class="sc-loading-overlay" style="
            position: fixed;
            top: ${widgetOffset.top}px;
            left: ${widgetOffset.left}px;
            width: ${widgetWidth}px;
            height: ${widgetHeight}px;
            background: rgba(128, 128, 128, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            pointer-events: none;
          ">
            <div style="
              width: 32px;
              height: 32px;
              border: 3px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: sc-spin 0.8s linear infinite;
            "></div>
          </div>
          <style>
            @keyframes sc-spin { to { transform: rotate(360deg); } }
          </style>
        `);
        previewWindow.jQuery('body').append($loadingOverlay);
      }

      // 5. Fetch parsed config from REST API
      const restUrl = window.ScrollCrafterConfig?.rest_url || (window.location.origin + '/wp-json/');
      const showMarkers = !!window.ScrollCrafterShowMarkers;
      const response = await fetch(restUrl + 'scrollcrafter/v1/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.ScrollCrafterConfig?.rest_nonce || window.elementorConfig?.rest?.nonce || ''
        },
        body: JSON.stringify({
          script: script,
          widget_id: widgetId,
          mode: 'auto',
          markers: showMarkers
        })
      });

      const result = await response.json();

      // Remove loading overlay
      if ($loadingOverlay) {
        $loadingOverlay.remove();
        previewWindow.jQuery('.sc-loading-overlay').remove();
      }

      if (!result.ok || !result.config) {
        log('Error fetching config for preview:', result);
        return;
      }

      // 6. CRITICAL: Ensure SplitText is initialized before preview
      // First trigger scroll-animation.js via Elementor to create SplitText elements
      if (previewWindow && previewWindow.elementorFrontend && $widget && $widget.length) {
        log('Pre-initializing widget to create SplitText...');

        // Store config first
        $widget.attr('data-scrollcrafter-config', JSON.stringify(result.config));
        $widget.attr('data-scrollcrafter-force-breakpoint', activeBreakpoint);

        // Trigger scroll-animation.js to create SplitText
        previewWindow.elementorFrontend.elementsHandler.runReadyTrigger($widget);

        // Wait for SplitText to be created
        await new Promise(resolve => setTimeout(resolve, 100));

        // 7. Now call scPreview to replay the animation with proper SplitText
        if (previewWindow.scPreview) {
          log('Calling scPreview with pre-created SplitText');
          const success = previewWindow.scPreview(widgetId, result.config, activeBreakpoint);

          if (!success) {
            log('Preview failed - check console for errors');
          }
        }
      } else {
        log('scPreview API not available or widget not found');
      }
    } catch (e) {
      log('Error in live preview trigger:', e);
    }
  };

  function registerScrollCrafterListeners() {
    if (typeof elementor === 'undefined' || !elementor.channels || !elementor.channels.editor) {
      return false;
    }

    log('Init: Registering scrollcrafter listeners');

    // Inject AI badge into label
    elementor.hooks.addAction('panel/open_editor/widget/common', (panel, model, view) => {
      const checkBadge = () => {
        const label = panel.$el.find('.elementor-control-scrollcrafter_script .elementor-control-title');
        if (label.length && !label.find('.sc-ai-badge').length) {
          label.append('<span class="sc-ai-badge"><i class="eicon-star"></i> Edytuj ze SI</span>');
        }
      };
      setTimeout(checkBadge, 100);
      setTimeout(checkBadge, 500);
    });

    elementor.channels.editor.on('scrollcrafter:open_editor', (view) => {
      log('Event: scrollcrafter:open_editor received');
      openEditorForCurrentElement();
    });
    elementor.channels.editor.on('scrollcrafter:preview', (view) => {
      log('Event: scrollcrafter:preview received');
      handlePreviewOutside();
    });

    log('ScrollCrafter listeners registered successfully');
    return true;
  }

  const initRegistration = () => {
    let attempts = 0;
    const maxAttempts = 50;

    const tryRegister = () => {
      if (registerScrollCrafterListeners()) {
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        if (attempts % 10 === 0) {
          log(`Waiting for Elementor Editor channels (attempt ${attempts})...`);
        }
        setTimeout(tryRegister, 100);
      } else {
        console.error('[SC Editor] Could not find Elementor Editor channels after 5s.');
      }
    };

    tryRegister();
  };

  initRegistration();

})(jQuery);
