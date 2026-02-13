# NAICS Code API

Free, self-hosted REST API for 2022 NAICS (North American Industry Classification System) codes. Built with [Bun](https://bun.sh) and SQLite.

Data sourced from the [U.S. Census Bureau](https://www.census.gov/naics/).

## Quick Start

```bash
bun install
bun run build-db    # downloads Census XLSX files and builds SQLite database
bun run dev         # starts server with hot reload on http://localhost:3456
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `bun run dev` | `bun --hot src/index.ts` | Start dev server with hot reload |
| `bun run start` | `bun src/index.ts` | Start production server |
| `bun run build-db` | `bun scripts/build-db.ts` | Download Census data and build SQLite DB |
| `bun test` | | Run all tests |

## Database Setup

The database is not checked into the repo. Run `bun run build-db` to create it. This will:

1. Download 4 XLSX files from Census.gov into `data/xlsx/`
2. Parse codes, descriptions, index entries, and cross-references
3. Build `data/naics.db` with FTS5 full-text search index

The download is cached — re-running skips files already in `data/xlsx/`.

## API Endpoints

All responses use `{ data, meta? }` for success and `{ error }` for errors.

### Codes

| Endpoint | Description |
|----------|-------------|
| `GET /api/sectors` | List all 20 top-level NAICS sectors |
| `GET /api/naics/:code` | Look up a specific NAICS code |
| `GET /api/naics?codes=:code1,:code2,...` | Batch lookup (max 50, returns in request order) |

### Hierarchy

| Endpoint | Description |
|----------|-------------|
| `GET /api/naics/:code/children` | Direct children of a code |
| `GET /api/naics/:code/ancestors` | Full ancestor chain up to sector |
| `GET /api/naics/:code/descendants?limit=100&offset=0` | All codes below (paginated, max 500) |

### Search

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=:query&limit=20&offset=0&level=:level` | Full-text search with BM25 ranking (max 100, optional level filter 2-6) |

### Related Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/naics/:code/cross-references` | Cross-references for a code |
| `GET /api/naics/:code/index-entries` | Index entry keywords for a code |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/openapi.json` | OpenAPI 3.0 specification |
| `GET /` | API overview with all endpoints and examples |

## Examples

```bash
# Look up Full-Service Restaurants
curl http://localhost:3456/api/naics/722511

# Get children of Accommodation and Food Services
curl http://localhost:3456/api/naics/72/children

# Search for "restaurant"
curl "http://localhost:3456/api/search?q=restaurant"

# Search for 6-digit codes only
curl "http://localhost:3456/api/search?q=restaurant&level=6"

# Batch lookup
curl "http://localhost:3456/api/naics?codes=722511,111110,541511"

# Range code descendants (Manufacturing)
curl "http://localhost:3456/api/naics/31-33/descendants?limit=10"
```

## Code Format

NAICS codes are 2-6 digits representing hierarchy levels:

| Digits | Level | Example |
|--------|-------|---------|
| 2 | Sector | `72` (Accommodation and Food Services) |
| 3 | Subsector | `722` (Food Services and Drinking Places) |
| 4 | Industry Group | `7225` (Restaurants and Other Eating Places) |
| 5 | Industry | `72251` (Restaurants and Other Eating Places) |
| 6 | National Industry | `722511` (Full-Service Restaurants) |

Some sectors use range codes: `31-33` (Manufacturing), `44-45` (Retail Trade), `48-49` (Transportation and Warehousing).

## Project Structure

```
src/
  index.ts              Server entry point
  db.ts                 Database queries
  params.ts             Request parsing and validation (pure)
  transforms.ts         Data transformations (pure)
  openapi.json          OpenAPI 3.0 spec
  routes/
    codes.ts            Code lookup and hierarchy routes
    search.ts           Full-text search route
    helpers.ts          Shared route utilities
scripts/
  build-db.ts           Census data downloader and DB builder
tests/
  params.test.ts        Param parsing tests
  transforms.test.ts    Data transformation tests
  routes.test.ts        Integration tests
data/
  naics.db              SQLite database (generated, not in git)
  xlsx/                 Census source files (downloaded, not in git)
```

## License

Public domain. NAICS data is published by the U.S. Census Bureau.
