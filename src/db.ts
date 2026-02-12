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

const stmts = {
  getCode: db.prepare<NaicsCode, [string]>(
    "SELECT code, title, description, level, parent_code FROM codes WHERE code = ?"
  ),
  getChildren: db.prepare<NaicsCode, [string]>(
    "SELECT code, title, description, level, parent_code FROM codes WHERE parent_code = ? ORDER BY code"
  ),
  getDescendants: db.prepare<NaicsCode, [string, string]>(
    `SELECT code, title, description, level, parent_code FROM codes
     WHERE code LIKE ? AND code != ?
     ORDER BY code`
  ),
  getSectors: db.prepare<NaicsCode, []>(
    "SELECT code, title, description, level, parent_code FROM codes WHERE parent_code IS NULL ORDER BY code"
  ),
  search: db.prepare<SearchResult, [string, number]>(
    `SELECT code, title, description, rank
     FROM codes_fts
     WHERE codes_fts MATCH ?
     ORDER BY rank
     LIMIT ?`
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

export function getDescendants(code: string): NaicsCode[] {
  // For range codes like "31-33", we need to match multiple prefixes
  if (code.includes("-")) {
    const [start, end] = code.split("-").map(Number);
    const results: NaicsCode[] = [];
    for (let i = start; i <= end; i++) {
      const prefix = `${i}%`;
      const rows = stmts.getDescendants.all(prefix, code);
      results.push(...rows.filter((r) => !r.code.includes("-")));
    }
    return results;
  }

  return stmts.getDescendants.all(`${code}%`, code);
}

export function search(query: string, limit: number = 20): SearchResult[] {
  return stmts.search.all(query, limit);
}

export function getSectors(): NaicsCode[] {
  return stmts.getSectors.all();
}
