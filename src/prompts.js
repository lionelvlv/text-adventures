// prompts.js

export const GENRES = [
  { id: 'fantasy', label: 'FANTASY',       seed: 'You stand before the gates of a crumbling kingdom. Dark magic stirs beyond the treeline.' },
  { id: 'scifi',   label: 'SCI-FI',         seed: 'You wake aboard a drifting colony ship. The crew is gone. Emergency lights pulse red.' },
  { id: 'horror',  label: 'HORROR',         seed: 'You come to in an abandoned manor. Rain hammers the shutters. Something moves upstairs.' },
  { id: 'mystery', label: 'MYSTERY',        seed: 'Rain-soaked city. Someone slid an envelope under your office door at midnight.' },
  { id: 'western', label: 'WESTERN',        seed: 'Redemption Gulch. Dust on your boots. The sheriff is dead and everyone knows your name.' },
  { id: 'custom',  label: 'CUSTOM PREMISE', seed: '' },
];

// ─── DICE ROLL ────────────────────────────────────────────────────────────────
// Returns an object describing the outcome of an action roll.
// Skill modifier: -2 (reckless/unskilled) to +2 (expert/prepared)
export function rollDice(skillMod = 0) {
  const roll = Math.floor(Math.random() * 20) + 1; // d20
  const total = roll + skillMod;
  let outcome, label;
  if (roll === 20)         { outcome = 'crit_success'; label = 'CRITICAL SUCCESS'; }
  else if (roll === 1)     { outcome = 'crit_fail';    label = 'CRITICAL FAILURE'; }
  else if (total >= 15)    { outcome = 'success';      label = 'SUCCESS'; }
  else if (total >= 8)     { outcome = 'partial';      label = 'PARTIAL SUCCESS'; }
  else                     { outcome = 'fail';         label = 'FAILURE'; }
  return { roll, total, outcome, label };
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
function buildSystemPrompt(settings = {}) {
  const { consequences = true, storyEnds = true, realRefs = false } = settings;

  const consequenceRule = consequences
    ? `REALISM + CONSEQUENCES MODE (ENABLED):
- Physics and probability are real. A player trying to punch through a stone wall fails. Someone untrained picking a lock will likely fumble. A lone person charging ten armed guards will be surrounded and beaten.
- Outlandish or impossible actions (suddenly gaining superpowers, objects appearing from nowhere, physics-defying feats) simply DO NOT WORK. Describe WHY they fail — the world does not bend.
- You track a hidden karma ledger. Violence, cruelty, and notoriety ripple forward:
  * Witnesses escape and report to gangs, authorities, or rivals.
  * NPCs remember. Strangers react based on reputation — fear, hostility, refusal of service.
  * Introduce consequences 2–5 turns AFTER the action so they feel like a world catching up, not an instant punishment.
  * Escalate: a brawl → wanted posters → bounty hunters → a siege.
  * Hint at brewing consequences through atmosphere: a crow watching, a hushed conversation cut short, a stranger eyeing the player's face against a posted description.`
    : `CASUAL MODE: The world reacts in the moment but does not hold grudges or track history. Near-impossible actions may succeed with flair. Keep it fun and loose.`;

  const endingRule = storyEnds
    ? `PERMADEATH (ENABLED): Characters can die from their choices. If the player is clearly killed — executed, drowned, stabbed through — write a vivid final paragraph. End the story field with the exact token GAME_OVER on its own line. Do not continue after this.`
    : `PERMADEATH (DISABLED): Characters always find some desperate last-second escape from death. Dramatic, but never final.`;

  const realRefsRule = realRefs
    ? `REAL-WORLD REFERENCES (ENABLED): Real places, historical events, and cultural touchstones may appear naturally.`
    : `REAL-WORLD REFERENCES (DISABLED): The world is self-contained fiction. Invent all names, places, and institutions.`;

  return `You are a text adventure narrator. Respond ONLY with a valid JSON object. No markdown, no extra text.

JSON shape — return exactly these three fields:
{
  "story": "...",
  "artPrompt": "...",
  "suggestions": ["...", "...", "...", "..."]
}

STORY field rules:
- 3–5 sentences, second person ("you"), vivid and atmospheric
- Each turn must feel DIFFERENT — vary sentence structure, pacing, what you describe
- NO repetition of phrases from prior turns. Do not re-describe what was already established.
- Introduce new details, unexpected reactions, world movement — keep the story alive and surprising
- End with the player in a clear situation that demands a decision
- When dice outcome is provided, RESPECT it: a FAILURE means the action does not succeed. A PARTIAL SUCCESS means it works but with a cost or complication. A CRITICAL FAILURE means something goes meaningfully wrong. Do not let the player auto-succeed at difficult tasks.
- Include unexpected twists: overheard conversations, sudden arrivals, objects that reveal new story threads, NPCs who know more than they should — at least one twist every 3–4 turns
- Never summarize what the player just did back to them. Move the world forward.

ARTPROMPT field rules:
- A short evocative description (10–20 words) of what ASCII art should be drawn for this scene moment
- Focus on a single subject: a face, a door, a weapon, a landscape silhouette, a creature
- Examples: "a weathered saloon exterior at dusk", "close-up of a cracked compass face", "silhouette of a hanged man against moon"
- If nothing meaningful would add atmosphere, write null

SUGGESTIONS field rules:
- Exactly 4 short, specific actions the player can take RIGHT NOW given the scene
- Make them varied: one cautious, one bold, one social/investigative, one wild card
- Never generic (not "look around" or "attack"). Specific to the current moment.

${consequenceRule}
${endingRule}
${realRefsRule}`;
}

// ─── ASCII ART PROMPT ─────────────────────────────────────────────────────────
export function buildArtPrompt(artDescription) {
  return `You are an ASCII artist. Draw a small ASCII art piece based on this description:

"${artDescription}"

Rules:
- 5 to 10 lines tall
- Each line no longer than 44 characters
- Use only plain ASCII: | / \\ _ - = * # @ + [ ] ( ) . ~ ^ < >
- Every line must be padded with spaces to the SAME width so all lines are equal length
- Below the art, on its own line, write a short italic-style caption in parentheses, e.g. (the old windmill at dawn)
- Return ONLY the ASCII art and caption. No explanation, no extra text.`;
}

// ─── INIT PROMPT ──────────────────────────────────────────────────────────────
export function buildInitPrompt(genreId, seed, charInfo = {}, settings = {}) {
  const g = GENRES.find(x => x.id === genreId);
  const premise = genreId === 'custom' ? (charInfo.customSeed || seed) : seed;

  const charParts = [];
  if (charInfo.name)       charParts.push(`Name: ${charInfo.name}`);
  if (charInfo.background) charParts.push(`Background: ${charInfo.background}`);
  if (charInfo.trait)      charParts.push(`Trait: ${charInfo.trait}`);
  if (charInfo.goal)       charParts.push(`Goal: ${charInfo.goal}`);
  const charBlock = charParts.length
    ? `\n\nCHARACTER:\n${charParts.join('\n')}\nWeave these naturally — do not just list them.`
    : '';

  return `${buildSystemPrompt(settings)}

Genre: ${g.label}
Opening premise: ${premise}${charBlock}

Begin the adventure. Set the scene with atmosphere and intrigue. Plant one detail that will matter later. For artPrompt, describe the opening scene's most striking visual element.`;
}

// ─── ACTION PROMPT ────────────────────────────────────────────────────────────
export function buildActionPrompt(history, action, diceResult, settings = {}) {
  const ctx = history
    .slice(-16)
    .map(h => `${h.role === 'user' ? 'PLAYER' : 'NARRATOR'}: ${h.content}`)
    .join('\n\n');

  const diceBlock = diceResult
    ? `\nDICE ROLL: The player rolled a ${diceResult.roll} (${diceResult.label}). Honor this outcome in your narration — the story must reflect whether the action succeeded, partially succeeded, or failed.`
    : '';

  return `${buildSystemPrompt(settings)}

STORY SO FAR:
${ctx}

PLAYER ACTION: ${action}${diceBlock}

Continue the narrative. Do NOT repeat phrases or descriptions from prior turns. Advance the world — something always changes or is revealed.`;
}
