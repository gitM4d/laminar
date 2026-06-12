import { createLaminarRecommendation } from "../core/index.js";
import type { ExecutionPlanStepV2 } from "../core/execution/types.js";
import { buildDefaultLaminarDataProvider } from "../core/providers/resolveDefaultProvider.js";
import type { LaminarDataProvider } from "../core/providers/types.js";
import type { UserIntent } from "../core/intent/types.js";
import type { LaminarRecommendationResult } from "../core/types.js";
import type { RecommendationSnapshot } from "../core/snapshot/types.js";

export type QaCheckSeverity = "pass" | "warning" | "fail";

export type QaCheckResult = {
  code: string;
  severity: QaCheckSeverity;
  message: string;
};

export type QaScenarioResult = {
  scenarioName: string;
  profile: string;
  providerType: string;
  opportunityCount: number;
  strategyApy: number;
  portfolioApy: number;
  strategyAllocationPercent: number;
  liquidityBufferPercent: number;
  gasReservePercent: number;
  checks: QaCheckResult[];
};

export type QaReport = {
  generatedAt: string;
  scenarios: QaScenarioResult[];
  summary: {
    totalScenarios: number;
    failures: number;
    warnings: number;
  };
};

export type RealQaScenarioInput = {
  name: string;
  intent: UserIntent;
  portfolioValueUsd: number;
};

export type RunRealRecommendationQaOptions = {
  asOf?: Date;
  scenarios?: RealQaScenarioInput[];
  env?: NodeJS.ProcessEnv;
  buildProvider?: () => Promise<LaminarDataProvider>;
  createRecommendation?: typeof createLaminarRecommendation;
};

export const DEFAULT_QA_AS_OF = new Date("2026-06-01T00:00:00.000Z");

export const REAL_QA_SCENARIOS: RealQaScenarioInput[] = [
  {
    name: "Conservative default",
    intent: { risk: 1, liquidity: 9, returnPreference: 2 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Balanced default",
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Yield Focused default",
    intent: { risk: 7, liquidity: 4, returnPreference: 9 },
    portfolioValueUsd: 10_000,
  },
  {
    name: "Balanced small portfolio",
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd: 500,
  },
  {
    name: "Balanced large portfolio",
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd: 100_000,
  },
];

const TRANSACTION_FORBIDDEN_FIELDS = [
  "calldata",
  "transaction",
  "to",
  "data",
  "value",
  "signer",
  "wallet",
  "privateKey",
  "txHash",
  "transactionHash",
  "from",
  "nonce",
  "gasLimit",
  "gasPrice",
  "chainId",
  "signature",
] as const;

/** Opportunity ids that exist only in the mock universe. */
const MOCK_ONLY_OPPORTUNITY_IDS = new Set(["aerodrome-usdc-eurc-base"]);

const CONSERVATIVE_STRATEGY_ALLOCATION_THRESHOLD_PERCENT = 35;

function getMetricNumber(snapshot: RecommendationSnapshot, key: string): number {
  const metric = snapshot.metrics.find((entry) => entry.key === key);

  if (metric === undefined || typeof metric.value !== "number") {
    return 0;
  }

  return metric.value;
}

function check(
  code: string,
  severity: QaCheckSeverity,
  message: string,
): QaCheckResult {
  return { code, severity, message };
}

function stepHasForbiddenTransactionField(
  step: Record<string, unknown>,
): string | null {
  for (const field of TRANSACTION_FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(step, field)) {
      return field;
    }
  }

  return null;
}

function hasHighLiquidityBufferExplanation(result: LaminarRecommendationResult): boolean {
  const bufferPercent = getMetricNumber(
    result.snapshot,
    "liquidityBufferPercent",
  );

  if (bufferPercent >= 15) {
    return true;
  }

  const constructionText = result.recommendation.portfolioConstruction.explanations
    .flatMap((entry) => [entry.summary, ...entry.details])
    .join(" ")
    .toLowerCase();

  return (
    constructionText.includes("liquidity buffer") ||
    constructionText.includes("high liquidity")
  );
}

export function extractQaScenarioMetrics(result: LaminarRecommendationResult): {
  profile: string;
  providerType: string;
  opportunityCount: number;
  strategyApy: number;
  portfolioApy: number;
  strategyAllocationPercent: number;
  liquidityBufferPercent: number;
  gasReservePercent: number;
} {
  const { recommendation, snapshot } = result;

  return {
    profile: recommendation.selectedProfile,
    providerType: recommendation.diagnostics.providerType,
    opportunityCount: recommendation.diagnostics.opportunityCount,
    strategyApy: getMetricNumber(snapshot, "strategyExpectedApy"),
    portfolioApy: getMetricNumber(snapshot, "portfolioExpectedApy"),
    strategyAllocationPercent: getMetricNumber(
      snapshot,
      "strategyAllocationPercent",
    ),
    liquidityBufferPercent: getMetricNumber(snapshot, "liquidityBufferPercent"),
    gasReservePercent: getMetricNumber(snapshot, "gasReservePercent"),
  };
}

export type EvaluateScenarioChecksInput = {
  scenarioName: string;
  result: LaminarRecommendationResult;
  balancedStrategyApy?: number | null;
};

export function evaluateScenarioChecks(
  input: EvaluateScenarioChecksInput,
): QaCheckResult[] {
  const { scenarioName, result, balancedStrategyApy = null } = input;
  const { recommendation, snapshot, executionPlan } = result;
  const diagnostics = recommendation.diagnostics;
  const metrics = extractQaScenarioMetrics(result);
  const checks: QaCheckResult[] = [];

  if (metrics.providerType === "CombinedLaminarDataProvider") {
    checks.push(
      check(
        "providerIsCombinedReal",
        "pass",
        "Provider is CombinedLaminarDataProvider.",
      ),
    );
  } else {
    checks.push(
      check(
        "providerIsCombinedReal",
        "fail",
        `Expected CombinedLaminarDataProvider, got ${metrics.providerType}.`,
      ),
    );
  }

  if (metrics.opportunityCount > 0) {
    checks.push(
      check(
        "opportunityCountPositive",
        "pass",
        `Discovered ${metrics.opportunityCount} opportunities.`,
      ),
    );
  } else {
    checks.push(
      check(
        "opportunityCountPositive",
        "fail",
        "No opportunities discovered.",
      ),
    );
  }

  const mockProviderDetected =
    metrics.providerType === "MockLaminarDataProvider" ||
    diagnostics.providerName.toLowerCase().includes("mock");
  const mockOnlyOpportunity = recommendation.opportunities.some((opportunity) =>
    MOCK_ONLY_OPPORTUNITY_IDS.has(opportunity.id),
  );

  if (mockProviderDetected || mockOnlyOpportunity) {
    checks.push(
      check(
        "noFakeStaticMarketData",
        "fail",
        mockProviderDetected
          ? "Mock provider detected; real QA requires Combined real provider."
          : "Mock-only opportunity ids detected in recommendation universe.",
      ),
    );
  } else {
    checks.push(
      check(
        "noFakeStaticMarketData",
        "pass",
        "No Mock provider or mock-only opportunity ids detected (opportunity source metadata is not exposed in recommendation output).",
      ),
    );
  }

  const totalWeight = recommendation.portfolioConstruction.metadata.totalWeight;
  if (Math.abs(totalWeight - 1) <= 0.0001) {
    checks.push(
      check(
        "portfolioWeightsSumToOne",
        "pass",
        `Portfolio weights sum to ${totalWeight.toFixed(4)}.`,
      ),
    );
  } else {
    checks.push(
      check(
        "portfolioWeightsSumToOne",
        "fail",
        `Portfolio weights sum to ${totalWeight.toFixed(4)}, expected 1.`,
      ),
    );
  }

  const hasExecutionPlanV2 =
    executionPlan.executionPlanVersion === "v2" ||
    diagnostics.executionPlanVersion === "v2" ||
    executionPlan.stepsV2.length > 0;

  if (hasExecutionPlanV2) {
    checks.push(
      check(
        "executionPlanV2",
        "pass",
        "Execution plan v2 is present.",
      ),
    );
  } else {
    checks.push(
      check(
        "executionPlanV2",
        "fail",
        "Execution plan v2 is missing.",
      ),
    );
  }

  const nonInformationalSteps = executionPlan.stepsV2.filter(
    (step: ExecutionPlanStepV2) => step.informationalOnly !== true,
  );

  if (nonInformationalSteps.length === 0) {
    checks.push(
      check(
        "executionPlanInformationalOnly",
        "pass",
        "All execution plan v2 steps are informational only.",
      ),
    );
  } else {
    checks.push(
      check(
        "executionPlanInformationalOnly",
        "fail",
        `${nonInformationalSteps.length} execution plan v2 step(s) are not informational only.`,
      ),
    );
  }

  const forbiddenField = [...executionPlan.stepsV2, ...executionPlan.steps].reduce<
    string | null
  >((found, step) => {
    if (found !== null) {
      return found;
    }

    return stepHasForbiddenTransactionField(step as Record<string, unknown>);
  }, null);

  if (forbiddenField === null) {
    checks.push(
      check(
        "noTransactionFields",
        "pass",
        "No transaction or wallet fields found in execution steps.",
      ),
    );
  } else {
    checks.push(
      check(
        "noTransactionFields",
        "fail",
        `Forbidden transaction field "${forbiddenField}" found in execution steps.`,
      ),
    );
  }

  if (metrics.strategyApy >= 0) {
    checks.push(
      check(
        "strategyApyNonNegative",
        "pass",
        `Strategy APY is ${formatApyPercent(metrics.strategyApy)}.`,
      ),
    );
  } else {
    checks.push(
      check(
        "strategyApyNonNegative",
        "fail",
        `Strategy APY is negative (${formatApyPercent(metrics.strategyApy)}).`,
      ),
    );
  }

  if (metrics.portfolioApy >= 0) {
    checks.push(
      check(
        "portfolioApyNonNegative",
        "pass",
        `Portfolio APY is ${formatApyPercent(metrics.portfolioApy)}.`,
      ),
    );
  } else {
    checks.push(
      check(
        "portfolioApyNonNegative",
        "fail",
        `Portfolio APY is negative (${formatApyPercent(metrics.portfolioApy)}).`,
      ),
    );
  }

  const diagnosticsPresent =
    diagnostics.trustExplained === true &&
    diagnostics.rejectionsExplained === true &&
    diagnostics.concentrationExplained === true;

  if (diagnosticsPresent) {
    checks.push(
      check(
        "diagnosticsPresent",
        "pass",
        "Trust, rejection, and concentration diagnostics are present.",
      ),
    );
  } else {
    checks.push(
      check(
        "diagnosticsPresent",
        "fail",
        "Missing expected recommendation diagnostics flags.",
      ),
    );
  }

  const diversificationPresent =
    diagnostics.concentrationAnalysis !== undefined ||
    snapshot.diversificationHighlights !== undefined;

  if (diversificationPresent) {
    checks.push(
      check(
        "diversificationAnalysisPresent",
        "pass",
        "Concentration or diversification analysis is present.",
      ),
    );
  } else {
    checks.push(
      check(
        "diversificationAnalysisPresent",
        "fail",
        "Missing concentration/diversification analysis.",
      ),
    );
  }

  if (diagnostics.liquiditySignalsAvailable === true) {
    checks.push(
      check(
        "liquiditySignalsPresent",
        "pass",
        "Real-provider liquidity signals are available.",
      ),
    );
  } else {
    checks.push(
      check(
        "liquiditySignalsPresent",
        "warning",
        "Liquidity derived signals are missing for this real provider scenario.",
      ),
    );
  }

  if (scenarioName === "Conservative default") {
    const rejectedCount = getMetricNumber(snapshot, "numberOfRejectedOpportunities");
    const conservativeSignals =
      metrics.strategyAllocationPercent <=
        CONSERVATIVE_STRATEGY_ALLOCATION_THRESHOLD_PERCENT ||
      metrics.strategyAllocationPercent === 0 ||
      rejectedCount > 0 ||
      hasHighLiquidityBufferExplanation(result);

    checks.push(
      check(
        "conservativeBehavior",
        conservativeSignals ? "pass" : "warning",
        conservativeSignals
          ? "Conservative scenario shows low strategy allocation, rejections, or liquidity buffer emphasis."
          : "Conservative scenario has high strategy allocation without obvious conservative signals.",
      ),
    );
  }

  if (scenarioName === "Balanced default") {
    if (metrics.strategyAllocationPercent > 0) {
      checks.push(
        check(
          "balancedStrategyAllocated",
          "pass",
          `Balanced scenario allocates ${metrics.strategyAllocationPercent.toFixed(2)}% to strategies.`,
        ),
      );
    } else {
      checks.push(
        check(
          "balancedStrategyAllocated",
          "warning",
          "Balanced scenario has zero strategy allocation.",
        ),
      );
    }

    if (metrics.opportunityCount >= 2) {
      checks.push(
        check(
          "balancedOpportunityUniverse",
          "pass",
          `Balanced scenario has ${metrics.opportunityCount} opportunities.`,
        ),
      );
    } else {
      checks.push(
        check(
          "balancedOpportunityUniverse",
          "warning",
          `Balanced scenario has only ${metrics.opportunityCount} opportunity.`,
        ),
      );
    }
  }

  if (scenarioName === "Yield Focused default") {
    if (metrics.strategyAllocationPercent > 0) {
      checks.push(
        check(
          "yieldFocusedStrategyAllocated",
          "pass",
          `Yield Focused scenario allocates ${metrics.strategyAllocationPercent.toFixed(2)}% to strategies.`,
        ),
      );
    } else {
      checks.push(
        check(
          "yieldFocusedStrategyAllocated",
          "warning",
          "Yield Focused scenario has zero strategy allocation.",
        ),
      );
    }

    if (balancedStrategyApy === null) {
      checks.push(
        check(
          "yieldFocusedApyVsBalanced",
          "warning",
          "Balanced baseline APY unavailable for comparison.",
        ),
      );
    } else if (metrics.strategyApy >= balancedStrategyApy) {
      checks.push(
        check(
          "yieldFocusedApyVsBalanced",
          "pass",
          `Yield Focused strategy APY (${formatApyPercent(metrics.strategyApy)}) is at or above Balanced (${formatApyPercent(balancedStrategyApy)}).`,
        ),
      );
    } else {
      checks.push(
        check(
          "yieldFocusedApyVsBalanced",
          "warning",
          `Yield Focused strategy APY (${formatApyPercent(metrics.strategyApy)}) is below Balanced (${formatApyPercent(balancedStrategyApy)}).`,
        ),
      );
    }
  }

  return checks;
}

export function buildQaScenarioResult(
  scenarioName: string,
  result: LaminarRecommendationResult,
  checks: QaCheckResult[],
): QaScenarioResult {
  const metrics = extractQaScenarioMetrics(result);

  return {
    scenarioName,
    profile: metrics.profile,
    providerType: metrics.providerType,
    opportunityCount: metrics.opportunityCount,
    strategyApy: metrics.strategyApy,
    portfolioApy: metrics.portfolioApy,
    strategyAllocationPercent: metrics.strategyAllocationPercent,
    liquidityBufferPercent: metrics.liquidityBufferPercent,
    gasReservePercent: metrics.gasReservePercent,
    checks,
  };
}

export function summarizeQaReport(scenarios: QaScenarioResult[]): QaReport["summary"] {
  let failures = 0;
  let warnings = 0;

  for (const scenario of scenarios) {
    for (const entry of scenario.checks) {
      if (entry.severity === "fail") {
        failures += 1;
      } else if (entry.severity === "warning") {
        warnings += 1;
      }
    }
  }

  return {
    totalScenarios: scenarios.length,
    failures,
    warnings,
  };
}

export function buildQaReport(scenarios: QaScenarioResult[]): QaReport {
  return {
    generatedAt: new Date().toISOString(),
    scenarios,
    summary: summarizeQaReport(scenarios),
  };
}

export function getQaReportExitCode(report: QaReport): number {
  return report.summary.failures > 0 ? 1 : 0;
}

export function formatApyPercent(decimalApy: number): string {
  return `${(decimalApy * 100).toFixed(2)}%`;
}

export function formatQaCheckLine(entry: QaCheckResult): string {
  const label = entry.severity.toUpperCase();
  return `  ${label} ${entry.code}`;
}

export function formatQaReportText(report: QaReport): string {
  const lines: string[] = ["Laminar Real Recommendation QA", ""];

  for (const scenario of report.scenarios) {
    lines.push(`Scenario: ${scenario.scenarioName}`);
    lines.push(`Profile: ${scenario.profile}`);
    lines.push(`Provider: ${scenario.providerType}`);
    lines.push(`Opportunity count: ${scenario.opportunityCount}`);
    lines.push(`Strategy APY: ${formatApyPercent(scenario.strategyApy)}`);
    lines.push(`Portfolio APY: ${formatApyPercent(scenario.portfolioApy)}`);
    lines.push("Checks:");

    for (const entry of scenario.checks) {
      lines.push(formatQaCheckLine(entry));
    }

    lines.push("");
  }

  lines.push("Summary:");
  lines.push(`  scenarios: ${report.summary.totalScenarios}`);
  lines.push(`  failures: ${report.summary.failures}`);
  lines.push(`  warnings: ${report.summary.warnings}`);

  return lines.join("\n");
}

export async function runRealRecommendationQa(
  options: RunRealRecommendationQaOptions = {},
): Promise<QaReport> {
  const asOf = options.asOf ?? DEFAULT_QA_AS_OF;
  const scenarios = options.scenarios ?? REAL_QA_SCENARIOS;
  const createRecommendation =
    options.createRecommendation ?? createLaminarRecommendation;
  const buildProvider =
    options.buildProvider ??
    (async () =>
      buildDefaultLaminarDataProvider({
        mode: "real",
        env: options.env ?? process.env,
      }));

  const provider = await buildProvider();
  const scenarioResults: QaScenarioResult[] = [];
  let balancedStrategyApy: number | null = null;

  for (const scenario of scenarios) {
    const result = createRecommendation({
      intent: scenario.intent,
      portfolioValueUsd: scenario.portfolioValueUsd,
      asOf,
      dataProvider: provider,
    });

    if (scenario.name === "Balanced default") {
      balancedStrategyApy = extractQaScenarioMetrics(result).strategyApy;
    }

    const checks = evaluateScenarioChecks({
      scenarioName: scenario.name,
      result,
      balancedStrategyApy:
        scenario.name === "Yield Focused default" ? balancedStrategyApy : null,
    });

    scenarioResults.push(buildQaScenarioResult(scenario.name, result, checks));
  }

  return buildQaReport(scenarioResults);
}
