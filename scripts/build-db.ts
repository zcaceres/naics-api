import { Database } from "bun:sqlite";
import * as XLSX from "xlsx";
import { mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "..", "data");
const XLSX_DIR = join(DATA_DIR, "xlsx");
const DB_PATH = join(DATA_DIR, "naics.db");

const FILES = {
  codes: {
    url: "https://www.census.gov/naics/2022NAICS/2-6%20digit_2022_Codes.xlsx",
    filename: "2-6_digit_2022_Codes.xlsx",
  },
  descriptions: {
    url: "https://www.census.gov/naics/2022NAICS/2022_NAICS_Descriptions.xlsx",
    filename: "2022_NAICS_Descriptions.xlsx",
  },
  index: {
    url: "https://www.census.gov/naics/2022NAICS/2022_NAICS_Index_File.xlsx",
    filename: "2022_NAICS_Index_File.xlsx",
  },
  crossReferences: {
    url: "https://www.census.gov/naics/2022NAICS/2022_NAICS_Cross_References.xlsx",
    filename: "2022_NAICS_Cross_References.xlsx",
  },
};

// Range-code sectors: codes starting with these digits map to these range parents
const RANGE_SECTORS: Record<string, string> = {
  "31": "31-33",
  "32": "31-33",
  "33": "31-33",
  "44": "44-45",
  "45": "44-45",
  "48": "48-49",
  "49": "48-49",
};

async function downloadFile(url: string, dest: string): Promise<void> {
  if (existsSync(dest)) {
    console.log(`  Already exists: ${dest}`);
    return;
  }
  console.log(`  Downloading: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  await Bun.write(dest, buffer);
  console.log(`  Saved: ${dest}`);
}

function deriveParentCode(code: string): string | null {
  // Range codes are top-level sectors
  if (code.includes("-")) return null;

  const len = code.length;

  // 2-digit codes: check if they belong to a range sector
  if (len === 2) {
    return RANGE_SECTORS[code] ?? null;
  }

  // 3-digit codes: parent is 2-digit prefix, but might be a range sector
  if (len === 3) {
    const twoDigit = code.slice(0, 2);
    return RANGE_SECTORS[twoDigit] ?? twoDigit;
  }

  // 4-6 digit codes: trim last digit
  return code.slice(0, len - 1);
}

function deriveLevel(code: string): number {
  if (code.includes("-")) return 2; // range codes like "31-33" are sector level
  return code.length;
}

async function main() {
  console.log("=== NAICS Database Builder ===\n");

  // Ensure directories exist
  mkdirSync(XLSX_DIR, { recursive: true });

  // Step 1: Download files
  console.log("Step 1: Downloading Census XLSX files...");
  for (const [key, file] of Object.entries(FILES)) {
    await downloadFile(file.url, join(XLSX_DIR, file.filename));
  }
  console.log();

  // Step 2: Parse XLSX files
  console.log("Step 2: Parsing XLSX files...");

  // Parse codes file
  const codesWb = XLSX.readFile(join(XLSX_DIR, FILES.codes.filename));
  const codesSheet = codesWb.Sheets[codesWb.SheetNames[0]];
  const codesRows: any[] = XLSX.utils.sheet_to_json(codesSheet);
  console.log(`  Codes: ${codesRows.length} rows`);

  // Parse descriptions file
  const descWb = XLSX.readFile(join(XLSX_DIR, FILES.descriptions.filename));
  const descSheet = descWb.Sheets[descWb.SheetNames[0]];
  const descRows: any[] = XLSX.utils.sheet_to_json(descSheet);
  console.log(`  Descriptions: ${descRows.length} rows`);

  // Parse index file
  const indexWb = XLSX.readFile(join(XLSX_DIR, FILES.index.filename));
  const indexSheet = indexWb.Sheets[indexWb.SheetNames[0]];
  const indexRows: any[] = XLSX.utils.sheet_to_json(indexSheet);
  console.log(`  Index entries: ${indexRows.length} rows`);

  // Parse cross-references file
  const xrefWb = XLSX.readFile(join(XLSX_DIR, FILES.crossReferences.filename));
  const xrefSheet = xrefWb.Sheets[xrefWb.SheetNames[0]];
  const xrefRows: any[] = XLSX.utils.sheet_to_json(xrefSheet);
  console.log(`  Cross-references: ${xrefRows.length} rows`);
  console.log();

  // Step 3: Build SQLite database
  console.log("Step 3: Building SQLite database...");

  // Remove existing db
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
    console.log("  Removed existing database");
  }

  const db = new Database(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");

  // Create tables
  db.exec(`
    CREATE TABLE codes (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      level INTEGER NOT NULL,
      parent_code TEXT,
      FOREIGN KEY (parent_code) REFERENCES codes(code)
    );

    CREATE TABLE index_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      entry TEXT NOT NULL,
      FOREIGN KEY (code) REFERENCES codes(code)
    );

    CREATE TABLE cross_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (code) REFERENCES codes(code)
    );

    CREATE INDEX idx_index_entries_code ON index_entries(code);
    CREATE INDEX idx_cross_references_code ON cross_references(code);
    CREATE INDEX idx_codes_parent ON codes(parent_code);
    CREATE INDEX idx_codes_level ON codes(level);
  `);
  console.log("  Created tables and indexes");

  // Build description map (code → description)
  const descMap = new Map<string, string>();
  for (const row of descRows) {
    const code = String(row["Code"] ?? row["Seq. No."] ?? row["NAICS Code"] ?? "").trim();
    const desc = String(
      row["Description"] ?? row["NAICS Description"] ?? row["Title"] ?? ""
    ).trim();
    if (code && desc) {
      descMap.set(code, desc);
    }
  }
  console.log(`  Description map: ${descMap.size} entries`);

  // Insert codes
  // Column name has irregular spacing: "2022 NAICS US   Code"
  const codeColName = Object.keys(codesRows[0]).find(k => k.includes("Code")) ?? "Code";
  const titleColName = Object.keys(codesRows[0]).find(k => k.includes("Title")) ?? "Title";
  console.log(`  Code column: "${codeColName}", Title column: "${titleColName}"`);

  const insertCode = db.prepare(
    "INSERT OR IGNORE INTO codes (code, title, description, level, parent_code) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTransaction = db.transaction(() => {
    let inserted = 0;
    for (const row of codesRows) {
      const rawCode = row[codeColName];
      const title = row[titleColName];

      if (rawCode == null || !title) continue;

      const code = String(rawCode).trim();
      const titleStr = String(title).trim();
      if (!code || !titleStr) continue;

      const level = deriveLevel(code);
      const parentCode = deriveParentCode(code);
      const description = descMap.get(code) ?? null;

      insertCode.run(code, titleStr, description, level, parentCode);
      inserted++;
    }
    return inserted;
  });

  const codesInserted = insertTransaction();
  console.log(`  Inserted ${codesInserted} codes`);

  // Insert index entries
  const insertIndex = db.prepare(
    "INSERT INTO index_entries (code, entry) VALUES (?, ?)"
  );
  const insertIndexTransaction = db.transaction(() => {
    let inserted = 0;
    for (const row of indexRows) {
      const rawCode = row["NAICS22"] ?? row["2022 NAICS Code"] ?? row["NAICS Code"] ?? row["Code"];
      const entry = row["INDEX ITEM DESCRIPTION"] ?? row["Index Item Description"] ?? row["Description"] ?? row["Entry"];

      if (!rawCode || !entry) continue;

      const code = String(rawCode).trim();
      const entryStr = String(entry).trim();
      if (!code || !entryStr) continue;

      insertIndex.run(code, entryStr);
      inserted++;
    }
    return inserted;
  });

  const indexInserted = insertIndexTransaction();
  console.log(`  Inserted ${indexInserted} index entries`);

  // Insert cross-references
  // Format: { Code: 111110, "Cross-Reference": "description text..." }
  const insertXref = db.prepare(
    "INSERT INTO cross_references (code, description) VALUES (?, ?)"
  );
  const insertXrefTransaction = db.transaction(() => {
    let inserted = 0;
    for (const row of xrefRows) {
      const rawCode = row["Code"];
      const desc = row["Cross-Reference"];

      if (rawCode == null || !desc) continue;

      const code = String(rawCode).trim();
      const descStr = String(desc).trim();
      if (!code || !descStr) continue;

      insertXref.run(code, descStr);
      inserted++;
    }
    return inserted;
  });

  const xrefInserted = insertXrefTransaction();
  console.log(`  Inserted ${xrefInserted} cross-references`);

  // Create FTS5 table
  console.log("  Building full-text search index...");
  db.exec(`
    CREATE VIRTUAL TABLE codes_fts USING fts5(
      code,
      title,
      description,
      index_entries,
      tokenize='porter unicode61'
    );
  `);

  db.exec(`
    INSERT INTO codes_fts(code, title, description, index_entries)
    SELECT c.code, c.title, COALESCE(c.description, ''),
           COALESCE(GROUP_CONCAT(ie.entry, '; '), '')
    FROM codes c
    LEFT JOIN index_entries ie ON ie.code = c.code
    GROUP BY c.code;
  `);
  console.log("  FTS5 index built");

  // Print summary
  const codeCount = db.query("SELECT COUNT(*) as count FROM codes").get() as any;
  const indexCount = db.query("SELECT COUNT(*) as count FROM index_entries").get() as any;
  const xrefCount = db.query("SELECT COUNT(*) as count FROM cross_references").get() as any;
  const ftsCount = db.query("SELECT COUNT(*) as count FROM codes_fts").get() as any;
  const sectorCount = db.query("SELECT COUNT(*) as count FROM codes WHERE parent_code IS NULL").get() as any;

  console.log("\n=== Summary ===");
  console.log(`  Codes: ${codeCount.count}`);
  console.log(`  Index entries: ${indexCount.count}`);
  console.log(`  Cross-references: ${xrefCount.count}`);
  console.log(`  FTS entries: ${ftsCount.count}`);
  console.log(`  Sectors (top-level): ${sectorCount.count}`);
  console.log(`  Database: ${DB_PATH}`);
  console.log("\nDone!");

  db.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
