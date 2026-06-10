import { describe, expect, it } from "vitest";
import { CombinedLaminarDataProvider } from "./CombinedLaminarDataProvider.js";
import { createAaveBaseLaminarDataProviderSnapshot } from "./AaveBaseLaminarDataProvider.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "./MorphoBaseLaminarDataProvider.js";
import { createMoonwellBaseLaminarDataProviderSnapshot } from "./MoonwellBaseLaminarDataProvider.js";
import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import { RecommendationDataConsistencyError } from "../recommendation/generatePortfolioRecommendation.js";
import { createLaminarRecommendation } from "../index.js";
import type { LaminarDataProvider } from "./types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");
const balancedIntent = { risk: 5, liquidity: 6, returnPreference: 5 };

/** Builds the three real providers in static-fallback mode — no network required. */
async function buildStaticProviders(): Promise<{
  aave: LaminarDataProvider;
  morpho: LaminarDataProvider;
  moonwell: LaminarDataProvider;
}> {
  const aave = await createAaveBaseLaminarDataProviderSnapshot({ env: {} });
  const morpho = await createMorphoBaseLaminarDataProviderSnapshot({
    disableApi: true,
  });
  const moonwell = await createMoonwellBaseLaminarDataProviderSnapshot({
    disableApi: true,
  });
  return { aave, morpho, moonwell };
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

// ─── Combined V2: Aave + Morpho + Moonwell ───────────────────────────────────

describe("CombinedLaminarDataProvider — Combined V2 (Aave + Morpho + Moonwell)", () => {
  it("combines all three real providers into a single universe", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);

    const ids = combined.discoverOpportunities().map((o) => o.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "aave-usdc-base",
        "morpho-usdc-base",
        "moonwell-usdc-base",
        "moonwell-eurc-base",
        "moonwell-dai-base",
      ]),
    );
  });

  it("opportunity count equals the sum of all sub-providers", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);

    const expected =
      aave.discoverOpportunities().length +
      morpho.discoverOpportunities().length +
      moonwell.discoverOpportunities().length;

    expect(combined.discoverOpportunities()).toHaveLength(expected);
    // 2 Aave + 3 Morpho + 3 Moonwell static markets.
    expect(combined.discoverOpportunities()).toHaveLength(8);
  });

  it("delegates Moonwell trust and liquidity lookups to the Moonwell sub-provider", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);

    const trust = combined.getTrustProfile("moonwell");
    expect(trust.protocolId).toBe("moonwell");
    expect(trust.protocolName).toBe("Moonwell");

    const liquidity = combined.getLiquidityProfile("moonwell-usdc-base");
    expect(liquidity.opportunityId).toBe("moonwell-usdc-base");
    expect(liquidity.hasLockup).toBe(false);
  });

  it("still resolves Aave and Morpho lookups alongside Moonwell", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);

    expect(combined.getTrustProfile("aave").protocolId).toBe("aave");
    expect(combined.getTrustProfile("morpho").protocolId).toBe("morpho");
    expect(combined.getLiquidityProfile("aave-usdc-base").opportunityId).toBe(
      "aave-usdc-base",
    );
    expect(combined.getLiquidityProfile("morpho-dai-base").opportunityId).toBe(
      "morpho-dai-base",
    );
  });

  it("includes all three protocol names in the display name", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);

    const info = combined.getProviderInfo();
    expect(info.providerName).toContain("Aave");
    expect(info.providerName).toContain("Morpho");
    expect(info.providerName).toContain("Moonwell");
  });

  it("createLaminarRecommendation works with the Combined V2 universe", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: combined,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "CombinedLaminarDataProvider",
    );
    expect(result.recommendation.diagnostics.opportunityCount).toBe(8);
    expect(result.snapshot.positions.length).toBeGreaterThan(0);
  });

  it("still throws on duplicate ids when Moonwell is included", async () => {
    const { aave, morpho, moonwell } = await buildStaticProviders();

    const duplicateOpportunity: Opportunity = {
      id: "moonwell-usdc-base",
      protocolId: "moonwell",
      protocolName: "Moonwell",
      asset: "USDC",
      chain: "Base",
      apy: 0.05,
      isExperimental: false,
      protocolRiskLevel: "medium",
      auditCount: 2,
      exposureCategory: "lending",
    };
    const fakeTrustProfile: ProtocolTrustProfile = {
      protocolId: "moonwell",
      protocolName: "Moonwell",
      protocolAgeYears: 4,
      tvlUsd: 60_000_000,
      audits: [],
      incidents: [],
      chainAdjustment: 0,
    };
    const fakeLiquidityProfile: OpportunityLiquidityProfile = {
      opportunityId: "moonwell-usdc-base",
      withdrawalSpeedBucket: "instant",
      withdrawalConstraintType: "none",
      redemptionReliabilityLevel: "high",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "instant",
      hasLockup: false,
    };

    const conflictingProvider = new MockLaminarDataProvider({
      opportunities: [duplicateOpportunity],
      trustProfiles: { moonwell: fakeTrustProfile },
      liquidityProfiles: { "moonwell-usdc-base": fakeLiquidityProfile },
    });

    expect(
      () =>
        new CombinedLaminarDataProvider([
          aave,
          morpho,
          moonwell,
          conflictingProvider,
        ]),
    ).toThrow(RecommendationDataConsistencyError);
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
