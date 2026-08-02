export const DHAN_MASTER_URL = 'https://images.dhan.co/api-data/api-scrip-master.csv';

/** Map Dhan CSV exchange + segment to WebSocket ExchangeSegment enum. */
export function mapDhanExchangeSegment(
  exchId: string,
  segment: string,
  instrumentName?: string,
): string | null {
  const exch = exchId.toUpperCase();
  const seg = segment.toUpperCase();
  const inst = (instrumentName || '').toUpperCase();

  if (inst === 'INDEX' || inst === 'AMXIDX') return 'IDX_I';
  if (seg === 'I') return 'IDX_I';
  if (exch === 'NSE') {
    if (seg === 'E') return 'NSE_EQ';
    if (seg === 'D') return 'NSE_FNO';
    if (seg === 'C') return 'NSE_CURRENCY';
  }
  if (exch === 'BSE') {
    if (seg === 'E') return 'BSE_EQ';
    if (seg === 'D') return 'BSE_FNO';
    if (seg === 'C') return 'BSE_CURRENCY';
  }
  if (exch === 'MCX' && seg === 'M') return 'MCX_COMM';
  return null;
}

/** Parse a CSV line respecting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function dhanCsvColumnIndex(header: string[], name: string): number {
  return header.indexOf(name);
}
