// api/ascii.js
// Vercel serverless function — scrapes asciiart.eu and returns a random
// ASCII art block from a <pre> tag. Falls back to { art: null } silently.
//
// POST /api/ascii
// Body:     { "subject": "dragon" }
// Response: { "art": "...", "url": "https://..." }  |  { "art": null }

// ─── SUBJECT → asciiart.eu path mapping ──────────────────────────────────────
const MAP = {
  // Animals
  cat:        ['animals', 'cats'],
  cats:       ['animals', 'cats'],
  kitten:     ['animals', 'cats'],
  dog:        ['animals', 'dogs'],
  dogs:       ['animals', 'dogs'],
  wolf:       ['animals', 'wolves'],
  wolves:     ['animals', 'wolves'],
  bear:       ['animals', 'bears'],
  horse:      ['animals', 'horses'],
  rabbit:     ['animals', 'rabbits'],
  bunny:      ['animals', 'rabbits'],
  snake:      ['animals', 'snakes'],
  bird:       ['animals', 'birds'],
  eagle:      ['animals', 'birds'],
  owl:        ['animals', 'birds'],
  fish:       ['animals', 'fish'],
  shark:      ['animals', 'sharks'],
  frog:       ['animals', 'frogs'],
  spider:     ['animals', 'spiders'],
  bat:        ['animals', 'bats'],
  cow:        ['animals', 'cows'],
  pig:        ['animals', 'pigs'],
  lion:       ['animals', 'lions'],
  tiger:      ['animals', 'tigers'],
  elephant:   ['animals', 'elephants'],
  monkey:     ['animals', 'monkeys'],
  deer:       ['animals', 'deer'],
  fox:        ['animals', 'foxes'],
  rat:        ['animals', 'rats'],
  mouse:      ['animals', 'mice'],
  // Mythology / Fantasy
  dragon:     ['mythology', 'dragons'],
  unicorn:    ['mythology', 'unicorns'],
  phoenix:    ['mythology', 'phoenix'],
  vampire:    ['mythology', 'vampires'],
  werewolf:   ['mythology', 'werewolves'],
  mermaid:    ['mythology', 'mermaids'],
  fairy:      ['mythology', 'fairies'],
  wizard:     ['people', 'wizard'],
  witch:      ['mythology', 'witches'],
  demon:      ['mythology', 'demons'],
  angel:      ['mythology', 'angels'],
  // Vehicles
  car:        ['vehicles', 'cars'],
  truck:      ['vehicles', 'trucks'],
  plane:      ['vehicles', 'airplanes'],
  airplane:   ['vehicles', 'airplanes'],
  helicopter: ['vehicles', 'helicopters'],
  ship:       ['vehicles', 'ships'],
  boat:       ['vehicles', 'ships'],
  train:      ['vehicles', 'trains'],
  motorcycle: ['vehicles', 'motorcycles'],
  bicycle:    ['vehicles', 'bicycles'],
  bike:       ['vehicles', 'bicycles'],
  rocket:     ['space', 'rockets'],
  spaceship:  ['space', 'spaceships'],
  ufo:        ['space', 'ufos'],
  // Nature / Plants
  tree:       ['plants', 'trees'],
  flower:     ['plants', 'flowers'],
  rose:       ['plants', 'roses'],
  mushroom:   ['plants', 'mushrooms'],
  cactus:     ['plants', 'cactus'],
  // Space
  sun:        ['space', 'sun'],
  moon:       ['space', 'moon'],
  star:       ['space', 'stars'],
  planet:     ['space', 'planets'],
  astronaut:  ['space', 'astronauts'],
  // Horror / Holiday
  ghost:      ['holiday-and-events', 'halloween'],
  pumpkin:    ['holiday-and-events', 'halloween'],
  skeleton:   ['holiday-and-events', 'halloween'],
  zombie:     ['holiday-and-events', 'halloween'],
  santa:      ['holiday-and-events', 'christmas'],
  snowman:    ['holiday-and-events', 'christmas'],
  // Weapons / Objects
  sword:      ['weapons', 'sword'],
  gun:        ['weapons', 'gun'],
  pistol:     ['weapons', 'gun'],
  knife:      ['weapons', 'knife'],
  shield:     ['weapons', 'shield'],
  crown:      ['objects', 'crown'],
  key:        ['objects', 'keys'],
  book:       ['objects', 'books'],
  candle:     ['objects', 'candles'],
  bottle:     ['objects', 'bottles'],
  chest:      ['objects', 'chest'],
  door:       ['objects', 'doors'],
  clock:      ['objects', 'clocks'],
  lantern:    ['objects', 'lanterns'],
  skull:      ['people', 'skull'],
  // Buildings
  castle:     ['buildings', 'castles'],
  house:      ['buildings', 'houses'],
  tower:      ['buildings', 'towers'],
  lighthouse: ['buildings', 'lighthouses'],
  // Food
  apple:      ['food', 'apples'],
  cake:       ['food', 'cakes'],
  pizza:      ['food', 'pizza'],
  // People / Tech
  man:        ['people', 'man'],
  woman:      ['people', 'woman'],
  soldier:    ['people', 'soldier'],
  pirate:     ['people', 'pirate'],
  robot:      ['computers', 'robots'],
};

function normalise(query) {
  return query.toLowerCase().trim().replace(/[^a-z\s]/g, '');
}

function lookup(query) {
  const q = normalise(query);
  if (MAP[q]) return MAP[q];
  // Try each word, reversed (noun usually last: "iron gate" → try "gate" first)
  for (const w of q.split(/\s+/).reverse()) {
    if (MAP[w]) return MAP[w];
  }
  return null;
}

// In-memory cache: URL → art[]
const cache = new Map();

// Fetch with a manual timeout (AbortSignal.timeout not available in Node <17.3)
function fetchWithTimeout(url, options, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function scrape(category, item) {
  const url = `https://www.asciiart.eu/${category}/${item}`;
  if (cache.has(url)) return { arts: cache.get(url), url };

  const res = await fetchWithTimeout(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.asciiart.eu/',
    },
  }, 7000);

  if (!res.ok) throw new Error(`asciiart.eu ${res.status} at ${url}`);

  const html = await res.text();
  const arts = extractPres(html);
  if (arts.length) cache.set(url, arts);
  return { arts, url };
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g,    (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function cleanArt(raw) {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function isUsableArt(art) {
  const lines    = art.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 3)  return false;
  if (nonEmpty.length > 80) return false;
  if (art.length < 30)      return false;
  if ((art.match(/https?:\/\//g) || []).length > 2) return false;
  return true;
}

function extractPres(html) {
  const results = [];
  const re = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const cleaned = cleanArt(decodeEntities(m[1]));
    if (isUsableArt(cleaned)) results.push(cleaned);
  }
  return results;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ art: null, error: 'Method not allowed' });
  }

  const { subject } = req.body ?? {};
  if (!subject || typeof subject !== 'string') {
    return res.status(400).json({ art: null, error: 'Missing subject' });
  }

  const entry = lookup(subject);
  if (!entry) {
    return res.status(200).json({ art: null, reason: 'no_mapping' });
  }

  const [category, item] = entry;

  try {
    const { arts, url } = await scrape(category, item);
    if (!arts.length) {
      return res.status(200).json({ art: null, reason: 'no_pre_blocks', url });
    }
    return res.status(200).json({ art: randomItem(arts), url });
  } catch (err) {
    console.error('ascii scrape error:', err.message);
    return res.status(200).json({ art: null, reason: 'fetch_error', error: err.message });
  }
}
