import { describe, expect, it } from "vitest";
import { mapMoonwellMarketToOpportunity } from "./mapMoonwellMarketToOpportunity.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

const baseMarket: ReadOnlyMarketOpportunity = {
  id: "moonwell-usdc-base",
  protocolId: "moonwell",
  protocolName: "Moonwell",
  chain: "Base",
  asset: "USDC",
  apy: 0.0512,
  tvlUsd: 40_000_000,
  exposureCategory: "lending",
  source: "moonwell-api",
  fetchedAt: "2026-06-01T00:00:00.000Z",
};

describe("mapMoonwellMarketToOpportunity", () => {
  it("produces a valid Laminar Opportunity", () => {
    const opportunity = mapMoonwellMarketToOpportunity(baseMarket);

    expect(opportunity).toEqual({
      id: "moonwell-usdc-base",
      protocolId: "moonwell",
      protocolName: "Moonwell",
      asset: "USDC",
      chain: "Base",
      apy: 0.0512,
      isExperimental: false,
      protocolRiskLevel: "medium",
      auditCount: 2,
      exposureCategory: "lending",
    });
  });

  it("carries adapter-provided APY and asset through", () => {
    const opportunity = mapMoonwellMarketToOpportunity({
      ...baseMarket,
      id: "moonwell-dai-base",
      asset: "DAI",
      apy: 0.041,
      source: "static-fallback",
    });

    expect(opportunity.id).toBe("moonwell-dai-base");
    expect(opportunity.asset).toBe("DAI");
    expect(opportunity.apy).toBe(0.041);
    expect(opportunity.exposureCategory).toBe("lending");
    expect(opportunity.isExperimental).toBe(false);
  });
});
