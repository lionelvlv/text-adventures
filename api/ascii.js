// api/ascii.js
// Vercel serverless function — scrapes asciiart.eu and returns a random
// ASCII art block from a <pre> tag. Falls back to null if nothing found.
//
// POST /api/ascii
// Body: { "subject": "dragon" }
// Response: { "art": "...", "source": "https://..." } | { "art": null }

// ─── SUBJECT → asciiart.eu path mapping ──────────────────────────────────────
// Format: subject → [category, page]
const MAP = {
  // Animals
  cat:          ['animals', 'cats'],
  cats:         ['animals', 'cats'],
  kitten:       ['animals', 'cats'],
  dog:          ['animals', 'dogs'],
  dogs:         ['animals', 'dogs'],
  wolf:         ['animals', 'wolves'],
  wolves:       ['animals', 'wolves'],
  bear:         ['animals', 'bears'],
  bears:        ['animals', 'bears'],
  horse:        ['animals', 'horses'],
  rabbit:       ['animals', 'rabbits'],
  bunny:        ['animals', 'rabbits'],
  snake:        ['animals', 'snakes'],
  bird:         ['animals', 'birds'],
  eagle:        ['animals', 'birds'],
  owl:          ['animals', 'birds'],
  fish:         ['animals', 'fish'],
  shark:        ['animals', 'sharks'],
  frog:         ['animals', 'frogs'],
  spider:       ['animals', 'spiders'],
  bat:          ['animals', 'bats'],
  cow:          ['animals', 'cows'],
  pig:          ['animals', 'pigs'],
  lion:         ['animals', 'lions'],
  tiger:        ['animals', 'tigers'],
  elephant:     ['animals', 'elephants'],
  monkey:       ['animals', 'monkeys'],
  deer:         ['animals', 'deer'],
  fox:          ['animals', 'foxes'],
  rat:          ['animals', 'rats'],
  mouse:        ['animals', 'mice'],
  // Mythology / Fantasy
  dragon:       ['mythology', 'dragons'],
  unicorn:      ['mythology', 'unicorns'],
  phoenix:      ['mythology', 'phoenix'],
  vampire:      ['mythology', 'vampires'],
  werewolf:     ['mythology', 'werewolves'],
  mermaid:      ['mythology', 'mermaids'],
  fairy:        ['mythology', 'fairies'],
  wizard:       ['people', 'wizard'],
  witch:        ['mythology', 'witches'],
  demon:        ['mythology', 'demons'],
  angel:        ['mythology', 'angels'],
  // Vehicles
  car:          ['vehicles', 'cars'],
  truck:        ['vehicles', 'trucks'],
  plane:        ['vehicles', 'airplanes'],
  airplane:     ['vehicles', 'airplanes'],
  helicopter:   ['vehicles', 'helicopters'],
  ship:         ['vehicles', 'ships'],
  boat:         ['vehicles', 'ships'],
  train:        ['vehicles', 'trains'],
  motorcycle:   ['vehicles', 'motorcycles'],
  bicycle:      ['vehicles', 'bicycles'],
  bike:         ['vehicles', 'bicycles'],
  rocket:       ['space', 'rockets'],
  spaceship:    ['space', 'spaceships'],
  ufo:          ['space', 'ufos'],
  // Nature
  tree:         ['plants', 'trees'],
  flower:       ['plants', 'flowers'],
  rose:         ['plants', 'roses'],
  mushroom:     ['plants', 'mushrooms'],
  cactus:       ['plants', 'cactus'],
  skull:        ['people', 'skull'],
  // Space
  sun:          ['space', 'sun'],
  moon:         ['space', 'moon'],
  star:         ['space', 'stars'],
  planet:       ['space', 'planets'],
  astronaut:    ['space', 'astronauts'],
  // Holiday / Horror
  ghost:        ['holiday-and-events', 'halloween'],
  pumpkin:      ['holiday-and-events', 'halloween'],
  skeleton:     ['holiday-and-events', 'halloween'],
  zombie:       ['holiday-and-events', 'halloween'],
  santa:        ['holiday-and-events', 'christmas'],
  christmas:    ['holiday-and-events', 'christmas'],
  snowman:      ['holiday-and-events', 'christmas'],
  // Objects / Misc
  sword:        ['weapons', 'sword'],
  gun:          ['weapons', 'gun'],
  pistol:       ['weapons', 'gun'],
  knife:        ['weapons', 'knife'],
  bow:          ['weapons', 'bow'],
  shield:       ['weapons', 'shield'],
  crown:        ['objects', 'crown'],
  key:          ['objects', 'keys'],
  book:         ['objects', 'books'],
  candle:       ['objects', 'candles'],
  bottle:       ['objects', 'bottles'],
  chest:        ['objects', 'chest'],
  door:         ['objects', 'doors'],
  window:       ['objects', 'windows'],
  clock:        ['objects', 'clocks'],
  map:          ['objects', 'maps'],
  lantern:      ['objects', 'lanterns'],
  // Buildings / Places
  castle:       ['buildings', 'castles'],
  house:        ['buildings', 'houses'],
  tower:        ['buildings', 'towers'],
  lighthouse:   ['buildings', 'lighthouses'],
  prison:       ['buildings', 'prisons'],
  // Food
  apple:        ['food', 'apples'],
  cake:         ['food', 'cakes'],
  pizza:        ['food', 'pizza'],
  // People
  man:          ['people', 'man'],
  woman:        ['people', 'woman'],
  person:       ['people', 'people'],
  soldier:      ['people', 'soldier'],
  pirate:       ['people', 'pirate'],
  robot:        ['computers', 'robots'],
};

// ─── Normalise a query into a lookup key ──────────────────────────────────────
function normalise(query) {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    // Try longest match first: "black cat" → "black cat", then "cat"
    .reduce((acc, word) => acc ? `${acc} ${word}` : word, '');
}

function lookup(query) {
  const q = normalise(query);
  // Exact match first
  if (MAP[q]) return MAP[q];
  // Try individual words (last word, then first word — subjects often end with the noun)
  const words = q.split(' ').reverse();
  for (const w of words) {
    if (MAP[w]) return MAP[w];
  }
  return null;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Maps URL → array of art strings.  Lives for the lifetime of the serverless
// function instance (minutes to hours on Vercel).
const cache = new Map();

// ─── Scrape asciiart.eu ───────────────────────────────────────────────────────
async function scrape(category, item) {
  const url = `https://www.asciiart.eu/${category}/${item}`;

  if (cache.has(url)) return { arts: cache.get(url), url };

  const res = await fetch(url, {
    headers: {
      // Mimic a real browser — the site 403s on bare Node UA
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.asciiart.eu/',
    },
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) throw new Error(`asciiart.eu returned ${res.status} for ${url}`);

  const html = await res.text();
  const arts = extractPres(html);

  if (arts.length) cache.set(url, arts);
  return { arts, url };
}

// ─── Extract <pre> blocks from raw HTML ──────────────────────────────────────
// We do this without a DOM parser (not available in Vercel edge-ish env)
// using a regex that captures everything between <pre...> and </pre>.
function extractPres(html) {
  const results = [];

  // Match <pre ... >content</pre>  (non-greedy, dotAll)
  const preRe = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  let m;
  while ((m = preRe.exec(html)) !== null) {
    const raw = decodeEntities(m[1]);
    const cleaned = cleanArt(raw);
    if (isUsableArt(cleaned)) results.push(cleaned);
  }
  return results;
}

// Decode common HTML entities in ASCII art
function decodeEntities(str) {
  return str
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Strip HTML tags that occasionally appear inside <pre> blocks (e.g. <a href>)
// and normalise line endings.
function cleanArt(raw) {
  return raw
    .replace(/<[^>]+>/g, '')  // strip any inner HTML tags
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// Reject blocks that are too short, too long, or look like boilerplate
function isUsableArt(art) {
  const lines = art.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length < 3)   return false;   // too few lines
  if (nonEmpty.length > 80)  return false;   // likely a menu/navigation block
  if (art.length < 30)       return false;   // too short
  // Reject blocks that are mostly URLs or copyright notices
  if ((art.match(/https?:\/\//g) || []).length > 2) return false;
  return true;
}

// ─── Pick a random element ────────────────────────────────────────────────────
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Handler ──────────────────────────────────────────────────────────────────
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
    // No mapping — caller will fall back to LLM art
    return res.status(200).json({ art: null, reason: 'no_mapping' });
  }

  const [category, item] = entry;

  try {
    const { arts, url } = await scrape(category, item);

    if (!arts.length) {
      return res.status(200).json({ art: null, reason: 'no_pre_blocks', url });
    }

    const art = randomItem(arts);
    return res.status(200).json({ art, url });

  } catch (err) {
    console.error('ascii scrape error:', err.message);
    // Non-fatal — caller will fall back to LLM art
    return res.status(200).json({ art: null, reason: 'fetch_error', error: err.message });
  }
}
