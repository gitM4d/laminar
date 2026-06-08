/**
 * Aave fixed-point math helpers (read-only).
 *
 * Aave V3 expresses rates in "ray" units where 1e27 == 100% APR (decimal 1.0).
 */

/** 1 ray = 1e27. */
export const RAY = 10n ** 27n;

/** Decimal precision used for the controlled bigint → number conversion. */
const RAY_DECIMAL_PRECISION = 1_000_000_000n; // 1e9 → 9 fractional digits

/**
 * Converts an Aave ray-denominated rate to a plain decimal number.
 *
 * Uses bigint-safe scaling to avoid converting a huge bigint directly to an
 * unsafe number. Result keeps up to 9 fractional digits, which is ample for an
 * APR/APY decimal (e.g. 0.045 = 4.5%).
 *
 * Examples:
 * - rayToDecimal(0n) === 0
 * - rayToDecimal(5n * 10n ** 25n) === 0.05
 * - rayToDecimal(10n ** 27n) === 1
 */
export function rayToDecimal(rate: bigint): number {
  const scaled = (rate * RAY_DECIMAL_PRECISION) / RAY;
  return Number(scaled) / Number(RAY_DECIMAL_PRECISION);
}
