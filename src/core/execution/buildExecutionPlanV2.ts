import type { PortfolioRecommendationResult } from "../recommendation/types.js";
import type { SnapshotExecutionSummary } from "../snapshot/types.js";
import type { ExecutionPlanStepV2 } from "./types.js";

export type BuildExecutionPlanV2Input = {
  recommendation: PortfolioRecommendationResult;
};

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatUsdAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateAmountUsd(weight: number, portfolioValueUsd: number): number {
  return roundTo(weight * portfolioValueUsd, 2);
}

export function buildExecutionPlanV2(
  input: BuildExecutionPlanV2Input,
): ExecutionPlanStepV2[] {
  const { recommendation } = input;
  const portfolioValueUsd = recommendation.diagnostics.portfolioValueUsd;
  const positions = recommendation.portfolioConstruction.positions;
  const steps: ExecutionPlanStepV2[] = [];
  let stepIndex = 1;

  steps.push({
    id: `step-${stepIndex.toString()}`,
    protocolId: null,
    protocolName: null,
    action: "prepareFunds",
    asset: null,
    allocationPercent: 100,
    amountUsd: portfolioValueUsd,
    description: `Ensure ${formatUsdAmount(portfolioValueUsd)} of stablecoins are available on Base.`,
    informationalOnly: true,
  });
  stepIndex += 1;

  for (const position of positions) {
    if (position.type !== "strategy") {
      continue;
    }

    const amountUsd = calculateAmountUsd(position.weight, portfolioValueUsd);
    steps.push({
      id: `step-${stepIndex.toString()}`,
      protocolId: position.protocolId,
      protocolName: position.protocolName,
      action: "supply",
      asset: position.asset,
      allocationPercent: roundTo(position.weight * 100, 2),
      amountUsd,
      description: `Supply ${formatUsdAmount(amountUsd)} ${position.asset} to ${position.protocolName}.`,
      informationalOnly: true,
    });
    stepIndex += 1;
  }

  for (const position of positions) {
    if (position.type !== "liquidityBuffer") {
      continue;
    }

    const amountUsd = calculateAmountUsd(position.weight, portfolioValueUsd);
    steps.push({
      id: `step-${stepIndex.toString()}`,
      protocolId: null,
      protocolName: null,
      action: "holdLiquidityBuffer",
      asset: position.asset,
      allocationPercent: roundTo(position.weight * 100, 2),
      amountUsd,
      description: `Keep ${formatUsdAmount(amountUsd)} ${position.asset} available as liquidity buffer.`,
      informationalOnly: true,
    });
    stepIndex += 1;
  }

  for (const position of positions) {
    if (position.type !== "gasReserve") {
      continue;
    }

    const amountUsd = calculateAmountUsd(position.weight, portfolioValueUsd);
    steps.push({
      id: `step-${stepIndex.toString()}`,
      protocolId: null,
      protocolName: null,
      action: "holdGasReserve",
      asset: position.asset,
      allocationPercent: roundTo(position.weight * 100, 2),
      amountUsd,
      description: `Reserve ${formatUsdAmount(amountUsd)} ${position.asset} equivalent for gas and operational expenses.`,
      informationalOnly: true,
    });
  }

  return steps;
}

export function buildExecutionSummary(
  recommendation: PortfolioRecommendationResult,
): SnapshotExecutionSummary {
  const positions = recommendation.portfolioConstruction.positions;
  const liquidityBuffer = positions.find(
    (position) => position.type === "liquidityBuffer",
  );
  const gasReserve = positions.find((position) => position.type === "gasReserve");

  return {
    strategySteps: positions.filter((position) => position.type === "strategy")
      .length,
    liquidityBufferPercent: roundTo((liquidityBuffer?.weight ?? 0) * 100, 2),
    gasReservePercent: roundTo((gasReserve?.weight ?? 0) * 100, 2),
  };
}
