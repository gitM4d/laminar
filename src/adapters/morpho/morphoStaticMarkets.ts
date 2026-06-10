import type { SupportedAsset } from "../../core/opportunity/types.js";
import type { MorphoBaseStaticMarket } from "./morphoTypes.js";

/**
 * Deterministic static Morpho Base markets for the read-only spike.
 *
 * IMPORTANT:
 * - APY and TVL values are realistic but STATIC placeholders.
 * - vaultAddress values must be verified against Morpho's official registry
 *   before any production use.
 * - V1 assets only (USDC / EURC / DAI). No ETH/BTC/LSTs/long-tail assets.
 */
export const MORPHO_BASE_STATIC_MARKETS: readonly MorphoBaseStaticMarket[] = [
  {
    id: "morpho-usdc-base",
    asset: "USDC",
    vaultAddress: "0xMORPHO_USDC_VAULT_PLACEHOLDER_000000000000",
    staticApy: 0.058,
    staticTvlUsd: 120_000_000,
  },
  {
    id: "morpho-eurc-base",
    asset: "EURC",
    vaultAddress: "0xMORPHO_EURC_VAULT_PLACEHOLDER_000000000000",
    staticApy: 0.039,
    staticTvlUsd: 18_000_000,
  },
  {
    id: "morpho-dai-base",
    asset: "DAI",
    vaultAddress: "0xMORPHO_DAI_VAULT_PLACEHOLDER_0000000000000",
    staticApy: 0.044,
    staticTvlUsd: 22_000_000,
  },
] as const;

/**
 * Static APY/TVL placeholders keyed by supported asset.
 *
 * Used when the API is reachable but a specific value is missing.
 */
export const MORPHO_BASE_STATIC_APY_TVL_BY_ASSET: Record<
  SupportedAsset,
  { staticApy: number; staticTvlUsd: number }
> = {
  USDC: { staticApy: 0.058, staticTvlUsd: 120_000_000 },
  EURC: { staticApy: 0.039, staticTvlUsd: 18_000_000 },
  DAI: { staticApy: 0.044, staticTvlUsd: 22_000_000 },
};

export function getStaticApyTvlForAsset(asset: SupportedAsset): {
  staticApy: number;
  staticTvlUsd: number;
} {
  return MORPHO_BASE_STATIC_APY_TVL_BY_ASSET[asset];
}
