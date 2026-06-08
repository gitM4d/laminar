import { createLaminarRecommendation } from "../core/index.js";
import type { LaminarRecommendationResult } from "../core/types.js";
import type { RecommendationSnapshot } from "../core/snapshot/types.js";
import type { UserIntent } from "../core/intent/types.js";

export type SensitivityScenarioInput = {
  name: string;
  intent: UserIntent;
  portfolioValueUsd: number;
};

export type SensitivityScenarioSummary = {
  scenarioName: string;
  selectedProfile: string;
  portfolioValueUsd: number;
  expectedApy: number;
  strategyAllocationPercent: number;
  liquidityBufferPercent: number;
  gasReservePercent: number;
  numberOfStrategyPositions: number;
  numberOfRejectedOpportunities: number;
  topStrategyPositionLabel: string;
  topStrategyAllocationPercent: number | null;
  warningCodes: string[];
};

export type SensitivityScenarioResult = {
  name: string;
  input: {
    intent: UserIntent;
    portfolioValueUsd: number;
    asOf: string;
  };
  summary: SensitivityScenarioSummary;
  result: LaminarRecommendationResult;
};

export const SENSITIVITY_SCENARIOS: SensitivityScenarioInput[] = [
  {
    name: "Conservative default",
    intent: { risk: 1, liquidity: 10, returnPreference: 2 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Balanced default",
    intent: { risk: 5, liquidity: 6, returnPreference: 5 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Yield Focused default",
    intent: { risk: 8, liquidity: 5, returnPreference: 10 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Low liquidity tolerance / high return",
    intent: { risk: 8, liquidity: 2, returnPreference: 10 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "High liquidity requirement / low risk",
    intent: { risk: 1, liquidity: 10, returnPreference: 1 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Balanced small portfolio",
    intent: { risk: 5, liquidity: 6, returnPreference: 5 },
    portfolioValueUsd: 500,
  },
  {
    name: "Balanced large portfolio",
    intent: { risk: 5, liquidity: 6, returnPreference: 5 },
    portfolioValueUsd: 100_000,
  },
];

export const DEFAULT_SENSITIVITY_AS_OF = new Date("2026-06-01T00:00:00.000Z");

function getMetricNumber(snapshot: RecommendationSnapshot, key: string): number {
  const metric = snapshot.metrics.find((entry) => entry.key === key);

  if (metric === undefined || typeof metric.value !== "number") {
    return 0;
  }

  return metric.value;
}

function getTopStrategyPosition(snapshot: RecommendationSnapshot): {
  label: string;
  allocationPercent: number | null;
} {
  const strategyPositions = snapshot.positions.filter(
    (position) => position.type === "strategy",
  );

  if (strategyPositions.length === 0) {
    return { label: "—", allocationPercent: null };
  }

  const top = strategyPositions.reduce((best, current) =>
    current.allocationPercent > best.allocationPercent ? current : best,
  );

  return {
    label: top.label,
    allocationPercent: top.allocationPercent,
  };
}

export function extractScenarioSummary(
  scenarioName: string,
  result: LaminarRecommendationResult,
): SensitivityScenarioSummary {
  const { snapshot } = result;
  const topStrategy = getTopStrategyPosition(snapshot);

  return {
    scenarioName,
    selectedProfile: result.recommendation.selectedProfile,
    portfolioValueUsd: snapshot.portfolioValueUsd,
    expectedApy: getMetricNumber(snapshot, "expectedApy"),
    strategyAllocationPercent: getMetricNumber(
      snapshot,
      "strategyAllocationPercent",
    ),
    liquidityBufferPercent: getMetricNumber(snapshot, "liquidityBufferPercent"),
    gasReservePercent: getMetricNumber(snapshot, "gasReservePercent"),
    numberOfStrategyPositions: getMetricNumber(
      snapshot,
      "numberOfStrategyPositions",
    ),
    numberOfRejectedOpportunities: getMetricNumber(
      snapshot,
      "numberOfRejectedOpportunities",
    ),
    topStrategyPositionLabel: topStrategy.label,
    topStrategyAllocationPercent: topStrategy.allocationPercent,
    warningCodes: snapshot.warnings.map((warning) => warning.code),
  };
}

export function runScenario(
  scenario: SensitivityScenarioInput,
  asOf: Date = DEFAULT_SENSITIVITY_AS_OF,
): SensitivityScenarioResult {
  const result = createLaminarRecommendation({
    intent: scenario.intent,
    portfolioValueUsd: scenario.portfolioValueUsd,
    asOf,
  });

  return {
    name: scenario.name,
    input: {
      intent: scenario.intent,
      portfolioValueUsd: scenario.portfolioValueUsd,
      asOf: asOf.toISOString(),
    },
    summary: extractScenarioSummary(scenario.name, result),
    result,
  };
}

export function runSensitivityMatrix(
  scenarios: SensitivityScenarioInput[] = SENSITIVITY_SCENARIOS,
  asOf: Date = DEFAULT_SENSITIVITY_AS_OF,
): SensitivityScenarioResult[] {
  return scenarios.map((scenario) => runScenario(scenario, asOf));
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

export function formatSensitivityTable(
  summaries: SensitivityScenarioSummary[],
): string {
  const headers = [
    "Scenario",
    "Profile",
    "Portfolio",
    "APY",
    "Strategy%",
    "Liq%",
    "Gas%",
    "#Strat",
    "#Rej",
    "Top Strategy",
    "Top%",
    "Warnings",
  ];

  const rows = summaries.map((summary) => [
    summary.scenarioName,
    summary.selectedProfile,
    formatUsd(summary.portfolioValueUsd),
    `${summary.expectedApy.toFixed(2)}%`,
    `${summary.strategyAllocationPercent.toFixed(2)}%`,
    `${summary.liquidityBufferPercent.toFixed(2)}%`,
    `${summary.gasReservePercent.toFixed(2)}%`,
    String(summary.numberOfStrategyPositions),
    String(summary.numberOfRejectedOpportunities),
    summary.topStrategyPositionLabel,
    formatPercent(summary.topStrategyAllocationPercent),
    summary.warningCodes.join(", ") || "—",
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
