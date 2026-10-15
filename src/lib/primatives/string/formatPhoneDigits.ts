/**
 * Formats a 10-digit string of digits into (XXX) XXX-XXXX.
 * Returns the input unchanged if it is not exactly 10 digits.
 */
export function formatPhoneDigits(digits: string): string {
  if (!/^\d{10}$/.test(digits)) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
