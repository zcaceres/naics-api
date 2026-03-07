export const SUPPORTED_YEARS = [2022, 2017, 2012] as const;
export type NaicsYear = (typeof SUPPORTED_YEARS)[number];
export const DEFAULT_YEAR: NaicsYear = 2022;

export type AppEnv = { Variables: { year: NaicsYear } };

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
  level: number;
  parent_code: string | null;
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
