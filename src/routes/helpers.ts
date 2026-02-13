import type { Context } from "hono";
import { getCode, type NaicsCode } from "../db";

export function requireCode(c: Context): NaicsCode | Response {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return result;
}
