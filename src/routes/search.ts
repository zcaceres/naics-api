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

  try {
    const { data, total } = search(q, limit, offset);
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
