import { describe, expect, it } from "vitest";
import {
  collectLiquidityDerivedSignals,
  resolveLiquidityDiagnostics,
} from "./collectLiquidityDerivedSignals.js";
import type { LiquidityDerivedSignals } from "./deriveLiquiditySignals.js";
import type { LaminarDataProvider } from "../providers/types.js";
import type { Opportunity } from "../opportunity/types.js";

const opportunities: Opportunity[] = [
  {
    id: "aave-usdc-base",
    protocolId: "aave",
    protocolName: "Aave",
    asset: "USDC",
    chain: "Base",
    apy: 0.05,
    isExperimental: false,
    protocolRiskLevel: "low",
    auditCount: 2,
    exposureCategory: "lending",
  },
];

function buildProvider(
  signals?: Record<string, LiquidityDerivedSignals>,
): LaminarDataProvider {
  return {
    discoverOpportunities: () => opportunities,
    getTrustProfile: () => {
      throw new Error("not used");
    },
    getLiquidityProfile: () => {
      throw new Error("not used");
    },
    ...(signals !== undefined
      ? {
          getLiquidityDerivedSignals: (protocolId: string) =>
            signals[protocolId],
        }
      : {}),
  };
}

describe("collectLiquidityDerivedSignals", () => {
  it("returns empty array when provider does not expose derived signals", () => {
    expect(collectLiquidityDerivedSignals(opportunities, buildProvider())).toEqual(
      [],
    );
  });

  it("collects derived signals per protocol from the provider", () => {
    const signals = collectLiquidityDerivedSignals(
      opportunities,
      buildProvider({
        aave: {
          tvlUsd: 183_000_000,
          tvlBucket: "high",
          liquidityConfidence: "high",
          source: "real-market-data",
        },
      }),
    );

    expect(signals).toEqual([
      {
        protocolId: "aave",
        protocolName: "Aave",
        tvlUsd: 183_000_000,
        tvlBucket: "high",
        liquidityConfidence: "high",
        source: "real-market-data",
      },
    ]);
  });
});

describe("resolveLiquidityDiagnostics", () => {
  it("reports unavailable when no real-market signals exist", () => {
    expect(
      resolveLiquidityDiagnostics([
        {
          protocolId: "aave",
          protocolName: "Aave",
          tvlUsd: null,
          tvlBucket: "unknown",
          liquidityConfidence: "unknown",
          source: "curated-fallback",
        },
      ]),
    ).toEqual({ liquiditySignalsAvailable: false });
  });

  it("reports available sources for real-market signals", () => {
    expect(
      resolveLiquidityDiagnostics([
        {
          protocolId: "aave",
          protocolName: "Aave",
          tvlUsd: 183_000_000,
          tvlBucket: "high",
          liquidityConfidence: "high",
          source: "real-market-data",
        },
        {
          protocolId: "morpho",
          protocolName: "Morpho",
          tvlUsd: 444_000_000,
          tvlBucket: "high",
          liquidityConfidence: "high",
          source: "real-market-data",
        },
      ]),
    ).toEqual({
      liquiditySignalsAvailable: true,
      liquiditySignalSources: ["Aave", "Morpho"],
    });
  });
});
