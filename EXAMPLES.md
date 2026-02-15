# NAICS Code API — Examples

Real request/response examples from the API. All responses are JSON.

## Look up a single code

```bash
curl http://localhost:3456/api/naics/722511
```

```json
{
  "data": {
    "code": "722511",
    "title": "Full-Service Restaurants",
    "description": "This U.S. industry comprises establishments primarily engaged in providing food services to patrons who order and are served while seated (i.e., waiter/waitress service) and pay after eating...",
    "level": 6,
    "parent_code": "72251"
  }
}
```

## Batch lookup

Returns results in the same order as requested. Missing codes are omitted.

```bash
curl "http://localhost:3456/api/naics?codes=722511,111110,541511"
```

```json
{
  "data": [
    {
      "code": "722511",
      "title": "Full-Service Restaurants",
      "level": 6,
      "parent_code": "72251"
    },
    {
      "code": "111110",
      "title": "Soybean Farming",
      "level": 6,
      "parent_code": "11111"
    },
    {
      "code": "541511",
      "title": "Custom Computer Programming Services",
      "level": 6,
      "parent_code": "54151"
    }
  ]
}
```

## Get children of a code

```bash
curl http://localhost:3456/api/naics/72/children
```

```json
{
  "data": [
    {
      "code": "721",
      "title": "Accommodation",
      "level": 3,
      "parent_code": "72"
    },
    {
      "code": "722",
      "title": "Food Services and Drinking Places",
      "level": 3,
      "parent_code": "72"
    }
  ]
}
```

## Walk the ancestor chain

Returns the code itself first, then each parent up to the sector.

```bash
curl http://localhost:3456/api/naics/722511/ancestors
```

```json
{
  "data": [
    { "code": "722511", "title": "Full-Service Restaurants", "level": 6, "parent_code": "72251" },
    { "code": "72251", "title": "Restaurants and Other Eating Places", "level": 5, "parent_code": "7225" },
    { "code": "7225", "title": "Restaurants and Other Eating Places", "level": 4, "parent_code": "722" },
    { "code": "722", "title": "Food Services and Drinking Places", "level": 3, "parent_code": "72" },
    { "code": "72", "title": "Accommodation and Food Services", "level": 2, "parent_code": null }
  ]
}
```

## Get descendants (paginated)

```bash
curl "http://localhost:3456/api/naics/72/descendants?limit=5"
```

```json
{
  "data": [
    { "code": "721", "title": "Accommodation", "level": 3 },
    { "code": "7211", "title": "Traveler Accommodation", "level": 4 },
    { "code": "72111", "title": "Hotels (except Casino Hotels) and Motels", "level": 5 },
    { "code": "721110", "title": "Hotels (except Casino Hotels) and Motels", "level": 6 },
    { "code": "72112", "title": "Casino Hotels", "level": 5 }
  ],
  "meta": { "total": 33, "limit": 5, "offset": 0 }
}
```

Use `offset` to paginate: `?limit=5&offset=5` for the next page.

## Full-text search

Search uses BM25 ranking. Lower `rank` values are more relevant.

```bash
curl "http://localhost:3456/api/search?q=restaurant&limit=5"
```

```json
{
  "data": [
    { "code": "722513", "title": "Limited-Service Restaurants", "rank": -9.51 },
    { "code": "722511", "title": "Full-Service Restaurants", "rank": -9.46 },
    { "code": "7225", "title": "Restaurants and Other Eating Places", "rank": -9.45 },
    { "code": "72251", "title": "Restaurants and Other Eating Places", "rank": -8.77 },
    { "code": "337127", "title": "Institutional Furniture Manufacturing", "rank": -8.46 }
  ],
  "meta": { "total": 24, "limit": 5, "offset": 0 }
}
```

### Filter search by level

Only return 6-digit (national industry) codes:

```bash
curl "http://localhost:3456/api/search?q=software&level=6&limit=3"
```

```json
{
  "data": [
    { "code": "513210", "title": "Software Publishers", "rank": -9.60 },
    { "code": "541511", "title": "Custom Computer Programming Services", "rank": -9.56 },
    { "code": "334610", "title": "Manufacturing and Reproducing Magnetic and Optical Media", "rank": -9.23 }
  ],
  "meta": { "total": 12, "limit": 3, "offset": 0 }
}
```

### Phrase search

Use quotes for exact phrase matching:

```bash
curl "http://localhost:3456/api/search?q=\"full+service\"+restaurant&limit=3"
```

```json
{
  "data": [
    { "code": "722511", "title": "Full-Service Restaurants", "rank": -24.02 }
  ],
  "meta": { "total": 1, "limit": 3, "offset": 0 }
}
```

## Cross-references

Shows related codes and how they differ from this code.

```bash
curl http://localhost:3456/api/naics/111110/cross-references
```

```json
{
  "data": [
    {
      "id": 1,
      "code": "111110",
      "description": "Establishments engaged in growing soybeans in combination with grain(s) with the soybeans or grain(s) not accounting for one-half of the establishment's agricultural production (value of crops for market) are classified in U.S. Industry 111191, Oilseed and Grain Combination Farming."
    }
  ]
}
```

## Index entries

Keywords and synonyms that map to a code (used in full-text search).

```bash
curl http://localhost:3456/api/naics/722511/index-entries
```

```json
{
  "data": [
    { "id": 19416, "code": "722511", "entry": "Bagel shops, full service" },
    { "id": 19417, "code": "722511", "entry": "Brew pub restaurants, primarily serving meals, full service" },
    { "id": 19418, "code": "722511", "entry": "Diners, full service" },
    { "id": 19419, "code": "722511", "entry": "Doughnut shops, full service" },
    { "id": 19420, "code": "722511", "entry": "Family restaurants, full service" },
    { "id": 19421, "code": "722511", "entry": "Fine dining restaurants, full service" },
    { "id": 19422, "code": "722511", "entry": "Full service restaurants" },
    { "id": 19423, "code": "722511", "entry": "Pizza parlors, full service" },
    { "id": 19424, "code": "722511", "entry": "Pizzerias, full service" },
    { "id": 19425, "code": "722511", "entry": "Restaurants, full service" },
    { "id": 19426, "code": "722511", "entry": "Steak houses, full service" }
  ]
}
```

## Year-prefixed routes

All endpoints work under `/api/{year}/...`. Unprefixed routes default to 2022.

```bash
# Explicit 2022
curl http://localhost:3456/api/2022/naics/722511

# 2017 revision (if built)
curl http://localhost:3456/api/2017/sectors

# 2012 search (if built)
curl "http://localhost:3456/api/2012/search?q=restaurant"
```

If a year's database hasn't been built yet:

```json
{
  "error": "Data for year 2017 is not available. Build it with: bun run build-db 2017"
}
```

## Error responses

### Code not found (404)

```bash
curl http://localhost:3456/api/naics/000000
```

```json
{ "error": "Code not found" }
```

### Invalid format (400)

```bash
curl http://localhost:3456/api/naics/abc
```

```json
{ "error": "Invalid NAICS code format" }
```

### Missing required parameter (400)

```bash
curl http://localhost:3456/api/search
```

```json
{ "error": "Missing query parameter 'q'" }
```
