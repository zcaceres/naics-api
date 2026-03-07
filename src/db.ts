import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync } from "fs";
import { parseRangeCode, generateRangePrefixes, orderByRequestedKeys } from "./transforms";
import { SUPPORTED_YEARS, DEFAULT_YEAR, type NaicsYear, type NaicsCode, type SearchResult, type CrossReference, type IndexEntry } from "./types";

export type { NaicsCode, SearchResult, CrossReference, IndexEntry } from "./types";
export type { PaginationMeta } from "./types";

export interface NaicsDatabase {
  getCode(code: string): NaicsCode | null;
  getChildren(code: string): NaicsCode[];
  getAncestors(code: string): NaicsCode[];
  getDescendants(code: string, limit?: number, offset?: number): { data: NaicsCode[]; total: number };
  search(query: string, limit?: number, offset?: number, level?: number): { data: SearchResult[]; total: number };
  getSectors(): NaicsCode[];
  getCrossReferences(code: string): CrossReference[];
  getIndexEntries(code: string): IndexEntry[];
  getCodesBatch(codes: string[]): NaicsCode[];
}

function createDatabase(dbPath: string): NaicsDatabase {
  const db = new Database(dbPath, { readonly: true });

  const stmts = {
    getCode: db.prepare<NaicsCode, [string]>(
      "SELECT code, title, NULLIF(description, 'NULL') as description, level, parent_code FROM codes WHERE code = ?"
    ),
    getChildren: db.prepare<NaicsCode, [string]>(
      "SELECT code, title, NULLIF(description, 'NULL') as description, level, parent_code FROM codes WHERE parent_code = ? ORDER BY code"
    ),
    getDescendants: db.prepare<NaicsCode, [string, string, number, number]>(
      `SELECT code, title, NULLIF(description, 'NULL') as description, level, parent_code FROM codes
       WHERE code LIKE ? AND code != ?
       ORDER BY code
       LIMIT ? OFFSET ?`
    ),
    countDescendants: db.prepare<{ count: number }, [string, string]>(
      `SELECT COUNT(*) as count FROM codes
       WHERE code LIKE ? AND code != ?`
    ),
    getSectors: db.prepare<NaicsCode, []>(
      "SELECT code, title, NULLIF(description, 'NULL') as description, level, parent_code FROM codes WHERE parent_code IS NULL ORDER BY code"
    ),
    search: db.prepare<SearchResult, [string, number, number]>(
      `SELECT f.code, f.title, NULLIF(f.description, 'NULL') as description,
              (-1 * bm25(codes_fts, 0.0, 10.0, 1.0, 5.0)) as rank,
              c.level, c.parent_code
       FROM codes_fts f
       JOIN codes c ON c.code = f.code
       WHERE codes_fts MATCH ?
       ORDER BY bm25(codes_fts, 0.0, 10.0, 1.0, 5.0)
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
      `SELECT f.code, f.title, NULLIF(f.description, 'NULL') as description,
              (-1 * bm25(codes_fts, 0.0, 10.0, 1.0, 5.0)) as rank,
              c.level, c.parent_code
       FROM codes_fts f
       JOIN codes c ON c.code = f.code
       WHERE codes_fts MATCH ?
       AND c.level = ?
       ORDER BY bm25(codes_fts, 0.0, 10.0, 1.0, 5.0)
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

  function getCode(code: string): NaicsCode | null {
    return stmts.getCode.get(code) ?? null;
  }

  function getChildren(code: string): NaicsCode[] {
    return stmts.getChildren.all(code);
  }

  function getAncestors(code: string): NaicsCode[] {
    const ancestors: NaicsCode[] = [];
    let current = getCode(code);
    while (current) {
      ancestors.push(current);
      if (!current.parent_code) break;
      current = getCode(current.parent_code);
    }
    return ancestors;
  }

  function getDescendants(
    code: string,
    limit: number = 100,
    offset: number = 0
  ): { data: NaicsCode[]; total: number } {
    const range = parseRangeCode(code);
    if (range) {
      const prefixes = generateRangePrefixes(range);
      const likeClauses = prefixes.map(() => "code LIKE ?").join(" OR ");
      const likeParams = prefixes;

      const countStmt = db.prepare<{ count: number }, string[]>(
        `SELECT COUNT(*) as count FROM codes WHERE (${likeClauses}) AND code != ? AND code NOT LIKE '%-%'`
      );
      const total = countStmt.get(...likeParams, code)?.count ?? 0;

      const dataStmt = db.prepare<NaicsCode, string[]>(
        `SELECT code, title, NULLIF(description, 'NULL') as description, level, parent_code FROM codes
         WHERE (${likeClauses}) AND code != ? AND code NOT LIKE '%-%'
         ORDER BY code
         LIMIT ? OFFSET ?`
      );
      const data = dataStmt.all(...likeParams, code, String(limit), String(offset));
      return { data, total };
    }

    const countRow = stmts.countDescendants.get(`${code}%`, code);
    const total = countRow?.count ?? 0;
    const data = stmts.getDescendants.all(`${code}%`, code, limit, offset);
    return { data, total };
  }

  function search(
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

  function getSectors(): NaicsCode[] {
    return stmts.getSectors.all();
  }

  function getCrossReferences(code: string): CrossReference[] {
    return stmts.getCrossReferences.all(code);
  }

  function getIndexEntries(code: string): IndexEntry[] {
    return stmts.getIndexEntries.all(code);
  }

  function getCodesBatch(codes: string[]): NaicsCode[] {
    if (codes.length === 0) return [];
    const placeholders = codes.map(() => "?").join(",");
    const stmt = db.prepare<NaicsCode, string[]>(
      `SELECT code, title, NULLIF(description, 'NULL') as description, level, parent_code FROM codes WHERE code IN (${placeholders})`
    );
    const results = stmt.all(...codes);
    return orderByRequestedKeys(results, codes);
  }

  return {
    getCode,
    getChildren,
    getAncestors,
    getDescendants,
    search,
    getSectors,
    getCrossReferences,
    getIndexEntries,
    getCodesBatch,
  };
}

const DATA_DIR = process.env.NAICS_DATA_DIR
  ?? (existsSync(join(import.meta.dir, "..", "data"))
    ? join(import.meta.dir, "..", "data")
    : join(process.env.HOME ?? "~", ".naics", "data"));
const databases = new Map<NaicsYear, NaicsDatabase>();

for (const year of SUPPORTED_YEARS) {
  const dbPath = join(DATA_DIR, `naics-${year}.db`);
  if (existsSync(dbPath)) {
    databases.set(year, createDatabase(dbPath));
  }
}

// Fallback: support legacy naics.db as the 2022 database
if (!databases.has(2022)) {
  const legacyPath = join(DATA_DIR, "naics.db");
  if (existsSync(legacyPath)) {
    databases.set(2022, createDatabase(legacyPath));
  }
}

export function hasDb(year: NaicsYear): boolean {
  return databases.has(year);
}

export function getDb(year: NaicsYear = DEFAULT_YEAR): NaicsDatabase {
  const db = databases.get(year);
  if (!db) {
    throw new Error(`Database for year ${year} is not available. Run: bun run build-db ${year}`);
  }
  return db;
}
