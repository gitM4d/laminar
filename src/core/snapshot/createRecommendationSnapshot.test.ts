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
    expect(snapshot.trustHighlights.length).toBeGreaterThan(0);
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

  it("calculates strategyExpectedApy as weighted average across strategy positions", () => {
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

    const expectedStrategyApy = Number(
      (weightedApySum / totalWeight).toFixed(6),
    );

    expect(getMetricValue(snapshot, "strategyExpectedApy")).toBe(
      expectedStrategyApy,
    );
    expect(getMetricValue(snapshot, "expectedApy")).toBe(expectedStrategyApy);
  });

  it("portfolioExpectedApy weights liquidity buffer and gas reserve at 0% APY", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);
    const opportunityById = new Map(
      recommendation.opportunities.map((opportunity) => [
        opportunity.id,
        opportunity,
      ]),
    );

    let portfolioWeightedSum = 0;
    let totalWeight = 0;

    for (const position of recommendation.portfolioConstruction.positions) {
      totalWeight += position.weight;

      if (position.type === "strategy") {
        portfolioWeightedSum +=
          position.weight *
          (opportunityById.get(position.opportunityId)?.apy ?? 0);
      }
    }

    const expectedPortfolioApy = Number(
      (portfolioWeightedSum / totalWeight).toFixed(6),
    );

    expect(getMetricValue(snapshot, "portfolioExpectedApy")).toBe(
      expectedPortfolioApy,
    );
    expect(getMetricValue(snapshot, "strategyExpectedApy")).toBeGreaterThan(
      expectedPortfolioApy,
    );
  });

  it("strategyExpectedApy equals portfolioExpectedApy when non-strategy allocation is zero", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);
    const metadata = recommendation.portfolioConstruction.metadata;
    const strategyApy = Number(getMetricValue(snapshot, "strategyExpectedApy"));
    const portfolioApy = Number(getMetricValue(snapshot, "portfolioExpectedApy"));
    const nonStrategyWeight =
      metadata.liquidityBufferWeight + metadata.gasReserveWeight;

    if (nonStrategyWeight === 0) {
      expect(strategyApy).toBe(portfolioApy);
      return;
    }

    const expectedPortfolioApy = Number(
      (strategyApy * metadata.strategyWeight).toFixed(6),
    );
    expect(portfolioApy).toBe(expectedPortfolioApy);
    expect(strategyApy).toBeGreaterThan(portfolioApy);
  });

  it("stores strategyExpectedApy as decimal APY for Aave-like opportunities", async () => {
    const { createAaveBaseLaminarDataProviderSnapshot } = await import(
      "../providers/AaveBaseLaminarDataProvider.js"
    );
    const USDC = "0xUSDC000000000000000000000000000000000000" as const;
    const EURC = "0xEURC000000000000000000000000000000000000" as const;
    const A_USDC = "0xaUSDC000000000000000000000000000000000000" as const;
    const A_EURC = "0xaEURC000000000000000000000000000000000000" as const;

    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: {
        getBlockNumber: async () => 1n,
        readContract: async (args) => {
          if (args.functionName === "getReservesList") {
            return [USDC, EURC];
          }
          if (args.functionName === "getReserveData") {
            const rates: Record<string, { rate: bigint; aToken: string }> = {
              [USDC]: { rate: 319n * 10n ** 23n, aToken: A_USDC },
              [EURC]: { rate: 143n * 10n ** 23n, aToken: A_EURC },
            };
            const target = (args.args?.[0] ?? "") as string;
            const entry = rates[target];
            if (entry === undefined) return {};
            return {
              currentLiquidityRate: entry.rate,
              aTokenAddress: entry.aToken,
            };
          }
          if (args.functionName === "totalSupply") {
            // Return a small deterministic supply so TVL reads don't fail.
            return 100_000_000n * 10n ** 6n;
          }
          const meta: Record<string, { symbol: string; decimals: number }> = {
            [USDC]: { symbol: "USDC", decimals: 6 },
            [EURC]: { symbol: "EURC", decimals: 6 },
          };
          const reserve = meta[args.address];
          if (reserve === undefined) {
            throw new Error("unknown reserve");
          }
          return args.functionName === "symbol"
            ? reserve.symbol
            : reserve.decimals;
        },
      },
    });

    const recommendation = generatePortfolioRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });
    const snapshot = createRecommendationSnapshot(recommendation);
    const strategyExpectedApy = getMetricValue(snapshot, "strategyExpectedApy");
    const portfolioExpectedApy = getMetricValue(
      snapshot,
      "portfolioExpectedApy",
    );

    expect(typeof strategyExpectedApy).toBe("number");
    expect(strategyExpectedApy).toBeGreaterThan(0.02);
    expect(strategyExpectedApy).toBeLessThan(0.04);
    // Regression: must be decimal APY (~2.6%), not percent points (~265 when misread).
    expect(strategyExpectedApy).toBeLessThan(1);
    expect(Number(portfolioExpectedApy)).toBeGreaterThan(0);
    expect(Number(portfolioExpectedApy)).toBeLessThan(
      Number(strategyExpectedApy),
    );
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

  it("includes trustHighlights for strategy protocols only with no duplicates", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);
    const strategyProtocolIds = [
      ...new Set(
        recommendation.portfolioConstruction.positions
          .filter((position) => position.type === "strategy")
          .map((position) => position.protocolId),
      ),
    ];
    const highlightProtocolIds = snapshot.trustHighlights.map(
      (highlight) => highlight.protocolId,
    );

    expect(highlightProtocolIds.sort()).toEqual(strategyProtocolIds.sort());
    expect(new Set(highlightProtocolIds).size).toBe(highlightProtocolIds.length);
    for (const highlight of snapshot.trustHighlights) {
      expect(highlight.trustScore).toBeGreaterThan(0);
      expect(highlight.summary.length).toBeGreaterThan(0);
    }
  });

  it("does not include trustHighlights for protocols with only rejected opportunities", async () => {
    const { createAaveBaseLaminarDataProviderSnapshot } = await import(
      "../providers/AaveBaseLaminarDataProvider.js"
    );
    const { createMorphoBaseLaminarDataProviderSnapshot } = await import(
      "../providers/MorphoBaseLaminarDataProvider.js"
    );
    const { createMoonwellBaseLaminarDataProviderSnapshot } = await import(
      "../providers/MoonwellBaseLaminarDataProvider.js"
    );
    const { CombinedLaminarDataProvider } = await import(
      "../providers/CombinedLaminarDataProvider.js"
    );

    const [aave, morpho, moonwell] = await Promise.all([
      createAaveBaseLaminarDataProviderSnapshot({ env: {} }),
      createMorphoBaseLaminarDataProviderSnapshot({ disableApi: true }),
      createMoonwellBaseLaminarDataProviderSnapshot({ disableApi: true }),
    ]);
    const combined = new CombinedLaminarDataProvider([aave, morpho, moonwell]);
    const recommendation = generatePortfolioRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: combined,
    });
    const snapshot = createRecommendationSnapshot(recommendation);

    expect(
      recommendation.opportunityRanking.rejected.some(
        (entry) => entry.protocolId === "moonwell",
      ),
    ).toBe(true);
    expect(
      snapshot.trustHighlights.some(
        (highlight) => highlight.protocolId === "moonwell",
      ),
    ).toBe(false);
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

  it("includes rejectionHighlights with compact shape and no duplicates", () => {
    const recommendation = balancedRecommendation();
    const snapshot = createRecommendationSnapshot(recommendation);

    expect(snapshot.rejectionHighlights.length).toBeGreaterThan(0);
    expect(snapshot.rejectionHighlights.length).toBe(
      recommendation.rejectedOpportunityExplanations.length,
    );

    const ids = snapshot.rejectionHighlights.map(
      (highlight) => highlight.opportunityId,
    );
    expect(new Set(ids).size).toBe(ids.length);

    for (const highlight of snapshot.rejectionHighlights) {
      expect(highlight.label).toContain(highlight.asset);
      expect(highlight.summary.length).toBeGreaterThan(0);
      expect(highlight).not.toHaveProperty("details");
    }
  });
});
