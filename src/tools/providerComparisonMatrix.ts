import { resolveAaveBaseRpcUrl } from "../adapters/aave/aaveBaseConfig.js";
import { resolveMorphoBaseApiUrl } from "../adapters/morpho/morphoBaseConfig.js";
import { resolveMoonwellBaseApiUrl } from "../adapters/moonwell/moonwellBaseConfig.js";
import { resolveFluidBaseApiUrl } from "../adapters/fluid/fluidBaseConfig.js";
import { resolveAllowStaticMarketData } from "../adapters/realDataEligibility.js";
import { createLaminarRecommendation } from "../core/index.js";
import type { LaminarDataProvider } from "../core/providers/types.js";
import { MockLaminarDataProvider } from "../core/providers/MockLaminarDataProvider.js";
import {
  createAaveBaseLaminarDataProviderSnapshot,
  type AaveBaseProviderSnapshotOptions,
} from "../core/providers/AaveBaseLaminarDataProvider.js";
import {
  createMorphoBaseLaminarDataProviderSnapshot,
  type MorphoBaseProviderSnapshotOptions,
} from "../core/providers/MorphoBaseLaminarDataProvider.js";
import {
  createMoonwellBaseLaminarDataProviderSnapshot,
  type MoonwellBaseProviderSnapshotOptions,
} from "../core/providers/MoonwellBaseLaminarDataProvider.js";
import {
  createFluidBaseLaminarDataProviderSnapshot,
  type FluidBaseProviderSnapshotOptions,
} from "../core/providers/FluidBaseLaminarDataProvider.js";
import { CombinedLaminarDataProvider } from "../core/providers/CombinedLaminarDataProvider.js";
import type { LaminarRecommendationResult } from "../core/types.js";
import type { UserIntent } from "../core/intent/types.js";
import {
  DEFAULT_SENSITIVITY_AS_OF,
  extractScenarioSummary,
  SENSITIVITY_SCENARIOS,
  type SensitivityScenarioInput,
  type SensitivityScenarioSummary,
} from "./sensitivityMatrix.js";

export type ProviderDataQualityLabel =
  | "static"
  | "static-fallback"
  | "real-onchain"
  | "real-onchain-approx"
  | "real-api"
  | "mixed-real"
  | "mixed-fallback"
  | "mock"
  | "curated";

export type ProviderDataQuality = {
  providerType: string;
  providerName: string;
  apyData: ProviderDataQualityLabel;
  tvlData: ProviderDataQualityLabel;
  trustData: ProviderDataQualityLabel;
  liquidityData: ProviderDataQualityLabel;
  /** Optional human-readable source note (e.g. RPC/API configured vs fallback). */
  dataSourceLabel?: string;
};

export type ProviderComparisonSummary = SensitivityScenarioSummary & {
  providerName: string;
  providerType: string;
  opportunityCount: number;
  /** Present for real providers: indicates on-chain/API vs static-fallback data. */
  dataSourceLabel?: string;
};

export type ProviderDefinition = {
  providerType: string;
  providerName: string;
  provider: LaminarDataProvider;
  dataSourceLabel?: string;
  dataQuality: ProviderDataQuality;
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
  realProviderName: string;
  strategyExpectedApyDifference: number;
  portfolioExpectedApyDifference: number;
  /** Legacy alias of strategyExpectedApyDifference. */
  expectedApyDifference: number;
  strategyAllocationPercentDifference: number;
  liquidityBufferPercentDifference: number;
  topStrategyLabelChanged: boolean;
  mockTopStrategyLabel: string;
  realTopStrategyLabel: string;
  opportunityCountDifference: number;
};

export type ProviderComparisonDifferences = {
  aaveVsMock: ProviderScenarioDifference[];
  morphoVsMock: ProviderScenarioDifference[];
  combinedVsMock: ProviderScenarioDifference[];
};

export type RealProviderComparisonDifferences = {
  aaveVsCombined: ProviderScenarioDifference[];
  morphoVsCombined: ProviderScenarioDifference[];
  fluidVsCombined: ProviderScenarioDifference[];
};

export type ProviderComparisonMatrixResult = {
  asOf: string;
  /** True when MockLaminarDataProvider is included in providers/results. */
  includeMock: boolean;
  providers: {
    providerType: string;
    providerName: string;
    dataSourceLabel?: string;
  }[];
  providerDataQuality: ProviderDataQuality[];
  scenarios: SensitivityScenarioInput[];
  results: ProviderComparisonResult[];
  differences: ProviderComparisonDifferences | RealProviderComparisonDifferences;
};

export type ProviderComparisonMatrixOptions = {
  asOf?: Date;
  scenarios?: SensitivityScenarioInput[];
  aaveSnapshotOptions?: AaveBaseProviderSnapshotOptions;
  morphoSnapshotOptions?: MorphoBaseProviderSnapshotOptions;
  moonwellSnapshotOptions?: MoonwellBaseProviderSnapshotOptions;
  fluidSnapshotOptions?: FluidBaseProviderSnapshotOptions;
  /** When false, excludes MockLaminarDataProvider from the matrix. Default true. */
  includeMock?: boolean;
};

const MOCK_DATA_QUALITY: ProviderDataQuality = {
  providerType: "MockLaminarDataProvider",
  providerName: "MockLaminarDataProvider",
  apyData: "static",
  tvlData: "static",
  trustData: "mock",
  liquidityData: "mock",
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
    options.rpcUrl ?? resolveAaveBaseRpcUrl(options.env ?? process.env);

  return rpcUrl !== undefined
    ? "on-chain (RPC configured)"
    : "static-fallback (no RPC configured)";
}

export function resolveMorphoDataSourceLabel(
  options: MorphoBaseProviderSnapshotOptions = {},
): string {
  if (options.disableApi === true) {
    return "static-fallback (API disabled)";
  }

  const apiUrl =
    options.apiUrl ?? resolveMorphoBaseApiUrl(options.env ?? process.env);

  return apiUrl !== undefined
    ? "api (Morpho GraphQL configured)"
    : "static-fallback (no API configured)";
}

export function resolveAaveDataQuality(
  options: AaveBaseProviderSnapshotOptions = {},
): ProviderDataQuality {
  const rpcUrl =
    options.rpcUrl ?? resolveAaveBaseRpcUrl(options.env ?? process.env);
  const isFallback = rpcUrl === undefined;

  return {
    providerType: "AaveBaseLaminarDataProvider",
    providerName: "Aave Base (experimental)",
    apyData: isFallback ? "static-fallback" : "real-onchain",
    tvlData: isFallback ? "static-fallback" : "real-onchain-approx",
    trustData: "curated",
    liquidityData: "curated",
    dataSourceLabel: resolveAaveDataSourceLabel(options),
  };
}

export function resolveMorphoDataQuality(
  options: MorphoBaseProviderSnapshotOptions = {},
): ProviderDataQuality {
  const isFallback =
    options.disableApi === true ||
    (options.apiUrl ?? resolveMorphoBaseApiUrl(options.env ?? process.env)) ===
      undefined;

  return {
    providerType: "MorphoBaseLaminarDataProvider",
    providerName: "Morpho Base (experimental)",
    apyData: isFallback ? "static-fallback" : "real-api",
    tvlData: isFallback ? "static-fallback" : "real-api",
    trustData: "curated",
    liquidityData: "curated",
    dataSourceLabel: resolveMorphoDataSourceLabel(options),
  };
}

export function resolveMoonwellDataSourceLabel(
  options: MoonwellBaseProviderSnapshotOptions = {},
): string {
  const allowStatic =
    options.allowStaticMarketData === true ||
    resolveAllowStaticMarketData(options.env ?? process.env);
  const requireRealData = options.requireRealData ?? false;

  if (options.disableApi === true) {
    return requireRealData && !allowStatic
      ? "unavailable (no real data configured)"
      : "static-fallback (API disabled)";
  }

  const apiUrl =
    options.apiUrl ?? resolveMoonwellBaseApiUrl(options.env ?? process.env);

  if (apiUrl === undefined) {
    return requireRealData && !allowStatic
      ? "unavailable (no real data configured)"
      : "static-fallback (no API configured)";
  }

  return "api (Moonwell data API configured)";
}

export function resolveMoonwellDataQuality(
  options: MoonwellBaseProviderSnapshotOptions = {},
): ProviderDataQuality {
  const allowStatic =
    options.allowStaticMarketData === true ||
    resolveAllowStaticMarketData(options.env ?? process.env);
  const requireRealData = options.requireRealData ?? false;
  const isFallback =
    options.disableApi === true ||
    (options.apiUrl ?? resolveMoonwellBaseApiUrl(options.env ?? process.env)) ===
      undefined;

  if (requireRealData && !allowStatic && isFallback) {
    return {
      providerType: "MoonwellBaseLaminarDataProvider",
      providerName: "Moonwell Base (experimental)",
      apyData: "static-fallback",
      tvlData: "static-fallback",
      trustData: "curated",
      liquidityData: "curated",
      dataSourceLabel: "unavailable (no real data configured)",
    };
  }

  return {
    providerType: "MoonwellBaseLaminarDataProvider",
    providerName: "Moonwell Base (experimental)",
    apyData: isFallback ? "static-fallback" : "real-api",
    tvlData: isFallback ? "static-fallback" : "real-api",
    trustData: "curated",
    liquidityData: "curated",
    dataSourceLabel: resolveMoonwellDataSourceLabel(options),
  };
}

export function resolveFluidDataSourceLabel(
  options: FluidBaseProviderSnapshotOptions = {},
): string {
  if (options.disableApi === true) {
    return "unavailable (no real data configured)";
  }

  const apiUrl =
    options.apiUrl ?? resolveFluidBaseApiUrl(options.env ?? process.env);

  return apiUrl !== undefined
    ? "api (Fluid/Instadapp lending API configured)"
    : "unavailable (no real data configured)";
}

export function resolveFluidDataQuality(
  options: FluidBaseProviderSnapshotOptions = {},
): ProviderDataQuality {
  const isUnavailable =
    options.disableApi === true ||
    (options.apiUrl ?? resolveFluidBaseApiUrl(options.env ?? process.env)) ===
      undefined;

  if (isUnavailable) {
    return {
      providerType: "FluidBaseLaminarDataProvider",
      providerName: "Fluid Base (experimental)",
      apyData: "static-fallback",
      tvlData: "static-fallback",
      trustData: "curated",
      liquidityData: "curated",
      dataSourceLabel: "unavailable (no real data configured)",
    };
  }

  return {
    providerType: "FluidBaseLaminarDataProvider",
    providerName: "Fluid Base (experimental)",
    apyData: "real-api",
    tvlData: "real-api",
    trustData: "curated",
    liquidityData: "curated",
    dataSourceLabel: resolveFluidDataSourceLabel(options),
  };
}

/** Short protocol label from a curated provider name (e.g. "Aave Base (...)" → "Aave"). */
function shortProviderName(providerName: string): string {
  return providerName.split(" ")[0] ?? providerName;
}

/**
 * Aggregates the data quality of an arbitrary set of sub-providers into a single
 * Combined data quality. Accepts any number of sub-provider qualities so the
 * Combined universe can grow (Aave + Morpho + Moonwell + …) without changes.
 *
 * - apy/tvl are "mixed-real" if ANY sub-provider has real (non-fallback) data,
 *   otherwise "mixed-fallback".
 * - trust/liquidity remain "curated" (every real provider curates these).
 */
export function resolveCombinedDataQuality(
  ...qualities: ProviderDataQuality[]
): ProviderDataQuality {
  const someReal = qualities.some(
    (quality) =>
      quality.apyData !== "static-fallback" &&
      quality.tvlData !== "static-fallback" &&
      quality.dataSourceLabel !== "unavailable (no real data configured)",
  );

  const apyData: ProviderDataQualityLabel = someReal
    ? "mixed-real"
    : "mixed-fallback";
  const tvlData: ProviderDataQualityLabel = apyData;

  const labels: string[] = [];
  for (const quality of qualities) {
    if (quality.dataSourceLabel !== undefined) {
      labels.push(`${shortProviderName(quality.providerName)}: ${quality.dataSourceLabel}`);
    }
  }

  const providerName =
    qualities.length > 0
      ? `Combined ${qualities.map((quality) => shortProviderName(quality.providerName)).join(" + ")} (experimental)`
      : "Combined (experimental)";

  return {
    providerType: "CombinedLaminarDataProvider",
    providerName,
    apyData,
    tvlData,
    trustData: "curated",
    liquidityData: "curated",
    ...(labels.length > 0 ? { dataSourceLabel: labels.join("; ") } : {}),
  };
}

export function computeScenarioDifference(
  mock: ProviderComparisonSummary,
  real: ProviderComparisonSummary,
): ProviderScenarioDifference {
  const strategyExpectedApyDifference =
    real.strategyExpectedApy - mock.strategyExpectedApy;

  return {
    scenarioName: mock.scenarioName,
    mockProviderName: mock.providerName,
    realProviderName: real.providerName,
    strategyExpectedApyDifference,
    portfolioExpectedApyDifference:
      real.portfolioExpectedApy - mock.portfolioExpectedApy,
    expectedApyDifference: strategyExpectedApyDifference,
    strategyAllocationPercentDifference:
      real.strategyAllocationPercent - mock.strategyAllocationPercent,
    liquidityBufferPercentDifference:
      real.liquidityBufferPercent - mock.liquidityBufferPercent,
    topStrategyLabelChanged:
      mock.topStrategyPositionLabel !== real.topStrategyPositionLabel,
    mockTopStrategyLabel: mock.topStrategyPositionLabel,
    realTopStrategyLabel: real.topStrategyPositionLabel,
    opportunityCountDifference: real.opportunityCount - mock.opportunityCount,
  };
}

export function computeScenarioDifferencesForProvider(
  results: ProviderComparisonResult[],
  realProviderType: string,
): ProviderScenarioDifference[] {
  return computeScenarioDifferencesBetweenProviders(
    results,
    "MockLaminarDataProvider",
    realProviderType,
  );
}

export function computeScenarioDifferencesBetweenProviders(
  results: ProviderComparisonResult[],
  baselineProviderType: string,
  comparisonProviderType: string,
): ProviderScenarioDifference[] {
  const scenarioNames = [
    ...new Set(results.map((entry) => entry.scenarioName)),
  ];

  return scenarioNames.map((scenarioName) => {
    const baselineResult = results.find(
      (entry) =>
        entry.scenarioName === scenarioName &&
        entry.providerType === baselineProviderType,
    );
    const comparisonResult = results.find(
      (entry) =>
        entry.scenarioName === scenarioName &&
        entry.providerType === comparisonProviderType,
    );

    if (baselineResult === undefined || comparisonResult === undefined) {
      throw new Error(
        `Missing provider result for scenario "${scenarioName}" (${baselineProviderType} vs ${comparisonProviderType})`,
      );
    }

    return computeScenarioDifference(
      baselineResult.summary,
      comparisonResult.summary,
    );
  });
}

export function computeRealProviderDifferences(
  results: ProviderComparisonResult[],
): RealProviderComparisonDifferences {
  return {
    aaveVsCombined: computeScenarioDifferencesBetweenProviders(
      results,
      "AaveBaseLaminarDataProvider",
      "CombinedLaminarDataProvider",
    ),
    morphoVsCombined: computeScenarioDifferencesBetweenProviders(
      results,
      "MorphoBaseLaminarDataProvider",
      "CombinedLaminarDataProvider",
    ),
    fluidVsCombined: computeScenarioDifferencesBetweenProviders(
      results,
      "FluidBaseLaminarDataProvider",
      "CombinedLaminarDataProvider",
    ),
  };
}

/** @deprecated Use computeScenarioDifferencesForProvider with Aave provider type. */
export function computeAllScenarioDifferences(
  results: ProviderComparisonResult[],
): ProviderScenarioDifference[] {
  return computeScenarioDifferencesForProvider(
    results,
    "AaveBaseLaminarDataProvider",
  );
}

export function computeAllProviderDifferences(
  results: ProviderComparisonResult[],
): ProviderComparisonDifferences {
  return {
    aaveVsMock: computeScenarioDifferencesForProvider(
      results,
      "AaveBaseLaminarDataProvider",
    ),
    morphoVsMock: computeScenarioDifferencesForProvider(
      results,
      "MorphoBaseLaminarDataProvider",
    ),
    combinedVsMock: computeScenarioDifferencesForProvider(
      results,
      "CombinedLaminarDataProvider",
    ),
  };
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

export function formatProviderDataQualityTable(
  qualities: ProviderDataQuality[],
): string {
  const headers = [
    "Provider",
    "APY Data",
    "TVL Data",
    "Trust Data",
    "Liquidity Data",
  ];

  const rows = qualities.map((quality) => [
    quality.dataSourceLabel !== undefined
      ? `${quality.providerName} [${quality.dataSourceLabel}]`
      : quality.providerName,
    quality.apyData,
    quality.tvlData,
    quality.trustData,
    quality.liquidityData,
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
    "Provider Data Quality:",
    formatRow(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map((row) => formatRow(row)),
  ].join("\n");
}

export type LiquidityDataQualityLabel =
  | "real-market-data"
  | "curated-fallback"
  | "mixed-real"
  | "mixed-fallback";

export function resolveLiquidityDataQualityLabel(
  quality: ProviderDataQuality,
): LiquidityDataQualityLabel {
  if (quality.providerType === "CombinedLaminarDataProvider") {
    return quality.apyData === "mixed-real" ? "mixed-real" : "mixed-fallback";
  }

  if (
    quality.dataSourceLabel === "unavailable (no real data configured)" ||
    quality.trustData === "mock" ||
    (quality.apyData === "static-fallback" && quality.tvlData === "static-fallback")
  ) {
    return "curated-fallback";
  }

  return "real-market-data";
}

export function formatLiquidityDataQualityTable(
  qualities: ProviderDataQuality[],
): string {
  const headers = ["Provider", "Liquidity Signals"];

  const rows = qualities.map((quality) => [
    quality.dataSourceLabel !== undefined
      ? `${quality.providerName} [${quality.dataSourceLabel}]`
      : quality.providerName,
    resolveLiquidityDataQualityLabel(quality),
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
    "Liquidity Data Quality:",
    formatRow(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map((row) => formatRow(row)),
  ].join("\n");
}

export function formatDifferenceSummary(
  title: string,
  differences: ProviderScenarioDifference[],
): string {
  const headers = [
    "Scenario",
    "ΔStratAPY",
    "ΔPortAPY",
    "ΔStrategy%",
    "ΔLiq%",
    "Top Strategy",
    "ΔOpps",
  ];

  const rows = differences.map((diff) => [
    diff.scenarioName,
    formatSignedPercent(diff.strategyExpectedApyDifference * 100),
    formatSignedPercent(diff.portfolioExpectedApyDifference * 100),
    formatSignedPercent(diff.strategyAllocationPercentDifference),
    formatSignedPercent(diff.liquidityBufferPercentDifference),
    diff.topStrategyLabelChanged
      ? `${diff.mockTopStrategyLabel} → ${diff.realTopStrategyLabel}`
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
    title,
    formatRow(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map((row) => formatRow(row)),
  ].join("\n");
}

export function formatAllDifferenceSummaries(
  differences: ProviderComparisonDifferences,
): string {
  return [
    formatDifferenceSummary(
      "Difference summary (Aave vs Mock):",
      differences.aaveVsMock,
    ),
    "",
    formatDifferenceSummary(
      "Difference summary (Morpho vs Mock):",
      differences.morphoVsMock,
    ),
    "",
    formatDifferenceSummary(
      "Difference summary (Combined vs Mock):",
      differences.combinedVsMock,
    ),
  ].join("\n");
}

export function formatRealProviderDifferenceSummaries(
  differences: RealProviderComparisonDifferences,
): string {
  return [
    formatDifferenceSummary(
      "Real Provider Delta vs Combined (Aave vs Combined):",
      differences.aaveVsCombined,
    ),
    "",
    formatDifferenceSummary(
      "Real Provider Delta vs Combined (Morpho vs Combined):",
      differences.morphoVsCombined,
    ),
    "",
    formatDifferenceSummary(
      "Real Provider Delta vs Combined (Fluid vs Combined):",
      differences.fluidVsCombined,
    ),
  ].join("\n");
}

export function isMockProviderComparisonDifferences(
  differences: ProviderComparisonDifferences | RealProviderComparisonDifferences,
): differences is ProviderComparisonDifferences {
  return "aaveVsMock" in differences;
}

export async function runProviderComparisonMatrix(
  options: ProviderComparisonMatrixOptions = {},
): Promise<ProviderComparisonMatrixResult> {
  const includeMock = options.includeMock ?? true;
  const asOf = options.asOf ?? DEFAULT_SENSITIVITY_AS_OF;
  const scenarios = options.scenarios ?? SENSITIVITY_SCENARIOS;
  const aaveSnapshotOptions = options.aaveSnapshotOptions ?? {};
  const morphoSnapshotOptions = options.morphoSnapshotOptions ?? {};
  const moonwellSnapshotOptions = {
    requireRealData: true,
    ...options.moonwellSnapshotOptions,
  };
  const fluidSnapshotOptions = options.fluidSnapshotOptions ?? {};

  const mockProvider = new MockLaminarDataProvider();
  const aaveProvider = await createAaveBaseLaminarDataProviderSnapshot(
    aaveSnapshotOptions,
  );
  const morphoProvider = await createMorphoBaseLaminarDataProviderSnapshot(
    morphoSnapshotOptions,
  );
  const moonwellProvider = await createMoonwellBaseLaminarDataProviderSnapshot(
    moonwellSnapshotOptions,
  );
  const fluidProvider = await createFluidBaseLaminarDataProviderSnapshot(
    fluidSnapshotOptions,
  );

  const aaveDataQuality = resolveAaveDataQuality(aaveSnapshotOptions);
  const morphoDataQuality = resolveMorphoDataQuality(morphoSnapshotOptions);
  const moonwellDataQuality = resolveMoonwellDataQuality(
    moonwellSnapshotOptions,
  );
  const fluidDataQuality = resolveFluidDataQuality(fluidSnapshotOptions);

  const combinedSubProviders: LaminarDataProvider[] = [
    aaveProvider,
    morphoProvider,
  ];
  const combinedQualities: ProviderDataQuality[] = [
    aaveDataQuality,
    morphoDataQuality,
  ];
  let moonwellUnavailable = false;
  let fluidUnavailable = false;

  if (moonwellProvider.discoverOpportunities().length > 0) {
    combinedSubProviders.push(moonwellProvider);
    combinedQualities.push(moonwellDataQuality);
  } else {
    moonwellUnavailable = true;
  }

  if (fluidProvider.discoverOpportunities().length > 0) {
    combinedSubProviders.push(fluidProvider);
    combinedQualities.push(fluidDataQuality);
  } else {
    fluidUnavailable = true;
  }

  let combinedDataQuality = resolveCombinedDataQuality(...combinedQualities);
  const unavailableLabels: string[] = [];
  if (moonwellUnavailable) {
    unavailableLabels.push("Moonwell: unavailable (no real data configured)");
  }
  if (fluidUnavailable) {
    unavailableLabels.push("Fluid: unavailable (no real data configured)");
  }
  if (unavailableLabels.length > 0) {
    combinedDataQuality = {
      ...combinedDataQuality,
      dataSourceLabel: [
        combinedDataQuality.dataSourceLabel,
        ...unavailableLabels,
      ]
        .filter((label): label is string => label !== undefined && label.length > 0)
        .join("; "),
    };
  }

  const combinedProvider = new CombinedLaminarDataProvider(combinedSubProviders);

  const providerDefinitions: ProviderDefinition[] = [];

  if (includeMock) {
    providerDefinitions.push({
      providerType: "MockLaminarDataProvider",
      providerName: "MockLaminarDataProvider",
      provider: mockProvider,
      dataQuality: MOCK_DATA_QUALITY,
    });
  }

  providerDefinitions.push(
    {
      providerType: "AaveBaseLaminarDataProvider",
      providerName: "Aave Base (experimental)",
      provider: aaveProvider,
      dataQuality: aaveDataQuality,
      ...(aaveDataQuality.dataSourceLabel !== undefined
        ? { dataSourceLabel: aaveDataQuality.dataSourceLabel }
        : {}),
    },
    {
      providerType: "MorphoBaseLaminarDataProvider",
      providerName: "Morpho Base (experimental)",
      provider: morphoProvider,
      dataQuality: morphoDataQuality,
      ...(morphoDataQuality.dataSourceLabel !== undefined
        ? { dataSourceLabel: morphoDataQuality.dataSourceLabel }
        : {}),
    },
    {
      providerType: "FluidBaseLaminarDataProvider",
      providerName: "Fluid Base (experimental)",
      provider: fluidProvider,
      dataQuality: fluidDataQuality,
      ...(fluidDataQuality.dataSourceLabel !== undefined
        ? { dataSourceLabel: fluidDataQuality.dataSourceLabel }
        : {}),
    },
    {
      providerType: "CombinedLaminarDataProvider",
      providerName: combinedDataQuality.providerName,
      provider: combinedProvider,
      dataQuality: combinedDataQuality,
      ...(combinedDataQuality.dataSourceLabel !== undefined
        ? { dataSourceLabel: combinedDataQuality.dataSourceLabel }
        : {}),
    },
  );

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

  const providerDataQuality = providerDefinitions.map(
    (providerDef) => providerDef.dataQuality,
  );
  const differences = includeMock
    ? computeAllProviderDifferences(results)
    : computeRealProviderDifferences(results);

  return {
    asOf: asOf.toISOString(),
    includeMock,
    providers: providerDefinitions.map((providerDef) => ({
      providerType: providerDef.providerType,
      providerName: providerDef.providerName,
      ...(providerDef.dataSourceLabel !== undefined
        ? { dataSourceLabel: providerDef.dataSourceLabel }
        : {}),
    })),
    providerDataQuality,
    scenarios,
    results,
    differences,
  };
}

/** Real-provider-only matrix: Aave, Morpho, Fluid, Combined — no Mock. */
export async function runRealProviderComparisonMatrix(
  options: Omit<ProviderComparisonMatrixOptions, "includeMock"> = {},
): Promise<ProviderComparisonMatrixResult> {
  return runProviderComparisonMatrix({ ...options, includeMock: false });
}
