import { test, expect, describe } from "bun:test";
import {
  parseRangeCode,
  generateRangePrefixes,
  orderByRequestedKeys,
} from "../src/transforms";

describe("parseRangeCode", () => {
  test("parses valid range 31-33", () => {
    expect(parseRangeCode("31-33")).toEqual({ start: 31, end: 33 });
  });

  test("parses valid range 44-45", () => {
    expect(parseRangeCode("44-45")).toEqual({ start: 44, end: 45 });
  });

  test("parses single-value range 11-11", () => {
    expect(parseRangeCode("11-11")).toEqual({ start: 11, end: 11 });
  });

  test("returns null for plain code", () => {
    expect(parseRangeCode("722511")).toBeNull();
  });

  test("returns null for non-numeric range", () => {
    expect(parseRangeCode("ab-cd")).toBeNull();
  });

  test("returns null for reversed range", () => {
    expect(parseRangeCode("33-31")).toBeNull();
  });

  test("returns null for triple-dash", () => {
    expect(parseRangeCode("31-32-33")).toBeNull();
  });
});

describe("generateRangePrefixes", () => {
  test("generates prefixes for 31-33", () => {
    expect(generateRangePrefixes({ start: 31, end: 33 })).toEqual(["31%", "32%", "33%"]);
  });

  test("generates single prefix for 11-11", () => {
    expect(generateRangePrefixes({ start: 11, end: 11 })).toEqual(["11%"]);
  });

  test("generates prefixes for 44-45", () => {
    expect(generateRangePrefixes({ start: 44, end: 45 })).toEqual(["44%", "45%"]);
  });
});

describe("orderByRequestedKeys", () => {
  const results = [
    { code: "111110", title: "Soybean" },
    { code: "722511", title: "Restaurant" },
    { code: "541511", title: "Software" },
  ];

  test("reorders to match requested order", () => {
    const ordered = orderByRequestedKeys(results, ["722511", "111110", "541511"]);
    expect(ordered.map((r) => r.code)).toEqual(["722511", "111110", "541511"]);
  });

  test("skips missing codes", () => {
    const ordered = orderByRequestedKeys(results, ["722511", "999999", "111110"]);
    expect(ordered.map((r) => r.code)).toEqual(["722511", "111110"]);
  });

  test("handles empty results", () => {
    expect(orderByRequestedKeys([], ["722511"])).toEqual([]);
  });

  test("handles empty requested codes", () => {
    expect(orderByRequestedKeys(results, [])).toEqual([]);
  });

  test("preserves full objects", () => {
    const ordered = orderByRequestedKeys(results, ["541511"]);
    expect(ordered).toEqual([{ code: "541511", title: "Software" }]);
  });
});
