import { describe, expect, it } from "vitest";
import { CombinedLaminarDataProvider } from "./CombinedLaminarDataProvider.js";
import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import {
  buildDefaultLaminarDataProvider,
  InvalidProviderModeError,
  resolveProviderMode,
} from "./resolveDefaultProvider.js";
import type { LaminarDataProvider } from "./types.js";

describe("resolveProviderMode", () => {
  it("defaults to real when env var is missing", () => {
    expect(resolveProviderMode({})).toBe("real");
  });

  it("returns real for LAMINAR_PROVIDER_MODE=real", () => {
    expect(
      resolveProviderMode({ LAMINAR_PROVIDER_MODE: "real" }),
    ).toBe("real");
  });

  it("returns mock for LAMINAR_PROVIDER_MODE=mock", () => {
    expect(
      resolveProviderMode({ LAMINAR_PROVIDER_MODE: "mock" }),
    ).toBe("mock");
  });

  it("throws for invalid provider mode values", () => {
    expect(() =>
      resolveProviderMode({ LAMINAR_PROVIDER_MODE: "invalid" }),
    ).toThrow(InvalidProviderModeError);
  });
});

describe("buildDefaultLaminarDataProvider", () => {
  it("returns MockLaminarDataProvider in mock mode", async () => {
    const provider = await buildDefaultLaminarDataProvider({ mode: "mock" });

    expect(provider).toBeInstanceOf(MockLaminarDataProvider);
    expect(provider.getProviderInfo?.()?.providerType).toBe(
      "MockLaminarDataProvider",
    );
  });

  it("returns combined real provider in real mode via injection", async () => {
    const injectedCombined = new CombinedLaminarDataProvider([
      new MockLaminarDataProvider(),
    ]);

    const provider = await buildDefaultLaminarDataProvider({
      mode: "real",
      createCombinedRealProvider: async () => injectedCombined,
    });

    expect(provider).toBe(injectedCombined);
    expect(provider.getProviderInfo?.()?.providerType).toBe(
      "CombinedLaminarDataProvider",
    );
  });
});

describe("createCombinedRealProvider integration (mocked snapshots)", () => {
  it("excludes Moonwell when no real markets are available", async () => {
    const emptyMoonwell: LaminarDataProvider = {
      discoverOpportunities: () => [],
      getTrustProfile: () => {
        throw new Error("unexpected");
      },
      getLiquidityProfile: () => {
        throw new Error("unexpected");
      },
    };
    const aaveLike: LaminarDataProvider = {
      discoverOpportunities: () => [
        {
          id: "aave-usdc-base",
          protocolId: "aave",
          protocolName: "Aave",
          asset: "USDC",
          chain: "Base",
          apy: 0.03,
          isExperimental: true,
          protocolRiskLevel: "low",
          auditCount: 2,
          exposureCategory: "lending",
        },
      ],
      getTrustProfile: () => ({
        protocolId: "aave",
        protocolName: "Aave",
        protocolAgeYears: 5.5,
        tvlUsd: 1,
        audits: [],
        incidents: [],
        chainAdjustment: 0,
      }),
      getLiquidityProfile: (opportunityId) => ({
        opportunityId,
        withdrawalSpeedBucket: "instant",
        withdrawalConstraintType: "none",
        redemptionReliabilityLevel: "veryHigh",
        assetLiquidityLevel: "veryHigh",
        maxWithdrawalDelay: "instant",
        hasLockup: false,
      }),
    };
    const morphoLike: LaminarDataProvider = {
      discoverOpportunities: () => [
        {
          id: "morpho-usdc-base",
          protocolId: "morpho",
          protocolName: "Morpho",
          asset: "USDC",
          chain: "Base",
          apy: 0.04,
          isExperimental: true,
          protocolRiskLevel: "medium",
          auditCount: 2,
          exposureCategory: "lending",
        },
      ],
      getTrustProfile: () => ({
        protocolId: "morpho",
        protocolName: "Morpho",
        protocolAgeYears: 3,
        tvlUsd: 1,
        audits: [],
        incidents: [],
        chainAdjustment: 0,
      }),
      getLiquidityProfile: (opportunityId) => ({
        opportunityId,
        withdrawalSpeedBucket: "instant",
        withdrawalConstraintType: "none",
        redemptionReliabilityLevel: "high",
        assetLiquidityLevel: "veryHigh",
        maxWithdrawalDelay: "instant",
        hasLockup: false,
      }),
    };
    const emptyFluid: LaminarDataProvider = {
      discoverOpportunities: () => [],
      getTrustProfile: () => {
        throw new Error("unexpected");
      },
      getLiquidityProfile: () => {
        throw new Error("unexpected");
      },
    };

    const { createCombinedRealProvider } = await import(
      "./createCombinedRealProvider.js"
    );

    const combined = await createCombinedRealProvider({
      createAaveSnapshot: async () => aaveLike,
      createMorphoSnapshot: async () => morphoLike,
      createMoonwellSnapshot: async () => emptyMoonwell,
      createFluidSnapshot: async () => emptyFluid,
    });

    const opportunities = combined.discoverOpportunities();
    expect(opportunities.map((opportunity) => opportunity.id)).toEqual([
      "aave-usdc-base",
      "morpho-usdc-base",
    ]);
    expect(
      opportunities.every((opportunity) => !opportunity.id.startsWith("moonwell")),
    ).toBe(true);
  });
});
