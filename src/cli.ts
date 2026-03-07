#!/usr/bin/env bun

import { parseArgs } from "node:util";
import { getDb, hasDb } from "./db";
import { describe } from "./describe";
import { isValidNaicsFormat } from "./params";
import { SUPPORTED_YEARS, DEFAULT_YEAR, type NaicsYear } from "./types";

function printHelp() {
  console.log(`Usage: naics <command> [options]

Commands:
  get <code>                Look up a NAICS code
  batch <code1,code2,...>   Batch lookup multiple codes
  children <code>           Get direct children
  ancestors <code>          Get ancestor chain
  descendants <code>        Get all descendants (paginated)
  sectors                   List all 20 top-level sectors
  search <query>            Full-text search
  cross-references <code>   Get cross-references
  index-entries <code>      Get index entries
  describe                  Show all available commands and options
  build-db [year]           Download Census data and build SQLite DB

Global Options:
  --year <year>     NAICS year (2022, 2017, 2012) [default: 2022]
  --json            Pretty-print JSON output
  --help            Show help

Command Options (descendants, search):
  --limit <n>       Max results [default: 100 for descendants, 20 for search]
  --offset <n>      Skip first n results
  --level <n>       Filter by level 2-6 (search only)`);
}

function error(message: string, details?: Record<string, unknown>): never {
  const err: Record<string, unknown> = { error: message, ...details };
  console.error(JSON.stringify(err));
  process.exit(1);
}

function output(data: unknown, pretty: boolean) {
  console.log(JSON.stringify(data, null, pretty ? 2 : undefined));
}

function parseYear(yearStr: string | undefined): NaicsYear {
  if (!yearStr) return DEFAULT_YEAR;
  const year = parseInt(yearStr, 10);
  if (!SUPPORTED_YEARS.includes(year as NaicsYear)) {
    error("Unsupported year", {
      received: yearStr,
      supported: [...SUPPORTED_YEARS],
    });
  }
  return year as NaicsYear;
}

function requireCode(args: string[]): string {
  const code = args[0];
  if (!code) {
    error("Missing required argument: code");
  }
  if (!isValidNaicsFormat(code)) {
    error("Invalid NAICS code format", {
      received: code,
      expected: "2-6 digit number or range (e.g. 722511, 31-33)",
    });
  }
  return code;
}

function requireDb(year: NaicsYear) {
  if (!hasDb(year)) {
    error(`Database for year ${year} is not available`, {
      hint: `Run: naics build-db ${year}`,
    });
  }
}

async function runBuildDb(args: string[]) {
  const yearArg = args[0];
  // Dynamically import to avoid loading xlsx when not needed
  const { execSync } = await import("node:child_process");
  const cmd = yearArg
    ? `bun scripts/build-db.ts ${yearArg}`
    : `bun scripts/build-db.ts`;
  try {
    execSync(cmd, { stdio: "inherit", cwd: import.meta.dir + "/.." });
  } catch {
    process.exit(1);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      year: { type: "string" },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      limit: { type: "string" },
      offset: { type: "string" },
      level: { type: "string" },
    },
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    process.exit(0);
  }

  const command = positionals[0];
  const args = positionals.slice(1);
  const pretty = values.json ?? false;
  const year = parseYear(values.year);

  switch (command) {
    case "describe": {
      output(describe(), pretty);
      break;
    }

    case "build-db": {
      await runBuildDb(args);
      break;
    }

    case "get": {
      const code = requireCode(args);
      requireDb(year);
      const result = getDb(year).getCode(code);
      if (!result) {
        error("NAICS code not found", { code, year });
      }
      output(result, pretty);
      break;
    }

    case "batch": {
      const codesStr = args[0];
      if (!codesStr) {
        error("Missing required argument: codes (comma-separated)");
      }
      const codes = codesStr.split(",").map((c) => c.trim());
      for (const code of codes) {
        if (!isValidNaicsFormat(code)) {
          error("Invalid NAICS code format in batch", {
            received: code,
            expected: "2-6 digit number or range (e.g. 722511, 31-33)",
          });
        }
      }
      requireDb(year);
      output(getDb(year).getCodesBatch(codes), pretty);
      break;
    }

    case "children": {
      const code = requireCode(args);
      requireDb(year);
      output(getDb(year).getChildren(code), pretty);
      break;
    }

    case "ancestors": {
      const code = requireCode(args);
      requireDb(year);
      output(getDb(year).getAncestors(code), pretty);
      break;
    }

    case "descendants": {
      const code = requireCode(args);
      requireDb(year);
      const limit = values.limit ? parseInt(values.limit, 10) : 100;
      const offset = values.offset ? parseInt(values.offset, 10) : 0;
      if (isNaN(limit) || limit < 1) error("Invalid --limit value", { received: values.limit });
      if (isNaN(offset) || offset < 0) error("Invalid --offset value", { received: values.offset });
      output(getDb(year).getDescendants(code, limit, offset), pretty);
      break;
    }

    case "sectors": {
      requireDb(year);
      output(getDb(year).getSectors(), pretty);
      break;
    }

    case "search": {
      const query = args.join(" ");
      if (!query) {
        error("Missing required argument: query");
      }
      requireDb(year);
      const limit = values.limit ? parseInt(values.limit, 10) : 20;
      const offset = values.offset ? parseInt(values.offset, 10) : 0;
      const level = values.level ? parseInt(values.level, 10) : undefined;
      if (isNaN(limit) || limit < 1) error("Invalid --limit value", { received: values.limit });
      if (isNaN(offset) || offset < 0) error("Invalid --offset value", { received: values.offset });
      if (level !== undefined && (isNaN(level) || level < 2 || level > 6)) {
        error("Invalid --level value", { received: values.level, expected: "2-6" });
      }
      try {
        output(getDb(year).search(query, limit, offset, level), pretty);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("fts5")) {
          error("Invalid search syntax", { query, hint: "Use simple keywords or quoted phrases" });
        }
        throw e;
      }
      break;
    }

    case "cross-references": {
      const code = requireCode(args);
      requireDb(year);
      output(getDb(year).getCrossReferences(code), pretty);
      break;
    }

    case "index-entries": {
      const code = requireCode(args);
      requireDb(year);
      output(getDb(year).getIndexEntries(code), pretty);
      break;
    }

    default:
      error("Unknown command", {
        received: command,
        available: [
          "get", "batch", "children", "ancestors", "descendants",
          "sectors", "search", "cross-references", "index-entries",
          "describe", "build-db",
        ],
      });
  }
}

main().catch((e) => {
  error(e instanceof Error ? e.message : String(e));
});
