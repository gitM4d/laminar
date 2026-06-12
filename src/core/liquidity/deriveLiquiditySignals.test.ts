import { describe, expect, it } from "vitest";
import type { ReadOnlyMarketOpportunity } from "../../adapters/types.js";
import {
  deriveLiquidityConfidence,
  deriveLiquiditySignalsFromMarkets,
  deriveLiquiditySignalsFromTvl,
  deriveTvlBucket,
} from "./deriveLiquiditySignals.js";

function buildMarket(
  overrides: Partial<ReadOnlyMarketOpportunity> &
    Pick<ReadOnlyMarketOpportunity, "id" | "asset" | "tvlUsd">,
): ReadOnlyMarketOpportunity {
  return {
    protocolId: "aave",
    protocolName: "Aave",
    chain: "Base",
    apy: 0.05,
    exposureCategory: "lending",
    source: "rpc-reserve-discovery",
    fetchedAt: "2026-06-01T00:00:00.000Z",
    metadata: {
      reserveDiscovery: "on-chain",
      apySource: "aave-liquidity-rate",
      apyIsApproximation: true,
      tvlSource: "aave-atoken-supply",
    },
    ...overrides,
  };
}

describe("deriveTvlBucket", () => {
  it("classifies low, medium, and high TVL thresholds", () => {
    expect(deriveTvlBucket(5_000_000)).toBe("low");
    expect(deriveTvlBucket(10_000_000)).toBe("medium");
    expect(deriveTvlBucket(100_000_000)).toBe("medium");
    expect(deriveTvlBucket(100_000_001)).toBe("high");
  });

  it("returns unknown for null or invalid TVL", () => {
    expect(deriveTvlBucket(null)).toBe("unknown");
    expect(deriveTvlBucket(0)).toBe("unknown");
    expect(deriveTvlBucket(Number.NaN)).toBe("unknown");
  });
});

describe("deriveLiquidityConfidence", () => {
  it("maps TVL buckets to confidence levels", () => {
    expect(deriveLiquidityConfidence("high")).toBe("high");
    expect(deriveLiquidityConfidence("medium")).toBe("medium");
    expect(deriveLiquidityConfidence("low")).toBe("low");
    expect(deriveLiquidityConfidence("unknown")).toBe("unknown");
  });
});

describe("deriveLiquiditySignalsFromTvl", () => {
  it("marks real market data when TVL is available", () => {
    const signals = deriveLiquiditySignalsFromTvl(183_000_000);

    expect(signals.tvlUsd).toBe(183_000_000);
    expect(signals.tvlBucket).toBe("high");
    expect(signals.liquidityConfidence).toBe("high");
    expect(signals.source).toBe("real-market-data");
  });

  it("marks curated fallback when TVL is unavailable", () => {
    const signals = deriveLiquiditySignalsFromTvl(null, "curated-fallback");

    expect(signals.tvlBucket).toBe("unknown");
    expect(signals.liquidityConfidence).toBe("unknown");
    expect(signals.source).toBe("curated-fallback");
  });
});

describe("deriveLiquiditySignalsFromMarkets", () => {
  it("sums real eligible market TVL for a protocol", () => {
    const signals = deriveLiquiditySignalsFromMarkets(
      [
        buildMarket({ id: "aave-usdc-base", asset: "USDC", tvlUsd: 180_000_000 }),
        buildMarket({ id: "aave-eurc-base", asset: "EURC", tvlUsd: 3_000_000 }),
      ],
      "aave",
    );

    expect(signals.tvlUsd).toBe(183_000_000);
    expect(signals.tvlBucket).toBe("high");
    expect(signals.source).toBe("real-market-data");
  });

  it("excludes static placeholder markets", () => {
    const signals = deriveLiquiditySignalsFromMarkets(
      [
        buildMarket({
          id: "aave-usdc-base",
          asset: "USDC",
          tvlUsd: 180_000_000,
          source: "static-fallback",
          metadata: {
            reserveDiscovery: "static",
            apySource: "static-placeholder",
            apyIsApproximation: false,
            tvlSource: "static-placeholder",
          },
        }),
      ],
      "aave",
    );

    expect(signals.tvlUsd).toBeNull();
    expect(signals.source).toBe("curated-fallback");
  });
});
