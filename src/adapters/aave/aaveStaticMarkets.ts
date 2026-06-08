import type { AaveBaseStaticMarket } from "./aaveTypes.js";

/**
 * Deterministic static Aave Base markets for Sprint 17.
 *
 * IMPORTANT:
 * - APY and TVL values are realistic but STATIC placeholders.
 * - reserveAddress values must be verified against the official Aave address
 *   registry before production use.
 * - No real Aave reserve math is performed in this spike.
 */
export const AAVE_BASE_STATIC_MARKETS: readonly AaveBaseStaticMarket[] = [
  {
    id: "aave-usdc-base",
    asset: "USDC",
    reserveAddress: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
    staticApy: 0.052,
    staticTvlUsd: 180_000_000,
  },
  {
    id: "aave-eurc-base",
    asset: "EURC",
    reserveAddress: "0x90DA57E0A6C0d166Bf15764E03b83745Dc90025B",
    staticApy: 0.041,
    staticTvlUsd: 25_000_000,
  },
] as const;
