import { useState, useEffect, useRef, useCallback } from 'react';
import { GENRES, buildInitPrompt, buildActionPrompt } from './prompts.js';

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = { bg: '#000', fg: '#fff', dim: '#555', mid: '#999', green: '#00ff41', amber: '#ffb000' };
const FONT = "'Courier New', Courier, monospace";
const FS = 15;
const LH = 1.75;
const MAX_W = 680;

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
function parseResponse(raw) {
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    const obj = JSON.parse(clean);
    const story = typeof obj.story === 'string' ? obj.story : clean;
    const isGameOver = story.includes('GAME_OVER');
    return {
      story:       story.replace('GAME_OVER', '').trim(),
      art:         typeof obj.art === 'string' ? obj.art : null,
      suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.slice(0, 4) : [],
      gameOver:    isGameOver,
    };
  } catch { /* fall through */ }

  try {
    const unescape = s => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const storyM = clean.match(/"story"\s*:\s*"([\s\S]*?)(?<!\\)",/);
    const artM   = clean.match(/"art"\s*:\s*(?:(null)|"([\s\S]*?)(?<!\\)")/);
    const sugM   = clean.match(/"suggestions"\s*:\s*(\[[^\]]*\])/);

    const story = storyM ? unescape(storyM[1]) : clean;
    const art   = artM && !artM[1] && artM[2] ? unescape(artM[2]) : null;
    let suggestions = [];
    try { suggestions = sugM ? JSON.parse(sugM[1]) : []; } catch {}
    const isGameOver = story.includes('GAME_OVER');

    return {
      story:       story.replace('GAME_OVER', '').trim(),
      art,
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 4) : [],
      gameOver:    isGameOver,
    };
  } catch {
    return { story: clean, art: null, suggestions: [], gameOver: false };
  }
}

// ─── ASCII ART NORMALIZER ─────────────────────────────────────────────────────
// Makes every line the same width so art renders as a clean rectangle
function normalizeArt(raw) {
  if (!raw) return null;
  const lines = raw.split('\n');
  // Strip leading/trailing blank lines
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return null;
  // Find max width, cap at 42
  const maxW = Math.min(42, Math.max(...lines.map(l => l.length)));
  // Pad every line to maxW
  const normalized = lines.map(l => l.padEnd(maxW, ' '));
  return normalized.join('\n');
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
  Try: look, take, talk to, go, examine...
─────────────────────────────────`;

// ─── CHAR QUESTIONS ───────────────────────────────────────────────────────────
const CHAR_QS = [
  { key: 'name',       q: "What is your character's name?",           hint: 'press Enter to skip' },
  { key: 'background', q: 'What is their background or occupation?',  hint: 'e.g. soldier, scholar, thief — Enter to skip' },
  { key: 'trait',      q: 'What is their defining trait?',            hint: 'e.g. reckless, cunning, kind — Enter to skip' },
  { key: 'goal',       q: 'What do they secretly want most?',         hint: 'e.g. revenge, belonging, escape — Enter to skip' },
];

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
const SETTINGS_CONFIG = [
  {
    key: 'consequences',
    label: 'CONSEQUENCES',
    on:  'ON  — your actions have real, lasting effects on the world',
    off: 'OFF — the world reacts in the moment but forgets',
  },
  {
    key: 'storyEnds',
    label: 'PERMADEATH',
    on:  'ON  — death ends the story permanently',
    off: 'OFF — near-death is dramatic but never final',
  },
  {
    key: 'realRefs',
    label: 'REAL-WORLD REFS',
    on:  'ON  — real places, culture, and history may appear',
    off: 'OFF — world is fully self-contained fiction',
  },
];

// ─── BLOCK RENDERER ───────────────────────────────────────────────────────────
function Block({ b, onSuggest }) {
  const base = { fontFamily: FONT, fontSize: FS, lineHeight: LH, maxWidth: MAX_W };

  if (b.type === 'gap')   return <div style={{ height: '0.6em' }} />;
  if (b.type === 'rule')  return <div style={{ ...base, color: C.dim }}>{'─'.repeat(50)}</div>;
  if (b.type === 'dim')   return <div style={{ ...base, color: C.dim, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.text}</div>;
  if (b.type === 'green') return <div style={{ ...base, color: C.green }}>{b.text}</div>;
  if (b.type === 'amber') return <div style={{ ...base, color: C.amber, whiteSpace: 'pre-wrap' }}>{b.text}</div>;

  if (b.type === 'gameover') {
    return (
      <div style={{ ...base, maxWidth: MAX_W, margin: '16px 0' }}>
        <div style={{ color: C.dim }}>{'─'.repeat(50)}</div>
        <div style={{ color: '#ff3333', fontFamily: FONT, fontSize: 18, letterSpacing: '0.2em', margin: '10px 0 4px' }}>
          ✦  GAME OVER  ✦
        </div>
        <div style={{ color: C.dim, fontSize: 13 }}>Type /new to start again or /restart to return to the beginning.</div>
        <div style={{ color: C.dim }}>{'─'.repeat(50)}</div>
      </div>
    );
  }

  if (b.type === 'art') {
    const normalized = normalizeArt(b.text);
    if (!normalized) return null;
    return (
      <pre style={{
        ...base,
        fontSize: 13,
        lineHeight: 1.5,
        color: C.mid,
        whiteSpace: 'pre',
        overflowX: 'auto',
        borderLeft: `2px solid #333`,
        paddingLeft: 12,
        margin: '8px 0',
        display: 'block',
      }}>
        {normalized}
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

  if (b.type === 'setting-row') {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'baseline', gap: 12, margin: '2px 0' }}>
        <span style={{ color: b.active ? C.fg : C.dim, minWidth: 26 }}>{b.active ? '>' : ' '}</span>
        <span style={{ color: b.active ? C.amber : C.dim, minWidth: 140, fontSize: 13, letterSpacing: '0.05em' }}>{b.label}</span>
        <span style={{ color: b.active ? C.fg : C.dim, fontSize: 13 }}>{b.value}</span>
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
  const [isDead,   setIsDead]   = useState(false);

  // Settings state
  const [settings, setSettings] = useState({ consequences: true, storyEnds: true, realRefs: false });
  const [settingIdx, setSettingIdx] = useState(0);

  const inputRef   = useRef(null);
  const bottomRef  = useRef(null);
  const fullText   = useRef('');
  const genreIds   = useRef([]);
  const settingIds = useRef([]);
  const hasInit    = useRef(false);
  const userScrolled = useRef(false);
  const scrollTimeout = useRef(null);

  // ── smart scroll: auto-scroll unless user has scrolled up ─────────────
  useEffect(() => {
    const onScroll = () => {
      const distFromBottom =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (distFromBottom > 180) {
        userScrolled.current = true;
      } else {
        userScrolled.current = false;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── scroll to bottom on new blocks unless user scrolled up ────────────
  useEffect(() => {
    if (!userScrolled.current) {
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 30);
    }
  }, [blocks, busy]);

  const forceScrollDown = useCallback(() => {
    userScrolled.current = false;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // ── focus input ────────────────────────────────────────────────────────
  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [busy, phase]);

  // ── WELCOME ───────────────────────────────────────────────────────────
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
    ids.push(add('dim', 'Up/Down to move  ·  Enter to confirm  ·  type 1-6 to jump'));
    ids.push(add('gap'));
    GENRES.forEach((g, i) => {
      ids.push(add(i === activeIdx ? 'text' : 'dim', `  ${i === activeIdx ? '>' : ' '} ${g.label}`));
    });
    ids.push(add('gap'));
    genreIds.current = ids;
  }, [add]);

  // ── render settings ────────────────────────────────────────────────────
  const renderSettings = useCallback((activeIdx, currentSettings) => {
    if (settingIds.current.length) {
      setBlocks(p => p.filter(b => !settingIds.current.includes(b.id)));
    }
    const ids = [];
    ids.push(add('gap'));
    ids.push(add('dim', 'GAME SETTINGS'));
    ids.push(add('dim', 'Up/Down to select  ·  Left/Right or Space to toggle  ·  Enter to confirm'));
    ids.push(add('gap'));
    SETTINGS_CONFIG.forEach((s, i) => {
      const val = currentSettings[s.key];
      ids.push(add('setting-row', '', {
        label:  s.label,
        value:  val ? s.on : s.off,
        active: i === activeIdx,
      }));
    });
    ids.push(add('gap'));
    ids.push(add('dim', '  Enter to begin adventure'));
    settingIds.current = ids;
  }, [add]);

  // ── start game ─────────────────────────────────────────────────────────
  const startGame = useCallback(async (gId, gSeed, cSeed, cInfo, gameSettings) => {
    add('rule');
    add('gap');
    setBusy(true);
    setIsDead(false);
    try {
      const prompt = buildInitPrompt(gId, gSeed, { ...cInfo, customSeed: cSeed }, gameSettings);
      const raw    = await callGroq(prompt);
      const { story, art, suggestions, gameOver } = parseResponse(raw);

      setHistory([{ role: 'assistant', content: story }]);
      if (art) add('art', art);
      add('text', story);
      if (suggestions.length && !gameOver) add('suggestions', '', { items: suggestions });
      if (gameOver) { add('gameover'); setIsDead(true); }
    } catch (e) {
      add('dim', 'ERROR: ' + e.message);
    }
    setBusy(false);
    setPhase('game');
    forceScrollDown();
  }, [add, forceScrollDown]);

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
      setCharStep(0); setCustomSeed(''); genreIds.current = []; settingIds.current = [];
      fullText.current = ''; setIsDead(false);
      hasInit.current = false;
      setPhase('welcome');
      setTimeout(() => {
        hasInit.current = true;
        add('text', 'WELCOME TO RETROTEXT ADVENTURES');
        add('gap');
        add('dim', 'press Enter to continue...');
        forceScrollDown();
      }, 0);
      return;
    }
    if (c === '/new') {
      setHistory([]);
      setIsDead(false);
      add('gap');
      await startGame(genreId, GENRES.find(g => g.id === genreId)?.seed || '', customSeed, charInfo, settings);
      return;
    }
    add('dim', `Unknown command: ${cmd}. Type /help for commands.`);
  }, [add, startGame, genreId, customSeed, charInfo, settings, forceScrollDown]);

  // ── main submit ────────────────────────────────────────────────────────
  const submit = useCallback(async (override) => {
    const cmd = (override ?? input).trim();
    if (busy) return;
    if (override === undefined) setInput('');
    if (cmd) { setCmdHist(h => [cmd, ...h.slice(0, 99)]); setCmdIdx(-1); }

    forceScrollDown();

    // ── welcome ──
    if (phase === 'welcome') {
      setPhase('genre');
      renderGenreList(genreIdx);
      return;
    }

    // ── genre select ──
    if (phase === 'genre') {
      const n = parseInt(cmd, 10);
      if (!isNaN(n) && n >= 1 && n <= GENRES.length) {
        confirmGenre(n - 1);
        return;
      }
      confirmGenre(genreIdx);
      return;
    }

    // ── custom seed ──
    if (phase === 'custom-seed') {
      if (!cmd) { add('dim', 'Please describe your premise first.'); return; }
      setCustomSeed(cmd);
      add('dim', `> ${cmd}`);
      beginChar();
      return;
    }

    // ── character creation ──
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
        // Go to settings instead of starting immediately
        beginSettings(newDraft);
      }
      return;
    }

    // ── settings ──
    if (phase === 'settings') {
      if (phase === 'settings') {
        // Enter confirms
        const finalInfo = charInfo;
        setPhase('game');
        await startGame(
          genreId,
          GENRES.find(g => g.id === genreId)?.seed || '',
          customSeed,
          finalInfo,
          settings
        );
      }
      return;
    }

    // ── game ──
    if (phase === 'game') {
      if (!cmd) return;
      if (isDead && !cmd.startsWith('/')) {
        add('dim', 'Your story has ended. Type /new to start again or /restart for the beginning.');
        return;
      }
      if (cmd.startsWith('/')) { add('user', cmd); await handleSlash(cmd); return; }
      add('user', cmd);
      setBusy(true);
      try {
        const raw = await callGroq(buildActionPrompt(history, cmd, settings));
        const { story, art, suggestions, gameOver } = parseResponse(raw);
        setHistory(h => [
          ...h,
          { role: 'user', content: cmd },
          { role: 'assistant', content: story },
        ].slice(-24));
        if (art) add('art', art);
        add('text', story);
        if (gameOver) {
          add('gameover');
          setIsDead(true);
        } else if (suggestions.length) {
          add('suggestions', '', { items: suggestions });
        }
      } catch (e) {
        add('dim', 'ERROR: ' + e.message);
      }
      setBusy(false);
      forceScrollDown();
    }
  }, [phase, input, busy, genreIdx, charStep, draft, genreId, customSeed, history, settings, isDead, add, handleSlash, startGame, renderGenreList, forceScrollDown, charInfo]); // eslint-disable-line

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

  const beginSettings = useCallback((finalCharInfo) => {
    setPhase('settings');
    setSettingIdx(0);
    renderSettings(0, settings);
  }, [renderSettings, settings]); // eslint-disable-line

  // ── keyboard handler ───────────────────────────────────────────────────
  const handleKey = useCallback((e) => {
    // Genre navigation
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

    // Settings navigation
    if (phase === 'settings') {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSettingIdx(i => {
          const next = (i - 1 + SETTINGS_CONFIG.length) % SETTINGS_CONFIG.length;
          renderSettings(next, settings);
          return next;
        });
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSettingIdx(i => {
          const next = (i + 1) % SETTINGS_CONFIG.length;
          renderSettings(next, settings);
          return next;
        });
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSettings(prev => {
          const key = SETTINGS_CONFIG[settingIdx].key;
          const next = { ...prev, [key]: !prev[key] };
          renderSettings(settingIdx, next);
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
  }, [phase, submit, cmdIdx, cmdHist, renderGenreList, renderSettings, settings, settingIdx]);

  const placeholder = busy ? '' : {
    welcome:        'press Enter to continue...',
    genre:          'Enter to confirm, or type 1-6',
    'custom-seed':  'describe your world...',
    char:           CHAR_QS[charStep]?.hint || '',
    settings:       'Space/←/→ to toggle  ·  Enter to begin',
    game:           isDead ? '/new to restart  ·  /restart for menu' : 'what do you do?  ·  /help for commands',
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
        ::-webkit-scrollbar-thumb { background: #2a2a2a; }
        ::selection { background: #fff; color: #000; }
        button { outline: none; }
        .cmd-btn {
          background: transparent;
          border: 1px solid #2a2a2a;
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
        padding: '32px 28px 180px',
      }}>
        {blocks.map(b => (
          <Block key={b.id} b={b} onSuggest={s => submit(s)} />
        ))}
        {busy && <Spinner />}
        <div ref={bottomRef} />
      </div>

      {/* Fixed footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.bg,
        borderTop: `1px solid #222`,
      }}>
        {/* Scroll-to-bottom nudge — shown when user has scrolled up */}
        <ScrollNudge onNudge={forceScrollDown} blocks={blocks} />

        {/* Command buttons — visible during gameplay */}
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

        {/* Input row */}
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

// ─── SCROLL NUDGE ─────────────────────────────────────────────────────────────
function ScrollNudge({ onNudge, blocks }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const dist = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      setVisible(dist > 200);
    };
    window.addEventListener('scroll', check, { passive: true });
    // Also check whenever blocks change
    check();
    return () => window.removeEventListener('scroll', check);
  }, [blocks]);

  if (!visible) return null;
  return (
    <div
      onClick={onNudge}
      style={{
        padding: '4px 28px',
        color: '#444',
        fontFamily: FONT,
        fontSize: 11,
        cursor: 'pointer',
        letterSpacing: '0.05em',
        userSelect: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#888'}
      onMouseLeave={e => e.currentTarget.style.color = '#444'}
    >
      ↓ scroll to latest
    </div>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner() {
  const [i, setI] = useState(0);
  const f = ['|', '/', '-', '\\'];
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % 4), 100);
    return () => clearInterval(t);
  }, []);
  return <div style={{ fontFamily: FONT, fontSize: FS, color: C.dim, maxWidth: MAX_W }}>{f[i]}</div>;
}
