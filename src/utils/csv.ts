export type CsvRow = string[];

const DELIMITER_CANDIDATES = ['\t', ',', ';'];

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

// Judging a candidate by raw character count is fragile: a card's own text often
// contains commas ("Bonjour, ça va ?"), which can outnumber a real ";" separator
// across the file, or tie with it exactly. What a real delimiter actually produces
// is the *same* column count on every row, so score each candidate by how many rows
// agree on one column count (>= 2, since 1 column means the delimiter never fired)
// and let raw occurrences only break ties between equally consistent candidates.
function detectDelimiter(lines: string[]): string {
  let best = ',';
  let bestConsistency = -1;
  let bestColumns = 1;
  let bestTotal = -1;
  for (const candidate of DELIMITER_CANDIDATES) {
    const columnCounts = new Map<number, number>();
    for (const line of lines) {
      const columns = parseLine(line, candidate).length;
      if (columns < 2) continue;
      columnCounts.set(columns, (columnCounts.get(columns) ?? 0) + 1);
    }
    let consistency = 0;
    let columns = 1;
    for (const [cols, occurrences] of columnCounts) {
      if (occurrences > consistency || (occurrences === consistency && cols > columns)) {
        consistency = occurrences;
        columns = cols;
      }
    }
    const total = lines.reduce((sum, line) => sum + (parseLine(line, candidate).length - 1), 0);
    const better =
      consistency > bestConsistency ||
      (consistency === bestConsistency && columns > bestColumns) ||
      (consistency === bestConsistency && columns === bestColumns && total > bestTotal);
    if (better) {
      bestConsistency = consistency;
      bestColumns = columns;
      bestTotal = total;
      best = candidate;
    }
  }
  return best;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0 && !line.trimStart().startsWith('#'));
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines);
  return lines.map((line) => parseLine(line, delimiter));
}

const HEADER_WORDS = new Set(['front', 'back', 'question', 'answer', 'recto', 'verso']);

export function isHeaderRow(row: CsvRow): boolean {
  return row.length >= 2 && HEADER_WORDS.has(row[0].toLowerCase()) && HEADER_WORDS.has(row[1].toLowerCase());
}
