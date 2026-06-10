import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../core/index.js";
import { createAaveBaseLaminarDataProviderSnapshot } from "../core/providers/AaveBaseLaminarDataProvider.js";
import type { AaveReadOnlyClient } from "../adapters/aave/aaveReserveDiscovery.js";
import {
  DEFAULT_SENSITIVITY_AS_OF,
  SENSITIVITY_SCENARIOS,
} from "./sensitivityMatrix.js";
import {
  computeAllScenarioDifferences,
  computeScenarioDifference,
  extractProviderComparisonSummary,
  formatDifferenceSummary,
  formatProviderComparisonTable,
  resolveAaveDataSourceLabel,
  runProviderComparisonMatrix,
  type ProviderComparisonSummary,
} from "./providerComparisonMatrix.js";

const USDC = "0xUSDC000000000000000000000000000000000000" as `0x${string}`;
const EURC = "0xEURC000000000000000000000000000000000000" as `0x${string}`;
const A_USDC = "0xaUSDC0000000000000000000000000000000000" as `0x${string}`;
const A_EURC = "0xaEURC0000000000000000000000000000000000" as `0x${string}`;

function buildMockAaveClient(): AaveReadOnlyClient {
  const reserveData: Record<
    string,
    {
      symbol: string;
      decimals: number;
      liquidityRateRay: bigint;
      aTokenAddress: `0x${string}`;
    }
  > = {
    [USDC]: {
      symbol: "USDC",
      decimals: 6,
      liquidityRateRay: 5n * 10n ** 25n,
      aTokenAddress: A_USDC,
    },
    [EURC]: {
      symbol: "EURC",
      decimals: 6,
      liquidityRateRay: 3n * 10n ** 25n,
      aTokenAddress: A_EURC,
    },
  };

  const aTokenSupplies: Record<string, bigint> = {
    [A_USDC]: 180_000_000n * 10n ** 6n,
    [A_EURC]: 25_000_000n * 10n ** 6n,
  };

  return {
    getBlockNumber: async () => 12_345_678n,
    readContract: async (args) => {
      if (args.functionName === "getReservesList") {
        return [USDC, EURC];
      }
      if (args.functionName === "getReserveData") {
        const target = (args.args?.[0] ?? "") as string;
        const data = reserveData[target];
        if (data === undefined) {
          throw new Error(`no reserve data for ${target}`);
        }
        return {
          currentLiquidityRate: data.liquidityRateRay,
          aTokenAddress: data.aTokenAddress,
        };
      }
      if (args.functionName === "totalSupply") {
        const supply = aTokenSupplies[args.address];
        return supply ?? 0n;
      }
      const reserve = reserveData[args.address];
      if (reserve === undefined) {
        throw new Error(`unknown reserve ${args.address}`);
      }
      return args.functionName === "symbol" ? reserve.symbol : reserve.decimals;
    },
  };
}

const mockSummary: ProviderComparisonSummary = {
  scenarioName: "Balanced default",
  selectedProfile: "Balanced",
  portfolioValueUsd: 10_000,
  strategyExpectedApy: 0.045,
  portfolioExpectedApy: 0.022,
  expectedApy: 0.045,
  strategyAllocationPercent: 50,
  liquidityBufferPercent: 49,
  gasReservePercent: 1,
  numberOfStrategyPositions: 2,
  numberOfRejectedOpportunities: 3,
  topStrategyPositionLabel: "Morpho USDC",
  topStrategyAllocationPercent: 30,
  warningCodes: ["LOW_DIVERSIFICATION"],
  providerName: "MockLaminarDataProvider",
  providerType: "MockLaminarDataProvider",
  opportunityCount: 9,
};

const aaveSummary: ProviderComparisonSummary = {
  ...mockSummary,
  strategyExpectedApy: 0.032,
  portfolioExpectedApy: 0.016,
  expectedApy: 0.032,
  strategyAllocationPercent: 49.5,
  liquidityBufferPercent: 49.5,
  topStrategyPositionLabel: "Aave USDC",
  topStrategyAllocationPercent: 33.9,
  providerName: "Aave Base (experimental)",
  providerType: "AaveBaseLaminarDataProvider",
  opportunityCount: 2,
  dataSourceLabel: "on-chain (RPC configured)",
};

describe("providerComparisonMatrix helpers", () => {
  it("extractProviderComparisonSummary includes provider diagnostics", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf: DEFAULT_SENSITIVITY_AS_OF,
    });

    const summary = extractProviderComparisonSummary(
      "MockLaminarDataProvider",
      "MockLaminarDataProvider",
      "Balanced default",
      result,
    );

    expect(summary.providerName).toBe("MockLaminarDataProvider");
    expect(summary.providerType).toBe("MockLaminarDataProvider");
    expect(summary.opportunityCount).toBeGreaterThan(0);
    expect(summary.scenarioName).toBe("Balanced default");
  });

  it("resolveAaveDataSourceLabel reports static fallback without RPC", () => {
    expect(resolveAaveDataSourceLabel({ env: {} })).toBe(
      "static-fallback (no RPC configured)",
    );
  });

  it("resolveAaveDataSourceLabel reports on-chain when rpcUrl is set", () => {
    expect(
      resolveAaveDataSourceLabel({ rpcUrl: "https://example.invalid/rpc" }),
    ).toBe("on-chain (RPC configured)");
  });

  it("computeScenarioDifference calculates Aave vs Mock deltas", () => {
    const diff = computeScenarioDifference(mockSummary, aaveSummary);

    expect(diff.expectedApyDifference).toBeCloseTo(-0.013, 5);
    expect(diff.strategyAllocationPercentDifference).toBeCloseTo(-0.5, 5);
    expect(diff.liquidityBufferPercentDifference).toBeCloseTo(0.5, 5);
    expect(diff.topStrategyLabelChanged).toBe(true);
    expect(diff.opportunityCountDifference).toBe(-7);
  });

  it("formatProviderComparisonTable includes provider and opportunity count", () => {
    const table = formatProviderComparisonTable([mockSummary, aaveSummary]);

    expect(table).toContain("Provider");
    expect(table).toContain("MockLaminarDataProvider");
    expect(table).toContain("Aave Base (experimental)");
    expect(table).toContain("#Opps");
    expect(table).toContain("9");
    expect(table).toContain("2");
  });

  it("formatDifferenceSummary renders concise diff rows", () => {
    const diff = computeScenarioDifference(mockSummary, aaveSummary);
    const summary = formatDifferenceSummary([diff]);

    expect(summary).toContain("Difference summary (Aave vs Mock):");
    expect(summary).toContain("Balanced default");
    expect(summary).toContain("Morpho USDC → Aave USDC");
    expect(summary).toContain("-7");
  });
});

describe("runProviderComparisonMatrix", () => {
  it("runs all sensitivity scenarios for both providers without live RPC", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      aaveSnapshotOptions: {
        rpcUrl: "https://example.invalid/rpc",
        publicClient: buildMockAaveClient(),
      },
    });

    expect(matrix.providers).toHaveLength(2);
    expect(matrix.scenarios).toHaveLength(SENSITIVITY_SCENARIOS.length);
    expect(matrix.results).toHaveLength(SENSITIVITY_SCENARIOS.length * 2);
    expect(matrix.differences).toHaveLength(SENSITIVITY_SCENARIOS.length);
  });

  it("labels Aave provider fallback when no RPC is configured", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      aaveSnapshotOptions: { env: {} },
    });

    const aaveProvider = matrix.providers.find(
      (provider) => provider.providerType === "AaveBaseLaminarDataProvider",
    );

    expect(aaveProvider?.dataSourceLabel).toBe(
      "static-fallback (no RPC configured)",
    );
  });

  it("computeAllScenarioDifferences pairs mock and aave results per scenario", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      aaveSnapshotOptions: {
        rpcUrl: "https://example.invalid/rpc",
        publicClient: buildMockAaveClient(),
      },
    });

    const differences = computeAllScenarioDifferences(matrix.results);

    expect(differences).toHaveLength(SENSITIVITY_SCENARIOS.length);
    for (const diff of differences) {
      expect(diff.opportunityCountDifference).toBeLessThan(0);
    }
  });

  it("Aave provider snapshot produces successful recommendations", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildMockAaveClient(),
    });

    const result = createLaminarRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      dataProvider: provider,
    });

    expect(result.snapshot.positions.length).toBeGreaterThan(0);
    expect(result.recommendation.diagnostics.providerType).toBe(
      "AaveBaseLaminarDataProvider",
    );
  });

  it("mock provider remains default when no dataProvider is passed", () => {
    const result = createLaminarRecommendation({
      intent: { risk: 5, liquidity: 6, returnPreference: 5 },
      portfolioValueUsd: 10_000,
      asOf: DEFAULT_SENSITIVITY_AS_OF,
    });

    expect(result.recommendation.diagnostics.providerType).toBe(
      "MockLaminarDataProvider",
    );
  });
});
