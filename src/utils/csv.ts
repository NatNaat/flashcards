export type CsvRow = string[];

const DELIMITER_CANDIDATES = ['\t', ',', ';'];

function detectDelimiter(line: string): string {
  let best = ',';
  let bestCount = -1;
  for (const candidate of DELIMITER_CANDIDATES) {
    const count = line.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

function parseLine(line: string, delimiter: string): CsvRow {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0 && !line.trimStart().startsWith('#'));
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseLine(line, delimiter));
}

const HEADER_WORDS = new Set(['front', 'back', 'question', 'answer', 'recto', 'verso']);

export function isHeaderRow(row: CsvRow): boolean {
  return row.length >= 2 && HEADER_WORDS.has(row[0].toLowerCase()) && HEADER_WORDS.has(row[1].toLowerCase());
}
