import { describe, expect, it } from "vitest";
import { CombinedLaminarDataProvider } from "./CombinedLaminarDataProvider.js";
import { createAaveBaseLaminarDataProviderSnapshot } from "./AaveBaseLaminarDataProvider.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "./MorphoBaseLaminarDataProvider.js";
import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import { RecommendationDataConsistencyError } from "../recommendation/generatePortfolioRecommendation.js";
import { createLaminarRecommendation } from "../index.js";
import type { LaminarDataProvider } from "./types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");
const balancedIntent = { risk: 5, liquidity: 6, returnPreference: 5 };

/** Builds the two real providers in static-fallback mode — no network required. */
async function buildStaticProviders(): Promise<{
  aave: LaminarDataProvider;
  morpho: LaminarDataProvider;
}> {
  const aave = await createAaveBaseLaminarDataProviderSnapshot({ env: {} });
  const morpho = await createMorphoBaseLaminarDataProviderSnapshot({
    disableApi: true,
  });
  return { aave, morpho };
}

// ─── discoverOpportunities ───────────────────────────────────────────────────

describe("CombinedLaminarDataProvider — discoverOpportunities", () => {
  it("combines Aave + Morpho opportunities into a single list", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const ids = combined.discoverOpportunities().map((o) => o.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "aave-usdc-base",
        "aave-eurc-base",
        "morpho-usdc-base",
        "morpho-eurc-base",
        "morpho-dai-base",
      ]),
    );
    // All five static opportunities (2 Aave + 3 Morpho) should be present.
    expect(ids.length).toBe(5);
  });

  it("preserves the original ordering (Aave first, Morpho second)", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const ids = combined.discoverOpportunities().map((o) => o.id);

    expect(ids.indexOf("aave-usdc-base")).toBeLessThan(
      ids.indexOf("morpho-usdc-base"),
    );
  });
});

// ─── getTrustProfile ─────────────────────────────────────────────────────────

describe("CombinedLaminarDataProvider — getTrustProfile", () => {
  it("delegates Aave trust profile to the Aave sub-provider", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const trust = combined.getTrustProfile("aave");

    expect(trust.protocolId).toBe("aave");
    expect(trust.protocolName).toBe("Aave");
  });

  it("delegates Morpho trust profile to the Morpho sub-provider", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const trust = combined.getTrustProfile("morpho");

    expect(trust.protocolId).toBe("morpho");
    expect(trust.protocolName).toBe("Morpho");
  });

  it("throws RecommendationDataConsistencyError for an unknown protocol", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    expect(() => combined.getTrustProfile("unknown-protocol")).toThrow(
      RecommendationDataConsistencyError,
    );
  });
});

// ─── getLiquidityProfile ─────────────────────────────────────────────────────

describe("CombinedLaminarDataProvider — getLiquidityProfile", () => {
  it("resolves Aave liquidity profile from the Aave sub-provider", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const profile = combined.getLiquidityProfile("aave-usdc-base");

    expect(profile.opportunityId).toBe("aave-usdc-base");
    expect(profile.hasLockup).toBe(false);
  });

  it("resolves Morpho liquidity profile from the Morpho sub-provider", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const profile = combined.getLiquidityProfile("morpho-usdc-base");

    expect(profile.opportunityId).toBe("morpho-usdc-base");
    expect(profile.hasLockup).toBe(false);
  });

  it("throws RecommendationDataConsistencyError for an unknown opportunity", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    expect(() => combined.getLiquidityProfile("unknown-opportunity")).toThrow(
      RecommendationDataConsistencyError,
    );
  });
});

// ─── getProviderInfo ─────────────────────────────────────────────────────────

describe("CombinedLaminarDataProvider — getProviderInfo", () => {
  it("reports CombinedLaminarDataProvider type", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const info = combined.getProviderInfo();

    expect(info.providerType).toBe("CombinedLaminarDataProvider");
  });

  it("includes sub-provider names in the display name", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const info = combined.getProviderInfo();

    expect(info.providerName).toContain("Aave");
    expect(info.providerName).toContain("Morpho");
  });
});

// ─── duplicate id guard ───────────────────────────────────────────────────────

describe("CombinedLaminarDataProvider — duplicate id guard", () => {
  it("throws RecommendationDataConsistencyError when two providers share an opportunity id", async () => {
    const { aave } = await buildStaticProviders();

    // Build a second provider that reuses the same ids as Aave.
    const duplicateOpportunity: Opportunity = {
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
    };

    const fakeTrustProfile: ProtocolTrustProfile = {
      protocolId: "aave",
      protocolName: "Aave",
      protocolAgeYears: 5,
      tvlUsd: 1_000_000_000,
      audits: [],
      incidents: [],
      chainAdjustment: 0,
    };

    const fakeLiquidityProfile: OpportunityLiquidityProfile = {
      opportunityId: "aave-usdc-base",
      withdrawalSpeedBucket: "instant",
      withdrawalConstraintType: "none",
      redemptionReliabilityLevel: "veryHigh",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "instant",
      hasLockup: false,
    };

    const conflictingProvider = new MockLaminarDataProvider({
      opportunities: [duplicateOpportunity],
      trustProfiles: { aave: fakeTrustProfile },
      liquidityProfiles: { "aave-usdc-base": fakeLiquidityProfile },
    });

    expect(
      () => new CombinedLaminarDataProvider([aave, conflictingProvider]),
    ).toThrow(RecommendationDataConsistencyError);
  });

  it("throws when constructed with no sub-providers", () => {
    expect(() => new CombinedLaminarDataProvider([])).toThrow(
      RecommendationDataConsistencyError,
    );
  });
});

// ─── integration ─────────────────────────────────────────────────────────────

describe("CombinedLaminarDataProvider — integration", () => {
  it("createLaminarRecommendation works with combined Aave + Morpho static providers", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: combined,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "CombinedLaminarDataProvider",
    );
    // 2 Aave + 3 Morpho static markets.
    expect(result.recommendation.diagnostics.opportunityCount).toBe(5);
    expect(result.snapshot.positions.length).toBeGreaterThan(0);
  });

  it("combined universe contains both Aave and Morpho opportunities", async () => {
    const { aave, morpho } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho]);

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: combined,
    });

    const ids = result.recommendation.opportunities.map((o) => o.id);
    expect(ids).toEqual(
      expect.arrayContaining(["aave-usdc-base", "morpho-usdc-base"]),
    );
  });

  it("mock remains the default provider (combined does not replace it)", () => {
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
