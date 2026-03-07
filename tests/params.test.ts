import { test, expect, describe } from "bun:test";
import {
  isValidNaicsFormat,
  parsePagination,
  parseLevel,
  parseCodesList,
  classifySearchError,
} from "../src/params";

describe("isValidNaicsFormat", () => {
  test("accepts 2-digit codes", () => {
    expect(isValidNaicsFormat("72")).toBe(true);
  });

  test("accepts 3-digit codes", () => {
    expect(isValidNaicsFormat("722")).toBe(true);
  });

  test("accepts 4-digit codes", () => {
    expect(isValidNaicsFormat("7225")).toBe(true);
  });

  test("accepts 5-digit codes", () => {
    expect(isValidNaicsFormat("72251")).toBe(true);
  });

  test("accepts 6-digit codes", () => {
    expect(isValidNaicsFormat("722511")).toBe(true);
  });

  test("accepts range codes", () => {
    expect(isValidNaicsFormat("31-33")).toBe(true);
    expect(isValidNaicsFormat("44-45")).toBe(true);
  });

  test("rejects single digit", () => {
    expect(isValidNaicsFormat("7")).toBe(false);
  });

  test("rejects 7+ digits", () => {
    expect(isValidNaicsFormat("7225111")).toBe(false);
  });

  test("rejects letters", () => {
    expect(isValidNaicsFormat("abc")).toBe(false);
    expect(isValidNaicsFormat("72a")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidNaicsFormat("")).toBe(false);
  });

  test("rejects special characters", () => {
    expect(isValidNaicsFormat("72!")).toBe(false);
  });

  test("rejects malformed range", () => {
    expect(isValidNaicsFormat("31-")).toBe(false);
    expect(isValidNaicsFormat("-33")).toBe(false);
    expect(isValidNaicsFormat("312-334")).toBe(false);
  });
});

describe("parsePagination", () => {
  const defaults = { defaultLimit: 100, maxLimit: 500 };

  test("uses defaults when no params given", () => {
    expect(parsePagination(undefined, undefined, defaults)).toEqual({
      ok: true,
      limit: 100,
      offset: 0,
    });
  });

  test("parses valid limit and offset", () => {
    expect(parsePagination("50", "10", defaults)).toEqual({
      ok: true,
      limit: 50,
      offset: 10,
    });
  });

  test("clamps limit to max", () => {
    expect(parsePagination("1000", "0", defaults)).toEqual({
      ok: true,
      limit: 500,
      offset: 0,
    });
  });

  test("rejects limit of 0", () => {
    expect(parsePagination("0", "0", defaults)).toEqual({
      ok: false,
      error: "Invalid 'limit': must be at least 1",
    });
  });

  test("rejects negative limit", () => {
    expect(parsePagination("-5", "0", defaults)).toEqual({
      ok: false,
      error: "Invalid 'limit': must be at least 1",
    });
  });

  test("rejects negative offset", () => {
    expect(parsePagination("10", "-5", defaults)).toEqual({
      ok: false,
      error: "Invalid 'offset': must be non-negative",
    });
  });

  test("rejects non-integer values", () => {
    expect(parsePagination("abc", "0", defaults)).toEqual({
      ok: false,
      error: "Invalid 'limit': must be an integer",
    });
    expect(parsePagination("1.5", "0", defaults)).toEqual({
      ok: false,
      error: "Invalid 'limit': must be an integer",
    });
    expect(parsePagination("10", "xyz", defaults)).toEqual({
      ok: false,
      error: "Invalid 'offset': must be an integer",
    });
    expect(parsePagination("10", "1.5", defaults)).toEqual({
      ok: false,
      error: "Invalid 'offset': must be an integer",
    });
  });

  test("works with different defaults", () => {
    expect(parsePagination(undefined, undefined, { defaultLimit: 20, maxLimit: 100 })).toEqual({
      ok: true,
      limit: 20,
      offset: 0,
    });
  });
});

describe("parseLevel", () => {
  test("returns undefined for no level param", () => {
    expect(parseLevel(undefined)).toEqual({ ok: true, value: undefined });
  });

  test("accepts valid levels 2-6", () => {
    for (const l of [2, 3, 4, 5, 6]) {
      expect(parseLevel(String(l))).toEqual({ ok: true, value: l });
    }
  });

  test("rejects level 1", () => {
    const result = parseLevel("1");
    expect(result.ok).toBe(false);
  });

  test("rejects level 7", () => {
    const result = parseLevel("7");
    expect(result.ok).toBe(false);
  });

  test("rejects level 0", () => {
    const result = parseLevel("0");
    expect(result.ok).toBe(false);
  });

  test("rejects level 9", () => {
    const result = parseLevel("9");
    expect(result.ok).toBe(false);
  });

  test("rejects floats", () => {
    const result = parseLevel("3.5");
    expect(result.ok).toBe(false);
  });

  test("rejects non-numeric", () => {
    const result = parseLevel("abc");
    expect(result.ok).toBe(false);
  });

  test("rejects negative", () => {
    const result = parseLevel("-1");
    expect(result.ok).toBe(false);
  });
});

describe("parseCodesList", () => {
  test("parses comma-separated codes", () => {
    const result = parseCodesList("722511,111110");
    expect(result).toEqual({ ok: true, codes: ["722511", "111110"] });
  });

  test("trims whitespace", () => {
    const result = parseCodesList(" 722511 , 111110 ");
    expect(result).toEqual({ ok: true, codes: ["722511", "111110"] });
  });

  test("deduplicates codes", () => {
    const result = parseCodesList("722511,722511,111110");
    expect(result).toEqual({ ok: true, codes: ["722511", "111110"] });
  });

  test("accepts range codes", () => {
    const result = parseCodesList("31-33,44-45");
    expect(result).toEqual({ ok: true, codes: ["31-33", "44-45"] });
  });

  test("rejects undefined", () => {
    const result = parseCodesList(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Missing");
  });

  test("rejects empty string", () => {
    const result = parseCodesList("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Missing");
  });

  test("rejects only commas/spaces", () => {
    const result = parseCodesList(", , ,");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("No codes");
  });

  test("rejects invalid format codes", () => {
    const result = parseCodesList("722511,abc");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Invalid NAICS code format");
  });

  test("rejects too many codes", () => {
    const codes = Array.from({ length: 51 }, (_, i) => String(100000 + i)).join(",");
    const result = parseCodesList(codes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Maximum 50");
  });

  test("respects custom max", () => {
    const result = parseCodesList("722511,111110,722513", 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Maximum 2");
  });
});

describe("classifySearchError", () => {
  test("classifies fts5 errors as invalid_syntax", () => {
    expect(classifySearchError(new Error("fts5: syntax error"))).toBe("invalid_syntax");
  });

  test("classifies syntax error as invalid_syntax", () => {
    expect(classifySearchError(new Error("syntax error near )"))).toBe("invalid_syntax");
  });

  test("classifies unterminated string as invalid_syntax", () => {
    expect(classifySearchError(new Error("unterminated string"))).toBe("invalid_syntax");
  });

  test("classifies no such column as invalid_syntax", () => {
    expect(classifySearchError(new Error("no such column: foo"))).toBe("invalid_syntax");
  });

  test("classifies unknown errors as server_error", () => {
    expect(classifySearchError(new Error("connection refused"))).toBe("server_error");
  });

  test("handles non-Error values", () => {
    expect(classifySearchError("fts5: bad query")).toBe("invalid_syntax");
    expect(classifySearchError("random string")).toBe("server_error");
    expect(classifySearchError(42)).toBe("server_error");
  });
});
