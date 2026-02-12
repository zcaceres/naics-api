import { Hono } from "hono";
import { search } from "../db";

const searchRoute = new Hono();

searchRoute.get("/search", (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "Missing query parameter 'q'" }, 400);
  }

  const limit = Math.max(1, Math.min(Number(c.req.query("limit")) || 20, 100));
  const offset = Math.max(0, Number(c.req.query("offset")) || 0);

  const levelParam = c.req.query("level");
  let level: number | undefined;
  if (levelParam !== undefined) {
    level = Number(levelParam);
    if (!Number.isInteger(level) || level < 2 || level > 6) {
      return c.json({ error: "Invalid level: must be an integer between 2 and 6" }, 400);
    }
  }

  try {
    const { data, total } = search(q, limit, offset, level);
    return c.json({ data, meta: { total, limit, offset } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("fts5:") || msg.includes("syntax error") || msg.includes("unterminated string") || msg.includes("no such column")) {
      return c.json({ error: "Invalid search syntax" }, 400);
    }
    console.error("Search error:", error);
    return c.json({ error: "Search failed" }, 500);
  }
});

export default searchRoute;
