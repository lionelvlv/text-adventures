import { useState, useEffect, useRef, useCallback } from 'react';
import { GENRES, buildInitPrompt, buildActionPrompt, buildArtPrompt, rollDice } from './prompts.js';

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#000', fg: '#fff', dim: '#444', mid: '#888',
  green: '#00ff41', amber: '#ffb000', red: '#ff3333',
};
const FONT = "'Courier New', Courier, monospace";
const FS = 15;
const LH = 1.75;
const MAX_W = 680;

// ─── API ──────────────────────────────────────────────────────────────────────
async function callAPI(prompt, type = 'story') {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data.text ?? '';
}

// ─── PARSE STORY RESPONSE ─────────────────────────────────────────────────────
function parseResponse(raw) {
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const extract = (str) => {
    try {
      const obj = JSON.parse(str);
      const story = typeof obj.story === 'string' ? obj.story : '';
      const isOver = story.includes('GAME_OVER');
      return {
        story:       story.replace(/GAME_OVER/g, '').trim(),
        artSubject:  typeof obj.artSubject === 'string' && obj.artSubject !== 'null' ? obj.artSubject : null,
        suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.slice(0, 4) : [],
        gameOver:    isOver,
      };
    } catch { return null; }
  };

  const direct = extract(clean);
  if (direct) return direct;

  // Regex fallback
  try {
    const unesc = s => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const sM = clean.match(/"story"\s*:\s*"([\s\S]*?)(?<!\\)"/);
    const aM = clean.match(/"artSubject"\s*:\s*(?:(null)|"([\s\S]*?)(?<!\\)")/);
    const gM = clean.match(/"suggestions"\s*:\s*(\[[^\]]*\])/);
    const story = sM ? unesc(sM[1]) : clean;
    const artSubject = aM && !aM[1] && aM[2] ? unesc(aM[2]) : null;
    let suggestions = [];
    try { suggestions = gM ? JSON.parse(gM[1]) : []; } catch {}
    const isOver = story.includes('GAME_OVER');
    return { story: story.replace(/GAME_OVER/g, '').trim(), artSubject, suggestions, gameOver: isOver };
  } catch {
    return { story: clean, artSubject: null, suggestions: [], gameOver: false };
  }
}

// ─── PARSE ART RESPONSE ───────────────────────────────────────────────────────
function parseArtResponse(raw) {
  if (!raw) return { art: null, caption: null };
  const lines = raw.split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  if (!lines.length) return { art: null, caption: null };

  const last = lines[lines.length - 1].trim();
  const capMatch = last.match(/^\((.+)\)$/);
  let caption = null;
  let artLines = lines;
  if (capMatch) {
    caption = capMatch[1];
    artLines = lines.slice(0, -1);
    while (artLines.length && !artLines[artLines.length - 1].trim()) artLines.pop();
  }

  if (!artLines.length) return { art: null, caption };
  const maxW = Math.min(50, Math.max(...artLines.map(l => l.length)));
  const art = artLines.map(l => l.padEnd(maxW, ' ')).join('\n');
  return { art, caption };
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
  Be specific — "bribe the guard with your
  last coin" beats "talk to guard".
─────────────────────────────────`;

// ─── CHARACTER QUESTIONS ──────────────────────────────────────────────────────
const CHAR_QS = [
  { key: 'name',       q: "What is your character's name?",          hint: 'press Enter to skip' },
  { key: 'background', q: 'What is their background or occupation?', hint: 'e.g. soldier, scholar, thief — Enter to skip' },
  { key: 'trait',      q: 'What is their defining trait?',           hint: 'e.g. reckless, cunning, kind — Enter to skip' },
  { key: 'goal',       q: 'What do they secretly want most?',        hint: 'e.g. revenge, belonging, escape — Enter to skip' },
];

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
const SETTINGS_CONFIG = [
  {
    key: 'consequences', label: 'REALISM',
    on:  'ON  — world tracks your actions, physics are real',
    off: 'OFF — casual, actions tend to go your way',
  },
  {
    key: 'dice', label: 'DICE ROLLS',
    on:  'ON  — d20 governs whether actions succeed',
    off: 'OFF — narrator decides outcomes by context',
  },
  {
    key: 'storyEnds', label: 'PERMADEATH',
    on:  'ON  — death (or choosing to die) ends the story',
    off: 'OFF — you always survive somehow',
  },
  {
    key: 'realRefs', label: 'REAL-WORLD REFS',
    on:  'ON  — real places and culture may appear',
    off: 'OFF — fully fictional world',
  },
];

// ─── DICE DISPLAY ─────────────────────────────────────────────────────────────
function DiceDisplay({ result }) {
  const color = {
    crit_success: C.green, success: C.green,
    partial: C.amber,
    fail: C.red, crit_fail: C.red,
  }[result.outcome] ?? C.mid;
  return (
    <div style={{ fontFamily: FONT, fontSize: 12, color: C.dim, margin: '4px 0 2px', maxWidth: MAX_W }}>
      <span style={{ color, letterSpacing: '0.07em' }}>⚄ {result.label}</span>
      <span style={{ color: C.dim }}> (d20: {result.roll})</span>
    </div>
  );
}

// ─── BLOCK RENDERER ───────────────────────────────────────────────────────────
function Block({ b, onSuggest }) {
  const base = { fontFamily: FONT, fontSize: FS, lineHeight: LH, maxWidth: MAX_W };

  if (b.type === 'gap')   return <div style={{ height: '0.55em' }} />;
  if (b.type === 'rule')  return <div style={{ ...base, color: C.dim }}>{'─'.repeat(50)}</div>;
  if (b.type === 'dim')   return <div style={{ ...base, color: C.dim, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.text}</div>;
  if (b.type === 'green') return <div style={{ ...base, color: C.green }}>{b.text}</div>;
  if (b.type === 'dice')  return <DiceDisplay result={b.result} />;

  if (b.type === 'gameover') {
    return (
      <div style={{ maxWidth: MAX_W, margin: '20px 0' }}>
        <div style={{ color: C.dim, fontFamily: FONT }}>{'─'.repeat(50)}</div>
        <div style={{ color: C.red, fontFamily: FONT, fontSize: 17, letterSpacing: '0.25em', margin: '12px 0 5px' }}>
          ✦  GAME OVER  ✦
        </div>
        <div style={{ color: C.dim, fontFamily: FONT, fontSize: 13 }}>
          /new to try again  ·  /restart for the menu
        </div>
        <div style={{ color: C.dim, fontFamily: FONT, marginTop: 8 }}>{'─'.repeat(50)}</div>
      </div>
    );
  }

  if (b.type === 'art') {
    return (
      <div style={{ margin: '10px 0 2px', maxWidth: MAX_W }}>
        <pre style={{
          fontFamily: FONT, fontSize: 12, lineHeight: 1.45,
          color: C.mid, whiteSpace: 'pre', overflowX: 'auto',
          borderLeft: '2px solid #242424', paddingLeft: 14, margin: 0,
        }}>
          {b.text}
        </pre>
        {b.caption && (
          <div style={{ fontFamily: FONT, fontSize: 11, color: '#3a3a3a', paddingLeft: 16, marginTop: 3 }}>
            ({b.caption})
          </div>
        )}
      </div>
    );
  }

  if (b.type === 'user') {
    return <div style={{ ...base, color: C.mid, margin: '12px 0 2px' }}>{'> '}{b.text}</div>;
  }

  if (b.type === 'help') {
    return <pre style={{ ...base, fontSize: 13, lineHeight: 1.85, color: C.dim, whiteSpace: 'pre', margin: '4px 0' }}>{b.text}</pre>;
  }

  if (b.type === 'suggestions') {
    return (
      <div style={{ maxWidth: MAX_W, display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 4px' }}>
        {b.items.map((s, i) => (
          <button key={i} onClick={() => onSuggest(s)} style={{
            background: 'transparent', border: '1px solid #252525',
            color: C.mid, fontFamily: FONT, fontSize: 13, padding: '3px 12px', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#777'; e.currentTarget.style.color = C.fg; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#252525'; e.currentTarget.style.color = C.mid; }}>
            {s}
          </button>
        ))}
      </div>
    );
  }

  if (b.type === 'setting-row') {
    return (
      <div style={{ ...base, display: 'flex', alignItems: 'baseline', gap: 12, margin: '3px 0' }}>
        <span style={{ color: b.active ? C.fg : C.dim, minWidth: 18, flexShrink: 0 }}>{b.active ? '>' : ' '}</span>
        <span style={{ color: b.active ? C.amber : C.dim, minWidth: 160, fontSize: 13, letterSpacing: '0.06em', flexShrink: 0 }}>{b.label}</span>
        <span style={{ color: b.active ? C.fg : C.dim, fontSize: 13 }}>{b.value}</span>
      </div>
    );
  }

  return (
    <div style={{ ...base, color: C.fg, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
      {b.text}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [blocks,     setBlocks]     = useState([]);
  const [input,      setInput]      = useState('');
  const [busy,       setBusy]       = useState(false);
  const [phase,      setPhase]      = useState('welcome');
  const [genreIdx,   setGenreIdx]   = useState(0);
  const [genreId,    setGenreId]    = useState('fantasy');
  const [customSeed, setCustomSeed] = useState('');
  const [charStep,   setCharStep]   = useState(0);
  const [draft,      setDraft]      = useState({ name: '', background: '', trait: '', goal: '' });
  const [charInfo,   setCharInfo]   = useState({});
  const [history,    setHistory]    = useState([]);
  const [cmdHist,    setCmdHist]    = useState([]);
  const [cmdIdx,     setCmdIdx]     = useState(-1);
  const [isDead,     setIsDead]     = useState(false);
  const [settings,   setSettings]   = useState({ consequences: true, dice: true, storyEnds: true, realRefs: false });
  const [settingIdx, setSettingIdx] = useState(0);

  const inputRef   = useRef(null);
  const scrollRef  = useRef(null);  // the scrollable container
  const bottomRef  = useRef(null);
  const fullText   = useRef('');
  const genreIds   = useRef([]);
  const settingIds = useRef([]);
  const hasInit    = useRef(false);
  // Track if user has scrolled up manually
  const userScrolledUp = useRef(false);

  // ── Scroll logic: container-based so it always works ──────────────────
  // We use a fixed-height outer shell with overflow-y: auto on a scrollable div.
  // This is more reliable than window scrolling.

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (force || !userScrolledUp.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const forceScrollDown = useCallback(() => {
    userScrolledUp.current = false;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Track user scroll position within the container
  const handleContainerScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = dist > 250;
  }, []);

  // Auto-scroll when blocks change, unless user scrolled up
  useEffect(() => {
    scrollToBottom();
  }, [blocks, busy]); // eslint-disable-line

  // ── Add block ──────────────────────────────────────────────────────────
  const add = useCallback((type, text = '', extra = {}) => {
    const id = crypto.randomUUID();
    setBlocks(p => [...p, { id, type, text, ...extra }]);
    if (['story', 'user', 'art', 'text', 'help'].includes(type)) {
      fullText.current += text + '\n';
    }
    return id;
  }, []);

  // ── Focus ──────────────────────────────────────────────────────────────
  useEffect(() => { if (!busy) inputRef.current?.focus(); }, [busy, phase]);

  // ── Welcome ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    add('text', 'WELCOME TO RETROTEXT ADVENTURES');
    add('gap');
    add('dim', 'press Enter to continue...');
  }, []); // eslint-disable-line

  // ── Genre list ─────────────────────────────────────────────────────────
  const renderGenreList = useCallback((activeIdx) => {
    if (genreIds.current.length) setBlocks(p => p.filter(b => !genreIds.current.includes(b.id)));
    const ids = [];
    ids.push(add('gap'));
    ids.push(add('dim', 'SELECT YOUR ADVENTURE TYPE'));
    ids.push(add('dim', 'Up/Down  ·  Enter to confirm  ·  1-6 to jump'));
    ids.push(add('gap'));
    GENRES.forEach((g, i) => ids.push(add(i === activeIdx ? 'text' : 'dim', `  ${i === activeIdx ? '>' : ' '} ${g.label}`)));
    ids.push(add('gap'));
    genreIds.current = ids;
  }, [add]);

  // ── Settings ───────────────────────────────────────────────────────────
  const renderSettings = useCallback((activeIdx, cur) => {
    if (settingIds.current.length) setBlocks(p => p.filter(b => !settingIds.current.includes(b.id)));
    const ids = [];
    ids.push(add('gap'));
    ids.push(add('dim', 'GAME SETTINGS'));
    ids.push(add('dim', 'Up/Down to select  ·  Space / ← → to toggle  ·  Enter to begin'));
    ids.push(add('gap'));
    SETTINGS_CONFIG.forEach((s, i) => {
      ids.push(add('setting-row', '', { label: s.label, value: cur[s.key] ? s.on : s.off, active: i === activeIdx }));
    });
    ids.push(add('gap'));
    ids.push(add('dim', '  Enter to begin adventure'));
    settingIds.current = ids;
  }, [add]);

  // ── Fetch ASCII art in background (uses 'art' type → fast model) ───────
  const fetchArt = useCallback(async (subject) => {
    if (!subject) return;
    try {
      const raw = await callAPI(buildArtPrompt(subject), 'art');
      const { art, caption } = parseArtResponse(raw);
      if (art) add('art', art, { caption });
    } catch {
      // Art is optional — silent fail
    }
  }, [add]);

  // ── Start game ─────────────────────────────────────────────────────────
  const startGame = useCallback(async (gId, gSeed, cSeed, cInfo, gs) => {
    add('rule');
    add('gap');
    setBusy(true);
    setIsDead(false);
    try {
      const raw = await callAPI(buildInitPrompt(gId, gSeed, { ...cInfo, customSeed: cSeed }, gs), 'story');
      const { story, artSubject, suggestions, gameOver } = parseResponse(raw);
      setHistory([{ role: 'assistant', content: story }]);
      add('text', story);
      if (suggestions.length && !gameOver) add('suggestions', '', { items: suggestions });
      if (gameOver) { add('gameover'); setIsDead(true); }
      if (artSubject) fetchArt(artSubject);
    } catch (e) {
      add('dim', 'ERROR: ' + e.message);
    }
    setBusy(false);
    setPhase('game');
    forceScrollDown();
  }, [add, fetchArt, forceScrollDown]);

  // ── Slash commands ─────────────────────────────────────────────────────
  const handleSlash = useCallback(async (cmd) => {
    const c = cmd.toLowerCase().trim();
    if (c === '/help')  { add('help', HELP); return; }
    if (c === '/clear') { setBlocks([]); fullText.current = ''; return; }
    if (c === '/copy') {
      try { await navigator.clipboard.writeText(fullText.current); add('green', '✓ Copied to clipboard.'); }
      catch { add('dim', 'Copy failed — select text manually.'); }
      return;
    }
    if (c === '/restart') {
      setBlocks([]); setHistory([]); setCharInfo({});
      setDraft({ name: '', background: '', trait: '', goal: '' });
      setCharStep(0); setCustomSeed('');
      genreIds.current = []; settingIds.current = [];
      fullText.current = ''; setIsDead(false);
      hasInit.current = false; userScrolledUp.current = false;
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
      setHistory([]); setIsDead(false); add('gap');
      await startGame(genreId, GENRES.find(g => g.id === genreId)?.seed || '', customSeed, charInfo, settings);
      return;
    }
    add('dim', `Unknown command: ${cmd}. Type /help.`);
  }, [add, startGame, genreId, customSeed, charInfo, settings, forceScrollDown]);

  // ── Main submit ────────────────────────────────────────────────────────
  const submit = useCallback(async (override) => {
    const cmd = (override ?? input).trim();
    if (busy) return;
    if (override === undefined) setInput('');
    if (cmd) { setCmdHist(h => [cmd, ...h.slice(0, 99)]); setCmdIdx(-1); }

    if (phase === 'welcome') { setPhase('genre'); renderGenreList(genreIdx); return; }

    if (phase === 'genre') {
      const n = parseInt(cmd, 10);
      if (!isNaN(n) && n >= 1 && n <= GENRES.length) { confirmGenre(n - 1); return; }
      confirmGenre(genreIdx);
      return;
    }

    if (phase === 'custom-seed') {
      if (!cmd) { add('dim', 'Please describe your premise.'); return; }
      setCustomSeed(cmd); add('dim', `> ${cmd}`); beginChar(); return;
    }

    if (phase === 'char') {
      add('dim', `> ${cmd}`);
      const key = CHAR_QS[charStep].key;
      const newDraft = { ...draft, [key]: cmd };
      setDraft(newDraft);
      if (charStep < CHAR_QS.length - 1) {
        const next = charStep + 1; setCharStep(next);
        add('gap'); add('text', CHAR_QS[next].q); add('dim', CHAR_QS[next].hint);
      } else {
        setCharInfo(newDraft); beginSettings();
      }
      return;
    }

    if (phase === 'settings') {
      setBlocks(p => p.filter(b => !settingIds.current.includes(b.id)));
      settingIds.current = [];
      await startGame(genreId, GENRES.find(g => g.id === genreId)?.seed || '', customSeed, charInfo, settings);
      return;
    }

    if (phase === 'game') {
      if (!cmd) return;
      if (isDead && !cmd.startsWith('/')) {
        add('dim', 'Your story has ended.  /new to try again  ·  /restart for menu');
        return;
      }
      if (cmd.startsWith('/')) { add('user', cmd); await handleSlash(cmd); return; }

      add('user', cmd);

      // Dice roll if enabled
      let diceResult = null;
      if (settings.dice) {
        diceResult = rollDice();
        add('dice', '', { result: diceResult });
      }

      forceScrollDown();
      setBusy(true);

      try {
        const raw = await callAPI(buildActionPrompt(history, cmd, diceResult, settings), 'story');
        const { story, artSubject, suggestions, gameOver } = parseResponse(raw);

        setHistory(h => [
          ...h,
          { role: 'user',      content: cmd },
          { role: 'assistant', content: story },
        ].slice(-24));

        add('text', story);
        if (gameOver) {
          add('gameover'); setIsDead(true);
        } else if (suggestions.length) {
          add('suggestions', '', { items: suggestions });
        }
        if (artSubject) fetchArt(artSubject);
      } catch (e) {
        add('dim', 'ERROR: ' + e.message);
      }

      setBusy(false);
      forceScrollDown();
    }
  }, [
    phase, input, busy, genreIdx, charStep, draft,
    genreId, customSeed, history, settings, isDead,
    add, handleSlash, startGame, renderGenreList,
    forceScrollDown, charInfo, fetchArt,
  ]); // eslint-disable-line

  // ── Confirm genre ──────────────────────────────────────────────────────
  const confirmGenre = useCallback((idx) => {
    const g = GENRES[idx];
    setGenreId(g.id); setGenreIdx(idx);
    setBlocks(p => p.filter(b => !genreIds.current.includes(b.id)));
    genreIds.current = [];
    add('gap'); add('dim', `> ${g.label}`);
    if (g.id === 'custom') { setPhase('custom-seed'); add('gap'); add('text', 'Describe your adventure premise:'); return; }
    beginChar();
  }, [add]); // eslint-disable-line

  const beginChar = useCallback(() => {
    setPhase('char'); setCharStep(0);
    setDraft({ name: '', background: '', trait: '', goal: '' });
    add('gap'); add('text', CHAR_QS[0].q); add('dim', CHAR_QS[0].hint);
  }, [add]);

  const beginSettings = useCallback(() => {
    setPhase('settings'); setSettingIdx(0); renderSettings(0, settings);
  }, [renderSettings, settings]);

  // ── Keyboard ───────────────────────────────────────────────────────────
  const handleKey = useCallback((e) => {
    if (phase === 'genre') {
      if (e.key === 'ArrowUp')   { e.preventDefault(); setGenreIdx(i => { const n = (i - 1 + GENRES.length) % GENRES.length; renderGenreList(n); return n; }); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setGenreIdx(i => { const n = (i + 1) % GENRES.length; renderGenreList(n); return n; }); return; }
    }
    if (phase === 'settings') {
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSettingIdx(i => { const n = (i - 1 + SETTINGS_CONFIG.length) % SETTINGS_CONFIG.length; renderSettings(n, settings); return n; }); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSettingIdx(i => { const n = (i + 1) % SETTINGS_CONFIG.length; renderSettings(n, settings); return n; }); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setSettings(prev => { const key = SETTINGS_CONFIG[settingIdx].key; const next = { ...prev, [key]: !prev[key] }; renderSettings(settingIdx, next); return next; });
        return;
      }
    }
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') { e.preventDefault(); const i = Math.min(cmdIdx + 1, cmdHist.length - 1); setCmdIdx(i); setInput(cmdHist[i] ?? ''); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') { e.preventDefault(); const i = Math.max(cmdIdx - 1, -1); setCmdIdx(i); setInput(i < 0 ? '' : cmdHist[i]); }
  }, [phase, submit, cmdIdx, cmdHist, renderGenreList, renderSettings, settings, settingIdx]);

  const placeholder = busy ? '' : ({
    welcome:       'press Enter to continue...',
    genre:         'Enter to confirm, or type 1-6',
    'custom-seed': 'describe your world...',
    char:          CHAR_QS[charStep]?.hint || '',
    settings:      'Space / ← → to toggle  ·  Enter to begin',
    game:          isDead ? '/new to try again  ·  /restart for menu' : 'what do you do?  ·  /help',
  }[phase] ?? '');

  const CMD_BTNS = [
    { label: 'NEW',     cmd: '/new',     title: 'New adventure' },
    { label: 'COPY',    cmd: '/copy',    title: 'Copy to clipboard' },
    { label: 'RESTART', cmd: '/restart', title: 'Return to start' },
    { label: 'HELP',    cmd: '/help',    title: 'Show commands' },
  ];

  const FOOTER_H = phase === 'game' ? 84 : 52;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; background: #000; overflow: hidden; }
        input::placeholder { color: #333; font-family: 'Courier New', monospace; font-size: 13px; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
        ::selection { background: #fff; color: #000; }
        button { outline: none; border: none; }
        .cmd-btn {
          background: transparent; border: 1px solid #1e1e1e !important;
          color: #444; font-family: 'Courier New', monospace;
          font-size: 11px; padding: 2px 10px; cursor: pointer;
          letter-spacing: 0.05em; transition: border-color 0.1s, color 0.1s;
        }
        .cmd-btn:hover { border-color: #666 !important; color: #bbb; }
      `}</style>

      {/* Full-height flex column */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>

        {/* ── Scrollable story area ── */}
        <div
          ref={scrollRef}
          onScroll={handleContainerScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px 28px 24px',
            // Scroll snap would fight us — leave off
          }}
        >
          {blocks.map(b => <Block key={b.id} b={b} onSuggest={s => submit(s)} />)}
          {busy && <Spinner />}
          <div ref={bottomRef} style={{ height: 8 }} />
        </div>

        {/* ── "↓ latest" nudge ── */}
        <ScrollNudge scrollRef={scrollRef} onNudge={forceScrollDown} blocks={blocks} busy={busy} />

        {/* ── Fixed footer ── */}
        <div style={{ flexShrink: 0, background: C.bg, borderTop: '1px solid #181818' }}>
          {phase === 'game' && (
            <div style={{ padding: '6px 28px 0', display: 'flex', gap: 6 }}>
              {CMD_BTNS.map(({ label, cmd, title }) => (
                <button key={cmd} className="cmd-btn" title={title} onClick={() => { if (!busy) submit(cmd); }}>{label}</button>
              ))}
            </div>
          )}
          <div style={{ padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
      </div>
    </>
  );
}

// ─── SCROLL NUDGE ─────────────────────────────────────────────────────────────
function ScrollNudge({ scrollRef, onNudge, blocks, busy }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShow(dist > 250);
    };
    el.addEventListener('scroll', check, { passive: true });
    check();
    return () => el.removeEventListener('scroll', check);
  }, [scrollRef, blocks, busy]);

  if (!show) return null;
  return (
    <div
      onClick={onNudge}
      style={{
        flexShrink: 0, padding: '4px 28px',
        fontFamily: FONT, fontSize: 11, color: '#2e2e2e',
        cursor: 'pointer', letterSpacing: '0.07em', userSelect: 'none',
        background: C.bg, transition: 'color 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#666'}
      onMouseLeave={e => e.currentTarget.style.color = '#2e2e2e'}
    >
      ↓  scroll to latest
    </div>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner() {
  const [i, setI] = useState(0);
  const f = ['|', '/', '-', '\\'];
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % 4), 120); return () => clearInterval(t); }, []);
  return <div style={{ fontFamily: FONT, fontSize: FS, color: C.dim }}>{f[i]}</div>;
}
