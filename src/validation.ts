const NUMERIC_CODE = /^\d{2,6}$/;
const RANGE_CODE = /^\d{2}-\d{2}$/;

export function isValidNaicsFormat(code: string): boolean {
  return NUMERIC_CODE.test(code) || RANGE_CODE.test(code);
}
