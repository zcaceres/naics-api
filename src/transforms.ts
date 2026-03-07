export function parseRangeCode(code: string): { start: number; end: number } | null {
  if (!code.includes("-")) return null;
  const parts = code.split("-");
  if (parts.length !== 2) return null;
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start > end) return null;
  return { start, end };
}

export function generateRangePrefixes(range: { start: number; end: number }): string[] {
  const prefixes: string[] = [];
  for (let i = range.start; i <= range.end; i++) {
    prefixes.push(`${i}%`);
  }
  return prefixes;
}

export function orderByRequestedKeys<T extends { code: string }>(
  results: T[],
  requestedCodes: string[]
): T[] {
  const resultMap = new Map(results.map((r) => [r.code, r]));
  const ordered: T[] = [];
  for (const code of requestedCodes) {
    const found = resultMap.get(code);
    if (found) ordered.push(found);
  }
  return ordered;
}
