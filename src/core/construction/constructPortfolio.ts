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

const BUCKET_ORDER: readonly ExposureCategory[] = [
  "lending",
  "yieldEnhancement",
];

type ActiveBucket = {
  category: ExposureCategory;
  target: number;
};

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

function hasCandidatesForBucket(
  ranking: PortfolioConstructionInput["ranking"],
  opportunityById: Map<string, Opportunity>,
  exposureCategory: ExposureCategory,
): boolean {
  return ranking.ranked.some((entry) => {
    const opportunity = opportunityById.get(entry.opportunityId);
    return opportunity?.exposureCategory === exposureCategory;
  });
}

function toScoredCandidate(
  entry: ScoredOpportunity,
  opportunity: Opportunity,
): InternalSelectedCandidate {
  return {
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    asset: opportunity.asset as SupportedAsset,
    exposureCategory: opportunity.exposureCategory,
    score: entry.scoring.score,
    rank: entry.rank,
  };
}

function distributeIntegerSlots(
  buckets: readonly ActiveBucket[],
  totalSlots: number,
): Map<ExposureCategory, number> {
  const slots = new Map<ExposureCategory, number>();

  if (buckets.length === 0 || totalSlots <= 0) {
    return slots;
  }

  if (buckets.length === 1) {
    const onlyBucket = buckets[0];
    if (onlyBucket !== undefined) {
      slots.set(onlyBucket.category, totalSlots);
    }
    return slots;
  }

  const totalTarget = buckets.reduce((sum, bucket) => sum + bucket.target, 0);

  if (totalTarget <= 0) {
    const equalSlots = Math.floor(totalSlots / buckets.length);
    let remainder = totalSlots - equalSlots * buckets.length;

    for (const bucket of buckets) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) {
        remainder -= 1;
      }
      slots.set(bucket.category, equalSlots + extra);
    }

    return slots;
  }

  if (buckets.length <= totalSlots) {
    const remaining = totalSlots - buckets.length;

    for (const bucket of buckets) {
      slots.set(bucket.category, 1);
    }

    if (remaining > 0) {
      const ideals = buckets.map((bucket) => ({
        category: bucket.category,
        ideal: (remaining * bucket.target) / totalTarget,
      }));
      const allocations = ideals.map((entry) => ({
        category: entry.category,
        extra: Math.floor(entry.ideal),
        remainder: entry.ideal - Math.floor(entry.ideal),
      }));

      for (const entry of allocations) {
        slots.set(
          entry.category,
          (slots.get(entry.category) ?? 0) + entry.extra,
        );
      }

      let leftover =
        remaining - allocations.reduce((sum, entry) => sum + entry.extra, 0);
      const byRemainder = [...allocations].sort(
        (left, right) => right.remainder - left.remainder,
      );

      for (const entry of byRemainder) {
        if (leftover <= 0) {
          break;
        }

        slots.set(entry.category, (slots.get(entry.category) ?? 0) + 1);
        leftover -= 1;
      }
    }

    return slots;
  }

  const ideals = buckets.map((bucket) => ({
    category: bucket.category,
    ideal: (totalSlots * bucket.target) / totalTarget,
  }));
  const allocations = ideals.map((entry) => ({
    category: entry.category,
    slots: Math.floor(entry.ideal),
    remainder: entry.ideal - Math.floor(entry.ideal),
  }));

  for (const entry of allocations) {
    slots.set(entry.category, entry.slots);
  }

  let leftover =
    totalSlots - allocations.reduce((sum, entry) => sum + entry.slots, 0);
  const byRemainder = [...allocations].sort(
    (left, right) => right.remainder - left.remainder,
  );

  for (const entry of byRemainder) {
    if (leftover <= 0) {
      break;
    }

    slots.set(entry.category, (slots.get(entry.category) ?? 0) + 1);
    leftover -= 1;
  }

  return slots;
}

function computeBucketSlots(
  activeBuckets: readonly ActiveBucket[],
  maxActiveAllocations: number,
): Map<ExposureCategory, number> {
  return distributeIntegerSlots(activeBuckets, maxActiveAllocations);
}

function selectBucketCandidates(
  ranked: readonly ScoredOpportunity[],
  opportunityById: Map<string, Opportunity>,
  exposureCategory: ExposureCategory,
  maxSlots: number,
  excludedOpportunityIds: ReadonlySet<string>,
  usedProtocolIds: ReadonlySet<string>,
): InternalSelectedCandidate[] {
  const selected: InternalSelectedCandidate[] = [];

  if (maxSlots <= 0) {
    return selected;
  }

  for (const entry of [...ranked].sort(
    (left, right) => left.rank - right.rank,
  )) {
    if (selected.length >= maxSlots) {
      break;
    }

    if (excludedOpportunityIds.has(entry.opportunityId)) {
      continue;
    }

    if (usedProtocolIds.has(entry.protocolId)) {
      continue;
    }

    const opportunity = opportunityById.get(entry.opportunityId);

    if (opportunity === undefined) {
      throw new Error(`No opportunity found for id: ${entry.opportunityId}`);
    }

    if (opportunity.exposureCategory !== exposureCategory) {
      continue;
    }

    selected.push(toScoredCandidate(entry, opportunity));
  }

  return selected;
}

function selectMultiBucketCandidates(
  ranked: readonly ScoredOpportunity[],
  opportunityById: Map<string, Opportunity>,
  bucketSlots: ReadonlyMap<ExposureCategory, number>,
  excludedOpportunityIds: ReadonlySet<string>,
): InternalSelectedCandidate[] {
  const selected: InternalSelectedCandidate[] = [];
  const usedProtocolIds = new Set<string>();

  for (const category of BUCKET_ORDER) {
    const maxSlots = bucketSlots.get(category) ?? 0;

    if (maxSlots <= 0) {
      continue;
    }

    const bucketSelected = selectBucketCandidates(
      ranked,
      opportunityById,
      category,
      maxSlots,
      excludedOpportunityIds,
      usedProtocolIds,
    );

    for (const candidate of bucketSelected) {
      selected.push(candidate);
      usedProtocolIds.add(candidate.protocolId);
    }
  }

  return selected;
}

function computeScoreProportionalWeights(
  candidates: readonly InternalSelectedCandidate[],
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

function computeMultiBucketRelativeWeights(
  selected: readonly InternalSelectedCandidate[],
  bucketTargets: ReadonlyMap<ExposureCategory, number>,
): Map<string, number> {
  const weights = new Map<string, number>();
  const candidatesByBucket = new Map<ExposureCategory, InternalSelectedCandidate[]>();

  for (const candidate of selected) {
    const bucketCandidates =
      candidatesByBucket.get(candidate.exposureCategory) ?? [];
    bucketCandidates.push(candidate);
    candidatesByBucket.set(candidate.exposureCategory, bucketCandidates);
  }

  for (const [category, candidates] of candidatesByBucket) {
    const bucketTarget = bucketTargets.get(category) ?? 0;
    const withinBucketWeights = computeScoreProportionalWeights(candidates);

    for (const candidate of candidates) {
      const withinBucketWeight =
        withinBucketWeights.get(candidate.opportunityId) ?? 0;
      weights.set(
        candidate.opportunityId,
        roundInternal(bucketTarget * withinBucketWeight),
      );
    }
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

function getSelectedByBucket(
  selected: readonly InternalSelectedCandidate[],
): Map<ExposureCategory, InternalSelectedCandidate[]> {
  const byBucket = new Map<ExposureCategory, InternalSelectedCandidate[]>();

  for (const candidate of selected) {
    const bucketCandidates =
      byBucket.get(candidate.exposureCategory) ?? [];
    bucketCandidates.push(candidate);
    byBucket.set(candidate.exposureCategory, bucketCandidates);
  }

  return byBucket;
}

function recordBucketSlotAllocation(
  activeBuckets: readonly ActiveBucket[],
  bucketSlots: ReadonlyMap<ExposureCategory, number>,
  maxActiveAllocations: number,
  steps: ConstructionStep[],
  explanations: ConstructionExplanation[],
): void {
  const slotSummary = activeBuckets
    .map(
      (bucket) =>
        `${bucket.category}=${bucketSlots.get(bucket.category) ?? 0}`,
    )
    .join(", ");

  steps.push({
    id: "bucketSlotAllocation",
    description: `Allocated ${maxActiveAllocations} global slots across exposure buckets (${slotSummary}).`,
    details: {
      maxActiveAllocations,
    },
  });

  explanations.push({
    summary: "Allocated candidate slots across exposure buckets.",
    details: [
      `Global maxActiveAllocations: ${maxActiveAllocations}.`,
      `Bucket slot allocation: ${slotSummary}.`,
      ...activeBuckets.map(
        (bucket) =>
          `${bucket.category} target exposure: ${bucket.target}; slots: ${bucketSlots.get(bucket.category) ?? 0}.`,
      ),
    ],
  });
}

function recordSelectedCandidatesByBucket(
  selected: readonly InternalSelectedCandidate[],
  steps: ConstructionStep[],
  explanations: ConstructionExplanation[],
): void {
  const byBucket = getSelectedByBucket(selected);

  for (const [category, candidates] of byBucket) {
    const opportunityIds = candidates
      .map((candidate) => candidate.opportunityId)
      .join(", ");

    steps.push({
      id: "bucketCandidatesSelected",
      description: `Selected ${candidates.length} ${category} candidate(s): ${opportunityIds}.`,
      details: {
        bucket: category,
        count: candidates.length,
      },
    });
  }

  if (selected.length > 0) {
    explanations.push({
      summary: "Selected candidates per exposure bucket.",
      details: [...byBucket.entries()].map(
        ([category, candidates]) =>
          `${category}: ${candidates.map((candidate) => candidate.opportunityId).join(", ")}.`,
      ),
    });
  }
}

function moveBucketTargetToLiquidityBuffer(
  category: ExposureCategory,
  bucketTarget: number,
  targetLiquidityBufferWeight: number,
  bucketTargets: Map<ExposureCategory, number>,
  steps: ConstructionStep[],
  explanations: ConstructionExplanation[],
  reason: string,
): number {
  bucketTargets.delete(category);

  steps.push({
    id: "bucketEmptiedDueToConstraints",
    description: `${category} bucket target (${bucketTarget}) moved to liquidity buffer because ${reason}.`,
    details: {
      bucket: category,
      bucketTarget,
    },
  });

  explanations.push({
    summary: `${category} bucket weight moved to liquidity buffer.`,
    details: [
      reason,
      `Moved ${bucketTarget} from ${category} to liquidity buffer.`,
    ],
  });

  return roundInternal(targetLiquidityBufferWeight + bucketTarget);
}

function reconcileEmptyBuckets(
  activeBuckets: readonly ActiveBucket[],
  bucketSlots: ReadonlyMap<ExposureCategory, number>,
  selected: readonly InternalSelectedCandidate[],
  bucketTargets: Map<ExposureCategory, number>,
  targetLiquidityBufferWeight: number,
  steps: ConstructionStep[],
  explanations: ConstructionExplanation[],
): number {
  let updatedLiquidityBufferWeight = targetLiquidityBufferWeight;
  const selectedByBucket = getSelectedByBucket(selected);

  for (const bucket of activeBuckets) {
    const requestedSlots = bucketSlots.get(bucket.category) ?? 0;
    const selectedInBucket = selectedByBucket.get(bucket.category) ?? [];

    if (requestedSlots > 0 && selectedInBucket.length === 0) {
      const bucketTarget = bucketTargets.get(bucket.category) ?? bucket.target;

      if (bucketTarget > 0) {
        updatedLiquidityBufferWeight = moveBucketTargetToLiquidityBuffer(
          bucket.category,
          bucketTarget,
          updatedLiquidityBufferWeight,
          bucketTargets,
          steps,
          explanations,
          "no eligible candidates remained for the bucket",
        );
      }
    }
  }

  return updatedLiquidityBufferWeight;
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
  let yieldTarget = roundInternal(policy.targetExposure.yieldEnhancement);

  const lendingCandidatesAvailable = hasCandidatesForBucket(
    ranking,
    opportunityById,
    "lending",
  );
  const yieldCandidatesAvailable = hasCandidatesForBucket(
    ranking,
    opportunityById,
    "yieldEnhancement",
  );

  if (yieldTarget > 0 && !yieldCandidatesAvailable) {
    if (lendingCandidatesAvailable) {
      lendingTarget = roundInternal(lendingTarget + yieldTarget);
      yieldTarget = 0;
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
    } else {
      targetLiquidityBufferWeight = roundInternal(
        targetLiquidityBufferWeight + yieldTarget,
      );
      yieldTarget = 0;
      explanations.push({
        summary: "Yield enhancement target reassigned to liquidity buffer.",
        details: [
          "No eligible yieldEnhancement or lending candidates were available.",
          `Adjusted liquidity buffer target is now ${targetLiquidityBufferWeight}.`,
        ],
      });
      steps.push({
        id: "yieldEnhancementReassignedToLiquidityBuffer",
        description:
          "Reassigned yieldEnhancement target exposure to liquidity buffer because no eligible candidates exist.",
        details: {
          liquidityBufferTarget: targetLiquidityBufferWeight,
        },
      });
    }
  }

  if (lendingTarget > 0 && !lendingCandidatesAvailable) {
    if (yieldTarget > 0 && yieldCandidatesAvailable) {
      yieldTarget = roundInternal(yieldTarget + lendingTarget);
      lendingTarget = 0;
      explanations.push({
        summary: "Lending target reassigned to yield enhancement.",
        details: [
          "No eligible lending candidates were available.",
          `Adjusted yieldEnhancement target is now ${yieldTarget}.`,
        ],
      });
      steps.push({
        id: "lendingReassignedToYieldEnhancement",
        description:
          "Reassigned lending target exposure to yieldEnhancement because no eligible lending candidates exist.",
        details: {
          yieldTarget,
        },
      });
    } else {
      targetLiquidityBufferWeight = roundInternal(
        targetLiquidityBufferWeight + lendingTarget,
      );
      lendingTarget = 0;
      explanations.push({
        summary: "Lending target reassigned to liquidity buffer.",
        details: [
          "No eligible lending candidates were available.",
          `Adjusted liquidity buffer target is now ${targetLiquidityBufferWeight}.`,
        ],
      });
      steps.push({
        id: "lendingReassignedToLiquidityBuffer",
        description:
          "Reassigned lending target exposure to liquidity buffer because no eligible lending candidates exist.",
        details: {
          liquidityBufferTarget: targetLiquidityBufferWeight,
        },
      });
    }
  }

  const activeBuckets: ActiveBucket[] = [];

  if (lendingTarget > 0 && lendingCandidatesAvailable) {
    activeBuckets.push({ category: "lending", target: lendingTarget });
  }

  if (yieldTarget > 0 && yieldCandidatesAvailable) {
    activeBuckets.push({
      category: "yieldEnhancement",
      target: yieldTarget,
    });
  }

  const bucketTargets = new Map<ExposureCategory, number>(
    activeBuckets.map((bucket) => [bucket.category, bucket.target]),
  );

  const maxActiveAllocations =
    policy.allocationConstraints.maxActiveAllocations;
  const bucketSlots = computeBucketSlots(activeBuckets, maxActiveAllocations);

  if (activeBuckets.length > 0) {
    recordBucketSlotAllocation(
      activeBuckets,
      bucketSlots,
      maxActiveAllocations,
      steps,
      explanations,
    );
  }

  const strategyDeployableWeight = roundInternal(
    1 - gasReserveWeight - targetLiquidityBufferWeight,
  );

  if (strategyDeployableWeight <= 0) {
    throw new InvalidStrategyDeployableWeightError(strategyDeployableWeight);
  }

  const excludedOpportunityIds = new Set<string>();
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

    selected = selectMultiBucketCandidates(
      ranking.ranked,
      opportunityById,
      bucketSlots,
      excludedOpportunityIds,
    );

    if (selected.length === 0) {
      break;
    }

    targetLiquidityBufferWeight = reconcileEmptyBuckets(
      activeBuckets,
      bucketSlots,
      selected,
      bucketTargets,
      targetLiquidityBufferWeight,
      steps,
      explanations,
    );

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

    relativeWeights = computeMultiBucketRelativeWeights(selected, bucketTargets);
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
      recordSelectedCandidatesByBucket(selected, steps, explanations);
      break selectionLoop;
    }

    const emptiedBucket = belowMin.exposureCategory;
    const remainingInBucket = selected.filter(
      (candidate) =>
        candidate.exposureCategory === emptiedBucket &&
        candidate.opportunityId !== belowMin.opportunityId,
    );

    excludedOpportunityIds.add(belowMin.opportunityId);
    steps.push({
      id: "minAllocationSizeDrop",
      description: `Dropped ${belowMin.opportunityId} because allocation fell below minAllocationSize.`,
      details: {
        opportunityId: belowMin.opportunityId,
        minAllocationSize,
      },
    });

    if (remainingInBucket.length === 0) {
      const bucketTarget = bucketTargets.get(emptiedBucket) ?? 0;

      if (bucketTarget > 0) {
        targetLiquidityBufferWeight = moveBucketTargetToLiquidityBuffer(
          emptiedBucket,
          bucketTarget,
          targetLiquidityBufferWeight,
          bucketTargets,
          steps,
          explanations,
          "the bucket lost all positions after constraint handling",
        );
      }
    }
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
