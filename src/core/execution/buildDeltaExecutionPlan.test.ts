import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import {
  buildDeltaExecutionPlan,
  buildDeltaExecutionSummary,
  calculateDeltaTolerance,
  deltaStepHasForbiddenTransactionField,
  getCurrentStrategyAmountUsd,
} from "./buildDeltaExecutionPlan.js";
import { createRecommendationSnapshot } from "../snapshot/createRecommendationSnapshot.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function balancedRecommendation(portfolioValueUsd = 10_000) {
  return createLaminarRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd,
    asOf,
  });
}

function strategyPositions(result: ReturnType<typeof balancedRecommendation>) {
  return result.recommendation.portfolioConstruction.positions.filter(
    (position) => position.type === "strategy",
  );
}

describe("buildDeltaExecutionPlan", () => {
  it("returns no delta plan when currentPortfolio is absent from createLaminarRecommendation", () => {
    const baseline = balancedRecommendation();

    expect(baseline.deltaExecutionPlan).toBeUndefined();
    expect(baseline.recommendation.diagnostics.deltaExecutionPlanAvailable).toBe(
      false,
    );
    expect(baseline.snapshot.deltaExecutionSummary).toBeUndefined();
  });

  it("keeps target recommendation unchanged when currentPortfolio is provided", () => {
    const baseline = balancedRecommendation();
    const withCurrent = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
      currentPortfolio: [
        {
          type: "strategy",
          protocolId: "aave",
          protocolName: "Aave",
          opportunityId: "aave-usdc-base",
          asset: "USDC",
          amountUsd: 5_000,
        },
        { type: "wallet", asset: "USDC", amountUsd: 3_000 },
        { type: "liquidityBuffer", asset: "USDC", amountUsd: 2_000 },
      ],
    });

    expect(withCurrent.recommendation.portfolioConstruction).toEqual(
      baseline.recommendation.portfolioConstruction,
    );
    expect(withCurrent.recommendation.opportunityRanking).toEqual(
      baseline.recommendation.opportunityRanking,
    );
    expect(withCurrent.deltaExecutionPlan?.available).toBe(true);
    expect(withCurrent.recommendation.diagnostics.deltaExecutionPlanAvailable).toBe(
      true,
    );
  });

  it("creates noAction when current matches target within tolerance", () => {
    const result = balancedRecommendation();
    const target = strategyPositions(result)[0]!;

    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [
        {
          type: "strategy",
          protocolId: target.protocolId,
          protocolName: target.protocolName,
          opportunityId: target.opportunityId,
          asset: target.asset,
          amountUsd: target.weight * 10_000,
        },
      ],
    });

    const step = delta.steps.find(
      (entry) => entry.opportunityId === target.opportunityId,
    );

    expect(step?.action).toBe("noAction");
    expect(step?.amountUsd).toBe(0);
  });

  it("creates supply when current strategy is underweight", () => {
    const result = balancedRecommendation();
    const target = strategyPositions(result)[0]!;
    const targetUsd = target.weight * 10_000;
    const currentUsd = targetUsd - 500;

    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [
        {
          type: "strategy",
          protocolId: target.protocolId,
          protocolName: target.protocolName,
          opportunityId: target.opportunityId,
          asset: target.asset,
          amountUsd: currentUsd,
        },
      ],
    });

    const step = delta.steps.find(
      (entry) => entry.opportunityId === target.opportunityId,
    );

    expect(step?.action).toBe("supply");
    expect(step?.amountUsd).toBeCloseTo(500, 0);
  });

  it("creates withdraw when current strategy is overweight", () => {
    const result = balancedRecommendation();
    const target = strategyPositions(result)[0]!;
    const targetUsd = target.weight * 10_000;
    const currentUsd = targetUsd + 750;

    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [
        {
          type: "strategy",
          protocolId: target.protocolId,
          protocolName: target.protocolName,
          opportunityId: target.opportunityId,
          asset: target.asset,
          amountUsd: currentUsd,
        },
      ],
    });

    const step = delta.steps.find(
      (entry) => entry.opportunityId === target.opportunityId,
    );

    expect(step?.action).toBe("withdraw");
    expect(step?.amountUsd).toBeCloseTo(750, 0);
  });

  it("matches current strategy by opportunityId", () => {
    const result = balancedRecommendation();
    const target = strategyPositions(result)[0]!;

    const amount = getCurrentStrategyAmountUsd(target, [
      {
        type: "strategy",
        opportunityId: target.opportunityId,
        asset: "USDC",
        amountUsd: 1_234,
      },
    ]);

    expect(amount).toBe(1_234);
  });

  it("matches current strategy by protocolId and asset when opportunityId is absent", () => {
    const result = balancedRecommendation();
    const target = strategyPositions(result)[0]!;

    const amount = getCurrentStrategyAmountUsd(target, [
      {
        type: "strategy",
        protocolId: target.protocolId,
        asset: target.asset,
        amountUsd: 2_345,
      },
    ]);

    expect(amount).toBe(2_345);
  });

  it("adds hold step when liquidity buffer is below target", () => {
    const result = balancedRecommendation();
    const buffer = result.recommendation.portfolioConstruction.positions.find(
      (position) => position.type === "liquidityBuffer",
    );
    expect(buffer).toBeDefined();

    const targetBufferUsd = (buffer?.weight ?? 0) * 10_000;
    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [
        { type: "wallet", asset: buffer!.asset, amountUsd: 100 },
      ],
    });

    const holdStep = delta.steps.find((step) => step.action === "hold");
    expect(holdStep).toBeDefined();
    expect(holdStep?.amountUsd).toBeCloseTo(targetBufferUsd - 100, 0);
  });

  it("adds reserve step when gas reserve is below target", () => {
    const result = balancedRecommendation();
    const gas = result.recommendation.portfolioConstruction.positions.find(
      (position) => position.type === "gasReserve",
    );
    expect(gas).toBeDefined();

    const targetGasUsd = (gas?.weight ?? 0) * 10_000;
    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [],
    });

    const reserveStep = delta.steps.find((step) => step.action === "reserve");
    expect(reserveStep).toBeDefined();
    expect(reserveStep?.amountUsd).toBeCloseTo(targetGasUsd, 0);
  });

  it("adds warning when current portfolio value differs from target", () => {
    const result = balancedRecommendation();
    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [{ type: "wallet", asset: "USDC", amountUsd: 8_000 }],
    });

    expect(delta.warnings).toContain(
      "Current portfolio value differs from target portfolio value.",
    );
  });

  it("marks all delta steps informationalOnly and excludes transaction fields", () => {
    const result = balancedRecommendation();
    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [{ type: "wallet", asset: "USDC", amountUsd: 10_000 }],
    });

    for (const step of delta.steps) {
      expect(step.informationalOnly).toBe(true);
      expect(deltaStepHasForbiddenTransactionField(step)).toBeNull();
    }

    expect(delta.informationalOnly).toBe(true);
  });

  it("builds snapshot delta summary", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
      currentPortfolio: [
        {
          type: "strategy",
          protocolId: "aave",
          protocolName: "Aave",
          opportunityId: "aave-usdc-base",
          asset: "USDC",
          amountUsd: 5_000,
        },
        { type: "wallet", asset: "USDC", amountUsd: 3_000 },
      ],
    });

    const summary = buildDeltaExecutionSummary(result.deltaExecutionPlan);
    expect(summary).toMatchObject({
      available: true,
      numberOfSteps: result.deltaExecutionPlan?.steps.length,
      netDeltaUsd: result.deltaExecutionPlan?.netDeltaUsd,
    });
    expect(result.snapshot.deltaExecutionSummary).toEqual(summary);

    if (result.deltaExecutionPlan !== undefined) {
      const snapshotOnly = createRecommendationSnapshot(result.recommendation, {
        deltaExecutionPlan: result.deltaExecutionPlan,
      });
      expect(snapshotOnly.deltaExecutionSummary).toEqual(summary);
    }
  });

  it("uses tolerance of $1 or 0.01% of portfolio value, whichever is larger", () => {
    expect(calculateDeltaTolerance(10_000)).toBe(1);
    expect(calculateDeltaTolerance(100_000)).toBe(10);
  });
});

describe("buildDeltaExecutionPlan matching by protocolName", () => {
  it("matches current strategy by protocolName and asset", () => {
    const result = balancedRecommendation();
    const target = strategyPositions(result).find(
      (position) => position.protocolName === "Morpho",
    );
    expect(target).toBeDefined();

    const amount = getCurrentStrategyAmountUsd(target!, [
      {
        type: "strategy",
        protocolName: target!.protocolName,
        asset: target!.asset,
        amountUsd: 999,
      },
    ]);

    expect(amount).toBe(999);
  });
});

describe("buildDeltaExecutionPlan unmatched current strategy", () => {
  it("withdraws current strategy positions not present in target", () => {
    const result = balancedRecommendation();
    const delta = buildDeltaExecutionPlan({
      recommendation: result.recommendation,
      currentPortfolio: [
        {
          type: "strategy",
          protocolId: "legacy",
          protocolName: "Legacy",
          asset: "USDC",
          amountUsd: 500,
        },
      ],
    });

    const withdrawStep = delta.steps.find(
      (step) => step.protocolName === "Legacy" && step.action === "withdraw",
    );
    expect(withdrawStep?.amountUsd).toBe(500);
  });
});
