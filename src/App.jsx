import { useState, useEffect, useRef, useCallback } from 'react';
import { GENRES, buildInitPrompt, buildActionPrompt } from './prompts.js';

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = { bg: '#000', fg: '#fff', dim: '#555', mid: '#999', green: '#00ff41' };
const FONT = "'Courier New', Courier, monospace";
const FS = 15;
const LH = 1.75;
const MAX_W = 700;

// ─── API ──────────────────────────────────────────────────────────────────────
async function callGroq(prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data.text ?? '';
}

// ─── PARSE RESPONSE ───────────────────────────────────────────────────────────
// The model occasionally emits literal newlines inside JSON string values,
// which breaks JSON.parse. We try a direct parse first, then fall back to
// field-by-field regex extraction so the adventure never shows raw JSON.
function parseResponse(raw) {
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Attempt 1: direct parse
  try {
    const obj = JSON.parse(clean);
    return {
      story:       typeof obj.story === 'string' ? obj.story : clean,
      art:         typeof obj.art   === 'string' ? obj.art   : null,
      suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.slice(0, 4) : [],
    };
  } catch { /* fall through to regex extraction */ }

  // Attempt 2: regex field extraction — handles literal newlines inside strings
  try {
    const unescape = s => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const storyM = clean.match(/"story"\s*:\s*"([\s\S]*?)(?<!\\)",/);
    const artM   = clean.match(/"art"\s*:\s*(?:(null)|"([\s\S]*?)(?<!\\)")/);
    const sugM   = clean.match(/"suggestions"\s*:\s*(\[[^\]]*\])/);

    const story = storyM ? unescape(storyM[1]) : clean;
    const art   = artM && !artM[1] && artM[2] ? unescape(artM[2]) : null;
    let suggestions = [];
    try { suggestions = sugM ? JSON.parse(sugM[1]) : []; } catch {}

    return {
      story,
      art,
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 4) : [],
    };
  } catch {
    return { story: clean, art: null, suggestions: [] };
  }
}

// ─── HELP ─────────────────────────────────────────────────────────────────────
const HELP = `COMMANDS
─────────────────────────────────
  /help      show this
  /new       restart same character & genre
  /restart   back to the very beginning
  /copy      copy full adventure to clipboard
  /clear     clear the screen

CONTROLS
─────────────────────────────────
  Enter        submit action
  Ctrl+↑ / ↓   command history
  Buttons      tap a suggested action

TIPS
─────────────────────────────────
  Be specific: "stab the guard with torch"
  beats just "attack".
  Try: look, take, talk to, go, examine, open...
─────────────────────────────────`;

// ─── CHAR QUESTIONS ───────────────────────────────────────────────────────────
const CHAR_QS = [
  { key: 'name',       q: "What is your character's name?",           hint: 'press Enter to skip' },
  { key: 'background', q: 'What is their background or occupation?',  hint: 'e.g. soldier, scholar, thief — Enter to skip' },
  { key: 'trait',      q: 'What is their defining trait?',            hint: 'e.g. reckless, cunning, kind — Enter to skip' },
  { key: 'goal',       q: 'What do they secretly want most?',         hint: 'e.g. revenge, belonging, escape — Enter to skip' },
];

// ─── BLOCK RENDERER ───────────────────────────────────────────────────────────
function Block({ b, onSuggest }) {
  const base = { fontFamily: FONT, fontSize: FS, lineHeight: LH, maxWidth: MAX_W };

  if (b.type === 'gap')   return <div style={{ height: '0.7em' }} />;
  if (b.type === 'rule')  return <div style={{ ...base, color: C.dim }}>{'─'.repeat(52)}</div>;
  if (b.type === 'dim')   return <div style={{ ...base, color: C.dim, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.text}</div>;
  if (b.type === 'green') return <div style={{ ...base, color: C.green }}>{b.text}</div>;

  if (b.type === 'art') {
    return (
      <pre style={{
        ...base, fontSize: 13, lineHeight: 1.4, color: C.mid,
        whiteSpace: 'pre', overflowX: 'auto',
        borderLeft: `2px solid ${C.dim}`,
        paddingLeft: 12, margin: '6px 0',
      }}>
        {b.text}
      </pre>
    );
  }

  if (b.type === 'user') {
    return (
      <div style={{ ...base, color: C.mid, margin: '10px 0 2px' }}>
        {'> '}{b.text}
      </div>
    );
  }

  if (b.type === 'help') {
    return (
      <pre style={{ ...base, fontSize: 13, lineHeight: 1.8, color: C.dim,
        whiteSpace: 'pre', margin: '4px 0', maxWidth: MAX_W }}>
        {b.text}
      </pre>
    );
  }

  if (b.type === 'suggestions') {
    return (
      <div style={{ maxWidth: MAX_W, display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 4px' }}>
        {b.items.map((s, i) => (
          <button key={i} onClick={() => onSuggest(s)} style={{
            background: 'transparent', border: `1px solid ${C.dim}`,
            color: C.mid, fontFamily: FONT, fontSize: 13,
            padding: '3px 12px', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.fg; e.currentTarget.style.color = C.fg; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.dim; e.currentTarget.style.color = C.mid; }}>
            {s}
          </button>
        ))}
      </div>
    );
  }

  // default: story / welcome text
  return (
    <div style={{
      ...base, color: C.fg,
      whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
    }}>
      {b.text}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [blocks,   setBlocks]   = useState([]);
  const [input,    setInput]    = useState('');
  const [busy,     setBusy]     = useState(false);
  const [phase,    setPhase]    = useState('welcome');
  const [genreIdx, setGenreIdx] = useState(0);
  const [genreId,  setGenreId]  = useState('fantasy');
  const [customSeed, setCustomSeed] = useState('');
  const [charStep, setCharStep] = useState(0);
  const [draft,    setDraft]    = useState({ name: '', background: '', trait: '', goal: '' });
  const [charInfo, setCharInfo] = useState({});
  const [history,  setHistory]  = useState([]);
  const [cmdHist,  setCmdHist]  = useState([]);
  const [cmdIdx,   setCmdIdx]   = useState(-1);

  const inputRef   = useRef(null);
  const bottomRef  = useRef(null);
  const fullText   = useRef('');
  const genreIds   = useRef([]);
  // FIX: guard against React StrictMode double-firing the welcome effect
  const hasInit    = useRef(false);
  // FIX: smart scroll — don't fight the user when they've scrolled up to read
  const autoScroll = useRef(true);

  // ── track scroll position ──────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const distFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      autoScroll.current = distFromBottom < 160;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── add block ──────────────────────────────────────────────────────────
  const add = useCallback((type, text = '', extra = {}) => {
    const id = crypto.randomUUID();
    setBlocks(p => [...p, { id, type, text, ...extra }]);
    if (['story', 'user', 'art', 'text', 'help'].includes(type)) {
      fullText.current += text + '\n';
    }
    return id;
  }, []);

  // ── scroll helpers ─────────────────────────────────────────────────────
  const scrollToBottom = useCallback((force = false) => {
    if (force || autoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [blocks, busy]); // eslint-disable-line

  // ── focus input ────────────────────────────────────────────────────────
  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [busy, phase]);

  // ── WELCOME — fires once even under StrictMode ─────────────────────────
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    add('text', 'WELCOME TO RETROTEXT ADVENTURES');
    add('gap');
    add('dim', 'press Enter to continue...');
  }, []); // eslint-disable-line

  // ── render genre list ──────────────────────────────────────────────────
  const renderGenreList = useCallback((activeIdx) => {
    if (genreIds.current.length) {
      setBlocks(p => p.filter(b => !genreIds.current.includes(b.id)));
    }
    const ids = [];
    ids.push(add('gap'));
    ids.push(add('dim', 'SELECT YOUR ADVENTURE TYPE'));
    ids.push(add('dim', 'Up/Down to move  ·  Enter to confirm  ·  type 1-5 to jump'));
    ids.push(add('gap'));
    GENRES.forEach((g, i) => {
      ids.push(add(i === activeIdx ? 'text' : 'dim', `  ${i === activeIdx ? '>' : ' '} ${g.label}`));
    });
    ids.push(add('gap'));
    genreIds.current = ids;
  }, [add]);

  // ── start game ─────────────────────────────────────────────────────────
  const startGame = useCallback(async (gId, gSeed, cSeed, cInfo) => {
    add('rule');
    add('gap');
    setBusy(true);
    try {
      const prompt = buildInitPrompt(gId, gSeed, { ...cInfo, customSeed: cSeed });
      const raw    = await callGroq(prompt);
      const { story, art, suggestions } = parseResponse(raw);

      setHistory([{ role: 'assistant', content: story }]);
      if (art) add('art', art);
      add('text', story);
      if (suggestions.length) add('suggestions', '', { items: suggestions });
    } catch (e) {
      add('dim', 'ERROR: ' + e.message);
    }
    setBusy(false);
    setPhase('game');
  }, [add]);

  // ── slash commands ─────────────────────────────────────────────────────
  const handleSlash = useCallback(async (cmd) => {
    const c = cmd.toLowerCase().trim();
    if (c === '/help')  { add('help', HELP); return; }
    if (c === '/clear') { setBlocks([]); fullText.current = ''; return; }
    if (c === '/copy') {
      try {
        await navigator.clipboard.writeText(fullText.current);
        add('green', '✓ Adventure copied to clipboard.');
      } catch { add('dim', 'Copy failed — select text manually.'); }
      return;
    }
    if (c === '/restart') {
      setBlocks([]); setHistory([]); setCharInfo({});
      setDraft({ name: '', background: '', trait: '', goal: '' });
      setCharStep(0); setCustomSeed(''); genreIds.current = [];
      fullText.current = '';
      hasInit.current = false;
      setPhase('welcome');
      setTimeout(() => {
        hasInit.current = true;
        add('text', 'WELCOME TO RETROTEXT ADVENTURES');
        add('gap');
        add('dim', 'press Enter to continue...');
        autoScroll.current = true;
        scrollToBottom(true);
      }, 0);
      return;
    }
    if (c === '/new') {
      setHistory([]);
      add('gap');
      await startGame(genreId, GENRES.find(g => g.id === genreId)?.seed || '', customSeed, charInfo);
      return;
    }
    add('dim', `Unknown command: ${cmd}. Type /help for commands.`);
  }, [add, startGame, genreId, customSeed, charInfo, scrollToBottom]);

  // ── main submit ────────────────────────────────────────────────────────
  const submit = useCallback(async (override) => {
    const cmd = (override ?? input).trim();
    if (busy) return;
    if (override === undefined) setInput('');
    if (cmd) { setCmdHist(h => [cmd, ...h.slice(0, 99)]); setCmdIdx(-1); }

    // Re-engage auto-scroll whenever the user takes an action
    autoScroll.current = true;
    scrollToBottom(true);

    if (phase === 'welcome') {
      setPhase('genre');
      renderGenreList(genreIdx);
      return;
    }

    if (phase === 'genre') {
      const n = parseInt(cmd, 10);
      if (!isNaN(n) && n >= 1 && n <= GENRES.length) {
        setGenreIdx(n - 1);
        confirmGenre(n - 1);
        return;
      }
      confirmGenre(genreIdx);
      return;
    }

    if (phase === 'custom-seed') {
      if (!cmd) { add('dim', 'Please describe your premise first.'); return; }
      setCustomSeed(cmd);
      add('dim', `> ${cmd}`);
      beginChar();
      return;
    }

    if (phase === 'char') {
      add('dim', `> ${cmd}`);
      const key = CHAR_QS[charStep].key;
      const newDraft = { ...draft, [key]: cmd };
      setDraft(newDraft);
      if (charStep < CHAR_QS.length - 1) {
        const next = charStep + 1;
        setCharStep(next);
        add('gap');
        add('text', CHAR_QS[next].q);
        add('dim', CHAR_QS[next].hint);
      } else {
        setCharInfo(newDraft);
        await startGame(
          genreId,
          GENRES.find(g => g.id === genreId)?.seed || '',
          customSeed,
          newDraft
        );
      }
      return;
    }

    if (phase === 'game') {
      if (!cmd) return;
      if (cmd.startsWith('/')) { add('user', cmd); await handleSlash(cmd); return; }
      add('user', cmd);
      setBusy(true);
      try {
        const raw = await callGroq(buildActionPrompt(history, cmd));
        const { story, art, suggestions } = parseResponse(raw);
        setHistory(h => [
          ...h,
          { role: 'user', content: cmd },
          { role: 'assistant', content: story },
        ].slice(-24));
        if (art) add('art', art);
        add('text', story);
        if (suggestions.length) add('suggestions', '', { items: suggestions });
      } catch (e) {
        add('dim', 'ERROR: ' + e.message);
      }
      setBusy(false);
    }
  }, [phase, input, busy, genreIdx, charStep, draft, genreId, customSeed, history, add, handleSlash, startGame, renderGenreList, scrollToBottom]); // eslint-disable-line

  // ── confirm genre ──────────────────────────────────────────────────────
  const confirmGenre = useCallback((idx) => {
    const g = GENRES[idx];
    setGenreId(g.id);
    setGenreIdx(idx);
    setBlocks(p => p.filter(b => !genreIds.current.includes(b.id)));
    genreIds.current = [];
    add('gap');
    add('dim', `> ${g.label}`);
    if (g.id === 'custom') {
      setPhase('custom-seed');
      add('gap');
      add('text', 'Describe your adventure premise:');
      return;
    }
    beginChar();
  }, [add]); // eslint-disable-line

  const beginChar = useCallback(() => {
    setPhase('char');
    setCharStep(0);
    setDraft({ name: '', background: '', trait: '', goal: '' });
    add('gap');
    add('text', CHAR_QS[0].q);
    add('dim', CHAR_QS[0].hint);
  }, [add]);

  // ── keyboard handler ───────────────────────────────────────────────────
  const handleKey = useCallback((e) => {
    if (phase === 'genre') {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setGenreIdx(i => {
          const next = (i - 1 + GENRES.length) % GENRES.length;
          renderGenreList(next);
          return next;
        });
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setGenreIdx(i => {
          const next = (i + 1) % GENRES.length;
          renderGenreList(next);
          return next;
        });
        return;
      }
    }
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Math.min(cmdIdx + 1, cmdHist.length - 1);
      setCmdIdx(i); setInput(cmdHist[i] ?? '');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
      e.preventDefault();
      const i = Math.max(cmdIdx - 1, -1);
      setCmdIdx(i); setInput(i < 0 ? '' : cmdHist[i]);
    }
  }, [phase, submit, cmdIdx, cmdHist, renderGenreList]);

  const placeholder = busy ? '' : {
    welcome:       'press Enter to continue...',
    genre:         'Enter to confirm, or type 1-5',
    'custom-seed': 'describe your world...',
    char:          CHAR_QS[charStep]?.hint || '',
    game:          'what do you do?  ·  /help for commands',
  }[phase] ?? '';

  const CMD_BTNS = [
    { label: 'NEW',     cmd: '/new',     title: 'New adventure (same genre & character)' },
    { label: 'COPY',    cmd: '/copy',    title: 'Copy full adventure to clipboard' },
    { label: 'RESTART', cmd: '/restart', title: 'Return to start screen' },
    { label: 'HELP',    cmd: '/help',    title: 'Show all commands' },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #000; }
        #root { background: #000; min-height: 100vh; }
        input::placeholder { color: #444; font-family: 'Courier New', monospace; font-size: 13px; }
        ::-webkit-scrollbar { width: 4px; background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; }
        ::selection { background: #fff; color: #000; }
        button { outline: none; }
        .cmd-btn {
          background: transparent;
          border: 1px solid #333;
          color: #555;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          padding: 2px 10px;
          cursor: pointer;
          letter-spacing: 0.05em;
          transition: border-color 0.12s, color 0.12s;
        }
        .cmd-btn:hover { border-color: #888; color: #ccc; }
      `}</style>

      {/* Scrollable content */}
      <div style={{
        minHeight: '100vh',
        background: C.bg,
        padding: '32px 28px 160px',
      }}>
        {blocks.map(b => (
          <Block key={b.id} b={b} onSuggest={s => submit(s)} />
        ))}
        {busy && <Spinner />}
        <div ref={bottomRef} />
      </div>

      {/* Fixed footer: command bar + input */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderTop: `1px solid ${C.dim}`,
      }}>
        {/* Command buttons — visible only during gameplay */}
        {phase === 'game' && (
          <div style={{ padding: '6px 28px 0', display: 'flex', gap: 6 }}>
            {CMD_BTNS.map(({ label, cmd, title }) => (
              <button
                key={cmd}
                className="cmd-btn"
                title={title}
                onClick={() => { if (!busy) submit(cmd); }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Text input row */}
        <div style={{
          padding: '10px 28px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontFamily: FONT, fontSize: FS, color: C.dim, flexShrink: 0 }}>{'>'}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: C.fg, caretColor: C.fg, fontFamily: FONT, fontSize: FS,
            }}
          />
        </div>
      </div>
    </>
  );
}

function Spinner() {
  const [i, setI] = useState(0);
  const f = ['|', '/', '-', '\\'];
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % 4), 100);
    return () => clearInterval(t);
  }, []);
  return <div style={{ fontFamily: FONT, fontSize: FS, color: C.dim, maxWidth: MAX_W }}>{f[i]}</div>;
}
