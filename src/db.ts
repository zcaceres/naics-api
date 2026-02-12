import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "..", "data", "naics.db");

const db = new Database(DB_PATH, { readonly: true });
db.exec("PRAGMA journal_mode = WAL");

export interface NaicsCode {
  code: string;
  title: string;
  description: string | null;
  level: number;
  parent_code: string | null;
}

export interface SearchResult {
  code: string;
  title: string;
  description: string | null;
  rank: number;
}

export interface CrossReference {
  id: number;
  code: string;
  description: string;
}

export interface IndexEntry {
  id: number;
  code: string;
  entry: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

const stmts = {
  getCode: db.prepare<NaicsCode, [string]>(
    "SELECT code, title, description, level, parent_code FROM codes WHERE code = ?"
  ),
  getChildren: db.prepare<NaicsCode, [string]>(
    "SELECT code, title, description, level, parent_code FROM codes WHERE parent_code = ? ORDER BY code"
  ),
  getDescendants: db.prepare<NaicsCode, [string, string, number, number]>(
    `SELECT code, title, description, level, parent_code FROM codes
     WHERE code LIKE ? AND code != ?
     ORDER BY code
     LIMIT ? OFFSET ?`
  ),
  countDescendants: db.prepare<{ count: number }, [string, string]>(
    `SELECT COUNT(*) as count FROM codes
     WHERE code LIKE ? AND code != ?`
  ),
  getSectors: db.prepare<NaicsCode, []>(
    "SELECT code, title, description, level, parent_code FROM codes WHERE parent_code IS NULL ORDER BY code"
  ),
  search: db.prepare<SearchResult, [string, number, number]>(
    `SELECT code, title, description, bm25(codes_fts, 0.0, 10.0, 1.0, 5.0) as rank
     FROM codes_fts
     WHERE codes_fts MATCH ?
     ORDER BY rank
     LIMIT ? OFFSET ?`
  ),
  countSearch: db.prepare<{ count: number }, [string]>(
    "SELECT COUNT(*) as count FROM codes_fts WHERE codes_fts MATCH ?"
  ),
  getCrossReferences: db.prepare<CrossReference, [string]>(
    "SELECT id, code, description FROM cross_references WHERE code = ? ORDER BY id"
  ),
  getIndexEntries: db.prepare<IndexEntry, [string]>(
    "SELECT id, code, entry FROM index_entries WHERE code = ? ORDER BY id"
  ),
  searchByLevel: db.prepare<SearchResult, [string, number, number, number]>(
    `SELECT f.code, f.title, f.description, bm25(codes_fts, 0.0, 10.0, 1.0, 5.0) as rank
     FROM codes_fts f
     JOIN codes c ON c.code = f.code
     WHERE codes_fts MATCH ?
     AND c.level = ?
     ORDER BY rank
     LIMIT ? OFFSET ?`
  ),
  countSearchByLevel: db.prepare<{ count: number }, [string, number]>(
    `SELECT COUNT(*) as count
     FROM codes_fts f
     JOIN codes c ON c.code = f.code
     WHERE codes_fts MATCH ?
     AND c.level = ?`
  ),
};

export function getCode(code: string): NaicsCode | null {
  return stmts.getCode.get(code) ?? null;
}

export function getChildren(code: string): NaicsCode[] {
  return stmts.getChildren.all(code);
}

export function getAncestors(code: string): NaicsCode[] {
  const ancestors: NaicsCode[] = [];
  let current = getCode(code);
  while (current) {
    ancestors.push(current);
    if (!current.parent_code) break;
    current = getCode(current.parent_code);
  }
  return ancestors;
}

export function getDescendants(
  code: string,
  limit: number = 100,
  offset: number = 0
): { data: NaicsCode[]; total: number } {
  // For range codes like "31-33", we need to match multiple prefixes
  if (code.includes("-")) {
    const [start, end] = code.split("-").map(Number);
    let total = 0;
    const allResults: NaicsCode[] = [];
    for (let i = start; i <= end; i++) {
      const prefix = `${i}%`;
      const countRow = stmts.countDescendants.get(prefix, code);
      total += countRow?.count ?? 0;
    }
    // Collect all matching rows then filter range codes, apply offset/limit manually
    for (let i = start; i <= end; i++) {
      const prefix = `${i}%`;
      const rows = stmts.getDescendants.all(prefix, code, total, 0);
      allResults.push(...rows.filter((r) => !r.code.includes("-")));
    }
    total = allResults.length;
    return { data: allResults.slice(offset, offset + limit), total };
  }

  const countRow = stmts.countDescendants.get(`${code}%`, code);
  const total = countRow?.count ?? 0;
  const data = stmts.getDescendants.all(`${code}%`, code, limit, offset);
  return { data, total };
}

export function search(
  query: string,
  limit: number = 20,
  offset: number = 0,
  level?: number
): { data: SearchResult[]; total: number } {
  let data: SearchResult[];
  let total: number;

  if (level !== undefined) {
    data = stmts.searchByLevel.all(query, level, limit, offset);
    total = stmts.countSearchByLevel.get(query, level)?.count ?? 0;
  } else {
    data = stmts.search.all(query, limit, offset);
    total = stmts.countSearch.get(query)?.count ?? 0;
  }

  return { data, total };
}

export function getSectors(): NaicsCode[] {
  return stmts.getSectors.all();
}

export function getCrossReferences(code: string): CrossReference[] {
  return stmts.getCrossReferences.all(code);
}

export function getIndexEntries(code: string): IndexEntry[] {
  return stmts.getIndexEntries.all(code);
}

export function getCodesBatch(codes: string[]): NaicsCode[] {
  if (codes.length === 0) return [];
  const placeholders = codes.map(() => "?").join(",");
  const stmt = db.prepare<NaicsCode, string[]>(
    `SELECT code, title, description, level, parent_code FROM codes WHERE code IN (${placeholders})`
  );
  const results = stmt.all(...codes);
  const resultMap = new Map(results.map((r) => [r.code, r]));
  const ordered: NaicsCode[] = [];
  for (const code of codes) {
    const found = resultMap.get(code);
    if (found) ordered.push(found);
  }
  return ordered;
}
