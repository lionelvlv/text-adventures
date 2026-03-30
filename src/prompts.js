// prompts.js

export const GENRES = [
  { id: 'fantasy', label: 'FANTASY',        seed: 'You stand before the gates of a crumbling kingdom. Dark magic stirs beyond the treeline.' },
  { id: 'scifi',   label: 'SCI-FI',          seed: 'You wake aboard a drifting colony ship. The crew is gone. Emergency lights pulse red.' },
  { id: 'horror',  label: 'HORROR',          seed: 'You come to in an abandoned manor. Rain hammers the shutters. Something moves upstairs.' },
  { id: 'mystery', label: 'MYSTERY',         seed: 'Rain-soaked city. Someone slid an envelope under your office door at midnight.' },
  { id: 'western', label: 'WESTERN',         seed: 'Redemption Gulch. Dust on your boots. The sheriff is dead and everyone knows your name.' },
  { id: 'custom',  label: 'CUSTOM PREMISE',  seed: '' },
];

// Model must return JSON with story, optional art, and 4 contextual suggestions
const SYSTEM = `You are a text adventure narrator. Respond ONLY with valid JSON — no other text, no markdown fences.

JSON shape:
{
  "story": "3-5 sentences, second person (you), vivid and atmospheric. End with the player in a clear situation.",
  "art": "small ASCII scene (5-10 lines, plain ASCII chars like | / \\ _ - = * # @) relevant to the current moment, OR null if nothing fits",
  "suggestions": ["action 1", "action 2", "action 3", "action 4"]
}

Rules:
- story: second person, 3-5 sentences, vivid, ends leaving player something to react to
- art: only include when it genuinely adds atmosphere. Keep it tight and expressive. null is fine.
- suggestions: exactly 4 SHORT actions specific to what the player can see/do RIGHT NOW in the story. Not generic — reflect the current scene.
- Never break character. Never mention AI or JSON.`;

export function buildInitPrompt(genreId, seed, charInfo = {}) {
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

  return `${SYSTEM}

Genre: ${g.label}
Opening premise: ${premise}${charBlock}

Begin the adventure. Set the scene dramatically. Include expressive ASCII art for the opening.`;
}

export function buildActionPrompt(history, action) {
  const ctx = history
    .slice(-14)
    .map(h => `${h.role === 'user' ? 'PLAYER' : 'NARRATOR'}: ${h.content}`)
    .join('\n\n');

  return `${SYSTEM}

STORY SO FAR:
${ctx}

PLAYER ACTION: ${action}

Continue the narrative. React directly to the player's action.`;
}