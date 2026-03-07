#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createNaics, describe } from "./lib";

const server = new McpServer({ name: "naics", version: "1.0.0" });

const yearParam = z.enum(["2022", "2017", "2012"]).default("2022").describe("NAICS revision year");
const codeParam = z.string().describe("NAICS code (2-6 digits, or range like 31-33)");

function db(year: string) {
  return createNaics({ year: parseInt(year) as any });
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

server.tool("naics_describe", "Show all available operations and supported NAICS years", {}, async () =>
  json(describe())
);

server.tool("naics_get", "Look up a single NAICS code", { code: codeParam, year: yearParam }, async ({ code, year }) =>
  json(db(year).codes.get(code))
);

server.tool(
  "naics_batch",
  "Batch lookup multiple NAICS codes",
  { codes: z.string().describe("Comma-separated NAICS codes"), year: yearParam },
  async ({ codes, year }) => json(db(year).codes.batch(codes.split(",").map((c) => c.trim())))
);

server.tool(
  "naics_children",
  "Get direct children of a NAICS code",
  { code: codeParam, year: yearParam },
  async ({ code, year }) => json(db(year).codes.children(code))
);

server.tool(
  "naics_ancestors",
  "Get ancestor chain from a NAICS code up to its sector",
  { code: codeParam, year: yearParam },
  async ({ code, year }) => json(db(year).codes.ancestors(code))
);

server.tool(
  "naics_descendants",
  "Get all descendants of a NAICS code (paginated)",
  {
    code: codeParam,
    year: yearParam,
    limit: z.number().default(100).describe("Max results to return"),
    offset: z.number().default(0).describe("Number of results to skip"),
  },
  async ({ code, year, limit, offset }) => json(db(year).codes.descendants(code, { limit, offset }))
);

server.tool("naics_sectors", "List all 20 top-level NAICS sectors", { year: yearParam }, async ({ year }) =>
  json(db(year).codes.sectors())
);

server.tool(
  "naics_search",
  "Full-text search across NAICS codes, titles, descriptions, and index entries",
  {
    query: z.string().describe("Search query"),
    year: yearParam,
    limit: z.number().default(20).describe("Max results to return"),
    offset: z.number().default(0).describe("Number of results to skip"),
    level: z.number().min(2).max(6).optional().describe("Filter by NAICS level (2-6)"),
  },
  async ({ query, year, limit, offset, level }) => json(db(year).search(query, { limit, offset, level }))
);

server.tool(
  "naics_cross_references",
  "Get cross-references for a NAICS code",
  { code: codeParam, year: yearParam },
  async ({ code, year }) => json(db(year).codes.crossReferences(code))
);

server.tool(
  "naics_index_entries",
  "Get index entries (keyword synonyms) for a NAICS code",
  { code: codeParam, year: yearParam },
  async ({ code, year }) => json(db(year).codes.indexEntries(code))
);

const transport = new StdioServerTransport();
await server.connect(transport);
