import type { PortfolioConstructionResult, StrategyPosition } from "../construction/types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { OpportunityRanking } from "../scoring/types.js";
import {
  analyzePortfolioConcentration,
  type DiversificationLevel,
  type PortfolioConcentrationAnalysis,
} from "./analyzePortfolioConcentration.js";

export const DEFAULT_TARGET_DIVERSIFICATION_SHARE = 0.2;

export type DiversificationTradeoffAssetAllocation = {
  asset: string;
  allocationPercent: number;
};

export type DiversificationTradeoffProtocolAllocation = {
  protocolName: string;
  allocationPercent: number;
};

export type DiversificationTradeoffCurrent = {
  strategyApy: number;
  diversificationLevel: DiversificationLevel;
  largestAsset: string | null;
  largestAssetAllocationPercent: number;
};

export type DiversificationTradeoffAlternative = {
  strategyApy: number;
  diversificationLevel: DiversificationLevel;
  assetAllocations: DiversificationTradeoffAssetAllocation[];
  protocolAllocations: DiversificationTradeoffProtocolAllocation[];
  apyCostPercent: number;
  summary: string;
};

export type DiversificationTradeoff = {
  available: boolean;
  reason?: string;
  current: DiversificationTradeoffCurrent;
  alternative?: DiversificationTradeoffAlternative;
};

export type SnapshotDiversificationTradeoffSummary = {
  available: boolean;
  currentLevel?: DiversificationLevel;
  alternativeLevel?: DiversificationLevel;
  apyCostPercent?: number;
  summary?: string;
};

export type BuildDiversificationTradeoffInput = {
  concentrationAnalysis: PortfolioConcentrationAnalysis;
  portfolioConstruction: PortfolioConstructionResult;
  opportunityRanking: OpportunityRanking;
  opportunities: readonly Opportunity[];
  targetDiversificationShare?: number;
};

type AlternativeStrategyPosition = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  weight: number;
};

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundPercent(value: number): number {
  return roundTo(value, 2);
}

function calculateStrategyApy(
  strategyPositions: readonly AlternativeStrategyPosition[],
  opportunities: readonly Opportunity[],
): number {
  const opportunityById = new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );

  let weightedApySum = 0;
  let totalWeight = 0;

  for (const position of strategyPositions) {
    const opportunity = opportunityById.get(position.opportunityId);
    if (opportunity === undefined) {
      continue;
    }

    weightedApySum += position.weight * opportunity.apy;
    totalWeight += position.weight;
  }

  if (totalWeight <= 0) {
    return 0;
  }

  return roundTo(weightedApySum / totalWeight, 6);
}

function toStrategyPositions(
  positions: readonly StrategyPosition[],
): AlternativeStrategyPosition[] {
  return positions.map((position) => ({
    opportunityId: position.opportunityId,
    protocolId: position.protocolId,
    protocolName: position.protocolName,
    asset: position.asset,
    weight: position.weight,
  }));
}

function buildAssetAllocations(
  strategyPositions: readonly AlternativeStrategyPosition[],
): DiversificationTradeoffAssetAllocation[] {
  const totalWeight = strategyPositions.reduce(
    (sum, position) => sum + position.weight,
    0,
  );

  if (totalWeight <= 0) {
    return [];
  }

  const assetWeights = new Map<string, number>();
  for (const position of strategyPositions) {
    assetWeights.set(
      position.asset,
      (assetWeights.get(position.asset) ?? 0) + position.weight,
    );
  }

  return [...assetWeights.entries()]
    .map(([asset, weight]) => ({
      asset,
      allocationPercent: roundPercent((weight / totalWeight) * 100),
    }))
    .sort((left, right) => right.allocationPercent - left.allocationPercent);
}

function buildProtocolAllocations(
  strategyPositions: readonly AlternativeStrategyPosition[],
): DiversificationTradeoffProtocolAllocation[] {
  const totalWeight = strategyPositions.reduce(
    (sum, position) => sum + position.weight,
    0,
  );

  if (totalWeight <= 0) {
    return [];
  }

  const protocolWeights = new Map<string, number>();
  for (const position of strategyPositions) {
    protocolWeights.set(
      position.protocolName,
      (protocolWeights.get(position.protocolName) ?? 0) + position.weight,
    );
  }

  return [...protocolWeights.entries()]
    .map(([protocolName, weight]) => ({
      protocolName,
      allocationPercent: roundPercent((weight / totalWeight) * 100),
    }))
    .sort((left, right) => right.allocationPercent - left.allocationPercent);
}

function findBestDifferentAssetCandidate(
  dominantAsset: string,
  selectedOpportunityIds: ReadonlySet<string>,
  opportunityRanking: OpportunityRanking,
): AlternativeStrategyPosition | null {
  for (const ranked of opportunityRanking.ranked) {
    if (selectedOpportunityIds.has(ranked.opportunityId)) {
      continue;
    }

    if (ranked.asset === dominantAsset) {
      continue;
    }

    return {
      opportunityId: ranked.opportunityId,
      protocolId: ranked.protocolId,
      protocolName: ranked.protocolName,
      asset: ranked.asset,
      weight: 0,
    };
  }

  return null;
}

function findLowestScoringSelectedPosition(
  strategyPositions: readonly AlternativeStrategyPosition[],
  opportunityRanking: OpportunityRanking,
): AlternativeStrategyPosition | null {
  const scoreByOpportunityId = new Map(
    opportunityRanking.ranked.map((ranked) => [
      ranked.opportunityId,
      ranked.scoring.score,
    ]),
  );

  const selected = strategyPositions.filter((position) =>
    scoreByOpportunityId.has(position.opportunityId),
  );

  if (selected.length === 0) {
    return null;
  }

  return selected.reduce((lowest, position) => {
    const lowestScore = scoreByOpportunityId.get(lowest.opportunityId) ?? 0;
    const positionScore = scoreByOpportunityId.get(position.opportunityId) ?? 0;
    return positionScore < lowestScore ? position : lowest;
  });
}

function buildAlternativeSummary(
  candidateAsset: string,
  diversificationSharePercent: number,
  apyCostPercent: number,
): string {
  return (
    `A more asset-diversified alternative could allocate ${diversificationSharePercent.toFixed(0)}% of strategy exposure to ${candidateAsset}, reducing strategy APY by approximately ${apyCostPercent.toFixed(2)}%. ` +
    "Informational only. Not selected because it has a lower score and lower APY under the current user preferences."
  );
}

export function buildDiversificationTradeoffSummary(
  tradeoff: DiversificationTradeoff,
): SnapshotDiversificationTradeoffSummary | undefined {
  if (!tradeoff.available || tradeoff.alternative === undefined) {
    return undefined;
  }

  return {
    available: true,
    currentLevel: tradeoff.current.diversificationLevel,
    alternativeLevel: tradeoff.alternative.diversificationLevel,
    apyCostPercent: tradeoff.alternative.apyCostPercent,
    summary: tradeoff.alternative.summary,
  };
}

export function buildDiversificationTradeoff(
  input: BuildDiversificationTradeoffInput,
): DiversificationTradeoff {
  const strategyPositions = toStrategyPositions(
    input.portfolioConstruction.positions.filter(
      (position) => position.type === "strategy",
    ),
  );
  const totalStrategyWeight = strategyPositions.reduce(
    (sum, position) => sum + position.weight,
    0,
  );
  const currentStrategyApy = calculateStrategyApy(
    strategyPositions,
    input.opportunities,
  );
  const current: DiversificationTradeoffCurrent = {
    strategyApy: currentStrategyApy,
    diversificationLevel: input.concentrationAnalysis.diversificationLevel,
    largestAsset: input.concentrationAnalysis.largestAsset,
    largestAssetAllocationPercent:
      input.concentrationAnalysis.largestAssetAllocationPercent,
  };

  if (input.concentrationAnalysis.diversificationLevel !== "low") {
    return {
      available: false,
      reason: "Current recommendation is already sufficiently diversified.",
      current,
    };
  }

  if (strategyPositions.length === 0 || totalStrategyWeight <= 0) {
    return {
      available: false,
      reason: "No strategy positions are available for tradeoff analysis.",
      current,
    };
  }

  const dominantAsset = input.concentrationAnalysis.largestAsset;
  if (dominantAsset === null) {
    return {
      available: false,
      reason: "No eligible non-dominant-asset opportunity is available.",
      current,
    };
  }

  const selectedOpportunityIds = new Set(
    strategyPositions.map((position) => position.opportunityId),
  );
  const candidate = findBestDifferentAssetCandidate(
    dominantAsset,
    selectedOpportunityIds,
    input.opportunityRanking,
  );

  if (candidate === null) {
    return {
      available: false,
      reason: "No eligible non-dominant-asset opportunity is available.",
      current,
    };
  }

  const lowestScoringSelected = findLowestScoringSelectedPosition(
    strategyPositions,
    input.opportunityRanking,
  );

  if (lowestScoringSelected === null) {
    return {
      available: false,
      reason: "No eligible non-dominant-asset opportunity is available.",
      current,
    };
  }

  const targetShare =
    input.targetDiversificationShare ?? DEFAULT_TARGET_DIVERSIFICATION_SHARE;
  const moveWeight = roundTo(
    Math.min(
      totalStrategyWeight * targetShare,
      lowestScoringSelected.weight,
    ),
    6,
  );

  if (moveWeight <= 0) {
    return {
      available: false,
      reason: "No eligible non-dominant-asset opportunity is available.",
      current,
    };
  }

  const alternativePositions = strategyPositions.map((position) => ({
    ...position,
  }));

  const sourceIndex = alternativePositions.findIndex(
    (position) => position.opportunityId === lowestScoringSelected.opportunityId,
  );

  if (sourceIndex === -1) {
    return {
      available: false,
      reason: "No eligible non-dominant-asset opportunity is available.",
      current,
    };
  }

  alternativePositions[sourceIndex] = {
    ...alternativePositions[sourceIndex]!,
    weight: roundTo(alternativePositions[sourceIndex]!.weight - moveWeight, 6),
  };

  const existingCandidateIndex = alternativePositions.findIndex(
    (position) => position.opportunityId === candidate.opportunityId,
  );

  if (existingCandidateIndex === -1) {
    alternativePositions.push({
      ...candidate,
      weight: moveWeight,
    });
  } else {
    alternativePositions[existingCandidateIndex] = {
      ...alternativePositions[existingCandidateIndex]!,
      weight: roundTo(
        alternativePositions[existingCandidateIndex]!.weight + moveWeight,
        6,
      ),
    };
  }

  const alternativeStrategyApy = calculateStrategyApy(
    alternativePositions.filter((position) => position.weight > 0),
    input.opportunities,
  );
  const apyCostPercent = roundPercent(
    (currentStrategyApy - alternativeStrategyApy) * 100,
  );
  const alternativeConcentration = analyzePortfolioConcentration(
    alternativePositions
      .filter((position) => position.weight > 0)
      .map((position) => ({
        asset: position.asset,
        protocolId: position.protocolId,
        protocolName: position.protocolName,
        weight: position.weight,
      })),
  );
  const diversificationSharePercent = roundPercent(
    (moveWeight / totalStrategyWeight) * 100,
  );

  return {
    available: true,
    current,
    alternative: {
      strategyApy: alternativeStrategyApy,
      diversificationLevel: alternativeConcentration.diversificationLevel,
      assetAllocations: buildAssetAllocations(
        alternativePositions.filter((position) => position.weight > 0),
      ),
      protocolAllocations: buildProtocolAllocations(
        alternativePositions.filter((position) => position.weight > 0),
      ),
      apyCostPercent,
      summary: buildAlternativeSummary(
        candidate.asset,
        diversificationSharePercent,
        apyCostPercent,
      ),
    },
  };
}
