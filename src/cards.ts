// Verse cards: the designs and occasions of "Share as card". A card is laid out on a grid
// 360 units wide (360 tall when square, 640 when tall, for WhatsApp status and stories)
// and drawn at any size by scaling the units. The artwork is in assets/cards (see
// SOURCES.md there).
import type { ImageSourcePropType } from 'react-native';
import type { StringKey } from './i18n';

export type CardSize = 'square' | 'tall';
export const CARD_WIDTH = 360;
export const CARD_HEIGHT: Record<CardSize, number> = { square: 360, tall: 640 };
/** Pixels across the shared picture. */
export const CARD_PIXELS = 1080;

// Watercolour paintings made for these cards (assets/cards/SOURCES.md): each fills the card,
// its subject in the lower third and a pale wash above it for the words.
const PAINTING = {
  birthday: require('../assets/cards/painting_birthday.jpg'),
  party: require('../assets/cards/painting_party.jpg'),
  wedding: require('../assets/cards/painting_wedding.jpg'),
  anniversary: require('../assets/cards/painting_anniversary.jpg'),
  getWell: require('../assets/cards/painting_getwell.jpg'),
  sympathy: require('../assets/cards/painting_sympathy.jpg'),
  christmas: require('../assets/cards/painting_christmas.jpg'),
  easter: require('../assets/cards/painting_easter.jpg'),
  newYear: require('../assets/cards/painting_newyear.jpg'),
  lavender: require('../assets/cards/wash_lavender.jpg'),
  peach: require('../assets/cards/wash_peach.jpg'),
  sage: require('../assets/cards/wash_sage.jpg'),
  honey: require('../assets/cards/wash_gold.jpg'),
} satisfies Record<string, ImageSourcePropType>;

/** A picture placed on the card, in card units; `ratio` is height over width. */
export interface Art {
  src: ImageSourcePropType;
  width: number;
  ratio?: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  rotate?: number;
  flip?: boolean;
}

export interface CardLayout {
  /** Pictures behind the text, placed on the card. */
  art?: Art[];
  /** Pictures in a row above the heading, in the flow of the text. */
  above?: Art[];
  /** The box the text is set in. */
  box: { top: number; left: number; right: number; bottom: number };
  align: 'center' | 'left';
}

export type DesignId =
  | 'paper' | 'linen' | 'gold' | 'dawn' | 'olive' | 'night' | 'ink'
  | 'celebrate' | 'party' | 'wedding' | 'hearts' | 'rose' | 'tulip' | 'christmas' | 'sunrise' | 'dove'
  | 'lavender' | 'peach' | 'sage' | 'honey';

export interface Design {
  id: DesignId;
  /** One colour, or a gradient from top to bottom (`diagonal`: top left to bottom right). */
  background: string[];
  diagonal?: boolean;
  /** The verse; the heading and reference; the credit line. */
  ink: string;
  accent: string;
  faint: string;
  /** A painting that fills the card, anchored at its foot (`ratio` is height over width). */
  painting?: { src: ImageSourcePropType; ratio: number };
  /** Lines drawn inside the edge, `inset` units in. */
  borders?: { color: string; inset: number; width: number }[];
  /** A small cross drawn above the text, and a soft sun behind it. */
  cross?: string;
  halo?: string;
  /** Small stars scattered on the card. */
  stars?: string;
  square: CardLayout;
  tall: CardLayout;
}

const box = (top: number, left: number, right: number, bottom: number) => ({ top, left, right, bottom });
// The paintings are 448 by 768, on white watercolour paper of this colour at their edges.
const TALL_PAINTING = 768 / 448;
const PAPER = '#F9FAFC';

/** A design on one of the paintings: the words in the wash above the subject. */
const painted = (id: DesignId, src: ImageSourcePropType, colour: string, ink: string, accent: string, faint: string, square?: CardLayout): Design => ({
  id,
  background: [colour],
  painting: { src, ratio: TALL_PAINTING },
  ink,
  accent,
  faint,
  // The square card shows the whole painting, narrower, its sides fading into the paper.
  square: square ?? { box: box(22, 24, 24, 182), align: 'center' },
  tall: { box: box(46, 30, 30, 272), align: 'center' },
});

/** A plain wash for any verse: the words in the middle. */
const washed = (id: DesignId, src: ImageSourcePropType): Design => ({
  id,
  background: [PAPER],
  painting: { src, ratio: TALL_PAINTING },
  ink: '#3A2E28',
  accent: '#7A4E1C',
  faint: 'rgba(58,46,40,0.55)',
  square: { box: box(40, 36, 36, 40), align: 'center' },
  tall: { box: box(70, 38, 38, 70), align: 'center' },
});

export const DESIGNS: Design[] = [
  {
    id: 'paper',
    background: ['#F6EEDC'],
    ink: '#3B2A14',
    accent: '#7A5A2A',
    faint: 'rgba(59,42,20,0.55)',
    borders: [
      { color: '#9B7A4A', inset: 14, width: 1.5 },
      { color: '#9B7A4A', inset: 19, width: 0.75 },
    ],
    cross: '#9B7A4A',
    square: { box: box(40, 40, 40, 40), align: 'center' },
    tall: { box: box(70, 42, 42, 70), align: 'center' },
  },
  {
    // Warm grey, like good writing paper, with one thin rule.
    id: 'linen',
    background: ['#F3F1EC', '#ECE8E0'],
    ink: '#2E2B27',
    accent: '#6B5E4E',
    faint: 'rgba(46,43,39,0.55)',
    borders: [{ color: '#C9C1B3', inset: 12, width: 1 }],
    square: { box: box(36, 36, 36, 36), align: 'center' },
    tall: { box: box(64, 40, 40, 64), align: 'center' },
  },
  {
    // White with a double gold rule and a small gold cross: weddings and anniversaries without pictures.
    id: 'gold',
    background: ['#FFFFFF', '#FBF7EF'],
    ink: '#3B3226',
    accent: '#9C7A3C',
    faint: 'rgba(59,50,38,0.55)',
    borders: [
      { color: '#C9A86A', inset: 14, width: 1 },
      { color: '#E3D1AC', inset: 19, width: 1 },
    ],
    cross: '#C9A86A',
    square: { box: box(40, 40, 40, 40), align: 'center' },
    tall: { box: box(70, 42, 42, 70), align: 'center' },
  },
  {
    // Rose and apricot with a sun behind the cross.
    id: 'dawn',
    background: ['#F9D9D4', '#FDEBDD', '#FFF8F0'],
    ink: '#4A2B2B',
    accent: '#A04A3A',
    faint: 'rgba(74,43,43,0.55)',
    cross: '#A04A3A',
    halo: '#FFB88C',
    square: { box: box(34, 34, 34, 34), align: 'center' },
    tall: { box: box(60, 36, 36, 60), align: 'center' },
  },
  {
    // Sage green with a deep green rule.
    id: 'olive',
    background: ['#E4EBDD', '#D5DFCB'],
    ink: '#273A2A',
    accent: '#4F6B46',
    faint: 'rgba(39,58,42,0.55)',
    borders: [{ color: '#8FA383', inset: 12, width: 1 }],
    cross: '#6B8460',
    square: { box: box(38, 38, 38, 38), align: 'center' },
    tall: { box: box(68, 40, 40, 68), align: 'center' },
  },
  {
    // Indigo night with a few stars and a gold rule, for any season.
    id: 'night',
    background: ['#1E2A4A', '#121A33', '#0A0F22'],
    ink: '#F3E7C6',
    accent: '#E8C77A',
    faint: 'rgba(243,231,198,0.6)',
    stars: '#F3E7C6',
    borders: [{ color: 'rgba(232,199,122,0.55)', inset: 12, width: 1 }],
    square: { box: box(38, 38, 38, 38), align: 'center' },
    tall: { box: box(68, 40, 40, 68), align: 'center' },
  },
  {
    // Black and white, nothing else: the status look.
    id: 'ink',
    background: ['#141414'],
    ink: '#F4F1EA',
    accent: '#D9CBA8',
    faint: 'rgba(244,241,234,0.6)',
    square: { box: box(40, 36, 36, 40), align: 'center' },
    tall: { box: box(70, 40, 40, 70), align: 'center' },
  },
  painted('celebrate', PAINTING.birthday, PAPER, '#4A2A22', '#A3404E', 'rgba(74,42,34,0.55)'),
  painted('party', PAINTING.party, PAPER, '#3B2A14', '#8A5A1E', 'rgba(59,42,20,0.55)'),
  painted('wedding', PAINTING.wedding, PAPER, '#3B3226', '#9C7A3C', 'rgba(59,50,38,0.55)'),
  painted('hearts', PAINTING.anniversary, PAPER, '#40262A', '#A3404E', 'rgba(64,38,42,0.55)'),
  painted('rose', PAINTING.sympathy, PAPER, '#2A3440', '#4A5E78', 'rgba(42,52,64,0.55)'),
  painted('tulip', PAINTING.getWell, PAPER, '#2F4433', '#4F7356', 'rgba(47,68,51,0.55)'),
  // Light words on the dark wash: on the square card, only as wide as the painting.
  painted('christmas', PAINTING.christmas, PAPER, '#F4EEDF', '#E8C77A', 'rgba(244,238,223,0.65)', { box: box(26, 88, 88, 124), align: 'center' }),
  painted('sunrise', PAINTING.easter, PAPER, '#3B2A14', '#B0561E', 'rgba(59,42,20,0.55)'),
  painted('dove', PAINTING.newYear, PAPER, '#22313F', '#2D5D8A', 'rgba(34,49,63,0.55)'),
  washed('lavender', PAINTING.lavender),
  washed('peach', PAINTING.peach),
  washed('sage', PAINTING.sage),
  washed('honey', PAINTING.honey),
];

export type Occasion = 'none' | 'birthday' | 'wedding' | 'anniversary' | 'sympathy' | 'getWell' | 'christmas' | 'easter' | 'newYear';

/** The occasions in the order offered, with their heading and the design they start with. */
export const OCCASIONS: { id: Occasion; label: StringKey; heading: StringKey | null; design: DesignId }[] = [
  { id: 'none', label: 'occasionNone', heading: null, design: 'paper' },
  { id: 'birthday', label: 'occasionBirthday', heading: 'headingBirthday', design: 'celebrate' },
  { id: 'wedding', label: 'occasionWedding', heading: 'headingWedding', design: 'wedding' },
  { id: 'anniversary', label: 'occasionAnniversary', heading: 'headingAnniversary', design: 'hearts' },
  { id: 'sympathy', label: 'occasionSympathy', heading: 'headingSympathy', design: 'rose' },
  { id: 'getWell', label: 'occasionGetWell', heading: 'headingGetWell', design: 'tulip' },
  { id: 'christmas', label: 'occasionChristmas', heading: 'headingChristmas', design: 'christmas' },
  { id: 'easter', label: 'occasionEaster', heading: 'headingEaster', design: 'sunrise' },
  { id: 'newYear', label: 'occasionNewYear', heading: 'headingNewYear', design: 'dove' },
];

export function designById(id: DesignId): Design {
  return DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
}

/** Where the verse and its lines stand on the card. */
export type TextPlace = 'top' | 'middle' | 'bottom';
/** The see-through layer over a photo that keeps the words readable: light under dark words, dark under light ones. */
export type Veil = 'light' | 'dark';
export type VeilStrength = 1 | 2 | 3;

/**
 * A design as the sender has changed it: their own photo behind the words (under a light
 * or dark veil, sharp or blurred) or a plain colour, where the words stand, a book or a
 * plain face, and whether the design's pictures, lines and cross show. Saved looks are
 * kept on the phone (src/cardLooks.ts).
 */
export interface CardLook {
  design: DesignId;
  /** A copy of the chosen photo in the app's own files. */
  photo?: string;
  veil: Veil;
  strength: VeilStrength;
  blur: boolean;
  /** A plain background instead of the design's colours (no photo). */
  colour?: string;
  place: TextPlace;
  plainFace: boolean;
  extras: boolean;
}

export const DEFAULT_LOOK: CardLook = { design: 'paper', veil: 'light', strength: 2, blur: false, place: 'middle', plainFace: false, extras: true };

/** Plain backgrounds to choose from: three light, four deep. */
export const CARD_COLOURS = ['#FFFFFF', '#F6EEDC', '#FCE9EC', '#E3EEF7', '#1F2A44', '#4A1C28', '#1E3A2B'];

/** How much of the veil shows at each strength. */
export const VEIL_OPACITY: Record<Veil, Record<VeilStrength, number>> = {
  light: { 1: 0.35, 2: 0.55, 3: 0.75 },
  dark: { 1: 0.3, 2: 0.5, 3: 0.7 },
};
export const VEIL_COLOUR: Record<Veil, string> = { light: '#FFFAF0', dark: '#0F0C08' };

const DARK_WORDS = { ink: '#2A2118', accent: '#7A4E1C', faint: 'rgba(42,33,24,0.6)' };
const LIGHT_WORDS = { ink: '#FFFFFF', accent: '#F3D894', faint: 'rgba(255,255,255,0.72)' };

/** Relative brightness of a #RRGGBB colour, 0 (black) to 1 (white). */
function brightness(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The design to draw for a look: the words in colours that read on the photo's veil or
 * the plain colour (light words on a dark one), and without its pictures and lines when
 * those are turned off.
 */
export function lookDesign(look: CardLook): { design: Design; lightWords: boolean } {
  const base = designById(look.design);
  const lightWords = look.photo ? look.veil === 'dark' : !!look.colour && brightness(look.colour) < 0.45;
  const words = look.photo || look.colour ? (lightWords ? LIGHT_WORDS : DARK_WORDS) : null;
  const design: Design = {
    ...base,
    ...(words ?? {}),
    background: look.photo ? [VEIL_COLOUR[look.veil]] : look.colour ? [look.colour] : base.background,
    ...(look.photo || look.colour || !look.extras ? { painting: undefined } : {}),
    ...(look.extras ? {} : { borders: undefined, cross: undefined, halo: undefined, stars: undefined }),
    ...(look.extras && words ? { borders: base.borders?.map((b) => ({ ...b, color: words.accent })), cross: base.cross ? words.accent : undefined } : {}),
    square: look.extras ? base.square : { ...base.square, art: undefined, above: undefined },
    tall: look.extras ? base.tall : { ...base.tall, art: undefined, above: undefined },
  };
  return { design, lightWords };
}
