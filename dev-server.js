// dev-server.js
// Local Express proxy that simulates ALL Vercel API routes during development.
// Run alongside `npm run dev` (Vite proxies /api/* here via vite.config.js).
//
// Usage:
//   node dev-server.js
//
// Requires: GROQ_API_KEY in .env.local

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local ──────────────────────────────────────────────────────────
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key) process.env[key] = val;
  });
  console.log('Loaded .env.local');
} catch {
  console.warn('.env.local not found — ensure GROQ_API_KEY is in your environment');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── /api/generate ─────────────────────────────────────────────────────────────
// Mirrors api/generate.js exactly: routes story vs art to different Groq models.
app.post('/api/generate', async (req, res) => {
  const { prompt, type = 'story' } = req.body ?? {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

  // Match the same routing as api/generate.js
  const model      = type === 'art' ? 'llama-3.1-8b-instant'  : 'llama-3.3-70b-versatile';
  const max_tokens = type === 'art' ? 300                       : 600;
  const temp       = type === 'art' ? 0.7                       : 0.9;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature: temp,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[generate] Groq error:', data.error?.message);
      return res.status(500).json({ error: data.error?.message ?? 'Groq error' });
    }

    const text = data.choices?.[0]?.message?.content ?? '';
    res.json({ text });

  } catch (err) {
    console.error('[generate] fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/ascii ────────────────────────────────────────────────────────────────
// Mirrors api/ascii.js: scrapes asciiart.eu for real ASCII art.
// Locally we just import the handler and call it with a thin adapter.

// Inline the subject→path map and scraper logic so the dev server is self-contained
const ASCII_MAP = {
  cat: ['animals','cats'], cats: ['animals','cats'], kitten: ['animals','cats'],
  dog: ['animals','dogs'], dogs: ['animals','dogs'],
  wolf: ['animals','wolves'], bear: ['animals','bears'], horse: ['animals','horses'],
  rabbit: ['animals','rabbits'], bunny: ['animals','rabbits'],
  snake: ['animals','snakes'], bird: ['animals','birds'],
  eagle: ['animals','birds'], owl: ['animals','birds'],
  fish: ['animals','fish'], shark: ['animals','sharks'],
  frog: ['animals','frogs'], spider: ['animals','spiders'],
  bat: ['animals','bats'], cow: ['animals','cows'], pig: ['animals','pigs'],
  lion: ['animals','lions'], tiger: ['animals','tigers'],
  elephant: ['animals','elephants'], monkey: ['animals','monkeys'],
  deer: ['animals','deer'], fox: ['animals','foxes'],
  rat: ['animals','rats'], mouse: ['animals','mice'],
  dragon: ['mythology','dragons'], unicorn: ['mythology','unicorns'],
  phoenix: ['mythology','phoenix'], vampire: ['mythology','vampires'],
  werewolf: ['mythology','werewolves'], mermaid: ['mythology','mermaids'],
  fairy: ['mythology','fairies'], wizard: ['people','wizard'],
  witch: ['mythology','witches'], demon: ['mythology','demons'], angel: ['mythology','angels'],
  car: ['vehicles','cars'], truck: ['vehicles','trucks'],
  plane: ['vehicles','airplanes'], airplane: ['vehicles','airplanes'],
  helicopter: ['vehicles','helicopters'], ship: ['vehicles','ships'],
  boat: ['vehicles','ships'], train: ['vehicles','trains'],
  motorcycle: ['vehicles','motorcycles'], bicycle: ['vehicles','bicycles'],
  bike: ['vehicles','bicycles'], rocket: ['space','rockets'],
  spaceship: ['space','spaceships'], ufo: ['space','ufos'],
  tree: ['plants','trees'], flower: ['plants','flowers'], rose: ['plants','roses'],
  mushroom: ['plants','mushrooms'], cactus: ['plants','cactus'],
  sun: ['space','sun'], moon: ['space','moon'], star: ['space','stars'],
  planet: ['space','planets'], astronaut: ['space','astronauts'],
  ghost: ['holiday-and-events','halloween'], pumpkin: ['holiday-and-events','halloween'],
  skeleton: ['holiday-and-events','halloween'], zombie: ['holiday-and-events','halloween'],
  santa: ['holiday-and-events','christmas'], snowman: ['holiday-and-events','christmas'],
  sword: ['weapons','sword'], gun: ['weapons','gun'], pistol: ['weapons','gun'],
  knife: ['weapons','knife'], shield: ['weapons','shield'],
  crown: ['objects','crown'], key: ['objects','keys'], book: ['objects','books'],
  candle: ['objects','candles'], bottle: ['objects','bottles'],
  chest: ['objects','chest'], door: ['objects','doors'],
  clock: ['objects','clocks'], lantern: ['objects','lanterns'],
  skull: ['people','skull'], castle: ['buildings','castles'],
  house: ['buildings','houses'], tower: ['buildings','towers'],
  lighthouse: ['buildings','lighthouses'],
  apple: ['food','apples'], cake: ['food','cakes'], pizza: ['food','pizza'],
  man: ['people','man'], woman: ['people','woman'],
  soldier: ['people','soldier'], pirate: ['people','pirate'],
  robot: ['computers','robots'],
};

function asciiLookup(query) {
  const q = query.toLowerCase().trim().replace(/[^a-z\s]/g, '');
  if (ASCII_MAP[q]) return ASCII_MAP[q];
  for (const w of q.split(/\s+/).reverse()) {
    if (ASCII_MAP[w]) return ASCII_MAP[w];
  }
  return null;
}

const asciiCache = new Map();

async function asciiScrape(category, item) {
  const url = `https://www.asciiart.eu/${category}/${item}`;
  if (asciiCache.has(url)) return { arts: asciiCache.get(url), url };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.asciiart.eu/',
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`asciiart.eu returned ${res.status}`);

  const html = await res.text();
  const arts = [];
  const re = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
      .replace(/&#(\d+);/g, (_,n) => String.fromCharCode(Number(n)))
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length >= 3 && lines.length <= 80 && raw.length >= 30) {
      arts.push(raw);
    }
  }
  if (arts.length) asciiCache.set(url, arts);
  return { arts, url };
}

app.post('/api/ascii', async (req, res) => {
  const { subject } = req.body ?? {};
  if (!subject) return res.status(400).json({ art: null, error: 'Missing subject' });

  const entry = asciiLookup(subject);
  if (!entry) return res.json({ art: null, reason: 'no_mapping' });

  const [category, item] = entry;
  try {
    const { arts, url } = await asciiScrape(category, item);
    if (!arts.length) return res.json({ art: null, reason: 'no_pre_blocks', url });
    const art = arts[Math.floor(Math.random() * arts.length)];
    res.json({ art, url });
  } catch (err) {
    console.error('[ascii] scrape error:', err.message);
    res.json({ art: null, reason: 'fetch_error', error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(3001, () => {
  console.log('Dev server on http://localhost:3001');
  console.log('  POST /api/generate  →  Groq (story: llama-3.3-70b | art: llama-3.1-8b)');
  console.log('  POST /api/ascii     →  asciiart.eu scraper');
});
