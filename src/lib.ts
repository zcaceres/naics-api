import { getDb, hasDb } from "./db";
import { describe } from "./describe";
import type { NaicsYear, NaicsCode, SearchResult, CrossReference, IndexEntry } from "./types";

export type { NaicsYear, NaicsCode, SearchResult, CrossReference, IndexEntry };
export type { PaginationMeta, NaicsDatabase } from "./db";

export interface NaicsOptions {
  year?: NaicsYear;
}

function createNaics(defaultOptions?: NaicsOptions) {
  const year = defaultOptions?.year ?? 2022;

  return {
    codes: {
      get: (code: string) => getDb(year).getCode(code),
      batch: (codes: string[]) => getDb(year).getCodesBatch(codes),
      children: (code: string) => getDb(year).getChildren(code),
      ancestors: (code: string) => getDb(year).getAncestors(code),
      descendants: (code: string, opts?: { limit?: number; offset?: number }) =>
        getDb(year).getDescendants(code, opts?.limit, opts?.offset),
      sectors: () => getDb(year).getSectors(),
      crossReferences: (code: string) => getDb(year).getCrossReferences(code),
      indexEntries: (code: string) => getDb(year).getIndexEntries(code),
    },
    search: (query: string, opts?: { limit?: number; offset?: number; level?: number }) =>
      getDb(year).search(query, opts?.limit, opts?.offset, opts?.level),
    describe,
    hasDb: () => hasDb(year),
  };
}

const naics = createNaics();

export { naics, createNaics, describe };
export default naics;
