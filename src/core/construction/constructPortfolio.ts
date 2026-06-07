import type { Opportunity, SupportedAsset } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type { ScoredOpportunity } from "../scoring/types.js";
import {
  DEFAULT_GAS_RESERVE_ASSET,
  DEFAULT_LIQUIDITY_BUFFER_ASSET,
  INTERNAL_PRECISION_DECIMALS,
  MAX_CONSTRAINT_ITERATIONS,
} from "./constructionConfig.js";
import { roundWeightsLargestRemainder } from "./rounding.js";
import type {
  ConstructionExplanation,
  ConstructionStep,
  ExposureCategory,
  InternalSelectedCandidate,
  PortfolioConstructionInput,
  PortfolioConstructionResult,
  PortfolioPosition,
} from "./types.js";

export class InvalidPortfolioValueError extends Error {
  constructor(portfolioValueUsd: number) {
    super(
      `portfolioValueUsd must be greater than 0, received ${portfolioValueUsd}`,
    );
    this.name = "InvalidPortfolioValueError";
  }
}

export class InvalidStrategyDeployableWeightError extends Error {
  constructor(strategyDeployableWeight: number) {
    super(
      `strategyDeployableWeight must be greater than 0, computed ${strategyDeployableWeight}`,
    );
    this.name = "InvalidStrategyDeployableWeightError";
  }
}

function roundInternal(value: number): number {
  const factor = 10 ** INTERNAL_PRECISION_DECIMALS;
  return Math.round(value * factor) / factor;
}

function computeGasReserveWeight(
  portfolioValueUsd: number,
  policy: PortfolioPolicy,
): number {
  const minWeight =
    policy.allocationConstraints.gasReserve.minUsd / portfolioValueUsd;
  const targetWeight = policy.allocationConstraints.gasReserve.targetRate;
  const maxWeight =
    policy.allocationConstraints.gasReserve.maxUsd / portfolioValueUsd;

  return roundInternal(Math.min(maxWeight, Math.max(minWeight, targetWeight)));
}

function buildOpportunityMap(
  opportunities: readonly Opportunity[],
): Map<string, Opportunity> {
  return new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );
}

function toScoredCandidate(
  entry: ScoredOpportunity,
  opportunity: Opportunity,
): InternalSelectedCandidate {
  return {
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    asset: entry.asset as SupportedAsset,
    exposureCategory: opportunity.exposureCategory,
    score: entry.scoring.score,
    rank: entry.rank,
  };
}

function selectCandidates(
  ranked: readonly ScoredOpportunity[],
  opportunityById: Map<string, Opportunity>,
  exposureCategory: ExposureCategory,
  maxActiveAllocations: number,
  excludedOpportunityIds: ReadonlySet<string>,
): InternalSelectedCandidate[] {
  const selected: InternalSelectedCandidate[] = [];
  const seenProtocols = new Set<string>();

  for (const entry of [...ranked].sort(
    (left, right) => left.rank - right.rank,
  )) {
    if (selected.length >= maxActiveAllocations) {
      break;
    }

    if (excludedOpportunityIds.has(entry.opportunityId)) {
      continue;
    }

    const opportunity = opportunityById.get(entry.opportunityId);

    if (opportunity === undefined) {
      throw new Error(`No opportunity found for id: ${entry.opportunityId}`);
    }

    if (opportunity.exposureCategory !== exposureCategory) {
      continue;
    }

    if (seenProtocols.has(entry.protocolId)) {
      continue;
    }

    selected.push(toScoredCandidate(entry, opportunity));
    seenProtocols.add(entry.protocolId);
  }

  return selected;
}

function computeScoreProportionalWeights(
  candidates: InternalSelectedCandidate[],
): Map<string, number> {
  const weights = new Map<string, number>();

  if (candidates.length === 0) {
    return weights;
  }

  const totalScore = candidates.reduce(
    (sum, candidate) => sum + candidate.score,
    0,
  );

  if (totalScore > 0) {
    for (const candidate of candidates) {
      weights.set(
        candidate.opportunityId,
        roundInternal(candidate.score / totalScore),
      );
    }
    return weights;
  }

  const equalWeight = roundInternal(1 / candidates.length);
  for (const candidate of candidates) {
    weights.set(candidate.opportunityId, equalWeight);
  }

  return weights;
}

function sumWeightsForKeys(
  weights: Map<string, number>,
  keys: readonly string[],
): number {
  return keys.reduce((sum, key) => sum + (weights.get(key) ?? 0), 0);
}

function applyProtocolExposureCaps(
  candidates: InternalSelectedCandidate[],
  weights: Map<string, number>,
  maxProtocolExposure: number,
  steps: ConstructionStep[],
): void {
  for (
    let iteration = 0;
    iteration < MAX_CONSTRAINT_ITERATIONS;
    iteration += 1
  ) {
    const protocolGroups = new Map<string, string[]>();

    for (const candidate of candidates) {
      const group = protocolGroups.get(candidate.protocolId) ?? [];
      group.push(candidate.opportunityId);
      protocolGroups.set(candidate.protocolId, group);
    }

    let changed = false;

    for (const [protocolId, opportunityIds] of protocolGroups) {
      const protocolWeight = sumWeightsForKeys(weights, opportunityIds);

      if (protocolWeight <= maxProtocolExposure + 1e-12) {
        continue;
      }

      const excess = roundInternal(protocolWeight - maxProtocolExposure);
      const scaleFactor = maxProtocolExposure / protocolWeight;

      for (const opportunityId of opportunityIds) {
        const current = weights.get(opportunityId) ?? 0;
        weights.set(opportunityId, roundInternal(current * scaleFactor));
      }

      const recipients = candidates
        .map((candidate) => candidate.opportunityId)
        .filter((opportunityId) => !opportunityIds.includes(opportunityId));

      const recipientWeight = sumWeightsForKeys(weights, recipients);

      if (recipientWeight > 0) {
        for (const opportunityId of recipients) {
          const current = weights.get(opportunityId) ?? 0;
          const share = roundInternal(excess * (current / recipientWeight));
          weights.set(opportunityId, roundInternal(current + share));
        }
      }

      steps.push({
        id: "maxProtocolExposureApplied",
        description: `Protocol ${protocolId} capped at ${maxProtocolExposure}.`,
        details: {
          protocolId,
          previousWeight: protocolWeight,
          cap: maxProtocolExposure,
          iteration,
        },
      });
      changed = true;
    }

    if (!changed) {
      break;
    }
  }
}

function applyStablecoinExposureCaps(
  candidates: InternalSelectedCandidate[],
  weights: Map<string, number>,
  maxStablecoinExposure: number,
  steps: ConstructionStep[],
): number {
  const assetGroups = new Map<SupportedAsset, string[]>();

  for (const candidate of candidates) {
    const group = assetGroups.get(candidate.asset) ?? [];
    group.push(candidate.opportunityId);
    assetGroups.set(candidate.asset, group);
  }

  let implicitLiquidityBufferWeight = 0;

  for (const [asset, opportunityIds] of assetGroups) {
    const assetWeight = sumWeightsForKeys(weights, opportunityIds);

    if (assetWeight <= maxStablecoinExposure + 1e-12) {
      continue;
    }

    const scaleFactor = maxStablecoinExposure / assetWeight;
    const excess = roundInternal(assetWeight - maxStablecoinExposure);

    for (const opportunityId of opportunityIds) {
      const current = weights.get(opportunityId) ?? 0;
      weights.set(opportunityId, roundInternal(current * scaleFactor));
    }

    implicitLiquidityBufferWeight = roundInternal(
      implicitLiquidityBufferWeight + excess,
    );

    steps.push({
      id: "maxStablecoinExposureApplied",
      description: `Stablecoin ${asset} capped at ${maxStablecoinExposure}; excess moved to liquidity buffer.`,
      details: {
        asset,
        previousWeight: assetWeight,
        cap: maxStablecoinExposure,
        excess,
      },
    });
  }

  return implicitLiquidityBufferWeight;
}

function getPortfolioWeight(
  relativeWeight: number,
  strategyDeployableWeight: number,
): number {
  return roundInternal(relativeWeight * strategyDeployableWeight);
}

function findBelowMinAllocation(
  candidates: InternalSelectedCandidate[],
  weights: Map<string, number>,
  strategyDeployableWeight: number,
  minAllocationSize: number,
): InternalSelectedCandidate | undefined {
  return candidates.find((candidate) => {
    const relativeWeight = weights.get(candidate.opportunityId) ?? 0;
    return (
      getPortfolioWeight(relativeWeight, strategyDeployableWeight) <
      minAllocationSize
    );
  });
}

function buildFinalPositions(
  candidates: InternalSelectedCandidate[],
  relativeWeights: Map<string, number>,
  strategyDeployableWeight: number,
  targetLiquidityBufferWeight: number,
  implicitLiquidityBufferWeight: number,
  gasReserveWeight: number,
): PortfolioPosition[] {
  const positions: PortfolioPosition[] = [];

  let allocatedStrategyWeight = 0;

  for (const candidate of candidates) {
    const relativeWeight = relativeWeights.get(candidate.opportunityId) ?? 0;
    const weight = getPortfolioWeight(relativeWeight, strategyDeployableWeight);
    allocatedStrategyWeight = roundInternal(allocatedStrategyWeight + weight);

    positions.push({
      type: "strategy",
      opportunityId: candidate.opportunityId,
      protocolId: candidate.protocolId,
      protocolName: candidate.protocolName,
      asset: candidate.asset,
      exposureCategory: candidate.exposureCategory,
      weight,
    });
  }

  const implicitBufferPortfolioWeight = roundInternal(
    implicitLiquidityBufferWeight * strategyDeployableWeight,
  );
  const unallocatedStrategyWeight = roundInternal(
    strategyDeployableWeight -
      allocatedStrategyWeight -
      implicitBufferPortfolioWeight,
  );
  const liquidityBufferWeight = roundInternal(
    targetLiquidityBufferWeight +
      implicitBufferPortfolioWeight +
      Math.max(0, unallocatedStrategyWeight),
  );

  if (liquidityBufferWeight > 0) {
    positions.push({
      type: "liquidityBuffer",
      asset: DEFAULT_LIQUIDITY_BUFFER_ASSET,
      weight: liquidityBufferWeight,
    });
  }

  if (gasReserveWeight > 0) {
    positions.push({
      type: "gasReserve",
      asset: DEFAULT_GAS_RESERVE_ASSET,
      weight: gasReserveWeight,
    });
  }

  return positions;
}

function applyRoundedWeights(
  positions: PortfolioPosition[],
): PortfolioPosition[] {
  const rounded = roundWeightsLargestRemainder(
    positions.map((position, index) => ({
      id: `${position.type}:${"opportunityId" in position ? position.opportunityId : index}`,
      weight: position.weight,
    })),
  );

  return positions.map((position, index) => {
    const id = `${position.type}:${"opportunityId" in position ? position.opportunityId : index}`;
    const weight = rounded.get(id) ?? position.weight;
    return { ...position, weight };
  });
}

function buildEmptyCandidateUniverseResult(
  gasReserveWeight: number,
  portfolioValueUsd: number,
  policy: PortfolioPolicy,
  ranking: PortfolioConstructionInput["ranking"],
): PortfolioConstructionResult {
  const steps: ConstructionStep[] = [
    {
      id: "emptyCandidateUniverse",
      description:
        "No ranked opportunities available; allocated remaining capital to liquidity buffer.",
    },
  ];
  const explanations: ConstructionExplanation[] = [
    {
      summary: "No opportunities were allocated to strategy positions.",
      details: [
        "The ranked opportunity universe was empty.",
        "No eligible opportunities remained after upstream scoring and risk filtering.",
        "All remaining portfolio capital was placed in the liquidity buffer.",
      ],
    },
  ];

  const liquidityBufferWeight = roundInternal(1 - gasReserveWeight);
  let positions: PortfolioPosition[] = [];

  if (liquidityBufferWeight > 0) {
    positions.push({
      type: "liquidityBuffer",
      asset: DEFAULT_LIQUIDITY_BUFFER_ASSET,
      weight: liquidityBufferWeight,
    });
  }

  if (gasReserveWeight > 0) {
    positions.push({
      type: "gasReserve",
      asset: DEFAULT_GAS_RESERVE_ASSET,
      weight: gasReserveWeight,
    });
  }

  positions = applyRoundedWeights(positions);
  const metadata = summarizeMetadata(positions, portfolioValueUsd, policy);

  explanations.push({
    summary: "Constructed portfolio with 0 strategy position(s).",
    details: [
      `Gas reserve weight: ${metadata.gasReserveWeight}.`,
      `Liquidity buffer weight: ${metadata.liquidityBufferWeight}.`,
      `Strategy weight: ${metadata.strategyWeight}.`,
      `Total weight: ${metadata.totalWeight}.`,
    ],
  });

  return {
    positions,
    rejectedOpportunities: [...ranking.rejected],
    constructionSteps: steps,
    explanations,
    metadata,
  };
}

function summarizeMetadata(
  positions: PortfolioPosition[],
  portfolioValueUsd: number,
  policy: PortfolioPolicy,
): PortfolioConstructionResult["metadata"] {
  const strategyWeight = roundInternal(
    positions
      .filter((position) => position.type === "strategy")
      .reduce((sum, position) => sum + position.weight, 0),
  );
  const liquidityBufferWeight = roundInternal(
    positions
      .filter((position) => position.type === "liquidityBuffer")
      .reduce((sum, position) => sum + position.weight, 0),
  );
  const gasReserveWeight = roundInternal(
    positions
      .filter((position) => position.type === "gasReserve")
      .reduce((sum, position) => sum + position.weight, 0),
  );
  const totalWeight = roundInternal(
    positions.reduce((sum, position) => sum + position.weight, 0),
  );

  return {
    portfolioValueUsd,
    policyVersion: policy.policyVersion,
    selectedProfile: policy.selectedProfile,
    totalWeight,
    strategyWeight,
    liquidityBufferWeight,
    gasReserveWeight,
  };
}

export function constructPortfolio(
  input: PortfolioConstructionInput,
): PortfolioConstructionResult {
  if (input.portfolioValueUsd <= 0) {
    throw new InvalidPortfolioValueError(input.portfolioValueUsd);
  }

  const { policy, ranking, opportunities, portfolioValueUsd } = input;
  const steps: ConstructionStep[] = [];
  const explanations: ConstructionExplanation[] = [];
  const opportunityById = buildOpportunityMap(opportunities);

  const gasReserveWeight = computeGasReserveWeight(portfolioValueUsd, policy);

  if (ranking.ranked.length === 0) {
    return buildEmptyCandidateUniverseResult(
      gasReserveWeight,
      portfolioValueUsd,
      policy,
      ranking,
    );
  }

  let targetLiquidityBufferWeight = roundInternal(
    policy.targetExposure.liquidityBuffer,
  );
  let lendingTarget = roundInternal(policy.targetExposure.lending);
  const yieldTarget = roundInternal(policy.targetExposure.yieldEnhancement);

  const lendingCandidatesAvailable = ranking.ranked.some((entry) => {
    const opportunity = opportunityById.get(entry.opportunityId);
    return opportunity?.exposureCategory === "lending";
  });
  const yieldCandidatesAvailable = ranking.ranked.some((entry) => {
    const opportunity = opportunityById.get(entry.opportunityId);
    return opportunity?.exposureCategory === "yieldEnhancement";
  });

  if (yieldTarget > 0 && !yieldCandidatesAvailable) {
    lendingTarget = roundInternal(lendingTarget + yieldTarget);
    explanations.push({
      summary: "Yield enhancement target reassigned to lending.",
      details: [
        "No eligible yieldEnhancement candidates were available.",
        `Adjusted lending target is now ${lendingTarget}.`,
      ],
    });
    steps.push({
      id: "yieldEnhancementReassigned",
      description:
        "Reassigned yieldEnhancement target exposure to lending because no eligible candidates exist.",
      details: {
        lendingTarget,
      },
    });
  }

  if (!lendingCandidatesAvailable && lendingTarget > 0) {
    targetLiquidityBufferWeight = roundInternal(
      targetLiquidityBufferWeight + lendingTarget,
    );
  }

  const strategyDeployableWeight = roundInternal(
    1 - gasReserveWeight - targetLiquidityBufferWeight,
  );

  if (strategyDeployableWeight <= 0) {
    throw new InvalidStrategyDeployableWeightError(strategyDeployableWeight);
  }

  const excludedOpportunityIds = new Set<string>();
  const maxActiveAllocations =
    policy.allocationConstraints.maxActiveAllocations;
  const minAllocationSize = policy.allocationConstraints.minAllocationSize;
  const maxProtocolExposure = policy.allocationConstraints.maxProtocolExposure;
  const maxStablecoinExposure =
    policy.allocationConstraints.maxStablecoinExposure;

  let selected: InternalSelectedCandidate[] = [];
  let relativeWeights = new Map<string, number>();
  let implicitLiquidityBufferWeight = 0;

  selectionLoop: while (true) {
    const previousSelectedIds = new Set(
      selected.map((candidate) => candidate.opportunityId),
    );

    selected = selectCandidates(
      ranking.ranked,
      opportunityById,
      "lending",
      maxActiveAllocations,
      excludedOpportunityIds,
    );

    if (selected.length === 0) {
      break;
    }

    const promoted = selected.find(
      (candidate) => !previousSelectedIds.has(candidate.opportunityId),
    );
    if (promoted !== undefined && previousSelectedIds.size > 0) {
      steps.push({
        id: "minAllocationSizePromote",
        description: `Promoted ${promoted.opportunityId} after dropping below-min allocation.`,
        details: {
          promotedOpportunityId: promoted.opportunityId,
        },
      });
    }

    relativeWeights = computeScoreProportionalWeights(selected);
    applyProtocolExposureCaps(
      selected,
      relativeWeights,
      maxProtocolExposure,
      steps,
    );
    implicitLiquidityBufferWeight = applyStablecoinExposureCaps(
      selected,
      relativeWeights,
      maxStablecoinExposure,
      steps,
    );

    const belowMin = findBelowMinAllocation(
      selected,
      relativeWeights,
      strategyDeployableWeight,
      minAllocationSize,
    );

    if (belowMin === undefined) {
      break selectionLoop;
    }

    excludedOpportunityIds.add(belowMin.opportunityId);
    steps.push({
      id: "minAllocationSizeDrop",
      description: `Dropped ${belowMin.opportunityId} because allocation fell below minAllocationSize.`,
      details: {
        opportunityId: belowMin.opportunityId,
        minAllocationSize,
      },
    });
  }

  let positions = buildFinalPositions(
    selected,
    relativeWeights,
    strategyDeployableWeight,
    targetLiquidityBufferWeight,
    implicitLiquidityBufferWeight,
    gasReserveWeight,
  );

  positions = applyRoundedWeights(positions);

  const metadata = summarizeMetadata(positions, portfolioValueUsd, policy);

  explanations.push({
    summary: `Constructed portfolio with ${selected.length} strategy position(s).`,
    details: [
      `Gas reserve weight: ${metadata.gasReserveWeight}.`,
      `Liquidity buffer weight: ${metadata.liquidityBufferWeight}.`,
      `Strategy weight: ${metadata.strategyWeight}.`,
      `Total weight: ${metadata.totalWeight}.`,
    ],
  });

  return {
    positions,
    rejectedOpportunities: [...ranking.rejected],
    constructionSteps: steps,
    explanations,
    metadata,
  };
}
