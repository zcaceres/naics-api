const NUMERIC_CODE = /^\d{2,6}$/;
const RANGE_CODE = /^\d{2}-\d{2}$/;

export function isValidNaicsFormat(code: string): boolean {
  return NUMERIC_CODE.test(code) || RANGE_CODE.test(code);
}

export function parsePagination(
  limitStr: string | undefined,
  offsetStr: string | undefined,
  defaults: { defaultLimit: number; maxLimit: number }
): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(Number(limitStr) || defaults.defaultLimit, defaults.maxLimit));
  const offset = Math.max(0, Number(offsetStr) || 0);
  return { limit, offset };
}

export function parseLevel(
  levelStr: string | undefined
): { ok: true; value: number | undefined } | { ok: false; error: string } {
  if (levelStr === undefined) return { ok: true, value: undefined };
  const level = Number(levelStr);
  if (!Number.isInteger(level) || level < 2 || level > 6) {
    return { ok: false, error: "Invalid level: must be an integer between 2 and 6" };
  }
  return { ok: true, value: level };
}

export function parseCodesList(
  codesParam: string | undefined,
  maxCodes: number = 50
): { ok: true; codes: string[] } | { ok: false; error: string } {
  if (!codesParam) {
    return { ok: false, error: "Missing query parameter 'codes'" };
  }

  const codeList = codesParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (codeList.length === 0) {
    return { ok: false, error: "No codes provided" };
  }

  if (codeList.length > maxCodes) {
    return { ok: false, error: `Maximum ${maxCodes} codes per request` };
  }

  const invalid = codeList.filter((code) => !isValidNaicsFormat(code));
  if (invalid.length > 0) {
    return { ok: false, error: `Invalid NAICS code format: ${invalid.join(", ")}` };
  }

  const uniqueCodes = [...new Set(codeList)];
  return { ok: true, codes: uniqueCodes };
}

export function classifySearchError(error: unknown): "invalid_syntax" | "server_error" {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("fts5:") || msg.includes("syntax error") || msg.includes("unterminated string") || msg.includes("no such column")) {
    return "invalid_syntax";
  }
  return "server_error";
}
