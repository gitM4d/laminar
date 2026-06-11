import { describe, expect, it } from "vitest";
import type { ReadOnlyMarketOpportunity } from "./types.js";
import {
  filterRealDataEligibleMarkets,
  isPlaceholderMarketAddress,
  isRealDataEligibleMarket,
} from "./realDataEligibility.js";

const realApiMarket: ReadOnlyMarketOpportunity = {
  id: "moonwell-usdc-base",
  protocolId: "moonwell",
  protocolName: "Moonwell",
  chain: "Base",
  asset: "USDC",
  apy: 0.048,
  tvlUsd: 40_000_000,
  exposureCategory: "lending",
  source: "moonwell-api",
  fetchedAt: "2026-06-01T00:00:00.000Z",
  metadata: {
    reserveDiscovery: "api",
    reserveAddress: "0xUSDCMARKET",
    apySource: "moonwell-api",
    apyIsApproximation: false,
    tvlSource: "moonwell-api",
  },
};

const staticFallbackMarket: ReadOnlyMarketOpportunity = {
  ...realApiMarket,
  source: "static-fallback",
  metadata: {
    reserveDiscovery: "static",
    reserveAddress: "0xMOONWELL_USDC_MARKET_PLACEHOLDER_00000000",
    apySource: "static-placeholder",
    apyIsApproximation: false,
    tvlSource: "static-placeholder",
  },
};

describe("realDataEligibility", () => {
  it("detects placeholder market addresses", () => {
    expect(
      isPlaceholderMarketAddress(
        "0xMOONWELL_USDC_MARKET_PLACEHOLDER_00000000",
      ),
    ).toBe(true);
    expect(isPlaceholderMarketAddress("0xUSDCMARKET")).toBe(false);
  });

  it("accepts API-sourced markets as real-data eligible", () => {
    expect(isRealDataEligibleMarket(realApiMarket)).toBe(true);
  });

  it("rejects static-fallback placeholder markets", () => {
    expect(isRealDataEligibleMarket(staticFallbackMarket)).toBe(false);
  });

  it("filters static placeholder markets from a list", () => {
    expect(
      filterRealDataEligibleMarkets([realApiMarket, staticFallbackMarket]),
    ).toEqual([realApiMarket]);
  });
});
