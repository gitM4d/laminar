import type { PortfolioPosition } from "../construction/types.js";
import type {
  ExecutionPlanExplanation,
  ExecutionPlanInput,
  ExecutionPlanSummary,
  ExecutionPlanWarning,
  MockExecutionPlan,
  MockExecutionStep,
} from "./types.js";

const SMALL_DEPOSIT_THRESHOLD_USD = 10;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calculateAmountUsd(weight: number, portfolioValueUsd: number): number {
  return roundTo(weight * portfolioValueUsd, 2);
}

function buildSteps(
  positions: readonly PortfolioPosition[],
  portfolioValueUsd: number,
): MockExecutionStep[] {
  return positions.map((position, index) => {
    const amountUsd = calculateAmountUsd(position.weight, portfolioValueUsd);
    const base = {
      stepId: index + 1,
      weight: position.weight,
      amountUsd,
      status: "planned" as const,
    };

    if (position.type === "strategy") {
      return {
        ...base,
        type: "deposit",
        protocolId: position.protocolId,
        protocolName: position.protocolName,
        asset: position.asset,
        opportunityId: position.opportunityId,
      };
    }

    if (position.type === "liquidityBuffer") {
      return {
        ...base,
        type: "hold",
        asset: position.asset,
        reason: "liquidityBuffer",
      };
    }

    return {
      ...base,
      type: "reserve",
      asset: position.asset,
      reason: "gasReserve",
    };
  });
}

function buildSummary(steps: MockExecutionStep[]): ExecutionPlanSummary {
  const deposits = steps.filter((step) => step.type === "deposit");
  const holds = steps.filter((step) => step.type === "hold");
  const reserves = steps.filter((step) => step.type === "reserve");

  const strategyAmountUsd = roundTo(
    deposits.reduce((sum, step) => sum + step.amountUsd, 0),
    2,
  );
  const liquidityBufferAmountUsd = roundTo(
    holds.reduce((sum, step) => sum + step.amountUsd, 0),
    2,
  );
  const gasReserveAmountUsd = roundTo(
    reserves.reduce((sum, step) => sum + step.amountUsd, 0),
    2,
  );

  return {
    totalAmountUsd: roundTo(
      strategyAmountUsd + liquidityBufferAmountUsd + gasReserveAmountUsd,
      2,
    ),
    strategyAmountUsd,
    liquidityBufferAmountUsd,
    gasReserveAmountUsd,
    numberOfSteps: steps.length,
    numberOfDeposits: deposits.length,
    numberOfHolds: holds.length,
    numberOfReserves: reserves.length,
  };
}

function buildWarnings(
  steps: MockExecutionStep[],
  summary: ExecutionPlanSummary,
  portfolioValueUsd: number,
): ExecutionPlanWarning[] {
  const warnings: ExecutionPlanWarning[] = [];
  const deposits = steps.filter((step) => step.type === "deposit");

  if (deposits.length === 0) {
    warnings.push({
      code: "noDepositSteps",
      severity: "warning",
      message:
        "No deposit steps were planned; strategy capital is not deployed.",
    });
  }

  const liquidityBufferPercent =
    portfolioValueUsd > 0
      ? (summary.liquidityBufferAmountUsd / portfolioValueUsd) * 100
      : 0;

  if (liquidityBufferPercent >= 25) {
    warnings.push({
      code: "highLiquidityBuffer",
      severity: "warning",
      message: `Liquidity buffer represents ${roundTo(liquidityBufferPercent, 2)}% of portfolio value.`,
    });
  }

  const gasReservePercent =
    portfolioValueUsd > 0
      ? (summary.gasReserveAmountUsd / portfolioValueUsd) * 100
      : 0;

  if (gasReservePercent >= 5) {
    warnings.push({
      code: "highGasReserve",
      severity: "warning",
      message: `Gas reserve represents ${roundTo(gasReservePercent, 2)}% of portfolio value.`,
    });
  }

  const smallDeposits = deposits.filter(
    (step) => step.amountUsd < SMALL_DEPOSIT_THRESHOLD_USD,
  );

  if (smallDeposits.length > 0) {
    warnings.push({
      code: "smallDepositAmount",
      severity: "warning",
      message: `${smallDeposits.length} deposit step${smallDeposits.length === 1 ? "" : "s"} allocate less than $${SMALL_DEPOSIT_THRESHOLD_USD}.`,
    });
  }

  if (deposits.length > 1) {
    const uniqueAssets = new Set(deposits.map((step) => step.asset));

    if (uniqueAssets.size === 1) {
      warnings.push({
        code: "sameAssetDeposits",
        severity: "warning",
        message: "All deposit steps use the same asset.",
      });
    }

    const uniqueProtocols = new Set(deposits.map((step) => step.protocolId));

    if (uniqueProtocols.size === 1) {
      warnings.push({
        code: "sameProtocolDeposits",
        severity: "warning",
        message: "All deposit steps use the same protocol.",
      });
    }
  }

  return warnings;
}

function buildExplanations(): ExecutionPlanExplanation[] {
  return [
    {
      topic: "source",
      summary: "Plan was generated from Portfolio Construction output.",
    },
    {
      topic: "deposits",
      summary: "Deposit steps are mock planned actions only.",
    },
    {
      topic: "transactions",
      summary: "No blockchain transaction is created.",
    },
    {
      topic: "liquidityBuffer",
      summary: "Liquidity buffer capital remains idle.",
    },
    {
      topic: "gasReserve",
      summary: "Gas reserve capital remains idle for future operations.",
    },
  ];
}

export function createMockExecutionPlan(
  input: ExecutionPlanInput,
): MockExecutionPlan {
  const { recommendation } = input;
  const portfolioValueUsd = recommendation.diagnostics.portfolioValueUsd;
  const positions = recommendation.portfolioConstruction.positions;

  const steps = buildSteps(positions, portfolioValueUsd);
  const summary = buildSummary(steps);
  const warnings = buildWarnings(steps, summary, portfolioValueUsd);

  return {
    steps,
    summary,
    warnings,
    explanations: buildExplanations(),
    diagnostics: {
      generatedAt: recommendation.diagnostics.generatedAt,
      policyVersion: recommendation.policy.policyVersion,
      selectedProfile: recommendation.selectedProfile,
      portfolioValueUsd,
      source: "mock",
    },
  };
}
