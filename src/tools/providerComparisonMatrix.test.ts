import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../core/index.js";
import { createAaveBaseLaminarDataProviderSnapshot } from "../core/providers/AaveBaseLaminarDataProvider.js";
import type { AaveReadOnlyClient } from "../adapters/aave/aaveReserveDiscovery.js";
import type {
  MorphoApiClient,
  MorphoApiVaultsResponse,
} from "../adapters/morpho/morphoTypes.js";
import type {
  MoonwellApiClient,
  MoonwellApiMarketsResponse,
} from "../adapters/moonwell/moonwellTypes.js";
import {
  DEFAULT_SENSITIVITY_AS_OF,
  SENSITIVITY_SCENARIOS,
} from "./sensitivityMatrix.js";
import {
  computeAllProviderDifferences,
  computeAllScenarioDifferences,
  computeScenarioDifference,
  extractProviderComparisonSummary,
  formatAllDifferenceSummaries,
  formatDifferenceSummary,
  formatProviderComparisonTable,
  formatProviderDataQualityTable,
  resolveAaveDataQuality,
  resolveAaveDataSourceLabel,
  resolveCombinedDataQuality,
  resolveMoonwellDataQuality,
  resolveMoonwellDataSourceLabel,
  resolveMorphoDataQuality,
  resolveMorphoDataSourceLabel,
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

const sampleMorphoVaultsResponse: MorphoApiVaultsResponse = {
  vaults: {
    items: [
      {
        address: "0xUSDCVAULT",
        name: "Morpho USDC Vault",
        symbol: "mwUSDC",
        asset: { symbol: "USDC", decimals: 6, address: "0xusdc" },
        state: { netApy: 0.0612, apy: 0.06, totalAssetsUsd: 95_000_000 },
      },
      {
        address: "0xEURCVAULT",
        name: "Morpho EURC Vault",
        symbol: "mwEURC",
        asset: { symbol: "EURC", decimals: 6, address: "0xeurc" },
        state: { netApy: 0.0421, apy: 0.041, totalAssetsUsd: 12_000_000 },
      },
    ],
  },
};

function buildMockMorphoClient(): MorphoApiClient {
  return {
    query: async <T>() => sampleMorphoVaultsResponse as T,
  };
}

const sampleMoonwellMarketsResponse: MoonwellApiMarketsResponse = {
  markets: [
    {
      marketAddress: "0xMW_USDC",
      underlyingSymbol: "USDC",
      underlyingDecimals: 6,
      supplyApy: 0.0512,
      totalSupplyUsd: 40_000_000,
    },
    {
      marketAddress: "0xMW_EURC",
      underlyingSymbol: "EURC",
      underlyingDecimals: 6,
      supplyApy: 0.0345,
      totalSupplyUsd: 5_000_000,
    },
    {
      marketAddress: "0xMW_DAI",
      underlyingSymbol: "DAI",
      underlyingDecimals: 18,
      supplyApy: 0.0431,
      totalSupplyUsd: 8_000_000,
    },
  ],
};

function buildMockMoonwellClient(): MoonwellApiClient {
  return {
    getMarkets: async () => sampleMoonwellMarketsResponse,
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

const morphoSummary: ProviderComparisonSummary = {
  ...mockSummary,
  strategyExpectedApy: 0.038,
  portfolioExpectedApy: 0.019,
  expectedApy: 0.038,
  topStrategyPositionLabel: "Morpho USDC",
  providerName: "Morpho Base (experimental)",
  providerType: "MorphoBaseLaminarDataProvider",
  opportunityCount: 2,
  dataSourceLabel: "api (Morpho GraphQL configured)",
};

const combinedSummary: ProviderComparisonSummary = {
  ...mockSummary,
  strategyExpectedApy: 0.041,
  portfolioExpectedApy: 0.02,
  expectedApy: 0.041,
  topStrategyPositionLabel: "Morpho USDC",
  providerName: "Combined Aave + Morpho + Moonwell (experimental)",
  providerType: "CombinedLaminarDataProvider",
  opportunityCount: 7,
  dataSourceLabel:
    "Aave: on-chain (RPC configured); Morpho: api (Morpho GraphQL configured); Moonwell: api (Moonwell data API configured)",
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

  it("resolveMorphoDataSourceLabel reports static fallback when API disabled", () => {
    expect(resolveMorphoDataSourceLabel({ disableApi: true })).toBe(
      "static-fallback (API disabled)",
    );
  });

  it("resolveMorphoDataSourceLabel reports api when configured", () => {
    expect(
      resolveMorphoDataSourceLabel({
        apiUrl: "https://example.invalid/graphql",
      }),
    ).toBe("api (Morpho GraphQL configured)");
  });

  it("resolveAaveDataQuality reports real-onchain when RPC configured", () => {
    const quality = resolveAaveDataQuality({
      rpcUrl: "https://example.invalid/rpc",
    });

    expect(quality.apyData).toBe("real-onchain");
    expect(quality.tvlData).toBe("real-onchain-approx");
    expect(quality.trustData).toBe("curated");
    expect(quality.liquidityData).toBe("curated");
  });

  it("resolveAaveDataQuality reports static-fallback without RPC", () => {
    const quality = resolveAaveDataQuality({ env: {} });

    expect(quality.apyData).toBe("static-fallback");
    expect(quality.tvlData).toBe("static-fallback");
  });

  it("resolveMorphoDataQuality reports real-api when API configured", () => {
    const quality = resolveMorphoDataQuality({
      apiUrl: "https://example.invalid/graphql",
    });

    expect(quality.apyData).toBe("real-api");
    expect(quality.tvlData).toBe("real-api");
    expect(quality.trustData).toBe("curated");
    expect(quality.liquidityData).toBe("curated");
  });

  it("resolveMorphoDataQuality reports static-fallback when API disabled", () => {
    const quality = resolveMorphoDataQuality({ disableApi: true });

    expect(quality.apyData).toBe("static-fallback");
    expect(quality.tvlData).toBe("static-fallback");
  });

  it("resolveMoonwellDataSourceLabel reports static fallback when API disabled", () => {
    expect(resolveMoonwellDataSourceLabel({ disableApi: true })).toBe(
      "static-fallback (API disabled)",
    );
  });

  it("resolveMoonwellDataSourceLabel reports static fallback with no API configured", () => {
    expect(resolveMoonwellDataSourceLabel({ env: {} })).toBe(
      "static-fallback (no API configured)",
    );
  });

  it("resolveMoonwellDataQuality reports real-api when API configured", () => {
    const quality = resolveMoonwellDataQuality({
      apiUrl: "https://example.invalid/moonwell",
    });

    expect(quality.apyData).toBe("real-api");
    expect(quality.tvlData).toBe("real-api");
    expect(quality.trustData).toBe("curated");
    expect(quality.liquidityData).toBe("curated");
  });

  it("resolveMoonwellDataQuality reports static-fallback when API disabled", () => {
    const quality = resolveMoonwellDataQuality({ disableApi: true });

    expect(quality.apyData).toBe("static-fallback");
    expect(quality.tvlData).toBe("static-fallback");
  });

  it("resolveCombinedDataQuality reports mixed-real when sub-providers are real (V2)", () => {
    const quality = resolveCombinedDataQuality(
      resolveAaveDataQuality({ rpcUrl: "https://example.invalid/rpc" }),
      resolveMorphoDataQuality({ apiUrl: "https://example.invalid/graphql" }),
      resolveMoonwellDataQuality({ apiUrl: "https://example.invalid/moonwell" }),
    );

    expect(quality.apyData).toBe("mixed-real");
    expect(quality.tvlData).toBe("mixed-real");
    expect(quality.trustData).toBe("curated");
    expect(quality.liquidityData).toBe("curated");
    expect(quality.providerName).toBe(
      "Combined Aave + Morpho + Moonwell (experimental)",
    );
  });

  it("resolveCombinedDataQuality stays mixed-real when only some sub-providers are real", () => {
    const quality = resolveCombinedDataQuality(
      resolveAaveDataQuality({ rpcUrl: "https://example.invalid/rpc" }),
      resolveMorphoDataQuality({ disableApi: true }),
      resolveMoonwellDataQuality({ disableApi: true }),
    );

    expect(quality.apyData).toBe("mixed-real");
  });

  it("resolveCombinedDataQuality reports mixed-fallback when all sub-providers fallback (V2)", () => {
    const quality = resolveCombinedDataQuality(
      resolveAaveDataQuality({ env: {} }),
      resolveMorphoDataQuality({ disableApi: true }),
      resolveMoonwellDataQuality({ disableApi: true }),
    );

    expect(quality.apyData).toBe("mixed-fallback");
    expect(quality.tvlData).toBe("mixed-fallback");
  });

  it("computeScenarioDifference calculates real vs Mock deltas", () => {
    const diff = computeScenarioDifference(mockSummary, aaveSummary);

    expect(diff.strategyExpectedApyDifference).toBeCloseTo(-0.013, 5);
    expect(diff.portfolioExpectedApyDifference).toBeCloseTo(-0.006, 5);
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

  it("formatProviderDataQualityTable renders data quality columns", () => {
    const table = formatProviderDataQualityTable([
      {
        providerType: "MockLaminarDataProvider",
        providerName: "MockLaminarDataProvider",
        apyData: "static",
        tvlData: "static",
        trustData: "mock",
        liquidityData: "mock",
      },
      resolveAaveDataQuality({ rpcUrl: "https://example.invalid/rpc" }),
    ]);

    expect(table).toContain("Provider Data Quality:");
    expect(table).toContain("APY Data");
    expect(table).toContain("real-onchain");
    expect(table).toContain("real-onchain-approx");
    expect(table).toContain("mock");
  });

  it("formatDifferenceSummary renders concise diff rows with Strat/Port APY", () => {
    const diff = computeScenarioDifference(mockSummary, aaveSummary);
    const summary = formatDifferenceSummary("Difference summary (Aave vs Mock):", [
      diff,
    ]);

    expect(summary).toContain("Difference summary (Aave vs Mock):");
    expect(summary).toContain("ΔStratAPY");
    expect(summary).toContain("ΔPortAPY");
    expect(summary).toContain("Balanced default");
    expect(summary).toContain("Morpho USDC → Aave USDC");
    expect(summary).toContain("-7");
  });

  it("formatAllDifferenceSummaries includes Aave, Morpho, and Combined sections", () => {
    const differences = {
      aaveVsMock: [computeScenarioDifference(mockSummary, aaveSummary)],
      morphoVsMock: [computeScenarioDifference(mockSummary, morphoSummary)],
      combinedVsMock: [computeScenarioDifference(mockSummary, combinedSummary)],
    };

    const output = formatAllDifferenceSummaries(differences);

    expect(output).toContain("Difference summary (Aave vs Mock):");
    expect(output).toContain("Difference summary (Morpho vs Mock):");
    expect(output).toContain("Difference summary (Combined vs Mock):");
  });
});

describe("runProviderComparisonMatrix", () => {
  const snapshotOptions = {
    aaveSnapshotOptions: {
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildMockAaveClient(),
    },
    morphoSnapshotOptions: {
      apiUrl: "https://example.invalid/graphql",
      client: buildMockMorphoClient(),
    },
    moonwellSnapshotOptions: {
      apiUrl: "https://example.invalid/moonwell",
      client: buildMockMoonwellClient(),
    },
  };

  it("runs all sensitivity scenarios for four providers without live RPC/API", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    expect(matrix.providers).toHaveLength(4);
    expect(matrix.providerDataQuality).toHaveLength(4);
    expect(matrix.scenarios).toHaveLength(SENSITIVITY_SCENARIOS.length);
    expect(matrix.results).toHaveLength(SENSITIVITY_SCENARIOS.length * 4);
    expect(matrix.differences.aaveVsMock).toHaveLength(
      SENSITIVITY_SCENARIOS.length,
    );
    expect(matrix.differences.morphoVsMock).toHaveLength(
      SENSITIVITY_SCENARIOS.length,
    );
    expect(matrix.differences.combinedVsMock).toHaveLength(
      SENSITIVITY_SCENARIOS.length,
    );
  });

  it("Combined V2 opportunityCount equals Aave + Morpho + Moonwell per scenario", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    for (const scenario of SENSITIVITY_SCENARIOS) {
      const aaveResult = matrix.results.find(
        (entry) =>
          entry.scenarioName === scenario.name &&
          entry.providerType === "AaveBaseLaminarDataProvider",
      );
      const morphoResult = matrix.results.find(
        (entry) =>
          entry.scenarioName === scenario.name &&
          entry.providerType === "MorphoBaseLaminarDataProvider",
      );
      const combinedResult = matrix.results.find(
        (entry) =>
          entry.scenarioName === scenario.name &&
          entry.providerType === "CombinedLaminarDataProvider",
      );

      // Moonwell static fallback (no moonwellSnapshotOptions in this matrix run
      // would be 3); with the mock client it discovers 3 markets.
      const combinedExpected =
        (aaveResult?.summary.opportunityCount ?? 0) +
        (morphoResult?.summary.opportunityCount ?? 0) +
        3;

      expect(combinedResult?.summary.opportunityCount).toBe(combinedExpected);
    }
  });

  it("labels Aave provider fallback when no RPC is configured", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      aaveSnapshotOptions: { env: {} },
      morphoSnapshotOptions: { disableApi: true },
    });

    const aaveQuality = matrix.providerDataQuality.find(
      (quality) => quality.providerType === "AaveBaseLaminarDataProvider",
    );

    expect(aaveQuality?.apyData).toBe("static-fallback");
    expect(aaveQuality?.tvlData).toBe("static-fallback");
  });

  it("labels Morpho provider fallback when API is disabled", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      aaveSnapshotOptions: { env: {} },
      morphoSnapshotOptions: { disableApi: true },
    });

    const morphoQuality = matrix.providerDataQuality.find(
      (quality) => quality.providerType === "MorphoBaseLaminarDataProvider",
    );

    expect(morphoQuality?.apyData).toBe("static-fallback");
    expect(morphoQuality?.tvlData).toBe("static-fallback");
  });

  it("reports Mock data quality as static/mock", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    const mockQuality = matrix.providerDataQuality.find(
      (quality) => quality.providerType === "MockLaminarDataProvider",
    );

    expect(mockQuality?.apyData).toBe("static");
    expect(mockQuality?.tvlData).toBe("static");
    expect(mockQuality?.trustData).toBe("mock");
    expect(mockQuality?.liquidityData).toBe("mock");
  });

  it("reports Combined data quality as mixed-real with curated trust/liquidity", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    const combinedQuality = matrix.providerDataQuality.find(
      (quality) => quality.providerType === "CombinedLaminarDataProvider",
    );

    expect(combinedQuality?.apyData).toBe("mixed-real");
    expect(combinedQuality?.tvlData).toBe("mixed-real");
    expect(combinedQuality?.trustData).toBe("curated");
    expect(combinedQuality?.liquidityData).toBe("curated");
  });

  it("difference summary includes Aave vs Mock", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    for (const diff of matrix.differences.aaveVsMock) {
      expect(diff.opportunityCountDifference).toBeLessThan(0);
      expect(diff.mockProviderName).toBe("MockLaminarDataProvider");
      expect(diff.realProviderName).toBe("Aave Base (experimental)");
    }
  });

  it("difference summary includes Morpho vs Mock", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    expect(matrix.differences.morphoVsMock).toHaveLength(
      SENSITIVITY_SCENARIOS.length,
    );
    expect(matrix.differences.morphoVsMock[0]?.realProviderName).toBe(
      "Morpho Base (experimental)",
    );
  });

  it("difference summary includes Combined vs Mock", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    expect(matrix.differences.combinedVsMock).toHaveLength(
      SENSITIVITY_SCENARIOS.length,
    );
    expect(matrix.differences.combinedVsMock[0]?.realProviderName).toBe(
      "Combined Aave + Morpho + Moonwell (experimental)",
    );
  });

  it("JSON output includes providerDataQuality and structured differences", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    const json = JSON.parse(JSON.stringify(matrix)) as typeof matrix;

    expect(json.providerDataQuality).toHaveLength(4);
    expect(json.differences.aaveVsMock).toBeDefined();
    expect(json.differences.morphoVsMock).toBeDefined();
    expect(json.differences.combinedVsMock).toBeDefined();
  });

  it("computeAllScenarioDifferences remains compatible with Aave vs Mock", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    const differences = computeAllScenarioDifferences(matrix.results);

    expect(differences).toHaveLength(SENSITIVITY_SCENARIOS.length);
    for (const diff of differences) {
      expect(diff.opportunityCountDifference).toBeLessThan(0);
    }
  });

  it("computeAllProviderDifferences returns all three comparison sets", async () => {
    const matrix = await runProviderComparisonMatrix({
      asOf: DEFAULT_SENSITIVITY_AS_OF,
      ...snapshotOptions,
    });

    const differences = computeAllProviderDifferences(matrix.results);

    expect(differences.aaveVsMock).toHaveLength(SENSITIVITY_SCENARIOS.length);
    expect(differences.morphoVsMock).toHaveLength(SENSITIVITY_SCENARIOS.length);
    expect(differences.combinedVsMock).toHaveLength(
      SENSITIVITY_SCENARIOS.length,
    );
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
