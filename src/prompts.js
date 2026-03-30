// prompts.js

export const GENRES = [
  { id: 'fantasy', label: 'FANTASY',       seed: 'You stand before the gates of a crumbling kingdom. Dark magic stirs beyond the treeline.' },
  { id: 'scifi',   label: 'SCI-FI',         seed: 'You wake aboard a drifting colony ship. The crew is gone. Emergency lights pulse red.' },
  { id: 'horror',  label: 'HORROR',         seed: 'You come to in an abandoned manor. Rain hammers the shutters. Something moves upstairs.' },
  { id: 'mystery', label: 'MYSTERY',        seed: 'Rain-soaked city. Someone slid an envelope under your office door at midnight.' },
  { id: 'western', label: 'WESTERN',        seed: 'Redemption Gulch. Dust on your boots. The sheriff is dead and everyone knows your name.' },
  { id: 'custom',  label: 'CUSTOM PREMISE', seed: '' },
];

// ─── DICE ─────────────────────────────────────────────────────────────────────
export function rollDice() {
  const roll = Math.floor(Math.random() * 20) + 1;
  let outcome, label;
  if (roll === 20)      { outcome = 'crit_success'; label = 'CRITICAL SUCCESS'; }
  else if (roll >= 15)  { outcome = 'success';      label = 'SUCCESS'; }
  else if (roll >= 8)   { outcome = 'partial';      label = 'PARTIAL'; }
  else if (roll > 1)    { outcome = 'fail';          label = 'FAILURE'; }
  else                  { outcome = 'crit_fail';     label = 'CRITICAL FAILURE'; }
  return { roll, outcome, label };
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
function buildSystemPrompt(settings = {}) {
  const { consequences = true, dice = false, storyEnds = true, realRefs = false } = settings;

  const consequenceRule = consequences
    ? `REALISM + CONSEQUENCES (ON):
- The world obeys physics. Impossible actions fail — no sudden superpowers, no objects from thin air, no one person defeating a dozen armed fighters.
- Track a hidden ledger of player actions. Violence and crimes have delayed ripple effects: witnesses report, reputations spread, enemies organize. Drop hints before consequences arrive (a crow watching, a conversation cut short). Escalate gradually over 3–5 turns.
- NPCs react to reputation. Strangers may recognize the player. Service gets refused. Prices rise. Doors close.`
    : `CASUAL MODE (ON): Actions generally succeed unless deeply implausible. The world is forgiving and reactive but not punishing.`;

  const diceRule = dice
    ? `DICE (ON): A dice roll result is provided with each player action. You MUST honor it:
- CRITICAL SUCCESS: the action succeeds spectacularly, with an unexpected bonus
- SUCCESS: the action works cleanly
- PARTIAL: it works, but with a cost, complication, or partial result
- FAILURE: the action fails, possibly making things worse
- CRITICAL FAILURE: something goes badly wrong beyond just failing
Never let the player auto-succeed a difficult task if the dice say otherwise.`
    : `DICE (OFF): No dice results will be provided. Narrate outcomes based on context and logic.`;

  const endingRule = storyEnds
    ? `PERMADEATH (ON): THIS IS CRITICAL. If the player chooses to end their own life, or is killed by the world, you MUST honor it and end the story.
- If the player explicitly tries to die ("i kill myself", "i die", "i jump off the cliff", "end my life"), that is their choice — describe a brief, unsentimental ending and append GAME_OVER.
- If the world kills them (executed, stabbed fatally, drowned with no escape), write a vivid final paragraph and append GAME_OVER.
- Do NOT redirect, distract, or ignore these inputs. Do NOT have the world intervene to save them. Respect the player's choice.
- After GAME_OVER appears in the story field, suggestions must be empty.`
    : `PERMADEATH (OFF): Characters always survive by some thin margin. Never write GAME_OVER.`;

  const realRefsRule = realRefs
    ? `REAL-WORLD REFS (ON): Real places, history, brands, and culture may appear naturally.`
    : `REAL-WORLD REFS (OFF): Keep everything fictional. Invent all names, places, institutions.`;

  return `You are a text adventure narrator. Output ONLY a valid JSON object — no markdown, no preamble.

Required JSON shape:
{
  "story": "narrative text here",
  "artSubject": "one specific visual subject to draw, e.g. 'a rusted pistol on a bar top' — or null",
  "suggestions": ["action 1", "action 2", "action 3", "action 4"]
}

STORY rules:
- 3–5 sentences, second person, vivid and grounded
- Never repeat phrases or descriptions from earlier turns
- Vary pacing, sentence length, and perspective each turn
- Do NOT summarize what the player just did — move the world forward in response
- Plant at least one twist or new detail every 3–4 turns (an unexpected arrival, a discovered object, an overheard secret)
- End each turn with the player in a situation that demands a choice

ARTSUBJECT rules:
- Name ONE specific visual subject relevant to this exact moment: a face, an object, a creature, a doorway, a silhouette
- Be concrete: "a cracked pocket watch open on a desk" not "mystery atmosphere"
- null is fine if nothing adds to the scene

SUGGESTIONS rules:
- Exactly 4 short specific actions possible RIGHT NOW
- Vary them: one careful, one aggressive, one social/investigative, one unexpected
- Never generic ("look around", "attack") — always specific to the current scene

${consequenceRule}
${diceRule}
${endingRule}
${realRefsRule}`;
}

// ─── ASCII ART PROMPT ─────────────────────────────────────────────────────────
export function buildArtPrompt(subject) {
  return `You are an ASCII artist. Draw this specific subject:

"${subject}"

Requirements:
- 5–9 lines tall
- Focus on ONE clear subject — a figure, object, face, or silhouette
- Use ASCII characters: | / \\ _ - = * # @ + . ~ ^ < > [ ]
- Pad every line with spaces so ALL lines are exactly the same length (right-pad with spaces)
- After the art block, on a new line, write a caption in parentheses: (description of what's shown)
- Return ONLY the art and caption — nothing else, no explanation`;
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
    ? `\n\nCHARACTER:\n${charParts.join('\n')}\nWeave these into the scene naturally.`
    : '';

  return `${buildSystemPrompt(settings)}

Genre: ${g.label}
Opening premise: ${premise}${charBlock}

Open the adventure. Atmospheric, intriguing, specific. Plant one detail that will matter later. For artSubject, pick the single most visually striking element of the opening scene.`;
}

// ─── ACTION PROMPT ────────────────────────────────────────────────────────────
export function buildActionPrompt(history, action, diceResult, settings = {}) {
  const ctx = history
    .slice(-16)
    .map(h => `${h.role === 'user' ? 'PLAYER' : 'NARRATOR'}: ${h.content}`)
    .join('\n\n');

  const diceBlock = diceResult && settings.dice
    ? `\nDICE RESULT: ${diceResult.label} (rolled ${diceResult.roll}/20) — honor this strictly.`
    : '';

  return `${buildSystemPrompt(settings)}

STORY SO FAR:
${ctx}

PLAYER ACTION: ${action}${diceBlock}

Respond. Do NOT echo back what the player did. Advance the world.`;
}
