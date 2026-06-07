import { describe, expect, it } from "vitest";
import { generatePortfolioRecommendation } from "../recommendation/generatePortfolioRecommendation.js";
import { createMockExecutionPlan } from "./createMockExecutionPlan.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function balancedRecommendation(portfolioValueUsd = 10_000) {
  return generatePortfolioRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd,
    asOf,
  });
}

function conservativeRecommendation(portfolioValueUsd = 10_000) {
  return generatePortfolioRecommendation({
    intent: { risk: 1, liquidity: 10, returnPreference: 2 },
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

describe("createMockExecutionPlan", () => {
  it("creates deposit steps for strategy positions", () => {
    const recommendation = balancedRecommendation();
    const plan = createMockExecutionPlan({ recommendation });
    const deposits = plan.steps.filter((step) => step.type === "deposit");

    expect(deposits).toHaveLength(3);
    expect(deposits[0]).toMatchObject({
      type: "deposit",
      status: "planned",
      protocolId: "morpho",
      opportunityId: "morpho-usdc-base",
    });
  });

  it("creates hold step for liquidity buffer", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(),
    });
    const hold = plan.steps.find((step) => step.type === "hold");

    expect(hold).toMatchObject({
      type: "hold",
      asset: "USDC",
      reason: "liquidityBuffer",
      status: "planned",
    });
  });

  it("creates reserve step for gas reserve", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(),
    });
    const reserve = plan.steps.find((step) => step.type === "reserve");

    expect(reserve).toMatchObject({
      type: "reserve",
      asset: "USDC",
      reason: "gasReserve",
      status: "planned",
    });
  });

  it("calculates amountUsd from position weight and portfolio value", () => {
    const recommendation = balancedRecommendation();
    const plan = createMockExecutionPlan({ recommendation });
    const deposit = plan.steps.find(
      (step) =>
        step.type === "deposit" && step.opportunityId === "morpho-usdc-base",
    );
    const position = recommendation.portfolioConstruction.positions.find(
      (entry) =>
        entry.type === "strategy" && entry.opportunityId === "morpho-usdc-base",
    );

    expect(deposit?.amountUsd).toBe(
      Number(((position?.weight ?? 0) * 10_000).toFixed(2)),
    );
  });

  it("includes correct summary totals", () => {
    const recommendation = balancedRecommendation();
    const plan = createMockExecutionPlan({ recommendation });
    const metadata = recommendation.portfolioConstruction.metadata;

    expect(plan.summary.numberOfSteps).toBe(plan.steps.length);
    expect(plan.summary.numberOfDeposits).toBe(3);
    expect(plan.summary.numberOfHolds).toBe(1);
    expect(plan.summary.numberOfReserves).toBe(1);
    expect(plan.summary.strategyAmountUsd).toBeCloseTo(
      metadata.strategyWeight * 10_000,
      0,
    );
    expect(plan.summary.liquidityBufferAmountUsd).toBeCloseTo(
      metadata.liquidityBufferWeight * 10_000,
      0,
    );
    expect(plan.summary.gasReserveAmountUsd).toBeCloseTo(
      metadata.gasReserveWeight * 10_000,
      0,
    );
    expect(plan.summary.totalAmountUsd).toBeCloseTo(10_000, 0);
  });

  it("warns when there are no deposit steps", () => {
    const plan = createMockExecutionPlan({
      recommendation: conservativeRecommendation(),
    });

    expect(
      plan.warnings.some((warning) => warning.code === "noDepositSteps"),
    ).toBe(true);
    expect(plan.summary.numberOfDeposits).toBe(0);
  });

  it("warns for high liquidity buffer", () => {
    const plan = createMockExecutionPlan({
      recommendation: conservativeRecommendation(),
    });

    expect(
      plan.warnings.some((warning) => warning.code === "highLiquidityBuffer"),
    ).toBe(true);
  });

  it("warns for high gas reserve", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(100),
    });

    expect(
      plan.warnings.some((warning) => warning.code === "highGasReserve"),
    ).toBe(true);
  });

  it("warns for small deposit amounts", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(50),
    });

    expect(
      plan.warnings.some((warning) => warning.code === "smallDepositAmount"),
    ).toBe(true);
  });

  it("warns when all deposits use the same asset", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(),
    });

    expect(
      plan.warnings.some((warning) => warning.code === "sameAssetDeposits"),
    ).toBe(true);
  });

  it("does not warn same protocol when multiple protocols are used", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(),
    });

    expect(
      plan.warnings.some((warning) => warning.code === "sameProtocolDeposits"),
    ).toBe(false);
  });

  it("warns when all deposits use the same protocol", () => {
    const recommendation = balancedRecommendation();
    const singleProtocolRecommendation = {
      ...recommendation,
      portfolioConstruction: {
        ...recommendation.portfolioConstruction,
        positions: [
          {
            type: "strategy" as const,
            opportunityId: "morpho-usdc-base",
            protocolId: "morpho",
            protocolName: "Morpho",
            asset: "USDC" as const,
            exposureCategory: "lending" as const,
            weight: 0.45,
          },
          {
            type: "strategy" as const,
            opportunityId: "morpho-usdc-alt",
            protocolId: "morpho",
            protocolName: "Morpho",
            asset: "USDC" as const,
            exposureCategory: "lending" as const,
            weight: 0.34,
          },
          {
            type: "liquidityBuffer" as const,
            asset: "USDC" as const,
            weight: 0.2,
          },
          {
            type: "gasReserve" as const,
            asset: "USDC" as const,
            weight: 0.01,
          },
        ],
      },
    };

    const plan = createMockExecutionPlan({
      recommendation: singleProtocolRecommendation,
    });

    expect(
      plan.warnings.some((warning) => warning.code === "sameProtocolDeposits"),
    ).toBe(true);
  });

  it("does not include real transaction fields", () => {
    const plan = createMockExecutionPlan({
      recommendation: balancedRecommendation(),
    });

    for (const step of plan.steps) {
      for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
        expect(step).not.toHaveProperty(field);
      }
    }

    expect(plan).not.toHaveProperty("transactions");
    expect(plan).not.toHaveProperty("calldata");
  });

  it("includes mock diagnostics", () => {
    const recommendation = balancedRecommendation();
    const plan = createMockExecutionPlan({ recommendation });

    expect(plan.diagnostics.source).toBe("mock");
    expect(plan.diagnostics.policyVersion).toBe(
      recommendation.policy.policyVersion,
    );
    expect(plan.diagnostics.selectedProfile).toBe("Balanced");
    expect(plan.diagnostics.portfolioValueUsd).toBe(10_000);
    expect(plan.explanations).toHaveLength(5);
  });
});
