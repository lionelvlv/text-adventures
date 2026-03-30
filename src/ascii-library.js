// ascii-library.js
// Curated ASCII art library — hand-crafted pieces bundled directly.
// No network calls. Works locally and on Vercel with zero latency.
// Each key maps to an array of art strings; a random one is picked per use.

export const ART = {

  // ── ANIMALS ───────────────────────────────────────────────────────────────

  wolf: [
`        / \\      _
       /   \\   ./ |
      | o o |  \\ \\ \\
       \\ v /    > > >
      /|___|\\  / / /
     / |   | \\/_/_/
    /  |   |  \\  \\
___/___|   |___\\__\\`,

`    .  .
   / \\ / \\
  ( o | o )
   \\ vvv /
    |   |
   /|   |\\
  ( |   | )
   \\|___|/
    WOLF`,
  ],

  raven: [
`    .     .
   \\.   ./
    \\. ./
  __( v )__
 /  (   )  \\
|  ( ( ) )  |
 \\ (_( )_) /
     | |
    _| |_
   |_____|
     RAVEN`,

`      ___
    .'   '.
   /  o o  \\
  |  ( v )  |
   \\_______/
      | |
  ____| |____
 /          \\
(  RAVEN     )`,
  ],

  bird: [
`     __
    /  \\
   ( >< )
    \\__/
   _|  |_
  / \\  / \\
 /   \\/   \\`,

`       .
      /|\\
     / | \\
    (  |  )
     \\ | /
      \\|/
      ( )
     /   \\`,
  ],

  crow: [
`    .
   /v\\
  ( o )
  /)|(\\
 / /|\\ \\
   | |
  / | \\
CROW`,
  ],

  cat: [
`  /\\_/\\
 ( o.o )
  > ^ <
 /|   |\\
(_|   |_)`,

` /\\_____/\\
(  o   o  )
 \\   v   /
  \\     /
   |   |
  _|___|_`,
  ],

  dog: [
`  / \\__
 (    @\\___
 /         O
/   (_____/
/_____/   U`,

`   __
  /  \\___
 | o  o  |
  \\  ^  /
  /|   |\\
 ( |   | )
  \\|___|/`,
  ],

  horse: [
`   _____
  /     \\
 | () () |
  \\  ^  /___
  /|       |\\
 ( |  ___  | )
  \\|_|   |_|/
    |   |
   /|   |\\`,
  ],

  snake: [
`  /\\_/\\_/\\_/\\
 ( . . . . . )
  \\ v v v v /
  /         \\
 ( ~~~~~~~~~ )
  \\_________/`,

`   _______
  /       \\___
 | o        __)
  \\_________/
   S N A K E`,
  ],

  spider: [
`  \\  |  /
 \\ \\   / /
   (   )
 / /   \\ \\
/  |   |  \\
   | o |
    \\_/`,
  ],

  bat: [
`  /\\   /\\
 /  \\ /  \\
(  o X o  )
 \\  / \\  /
  \\/   \\/
   \\ | /
    \\|/
    ( )`,
  ],

  shark: [
`           /\\
__________/ /
          \\/  /\\
          /  /  \\
~~~~~~~~~(  ( O  )
          \\  \\  /
__________/\\ \\/
           \\/`,
  ],

  rat: [
`   ___
  /   \\
 | o o |
  \\_^_/
  /   \\___
 (         )
  \\_______/
  |  | |  |`,
  ],

  fox: [
`  /\\   /\\
 /  \\ /  \\
| o  V  o |
 \\ ( v ) /
  \\  ^  /
  /|   |\\
 ( |   | )
  \\|___|/`,
  ],

  // ── MYTHOLOGY ─────────────────────────────────────────────────────────────

  dragon: [
`       /\\   /\\
      /  \\ /  \\
     | o   o  |
      \\ (v) /
  /\\  /     \\  /\\
 /  \\/  /^\\  \\/  \\
(  DRAGON      )
 \\____________/`,

`         __  __
        / _>< _\\
       | o    o |
        \\_\\  /_/
    /\\  /  )(  \\  /\\
   /  \\/ ./  \\. \\/  \\
  ( ==== DRAGON ==== )
   \\__________________/`,
  ],

  ghost: [
`    .-.
   ( o o)
   |     |
   | ~~~ |
   |     |
    \\_^_/
   ghost`,

`   .--.
  |o   o|
  |  ^  |
  | |~| |
  |     |
 /|     |\\
( |     | )
 \\       /
  \`-----'`,
  ],

  skeleton: [
`    _____
   /     \\
  | () () |
  |   ^   |
   \\_____/
    |   |
   /|   |\\
  (_|   |_)
    |   |
   /|   |\\
  ( |   | )`,
  ],

  vampire: [
`  /\\     /\\
 /  \\___/  \\
| .   v   . |
|  \\_____/  |
 \\    |    /
  \\   |   /
 /|   |   |\\
( |  /|\\  | )
 \\| / | \\ |/`,
  ],

  witch: [
`      /\\
     /  \\
    / /\\ \\
   /_/  \\_\\
   | o  o |
   |  /\\  |
    \\____/
    |    |
   /|    |\\
  ( |    | )`,
  ],

  wizard: [
`     /\\
    /  \\
   / ** \\
  /______\\
  | o  o |
  |  /\\  |
   \\____/
   |    |
   |    |
  _|    |_`,
  ],

  demon: [
` /\\ . . /\\
(  \\ . /  )
 \\  (v)  /
  \\_/ \\_/
  |     |
 /|     |\\
( |     | )
 \\|_____|/`,
  ],

  // ── BUILDINGS ─────────────────────────────────────────────────────────────

  castle: [
`|_|   |_|
| |___| |
|       |
|  /^\\  |
| / | \\ |
|/  |  \\|
|   |   |
|___|___|`,

` _   _   _
| |_| |_| |
|_________|
 |  | |  |
 | (   ) |
 |  | |  |
 |__|_|__|`,
  ],

  tower: [
`  |___|
  |   |
  |   |
  | o |
  |   |
  |   |
 /|   |\\
( |   | )
 \\|___|/`,
  ],

  house: [
`    /\\
   /  \\
  / /\\ \\
 /_/  \\_\\
 |  []  |
 |  __  |
 |_|  |_|`,
  ],

  lighthouse: [
`   | * |
   |___|
   |   |
   | ~ |
   |   |
  /|   |\\
 / |   | \\
/__|   |__\\`,
  ],

  // ── WEAPONS / OBJECTS ─────────────────────────────────────────────────────

  sword: [
`    /\\
   /  \\
  / ** \\
 /  **  \\
/___||___\\
    ||
    ||
    ||
   _||_
  |____|`,

`     *
    /|
   / |
  /  |
 /   |
/    |
|===(|
\\    |
 \\   |
  \\  |
   \\ |
    \\|`,
  ],

  knife: [
`   /|
  / |
 /  |
/   |
|   |
|___|
  |
  |`,
  ],

  gun: [
`  _______
 |       |_
 |  o    | |
 |_______|_|
      |
     _|_`,

`   ______
  /      \\__
 | o        |
  \\________/
       |
      _|_`,
  ],

  shield: [
` /-------\\
|    *    |
|   ***   |
|  *   *  |
|   ***   |
|    *    |
 \\_______/`,
  ],

  crown: [
` *   *   *
| \\ | / |
|  \\|/  |
|_______|`,
  ],

  key: [
`  ___
 /   \\
( o o )
 \\   /
  |_|
  | |
  |_|
  | |
  |_|`,
  ],

  book: [
` _________
/         \\
|  ~ ~ ~  |
|  ~ ~ ~  |
|  ~ ~ ~  |
|_________|
|_________|`,
  ],

  candle: [
`    )
   ) \\
  / ) (
  \\(_)/
   |  |
   |  |
   |  |
  _|  |_
 |______|`,
  ],

  lantern: [
`   ___
  /| |\\
 / | | \\
|  |*|  |
|  | |  |
 \\ | | /
  \\|_|/
   | |
   |_|`,
  ],

  chest: [
` _________
/=========\\
|  o   o  |
|  [   ]  |
|_________|`,
  ],

  skull: [
`  .-.
 /o o\\
|  ^  |
| |_| |
 \\_^_/
  | |
 _| |_`,

`   ___
  /   \\
 | o o |
 |  _  |
  \\_^_/
   |||
  _|||_`,
  ],

  bottle: [
`   ___
  |   |
  |___|
 /     \\
|       |
|  ~ ~  |
|       |
 \\_____/`,
  ],

  clock: [
`  _____
 /     \\
| 12    |
| 9  3  |
|   6   |
|   ^   |
 \\_____/`,
  ],

  door: [
` _______
|       |
|  [ ]  |
|  [ ]  |
|   o   |
|       |
|_______|`,
  ],

  // ── NATURE / SPACE ────────────────────────────────────────────────────────

  tree: [
`    /\\
   /  \\
  / /\\ \\
 / /  \\ \\
/________\\
    ||
    ||
   _||_`,

`    *
   ***
  *****
 *******
*********
    |
    |`,
  ],

  rose: [
`  ,-.
 ( o )
  \\ /
   |
   |
  _|_`,
  ],

  moon: [
`   __
  /  \\
 | *  )
 |    )
  \\  /
   --`,

`  (    )
 (  **  )
(   ()   )
 (      )
  (    )
   (--)`,
  ],

  star: [
`    *
   ***
  *   *
 *     *
* * * * *
 *     *
  *   *
   ***
    *`,
  ],

  sun: [
`\\   |   /
 \\  |  /
  \\ | /
---( )---
  / | \\
 /  |  \\
/   |   \\`,
  ],

  fire: [
`   )
  ) \\
 / ) (
( / ) \\
 \\(   /
  |   |
  |___|`,

`   )
  /|\\
 / | \\
(  *  )
 \\ * /
  \\*/
  |*|
  |_|`,
  ],

  // ── PEOPLE ────────────────────────────────────────────────────────────────

  soldier: [
`   ___
  /   \\
 | o o |
  \\_^_/
  _|_|_
 /     \\
|  [X]  |
|       |
 \\_____/
  |   |
  |   |
 /|   |\\`,
  ],

  pirate: [
`   ___
  /   \\
 |X o  |
  \\_^_/
  /| |\\
 ( | | )
  \\| |/
   | |
  _| |_`,
  ],

  knight: [
`   /\\
  /  \\
 | [] |
 |    |
  \\  /
  /  \\
 | () |
 |    |
  \\  /
  /  \\
 /    \\`,
  ],

  robot: [
` _______
|  o o  |
|  ---  |
|_______|
 |     |
 | |_| |
 |     |
 |_____|
  |   |
 _|   |_`,
  ],

  // ── VEHICLES ──────────────────────────────────────────────────────────────

  ship: [
`      |
      |
 _____|_____
/           \\
|  ~  ~  ~  |
|___________|
 \\         /
  \\_______/`,
  ],

  rocket: [
`   /\\
  /  \\
 / ** \\
|  ()  |
|      |
|  []  |
 \\    /
  \\  /
  /  \\
 / \\/ \\`,
  ],

  // ── MISC ──────────────────────────────────────────────────────────────────

  map: [
` _________
|  *      |
| /\\ ~~~~|
||  |     |
||  *  /\\ |
| ~~~~|  ||
|     |  ||
|_____|___| `,
  ],

  crown2: [
`* . * . *
\\ | | | /
 \\| | |/
  \\___/`,
  ],

  grave: [
`  _____
 |     |
 | R   |
 | I   |
 | P   |
 |_____|
/       \\
---------`,
  ],

};

// ── SYNONYM MAP ───────────────────────────────────────────────────────────────
// Maps alternate words → canonical ART key
const SYNONYMS = {
  raven: 'raven', crow: 'crow', hawk: 'bird', falcon: 'bird', dove: 'bird',
  eagle: 'bird', owl: 'bird', sparrow: 'bird', vulture: 'bird',
  hound: 'dog', wolf: 'wolf', wolves: 'wolf', werewolf: 'wolf',
  kitten: 'cat', feline: 'cat',
  serpent: 'snake', viper: 'snake', cobra: 'snake',
  arachnid: 'spider', web: 'spider',
  steed: 'horse', stallion: 'horse', mare: 'horse',
  creature: 'dragon', beast: 'dragon', wyrm: 'dragon', wyvern: 'dragon',
  monster: 'demon', fiend: 'demon', devil: 'demon',
  specter: 'ghost', spectre: 'ghost', wraith: 'ghost', spirit: 'ghost',
  apparition: 'ghost', shade: 'ghost',
  undead: 'skeleton', bones: 'skull', corpse: 'skeleton',
  sorceress: 'witch', hag: 'witch', crone: 'witch',
  mage: 'wizard', sorcerer: 'wizard', warlock: 'wizard',
  fortress: 'castle', keep: 'castle', citadel: 'castle', ruins: 'castle',
  gate: 'castle', gates: 'castle', ramparts: 'castle', drawbridge: 'castle',
  manor: 'house', cottage: 'house', cabin: 'house', inn: 'house',
  tavern: 'house', shack: 'house',
  spire: 'tower', turret: 'tower', battlement: 'tower',
  dagger: 'knife', blade: 'sword', rapier: 'sword', axe: 'sword',
  spear: 'sword', lance: 'sword', halberd: 'sword',
  pistol: 'gun', musket: 'gun', revolver: 'gun', rifle: 'gun',
  torch: 'fire', flame: 'fire', blaze: 'fire', embers: 'fire',
  candle: 'candle', torch2: 'lantern',
  tome: 'book', grimoire: 'book', scroll: 'book', journal: 'book',
  goblet: 'bottle', flask: 'bottle', vial: 'bottle', potion: 'bottle',
  gem: 'crown', jewel: 'crown', ring: 'crown', amulet: 'crown',
  treasure: 'chest', coffer: 'chest', crate: 'chest',
  gravestone: 'grave', tombstone: 'grave', crypt: 'grave', tomb: 'grave',
  warrior: 'soldier', fighter: 'soldier', guard: 'soldier', ranger: 'soldier',
  archer: 'soldier', mercenary: 'soldier',
  galleon: 'ship', vessel: 'ship', boat: 'ship', wreck: 'ship',
  stars: 'star', constellation: 'star',
  crescent: 'moon', lunar: 'moon',
  oak: 'tree', willow: 'tree', forest: 'tree', woods: 'tree',
  flower: 'rose', bloom: 'rose', blossom: 'rose',
  android: 'robot', automaton: 'robot', machine: 'robot',
  rock: 'grave', stone: 'grave', boulder: 'grave',
};

// ── LOOKUP ────────────────────────────────────────────────────────────────────
function normalise(s) {
  return s.toLowerCase().trim().replace(/[^a-z\s]/g, '').trim();
}

export function getArt(subject) {
  if (!subject) return null;

  const q = normalise(subject);

  // Try each word in the subject (reversed — noun usually last)
  const words = q.split(/\s+/).filter(Boolean).reverse();

  for (const word of words) {
    // Direct ART hit
    if (ART[word]) return pick(ART[word]);
    // Synonym → ART hit
    const syn = SYNONYMS[word];
    if (syn && ART[syn]) return pick(ART[syn]);
  }

  // Full phrase direct hit
  if (ART[q]) return pick(ART[q]);
  const syn = SYNONYMS[q];
  if (syn && ART[syn]) return pick(ART[syn]);

  return null;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// All keys the library knows about (for debugging)
export const KNOWN_SUBJECTS = [...Object.keys(ART), ...Object.keys(SYNONYMS)];
