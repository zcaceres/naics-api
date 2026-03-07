import { SUPPORTED_YEARS, DEFAULT_YEAR } from "./types";

export function describe() {
  return {
    operations: [
      {
        name: "codes.get",
        description: "Look up a single NAICS code",
        params: [{ name: "code", type: "string", required: true }],
        returns: "NaicsCode | null",
      },
      {
        name: "codes.batch",
        description: "Batch lookup multiple codes",
        params: [{ name: "codes", type: "string[]", required: true }],
        returns: "NaicsCode[]",
      },
      {
        name: "codes.children",
        description: "Get direct children of a NAICS code",
        params: [{ name: "code", type: "string", required: true }],
        returns: "NaicsCode[]",
      },
      {
        name: "codes.ancestors",
        description: "Get ancestor chain from a NAICS code up to its sector",
        params: [{ name: "code", type: "string", required: true }],
        returns: "NaicsCode[]",
      },
      {
        name: "codes.descendants",
        description: "Get all descendants of a NAICS code (paginated)",
        params: [
          { name: "code", type: "string", required: true },
          { name: "opts.limit", type: "number", required: false, default: 100 },
          { name: "opts.offset", type: "number", required: false, default: 0 },
        ],
        returns: "{ data: NaicsCode[]; total: number }",
      },
      {
        name: "codes.sectors",
        description: "List all 20 top-level NAICS sectors",
        params: [],
        returns: "NaicsCode[]",
      },
      {
        name: "codes.crossReferences",
        description: "Get cross-references for a NAICS code",
        params: [{ name: "code", type: "string", required: true }],
        returns: "CrossReference[]",
      },
      {
        name: "codes.indexEntries",
        description: "Get index entries (keyword synonyms) for a NAICS code",
        params: [{ name: "code", type: "string", required: true }],
        returns: "IndexEntry[]",
      },
      {
        name: "search",
        description: "Full-text search across NAICS codes, titles, descriptions, and index entries",
        params: [
          { name: "query", type: "string", required: true },
          { name: "opts.limit", type: "number", required: false, default: 20 },
          { name: "opts.offset", type: "number", required: false, default: 0 },
          { name: "opts.level", type: "number (2-6)", required: false },
        ],
        returns: "{ data: SearchResult[]; total: number }",
      },
    ],
    years: [...SUPPORTED_YEARS],
    defaultYear: DEFAULT_YEAR,
  };
}
