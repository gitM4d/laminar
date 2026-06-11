import { describe, expect, it } from "vitest";
import type { ReadOnlyMarketOpportunity } from "../../adapters/types.js";
import {
  buildProtocolTrustProfileWithDerivedTvl,
  deriveProtocolTvlUsdFromMarkets,
} from "./deriveProtocolTvl.js";
import type { ProtocolTrustProfile } from "../trust/types.js";

const curatedProfile: ProtocolTrustProfile = {
  protocolId: "aave",
  protocolName: "Aave",
  protocolAgeYears: 5,
  tvlUsd: 12_500_000_000,
  audits: [],
  incidents: [],
  chainAdjustment: 0,
};

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

describe("deriveProtocolTvlUsdFromMarkets", () => {
  it("sums only markets matching the protocol id", () => {
    const markets: ReadOnlyMarketOpportunity[] = [
      buildMarket({ id: "aave-usdc-base", asset: "USDC", tvlUsd: 180_000_000 }),
      buildMarket({ id: "aave-eurc-base", asset: "EURC", tvlUsd: 25_000_000 }),
      {
        ...buildMarket({ id: "morpho-usdc-base", asset: "USDC", tvlUsd: 95_000_000 }),
        protocolId: "morpho",
        protocolName: "Morpho",
        source: "morpho-api",
      },
    ];

    expect(deriveProtocolTvlUsdFromMarkets(markets, "aave")).toBe(205_000_000);
  });

  it("excludes static-placeholder markets", () => {
    const markets: ReadOnlyMarketOpportunity[] = [
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
    ];

    expect(deriveProtocolTvlUsdFromMarkets(markets, "aave")).toBeNull();
  });

  it("excludes invalid tvlUsd values", () => {
    const markets: ReadOnlyMarketOpportunity[] = [
      buildMarket({ id: "aave-usdc-base", asset: "USDC", tvlUsd: 0 }),
      buildMarket({ id: "aave-eurc-base", asset: "EURC", tvlUsd: Number.NaN }),
    ];

    expect(deriveProtocolTvlUsdFromMarkets(markets, "aave")).toBeNull();
  });

  it("returns null when no real eligible markets exist", () => {
    expect(deriveProtocolTvlUsdFromMarkets([], "aave")).toBeNull();
  });
});

describe("buildProtocolTrustProfileWithDerivedTvl", () => {
  it("uses derived TVL and marks real-provider-markets when eligible markets exist", () => {
    const profile = buildProtocolTrustProfileWithDerivedTvl(curatedProfile, [
      buildMarket({ id: "aave-usdc-base", asset: "USDC", tvlUsd: 180_000_000 }),
      buildMarket({ id: "aave-eurc-base", asset: "EURC", tvlUsd: 25_000_000 }),
    ]);

    expect(profile.tvlUsd).toBe(205_000_000);
    expect(profile.tvlSource).toBe("real-provider-markets");
    expect(profile.protocolAgeYears).toBe(curatedProfile.protocolAgeYears);
  });

  it("keeps curated fallback TVL when no eligible markets exist", () => {
    const profile = buildProtocolTrustProfileWithDerivedTvl(curatedProfile, [
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
    ]);

    expect(profile.tvlUsd).toBe(curatedProfile.tvlUsd);
    expect(profile.tvlSource).toBe("curated-fallback");
  });
});
