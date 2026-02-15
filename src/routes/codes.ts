import { Hono } from "hono";
import type { Context, Next } from "hono";
import { getDb } from "../db";
import type { AppEnv } from "../types";
import { isValidNaicsFormat, parsePagination, parseCodesList } from "../params";
import { requireCode } from "./helpers";

const codes = new Hono<AppEnv>();

const validateCode = async (c: Context<AppEnv>, next: Next) => {
  const code = c.req.param("code");
  if (!isValidNaicsFormat(code)) {
    return c.json({ error: "Invalid NAICS code format" }, 400);
  }
  await next();
};

codes.use("/naics/:code", validateCode);
codes.use("/naics/:code/*", validateCode);

codes.get("/sectors", (c) => {
  const db = getDb(c.get("year"));
  return c.json({ data: db.getSectors() });
});

codes.get("/naics", (c) => {
  const result = parseCodesList(c.req.query("codes"));
  if (!result.ok) {
    return c.json({ error: result.error }, 400);
  }
  const db = getDb(c.get("year"));
  return c.json({ data: db.getCodesBatch(result.codes) });
});

codes.get("/naics/:code", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  return c.json({ data: result });
});

codes.get("/naics/:code/children", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  const db = getDb(c.get("year"));
  return c.json({ data: db.getChildren(result.code) });
});

codes.get("/naics/:code/ancestors", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  const db = getDb(c.get("year"));
  return c.json({ data: db.getAncestors(result.code) });
});

codes.get("/naics/:code/descendants", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;

  const pagination = parsePagination(c.req.query("limit"), c.req.query("offset"), {
    defaultLimit: 100,
    maxLimit: 500,
  });
  if (!pagination.ok) {
    return c.json({ error: pagination.error }, 400);
  }
  const { limit, offset } = pagination;

  try {
    const db = getDb(c.get("year"));
    const { data, total } = db.getDescendants(result.code, limit, offset);
    return c.json({ data, meta: { total, limit, offset } });
  } catch (error) {
    console.error("Descendants error:", error);
    return c.json({ error: "Failed to fetch descendants" }, 500);
  }
});

codes.get("/naics/:code/cross-references", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  const db = getDb(c.get("year"));
  return c.json({ data: db.getCrossReferences(result.code) });
});

codes.get("/naics/:code/index-entries", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  const db = getDb(c.get("year"));
  return c.json({ data: db.getIndexEntries(result.code) });
});

export default codes;
