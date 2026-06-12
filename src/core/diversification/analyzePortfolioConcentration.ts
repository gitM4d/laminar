import type { PortfolioPosition } from "../construction/types.js";

export type DiversificationLevel = "low" | "medium" | "high";

export type StrategyConcentrationInput = {
  asset: string;
  protocolId: string;
  protocolName: string;
  weight: number;
};

export type PortfolioConcentrationAnalysis = {
  assetConcentrationPercent: number;
  protocolConcentrationPercent: number;
  uniqueAssets: number;
  uniqueProtocols: number;
  largestAsset: string | null;
  largestAssetAllocationPercent: number;
  largestProtocol: string | null;
  largestProtocolAllocationPercent: number;
  diversificationLevel: DiversificationLevel;
  warnings: string[];
};

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function aggregateWeights(
  strategyPositions: readonly StrategyConcentrationInput[],
): {
  assetWeights: Map<string, number>;
  protocolWeights: Map<string, { protocolName: string; weight: number }>;
  totalStrategyWeight: number;
} {
  const assetWeights = new Map<string, number>();
  const protocolWeights = new Map<
    string,
    { protocolName: string; weight: number }
  >();
  let totalStrategyWeight = 0;

  for (const position of strategyPositions) {
    totalStrategyWeight += position.weight;
    assetWeights.set(
      position.asset,
      (assetWeights.get(position.asset) ?? 0) + position.weight,
    );

    const existing = protocolWeights.get(position.protocolId);
    if (existing === undefined) {
      protocolWeights.set(position.protocolId, {
        protocolName: position.protocolName,
        weight: position.weight,
      });
    } else {
      existing.weight += position.weight;
    }
  }

  return { assetWeights, protocolWeights, totalStrategyWeight };
}

function findLargestEntry<T>(
  entries: readonly { key: T; weight: number }[],
): { key: T; weight: number } | null {
  if (entries.length === 0) {
    return null;
  }

  return entries.reduce((largest, entry) =>
    entry.weight > largest.weight ? entry : largest,
  );
}

function resolveDiversificationLevel(
  uniqueAssets: number,
  uniqueProtocols: number,
  largestAssetAllocationPercent: number,
): DiversificationLevel {
  if (
    uniqueProtocols >= 3 &&
    uniqueAssets >= 3 &&
    largestAssetAllocationPercent <= 50
  ) {
    return "high";
  }

  if (
    uniqueProtocols >= 2 &&
    uniqueAssets >= 2 &&
    largestAssetAllocationPercent <= 80
  ) {
    return "medium";
  }

  return "low";
}

function buildConcentrationWarnings(
  analysis: Omit<PortfolioConcentrationAnalysis, "warnings">,
): string[] {
  const warnings: string[] = [];

  if (
    analysis.largestAsset !== null &&
    analysis.largestAssetAllocationPercent >= 95
  ) {
    warnings.push(
      `${roundPercent(analysis.largestAssetAllocationPercent).toFixed(0)}% of strategy allocation is exposed to ${analysis.largestAsset}.`,
    );
  }

  if (analysis.uniqueProtocols >= 2 && analysis.uniqueAssets === 1) {
    warnings.push(
      `Strategy allocation spans ${analysis.uniqueProtocols.toString()} protocols but only 1 asset.`,
    );
  }

  if (analysis.largestProtocolAllocationPercent > 70) {
    warnings.push(
      "More than 70% of strategy allocation is concentrated in a single protocol.",
    );
  }

  if (analysis.diversificationLevel === "low") {
    warnings.push("Portfolio diversification is low.");
  }

  return warnings;
}

export function analyzePortfolioConcentration(
  strategyPositions: readonly StrategyConcentrationInput[],
): PortfolioConcentrationAnalysis {
  if (strategyPositions.length === 0) {
    return {
      assetConcentrationPercent: 0,
      protocolConcentrationPercent: 0,
      uniqueAssets: 0,
      uniqueProtocols: 0,
      largestAsset: null,
      largestAssetAllocationPercent: 0,
      largestProtocol: null,
      largestProtocolAllocationPercent: 0,
      diversificationLevel: "low",
      warnings: ["Portfolio diversification is low."],
    };
  }

  const { assetWeights, protocolWeights, totalStrategyWeight } =
    aggregateWeights(strategyPositions);

  const assetEntries = [...assetWeights.entries()].map(([asset, weight]) => ({
    key: asset,
    weight,
  }));
  const protocolEntries = [...protocolWeights.entries()].map(
    ([, { protocolName, weight }]) => ({
      key: protocolName,
      weight,
    }),
  );

  const largestAssetEntry = findLargestEntry(assetEntries);
  const largestProtocolEntry = findLargestEntry(protocolEntries);

  const largestAssetAllocationPercent =
    largestAssetEntry === null || totalStrategyWeight <= 0
      ? 0
      : roundPercent((largestAssetEntry.weight / totalStrategyWeight) * 100);
  const largestProtocolAllocationPercent =
    largestProtocolEntry === null || totalStrategyWeight <= 0
      ? 0
      : roundPercent((largestProtocolEntry.weight / totalStrategyWeight) * 100);

  const uniqueAssets = assetWeights.size;
  const uniqueProtocols = protocolWeights.size;
  const diversificationLevel = resolveDiversificationLevel(
    uniqueAssets,
    uniqueProtocols,
    largestAssetAllocationPercent,
  );

  const baseAnalysis: Omit<PortfolioConcentrationAnalysis, "warnings"> = {
    assetConcentrationPercent: largestAssetAllocationPercent,
    protocolConcentrationPercent: largestProtocolAllocationPercent,
    uniqueAssets,
    uniqueProtocols,
    largestAsset: largestAssetEntry?.key ?? null,
    largestAssetAllocationPercent,
    largestProtocol: largestProtocolEntry?.key ?? null,
    largestProtocolAllocationPercent,
    diversificationLevel,
  };

  return {
    ...baseAnalysis,
    warnings: buildConcentrationWarnings(baseAnalysis),
  };
}

export function analyzePortfolioConcentrationFromConstruction(
  positions: readonly PortfolioPosition[],
): PortfolioConcentrationAnalysis {
  const strategyPositions = positions
    .filter((position) => position.type === "strategy")
    .map((position) => ({
      asset: position.asset,
      protocolId: position.protocolId,
      protocolName: position.protocolName,
      weight: position.weight,
    }));

  return analyzePortfolioConcentration(strategyPositions);
}
