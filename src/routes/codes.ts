import { Hono } from "hono";
import { getCode, getChildren, getAncestors, getDescendants, getSectors, getCrossReferences } from "../db";

const codes = new Hono();

codes.get("/sectors", (c) => {
  return c.json({ data: getSectors() });
});

codes.get("/naics/:code", (c) => {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json({ data: result });
});

codes.get("/naics/:code/children", (c) => {
  const code = c.req.param("code");
  const parent = getCode(code);
  if (!parent) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json({ data: getChildren(code) });
});

codes.get("/naics/:code/ancestors", (c) => {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json({ data: getAncestors(code) });
});

codes.get("/naics/:code/descendants", (c) => {
  const code = c.req.param("code");
  const parent = getCode(code);
  if (!parent) {
    return c.json({ error: "Code not found" }, 404);
  }

  const limit = Math.max(1, Math.min(Number(c.req.query("limit")) || 100, 500));
  const offset = Math.max(0, Number(c.req.query("offset")) || 0);

  const { data, total } = getDescendants(code, limit, offset);
  return c.json({ data, meta: { total, limit, offset } });
});

codes.get("/naics/:code/cross-references", (c) => {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json({ data: getCrossReferences(code) });
});

export default codes;
