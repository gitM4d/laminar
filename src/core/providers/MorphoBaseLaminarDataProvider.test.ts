import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import {
  createMorphoBaseLaminarDataProviderSnapshot,
  MORPHO_BASE_CURATED_TRUST_PROFILE,
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
} from "./MorphoBaseLaminarDataProvider.js";
import type {
  MorphoApiClient,
  MorphoApiVaultsResponse,
} from "../../adapters/morpho/morphoTypes.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");
const balancedIntent = { risk: 5, liquidity: 6, returnPreference: 5 };

const sampleVaultsResponse: MorphoApiVaultsResponse = {
  vaults: {
    items: [
      {
        address: "0xUSDCVAULT",
        name: "Morpho USDC Vault",
        asset: { symbol: "USDC", decimals: 6 },
        state: { netApy: 0.0612, totalAssetsUsd: 95_000_000 },
      },
      {
        address: "0xEURCVAULT",
        name: "Morpho EURC Vault",
        asset: { symbol: "EURC", decimals: 6 },
        state: { netApy: 0.0421, totalAssetsUsd: 12_000_000 },
      },
    ],
  },
};

function buildApiClient(response: MorphoApiVaultsResponse): MorphoApiClient {
  return {
    query: async <T>() => response as T,
  };
}

describe("MorphoBaseLaminarDataProvider", () => {
  it("exposes opportunities from the static fallback snapshot", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      disableApi: true,
      now: () => asOf,
    });

    const opportunities = provider.discoverOpportunities();

    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities.every((o) => o.protocolId === "morpho")).toBe(true);
    expect(provider.getProviderInfo?.()).toEqual({
      providerType: "MorphoBaseLaminarDataProvider",
      providerName: "Morpho Base (experimental)",
    });
  });

  it("exposes API-sourced opportunities when the API is reachable", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient(sampleVaultsResponse),
      now: () => asOf,
    });

    const opportunities = provider.discoverOpportunities();
    const usdc = opportunities.find((o) => o.asset === "USDC");

    expect(usdc?.apy).toBe(0.0612);
    expect(usdc?.protocolRiskLevel).toBe("medium");
  });

  it("provides curated trust and liquidity profiles for every opportunity", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      disableApi: true,
      now: () => asOf,
    });

    const trust = provider.getTrustProfile("morpho");
    expect(trust.tvlUsd).toBe(MORPHO_BASE_CURATED_TRUST_PROFILE.tvlUsd);
    expect(trust.tvlSource).toBe("curated-fallback");

    for (const opportunity of provider.discoverOpportunities()) {
      const liquidity = provider.getLiquidityProfile(opportunity.id);
      expect(liquidity.opportunityId).toBe(opportunity.id);
      expect(liquidity.hasLockup).toBe(false);
    }
  });

  it("derives trust TVL from real API market TVLs when the API is reachable", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient(sampleVaultsResponse),
      now: () => asOf,
    });

    const trust = provider.getTrustProfile("morpho");
    expect(trust.tvlSource).toBe("real-provider-markets");
    expect(trust.tvlUsd).toBe(107_000_000);
  });

  it("exposes Morpho trust explanation without changing the trust score", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      disableApi: true,
      now: () => asOf,
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    const explanation = result.recommendation.trustExplanations.find(
      (entry) => entry.protocolId === "morpho",
    );
    const trustScore = result.recommendation.trustScores.find(
      (entry) => entry.protocolId === "morpho",
    )?.trust.trustScore;

    expect(explanation?.trustScore).toBe(trustScore);
    expect(explanation?.trustExplanation.auditTier).toBe("tier1");
    expect(explanation?.trustExplanation.auditCount).toBe(
      MORPHO_BASE_CURATED_TRUST_PROFILE.audits.length,
    );
  });

  it("throws a consistency error for an unknown trust profile", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      disableApi: true,
      now: () => asOf,
    });

    expect(() => provider.getTrustProfile("unknown-protocol")).toThrow(
      UnknownProtocolTrustProfileError,
    );
  });

  it("throws a consistency error for an unknown liquidity profile", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      disableApi: true,
      now: () => asOf,
    });

    expect(() => provider.getLiquidityProfile("unknown-opportunity")).toThrow(
      UnknownOpportunityLiquidityProfileError,
    );
  });

  it("works with createLaminarRecommendation (synchronous pipeline)", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient(sampleVaultsResponse),
      now: () => asOf,
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "MorphoBaseLaminarDataProvider",
    );
    expect(result.snapshot.positions.length).toBeGreaterThan(0);
    expect(result.executionPlan).toBeDefined();

    const strategyApy = result.snapshot.metrics.find(
      (m) => m.key === "strategyExpectedApy",
    );
    expect(Number(strategyApy?.value)).toBeGreaterThan(0);
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
