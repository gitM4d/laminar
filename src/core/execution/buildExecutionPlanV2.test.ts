import { describe, expect, it } from "vitest";
import { generatePortfolioRecommendation } from "../recommendation/generatePortfolioRecommendation.js";
import {
  buildExecutionPlanV2,
  buildExecutionSummary,
} from "./buildExecutionPlanV2.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function balancedRecommendation(portfolioValueUsd = 10_000) {
  return generatePortfolioRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd,
    asOf,
  });
}

const FORBIDDEN_TRANSACTION_FIELDS = [
  "txHash",
  "transactionHash",
  "calldata",
  "data",
  "to",
  "from",
  "nonce",
  "gasLimit",
  "gasPrice",
  "chainId",
  "signature",
] as const;

describe("buildExecutionPlanV2", () => {
  it("creates a prepareFunds step", () => {
    const recommendation = balancedRecommendation();
    const steps = buildExecutionPlanV2({ recommendation });

    expect(steps[0]).toMatchObject({
      action: "prepareFunds",
      amountUsd: 10_000,
      informationalOnly: true,
    });
    expect(steps[0]?.description).toContain("$10,000");
    expect(steps[0]?.description).toContain("Base");
  });

  it("creates supply steps for each strategy position", () => {
    const recommendation = balancedRecommendation();
    const steps = buildExecutionPlanV2({ recommendation });
    const supplySteps = steps.filter((step) => step.action === "supply");
    const strategyCount = recommendation.portfolioConstruction.positions.filter(
      (position) => position.type === "strategy",
    ).length;

    expect(supplySteps).toHaveLength(strategyCount);
    expect(supplySteps[0]?.description).toMatch(/^Supply \$.* to .+\.$/);
    expect(supplySteps.every((step) => step.informationalOnly)).toBe(true);
  });

  it("creates a liquidity buffer step", () => {
    const steps = buildExecutionPlanV2({
      recommendation: balancedRecommendation(),
    });
    const bufferStep = steps.find(
      (step) => step.action === "holdLiquidityBuffer",
    );

    expect(bufferStep).toMatchObject({
      action: "holdLiquidityBuffer",
      asset: "USDC",
      informationalOnly: true,
    });
    expect(bufferStep?.description).toContain("liquidity buffer");
  });

  it("creates a gas reserve step", () => {
    const steps = buildExecutionPlanV2({
      recommendation: balancedRecommendation(),
    });
    const gasStep = steps.find((step) => step.action === "holdGasReserve");

    expect(gasStep).toMatchObject({
      action: "holdGasReserve",
      asset: "USDC",
      informationalOnly: true,
    });
    expect(gasStep?.description).toContain("gas and operational expenses");
  });

  it("calculates amountUsd from position weight and portfolio value", () => {
    const recommendation = balancedRecommendation();
    const steps = buildExecutionPlanV2({ recommendation });
    const morphoStep = steps.find(
      (step) =>
        step.action === "supply" && step.protocolName === "Morpho",
    );
    const morphoPosition = recommendation.portfolioConstruction.positions.find(
      (position) =>
        position.type === "strategy" &&
        position.protocolName === "Morpho",
    );

    expect(morphoStep?.amountUsd).toBe(
      Number(((morphoPosition?.weight ?? 0) * 10_000).toFixed(2)),
    );
  });

  it("builds snapshot execution summary", () => {
    const recommendation = balancedRecommendation();
    const summary = buildExecutionSummary(recommendation);

    expect(summary.strategySteps).toBeGreaterThan(0);
    expect(summary.liquidityBufferPercent).toBeGreaterThan(0);
    expect(summary.gasReservePercent).toBeGreaterThan(0);
  });

  it("does not include real transaction fields", () => {
    const steps = buildExecutionPlanV2({
      recommendation: balancedRecommendation(),
    });

    for (const step of steps) {
      for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
        expect(step).not.toHaveProperty(field);
      }
    }
  });
});

describe("createLaminarRecommendation execution integration", () => {
  it("keeps recommendation positions unchanged while adding execution diagnostics", async () => {
    const { createLaminarRecommendation } = await import("../index.js");
    const result = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation.diagnostics.executionPlanVersion).toBe("v2");
    expect(result.recommendation.diagnostics.executionPlanRealistic).toBe(true);
    expect(result.executionPlan.executionPlanVersion).toBe("v2");
    expect(result.executionPlan.stepsV2.length).toBeGreaterThan(
      result.executionPlan.steps.length,
    );
    expect(result.snapshot.executionSummary?.strategySteps).toBeGreaterThan(0);
  });
});
