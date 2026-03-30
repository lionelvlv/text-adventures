// ascii.js — scene art for each genre, rendered at key moments

export const ART = {
  fantasy: [
    `
    /\\      /\\
   /  \\    /  \\
  / /\\ \\  / /\\ \\
 /_/  \\_\\/_/  \\_\\
    |    |
    |____|
  [CASTLE]`,
    `
  *    .  *    .
    .    *    .
  ~~~~~~~~~~~~~~~~~~~~
  ~~~~~~~~~~~~~~~~~~~~
   [THE DARK FOREST]`,
    `
      )\\   (  )\\
   ( /(_)) )\\((_)
   )(_))_ ((_)_
  ((_)_| |/ _(_)
   | _)| | |  _
   |_|  |_|\\___|
  [ANCIENT RUNES]`,
  ],

  scifi: [
    `
   ___________
  |  _______  |
  | |       | |
  | | .   . | |
  | |_______| |
  |___________|
      |   |
  [DEEP SPACE]`,
    `
  +--[CONSOLE]--+
  | > OFFLINE   |
  | > SCANNING  |
  | > ...       |
  +-------------+`,
    `
    *       *
  *    *       *
     *    *  *
       *     *
  *       *
  [STAR FIELD]`,
  ],

  horror: [
    `
   _______
  |       |
  | 0   0 |
  |   ^   |
  |  ___  |
  |_______|
  [THE FACE]`,
    `
  \\  |  /
   \\ | /
    \\|/
  ---+---
    /|\\
   / | \\
  [CROSSROADS]`,
    `
  R.I.P.   R.I.P.
    ___      ___
   |   |    |   |
   |___|    |___|
  [THE GRAVEYARD]`,
  ],

  mystery: [
    `
  ___________
  \\         /
   \\  ? ? ? /
    \\_______/
  [CLUES]`,
    `
  |  (  )  |
  |   ||   |
  |  _||_  |
  | |    | |
  [DETECTIVE]`,
    `
  ~~~~
  |  | CITY
  |  | HALL
  |__|
  [DOWNTOWN]`,
  ],

  western: [
    `
      ___
     /   \\
    | o o |
     \\___/
   /|     |\\
  [OUTLAW]`,
    `
  . . . . . .
   BOOT HILL
  . . . . . .
    R.I.P.
   _________
  |_________|`,
    `
  ~~~~~~~~~~~~
  [SALOON]
  O  O  O  O
  |__|__|__|
  ~~~~~~~~~~~~`,
  ],

  custom: [
    `
  +---------+
  |  ?   ?  |
  |    ?    |
  |  ?   ?  |
  +---------+
  [UNKNOWN]`,
  ],
};

// Returns a random art piece for the given genre
export function getArt(genre) {
  const pool = ART[genre] || ART.custom;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Title screen art
export const TITLE_ART = `
 ____  _____ _____ ____   ___ _____ _______  ______ _____
|  _ \\| ____|_   _|  _ \\ / _ \\_   _| ____\\ \\/ /  _ \\_   _|
| |_) |  _|   | | | |_) | | | || | |  _|  \\  /| |_) || |
|  _ <| |___  | | |  _ <| |_| || | | |___ /  \\|  __/ | |
|_| \\_|_____| |_| |_| \\_\\\\___/ |_| |_____/_/\\_\\_|    |_|

          A  D  V  E  N  T  U  R  E  S
`;
