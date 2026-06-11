import { describe, expect, it } from "vitest";
import { createLaminarRecommendation } from "../index.js";
import {
  generatePortfolioRecommendation,
  RecommendationDataConsistencyError,
} from "../recommendation/generatePortfolioRecommendation.js";
import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import {
  AAVE_BASE_CURATED_TRUST_PROFILE,
  createAaveBaseLaminarDataProviderSnapshot,
} from "./AaveBaseLaminarDataProvider.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const balancedIntent = { risk: 5, liquidity: 6, returnPreference: 5 };

describe("AaveBaseLaminarDataProvider snapshot", () => {
  it("exposes Aave opportunities discovered by the read-only adapter", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
    });

    const opportunities = provider.discoverOpportunities();

    expect(opportunities.map((opportunity) => opportunity.id)).toEqual([
      "aave-usdc-base",
      "aave-eurc-base",
    ]);
    expect(
      opportunities.every((opportunity) => opportunity.protocolId === "aave"),
    ).toBe(true);
  });

  it("provides curated trust and liquidity metadata for Aave markets", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
    });

    const trust = provider.getTrustProfile("aave");
    expect(trust.protocolName).toBe("Aave");
    expect(trust.tvlUsd).toBe(AAVE_BASE_CURATED_TRUST_PROFILE.tvlUsd);
    expect(trust.tvlSource).toBe("curated-fallback");
    expect(
      provider.getLiquidityProfile("aave-usdc-base").withdrawalConstraintType,
    ).toBe("none");
    expect(provider.getLiquidityProfile("aave-usdc-base").hasLockup).toBe(false);
  });

  it("derives trust TVL from real on-chain market TVLs when RPC data is available", async () => {
    const USDC = "0xUSDC000000000000000000000000000000000000" as `0x${string}`;
    const EURC = "0xEURC000000000000000000000000000000000000" as `0x${string}`;
    const A_USDC = "0xaUSDC0000000000000000000000000000000000" as `0x${string}`;
    const A_EURC = "0xaEURC0000000000000000000000000000000000" as `0x${string}`;

    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: {
        getBlockNumber: async () => 12_345_678n,
        readContract: async (args) => {
          if (args.functionName === "getReservesList") {
            return [USDC, EURC];
          }
          if (args.functionName === "getReserveData") {
            const target = (args.args?.[0] ?? "") as string;
            if (target === USDC) {
              return {
                currentLiquidityRate: 5n * 10n ** 25n,
                aTokenAddress: A_USDC,
              };
            }
            return {
              currentLiquidityRate: 3n * 10n ** 25n,
              aTokenAddress: A_EURC,
            };
          }
          if (args.functionName === "totalSupply") {
            if (args.address === A_USDC) {
              return 180_000_000n * 10n ** 6n;
            }
            return 25_000_000n * 10n ** 6n;
          }
          return args.functionName === "symbol" ? "USDC" : 6;
        },
      },
    });

    const trust = provider.getTrustProfile("aave");
    expect(trust.tvlSource).toBe("real-provider-markets");
    expect(trust.tvlUsd).toBe(205_000_000);
  });

  it("exposes Aave trust explanation without changing the trust score", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
    });

    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    const explanation = result.recommendation.trustExplanations.find(
      (entry) => entry.protocolId === "aave",
    );
    const trustScore = result.recommendation.trustScores.find(
      (entry) => entry.protocolId === "aave",
    )?.trust.trustScore;

    expect(explanation?.trustScore).toBe(trustScore);
    expect(explanation?.trustExplanation.auditTier).toBe("tier1");
    expect(explanation?.trustExplanation.auditCount).toBe(
      AAVE_BASE_CURATED_TRUST_PROFILE.audits.length,
    );
  });

  it("produces a usable recommendation when passed into the pipeline", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
    });

    const result = generatePortfolioRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
      dataProvider: provider,
    });

    expect(result.selectedProfile).toBe("Balanced");
    expect(result.opportunities.map((entry) => entry.id)).toEqual([
      "aave-usdc-base",
      "aave-eurc-base",
    ]);
  });

  it("throws a consistency error when curated trust metadata is missing", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
    });
    const opportunities = provider.discoverOpportunities();

    const providerWithoutTrust = new MockLaminarDataProvider({
      opportunities,
      trustProfiles: {},
      liquidityProfiles: {
        "aave-usdc-base": provider.getLiquidityProfile("aave-usdc-base"),
        "aave-eurc-base": provider.getLiquidityProfile("aave-eurc-base"),
      },
    });

    expect(() =>
      generatePortfolioRecommendation({
        intent: balancedIntent,
        portfolioValueUsd: 10_000,
        asOf,
        dataProvider: providerWithoutTrust,
      }),
    ).toThrow(RecommendationDataConsistencyError);
  });

  it("throws a consistency error when curated liquidity metadata is missing", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({
      env: {},
    });
    const opportunities = provider.discoverOpportunities();

    const providerWithoutLiquidity = new MockLaminarDataProvider({
      opportunities,
      trustProfiles: { aave: provider.getTrustProfile("aave") },
      liquidityProfiles: {},
    });

    expect(() =>
      generatePortfolioRecommendation({
        intent: balancedIntent,
        portfolioValueUsd: 10_000,
        asOf,
        dataProvider: providerWithoutLiquidity,
      }),
    ).toThrow(RecommendationDataConsistencyError);
  });

  it("does not change createLaminarRecommendation default (mock) behavior", () => {
    const result = createLaminarRecommendation({
      intent: balancedIntent,
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(result.snapshot.profile).toBe("Balanced");
    expect(
      result.recommendation.opportunities.some(
        (opportunity) => opportunity.id === "morpho-usdc-base",
      ),
    ).toBe(true);
  });
});
