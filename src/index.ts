import { Hono } from "hono";
import { cors } from "hono/cors";
import codes from "./routes/codes";
import search from "./routes/search";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({
    name: "NAICS Code API",
    version: "1.0.0",
    description: "Free API for 2022 NAICS (North American Industry Classification System) codes",
    source: "U.S. Census Bureau",
    endpoints: {
      "GET /api/sectors": "List all 20 top-level NAICS sectors",
      "GET /api/naics/:code": "Look up a specific NAICS code",
      "GET /api/naics/:code/children": "Get direct children of a code",
      "GET /api/naics/:code/ancestors": "Get full ancestor chain up to sector",
      "GET /api/naics/:code/descendants": "Get all codes below a given code",
      "GET /api/search?q=:query&limit=:n": "Full-text search with BM25 ranking (limit default 20, max 100)",
    },
    examples: {
      lookup: "/api/naics/722511",
      children: "/api/naics/72/children",
      ancestors: "/api/naics/722511/ancestors",
      search: "/api/search?q=restaurant",
    },
  });
});

app.route("/api", codes);
app.route("/api", search);

export default {
  port: 3456,
  fetch: app.fetch,
};
