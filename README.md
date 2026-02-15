# NAICS Code API

Free, self-hosted REST API for NAICS (North American Industry Classification System) codes. Supports **2022**, **2017**, and **2012** revisions. Built with [Bun](https://bun.sh) and SQLite.

Data sourced from the [U.S. Census Bureau](https://www.census.gov/naics/).

## Prerequisites

- [Bun](https://bun.sh) v1.0+

## Quick Start

```bash
bun install
bun run build-db    # downloads Census XLSX files and builds SQLite databases (all years)
bun run dev         # starts server with hot reload on http://localhost:3456
```

To build a single year:

```bash
bun run build-db:2022   # only 2022
bun run build-db:2017   # only 2017
bun run build-db:2012   # only 2012
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `bun run dev` | `bun --hot src/index.ts` | Start dev server with hot reload |
| `bun run start` | `bun src/index.ts` | Start production server |
| `bun run build-db` | `bun scripts/build-db.ts` | Download Census data and build all year DBs |
| `bun run build-db:2022` | `bun scripts/build-db.ts 2022` | Build 2022 database only |
| `bun run build-db:2017` | `bun scripts/build-db.ts 2017` | Build 2017 database only |
| `bun run build-db:2012` | `bun scripts/build-db.ts 2012` | Build 2012 database only |
| `bun test` | | Run all tests |

## Database Setup

The databases are not checked into the repo. Run `bun run build-db` to create them. This will, for each year:

1. Download 4 XLSX files from Census.gov into `data/xlsx/{year}/`
2. Parse codes, descriptions, index entries, and cross-references
3. Build `data/naics-{year}.db` with FTS5 full-text search index

The download is cached — re-running skips files already in `data/xlsx/`.

## Multi-Year Support

All endpoints accept an optional year prefix: `/api/{year}/...`. Unprefixed routes default to **2022**.

Supported years: `2022`, `2017`, `2012`

```bash
# Default (2022)
curl http://localhost:3456/api/naics/722511

# Explicit 2022
curl http://localhost:3456/api/2022/naics/722511

# 2017 revision
curl http://localhost:3456/api/2017/naics/722511

# 2012 revision
curl http://localhost:3456/api/2012/sectors
```

## API Endpoints

All endpoints below are shown without year prefix. Prepend `/api/{year}` for a specific revision (e.g. `/api/2017/sectors`).

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
| `GET /api/naics/:code/descendants?limit=100&offset=0` | All codes below (paginated, max 500, integer params only) |

### Search

| Endpoint | Description |
|----------|-------------|
| `GET /api/search?q=:query&limit=20&offset=0&level=:level` | Full-text search with BM25 ranking (max 100, integer pagination params, optional level filter 2-6) |

### Related Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/naics/:code/cross-references` | Cross-references for a code |
| `GET /api/naics/:code/index-entries` | Index entry keywords for a code |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/openapi.json` | OpenAPI 3.0 specification (same spec at all year prefixes — API shape is identical across years) |
| `GET /` | API overview with all endpoints and examples |

## Response Format

**Success** responses return `{ data, meta? }`:

```json
{
  "data": {
    "code": "722511",
    "title": "Full-Service Restaurants",
    "description": "...",
    "level": 6,
    "parent_code": "72251"
  }
}
```

Paginated endpoints include `meta`:

```json
{
  "data": [...],
  "meta": { "total": 245, "limit": 20, "offset": 0 }
}
```

**Error** responses return `{ error }` with appropriate HTTP status:

```json
{ "error": "Code not found" }
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Invalid input (bad code format, missing params, invalid search syntax) |
| 404 | Code not found or unknown route |
| 500 | Server error |

## Search Syntax

The search endpoint uses SQLite FTS5 with Porter stemming. Queries support:

- **Simple terms**: `restaurant` — matches stemmed variants (e.g. "restaurants")
- **Phrases**: `"full service"` — matches exact phrase
- **AND** (default): `restaurant bar` — both terms must appear
- **OR**: `restaurant OR bar` — either term
- **NOT**: `restaurant NOT bar` — exclude term
- **Prefix**: `rest*` — prefix matching

## Caching and CORS

- **CORS** is enabled on all routes.
- **Cache-Control** headers are set on all 200 responses: `public, max-age=86400, s-maxage=604800` (1 day browser, 7 days CDN). Error responses are not cached.

## Examples

See [EXAMPLES.md](EXAMPLES.md) for detailed request/response examples with real data.

```bash
# Look up Full-Service Restaurants (default: 2022)
curl http://localhost:3456/api/naics/722511

# Look up in 2017 revision
curl http://localhost:3456/api/2017/naics/722511

# Get children of Accommodation and Food Services
curl http://localhost:3456/api/naics/72/children

# Search for "restaurant"
curl "http://localhost:3456/api/search?q=restaurant"

# Search 2012 data
curl "http://localhost:3456/api/2012/search?q=restaurant"

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
  db.ts                 Database factory (per-year connections)
  types.ts              Shared types and year constants
  params.ts             Request parsing and validation (pure)
  transforms.ts         Data transformations (pure)
  openapi.json          OpenAPI 3.0 spec
  routes/
    codes.ts            Code lookup and hierarchy routes
    search.ts           Full-text search route
    helpers.ts          Shared route utilities
scripts/
  build-db.ts           Census data downloader and DB builder (multi-year)
tests/
  params.test.ts        Param parsing tests
  transforms.test.ts    Data transformation tests
  routes.test.ts        Integration tests (default routes)
  multi-year.test.ts    Multi-year route tests
data/
  naics-2022.db         SQLite database for 2022 (generated)
  naics-2017.db         SQLite database for 2017 (generated)
  naics-2012.db         SQLite database for 2012 (generated)
  xlsx/                 Census source files (downloaded, not in git)
```

## Backward Compatibility

If you previously used a single `data/naics.db` file (pre-multi-year), the server will automatically use it as the 2022 database when `data/naics-2022.db` doesn't exist. No migration needed.

## License

MIT. See [LICENSE](LICENSE). NAICS data is public domain, published by the U.S. Census Bureau.
