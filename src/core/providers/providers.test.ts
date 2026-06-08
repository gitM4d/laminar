import { describe, expect, it } from "vitest";
import {
  createLaminarRecommendation,
  MockLaminarDataProvider,
} from "../index.js";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import {
  generatePortfolioRecommendation,
  RecommendationDataConsistencyError,
} from "../recommendation/generatePortfolioRecommendation.js";
import { MOCK_OPPORTUNITY_LIQUIDITY_PROFILES } from "../liquidity/mockOpportunityLiquidityProfiles.js";
import { MOCK_PROTOCOL_TRUST_PROFILES } from "../trust/mockProtocolTrustProfiles.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const balancedInput = {
  intent: { risk: 5, liquidity: 6, returnPreference: 5 },
  portfolioValueUsd: 10_000,
  asOf,
};

function summarizeRecommendation(
  result: ReturnType<typeof generatePortfolioRecommendation>,
) {
  return {
    selectedProfile: result.selectedProfile,
    opportunityIds: result.opportunities.map((opportunity) => opportunity.id),
    rankedIds: result.opportunityRanking.ranked.map(
      (entry) => entry.opportunityId,
    ),
    strategyIds: result.portfolioConstruction.positions
      .filter((position) => position.type === "strategy")
      .map((position) => position.opportunityId),
    strategyWeight: result.portfolioConstruction.metadata.strategyWeight,
  };
}

describe("Laminar data providers", () => {
  it("default provider produces the same Balanced recommendation as before", () => {
    const implicit = generatePortfolioRecommendation(balancedInput);
    const explicit = generatePortfolioRecommendation({
      ...balancedInput,
      dataProvider: new MockLaminarDataProvider(),
    });

    expect(summarizeRecommendation(explicit)).toEqual(
      summarizeRecommendation(implicit),
    );
  });

  it("custom provider can override opportunities", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const provider = new MockLaminarDataProvider({
      opportunities: [morpho as NonNullable<typeof morpho>],
    });

    const result = generatePortfolioRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]?.id).toBe("morpho-usdc-base");
    expect(
      result.portfolioConstruction.positions.some(
        (position) =>
          position.type === "strategy" &&
          position.opportunityId === "morpho-usdc-base",
      ),
    ).toBe(true);
  });

  it("throws RecommendationDataConsistencyError when trust profile is missing", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const provider = new MockLaminarDataProvider({
      opportunities: [morpho as NonNullable<typeof morpho>],
      trustProfiles: {},
      liquidityProfiles: MOCK_OPPORTUNITY_LIQUIDITY_PROFILES,
    });

    expect(() =>
      generatePortfolioRecommendation({
        ...balancedInput,
        dataProvider: provider,
      }),
    ).toThrow(RecommendationDataConsistencyError);
  });

  it("throws RecommendationDataConsistencyError when liquidity profile is missing", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const provider = new MockLaminarDataProvider({
      opportunities: [morpho as NonNullable<typeof morpho>],
      trustProfiles: MOCK_PROTOCOL_TRUST_PROFILES,
      liquidityProfiles: {},
    });

    expect(() =>
      generatePortfolioRecommendation({
        ...balancedInput,
        dataProvider: provider,
      }),
    ).toThrow(RecommendationDataConsistencyError);
  });

  it("uses provider in generatePortfolioRecommendation", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const provider = new MockLaminarDataProvider({
      opportunities: [morpho as NonNullable<typeof morpho>],
    });

    const result = generatePortfolioRecommendation({
      ...balancedInput,
      dataProvider: provider,
    });

    expect(result.opportunities).toEqual(provider.discoverOpportunities());
  });

  it("createLaminarRecommendation still works without provider", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.snapshot.profile).toBe("Balanced");
    expect(result.executionPlan).toBeDefined();
    expect(result.recommendation.opportunities.length).toBeGreaterThan(0);
  });

  it("createLaminarRecommendation forwards an optional provider", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const provider = new MockLaminarDataProvider({
      opportunities: [morpho as NonNullable<typeof morpho>],
    });

    const result = createLaminarRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.recommendation.opportunities).toHaveLength(1);
    expect(result.recommendation.opportunities[0]?.id).toBe("morpho-usdc-base");
  });
});
