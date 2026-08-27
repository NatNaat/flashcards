import { Rating, type Grade } from './scheduler';

export type GradeMeta = { grade: Grade; label: string; color: string; shadow: string };

export const GRADE_META: GradeMeta[] = [
  { grade: Rating.Again, label: 'Encore', color: 'var(--again)', shadow: 'var(--again-dark)' },
  { grade: Rating.Hard, label: 'Difficile', color: 'var(--hard)', shadow: 'var(--hard-dark)' },
  { grade: Rating.Good, label: 'Bien', color: 'var(--good)', shadow: 'var(--good-dark)' },
  { grade: Rating.Easy, label: 'Facile', color: 'var(--easy)', shadow: 'var(--easy-dark)' },
];

export function gradeMeta(grade: Grade): GradeMeta {
  return GRADE_META.find((g) => g.grade === grade) ?? GRADE_META[0];
}
