import { describe, expect, it } from "vitest";
import {
  DEFAULT_SENSITIVITY_AS_OF,
  extractScenarioSummary,
  formatSensitivityTable,
  runScenario,
  runSensitivityMatrix,
  SENSITIVITY_SCENARIOS,
} from "./sensitivityMatrix.js";

describe("sensitivityMatrix", () => {
  it("runs all fixed scenarios deterministically", () => {
    const results = runSensitivityMatrix(
      SENSITIVITY_SCENARIOS,
      DEFAULT_SENSITIVITY_AS_OF,
    );

    expect(results).toHaveLength(7);
    expect(results.every((entry) => entry.summary.scenarioName.length > 0)).toBe(
      true,
    );
  });

  it("maps Conservative default to Conservative profile", () => {
    const scenario = SENSITIVITY_SCENARIOS.find(
      (entry) => entry.name === "Conservative default",
    );

    expect(scenario).toBeDefined();

    const { summary } = runScenario(scenario!, DEFAULT_SENSITIVITY_AS_OF);

    expect(summary.selectedProfile).toBe("Conservative");
  });

  it("maps Balanced default to Balanced profile", () => {
    const scenario = SENSITIVITY_SCENARIOS.find(
      (entry) => entry.name === "Balanced default",
    );

    expect(scenario).toBeDefined();

    const { summary } = runScenario(scenario!, DEFAULT_SENSITIVITY_AS_OF);

    expect(summary.selectedProfile).toBe("Balanced");
  });

  it("maps Yield Focused default to Yield Focused profile", () => {
    const scenario = SENSITIVITY_SCENARIOS.find(
      (entry) => entry.name === "Yield Focused default",
    );

    expect(scenario).toBeDefined();

    const { summary } = runScenario(scenario!, DEFAULT_SENSITIVITY_AS_OF);

    expect(summary.selectedProfile).toBe("Yield Focused");
  });

  it("extracts summary metrics from a recommendation result", () => {
    const scenario = SENSITIVITY_SCENARIOS.find(
      (entry) => entry.name === "Balanced default",
    );

    expect(scenario).toBeDefined();

    const { result } = runScenario(scenario!, DEFAULT_SENSITIVITY_AS_OF);
    const summary = extractScenarioSummary(scenario!.name, result);

    expect(summary.portfolioValueUsd).toBe(10_000);
    expect(summary.numberOfRejectedOpportunities).toBeGreaterThanOrEqual(0);
    expect(summary.warningCodes.length).toBeGreaterThan(0);
    expect(summary.topStrategyPositionLabel.length).toBeGreaterThan(0);
  });

  it("formats a readable table", () => {
    const results = runSensitivityMatrix(
      SENSITIVITY_SCENARIOS.slice(0, 2),
      DEFAULT_SENSITIVITY_AS_OF,
    );
    const table = formatSensitivityTable(results.map((entry) => entry.summary));

    expect(table).toContain("Scenario");
    expect(table).toContain("Conservative default");
    expect(table).toContain("Balanced default");
    expect(table.split("\n").length).toBeGreaterThanOrEqual(4);
  });
});
