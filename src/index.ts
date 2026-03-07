import { Hono } from "hono";
import { cors } from "hono/cors";
import codes from "./routes/codes";
import search from "./routes/search";
import spec from "./openapi.json";
import { SUPPORTED_YEARS, DEFAULT_YEAR, type AppEnv, type NaicsYear } from "./types";
import { hasDb } from "./db";

const app = new Hono<AppEnv>();

app.use("*", cors());

// Static data — cache aggressively
app.use("/api/*", async (c, next) => {
  await next();
  if (c.res.status === 200) {
    c.res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
  }
});

// Year-prefixed routes — register first so /api/2017/... matches before default
for (const year of SUPPORTED_YEARS) {
  app.use(`/api/${year}/*`, async (c, next) => {
    c.set("year", year);
    await next();
  });
  app.get(`/api/${year}/openapi.json`, (c) => c.json(spec));
  app.route(`/api/${year}`, codes);
  app.route(`/api/${year}`, search);
}

// Catch unsupported year-like segments
app.use("/api/:segment/*", async (c, next) => {
  const segment = c.req.param("segment");
  if (/^\d{4}$/.test(segment) && !SUPPORTED_YEARS.includes(Number(segment) as NaicsYear)) {
    return c.json({
      error: `Unsupported year: ${segment}. Supported years: ${SUPPORTED_YEARS.join(", ")}`
    }, 400);
  }
  await next();
});

// Default routes → year 2022
app.use("/api/*", async (c, next) => {
  if (c.get("year") === undefined) {
    c.set("year", DEFAULT_YEAR);
  }
  await next();
});

app.get("/", (c) => {
  return c.json({
    name: "NAICS Code API",
    version: "3.0.0",
    description: "Free API for NAICS (North American Industry Classification System) codes",
    source: "U.S. Census Bureau",
    supportedYears: SUPPORTED_YEARS,
    defaultYear: DEFAULT_YEAR,
    responseFormat: "All responses use { data, meta? } for success, { error } for errors",
    yearPrefixing: "All endpoints accept an optional year prefix: /api/{year}/... (e.g. /api/2017/sectors). Unprefixed routes default to 2022.",
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
      lookupByYear: "/api/2017/naics/722511",
      batchLookup: "/api/naics?codes=722511,722513,111110",
      children: "/api/naics/72/children",
      ancestors: "/api/naics/722511/ancestors",
      descendants: "/api/naics/31-33/descendants?limit=10",
      crossReferences: "/api/naics/111110/cross-references",
      indexEntries: "/api/naics/722511/index-entries",
      search: "/api/search?q=restaurant",
      searchByLevel: "/api/search?q=restaurant&level=6",
      searchByYear: "/api/2012/search?q=restaurant",
    },
  });
});

app.get("/health", (c) => {
  const databases: Record<string, boolean> = {};
  for (const year of SUPPORTED_YEARS) {
    databases[String(year)] = hasDb(year as NaicsYear);
  }
  const defaultAvailable = databases[String(DEFAULT_YEAR)];
  return c.json({ status: defaultAvailable ? "ok" : "degraded", databases }, defaultAvailable ? 200 : 503);
});

app.get("/api/openapi.json", (c) => {
  return c.json(spec);
});

app.route("/api", codes);
app.route("/api", search);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

export default {
  port: 3456,
  fetch: app.fetch,
};
