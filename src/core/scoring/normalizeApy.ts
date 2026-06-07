import { APY_PERCENTAGE_THRESHOLD } from "./scoringConfig.js";

export function normalizeApyToDecimal(apy: number): number {
  if (apy >= APY_PERCENTAGE_THRESHOLD) {
    return apy / 100;
  }

  return apy;
}
