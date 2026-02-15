import type { Context } from "hono";
import { getDb } from "../db";
import type { NaicsCode, AppEnv } from "../types";

export function requireCode(c: Context<AppEnv>): NaicsCode | Response {
  const code = c.req.param("code");
  const db = getDb(c.get("year"));
  const result = db.getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return result;
}
