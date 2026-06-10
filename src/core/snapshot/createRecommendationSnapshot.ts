import type { PortfolioRecommendationResult } from "../recommendation/types.js";
import type {
  RecommendationSnapshot,
  SnapshotExplanation,
  SnapshotMetric,
  SnapshotPosition,
  SnapshotWarning,
} from "./types.js";

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildStrategyLabel(protocolName: string, asset: string): string {
  return `${protocolName} ${asset}`;
}

function mapPositions(
  recommendation: PortfolioRecommendationResult,
): SnapshotPosition[] {
  const portfolioValueUsd = recommendation.diagnostics.portfolioValueUsd;

  return recommendation.portfolioConstruction.positions.map((position) => {
    const allocationPercent = roundTo(position.weight * 100, 2);
    const allocationUsd = roundTo(position.weight * portfolioValueUsd, 2);

    if (position.type === "strategy") {
      return {
        type: "strategy",
        label: buildStrategyLabel(position.protocolName, position.asset),
        protocolId: position.protocolId,
        protocolName: position.protocolName,
        asset: position.asset,
        weight: position.weight,
        allocationPercent,
        allocationUsd,
      };
    }

    if (position.type === "liquidityBuffer") {
      return {
        type: "liquidityBuffer",
        label: "Liquidity Buffer",
        asset: position.asset,
        weight: position.weight,
        allocationPercent,
        allocationUsd,
      };
    }

    return {
      type: "gasReserve",
      label: "Gas Reserve",
      asset: position.asset,
      weight: position.weight,
      allocationPercent,
      allocationUsd,
    };
  });
}

function calculateExpectedApy(
  recommendation: PortfolioRecommendationResult,
): number {
  const opportunityById = new Map(
    recommendation.opportunities.map((opportunity) => [
      opportunity.id,
      opportunity,
    ]),
  );

  const strategyPositions =
    recommendation.portfolioConstruction.positions.filter(
      (position) => position.type === "strategy",
    );

  if (strategyPositions.length === 0) {
    return 0;
  }

  let weightedApySum = 0;
  let totalStrategyWeight = 0;

  for (const position of strategyPositions) {
    const opportunity = opportunityById.get(position.opportunityId);

    if (opportunity === undefined) {
      continue;
    }

    weightedApySum += position.weight * opportunity.apy;
    totalStrategyWeight += position.weight;
  }

  if (totalStrategyWeight <= 0) {
    return 0;
  }

  // Store as decimal APY (e.g. 0.054 = 5.4%), consistent with opportunity.apy.
  return roundTo(weightedApySum / totalStrategyWeight, 6);
}

function buildMetrics(
  recommendation: PortfolioRecommendationResult,
): SnapshotMetric[] {
  const metadata = recommendation.portfolioConstruction.metadata;

  return [
    {
      key: "expectedApy",
      label: "Expected APY",
      value: calculateExpectedApy(recommendation),
    },
    {
      key: "strategyAllocationPercent",
      label: "Strategy Allocation",
      value: roundTo(metadata.strategyWeight * 100, 2),
    },
    {
      key: "liquidityBufferPercent",
      label: "Liquidity Buffer",
      value: roundTo(metadata.liquidityBufferWeight * 100, 2),
    },
    {
      key: "gasReservePercent",
      label: "Gas Reserve",
      value: roundTo(metadata.gasReserveWeight * 100, 2),
    },
    {
      key: "selectedProfile",
      label: "Selected Profile",
      value: recommendation.selectedProfile,
    },
    {
      key: "numberOfStrategyPositions",
      label: "Strategy Positions",
      value: strategyPositionCount(recommendation),
    },
    {
      key: "numberOfRejectedOpportunities",
      label: "Rejected Opportunities",
      value: recommendation.opportunityRanking.rejected.length,
    },
  ];
}

function strategyPositionCount(
  recommendation: PortfolioRecommendationResult,
): number {
  return recommendation.portfolioConstruction.positions.filter(
    (position) => position.type === "strategy",
  ).length;
}

function buildWarnings(
  recommendation: PortfolioRecommendationResult,
): SnapshotWarning[] {
  const warnings: SnapshotWarning[] = [];
  const metadata = recommendation.portfolioConstruction.metadata;
  const strategyPositions =
    recommendation.portfolioConstruction.positions.filter(
      (position) => position.type === "strategy",
    );
  const strategyCount = strategyPositions.length;
  const liquidityBufferPercent = metadata.liquidityBufferWeight * 100;
  const gasReservePercent = metadata.gasReserveWeight * 100;
  const rejectedCount = recommendation.opportunityRanking.rejected.length;

  if (strategyCount === 0) {
    warnings.push({
      code: "noStrategyPositions",
      severity: "warning",
      message:
        "No strategy positions were allocated; capital is held in reserve.",
    });
  }

  if (liquidityBufferPercent >= 25) {
    warnings.push({
      code: "highLiquidityBuffer",
      severity: "warning",
      message: `Liquidity buffer is ${roundTo(liquidityBufferPercent, 2)}% of the portfolio.`,
    });
  }

  if (gasReservePercent >= 5) {
    warnings.push({
      code: "highGasReserve",
      severity: "warning",
      message: `Gas reserve is ${roundTo(gasReservePercent, 2)}% of the portfolio.`,
    });
  }

  if (rejectedCount > 0) {
    warnings.push({
      code: "rejectedOpportunities",
      severity: "info",
      message: `${rejectedCount} opportunit${rejectedCount === 1 ? "y was" : "ies were"} rejected during evaluation.`,
    });
  }

  if (strategyCount > 1) {
    const uniqueAssets = new Set(
      strategyPositions.map((position) => position.asset),
    );

    if (uniqueAssets.size === 1) {
      warnings.push({
        code: "sameAssetConcentration",
        severity: "warning",
        message: "All strategy positions use the same asset.",
      });
    }

    const uniqueProtocols = new Set(
      strategyPositions.map((position) => position.protocolId),
    );

    if (uniqueProtocols.size === 1) {
      warnings.push({
        code: "sameProtocolConcentration",
        severity: "warning",
        message: "All strategy positions use the same protocol.",
      });
    }
  }

  return warnings;
}

function buildExplanations(
  recommendation: PortfolioRecommendationResult,
): SnapshotExplanation[] {
  const rankedCount = recommendation.opportunityRanking.ranked.length;
  const rejectedCount = recommendation.opportunityRanking.rejected.length;
  const constructionSummary =
    recommendation.portfolioConstruction.explanations.at(-1)?.summary ??
    "Portfolio construction completed.";

  return [
    {
      topic: "profile",
      summary: `Selected ${recommendation.selectedProfile} based on risk, liquidity, and return preference.`,
    },
    {
      topic: "policy",
      summary: `Policy v${recommendation.policy.policyVersion} applies ${recommendation.selectedProfile} risk limits, liquidity requirements, and allocation constraints.`,
    },
    {
      topic: "ranking",
      summary: `${rankedCount} opportunit${rankedCount === 1 ? "y was" : "ies were"} ranked and ${rejectedCount} were rejected after trust, liquidity, and risk evaluation.`,
    },
    {
      topic: "construction",
      summary: constructionSummary,
    },
  ];
}

export function createRecommendationSnapshot(
  recommendation: PortfolioRecommendationResult,
): RecommendationSnapshot {
  const completedSteps = recommendation.diagnostics.pipelineSteps.filter(
    (step) => step.status === "completed",
  ).length;

  return {
    profile: recommendation.selectedProfile,
    portfolioValueUsd: recommendation.diagnostics.portfolioValueUsd,
    generatedAt: recommendation.diagnostics.generatedAt,
    positions: mapPositions(recommendation),
    metrics: buildMetrics(recommendation),
    warnings: buildWarnings(recommendation),
    explanations: buildExplanations(recommendation),
    source: {
      policyVersion: recommendation.policy.policyVersion,
      pipelineStepsCompleted: completedSteps,
    },
  };
}
