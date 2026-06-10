import type { SupportedAsset } from "../../core/opportunity/types.js";
import type { MoonwellBaseStaticMarket } from "./moonwellTypes.js";

/**
 * Deterministic static Moonwell Base markets for the read-only spike.
 *
 * IMPORTANT:
 * - APY and TVL values are realistic but STATIC placeholders.
 * - marketAddress values must be verified against Moonwell's official registry
 *   before any production use.
 * - V1 assets only (USDC / EURC / DAI). No ETH/BTC/LSTs/long-tail assets.
 * - Moonwell is a Compound V2-style protocol; lending markets are mTokens.
 *
 * ASSET AVAILABILITY NOTE:
 * Moonwell operates core lending markets for USDC and DAI on Base. A EURC
 * market also exists. All three V1 assets are included here as deterministic
 * placeholders (matching the Aave/Morpho convention); real availability and
 * values are confirmed at runtime by the API discovery path.
 */
export const MOONWELL_BASE_STATIC_MARKETS: readonly MoonwellBaseStaticMarket[] =
  [
    {
      id: "moonwell-usdc-base",
      asset: "USDC",
      marketAddress: "0xMOONWELL_USDC_MARKET_PLACEHOLDER_00000000",
      staticApy: 0.048,
      staticTvlUsd: 40_000_000,
    },
    {
      id: "moonwell-eurc-base",
      asset: "EURC",
      marketAddress: "0xMOONWELL_EURC_MARKET_PLACEHOLDER_00000000",
      staticApy: 0.034,
      staticTvlUsd: 5_000_000,
    },
    {
      id: "moonwell-dai-base",
      asset: "DAI",
      marketAddress: "0xMOONWELL_DAI_MARKET_PLACEHOLDER_000000000",
      staticApy: 0.041,
      staticTvlUsd: 8_000_000,
    },
  ] as const;

/**
 * Static APY/TVL placeholders keyed by supported asset.
 *
 * Used when the API is reachable but a specific value is missing.
 */
export const MOONWELL_BASE_STATIC_APY_TVL_BY_ASSET: Record<
  SupportedAsset,
  { staticApy: number; staticTvlUsd: number }
> = {
  USDC: { staticApy: 0.048, staticTvlUsd: 40_000_000 },
  EURC: { staticApy: 0.034, staticTvlUsd: 5_000_000 },
  DAI: { staticApy: 0.041, staticTvlUsd: 8_000_000 },
};

export function getStaticApyTvlForAsset(asset: SupportedAsset): {
  staticApy: number;
  staticTvlUsd: number;
} {
  return MOONWELL_BASE_STATIC_APY_TVL_BY_ASSET[asset];
}
