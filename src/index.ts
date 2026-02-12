import { Hono } from "hono";
import { cors } from "hono/cors";
import codes from "./routes/codes";
import search from "./routes/search";
import spec from "./openapi.json";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    name: "NAICS Code API",
    version: "2.1.0",
    description: "Free API for 2022 NAICS (North American Industry Classification System) codes",
    source: "U.S. Census Bureau",
    responseFormat: "All responses use { data, meta? } for success, { error } for errors",
    endpoints: {
      "GET /api/sectors": "List all 20 top-level NAICS sectors",
      "GET /api/naics?codes=:code1,:code2,...": "Batch lookup multiple NAICS codes (max 50)",
      "GET /api/naics/:code": "Look up a specific NAICS code",
      "GET /api/naics/:code/children": "Get direct children of a code",
      "GET /api/naics/:code/ancestors": "Get full ancestor chain up to sector",
      "GET /api/naics/:code/descendants?limit=100&offset=0": "Get all codes below a given code (paginated, max 500)",
      "GET /api/naics/:code/cross-references": "Get cross-references for a code",
      "GET /api/naics/:code/index-entries": "Get index entries (keyword synonyms) for a code",
      "GET /api/search?q=:query&limit=20&offset=0&level=:level": "Full-text search with BM25 ranking (paginated, max 100, optional level filter 2-6)",
      "GET /api/openapi.json": "OpenAPI 3.0 specification",
    },
    examples: {
      lookup: "/api/naics/722511",
      batchLookup: "/api/naics?codes=722511,722513,111110",
      children: "/api/naics/72/children",
      ancestors: "/api/naics/722511/ancestors",
      descendants: "/api/naics/31-33/descendants?limit=10",
      crossReferences: "/api/naics/111110/cross-references",
      indexEntries: "/api/naics/722511/index-entries",
      search: "/api/search?q=restaurant",
      searchByLevel: "/api/search?q=restaurant&level=6",
    },
  });
});

app.get("/api/openapi.json", (c) => {
  return c.json(spec);
});

app.route("/api", codes);
app.route("/api", search);

export default {
  port: 3456,
  fetch: app.fetch,
};
