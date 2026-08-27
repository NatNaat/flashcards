/** Cumulative XP required to REACH a given level (level 1 = 0 XP). Gaps grow by 100 XP per level. */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return 50 * n * (n + 1);
}

export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return { level, xpIntoLevel: xp - floor, xpForNextLevel: ceiling - floor };
}
