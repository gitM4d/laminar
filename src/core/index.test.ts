import { describe, expect, it } from "vitest";
import {
  createLaminarRecommendation,
  IntentValidationError,
  InvalidPortfolioValueError,
  type LaminarRecommendationResult,
  type MockExecutionPlan,
  type PortfolioRecommendationResult,
  type RecommendationSnapshot,
  type UserIntent,
} from "./index.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("createLaminarRecommendation", () => {
  it("returns recommendation, snapshot and executionPlan", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation).toBeDefined();
    expect(result.snapshot).toBeDefined();
    expect(result.executionPlan).toBeDefined();
  });

  it("works for valid Balanced input", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation.selectedProfile).toBe("Balanced");
    expect(result.snapshot.profile).toBe("Balanced");
    expect(result.executionPlan.summary.numberOfDeposits).toBeGreaterThan(0);
  });

  it("works for valid Conservative input", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 1, liquidity: 10, returnPreference: 2 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation.selectedProfile).toBe("Conservative");
    expect(result.snapshot.profile).toBe("Conservative");
    expect(
      result.executionPlan.warnings.some((w) => w.code === "noDepositSteps"),
    ).toBe(true);
  });

  it("works for valid Yield Focused input", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 8, liquidity: 5, returnPreference: 10 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation.selectedProfile).toBe("Yield Focused");
    expect(result.snapshot.profile).toBe("Yield Focused");
    expect(
      result.recommendation.opportunityRanking.ranked.length,
    ).toBeGreaterThan(0);
  });

  it("throws for invalid intent", () => {
    expect(() =>
      createLaminarRecommendation({
        intent: { risk: 0, liquidity: 8, returnPreference: 4 },
        portfolioValueUsd: 10_000,
        asOf,
      }),
    ).toThrow(IntentValidationError);
  });

  it("throws for invalid portfolioValueUsd", () => {
    expect(() =>
      createLaminarRecommendation({
        intent: { risk: 3, liquidity: 8, returnPreference: 4 },
        portfolioValueUsd: 0,
        asOf,
      }),
    ).toThrow(InvalidPortfolioValueError);
  });

  it("keeps snapshot and executionPlan consistent with recommendation", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.snapshot.profile).toBe(result.recommendation.selectedProfile);
    expect(result.snapshot.portfolioValueUsd).toBe(
      result.recommendation.diagnostics.portfolioValueUsd,
    );
    expect(result.snapshot.source.policyVersion).toBe(
      result.recommendation.policy.policyVersion,
    );

    const constructionPositions =
      result.recommendation.portfolioConstruction.positions;
    expect(result.snapshot.positions).toHaveLength(
      constructionPositions.length,
    );
    expect(result.executionPlan.steps).toHaveLength(
      constructionPositions.length,
    );

    for (let index = 0; index < constructionPositions.length; index += 1) {
      const position = constructionPositions[index];
      const snapshotPosition = result.snapshot.positions[index];
      const step = result.executionPlan.steps[index];

      expect(snapshotPosition?.weight).toBe(position?.weight);
      expect(step?.weight).toBe(position?.weight);
      expect(step?.amountUsd).toBeCloseTo((position?.weight ?? 0) * 10_000, 0);
    }

    expect(result.executionPlan.diagnostics.selectedProfile).toBe(
      result.recommendation.selectedProfile,
    );
    expect(result.executionPlan.summary.totalAmountUsd).toBeCloseTo(10_000, 0);
  });
});

describe("public core exports", () => {
  it("exports stable public types", () => {
    const intent: UserIntent = { risk: 3, liquidity: 8, returnPreference: 4 };
    const result: LaminarRecommendationResult = createLaminarRecommendation({
      intent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    const recommendation: PortfolioRecommendationResult = result.recommendation;
    const snapshot: RecommendationSnapshot = result.snapshot;
    const executionPlan: MockExecutionPlan = result.executionPlan;

    expect(recommendation.intent).toEqual(intent);
    expect(snapshot.profile).toBe(recommendation.selectedProfile);
    expect(executionPlan.diagnostics.source).toBe("mock");
  });
});
