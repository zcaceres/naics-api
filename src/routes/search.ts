import { Hono } from "hono";
import { getDb, hasDb } from "../db";
import type { AppEnv } from "../types";
import { parsePagination, parseLevel, classifySearchError } from "../params";

const searchRoute = new Hono<AppEnv>();

searchRoute.use("*", async (c, next) => {
  const year = c.get("year");
  if (year && !hasDb(year)) {
    return c.json(
      { error: `Data for year ${year} is not available. Build it with: bun run build-db ${year}` },
      404
    );
  }
  await next();
});

searchRoute.get("/search", (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "Missing query parameter 'q'" }, 400);
  }

  const pagination = parsePagination(c.req.query("limit"), c.req.query("offset"), {
    defaultLimit: 20,
    maxLimit: 100,
  });
  if (!pagination.ok) {
    return c.json({ error: pagination.error }, 400);
  }
  const { limit, offset } = pagination;

  const levelResult = parseLevel(c.req.query("level"));
  if (!levelResult.ok) {
    return c.json({ error: levelResult.error }, 400);
  }

  try {
    const db = getDb(c.get("year"));
    const { data, total } = db.search(q, limit, offset, levelResult.value);
    return c.json({ data, meta: { total, limit, offset } });
  } catch (error) {
    if (classifySearchError(error) === "invalid_syntax") {
      return c.json({ error: "Invalid search syntax" }, 400);
    }
    console.error("Search error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

export default searchRoute;
