import { describe, expect, it } from "vitest";
import { buildCuratedProtocolTrustProfile } from "../protocols/protocolRegistry.js";
import { createAaveBaseLaminarDataProviderSnapshot } from "./AaveBaseLaminarDataProvider.js";
import { createFluidBaseLaminarDataProviderSnapshot } from "./FluidBaseLaminarDataProvider.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "./MorphoBaseLaminarDataProvider.js";
import { createMoonwellBaseLaminarDataProviderSnapshot } from "./MoonwellBaseLaminarDataProvider.js";
import type {
  FluidApiClient,
  FluidApiTokensResponse,
} from "../../adapters/fluid/fluidTypes.js";
import type {
  MoonwellApiClient,
  MoonwellApiMarketsResponse,
} from "../../adapters/moonwell/moonwellTypes.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function expectRegistryCuratedFields(
  protocolId: "aave" | "morpho" | "fluid" | "moonwell",
  trust: ReturnType<typeof buildCuratedProtocolTrustProfile>,
): void {
  const curated = buildCuratedProtocolTrustProfile(protocolId);

  expect(trust.metadataSource).toBe("protocol-registry");
  expect(trust.protocolAgeYears).toBe(curated.protocolAgeYears);
  expect(trust.audits).toEqual(curated.audits);
  expect(trust.incidents).toEqual(curated.incidents);
  expect(trust.chainAdjustment).toBe(curated.chainAdjustment);
}

describe("real providers consume protocol metadata registry", () => {
  it("Aave provider uses registry metadata", async () => {
    const provider = await createAaveBaseLaminarDataProviderSnapshot({ env: {} });
    expectRegistryCuratedFields("aave", provider.getTrustProfile("aave"));
  });

  it("Morpho provider uses registry metadata", async () => {
    const provider = await createMorphoBaseLaminarDataProviderSnapshot({
      disableApi: true,
      now: () => asOf,
    });
    expectRegistryCuratedFields("morpho", provider.getTrustProfile("morpho"));
  });

  it("Fluid provider uses registry metadata", async () => {
    const sampleTokensResponse: FluidApiTokensResponse = {
      data: [
        {
          address: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169",
          symbol: "fUSDC",
          decimals: 6,
          assetAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          asset: {
            address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            name: "USD Coin",
            symbol: "USDC",
            decimals: 6,
            price: "1.0",
            chainId: "8453",
          },
          totalAssets: "9000000000000",
          totalSupply: "8000000000000",
          supplyRate: "465",
          totalRate: "465",
          rewardsRate: "0",
        },
      ],
    };
    const client: FluidApiClient = {
      getLendingTokens: async () => sampleTokensResponse,
    };

    const provider = await createFluidBaseLaminarDataProviderSnapshot({
      apiUrl: "https://example.invalid/fluid",
      client,
      now: () => asOf,
    });
    expectRegistryCuratedFields("fluid", provider.getTrustProfile("fluid"));
  });

  it("Moonwell provider uses registry metadata", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });
    expectRegistryCuratedFields(
      "moonwell",
      provider.getTrustProfile("moonwell"),
    );
  });

  it("real TVL derivation still overrides curated fallback where available", async () => {
    const sampleMarketsResponse: MoonwellApiMarketsResponse = {
      markets: [
        {
          marketAddress: "0xUSDCMARKET",
          underlyingSymbol: "USDC",
          underlyingDecimals: 6,
          supplyApy: 0.0512,
          totalSupplyUsd: 40_000_000,
        },
      ],
    };
    const client: MoonwellApiClient = {
      getMarkets: async () => sampleMarketsResponse,
    };

    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      apiUrl: "https://api.invalid/moonwell",
      client,
      now: () => asOf,
    });

    const trust = provider.getTrustProfile("moonwell");
    expect(trust.tvlSource).toBe("real-provider-markets");
    expect(trust.tvlUsd).toBe(40_000_000);
    expect(trust.tvlUsd).not.toBe(
      buildCuratedProtocolTrustProfile("moonwell").tvlUsd,
    );
  });

  it("Moonwell with no real markets does not use static market TVL", async () => {
    const provider = await createMoonwellBaseLaminarDataProviderSnapshot({
      disableApi: true,
      allowStaticMarketData: true,
      now: () => asOf,
    });

    const trust = provider.getTrustProfile("moonwell");
    expect(trust.tvlSource).toBe("curated-fallback");
    expect(trust.tvlUsd).toBe(
      buildCuratedProtocolTrustProfile("moonwell").tvlUsd,
    );
    expect(trust.tvlUsd).not.toBe(53_000_000);
  });
});
