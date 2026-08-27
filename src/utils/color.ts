export function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Picks a readable icon/text color (near-white or near-black) against an arbitrary fill color. */
export function contrastingIconColor(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.45 ? '#14151a' : '#ffffff';
}
