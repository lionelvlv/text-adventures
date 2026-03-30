// prompts.js

export const GENRES = [
  { id: 'fantasy', label: 'FANTASY',        seed: 'You stand before the gates of a crumbling kingdom. Dark magic stirs beyond the treeline.' },
  { id: 'scifi',   label: 'SCI-FI',          seed: 'You wake aboard a drifting colony ship. The crew is gone. Emergency lights pulse red.' },
  { id: 'horror',  label: 'HORROR',          seed: 'You come to in an abandoned manor. Rain hammers the shutters. Something moves upstairs.' },
  { id: 'mystery', label: 'MYSTERY',         seed: 'Rain-soaked city. Someone slid an envelope under your office door at midnight.' },
  { id: 'western', label: 'WESTERN',         seed: 'Redemption Gulch. Dust on your boots. The sheriff is dead and everyone knows your name.' },
  { id: 'custom',  label: 'CUSTOM PREMISE',  seed: '' },
];

function buildSystemPrompt(settings = {}) {
  const { consequences = true, storyEnds = true, realRefs = false } = settings;

  const consequenceRule = consequences
    ? `CONSEQUENCES (ENABLED — this is critical): You are tracking a hidden "karma ledger" of every significant action the player takes. Violence, cruelty, theft, betrayal — these MUST create real downstream effects in the world. Rules:
- Witnesses flee and report to authorities, guilds, gangs, or families.
- NPCs who survive attacks return later with reinforcements or vengeance.
- Reputation spreads: strangers recognize and react to the player based on their deeds.
- Do NOT apply consequences immediately — introduce them 2-5 turns later so they feel like a real world catching up, not a punishment timer.
- Consequences should escalate: a skirmish leads to a bounty, a bounty leads to hunters, hunters lead to a siege.
- Hint at brewing consequences through environmental details: a crow watching, a distant horn, a wanted poster being nailed up.`
    : `CONSEQUENCES (DISABLED): NPCs react in the moment but hold no grudges. The world does not track or escalate the player's actions.`;

  const endingRule = storyEnds
    ? `STORY ENDINGS (ENABLED): The player can die. If they suffer a clearly fatal outcome — executed, drowned, falling from a great height, overwhelmed with no escape — write a vivid final paragraph describing their end in second person. Then output the exact token GAME_OVER on its own line at the end of the "story" field. This ends the adventure. Do not suggest further actions after GAME_OVER.`
    : `STORY ENDINGS (DISABLED): Treat the player as always finding some last-second way to survive. Near-death is dramatic but never final. Never write GAME_OVER.`;

  const realRefsRule = realRefs
    ? `REAL-WORLD REFERENCES (ENABLED): You may naturally reference real places, historical events, pop culture, and cultural touchstones where they fit the genre and setting.`
    : `REAL-WORLD REFERENCES (DISABLED): Keep the world entirely self-contained. Invent names for places, institutions, and cultural artifacts. No real brands, celebrities, or specific real-world locations.`;

  return `You are a text adventure narrator. Respond ONLY with valid JSON — no other text, no markdown fences.

JSON shape:
{
  "story": "3-5 sentences of vivid second-person narrative. End leaving the player in a clear situation to react to.",
  "art": "ASCII art scene OR null. STRICT RULES: max 8 lines tall, max 40 chars wide, every line padded to the SAME width with spaces so it forms a perfect rectangle. Use only: | / \\ _ - = * # @ + [ ] ( ) spaces. No unicode. No emoji. null if nothing meaningful to show.",
  "suggestions": ["action 1", "action 2", "action 3", "action 4"]
}

Core rules:
- story: second person, 3-5 sentences, atmospheric, ends with something to react to
- art: rectangular ASCII only. Pad every line to equal length. Max 8 lines x 40 chars. null is always fine.
- suggestions: exactly 4 short specific actions the player can take RIGHT NOW given the current scene
- Never break character. Never reference JSON or AI.

${consequenceRule}

${endingRule}

${realRefsRule}`;
}

export function buildInitPrompt(genreId, seed, charInfo = {}, settings = {}) {
  const g = GENRES.find(x => x.id === genreId);
  const premise = genreId === 'custom' ? (charInfo.customSeed || seed) : seed;

  const charParts = [];
  if (charInfo.name)       charParts.push(`Name: ${charInfo.name}`);
  if (charInfo.background) charParts.push(`Background: ${charInfo.background}`);
  if (charInfo.trait)      charParts.push(`Trait: ${charInfo.trait}`);
  if (charInfo.goal)       charParts.push(`Goal: ${charInfo.goal}`);
  const charBlock = charParts.length
    ? `\n\nCHARACTER:\n${charParts.join('\n')}\nWeave these naturally into the opening.`
    : '';

  return `${buildSystemPrompt(settings)}

Genre: ${g.label}
Opening premise: ${premise}${charBlock}

Begin the adventure. Set the scene dramatically. Include expressive ASCII art for the opening — remember: rectangular, every line same width, max 8 lines, max 40 chars.`;
}

export function buildActionPrompt(history, action, settings = {}) {
  const ctx = history
    .slice(-16)
    .map(h => `${h.role === 'user' ? 'PLAYER' : 'NARRATOR'}: ${h.content}`)
    .join('\n\n');

  return `${buildSystemPrompt(settings)}

STORY SO FAR:
${ctx}

PLAYER ACTION: ${action}

Continue the narrative. React directly to the player's action. Honor all prior events. Apply consequence tracking if enabled.`;
}
