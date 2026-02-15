import { test, expect, describe } from "bun:test";
import {
  parseRangeCode,
  generateRangePrefixes,
  filterRangeCodes,
  paginateArray,
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

describe("filterRangeCodes", () => {
  test("removes codes with hyphens", () => {
    const input = [
      { code: "31", title: "a" },
      { code: "31-33", title: "b" },
      { code: "311", title: "c" },
    ];
    expect(filterRangeCodes(input)).toEqual([
      { code: "31", title: "a" },
      { code: "311", title: "c" },
    ]);
  });

  test("returns empty for all hyphenated", () => {
    const input = [{ code: "31-33" }, { code: "44-45" }];
    expect(filterRangeCodes(input as any)).toEqual([]);
  });

  test("returns all if none hyphenated", () => {
    const input = [{ code: "31" }, { code: "311" }];
    expect(filterRangeCodes(input as any)).toEqual(input);
  });

  test("handles empty array", () => {
    expect(filterRangeCodes([])).toEqual([]);
  });
});

describe("paginateArray", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  test("basic pagination", () => {
    expect(paginateArray(items, 0, 3)).toEqual([1, 2, 3]);
  });

  test("with offset", () => {
    expect(paginateArray(items, 3, 3)).toEqual([4, 5, 6]);
  });

  test("offset past end returns empty", () => {
    expect(paginateArray(items, 20, 5)).toEqual([]);
  });

  test("limit exceeding remaining items", () => {
    expect(paginateArray(items, 8, 5)).toEqual([9, 10]);
  });

  test("empty array", () => {
    expect(paginateArray([], 0, 10)).toEqual([]);
  });

  test("offset 0, limit covers all", () => {
    expect(paginateArray(items, 0, 100)).toEqual(items);
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
