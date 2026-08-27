const CLOZE_PATTERN = /\{\{(.+?)\}\}/g;

export function hasCloze(text: string): boolean {
  return /\{\{.+?\}\}/.test(text);
}

export function deriveClozeFront(text: string): string {
  return text.replace(CLOZE_PATTERN, '[...]');
}

export function deriveClozeBack(text: string): string {
  return text.replace(CLOZE_PATTERN, '$1');
}

export type ClozeSegment = { text: string; revealed: boolean };

export function clozeSegments(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  const regex = new RegExp(CLOZE_PATTERN);
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), revealed: false });
    }
    segments.push({ text: match[1], revealed: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), revealed: false });
  }
  return segments;
}
