import type { SupportedAsset } from "../../core/opportunity/types.js";

/**
 * Static representation of an Aave Base reserve/market for Sprint 17.
 *
 * NOTE: APY and TVL are static placeholders in this spike. Real Aave reserve
 * math (liquidity rate, aToken supply, oracle pricing) is NOT implemented yet.
 */
export type AaveBaseStaticMarket = {
  id: string;
  asset: SupportedAsset;
  /** aToken or reserve address. Verify against the official registry. */
  reserveAddress: string;
  /** Static placeholder supply APY (decimal, e.g. 0.052 = 5.2%). */
  staticApy: number;
  /** Static placeholder reserve TVL in USD. */
  staticTvlUsd: number;
};
