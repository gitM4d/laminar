import { describe, expect, it } from "vitest";
import { mapAaveMarketToOpportunity } from "./mapAaveMarketToOpportunity.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

const baseMarket: ReadOnlyMarketOpportunity = {
  id: "aave-usdc-base",
  protocolId: "aave",
  protocolName: "Aave",
  chain: "Base",
  asset: "USDC",
  apy: 0.052,
  tvlUsd: 180_000_000,
  exposureCategory: "lending",
  source: "static-fallback",
  fetchedAt: "2026-06-01T00:00:00.000Z",
};

describe("mapAaveMarketToOpportunity", () => {
  it("produces a valid Laminar Opportunity", () => {
    const opportunity = mapAaveMarketToOpportunity(baseMarket);

    expect(opportunity).toEqual({
      id: "aave-usdc-base",
      protocolId: "aave",
      protocolName: "Aave",
      asset: "USDC",
      chain: "Base",
      apy: 0.052,
      isExperimental: false,
      protocolRiskLevel: "low",
      auditCount: 2,
      exposureCategory: "lending",
    });
  });

  it("carries adapter-provided APY and asset through", () => {
    const opportunity = mapAaveMarketToOpportunity({
      ...baseMarket,
      id: "aave-eurc-base",
      asset: "EURC",
      apy: 0.041,
    });

    expect(opportunity.id).toBe("aave-eurc-base");
    expect(opportunity.asset).toBe("EURC");
    expect(opportunity.apy).toBe(0.041);
    expect(opportunity.exposureCategory).toBe("lending");
  });
});
