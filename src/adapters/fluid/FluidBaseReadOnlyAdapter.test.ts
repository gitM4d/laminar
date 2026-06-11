import { describe, expect, it } from "vitest";
import { isRealDataEligibleMarket } from "../realDataEligibility.js";
import {
  FluidBaseReadOnlyAdapter,
  FluidDiscoveryError,
} from "./FluidBaseReadOnlyAdapter.js";
import { FLUID_BASE_STATIC_MARKETS } from "./fluidStaticMarkets.js";
import type {
  FluidApiClient,
  FluidApiTokensResponse,
} from "./fluidTypes.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const sampleTokensResponse: FluidApiTokensResponse = {
  totalAssetsInUsd: "12078738.81",
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
    {
      address: "0x1943FA26360f038230442525Cf1B9125b5DCB401",
      symbol: "fEURC",
      decimals: 6,
      assetAddress: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
      asset: {
        address: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
        name: "EURC",
        symbol: "EURC",
        decimals: 6,
        price: "1.15",
        chainId: "8453",
      },
      totalAssets: "1500000000000",
      totalSupply: "1400000000000",
      supplyRate: "225",
      totalRate: "225",
      rewardsRate: "0",
    },
    {
      address: "0x9272D6153133175175Bc276512B2336BE3931CE9",
      symbol: "fWETH",
      decimals: 18,
      assetAddress: "0x4200000000000000000000000000000000000006",
      asset: {
        address: "0x4200000000000000000000000000000000000006",
        name: "Wrapped Ether",
        symbol: "WETH",
        decimals: 18,
        price: "1642.75",
        chainId: "8453",
      },
      totalAssets: "71512725921893360585",
      totalSupply: "69672838277081619062",
      supplyRate: "57",
      totalRate: "57",
      rewardsRate: "0",
    },
  ],
};

function buildApiClient(response: FluidApiTokensResponse): FluidApiClient {
  return {
    getLendingTokens: async () => response,
  };
}

describe("FluidBaseReadOnlyAdapter", () => {
  it("uses unavailable mode by default without API configuration", () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      disableApi: true,
      env: {},
    });

    expect(adapter.getMode()).toBe("unavailable");
  });

  it("returns no markets in unavailable mode", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      disableApi: true,
      env: {},
      now: () => asOf,
    });

    expect(await adapter.discoverMarkets()).toEqual([]);
  });

  it("reports unhealthy health in unavailable mode", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      disableApi: true,
      env: {},
      now: () => asOf,
    });

    const health = await adapter.getHealth();
    expect(health.mode).toBe("unavailable");
    expect(health.healthy).toBe(false);
    expect(health.detail).toContain("Unavailable mode");
  });

  it("does not use static dev fallback unless ALLOW_STATIC_MARKET_DATA=true", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      disableApi: true,
      env: { ALLOW_STATIC_MARKET_DATA: "false" },
      now: () => asOf,
    });

    expect(adapter.getMode()).toBe("unavailable");
    expect(await adapter.discoverMarkets()).toEqual([]);
  });

  it("uses static dev fallback only with ALLOW_STATIC_MARKET_DATA=true", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      disableApi: true,
      env: { ALLOW_STATIC_MARKET_DATA: "true" },
      now: () => asOf,
    });

    expect(adapter.getMode()).toBe("static-dev-fallback");
    const markets = await adapter.discoverMarkets();
    expect(markets).toHaveLength(FLUID_BASE_STATIC_MARKETS.length);
    expect(markets[0]?.metadata?.apySource).toBe("static-placeholder");
  });

  it("filters static dev markets through realDataEligibility guard", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      disableApi: true,
      env: { ALLOW_STATIC_MARKET_DATA: "true" },
      now: () => asOf,
    });

    const markets = await adapter.discoverMarkets();
    expect(markets.every((market) => isRealDataEligibleMarket(market))).toBe(
      false,
    );
  });

  it("discovers real V1 markets from the Fluid API fixture", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      apiUrl: "https://example.invalid/fluid",
      client: buildApiClient(sampleTokensResponse),
      now: () => asOf,
    });

    expect(adapter.getMode()).toBe("real-readonly");
    const markets = await adapter.discoverMarkets();

    expect(markets.map((market) => market.asset).sort()).toEqual(["EURC", "USDC"]);
    expect(markets.every((market) => market.source === "fluid-api")).toBe(true);
    expect(markets.every((market) => isRealDataEligibleMarket(market))).toBe(true);
    expect(markets.find((market) => market.asset === "USDC")?.apy).toBeCloseTo(
      0.0465,
      4,
    );
  });

  it("excludes non-V1 assets from API discovery", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      apiUrl: "https://example.invalid/fluid",
      client: buildApiClient(sampleTokensResponse),
      now: () => asOf,
    });

    const markets = await adapter.discoverMarkets();
    expect(markets.some((market) => market.asset === "WETH" as never)).toBe(false);
  });

  it("throws in strict API mode when discovery fails", async () => {
    const adapter = new FluidBaseReadOnlyAdapter({
      apiUrl: "https://example.invalid/fluid",
      strictApi: true,
      client: {
        getLendingTokens: async () => {
          throw new FluidDiscoveryError("boom");
        },
      },
    });

    await expect(adapter.discoverMarkets()).rejects.toThrow(FluidDiscoveryError);
  });

  it("does not import wallet or signing modules", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./FluidBaseReadOnlyAdapter.ts", import.meta.url), "utf8"),
    );

    expect(source).not.toMatch(/privateKey|wallet|signer|viem\/accounts/i);
  });
});
