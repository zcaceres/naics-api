import { test, expect, describe } from "bun:test";
import app from "../src/index";

const fetch = app.fetch;

async function get(path: string) {
  const url = `http://localhost${path}`;
  const res = await fetch(new Request(url));
  const body = await res.json();
  return { status: res.status, body, headers: res.headers };
}

describe("GET /api/sectors", () => {
  test("returns 200 with array of 20 sectors", async () => {
    const { status, body } = await get("/api/sectors");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(20);
  });
});

describe("GET /api/naics/:code", () => {
  test("returns 200 for valid code", async () => {
    const { status, body } = await get("/api/naics/722511");
    expect(status).toBe(200);
    expect(body.data.code).toBe("722511");
  });

  test("returns 404 for non-existent code", async () => {
    const { status, body } = await get("/api/naics/000000");
    expect(status).toBe(404);
    expect(body.error).toBeDefined();
  });

  test("returns 400 for invalid format", async () => {
    const { status, body } = await get("/api/naics/abc");
    expect(status).toBe(400);
    expect(body.error).toContain("Invalid NAICS code format");
  });
});

describe("GET /api/naics/:code/children", () => {
  test("returns 200 with children array", async () => {
    const { status, body } = await get("/api/naics/72/children");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
  });

  test("returns 404 for non-existent parent", async () => {
    const { status } = await get("/api/naics/000000/children");
    expect(status).toBe(404);
  });
});

describe("GET /api/naics/:code/ancestors", () => {
  test("returns 200 with ancestor chain", async () => {
    const { status, body } = await get("/api/naics/722511/ancestors");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(1);
    expect(body.data[0].code).toBe("722511");
  });
});

describe("GET /api/naics/:code/descendants", () => {
  test("returns 200 with pagination meta", async () => {
    const { status, body } = await get("/api/naics/72/descendants?limit=5");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.meta.limit).toBe(5);
  });

  test("range code returns no hyphenated codes", async () => {
    const { status, body } = await get("/api/naics/31-33/descendants?limit=3");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    for (const item of body.data) {
      expect(item.code).not.toContain("-");
    }
  });

  test("returns 400 for non-integer pagination", async () => {
    const { status, body } = await get("/api/naics/72/descendants?offset=1.5");
    expect(status).toBe(400);
    expect(body.error).toContain("offset");
  });
});

describe("GET /api/naics?codes=", () => {
  test("returns 200 with multiple codes in request order", async () => {
    const { status, body } = await get("/api/naics?codes=722511,111110");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(2);
    expect(body.data[0].code).toBe("722511");
    expect(body.data[1].code).toBe("111110");
  });

  test("returns 400 for empty codes param", async () => {
    const { status, body } = await get("/api/naics?codes=");
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  test("returns 400 for missing codes param", async () => {
    const { status, body } = await get("/api/naics");
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });
});

describe("GET /api/search", () => {
  test("returns 200 with results and meta", async () => {
    const { status, body } = await get("/api/search?q=restaurant");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBeGreaterThan(0);
  });

  test("filters by level", async () => {
    const { status, body } = await get("/api/search?q=restaurant&level=6");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
  });

  test("returns 400 when q is missing", async () => {
    const { status, body } = await get("/api/search");
    expect(status).toBe(400);
    expect(body.error).toContain("Missing");
  });

  test("returns 400 for invalid level", async () => {
    const { status, body } = await get("/api/search?q=restaurant&level=9");
    expect(status).toBe(400);
    expect(body.error).toContain("level");
  });

  test("returns 400 for invalid pagination", async () => {
    const { status, body } = await get("/api/search?q=restaurant&limit=1.5");
    expect(status).toBe(400);
    expect(body.error).toContain("limit");
  });

  test("returns 400 for invalid search syntax", async () => {
    const { status, body } = await get("/api/search?q=)))");
    expect(status).toBe(400);
    expect(body.error).toContain("syntax");
  });
});

describe("GET /api/naics/:code/cross-references", () => {
  test("returns 200 with array", async () => {
    const { status, body } = await get("/api/naics/722511/cross-references");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
  });
});

describe("GET /api/naics/:code/index-entries", () => {
  test("returns 200 with array", async () => {
    const { status, body } = await get("/api/naics/722511/index-entries");
    expect(status).toBe(200);
    expect(body.data).toBeArray();
  });
});

describe("GET /api/openapi.json", () => {
  test("returns 200 with valid OpenAPI spec", async () => {
    const { status, body } = await get("/api/openapi.json");
    expect(status).toBe(200);
    expect(body.openapi).toBeDefined();
  });
});

describe("404 catch-all", () => {
  test("unknown route returns JSON 404", async () => {
    const { status, body } = await get("/api/nonexistent");
    expect(status).toBe(404);
    expect(body.error).toBe("Not found");
  });

  test("unknown top-level route returns JSON 404", async () => {
    const { status, body } = await get("/unknown");
    expect(status).toBe(404);
    expect(body.error).toBe("Not found");
  });
});

describe("Cache-Control headers", () => {
  test("200 responses have cache headers", async () => {
    const { status, headers } = await get("/api/sectors");
    expect(status).toBe(200);
    const cc = headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=");
  });

  test("error responses do not have cache headers", async () => {
    const { status, headers } = await get("/api/naics/000000");
    expect(status).toBe(404);
    expect(headers.get("Cache-Control")).toBeNull();
  });
});
