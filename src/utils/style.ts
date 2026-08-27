import type { CSSProperties } from 'react';

export function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}
