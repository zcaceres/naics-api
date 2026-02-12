import { Hono } from "hono";
import type { Context, Next } from "hono";
import { getCode, getChildren, getAncestors, getDescendants, getSectors, getCrossReferences, getIndexEntries, getCodesBatch } from "../db";
import { isValidNaicsFormat } from "../validation";

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
  const codesParam = c.req.query("codes");
  if (!codesParam) {
    return c.json({ error: "Missing query parameter 'codes'" }, 400);
  }

  const codeList = codesParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (codeList.length === 0) {
    return c.json({ error: "No codes provided" }, 400);
  }

  if (codeList.length > 50) {
    return c.json({ error: "Maximum 50 codes per request" }, 400);
  }

  const invalid = codeList.filter((code) => !isValidNaicsFormat(code));
  if (invalid.length > 0) {
    return c.json({ error: `Invalid NAICS code format: ${invalid.join(", ")}` }, 400);
  }

  const uniqueCodes = [...new Set(codeList)];
  return c.json({ data: getCodesBatch(uniqueCodes) });
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

codes.get("/naics/:code/index-entries", (c) => {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json({ data: getIndexEntries(code) });
});

export default codes;
