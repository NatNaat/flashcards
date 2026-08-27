import {
  Book,
  Globe,
  Flask,
  Calculator,
  MusicNotes,
  Code,
  Palette,
  Atom,
  Clock,
  Star,
  Heart,
  Lightbulb,
  Target,
  Rocket,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

type IconProps = { size?: number };

export const DECK_SVG_ICONS: Record<string, { label: string; Icon: PhosphorIcon }> = {
  book: { label: 'Livre', Icon: Book },
  globe: { label: 'Langues', Icon: Globe },
  flask: { label: 'Sciences', Icon: Flask },
  calculator: { label: 'Maths', Icon: Calculator },
  music: { label: 'Musique', Icon: MusicNotes },
  code: { label: 'Code', Icon: Code },
  palette: { label: 'Art', Icon: Palette },
  atom: { label: 'Physique', Icon: Atom },
  clock: { label: 'Histoire', Icon: Clock },
  star: { label: 'Étoile', Icon: Star },
  heart: { label: 'Cœur', Icon: Heart },
  lightbulb: { label: 'Idée', Icon: Lightbulb },
  target: { label: 'Objectif', Icon: Target },
  rocket: { label: 'Fusée', Icon: Rocket },
};

export const DECK_EMOJI = [
  '📚', '🧠', '🌍', '🔬', '🧮', '🎵', '💻', '🎨', '⚛️', '📜',
  '⭐', '❤️', '💡', '🎯', '🚀', '🗣️', '✈️', '🏛️', '🧬', '⚽',
];

export type ParsedDeckIcon = { kind: 'svg'; key: string } | { kind: 'emoji'; value: string } | null;

export function parseDeckIcon(icon: string | undefined): ParsedDeckIcon {
  if (!icon) return null;
  if (icon.startsWith('svg:')) return { kind: 'svg', key: icon.slice(4) };
  if (icon.startsWith('emoji:')) return { kind: 'emoji', value: icon.slice(6) };
  return null;
}

export type { IconProps };
