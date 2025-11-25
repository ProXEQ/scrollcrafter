import { EditorState } from '@codemirror/state';
import { EditorView, keymap, highlightSpecialChars, drawSelection } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import { defaultKeymap } from '@codemirror/commands';
import { autocompletion, completionStatus, CompletionContext, acceptCompletion} from '@codemirror/autocomplete';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@codemirror/highlight';
import { StreamLanguage } from '@codemirror/language'; // Upewnij się, że zainstalowałeś @codemirror/language
import { linter, lintGutter } from '@codemirror/lint';

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


// ---------- DSL Field Definitions (GSAP-based) ----------

const FIELD_DEFS = {
  animation: {
    type: {
      label: 'type:',
      detail: 'from | to | fromTo',
      description: 'Typ tweena w GSAP: from, to lub fromTo.',
      gsap: 'gsap.to / gsap.from / gsap.fromTo',
    },
    from: {
      label: 'from:',
      detail: 'np. y=50, opacity=0',
      description: 'Początkowe wartości właściwości (mapowane na TweenVars "from").',
      gsap: 'TweenVars',
    },
    to: {
      label: 'to:',
      detail: 'np. y=0, opacity=1',
      description: 'Końcowe wartości właściwości (TweenVars).',
      gsap: 'TweenVars',
    },
    duration: {
      label: 'duration:',
      detail: 'seconds',
      description: 'Czas trwania tweena w sekundach.',
      gsap: 'TweenVars.duration',
      values: [
        { label: '0.5', detail: '0.5s' },
        { label: '1', detail: '1s' },
        { label: '2', detail: '2s' },
      ],
    },
    delay: {
      label: 'delay:',
      detail: 'seconds',
      description: 'Opóźnienie startu tweena w sekundach.',
      gsap: 'TweenVars.delay',
    },
    ease: {
      label: 'ease:',
      detail: 'GSAP ease',
      description: 'Krzywa łagodzenia animacji (np. power1.out, back.inOut).',
      gsap: 'TweenVars.ease',
      values: [
        { label: 'power1.out', detail: 'Łagodny ease' },
        { label: 'power2.out', detail: 'Średnio łagodny ease' },
        { label: 'power3.out', detail: 'Mocniejszy ease' },
        { label: 'power4.out', detail: 'Najmocniejszy ease' },
        { label: 'back.out', detail: 'Najmocniejszy ease' },
        { label: 'bounce.out', detail: 'Najmocniejszy ease' },
        { label: 'circ.out', detail: 'Najmocniejszy ease' },
        { label: 'elastic.out', detail: 'Najmocniejszy ease' },
        { label: 'expo.out', detail: 'Najmocniejszy ease' },
        { label: 'shine.out', detail: 'Najmocniejszy ease' },
        { label: 'steps(2)', detail: 'Stepowy' },
      ],
    },
    stagger: {
      label: 'stagger:',
      detail: 'seconds',
      description: 'Opóźnienie między kolejnymi elementami (stagger each).',
      gsap: 'StaggerVars.each',
    },
  },

  scroll: {
    start: {
      label: 'start:',
      detail: 'np. top 80%',
      description: 'Pozycja startu triggera względem viewportu (np. "top 80%").',
      gsap: 'ScrollTrigger.vars.start',
      values: [
        { label: 'top 80%', detail: 'Gdy góra targetu osiąga 80% wysokości okna' },
        { label: 'top center', detail: 'Gdy góra targetu jest w środku okna' },
        { label: 'top bottom', detail: 'Gdy góra targetu dotyka dołu okna' },
      ],
    },
    end: {
      label: 'end:',
      detail: 'np. bottom 20%',
      description: 'Pozycja zakończenia triggera (np. "bottom 20%").',
      gsap: 'ScrollTrigger.vars.end',
    },
    scrub: {
      label: 'scrub:',
      detail: 'true | false | number',
      description: 'Synchronizuje progres animacji z pozycją scrolla (true lub liczba).',
      gsap: 'ScrollTrigger.vars.scrub',
      values: [
        { label: 'true', detail: 'Płynnie zsynchronizowane z domyślnym smoothingiem' },
        { label: '0.5', detail: '0.5s smoothingu scrolla' },
        { label: '1', detail: '1s smoothingu scrolla' },
      ],
    },
    once: {
      label: 'once:',
      detail: 'true | false',
      description: 'Czy animacja ma odpalić się tylko raz.',
      gsap: 'ScrollTrigger.vars.once',
      values: [
        { label: 'true', detail: 'Uruchom tylko raz' },
        { label: 'false', detail: 'Może uruchamiać się wielokrotnie' },
      ],
    },
    toggleActions: {
      label: 'toggleActions:',
      detail: 'np. play none none reverse',
      description: 'Akcje przy enter/leave/back (np. "play none none reverse").',
      gsap: 'ScrollTrigger.vars.toggleActions',
      values: [
        { label: 'play none none reverse', detail: 'Standardowy play + reverse przy wyjściu' },
        { label: 'play none none none', detail: 'Odtwórz tylko przy wejściu' },
        { label: 'restart none none none', detail: 'Restart przy każdym wejściu' },
      ],
    },
    pin: {
      label: 'pin:',
      detail: 'true | false',
      description: 'Przypina target na czas trwania triggera.',
      gsap: 'ScrollTrigger.vars.pin',
      values: [
        { label: 'true', detail: 'Pin na czas triggera' },
        { label: 'false', detail: 'Bez pina' },
      ],
    },
    pinSpacing: {
      label: 'pinSpacing:',
      detail: 'true | false',
      description: 'Czy zachować przestrzeń po przypięciu.',
      gsap: 'ScrollTrigger.vars.pinSpacing',
      values: [
        { label: 'true', detail: 'Domyślne zachowanie (zostaw miejsce)' },
        { label: 'false', detail: 'Bez dodatkowego spacingu' },
      ],
    },
    anticipatePin: {
      label: 'anticipatePin:',
      detail: 'number',
      description: 'Przewiduje pin, aby uniknąć skoków layoutu.',
      gsap: 'ScrollTrigger.vars.anticipatePin',
    },
    markers: {
      label: 'markers:',
      detail: 'true | false',
      description: 'Pokazuje debugowe markery start/end na osi scrolla.',
      gsap: 'ScrollTrigger.vars.markers',
      values: [
        { label: 'true', detail: 'Pokaż markery' },
        { label: 'false', detail: 'Ukryj markery' },
      ],
    },
    snap: {
      label: 'snap:',
      detail: 'true | number | string',
      description: 'Przyciąganie scrolla do punktów (np. 0.1, "labels").',
      gsap: 'ScrollTrigger.vars.snap',
      values: [
        { label: 'true', detail: 'Snap do najbliższego punktu' },
        { label: '0.1', detail: 'Snap co 10% progresu' },
      ],
    },
  },

  target: {
    selector: {
      label: 'selector:',
      detail: '.my-selector',
      description: 'CSS selector dla elementu animacji (np. ".my-box").',
      gsap: 'GSAP target (element / selector)',
    },
  },

  timeline: {
    'timeline.defaults.duration': {
      label: 'timeline.defaults.duration:',
      detail: 'seconds',
      description: 'Domyślne duration dla wszystkich tweenów w timeline.',
      gsap: 'Timeline.vars.defaults.duration',
    },
    'timeline.defaults.delay': {
      label: 'timeline.defaults.delay:',
      detail: 'seconds',
      description: 'Domyślne delay dla tweenów w timeline.',
      gsap: 'Timeline.vars.defaults.delay',
    },
    'timeline.defaults.stagger': {
      label: 'timeline.defaults.stagger:',
      detail: 'seconds',
      description: 'Domyślne stagger dla tweenów w timeline.',
      gsap: 'Timeline.vars.defaults.stagger',
    },
    'timeline.defaults.ease': {
      label: 'timeline.defaults.ease:',
      detail: 'GSAP ease',
      description: 'Domyślny ease dla tweenów w timeline.',
      gsap: 'Timeline.vars.defaults.ease',
    },
  },

  // step.* traktujemy jako osobny typ sekcji, ale z tym samym zestawem co animation
  'step.*': {
    type: {
      label: 'type:',
      detail: 'from | to | fromTo',
      description: 'Typ tweena w kroku timeline.',
      gsap: 'gsap.to / from / fromTo',
    },
    from: {
      label: 'from:',
      detail: 'np. y=50, opacity=0',
      description: 'Początkowe wartości kroku timeline.',
      gsap: 'TweenVars',
    },
    to: {
      label: 'to:',
      detail: 'np. y=0, opacity=1',
      description: 'Końcowe wartości kroku timeline.',
      gsap: 'TweenVars',
    },
    duration: {
      label: 'duration:',
      detail: 'seconds',
      description: 'Czas trwania kroku timeline.',
      gsap: 'TweenVars.duration',
    },
    delay: {
      label: 'delay:',
      detail: 'seconds',
      description: 'Opóźnienie startu kroku timeline.',
      gsap: 'TweenVars.delay',
    },
    ease: {
      label: 'ease:',
      detail: 'GSAP ease',
      description: 'Ease kroku timeline.',
      gsap: 'TweenVars.ease',
    },
    stagger: {
      label: 'stagger:',
      detail: 'seconds',
      description: 'Stagger dla kroku timeline.',
      gsap: 'StaggerVars.each',
    },
    startAt: {
      label: 'startAt:',
      detail: 'timeline offset (number)',
      description: 'Przesunięcie startu względem czasu timeline.',
      gsap: 'Timeline.add(position)',
    },
  },
};

// Sekcje (nagłówki) – generowane z FIELD_DEFS + dodatkowe
const sectionCompletions = [
  { label: '[animation]', type: 'keyword', detail: 'GSAP tween section' },
  { label: '[scroll]', type: 'keyword', detail: 'GSAP ScrollTrigger section' },
  { label: '[target]', type: 'keyword', detail: 'Target selector section' },
  { label: '[timeline]', type: 'keyword', detail: 'Timeline container' },
  { label: '[step.1]', type: 'keyword', detail: 'Timeline step section' },
];

// Zwraca definicję pól dla danej sekcji (uwzględnia step.N)
function getSectionFieldDefs(sectionName) {
  if (!sectionName) return null;
  if (FIELD_DEFS[sectionName]) return FIELD_DEFS[sectionName];
  if (sectionName.startsWith('step.')) return FIELD_DEFS['step.*'];
  return null;
}

// Tworzy listę completions pól dla sekcji
function getFieldCompletionsForSection(sectionName) {
  const defs = getSectionFieldDefs(sectionName);
  if (!defs) return [];
  return Object.keys(defs).map((key) => {
    const def = defs[key];
    return {
      label: def.label,
      type: 'property',
      detail: def.detail,
      info: def.description + (def.gsap ? ` (${def.gsap})` : ''),
    };
  });
}

// Tworzy listę completions wartości dla danego pola
function getValueCompletionsForField(sectionName, fieldKey) {
  const defs = getSectionFieldDefs(sectionName);
  if (!defs) return [];
  const def = defs[fieldKey];
  if (!def || !def.values) return [];
  return def.values.map((v) => ({
    label: v.label,
    type: 'enum',
    detail: v.detail || def.detail,
    info: def.description + (def.gsap ? ` (${def.gsap})` : ''),
  }));
}
// Completions dla pól sekcji


function withSlashApply(options) {
  return options.map((opt) => ({
    ...opt,
    apply(view, completion, from, to) {
      // 1. Usuń znak '/' tuż przed 'from'
      const slashPos = from - 1;
      if (slashPos >= 0) {
        view.dispatch({
          changes: { from: slashPos, to: from, insert: '' },
        });
        from = slashPos;
        to = slashPos;
      }

      // 2. Wstaw label completionu w miejsce usuniętego '/'
      view.dispatch({
        changes: { from, to, insert: completion.label },
        selection: { anchor: from + completion.label.length },
      });
    },
  }));
}

// Helper: konwertuje (1-based) linia/kolumna na pozycję w dokumencie
function posFromLineCol(state, line, column) {
  const ln = state.doc.line(line); // 1-based
  return ln.from + Math.max(0, column - 1);
}

// ---------- Linting ----------

const dslLinter = linter(async (view) => {
  const doc = view.state.doc.toString();

  // ważne: 'auto', żeby nie łamać enum w WP
  const result = await validateDsl(doc, 'auto');

  const diagnostics = [];
  if (!result) return diagnostics;

  const firstLine = 1;
  const lastLine = view.state.doc.lines;

  const addDiagObject = (item, severity) => {
    if (!item || typeof item.line !== 'number') return;

    const from = posFromLineCol(view.state, item.line, item.column || 1);
    const to = typeof item.endColumn === 'number'
      ? posFromLineCol(view.state, item.line, item.endColumn)
      : view.state.doc.line(item.line).to;

    diagnostics.push({
      from,
      to,
      severity,
      message: item.message || 'DSL validation issue',
    });
  };

  const addDiagString = (msg, severity) => {
    if (!msg) return;
    const from = view.state.doc.line(firstLine).from;
    const to = view.state.doc.line(lastLine).to;
    diagnostics.push({
      from,
      to,
      severity,
      message: String(msg),
    });
  };

  if (Array.isArray(result.errors)) {
    result.errors.forEach((e) => {
      if (typeof e === 'string') {
        addDiagString(e, 'error');
      } else {
        addDiagObject(e, 'error');
      }
    });
  }

  if (Array.isArray(result.warnings)) {
    result.warnings.forEach((w) => {
      if (typeof w === 'string') {
        addDiagString(w, 'warning');
      } else {
        addDiagObject(w, 'warning');
      }
    });
  }

  return diagnostics;
}, { delay: 500 });



// ---------- Autocomplete Helpers ----------

// Helper: znajdź aktualną sekcję na podstawie linii powyżej kursora
function getCurrentSection(context) {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const currentText = line.text.trim();

  // Jeśli linia zaczyna się od sekcji, używamy jej
  if (currentText.startsWith('[') && currentText.endsWith(']')) {
    const name = currentText.slice(1, -1).trim().toLowerCase();
    return { name, inSection: false };
  }

  // Szukamy najbliższej poprzedniej sekcji i sprawdzamy,
  // czy pomiędzy nią a obecną linią były jakieś niepuste linie (pola).
  let lastSectionLine = null;
  let lastSectionName = null;
  let hasContentAfterSection = false;

  for (let ln = line.number; ln >= 1; ln -= 1) {
    const text = state.doc.line(ln).text;
    const trimmed = text.trim();

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      lastSectionLine = ln;
      lastSectionName = trimmed.slice(1, -1).trim().toLowerCase();
      break;
    }

    if (trimmed !== '') {
      hasContentAfterSection = true;
    }
  }

  if (!lastSectionName) {
    // Brak poprzedniej sekcji – jesteśmy „poza sekcjami”
    return { name: null, inSection: false };
  }

  if (currentText === '') {
    // Pusta linia: jeśli po sekcji już były jakieś pola,
    // traktujemy to jako „pusta w sekcji” (można dodać kolejne pola).
    // Jeśli nie było żadnych pól, traktujemy jako „między sekcjami”.
    return {
      name: hasContentAfterSection ? lastSectionName : null,
      inSection: hasContentAfterSection,
    };
  }

  // Jesteśmy w niepustej linii wewnątrz sekcji
  return {
    name: lastSectionName,
    inSection: true,
  };
}

// Helper do wycięcia już użytych pól w danej sekcji
function filterMissingKeys(sectionName, context) {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const used = new Set();

  // Szukamy od bieżącej linii w górę do sekcji, zbierając klucze
  for (let ln = line.number - 1; ln >= 1; ln -= 1) {
    const text = state.doc.line(ln).text.trim();
    if (text === '') continue;

    if (text.startsWith('[') && text.endsWith(']')) {
      const name = text.slice(1, -1).trim().toLowerCase();
      if (name === sectionName) break;
      return [];
    }

    const colonIndex = text.indexOf(':');
    if (colonIndex > 0) {
      const key = text.slice(0, colonIndex + 1).trim(); // np. "type:"
      used.add(key);
    }
  }

  const all = getFieldCompletionsForSection(sectionName);
  return all.filter(entry => !used.has(entry.label));
}

function valueResult(from, options) {
  return {
    from,
    options,
    validFor: /^[a-z0-9._()"%-]*$/i,
  };
}


// Główne źródło podpowiedzi
function dslCompletionSource(context) {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const text = line.text;
  const beforeCursor = text.slice(0, pos - line.from);

  const sectionInfo = getCurrentSection(context);
  const sectionName = sectionInfo?.name || null;
  const inSection = !!sectionInfo?.inSection;

  // ----- AUTOCOMPLETE WARTOŚCI PÓL (bez '/') -----

  // ease: value
  if (sectionName && /ease:\s*([a-z0-9._()-]*)$/i.test(beforeCursor)) {
    const m = /ease:\s*([a-z0-9._()-]*)$/i.exec(beforeCursor);
    const prefix = m[1].toLowerCase();
    let options = getValueCompletionsForField(sectionName === 'timeline' ? 'timeline' : 'animation', 'ease');
    if (prefix) {
      options = options.filter(o => o.label.toLowerCase().startsWith(prefix));
    }
    const from = pos - prefix.length;
    if (options.length) return valueResult(from, options);
  }

  // once: value
  if (sectionName === 'scroll' && /once:\s*([a-z]*)$/i.test(beforeCursor)) {
    const m = /once:\s*([a-z]*)$/i.exec(beforeCursor);
    const prefix = m[1].toLowerCase();
    let options = getValueCompletionsForField('scroll', 'once');
    if (prefix) {
      options = options.filter(o => o.label.startsWith(prefix));
    }
    const from = pos - prefix.length;
    if (options.length) return valueResult(from, options);
  }

  // scrub: value
  if (sectionName === 'scroll' && /scrub:\s*([a-z0-9.]*)$/i.test(beforeCursor)) {
    const m = /scrub:\s*([a-z0-9.]*)$/i.exec(beforeCursor);
    const prefix = m[1].toLowerCase();
    let options = getValueCompletionsForField('scroll', 'scrub');
    if (prefix) {
      options = options.filter(o => o.label.toLowerCase().startsWith(prefix));
    }
    const from = pos - prefix.length;
    if (options.length) return valueResult(from, options);
  }

  // toggleActions: value
  if (sectionName === 'scroll' && /toggleActions:\s*([a-z ]*)$/i.test(beforeCursor)) {
    const m = /toggleActions:\s*([a-z ]*)$/i.exec(beforeCursor);
    const prefix = m[1].toLowerCase();
    let options = getValueCompletionsForField('scroll', 'toggleActions');
    if (prefix) {
      options = options.filter(o => o.label.toLowerCase().startsWith(prefix));
    }
    const from = pos - prefix.length;
    if (options.length) return valueResult(from, options);
  }

  // snap: value
  if (sectionName === 'scroll' && /snap:\s*([a-z0-9."%]*)$/i.test(beforeCursor)) {
    const m = /snap:\s*([a-z0-9."%]*)$/i.exec(beforeCursor);
    const prefix = m[1].toLowerCase();
    let options = getValueCompletionsForField('scroll', 'snap');
    if (prefix) {
      options = options.filter(o => o.label.toLowerCase().startsWith(prefix));
    }
    const from = pos - prefix.length;
    if (options.length) return valueResult(from, options);
  }

  // ----- SEKcJE (nagłówki) -----

  const bracketMatch = beforeCursor.match(/\[([a-z.]*)$/i);
  if (bracketMatch) {
    const prefix = bracketMatch[1].toLowerCase();
    const opts = sectionCompletions.filter((opt) => {
      const name = opt.label.slice(1, -1).toLowerCase();
      return name.startsWith(prefix);
    });

    return {
      from: pos - prefix.length - 1,
      options: opts.length ? opts : sectionCompletions,
    };
  }

  // [target] → sugeruj pola targetu
  if (/\[target\]\s*$/.test(beforeCursor)) {
    const options = getFieldCompletionsForSection('target');
    return {
      from: pos,
      options,
    };
  }

  // ----- POLA W SEKCJI NA "/" -----

  const word = context.matchBefore(/[a-zA-Z0-9_./]+/);
  let from = context.pos;
  if (word) from = word.from;

  // "/" jako trigger pól
  if (word && word.text.startsWith('/')) {
    if (!sectionName || !inSection) return null;

    let options = filterMissingKeys(sectionName, context);

    // specjalny przypadek: w timeline dodatkowo sugeruj [step.1]
    if (sectionName === 'timeline') {
      options = [
        ...options,
        { label: '[step.1]', type: 'keyword', detail: 'Timeline step section' },
      ];
    }

    if (!options.length) return null;

    return {
      from: word.from + 1,   // zostaw "/", a apply go skasuje
      options: withSlashApply(options),
    };
  }

  // ----- Fallback: pola sekcji lub sekcje -----

  let options;

  if (!sectionName) {
    options = sectionCompletions;
  } else if (inSection) {
    options = filterMissingKeys(sectionName, context);
  } else {
    options = getFieldCompletionsForSection(sectionName) || sectionCompletions;
  }

  if (!options || !options.length) return null;

  return {
    from,
    options,
  };
}

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
  {
    key: 'Tab',
    run(view) {
      const status = completionStatus(view.state);
      if (status === 'active') return acceptCompletion(view);
      return false;
    },
  },
]),
      highlightSpecialChars(),
      drawSelection(),
      dslTheme,
      dslLanguage,
      syntaxHighlighting(dslHighlightStyle),
      autocompletion({
        override: [dslCompletionSource],
        activateOnTyping: true,
      }),
      lintGutter(),
      dslLinter,
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
