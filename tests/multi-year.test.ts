import { test, expect, describe } from "bun:test";
import app from "../src/index";

const fetch = app.fetch;

async function get(path: string) {
  const url = `http://localhost${path}`;
  const res = await fetch(new Request(url));
  const body = await res.json();
  return { status: res.status, body, headers: res.headers };
}

describe("Year-prefixed routes (2022)", () => {
  test("GET /api/2022/sectors returns 200", async () => {
    const { status, body } = await get("/api/2022/sectors");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(20);
  });

  test("GET /api/2022/naics/722511 returns same data as default", async () => {
    const defaultRes = await get("/api/naics/722511");
    const yearRes = await get("/api/2022/naics/722511");
    expect(yearRes.status).toBe(200);
    expect(yearRes.body.data.code).toBe("722511");
    expect(yearRes.body.data).toEqual(defaultRes.body.data);
  });

  test("GET /api/2022/search?q=restaurant returns results", async () => {
    const { status, body } = await get("/api/2022/search?q=restaurant");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test("GET /api/2022/naics/722511/children returns children", async () => {
    const { status, body } = await get("/api/2022/naics/722511/children");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
  });

  test("GET /api/2022/naics/722511/ancestors returns ancestors", async () => {
    const { status, body } = await get("/api/2022/naics/722511/ancestors");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(1);
  });

  test("year-prefixed routes have Cache-Control headers", async () => {
    const { status, headers } = await get("/api/2022/sectors");
    expect(status).toBe(200);
    const cc = headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=");
  });
});

describe("Unsupported years", () => {
  test("GET /api/2000/sectors returns 404", async () => {
    const { status, body } = await get("/api/2000/sectors");
    expect(status).toBe(404);
    expect(body.error).toBe("Not found");
  });

  test("GET /api/1999/naics/722511 returns 404", async () => {
    const { status, body } = await get("/api/1999/naics/722511");
    expect(status).toBe(404);
    expect(body.error).toBe("Not found");
  });
});

describe("Root endpoint includes year info", () => {
  test("GET / includes supportedYears and defaultYear", async () => {
    const { status, body } = await get("/");
    expect(status).toBe(200);
    expect(body.supportedYears).toEqual([2022, 2017, 2012]);
    expect(body.defaultYear).toBe(2022);
  });
});
