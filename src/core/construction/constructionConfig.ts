import type { SupportedAsset } from "../opportunity/types.js";

// These are MVP local defaults.
// They mirror the current Configuration Registry concept.
// They will later be loaded from a versioned Configuration Registry.

export const ROUNDING_DECIMALS = 4;
export const INTERNAL_PRECISION_DECIMALS = 6;
export const MAX_CONSTRAINT_ITERATIONS = 10;
export const DEFAULT_LIQUIDITY_BUFFER_ASSET: SupportedAsset = "USDC";
export const DEFAULT_GAS_RESERVE_ASSET: SupportedAsset = "USDC";
