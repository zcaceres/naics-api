import { Hono } from "hono";
import { getCode, getChildren, getAncestors, getDescendants, getSectors } from "../db";

const codes = new Hono();

codes.get("/sectors", (c) => {
  return c.json(getSectors());
});

codes.get("/naics/:code", (c) => {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json(result);
});

codes.get("/naics/:code/children", (c) => {
  const code = c.req.param("code");
  const parent = getCode(code);
  if (!parent) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json(getChildren(code));
});

codes.get("/naics/:code/ancestors", (c) => {
  const code = c.req.param("code");
  const result = getCode(code);
  if (!result) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json(getAncestors(code));
});

codes.get("/naics/:code/descendants", (c) => {
  const code = c.req.param("code");
  const parent = getCode(code);
  if (!parent) {
    return c.json({ error: "Code not found" }, 404);
  }
  return c.json(getDescendants(code));
});

export default codes;
