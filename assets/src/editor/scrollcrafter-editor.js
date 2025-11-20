import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightSpecialChars, drawSelection } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import { defaultKeymap } from '@codemirror/commands';
import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@codemirror/highlight';
import { StreamLanguage } from '@codemirror/language'; // Upewnij się, że zainstalowałeś @codemirror/language

console.log('ScrollCrafter Editor module loaded');

// ---------- DSL language (stream tokenizer) ----------

const dslLanguage = StreamLanguage.define({
  startState() {
    return {};
  },
  token(stream, state) {
    // Pomiń spacje na początku
    if (stream.eatSpace()) return null;

    // Komentarze
    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment'; // tags.comment
    }

    // Sekcje [animation], [scroll], ...
    if (stream.peek() === '[') {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === ']') break;
      }
      return 'keyword'; // tags.keyword
    }

    // Klucze: type:, from:, start:, itp.
    // Czytamy do dwukropka
    let ch = stream.peek();
    if (/[a-zA-Z_]/.test(ch)) {
      let word = '';
      while ((ch = stream.peek()) && /[a-zA-Z0-9_.]/.test(ch)) {
        word += ch;
        stream.next();
      }

      if (stream.peek() === ':') {
        stream.next(); // zjedz ':'
        return 'propertyName'; // tags.propertyName
      }

      // jeśli to nie klucz z ':', potraktuj jako text
      return null;
    }

    // Liczby (float/int)
    if (/[0-9]/.test(stream.peek())) {
      let hasDot = false;
      while (!stream.eol()) {
        const ch2 = stream.peek();
        if (ch2 === '.' && !hasDot) {
          hasDot = true;
          stream.next();
        } else if (/[0-9]/.test(ch2)) {
          stream.next();
        } else {
          break;
        }
      }
      return 'number'; // tags.number
    }

    // Wartości po '=' traktujemy jako zwykły tekst
    stream.next();
    return null;
  },
});

// ---------- DSL Theme & Highlight & Autocomplete ----------

const dslHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: '#ffcc66' }, // type, from, start, end...
  { tag: tags.keyword, color: '#7ab6ff', fontWeight: 'bold' }, // [animation], [scroll]...
  { tag: tags.comment, color: '#76839a', fontStyle: 'italic' },
  { tag: tags.number, color: '#89ddff' },
]);

// Ciemny motyw dopasowany do panelu
const dslTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#14161d',
      color: '#f5f5f5',
      fontSize: '12px',
    },
    '.cm-content': {
      fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
      padding: '6px 8px',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-line': {
      padding: '0 2px',
    },
  },
  { dark: true }
);

// Autocomplete – lista słów kluczowych DSL
const dslCompletions = [
  // Sekcje
  { label: '[animation]', type: 'keyword', detail: 'Section' },
  { label: '[scroll]', type: 'keyword', detail: 'Section' },
  { label: '[target]', type: 'keyword', detail: 'Section' },
  { label: '[timeline]', type: 'keyword', detail: 'Section' },
  { label: '[step.1]', type: 'keyword', detail: 'Section' },

  // Klucze animation
  { label: 'type:', type: 'property', detail: 'from | to | fromTo' },
  { label: 'from:', type: 'property', detail: 'y=50, opacity=0' },
  { label: 'to:', type: 'property', detail: 'y=0, opacity=1' },
  { label: 'duration:', type: 'property', detail: 'seconds' },
  { label: 'delay:', type: 'property', detail: 'seconds' },
  { label: 'ease:', type: 'property', detail: 'none |' },
  { label: 'stagger:', type: 'property', detail: 'seconds' },

  // Klucze scroll
  { label: 'start:', type: 'property', detail: 'top 80%' },
  { label: 'end:', type: 'property', detail: 'bottom 20%' },
  { label: 'scrub:', type: 'property', detail: 'true | false | 0.5' },
  { label: 'once:', type: 'property', detail: 'true | false' },
  { label: 'toggleActions:', type: 'property' },
  { label: 'pin:', type: 'property', detail: 'true | false' },
  { label: 'pinSpacing:', type: 'property', detail: 'true | false' },
  { label: 'anticipatePin:', type: 'property', detail: 'number' },
  { label: 'markers:', type: 'property', detail: 'true | false' },
  { label: 'snap:', type: 'property', detail: 'true | false | number' },

  // target
  { label: 'selector:', type: 'property', detail: '.my-selector' },
];

const dslCompletionSource = completeFromList(dslCompletions);

// ---------- Editor instance management ----------

let cmView = null;

function createEditor(parentNode, initialDoc) {
  if (cmView) {
    cmView.destroy();
    cmView = null;
  }
  console.log('Creating new CodeMirror editor instance');

  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      highlightSpecialChars(),
      drawSelection(),
      dslTheme,
      dslLanguage, // nasz tokenizer DSL
      syntaxHighlighting(dslHighlightStyle),
      autocompletion({
        override: [dslCompletionSource],
      }),
      EditorView.lineWrapping,
    ],
  });

  cmView = new EditorView({
    state,
    parent: parentNode,
  });

  return cmView;
}

function getEditorDoc() {
  return cmView ? cmView.state.doc.toString() : '';
}

// ---------- DSL Validation via REST API ----------
const apiRoot =
  (window.wpApiSettings && window.wpApiSettings.root)
  || `${window.location.origin}/wp-json/`;

async function validateDsl(script, mode = 'auto') {
  try {
    const response = await fetch(
      `${apiRoot}scrollcrafter/v1/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify({ script, mode }),
      },
    );

    if (!response.ok) {
      return { ok: false, errors: ['HTTP error'], warnings: [], config: null };
    }

    return await response.json();
  } catch (e) {
    return { ok: false, errors: [String(e)], warnings: [], config: null };
  }
}



// ---------- Elementor integration ----------

(function ($) {
  const MODAL_ID = 'scrollcrafter-dsl-editor';
  console.log('ScrollCrafter Editor script loaded');

  const ensureModal = () => {
    let modal = document.getElementById(MODAL_ID);
    if (modal) {
      return modal;
    }

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
          <div class="sc-dsl-editor__editor-container">
            <div class="sc-dsl-editor__editor" id="sc-dsl-editor-cm"></div>
          </div>
          <div class="sc-dsl-editor__status">
            <span class="sc-dsl-editor__status-text">Ready</span>
          </div>
        </div>
        <div class="sc-dsl-editor__footer">
          <button type="button" class="elementor-button sc-dsl-editor__btn sc-dsl-editor__btn--ghost sc-dsl-editor__cancel">
            Cancel
          </button>
          <button type="button" class="elementor-button elementor-button-default sc-dsl-editor__btn sc-dsl-editor__apply">
            Apply
          </button>
          <button type="button" class="elementor-button elementor-button-success sc-dsl-editor__btn sc-dsl-editor__apply-preview">
            Apply &amp; Preview
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  };

  // Otwieranie edytora dla aktualnego elementu w panelu Elementora

  const openEditorForCurrentElement = () => {
    const panelView = elementor.getPanelView();
    const currentPageView = panelView ? panelView.currentPageView : null;
    if (!currentPageView || !currentPageView.model) return;

    const model = currentPageView.model;
    const settings = model.get('settings');
    if (!settings) return;

    const elementId = model.get('id');
    const elementType = model.get('widgetType') || model.get('elType') || 'Element';

    const currentScript = settings.get('scrollcrafter_script') || '';

    const modal = ensureModal();
    const statusText = modal.querySelector('.sc-dsl-editor__status-text');
    const titleSub = modal.querySelector('.sc-dsl-editor__title-sub');

    titleSub.textContent = `${elementType} (${elementId})`;
    statusText.textContent = 'Ready';

    const editorParent = modal.querySelector('#sc-dsl-editor-cm');
    createEditor(editorParent, currentScript);
    console.log('Editor opened for element', elementId, elementType);

    const close = () => {
      modal.classList.remove('sc-dsl-editor--open');
    };

    // Zamknięcie przyciskiem / tłem

    modal.querySelector('.sc-dsl-editor__close').onclick = close;
    modal.querySelector('.sc-dsl-editor__cancel').onclick = close;
    modal.querySelector('.sc-dsl-editor__backdrop').onclick = close;

    // Apply Button
    modal.querySelector('.sc-dsl-editor__apply').onclick = () => {
      const newScript = getEditorDoc();
      settings.set('scrollcrafter_script', newScript);

      statusText.textContent = 'Applied (preview on front-end refresh)';
      modal.classList.remove('sc-dsl-editor__status--error');
      modal.classList.add('sc-dsl-editor__status--ok');
      
      close();
    };
    // Apply & Preview Button
    modal.querySelector('.sc-dsl-editor__apply-preview').onclick = async () => {
      const newScript = getEditorDoc();
      settings.set('scrollcrafter_script', newScript);

      // Status
      statusText.textContent = 'Validating...';
      modal.classList.remove('sc-dsl-editor__status--error');
      modal.classList.remove('sc-dsl-editor__status--ok');
      modal.classList.remove('sc-dsl-editor__status--warning');

      const result = await validateDsl(newScript, 'auto');

      if (!result.ok) {
        // Błąd krytyczny
        statusText.textContent = `Error: ${result.errors.join(' | ') || 'Unknown error'}`;
        modal.classList.add('sc-dsl-editor__status--error');
        return;
      }

      if (result.warnings && result.warnings.length) {
        // Ostrzeżenia – nie zamykamy modala, użytkownik może poprawić DSL
        statusText.textContent = `Warnings: ${result.warnings.join(' | ')}`;
        modal.classList.add('sc-dsl-editor__status--warning');
        return;
      }

      // Sukces – zamykamy modal i odświeżamy podgląd
      statusText.textContent = 'OK – applying & previewing';
      modal.classList.add('sc-dsl-editor__status--ok');

      if (typeof model.trigger === 'function') {
        model.trigger('change', model);
      }

      if (typeof currentPageView.render === 'function') {
        currentPageView.render();
      }

      console.log('[ScrollCrafter][editor] Applied & previewed, marking model as changed', {
        id: model.get('id'),
      });

      close();
    };

    modal.classList.add('sc-dsl-editor--open');
  };

  // Nasłuchiwanie eventu otwarcia edytora
  console.log('Setting up Elementor init listener for ScrollCrafter editor');
  $(window).on('elementor/init', () => {
    console.log('Elementor initialized - setting up ScrollCrafter editor listener');
    if (!window.elementor || !elementor.channels || !elementor.channels.editor) return;
    console.log('ScrollCrafter: registering editor channel listener');
    elementor.channels.editor.on('scrollcrafter:open_editor', () => {
      console.log('ScrollCrafter: open_editor event received');
      openEditorForCurrentElement();
    });
  });
})(jQuery);
