import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../core/index.js";
import type { ExecutionPlanStepV2 } from "../core/execution/types.js";
import { MockLaminarDataProvider } from "../core/providers/MockLaminarDataProvider.js";
import {
  buildQaReport,
  buildQaScenarioResult,
  evaluateScenarioChecks,
  formatQaReportText,
  getQaReportExitCode,
  REAL_QA_SCENARIOS,
  runRealRecommendationQa,
  summarizeQaReport,
} from "./realRecommendationQa.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function createBaselineResult() {
  return createLaminarRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd: 10_000,
    asOf,
  });
}

function withCombinedRealDiagnostics(
  result: ReturnType<typeof createBaselineResult>,
): ReturnType<typeof createBaselineResult> {
  const opportunities = result.recommendation.opportunities.filter(
    (opportunity) => opportunity.id !== "aerodrome-usdc-eurc-base",
  );

  return {
    ...result,
    recommendation: {
      ...result.recommendation,
      opportunities,
      diagnostics: {
        ...result.recommendation.diagnostics,
        providerType: "CombinedLaminarDataProvider",
        providerName: "Combined (Aave + Morpho + Fluid)",
        opportunityCount: opportunities.length,
        liquiditySignalsAvailable: true,
        executionPlanVersion: "v2",
        executionPlanRealistic: true,
      },
    },
    executionPlan: {
      ...result.executionPlan,
      executionPlanVersion: "v2",
    },
  };
}

describe("realRecommendationQa", () => {
  it("passes all required checks for a combined-real-like scenario", () => {
    const result = withCombinedRealDiagnostics(createBaselineResult());
    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result,
    });

    expect(checks.filter((entry) => entry.severity === "fail")).toHaveLength(0);
    expect(
      checks.some(
        (entry) =>
          entry.code === "providerIsCombinedReal" && entry.severity === "pass",
      ),
    ).toBe(true);
    expect(
      checks.some(
        (entry) =>
          entry.code === "executionPlanV2" && entry.severity === "pass",
      ),
    ).toBe(true);
  });

  it("fails when provider is Mock", () => {
    const result = createBaselineResult();
    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result,
    });

    expect(
      checks.find((entry) => entry.code === "providerIsCombinedReal")?.severity,
    ).toBe("fail");
    expect(
      checks.find((entry) => entry.code === "noFakeStaticMarketData")?.severity,
    ).toBe("fail");
  });

  it("fails when opportunityCount is 0", () => {
    const result = withCombinedRealDiagnostics(createBaselineResult());
    result.recommendation.diagnostics.opportunityCount = 0;

    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result,
    });

    expect(
      checks.find((entry) => entry.code === "opportunityCountPositive")?.severity,
    ).toBe("fail");
  });

  it("fails when portfolio weights do not sum to 1", () => {
    const result = withCombinedRealDiagnostics(createBaselineResult());
    result.recommendation.portfolioConstruction.metadata.totalWeight = 0.95;

    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result,
    });

    expect(
      checks.find((entry) => entry.code === "portfolioWeightsSumToOne")
        ?.severity,
    ).toBe("fail");
  });

  it("fails when execution plan includes transaction fields", () => {
    const result = withCombinedRealDiagnostics(createBaselineResult());
    const badStep: ExecutionPlanStepV2 & { calldata: string } = {
      ...result.executionPlan.stepsV2[0]!,
      calldata: "0xdeadbeef",
    };

    result.executionPlan.stepsV2 = [badStep, ...result.executionPlan.stepsV2.slice(1)];

    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result,
    });

    expect(
      checks.find((entry) => entry.code === "noTransactionFields")?.severity,
    ).toBe("fail");
  });

  it("warns when liquidity signals are missing", () => {
    const result = withCombinedRealDiagnostics(createBaselineResult());
    result.recommendation.diagnostics.liquiditySignalsAvailable = false;

    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result,
    });

    expect(
      checks.find((entry) => entry.code === "liquiditySignalsPresent")?.severity,
    ).toBe("warning");
  });

  it("warns when Yield Focused strategy APY is below Balanced", () => {
    const result = withCombinedRealDiagnostics(createBaselineResult());
    const strategyMetric = result.snapshot.metrics.find(
      (entry) => entry.key === "strategyExpectedApy",
    );

    expect(strategyMetric).toBeDefined();
    if (strategyMetric !== undefined) {
      strategyMetric.value = 0.01;
    }

    const checks = evaluateScenarioChecks({
      scenarioName: "Yield Focused default",
      result,
      balancedStrategyApy: 0.05,
    });

    expect(
      checks.find((entry) => entry.code === "yieldFocusedApyVsBalanced")
        ?.severity,
    ).toBe("warning");
  });

  it("summarizes report counts and exit code", () => {
    const passingChecks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result: withCombinedRealDiagnostics(createBaselineResult()),
    });
    const failingChecks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result: createBaselineResult(),
    });

    const report = buildQaReport([
      buildQaScenarioResult("Balanced default", createBaselineResult(), passingChecks),
      buildQaScenarioResult("Balanced default", createBaselineResult(), failingChecks),
    ]);

    expect(report.summary.totalScenarios).toBe(2);
    expect(report.summary.failures).toBe(
      passingChecks.filter((entry) => entry.severity === "fail").length +
        failingChecks.filter((entry) => entry.severity === "fail").length,
    );
    expect(report.summary.warnings).toBe(
      [...passingChecks, ...failingChecks].filter(
        (entry) => entry.severity === "warning",
      ).length,
    );
    expect(getQaReportExitCode(report)).toBe(1);

    const allPassReport = buildQaReport([
      buildQaScenarioResult(
        "Balanced default",
        createBaselineResult(),
        passingChecks,
      ),
    ]);
    expect(getQaReportExitCode(allPassReport)).toBe(0);
    expect(summarizeQaReport(allPassReport.scenarios).failures).toBe(0);
  });

  it("formats CLI text with summary section", () => {
    const checks = evaluateScenarioChecks({
      scenarioName: "Balanced default",
      result: withCombinedRealDiagnostics(createBaselineResult()),
    });
    const report = buildQaReport([
      buildQaScenarioResult("Balanced default", createBaselineResult(), checks),
    ]);
    const text = formatQaReportText(report);

    expect(text).toContain("Laminar Real Recommendation QA");
    expect(text).toContain("Scenario: Balanced default");
    expect(text).toContain("PASS providerIsCombinedReal");
    expect(text).toContain("Summary:");
    expect(text).toContain("scenarios: 1");
  });

  it("runs scenarios through an injectable runner without live provider calls", async () => {
    const balanced = withCombinedRealDiagnostics(createBaselineResult());
    const conservative = withCombinedRealDiagnostics(
      createLaminarRecommendation({
        intent: REAL_QA_SCENARIOS[0]!.intent,
        portfolioValueUsd: REAL_QA_SCENARIOS[0]!.portfolioValueUsd,
        asOf,
      }),
    );
    const yieldFocused = withCombinedRealDiagnostics(
      createLaminarRecommendation({
        intent: REAL_QA_SCENARIOS[2]!.intent,
        portfolioValueUsd: REAL_QA_SCENARIOS[2]!.portfolioValueUsd,
        asOf,
      }),
    );
    const cannedResults = [conservative, balanced, yieldFocused];
    let callIndex = 0;

    const report = await runRealRecommendationQa({
      scenarios: REAL_QA_SCENARIOS.slice(0, 3),
      createRecommendation: () => {
        const result = cannedResults[callIndex] ?? balanced;
        callIndex += 1;
        return result;
      },
      buildProvider: async () => new MockLaminarDataProvider(),
    });

    expect(report.scenarios).toHaveLength(3);
    expect(report.summary.totalScenarios).toBe(3);
    expect(
      report.scenarios.every(
        (scenario) =>
          scenario.checks.find((entry) => entry.code === "providerIsCombinedReal")
            ?.severity === "pass",
      ),
    ).toBe(true);
    expect(getQaReportExitCode(report)).toBe(0);
  });
});
