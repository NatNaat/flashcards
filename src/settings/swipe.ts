import { Rating, type Grade } from '../scheduler/scheduler';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export type SwipeGradeMap = Record<SwipeDirection, Grade>;

export const DEFAULT_SWIPE_MAP: SwipeGradeMap = {
  left: Rating.Hard,
  right: Rating.Easy,
  up: Rating.Good,
  down: Rating.Again,
};

/** Fixed cycle order used when reassigning a direction's grade. */
export const GRADE_CYCLE: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

export const SWIPE_DIRECTIONS: SwipeDirection[] = ['up', 'right', 'down', 'left'];

/** Advances `direction` to the next grade in the cycle, swapping with whichever direction currently holds it (keeps the map a bijection). */
export function cycleSwipeDirection(map: SwipeGradeMap, direction: SwipeDirection): SwipeGradeMap {
  const current = map[direction];
  const currentIdx = GRADE_CYCLE.indexOf(current);
  const next = GRADE_CYCLE[(currentIdx + 1) % GRADE_CYCLE.length];
  const otherDirection = (Object.keys(map) as SwipeDirection[]).find((d) => map[d] === next && d !== direction);
  const updated: SwipeGradeMap = { ...map, [direction]: next };
  if (otherDirection) {
    updated[otherDirection] = current;
  }
  return updated;
}
