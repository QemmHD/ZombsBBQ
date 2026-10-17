/**
 * Pets: who they are and how they fight in raids. The original's pet table (doc 16 §I, doc 17 §3.7)
 * has nine pets with 250–1000 HP, four stat bytes and a critical hit (chance 0.1–0.2, ×2–×3). Its four
 * stat bytes are read here as attack (damage per swing), attack speed (swing timer), move speed and a
 * fourth whose meaning is unknown (INFERRED, the data has no field names). The creatures and names are
 * ours; the numbers are the original's. The Zombie Pug is ours too: a café money-sniffer, a weak biter.
 *
 * Pets never serve or eat: in a raid they go for the waiters and the Head Chef.
 */
export type PetType = 'pug' | 'rotweiler' | 'wolf' | 'cat' | 'sphinx' | 'robohound' | 'robolion' | 'robobear' | 'robobull' | 'robopanther';

export interface PetDef {
  type: PetType;
  name: string;
  /** raid HP (energy) */
  hp: number;
  /** damage per swing */
  atk: number;
  /** attack-speed stat (swing every 1000 / (2 + 0.2·aspd) ms) */
  aspd: number;
  /** move-speed stat (2 + 0.2·move, no zombie slowdown) */
  move: number;
  critChance: number;
  critMult: number;
  robot?: boolean;
  /** the pet house that brings it (catalog item id) */
  house: string;
  blurb: string;
}

const P = (type: PetType, name: string, hp: number, atk: number, aspd: number, move: number, critChance: number, critMult: number, house: string, blurb: string, robot?: boolean): PetDef => ({
  type,
  name,
  hp,
  atk,
  aspd,
  move,
  critChance,
  critMult,
  house,
  blurb,
  robot,
});

export const PETS: PetDef[] = [
  P('pug', 'Zombie Pug', 150, 3, 4, 6, 0.1, 2, 'pethouse_pug', 'Sniffs out loose change. Bites ankles in a raid.'),
  P('rotweiler', 'Rot-weiler', 250, 5, 5, 7, 0.1, 2, 'pethouse_kennel', 'All bandages and bad temper.'),
  P('wolf', 'Grave Wolf', 950, 11, 8, 9, 0.2, 3, 'pethouse_wolf', 'Howls at the moon. Eats the waiter.'),
  P('cat', 'Grinning Ghoul-Cat', 900, 9, 11, 9, 0.2, 3, 'pethouse_cat', 'The grin stays long after the cat has gone.'),
  P('sphinx', 'Mummy Sphinx', 1000, 10, 9, 8, 0.2, 2, 'pethouse_sphinx', 'Asks one riddle. Nobody has ever answered.'),
  P('robohound', 'Robo-Hound', 900, 10, 9, 5, 0.2, 3, 'pethouse_robohound', 'Fetches. Shreds what it fetches.', true),
  P('robolion', 'Robo-Lion', 1000, 10, 10, 9, 0.2, 3, 'pethouse_robolion', 'King of the scrapyard.', true),
  P('robobear', 'Robo-Bear', 500, 6, 5, 6, 0.1, 2, 'pethouse_robobear', 'A hug with hydraulics.', true),
  P('robobull', 'Robo-Bull', 650, 9, 6, 4, 0.1, 2, 'pethouse_robobull', 'Sees red. Everything is red.', true),
  P('robopanther', 'Robo-Panther', 300, 5, 6, 8, 0.1, 2, 'pethouse_robopanther', 'Quiet servos, sharp claws.', true),
];

export const PET_BY_TYPE: Record<PetType, PetDef> = Object.fromEntries(PETS.map((p) => [p.type, p])) as Record<PetType, PetDef>;

/** A pet's character art id (the four-legged rig, see art3/chars/pets.ts). */
export const petArt = (type: string) => `pet_${type}`;
/** A pet's display name (falls back to the Rot-weiler for an unknown type from an old save). */
export const petName = (type: string) => (PET_BY_TYPE[type as PetType] ?? PET_BY_TYPE.rotweiler).name;
