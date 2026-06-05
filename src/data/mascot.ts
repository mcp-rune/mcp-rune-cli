export interface Mascot {
  welcome: string;
  signoff: string;
  charm: string;
  sigil: string;
}

type SeasonalSet = {
  welcomes: readonly string[];
  signoffs: readonly string[];
  charms: readonly string[];
  sigils: readonly string[];
};

const DEFAULT: SeasonalSet = {
  welcomes: [
    'Conjuring a fresh server.',
    'Etching your sigil.',
    'Forging a new rune.',
    'Weaving runes into a server.',
    'Compiling the incantation.',
    'Drafting the protocol.',
  ],
  signoffs: [
    'May the protocol be with you.',
    'Cast it well.',
    'Run it, mage.',
    'Your sigil is set.',
    'Carry it carefully.',
    'Go forth and tool.',
  ],
  charms: ['⟁', '❖', '◇', '✶', '✦'],
  sigils: ['▸', '›', '»', '→'],
};

const WINTER: SeasonalSet = {
  welcomes: [
    'A cold incantation begins.',
    'Frozen sigil, warm protocol.',
    'Winter runes are sharper.',
  ],
  signoffs: [
    'Stay warm by the protocol.',
    'May the cache stay warm.',
    'Wrap up — and ship it.',
  ],
  charms: ['❄', '✻', '✺'],
  sigils: DEFAULT.sigils,
};

const LAUNCH_WEEK: SeasonalSet = {
  welcomes: [
    'Liftoff is a stack frame away.',
    'Spinning up the launch ring.',
    'Plotting the trajectory.',
  ],
  signoffs: [
    'Liftoff confirmed.',
    'Wheels up.',
    'Cleared for the protocol.',
  ],
  charms: ['✺', '✷', '✸'],
  sigils: ['▸', '↑', '↗'],
};

function getSeason(now: Date): 'winter' | 'launch' | 'default' {
  const m = now.getUTCMonth(); // 0-based
  const d = now.getUTCDate();
  // Winter: Dec 1 — Jan 31
  if (m === 11 || m === 0) return 'winter';
  // MCP-anniversary "launch week" — first week of November.
  // (Pulled the spec going public in Nov 2024 as the anchor.)
  if (m === 10 && d <= 7) return 'launch';
  return 'default';
}

const SEASONS: Record<'winter' | 'launch' | 'default', SeasonalSet> = {
  winter: WINTER,
  launch: LAUNCH_WEEK,
  default: DEFAULT,
};

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

export interface PickMascotOptions {
  now?: Date;
  /** Deterministic seed for tests; defaults to a value derived from current ms. */
  seed?: number;
}

export function pickMascot(opts: PickMascotOptions = {}): Mascot {
  const now = opts.now ?? new Date();
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const set = SEASONS[getSeason(now)];
  return {
    welcome: pick(set.welcomes, seed),
    signoff: pick(set.signoffs, seed + 1),
    charm: pick(set.charms, seed + 2),
    sigil: pick(set.sigils, seed + 3),
  };
}
