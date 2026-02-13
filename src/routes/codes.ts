import { Hono } from "hono";
import type { Context, Next } from "hono";
import { getChildren, getAncestors, getDescendants, getSectors, getCrossReferences, getIndexEntries, getCodesBatch } from "../db";
import { isValidNaicsFormat, parsePagination, parseCodesList } from "../params";
import { requireCode } from "./helpers";

const codes = new Hono();

const validateCode = async (c: Context, next: Next) => {
  const code = c.req.param("code");
  if (!isValidNaicsFormat(code)) {
    return c.json({ error: "Invalid NAICS code format" }, 400);
  }
  await next();
};

codes.use("/naics/:code", validateCode);
codes.use("/naics/:code/*", validateCode);

codes.get("/sectors", (c) => {
  return c.json({ data: getSectors() });
});

codes.get("/naics", (c) => {
  const result = parseCodesList(c.req.query("codes"));
  if (!result.ok) {
    return c.json({ error: result.error }, 400);
  }
  return c.json({ data: getCodesBatch(result.codes) });
});

codes.get("/naics/:code", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  return c.json({ data: result });
});

codes.get("/naics/:code/children", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  return c.json({ data: getChildren(result.code) });
});

codes.get("/naics/:code/ancestors", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  return c.json({ data: getAncestors(result.code) });
});

codes.get("/naics/:code/descendants", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;

  const { limit, offset } = parsePagination(c.req.query("limit"), c.req.query("offset"), {
    defaultLimit: 100,
    maxLimit: 500,
  });

  const { data, total } = getDescendants(result.code, limit, offset);
  return c.json({ data, meta: { total, limit, offset } });
});

codes.get("/naics/:code/cross-references", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  return c.json({ data: getCrossReferences(result.code) });
});

codes.get("/naics/:code/index-entries", (c) => {
  const result = requireCode(c);
  if (result instanceof Response) return result;
  return c.json({ data: getIndexEntries(result.code) });
});

export default codes;
