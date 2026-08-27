import { normalizeAnswer } from './learn';

/** Answers with at least this many words are too long to retype verbatim — blank them instead. */
export const BLANKS_MIN_WORDS = 7;
const MAX_BLANKS = 4;
const MIN_BLANK_LENGTH = 4;

/** Function words carry no recall value, so they're never blanked. */
const STOPWORDS = new Set([
  // French
  'alors', 'aussi', 'autre', 'avec', 'avoir', 'bien', 'cela', 'celle', 'celui', 'cent', 'ces', 'cet', 'cette',
  'chaque', 'comme', 'dans', 'des', 'donc', 'dont', 'elle', 'elles', 'encore', 'entre', 'est', 'etait', 'etre',
  'faire', 'fait', 'ils', 'leur', 'leurs', 'lui', 'mais', 'meme', 'moins', 'nous', 'par', 'pas', 'peut', 'plus',
  'pour', 'pouvoir', 'quand', 'que', 'quel', 'quelle', 'qui', 'sans', 'ses', 'son', 'sont', 'sous', 'sur',
  'tous', 'tout', 'toute', 'toutes', 'tres', 'une', 'vers', 'vous', 'etaient', 'ont', 'aux', 'les', 'des',
  'autres', 'memes', 'cettes', 'quelles', 'quels', 'celles', 'ceux', 'dans', 'apres', 'avant', 'ainsi',
  // English (cards are often bilingual)
  'about', 'after', 'also', 'and', 'are', 'because', 'been', 'but', 'can', 'for', 'from', 'has', 'have', 'into',
  'more', 'not', 'only', 'other', 'she', 'should', 'some', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'was', 'were', 'what', 'when', 'which', 'will', 'with', 'would',
]);

export type BlankSegment = { type: 'text'; value: string } | { type: 'blank'; value: string; index: number };

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function shouldUseBlanks(text: string): boolean {
  if (countWords(text) < BLANKS_MIN_WORDS) return false;
  return pickBlankPositions(text).length > 0;
}

type Token = { value: string; start: number; end: number };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

function isCandidate(token: Token): boolean {
  const norm = normalizeAnswer(token.value);
  if (norm.length < MIN_BLANK_LENGTH) return false;
  if (STOPWORDS.has(norm)) return false;
  return true;
}

/** Picks content-word tokens to blank, spread evenly through the sentence rather than clustered. */
function pickBlankPositions(text: string): Token[] {
  const candidates = tokenize(text).filter(isCandidate);
  if (candidates.length === 0) return [];
  const count = Math.min(MAX_BLANKS, Math.max(1, Math.round(candidates.length / 3)));
  if (candidates.length <= count) return candidates;
  const step = candidates.length / count;
  const picked: Token[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(candidates[Math.floor(i * step + step / 2)]);
  }
  return picked;
}

export function buildBlanks(text: string): BlankSegment[] {
  const blanks = pickBlankPositions(text);
  if (blanks.length === 0) return [{ type: 'text', value: text }];

  const segments: BlankSegment[] = [];
  let cursor = 0;
  blanks.forEach((token, i) => {
    if (token.start > cursor) segments.push({ type: 'text', value: text.slice(cursor, token.start) });
    segments.push({ type: 'blank', value: token.value, index: i });
    cursor = token.end;
  });
  if (cursor < text.length) segments.push({ type: 'text', value: text.slice(cursor) });
  return segments;
}
