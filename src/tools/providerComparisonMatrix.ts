import { resolveAaveBaseRpcUrl } from "../adapters/aave/aaveBaseConfig.js";
import { createLaminarRecommendation } from "../core/index.js";
import type { LaminarDataProvider } from "../core/providers/types.js";
import { MockLaminarDataProvider } from "../core/providers/MockLaminarDataProvider.js";
import {
  createAaveBaseLaminarDataProviderSnapshot,
  type AaveBaseProviderSnapshotOptions,
} from "../core/providers/AaveBaseLaminarDataProvider.js";
import type { LaminarRecommendationResult } from "../core/types.js";
import type { UserIntent } from "../core/intent/types.js";
import {
  DEFAULT_SENSITIVITY_AS_OF,
  extractScenarioSummary,
  SENSITIVITY_SCENARIOS,
  type SensitivityScenarioInput,
  type SensitivityScenarioSummary,
} from "./sensitivityMatrix.js";

export type ProviderComparisonSummary = SensitivityScenarioSummary & {
  providerName: string;
  providerType: string;
  opportunityCount: number;
  /** Present for Aave provider: indicates on-chain vs static-fallback data. */
  dataSourceLabel?: string;
};

export type ProviderDefinition = {
  providerType: string;
  providerName: string;
  provider: LaminarDataProvider;
  dataSourceLabel?: string;
};

export type ProviderComparisonResult = {
  providerType: string;
  providerName: string;
  dataSourceLabel?: string;
  scenarioName: string;
  input: {
    intent: UserIntent;
    portfolioValueUsd: number;
    asOf: string;
  };
  summary: ProviderComparisonSummary;
};

export type ProviderScenarioDifference = {
  scenarioName: string;
  mockProviderName: string;
  aaveProviderName: string;
  expectedApyDifference: number;
  strategyAllocationPercentDifference: number;
  liquidityBufferPercentDifference: number;
  topStrategyLabelChanged: boolean;
  mockTopStrategyLabel: string;
  aaveTopStrategyLabel: string;
  opportunityCountDifference: number;
};

export type ProviderComparisonMatrixResult = {
  asOf: string;
  providers: {
    providerType: string;
    providerName: string;
    dataSourceLabel?: string;
  }[];
  scenarios: SensitivityScenarioInput[];
  results: ProviderComparisonResult[];
  differences: ProviderScenarioDifference[];
};

export type ProviderComparisonMatrixOptions = {
  asOf?: Date;
  scenarios?: SensitivityScenarioInput[];
  aaveSnapshotOptions?: AaveBaseProviderSnapshotOptions;
};

export function extractProviderComparisonSummary(
  providerName: string,
  providerType: string,
  scenarioName: string,
  result: LaminarRecommendationResult,
  options: { dataSourceLabel?: string } = {},
): ProviderComparisonSummary {
  const base = extractScenarioSummary(scenarioName, result);

  return {
    ...base,
    providerName,
    providerType,
    opportunityCount: result.recommendation.diagnostics.opportunityCount,
    ...(options.dataSourceLabel !== undefined
      ? { dataSourceLabel: options.dataSourceLabel }
      : {}),
  };
}

export function resolveAaveDataSourceLabel(
  options: AaveBaseProviderSnapshotOptions = {},
): string {
  const rpcUrl =
    options.rpcUrl ??
    resolveAaveBaseRpcUrl(options.env ?? process.env);

  return rpcUrl !== undefined
    ? "on-chain (RPC configured)"
    : "static-fallback (no RPC configured)";
}

export function computeScenarioDifference(
  mock: ProviderComparisonSummary,
  aave: ProviderComparisonSummary,
): ProviderScenarioDifference {
  return {
    scenarioName: mock.scenarioName,
    mockProviderName: mock.providerName,
    aaveProviderName: aave.providerName,
    expectedApyDifference: aave.expectedApy - mock.expectedApy,
    strategyAllocationPercentDifference:
      aave.strategyAllocationPercent - mock.strategyAllocationPercent,
    liquidityBufferPercentDifference:
      aave.liquidityBufferPercent - mock.liquidityBufferPercent,
    topStrategyLabelChanged:
      mock.topStrategyPositionLabel !== aave.topStrategyPositionLabel,
    mockTopStrategyLabel: mock.topStrategyPositionLabel,
    aaveTopStrategyLabel: aave.topStrategyPositionLabel,
    opportunityCountDifference: aave.opportunityCount - mock.opportunityCount,
  };
}

export function computeAllScenarioDifferences(
  results: ProviderComparisonResult[],
): ProviderScenarioDifference[] {
  const scenarioNames = [
    ...new Set(results.map((entry) => entry.scenarioName)),
  ];

  return scenarioNames.map((scenarioName) => {
    const mockResult = results.find(
      (entry) =>
        entry.scenarioName === scenarioName &&
        entry.providerType === "MockLaminarDataProvider",
    );
    const aaveResult = results.find(
      (entry) =>
        entry.scenarioName === scenarioName &&
        entry.providerType === "AaveBaseLaminarDataProvider",
    );

    if (mockResult === undefined || aaveResult === undefined) {
      throw new Error(
        `Missing provider result for scenario "${scenarioName}"`,
      );
    }

    return computeScenarioDifference(
      mockResult.summary,
      aaveResult.summary,
    );
  });
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value.padEnd(maxLength);
  }

  if (maxLength <= 1) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatProviderComparisonTable(
  summaries: ProviderComparisonSummary[],
): string {
  const headers = [
    "Provider",
    "Scenario",
    "Profile",
    "Portfolio",
    "StratAPY",
    "PortAPY",
    "Strategy%",
    "Liq%",
    "Gas%",
    "#Strat",
    "#Rej",
    "Top Strategy",
    "Top%",
    "Warnings",
    "#Opps",
  ];

  const rows = summaries.map((summary) => [
    summary.dataSourceLabel !== undefined
      ? `${summary.providerName} [${summary.dataSourceLabel}]`
      : summary.providerName,
    summary.scenarioName,
    summary.selectedProfile,
    formatUsd(summary.portfolioValueUsd),
    `${(summary.strategyExpectedApy * 100).toFixed(2)}%`,
    `${(summary.portfolioExpectedApy * 100).toFixed(2)}%`,
    `${summary.strategyAllocationPercent.toFixed(2)}%`,
    `${summary.liquidityBufferPercent.toFixed(2)}%`,
    `${summary.gasReservePercent.toFixed(2)}%`,
    String(summary.numberOfStrategyPositions),
    String(summary.numberOfRejectedOpportunities),
    summary.topStrategyPositionLabel,
    formatPercent(summary.topStrategyAllocationPercent),
    summary.warningCodes.join(", ") || "—",
    String(summary.opportunityCount),
  ]);

  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[index]).length),
    ),
  );

  const formatRow = (cells: string[]) =>
    cells
      .map((cell, index) => truncate(String(cell), widths[index] ?? cell.length))
      .join(" | ");

  return [
    formatRow(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map((row) => formatRow(row)),
  ].join("\n");
}

export function formatDifferenceSummary(
  differences: ProviderScenarioDifference[],
): string {
  const headers = [
    "Scenario",
    "ΔAPY",
    "ΔStrategy%",
    "ΔLiq%",
    "Top Strategy",
    "ΔOpps",
  ];

  const rows = differences.map((diff) => [
    diff.scenarioName,
    formatSignedPercent(diff.expectedApyDifference * 100),
    formatSignedPercent(diff.strategyAllocationPercentDifference),
    formatSignedPercent(diff.liquidityBufferPercentDifference),
    diff.topStrategyLabelChanged
      ? `${diff.mockTopStrategyLabel} → ${diff.aaveTopStrategyLabel}`
      : "unchanged",
    diff.opportunityCountDifference > 0
      ? `+${diff.opportunityCountDifference.toString()}`
      : diff.opportunityCountDifference.toString(),
  ]);

  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[index]).length),
    ),
  );

  const formatRow = (cells: string[]) =>
    cells
      .map((cell, index) => truncate(String(cell), widths[index] ?? cell.length))
      .join(" | ");

  return [
    "Difference summary (Aave vs Mock):",
    formatRow(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map((row) => formatRow(row)),
  ].join("\n");
}

export async function runProviderComparisonMatrix(
  options: ProviderComparisonMatrixOptions = {},
): Promise<ProviderComparisonMatrixResult> {
  const asOf = options.asOf ?? DEFAULT_SENSITIVITY_AS_OF;
  const scenarios = options.scenarios ?? SENSITIVITY_SCENARIOS;
  const aaveSnapshotOptions = options.aaveSnapshotOptions ?? {};

  const mockProvider = new MockLaminarDataProvider();
  const aaveProvider = await createAaveBaseLaminarDataProviderSnapshot(
    aaveSnapshotOptions,
  );
  const aaveDataSourceLabel = resolveAaveDataSourceLabel(aaveSnapshotOptions);

  const providerDefinitions: ProviderDefinition[] = [
    {
      providerType: "MockLaminarDataProvider",
      providerName: "MockLaminarDataProvider",
      provider: mockProvider,
    },
    {
      providerType: "AaveBaseLaminarDataProvider",
      providerName: "Aave Base (experimental)",
      provider: aaveProvider,
      dataSourceLabel: aaveDataSourceLabel,
    },
  ];

  const results: ProviderComparisonResult[] = [];

  for (const providerDef of providerDefinitions) {
    for (const scenario of scenarios) {
      const result = createLaminarRecommendation({
        intent: scenario.intent,
        portfolioValueUsd: scenario.portfolioValueUsd,
        asOf,
        dataProvider: providerDef.provider,
      });

      results.push({
        providerType: providerDef.providerType,
        providerName: providerDef.providerName,
        ...(providerDef.dataSourceLabel !== undefined
          ? { dataSourceLabel: providerDef.dataSourceLabel }
          : {}),
        scenarioName: scenario.name,
        input: {
          intent: scenario.intent,
          portfolioValueUsd: scenario.portfolioValueUsd,
          asOf: asOf.toISOString(),
        },
        summary: extractProviderComparisonSummary(
          providerDef.providerName,
          providerDef.providerType,
          scenario.name,
          result,
          providerDef.dataSourceLabel !== undefined
            ? { dataSourceLabel: providerDef.dataSourceLabel }
            : {},
        ),
      });
    }
  }

  const differences = computeAllScenarioDifferences(results);

  return {
    asOf: asOf.toISOString(),
    providers: providerDefinitions.map((providerDef) => ({
      providerType: providerDef.providerType,
      providerName: providerDef.providerName,
      ...(providerDef.dataSourceLabel !== undefined
        ? { dataSourceLabel: providerDef.dataSourceLabel }
        : {}),
    })),
    scenarios,
    results,
    differences,
  };
}
