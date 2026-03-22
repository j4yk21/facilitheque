// Character set excluding ambiguous characters (0/O, 1/I/L)
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates a 6-character battle code using crypto-safe randomness.
 */
export function generateBattleCode(): string {
  let code = "";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    code += CHARS[array[i] % CHARS.length];
  }
  return code;
}

/**
 * Validates that a string is a valid battle code format.
 */
export function isValidBattleCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code);
}
