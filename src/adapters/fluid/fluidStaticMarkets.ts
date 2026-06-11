import type { SupportedAsset } from "../../core/opportunity/types.js";
import { buildFluidMarketId } from "./fluidBaseConfig.js";

/**
 * Dev/test-only static markets. Never used in real provider flows.
 * Requires ALLOW_STATIC_MARKET_DATA=true on the adapter.
 */
export type FluidBaseStaticMarket = {
  id: string;
  asset: SupportedAsset;
  fTokenAddress: string;
  staticApy: number;
  staticTvlUsd: number;
};

export const FLUID_BASE_STATIC_MARKETS: readonly FluidBaseStaticMarket[] = [
  {
    id: buildFluidMarketId("USDC"),
    asset: "USDC",
    fTokenAddress: "0xFLUID_USDC_FTOKEN_PLACEHOLDER_00000000",
    staticApy: 0.0465,
    staticTvlUsd: 9_000_000,
  },
  {
    id: buildFluidMarketId("EURC"),
    asset: "EURC",
    fTokenAddress: "0xFLUID_EURC_FTOKEN_PLACEHOLDER_00000000",
    staticApy: 0.0225,
    staticTvlUsd: 1_500_000,
  },
] as const;
