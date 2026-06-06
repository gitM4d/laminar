import type { UserIntent } from "../intent/types.js";

export type NormalizedIntent = {
  riskFactor: number;
  liquidityFactor: number;
  returnFactor: number;
};

export function normalizeIntent(intent: UserIntent): NormalizedIntent {
  return {
    riskFactor: intent.risk / 10,
    liquidityFactor: intent.liquidity / 10,
    returnFactor: intent.returnPreference / 10,
  };
}
