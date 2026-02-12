import { Hono } from "hono";
import { search } from "../db";

const searchRoute = new Hono();

searchRoute.get("/search", (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "Missing query parameter 'q'" }, 400);
  }

  const limit = Math.min(Number(c.req.query("limit")) || 20, 100);

  try {
    const results = search(q, limit);
    return c.json(results);
  } catch {
    return c.json([], 200);
  }
});

export default searchRoute;
