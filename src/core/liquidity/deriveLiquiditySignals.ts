import type { ReadOnlyMarketOpportunity } from "../../adapters/types.js";
import { deriveProtocolTvlUsdFromMarkets } from "../providers/deriveProtocolTvl.js";

export type LiquidityTvlBucket = "low" | "medium" | "high" | "unknown";

export type LiquidityConfidence = "low" | "medium" | "high" | "unknown";

export type LiquidityDerivedSource = "real-market-data" | "curated-fallback";

export type LiquidityDerivedSignals = {
  tvlUsd: number | null;
  tvlBucket: LiquidityTvlBucket;
  liquidityConfidence: LiquidityConfidence;
  source: LiquidityDerivedSource;
};

export type ProtocolLiquidityDerivedSignals = LiquidityDerivedSignals & {
  protocolId: string;
  protocolName: string;
};

/** Derives TVL bucket from protocol-level TVL (informational only). */
export function deriveTvlBucket(tvlUsd: number | null): LiquidityTvlBucket {
  if (tvlUsd === null || !Number.isFinite(tvlUsd) || tvlUsd <= 0) {
    return "unknown";
  }

  if (tvlUsd < 10_000_000) {
    return "low";
  }

  if (tvlUsd <= 100_000_000) {
    return "medium";
  }

  return "high";
}

/** Maps TVL bucket to a first-generation liquidity confidence label. */
export function deriveLiquidityConfidence(
  tvlBucket: LiquidityTvlBucket,
): LiquidityConfidence {
  switch (tvlBucket) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "unknown":
      return "unknown";
  }
}

export function deriveLiquiditySignalsFromTvl(
  tvlUsd: number | null,
  source?: LiquidityDerivedSource,
): LiquidityDerivedSignals {
  const resolvedSource: LiquidityDerivedSource =
    source ??
    (tvlUsd !== null ? "real-market-data" : "curated-fallback");
  const tvlBucket = deriveTvlBucket(tvlUsd);

  return {
    tvlUsd,
    tvlBucket,
    liquidityConfidence: deriveLiquidityConfidence(tvlBucket),
    source: resolvedSource,
  };
}

export function deriveLiquiditySignalsFromMarkets(
  markets: readonly ReadOnlyMarketOpportunity[],
  protocolId: string,
): LiquidityDerivedSignals {
  const tvlUsd = deriveProtocolTvlUsdFromMarkets(markets, protocolId);
  return deriveLiquiditySignalsFromTvl(tvlUsd);
}
