import { describe, expect, it } from "vitest";
import {
  generatePortfolioRecommendation,
  InvalidPortfolioValueError,
} from "./generatePortfolioRecommendation.js";
import { IntentValidationError } from "../intent/validateIntent.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("generatePortfolioRecommendation", () => {
  it("succeeds for a Balanced-like intent", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.selectedProfile).toBe("Balanced");
    expect(result.portfolioConstruction.positions.length).toBeGreaterThan(0);
    expect(result.diagnostics.pipelineSteps).toHaveLength(10);
  });

  it("succeeds for a Conservative-like intent", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 1, liquidity: 10, returnPreference: 2 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.selectedProfile).toBe("Conservative");
    expect(result.policy.riskLimits.minTrustScore).toBe(85);
  });

  it("succeeds for a Yield Focused-like intent", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 8, liquidity: 5, returnPreference: 10 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.selectedProfile).toBe("Yield Focused");
    expect(result.opportunityRanking.ranked.length).toBeGreaterThan(0);
  });

  it("fails for invalid intent", () => {
    expect(() =>
      generatePortfolioRecommendation({
        intent: { risk: 0, liquidity: 8, returnPreference: 4 },
        portfolioValueUsd: 10_000,
        asOf,
      }),
    ).toThrow(IntentValidationError);
  });

  it("fails for invalid portfolioValueUsd", () => {
    expect(() =>
      generatePortfolioRecommendation({
        intent: { risk: 3, liquidity: 8, returnPreference: 4 },
        portfolioValueUsd: 0,
        asOf,
      }),
    ).toThrow(InvalidPortfolioValueError);
  });

  it("includes policy in the result", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.policy.selectedProfile).toBe(result.selectedProfile);
    expect(result.policy.policyVersion).toBeGreaterThan(0);
  });

  it("includes trustScores in the result", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.trustScores).toHaveLength(result.opportunities.length);
    expect(result.trustScores[0]?.trust.trustScore).toBeGreaterThan(0);
  });

  it("includes liquidityScores in the result", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.liquidityScores).toHaveLength(result.opportunities.length);
    expect(result.liquidityScores[0]?.liquidity.liquidityScore).toBeGreaterThan(0);
  });

  it("includes riskAssessments in the result", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.riskAssessments).toHaveLength(result.opportunities.length);
    expect(result.riskAssessments[0]?.assessment.decision).toBeDefined();
  });

  it("includes opportunityRanking in the result", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.opportunityRanking.ranked.length).toBeGreaterThan(0);
    expect(result.opportunityRanking.rejected.length).toBeGreaterThan(0);
  });

  it("includes portfolioConstruction in the result", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.portfolioConstruction.positions.length).toBeGreaterThan(0);
    expect(result.portfolioConstruction.metadata.totalWeight).toBe(1);
  });

  it("handles empty candidate universe when ranking has no eligible items", () => {
    const result = generatePortfolioRecommendation({
      intent: { risk: 1, liquidity: 10, returnPreference: 2 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.opportunityRanking.ranked).toHaveLength(0);
    expect(
      result.portfolioConstruction.constructionSteps.some(
        (step) => step.id === "emptyCandidateUniverse",
      ),
    ).toBe(true);
    expect(result.portfolioConstruction.metadata.strategyWeight).toBe(0);
    expect(result.diagnostics.warnings.length).toBeGreaterThan(0);

    const total = result.portfolioConstruction.positions.reduce(
      (sum, position) => sum + position.weight,
      0,
    );
    expect(total).toBe(1);
  });

});
