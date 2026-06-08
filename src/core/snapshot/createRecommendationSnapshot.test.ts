import { describe, expect, it } from "vitest";
import { generatePortfolioRecommendation } from "../recommendation/generatePortfolioRecommendation.js";
import { createRecommendationSnapshot } from "./createRecommendationSnapshot.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function balancedRecommendation(portfolioValueUsd = 10_000) {
  return generatePortfolioRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd,
    asOf,
  });
}

function conservativeRecommendation(portfolioValueUsd = 10_000) {
  return generatePortfolioRecommendation({
    intent: { risk: 1, liquidity: 10, returnPreference: 2 },
    portfolioValueUsd,
    asOf,
  });
}

function getMetricValue(
  snapshot: ReturnType<typeof createRecommendationSnapshot>,
  key: string,
): number | string {
  const metric = snapshot.metrics.find((entry) => entry.key === key);
  expect(metric).toBeDefined();
  return metric?.value as number | string;
}

describe("createRecommendationSnapshot", () => {
  it("creates snapshot from Balanced recommendation", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);

    expect(snapshot.profile).toBe("Balanced");
    expect(snapshot.portfolioValueUsd).toBe(10_000);
    expect(snapshot.positions.length).toBeGreaterThan(0);
    expect(snapshot.explanations).toHaveLength(4);
  });

  it("includes protocol, asset, weight, USD, and percent on strategy positions", () => {
    const snapshot = createRecommendationSnapshot(balancedRecommendation());
    const strategyPositions = snapshot.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(strategyPositions.length).toBeGreaterThan(0);

    for (const position of strategyPositions) {
      expect(position.protocolId).toBeDefined();
      expect(position.protocolName).toBeDefined();
      expect(position.asset).toBeDefined();
      expect(position.weight).toBeGreaterThan(0);
      expect(position.allocationPercent).toBeCloseTo(position.weight * 100, 2);
      expect(position.allocationUsd).toBeCloseTo(position.weight * 10_000, 0);
    }
  });

  it("labels liquidity buffer position", () => {
    const snapshot = createRecommendationSnapshot(balancedRecommendation());
    const buffer = snapshot.positions.find(
      (position) => position.type === "liquidityBuffer",
    );

    expect(buffer?.label).toBe("Liquidity Buffer");
    expect(buffer?.asset).toBe("USDC");
  });

  it("labels gas reserve position", () => {
    const snapshot = createRecommendationSnapshot(balancedRecommendation());
    const gas = snapshot.positions.find(
      (position) => position.type === "gasReserve",
    );

    expect(gas?.label).toBe("Gas Reserve");
    expect(gas?.asset).toBe("USDC");
  });

  it("calculates expectedApy as weighted average across strategy positions", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);

    const strategyPositions =
      recommendation.portfolioConstruction.positions.filter(
        (position) => position.type === "strategy",
      );
    const opportunityById = new Map(
      recommendation.opportunities.map((opportunity) => [
        opportunity.id,
        opportunity,
      ]),
    );

    let weightedApySum = 0;
    let totalWeight = 0;

    for (const position of strategyPositions) {
      const opportunity = opportunityById.get(position.opportunityId);
      weightedApySum += position.weight * (opportunity?.apy ?? 0);
      totalWeight += position.weight;
    }

    const expectedApy = ((weightedApySum / totalWeight) * 100).toFixed(2);

    expect(getMetricValue(snapshot, "expectedApy")).toBe(Number(expectedApy));
  });

  it("warns when opportunities were rejected", () => {
    const snapshot = createRecommendationSnapshot(balancedRecommendation());

    expect(
      snapshot.warnings.some(
        (warning) => warning.code === "rejectedOpportunities",
      ),
    ).toBe(true);
  });

  it("warns for high liquidity buffer", () => {
    const snapshot = createRecommendationSnapshot(conservativeRecommendation());

    expect(
      snapshot.warnings.some(
        (warning) => warning.code === "highLiquidityBuffer",
      ),
    ).toBe(true);
    expect(
      getMetricValue(snapshot, "liquidityBufferPercent"),
    ).toBeGreaterThanOrEqual(25);
  });

  it("warns when all strategy positions use the same asset", () => {
    const snapshot = createRecommendationSnapshot(balancedRecommendation());

    expect(
      snapshot.warnings.some(
        (warning) => warning.code === "sameAssetConcentration",
      ),
    ).toBe(true);
  });

  it("includes strategy positions for Conservative recommendation", () => {
    const snapshot = createRecommendationSnapshot(conservativeRecommendation());

    expect(
      snapshot.warnings.some(
        (warning) => warning.code === "noStrategyPositions",
      ),
    ).toBe(false);
    expect(getMetricValue(snapshot, "numberOfStrategyPositions")).toBeGreaterThan(
      0,
    );
    expect(
      snapshot.positions.some(
        (position) =>
          position.type === "strategy" &&
          position.protocolId === "aave-prime",
      ),
    ).toBe(true);
  });

  it("includes correct metrics", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);
    const metadata = recommendation.portfolioConstruction.metadata;

    expect(getMetricValue(snapshot, "strategyAllocationPercent")).toBe(
      Number((metadata.strategyWeight * 100).toFixed(2)),
    );
    expect(getMetricValue(snapshot, "liquidityBufferPercent")).toBe(
      Number((metadata.liquidityBufferWeight * 100).toFixed(2)),
    );
    expect(getMetricValue(snapshot, "gasReservePercent")).toBe(
      Number((metadata.gasReserveWeight * 100).toFixed(2)),
    );
    expect(getMetricValue(snapshot, "selectedProfile")).toBe("Balanced");
    expect(getMetricValue(snapshot, "numberOfStrategyPositions")).toBe(2);
    expect(getMetricValue(snapshot, "numberOfRejectedOpportunities")).toBe(4);
  });

  it("includes policyVersion and pipeline steps count in source", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);

    expect(snapshot.source.policyVersion).toBe(
      recommendation.policy.policyVersion,
    );
    expect(snapshot.source.pipelineStepsCompleted).toBe(10);
    expect(snapshot.source.recommendationId).toBeUndefined();
  });
});
