import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import { generatePortfolioRecommendation } from "../recommendation/generatePortfolioRecommendation.js";
import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import {
  createAaveBaseLaminarDataProviderSnapshot,
  AAVE_BASE_CURATED_TRUST_PROFILE,
} from "./AaveBaseLaminarDataProvider.js";
import type { AaveReadOnlyClient } from "../../adapters/aave/aaveReserveDiscovery.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");
const balancedIntent = { risk: 5, liquidity: 6, returnPreference: 5 };
const USDC = "0xUSDC000000000000000000000000000000000000" as `0x${string}`;
const EURC = "0xEURC000000000000000000000000000000000000" as `0x${string}`;
const A_USDC = "0xaUSDC0000000000000000000000000000000000" as `0x${string}`;
const A_EURC = "0xaEURC0000000000000000000000000000000000" as `0x${string}`;

/** Deterministic mock RPC client for the Aave adapter — no live network calls. */
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
        if (data === undefined)
          throw new Error(`no reserve data for ${target}`);
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
      if (reserve === undefined)
        throw new Error(`unknown reserve ${args.address}`);
      return args.functionName === "symbol" ? reserve.symbol : reserve.decimals;
    },
  };
}

// ─── Mode A: default mock provider ──────────────────────────────────────────

describe("Mode A — default MockLaminarDataProvider", () => {
  it("createLaminarRecommendation works with no provider argument", () => {
    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.recommendation.selectedProfile).toBe("Balanced");
    expect(result.snapshot).toBeDefined();
    expect(result.executionPlan).toBeDefined();
  });

  it("diagnostics report MockLaminarDataProvider", () => {
    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.diagnostics.providerType).toBe("MockLaminarDataProvider");
    expect(result.diagnostics.providerName).toBe("MockLaminarDataProvider");
    expect(result.diagnostics.opportunityCount).toBeGreaterThan(0);
  });

  it("ranked opportunities > 0 with mock provider", () => {
    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.opportunityRanking.ranked.length).toBeGreaterThan(0);
  });

  it("portfolio positions > 0 with mock provider", () => {
    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    const strategyPositions = result.portfolioConstruction.positions.filter(
      (p) => p.type === "strategy",
    );
    expect(strategyPositions.length).toBeGreaterThan(0);
  });
});

// ─── Mode B: Aave provider opt-in ───────────────────────────────────────────

describe("Mode B — AaveBaseLaminarDataProvider (experimental)", () => {
  it("provider satisfies LaminarDataProvider with no casting", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    // All interface methods must be present as functions.
    expect(typeof provider.discoverOpportunities).toBe("function");
    expect(typeof provider.getTrustProfile).toBe("function");
    expect(typeof provider.getLiquidityProfile).toBe("function");
    expect(typeof provider.getProviderInfo).toBe("function");
  });

  it("getProviderInfo identifies the Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const info = provider.getProviderInfo?.();
    expect(info?.providerType).toBe("AaveBaseLaminarDataProvider");
    expect(info?.providerName).toBe("Aave Base (experimental)");
  });

  it("createLaminarRecommendation succeeds with Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.recommendation).toBeDefined();
    expect(result.snapshot).toBeDefined();
    expect(result.executionPlan).toBeDefined();
  });

  it("recommendation generated successfully with Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.selectedProfile).toBe("Balanced");
    expect(result.opportunities.length).toBe(2);
    expect(result.opportunities.every((o) => o.protocolId === "aave")).toBe(true);
  });

  it("snapshot generated successfully with Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.snapshot.profile).toBe("Balanced");
    expect(result.snapshot.positions.length).toBeGreaterThan(0);
  });

  it("executionPlan generated successfully with Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.executionPlan).toBeDefined();
    expect(Array.isArray(result.executionPlan.steps)).toBe(true);
  });

  it("ranked opportunities > 0 with Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.opportunityRanking.ranked.length).toBeGreaterThan(0);
  });

  it("portfolio positions > 0 with Aave provider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    const strategyPositions = result.portfolioConstruction.positions.filter(
      (p) => p.type === "strategy",
    );
    expect(strategyPositions.length).toBeGreaterThan(0);
  });

  it("expected APY > 0 with Aave provider (real liquidityRate)", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    const expectedApy = result.snapshot.metrics.find(
      (m) => m.key === "expectedApy",
    );
    expect(Number(expectedApy?.value)).toBeGreaterThan(0);
  });

  it("diagnostics identify AaveBaseLaminarDataProvider", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.diagnostics.providerType).toBe("AaveBaseLaminarDataProvider");
    expect(result.diagnostics.providerName).toBe("Aave Base (experimental)");
    expect(result.diagnostics.opportunityCount).toBe(2);
  });

  it("APY comes from real Aave liquidityRate (not static placeholder)", async () => {
    // rpcUrl must be non-empty to trigger rpc-readonly mode; publicClient
    // intercepts all network calls so no real network request is made.
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildMockAaveClient(),
    });

    const opportunities = provider.discoverOpportunities();
    const usdc = opportunities.find((o) => o.asset === "USDC");

    // Mock client returns 5e25 ray → 0.05 APR
    expect(usdc?.apy).toBe(0.05);
    expect(usdc?.apy).not.toBe(0.052); // 0.052 is the static placeholder
  });

  it("trust profile from curated Aave profile is valid", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const trust = provider.getTrustProfile("aave");
    expect(trust.protocolId).toBe("aave");
    expect(trust.audits.length).toBeGreaterThanOrEqual(2);
    expect(trust.tvlUsd).toBe(AAVE_BASE_CURATED_TRUST_PROFILE.tvlUsd);
    expect(trust.tvlSource).toBe("curated-fallback");
  });

  it("liquidity profile is instant with no lockup", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
      publicClient: buildMockAaveClient(),
    });

    const liq = provider.getLiquidityProfile("aave-usdc-base");
    expect(liq.withdrawalSpeedBucket).toBe("instant");
    expect(liq.hasLockup).toBe(false);
    expect(liq.withdrawalConstraintType).toBe("none");
  });

  it("unknown provider falls back to 'unknown' providerType in diagnostics", () => {
    const minimalProvider = new MockLaminarDataProvider({
      opportunities: [],
      trustProfiles: {},
      liquidityProfiles: {},
    });

    // Temporarily remove getProviderInfo to simulate an unknown provider.
    // @ts-expect-error — intentionally removing optional method for test.
    minimalProvider.getProviderInfo = undefined;

    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: minimalProvider,
    });

    expect(result.diagnostics.providerType).toBe("unknown");
    expect(result.diagnostics.providerName).toBe("unknown");
  });
});
