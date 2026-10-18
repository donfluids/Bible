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

const ART = {
  balloon: require('../assets/cards/balloon.png'),
  birthdayCake: require('../assets/cards/birthday_cake.png'),
  bouquet: require('../assets/cards/bouquet.png'),
  christmasTree: require('../assets/cards/christmas_tree.png'),
  dove: require('../assets/cards/dove.png'),
  partyPopper: require('../assets/cards/party_popper.png'),
  ring: require('../assets/cards/ring.png'),
  rose: require('../assets/cards/redoute_rose.png'),
  tulip: require('../assets/cards/tulip.png'),
  twoHearts: require('../assets/cards/two_hearts.png'),
  wrappedGift: require('../assets/cards/wrapped_gift.png'),
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

export type DesignId = 'celebrate' | 'party' | 'wedding' | 'hearts' | 'rose' | 'tulip' | 'christmas' | 'sunrise' | 'dove' | 'paper';

export interface Design {
  id: DesignId;
  /** One colour, or a gradient from top to bottom (`diagonal`: top left to bottom right). */
  background: string[];
  diagonal?: boolean;
  /** The verse; the heading and reference; the credit line. */
  ink: string;
  accent: string;
  faint: string;
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
const ROSE_RATIO = 787 / 640;

export const DESIGNS: Design[] = [
  {
    id: 'celebrate',
    background: ['#FFF4E4', '#FFE1E6', '#F9D2E6'],
    diagonal: true,
    ink: '#3E1D27',
    accent: '#9A2F4C',
    faint: 'rgba(62,29,39,0.55)',
    square: {
      art: [
        { src: ART.balloon, width: 60, left: 20, top: 16, rotate: -12 },
        { src: ART.birthdayCake, width: 84, left: 138, top: 16 },
        { src: ART.balloon, width: 52, right: 24, top: 30, rotate: 10, flip: true },
      ],
      box: box(104, 30, 30, 22),
      align: 'center',
    },
    tall: {
      art: [
        { src: ART.balloon, width: 84, left: 26, top: 40, rotate: -12 },
        { src: ART.birthdayCake, width: 120, left: 120, top: 70 },
        { src: ART.balloon, width: 72, right: 30, top: 60, rotate: 10, flip: true },
      ],
      box: box(210, 32, 32, 48),
      align: 'center',
    },
  },
  {
    id: 'party',
    background: ['#F7F0E2'],
    ink: '#3B2A14',
    accent: '#8A5A1E',
    faint: 'rgba(59,42,20,0.55)',
    borders: [{ color: '#B38E57', inset: 12, width: 1.5 }],
    square: {
      art: [
        { src: ART.partyPopper, width: 46, left: 24, top: 22 },
        { src: ART.wrappedGift, width: 54, right: 24, bottom: 24 },
      ],
      box: box(58, 34, 34, 54),
      align: 'center',
    },
    tall: {
      art: [
        { src: ART.partyPopper, width: 72, left: 30, top: 34 },
        { src: ART.wrappedGift, width: 84, right: 30, bottom: 36 },
      ],
      box: box(120, 34, 34, 130),
      align: 'center',
    },
  },
  {
    id: 'wedding',
    background: ['#FFFFFF', '#F7F2EA'],
    ink: '#3B3226',
    accent: '#9C7A3C',
    faint: 'rgba(59,50,38,0.55)',
    borders: [
      { color: '#C9A86A', inset: 14, width: 1 },
      { color: '#E3D1AC', inset: 19, width: 1 },
    ],
    square: { above: [{ src: ART.bouquet, width: 60 }, { src: ART.ring, width: 42 }], box: box(34, 36, 36, 34), align: 'center' },
    tall: { above: [{ src: ART.bouquet, width: 96 }, { src: ART.ring, width: 66 }], box: box(60, 38, 38, 60), align: 'center' },
  },
  {
    id: 'hearts',
    background: ['#FFF7F5', '#FBE6E4'],
    ink: '#40262A',
    accent: '#A3404E',
    faint: 'rgba(64,38,42,0.55)',
    borders: [{ color: '#E5B7B5', inset: 14, width: 1 }],
    square: { above: [{ src: ART.twoHearts, width: 64 }], box: box(34, 36, 36, 34), align: 'center' },
    tall: { above: [{ src: ART.twoHearts, width: 100 }], box: box(60, 38, 38, 60), align: 'center' },
  },
  {
    id: 'rose',
    background: ['#F4F0EA'],
    ink: '#3A3434',
    accent: '#7A3A4A',
    faint: 'rgba(58,52,52,0.55)',
    square: { art: [{ src: ART.rose, width: 196, ratio: ROSE_RATIO, left: -26, top: -4 }], box: box(26, 168, 22, 26), align: 'left' },
    tall: { art: [{ src: ART.rose, width: 250, ratio: ROSE_RATIO, left: 55, top: 6 }], box: box(330, 34, 34, 40), align: 'center' },
  },
  {
    id: 'tulip',
    background: ['#F1F7EC', '#FFFFFF'],
    ink: '#2F4433',
    accent: '#4F7356',
    faint: 'rgba(47,68,51,0.55)',
    square: { above: [{ src: ART.tulip, width: 64 }], box: box(30, 34, 34, 30), align: 'center' },
    tall: { above: [{ src: ART.tulip, width: 104 }], box: box(60, 36, 36, 60), align: 'center' },
  },
  {
    id: 'christmas',
    background: ['#2A3E6E', '#14214A', '#0B1430'],
    ink: '#F3E7C6',
    accent: '#E8C77A',
    faint: 'rgba(243,231,198,0.6)',
    stars: '#F3E7C6',
    square: { art: [{ src: ART.christmasTree, width: 116, left: -6, bottom: 20 }], box: box(24, 120, 26, 24), align: 'left' },
    tall: { art: [{ src: ART.christmasTree, width: 170, left: 95, bottom: 34 }], box: box(56, 32, 32, 220), align: 'center' },
  },
  {
    id: 'sunrise',
    background: ['#FFE3BD', '#FFF2E2', '#FFFFFF'],
    ink: '#3B2A14',
    accent: '#B0561E',
    faint: 'rgba(59,42,20,0.55)',
    cross: '#B0561E',
    halo: '#FFC977',
    square: { box: box(34, 34, 34, 34), align: 'center' },
    tall: { box: box(60, 36, 36, 60), align: 'center' },
  },
  {
    id: 'dove',
    background: ['#DDEBF6', '#F4F7FA', '#FFFFFF'],
    ink: '#22313F',
    accent: '#2D5D8A',
    faint: 'rgba(34,49,63,0.55)',
    square: { above: [{ src: ART.dove, width: 70 }], box: box(28, 34, 34, 30), align: 'center' },
    tall: { above: [{ src: ART.dove, width: 120 }], box: box(60, 36, 36, 60), align: 'center' },
  },
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
  return DESIGNS.find((d) => d.id === id) ?? DESIGNS[DESIGNS.length - 1];
}
