import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import {
  createMoonwellBaseLaminarDataProviderSnapshot,
  MOONWELL_BASE_CURATED_TRUST_PROFILE,
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
} from "./MoonwellBaseLaminarDataProvider.js";
import type {
  MoonwellApiClient,
  MoonwellApiMarketsResponse,
} from "../../adapters/moonwell/moonwellTypes.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");
const balancedIntent = { risk: 5, liquidity: 6, returnPreference: 5 };
/**
 * Yield-focused intent. Moonwell's curated trust (~73.7) clears the Yield Focused
 * profile (minTrustScore 65) but not Balanced (75), so strategy allocations are
 * demonstrated under a yield-focused appetite.
 */
const yieldFocusedIntent = { risk: 8, liquidity: 3, returnPreference: 9 };

const sampleMarketsResponse: MoonwellApiMarketsResponse = {
  markets: [
    {
      marketAddress: "0xUSDCMARKET",
      underlyingSymbol: "USDC",
      underlyingDecimals: 6,
      supplyApy: 0.0512,
      totalSupplyUsd: 40_000_000,
    },
    {
      marketAddress: "0xDAIMARKET",
      underlyingSymbol: "DAI",
      underlyingDecimals: 18,
      supplyApy: 0.0431,
      totalSupplyUsd: 8_000_000,
    },
  ],
};

function buildApiClient(
  response: MoonwellApiMarketsResponse,
): MoonwellApiClient {
  return {
    getMarkets: async () => response,
  };
}

describe("MoonwellBaseLaminarDataProvider", () => {
  it("exposes opportunities from static fallback only when explicitly allowed", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });

    const opportunities = provider.discoverOpportunities();

    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities.every((o) => o.protocolId === "moonwell")).toBe(true);
    expect(provider.getProviderInfo?.()).toEqual({
      providerType: "MoonwellBaseLaminarDataProvider",
      providerName: "Moonwell Base (experimental)",
    });
  });

  it("excludes static placeholder markets when requireRealData is true", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      requireRealData: true,
      now: () => asOf,
    });

    expect(provider.discoverOpportunities()).toEqual([]);
  });

  it("exposes API-sourced opportunities when the API is reachable", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient(sampleMarketsResponse),
      now: () => asOf,
    });

    const opportunities = provider.discoverOpportunities();
    const usdc = opportunities.find((o) => o.asset === "USDC");

    expect(usdc?.apy).toBe(0.0512);
    expect(usdc?.protocolRiskLevel).toBe("medium");
  });

  it("provides curated trust and liquidity profiles for every opportunity", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });

    const trust = provider.getTrustProfile("moonwell");
    expect(trust).toEqual(MOONWELL_BASE_CURATED_TRUST_PROFILE);

    for (const opportunity of provider.discoverOpportunities()) {
      const liquidity = provider.getLiquidityProfile(opportunity.id);
      expect(liquidity.opportunityId).toBe(opportunity.id);
      expect(liquidity.hasLockup).toBe(false);
    }
  });

  it("exposes Moonwell trust explanation without changing the trust score", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });

    const result = createLaminarRecommendation({
      intent: yieldFocusedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    const explanation = result.recommendation.trustExplanations.find(
      (entry) => entry.protocolId === "moonwell",
    );
    const trustScore = result.recommendation.trustScores.find(
      (entry) => entry.protocolId === "moonwell",
    )?.trust.trustScore;

    expect(explanation?.trustScore).toBe(trustScore);
    expect(explanation?.trustExplanation.auditTier).toBe("tier2");
    expect(explanation?.trustExplanation.auditCount).toBe(
      MOONWELL_BASE_CURATED_TRUST_PROFILE.audits.length,
    );
    expect(explanation?.trustExplanation.tvlBucket).toBe("medium");
  });

  it("throws a consistency error for an unknown trust profile", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });

    expect(() => provider.getTrustProfile("unknown-protocol")).toThrow(
      UnknownProtocolTrustProfileError,
    );
  });

  it("throws a consistency error for an unknown liquidity profile", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });

    expect(() => provider.getLiquidityProfile("unknown-opportunity")).toThrow(
      UnknownOpportunityLiquidityProfileError,
    );
  });

  it("works with createLaminarRecommendation (synchronous pipeline)", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient(sampleMarketsResponse),
      now: () => asOf,
    });

    const result = createLaminarRecommendation({
      intent: yieldFocusedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "MoonwellBaseLaminarDataProvider",
    );
    expect(result.snapshot.positions.length).toBeGreaterThan(0);
    expect(result.executionPlan).toBeDefined();

    const strategyApy = result.snapshot.metrics.find(
      (m) => m.key === "strategyExpectedApy",
    );
    expect(Number(strategyApy?.value)).toBeGreaterThan(0);
  });

  it("is filtered out under a strict Balanced profile (curated trust below 75)", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient(sampleMarketsResponse),
      now: () => asOf,
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    // Moonwell's conservative curated trust (~73.7) is below the Balanced
    // minTrustScore (75); the engine correctly allocates to buffer/gas only.
    const strategyPositions = result.snapshot.positions.filter(
      (p) => p.type === "strategy",
    );
    expect(strategyPositions).toHaveLength(0);
  });

  it("does not switch the default provider (mock remains default)", () => {
    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "MockLaminarDataProvider",
    );
  });
});
