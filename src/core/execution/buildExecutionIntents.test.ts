import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import { generatePortfolioRecommendation } from "../recommendation/generatePortfolioRecommendation.js";
import { createMockExecutionPlan } from "./createMockExecutionPlan.js";
import {
  buildExecutionIntents,
  buildSnapshotExecutionIntentSummary,
  buildWithdrawIntentExample,
  intentHasForbiddenTransactionField,
} from "./buildExecutionIntents.js";
import type { ExecutionPlanStepV2 } from "./types.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function balancedRecommendation(portfolioValueUsd = 10_000) {
  return generatePortfolioRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd,
    asOf,
  });
}

function buildPlan(stepsV2: ExecutionPlanStepV2[]) {
  return buildExecutionIntents({ stepsV2 });
}

describe("buildExecutionIntents", () => {
  it("maps prepareFunds to a non-adapter intent", () => {
    const plan = buildPlan([
      {
        id: "step-1",
        protocolId: null,
        protocolName: null,
        action: "prepareFunds",
        asset: null,
        allocationPercent: 100,
        amountUsd: 10_000,
        description: "Ensure $10,000 of stablecoins are available on Base.",
        informationalOnly: true,
      },
    ]);

    const intent = plan.intents[0];
    expect(intent?.action).toBe("prepareFunds");
    expect(intent?.executionAdapterRequired).toBe(false);
    expect(intent?.requiresApproval).toBe(false);
  });

  it("maps supply to an executable intent", () => {
    const recommendation = balancedRecommendation();
    const strategy = recommendation.portfolioConstruction.positions.find(
      (position) => position.type === "strategy",
    );
    expect(strategy).toBeDefined();
    if (strategy?.type !== "strategy") {
      return;
    }

    const plan = buildExecutionIntents({
      stepsV2: [
        {
          id: "step-2",
          protocolId: strategy.protocolId,
          protocolName: strategy.protocolName,
          action: "supply",
          asset: strategy.asset,
          allocationPercent: strategy.weight * 100,
          amountUsd: strategy.weight * 10_000,
          description: `Supply to ${strategy.protocolName}.`,
          informationalOnly: true,
        },
      ],
      recommendation,
    });

    const intent = plan.intents[0];
    expect(intent?.action).toBe("supply");
    expect(intent?.executionAdapterRequired).toBe(true);
    expect(intent?.requiresWallet).toBe(true);
    expect(intent?.opportunityId).toBe(strategy.opportunityId);
  });

  it("sets requiresApproval true for supply intents", () => {
    const plan = buildPlan([
      {
        id: "step-2",
        protocolId: "morpho",
        protocolName: "Morpho",
        action: "supply",
        asset: "USDC",
        allocationPercent: 25,
        amountUsd: 2_500,
        description: "Supply $2,500 USDC to Morpho.",
        informationalOnly: true,
      },
    ]);

    expect(plan.intents[0]?.requiresApproval).toBe(true);
  });

  it("sets executionAdapterRequired true for supply intents", () => {
    const plan = buildPlan([
      {
        id: "step-2",
        protocolId: "aave",
        protocolName: "Aave",
        action: "supply",
        asset: "USDC",
        allocationPercent: 20,
        amountUsd: 2_000,
        description: "Supply $2,000 USDC to Aave.",
        informationalOnly: true,
      },
    ]);

    expect(plan.intents[0]?.executionAdapterRequired).toBe(true);
  });

  it("maps holdLiquidityBuffer to a non-executable intent", () => {
    const plan = buildPlan([
      {
        id: "step-5",
        protocolId: null,
        protocolName: null,
        action: "holdLiquidityBuffer",
        asset: "USDC",
        allocationPercent: 19.8,
        amountUsd: 1_980,
        description: "Keep $1,980 USDC available as liquidity buffer.",
        informationalOnly: true,
      },
    ]);

    const intent = plan.intents[0];
    expect(intent?.action).toBe("holdLiquidityBuffer");
    expect(intent?.executionAdapterRequired).toBe(false);
    expect(intent?.requiresWallet).toBe(false);
  });

  it("maps holdGasReserve to a non-executable intent", () => {
    const plan = buildPlan([
      {
        id: "step-6",
        protocolId: null,
        protocolName: null,
        action: "holdGasReserve",
        asset: "USDC",
        allocationPercent: 1,
        amountUsd: 100,
        description: "Reserve $100 USDC equivalent for gas and operational expenses.",
        informationalOnly: true,
      },
    ]);

    const intent = plan.intents[0];
    expect(intent?.action).toBe("holdGasReserve");
    expect(intent?.executionAdapterRequired).toBe(false);
    expect(intent?.requiresApproval).toBe(false);
  });

  it("uses stablecoin amountAssetEstimate equal to amountUsd", () => {
    const plan = buildPlan([
      {
        id: "step-2",
        protocolId: "fluid",
        protocolName: "Fluid",
        action: "supply",
        asset: "USDC",
        allocationPercent: 30,
        amountUsd: 3_086,
        description: "Supply $3,086 USDC to Fluid.",
        informationalOnly: true,
      },
    ]);

    expect(plan.intents[0]?.amountAssetEstimate).toBe(3_086);
  });

  it("counts executable and non-executable intents in summary", () => {
    const plan = buildPlan([
      {
        id: "step-1",
        protocolId: null,
        protocolName: null,
        action: "prepareFunds",
        asset: null,
        allocationPercent: 100,
        amountUsd: 10_000,
        description: "Ensure $10,000 of stablecoins are available on Base.",
        informationalOnly: true,
      },
      {
        id: "step-2",
        protocolId: "fluid",
        protocolName: "Fluid",
        action: "supply",
        asset: "USDC",
        allocationPercent: 30,
        amountUsd: 3_086,
        description: "Supply $3,086 USDC to Fluid.",
        informationalOnly: true,
      },
      {
        id: "step-5",
        protocolId: null,
        protocolName: null,
        action: "holdLiquidityBuffer",
        asset: "USDC",
        allocationPercent: 19.8,
        amountUsd: 1_980,
        description: "Keep $1,980 USDC available as liquidity buffer.",
        informationalOnly: true,
      },
    ]);

    expect(plan.summary.totalIntents).toBe(3);
    expect(plan.summary.executableIntents).toBe(1);
    expect(plan.summary.nonExecutableIntents).toBe(2);
  });

  it("dedupes protocols and assets in summary", () => {
    const plan = buildPlan([
      {
        id: "step-2",
        protocolId: "fluid",
        protocolName: "Fluid",
        action: "supply",
        asset: "USDC",
        allocationPercent: 30,
        amountUsd: 3_086,
        description: "Supply $3,086 USDC to Fluid.",
        informationalOnly: true,
      },
      {
        id: "step-3",
        protocolId: "morpho",
        protocolName: "Morpho",
        action: "supply",
        asset: "USDC",
        allocationPercent: 25,
        amountUsd: 2_894,
        description: "Supply $2,894 USDC to Morpho.",
        informationalOnly: true,
      },
      {
        id: "step-4",
        protocolId: "aave",
        protocolName: "Aave",
        action: "supply",
        asset: "EURC",
        allocationPercent: 20,
        amountUsd: 1_940,
        description: "Supply $1,940 EURC to Aave.",
        informationalOnly: true,
      },
    ]);

    expect(plan.summary.protocols).toEqual(["Aave", "Fluid", "Morpho"]);
    expect(plan.summary.assets).toEqual(["EURC", "USDC"]);
  });

  it("does not include calldata or transaction fields", () => {
    const recommendation = balancedRecommendation();
    const plan = createMockExecutionPlan({ recommendation });

    for (const intent of plan.executionIntentPlan?.intents ?? []) {
      expect(intentHasForbiddenTransactionField(intent)).toBeNull();
    }
  });

  it("supports withdraw intent shape for future delta plans", () => {
    const intent = buildWithdrawIntentExample(1, {
      sourceStepId: "delta-1",
      protocolId: "aave",
      protocolName: "Aave",
      opportunityId: "aave-usdc-base",
      asset: "USDC",
      amountUsd: 500,
    });

    expect(intent.action).toBe("withdraw");
    expect(intent.executionAdapterRequired).toBe(true);
    expect(intent.requiresApproval).toBe(false);
    expect(intent.informationalOnly).toBe(true);
  });
});

describe("createMockExecutionPlan execution intents integration", () => {
  it("adds executionIntentPlan without changing steps or stepsV2", () => {
    const recommendation = balancedRecommendation();
    const baselineSteps = recommendation.portfolioConstruction.positions.length;
    const plan = createMockExecutionPlan({ recommendation });

    expect(plan.executionIntentPlan?.version).toBe("intent-v1");
    expect(plan.executionIntentPlan?.intents.length).toBe(plan.stepsV2.length);
    expect(plan.steps).toHaveLength(baselineSteps);
    expect(plan.stepsV2.length).toBeGreaterThan(plan.steps.length);
    expect(plan.diagnostics.executionIntentsAvailable).toBe(true);
  });

  it("adds executionIntentSummary through createLaminarRecommendation", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.executionPlan.executionIntentPlan).toBeDefined();
    expect(result.recommendation.diagnostics.executionIntentsAvailable).toBe(true);
    expect(result.snapshot.executionIntentSummary).toEqual(
      buildSnapshotExecutionIntentSummary(result.executionPlan.executionIntentPlan),
    );
  });
});
