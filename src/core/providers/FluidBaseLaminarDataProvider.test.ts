import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import {
  createFluidBaseLaminarDataProviderSnapshot,
  FLUID_BASE_CURATED_TRUST_PROFILE,
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
} from "./FluidBaseLaminarDataProvider.js";
import type {
  FluidApiClient,
  FluidApiTokensResponse,
} from "../../adapters/fluid/fluidTypes.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");
const yieldFocusedIntent = { risk: 8, liquidity: 3, returnPreference: 9 };

const sampleTokensResponse: FluidApiTokensResponse = {
  data: [
    {
      address: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169",
      symbol: "fUSDC",
      decimals: 6,
      assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      asset: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        price: "1.0",
        chainId: "8453",
      },
      totalAssets: "9000000000000",
      totalSupply: "8000000000000",
      supplyRate: "465",
      totalRate: "465",
      rewardsRate: "0",
    },
  ],
};

function buildApiClient(
  response: FluidApiTokensResponse,
): FluidApiClient {
  return {
    getLendingTokens: async () => response,
  };
}

describe("FluidBaseLaminarDataProvider", () => {
  it("exposes zero opportunities when no real source is configured", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      disableApi: true,
      env: {},
      now: () => asOf,
    });

    expect(provider.discoverOpportunities()).toEqual([]);
    expect(provider.getProviderInfo?.()).toEqual({
      providerType: "FluidBaseLaminarDataProvider",
      providerName: "Fluid Base (experimental)",
    });
  });

  it("does not expose static dev fallback markets even with ALLOW_STATIC_MARKET_DATA", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      disableApi: true,
      env: { ALLOW_STATIC_MARKET_DATA: "true" },
      now: () => asOf,
    });

    expect(provider.discoverOpportunities()).toEqual([]);
  });

  it("exposes real API-sourced opportunities when the API is reachable", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      apiUrl: "https://example.invalid/fluid",
      client: buildApiClient(sampleTokensResponse),
      now: () => asOf,
    });

    const opportunities = provider.discoverOpportunities();
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.asset).toBe("USDC");
    expect(opportunities[0]?.protocolId).toBe("fluid");
  });

  it("provides curated trust and liquidity profiles only for real opportunities", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      apiUrl: "https://example.invalid/fluid",
      client: buildApiClient(sampleTokensResponse),
      now: () => asOf,
    });

    expect(provider.getTrustProfile("fluid")).toEqual(
      FLUID_BASE_CURATED_TRUST_PROFILE,
    );

    for (const opportunity of provider.discoverOpportunities()) {
      const liquidity = provider.getLiquidityProfile(opportunity.id);
      expect(liquidity.opportunityId).toBe(opportunity.id);
      expect(liquidity.hasLockup).toBe(false);
    }
  });

  it("throws when trust profile is requested without real opportunities", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      disableApi: true,
      env: {},
    });

    expect(() => provider.getTrustProfile("fluid")).toThrow(
      UnknownProtocolTrustProfileError,
    );
  });

  it("throws when liquidity profile is requested without real opportunities", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      disableApi: true,
      env: {},
    });

    expect(() => provider.getLiquidityProfile("fluid-usdc-base")).toThrow(
      UnknownOpportunityLiquidityProfileError,
    );
  });

  it("works with createLaminarRecommendation when real data exists", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      apiUrl: "https://example.invalid/fluid",
      client: buildApiClient(sampleTokensResponse),
      now: () => asOf,
    });

    const result = createLaminarRecommendation({
      intent: yieldFocusedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "FluidBaseLaminarDataProvider",
    );
    expect(result.recommendation.diagnostics.opportunityCount).toBe(1);
    expect(result.snapshot.positions.length).toBeGreaterThan(0);
  });

  it("does not generate recommendations from unavailable provider snapshots", async () => {
    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      disableApi: true,
      env: {},
      now: () => asOf,
    });

    expect(provider.discoverOpportunities()).toEqual([]);
  });
});
