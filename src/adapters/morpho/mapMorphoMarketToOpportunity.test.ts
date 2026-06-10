import { describe, expect, it } from "vitest";
import { mapMorphoMarketToOpportunity } from "./mapMorphoMarketToOpportunity.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

const baseMarket: ReadOnlyMarketOpportunity = {
  id: "morpho-usdc-base",
  protocolId: "morpho",
  protocolName: "Morpho",
  chain: "Base",
  asset: "USDC",
  apy: 0.0612,
  tvlUsd: 95_000_000,
  exposureCategory: "lending",
  source: "morpho-api",
  fetchedAt: "2026-06-01T00:00:00.000Z",
};

describe("mapMorphoMarketToOpportunity", () => {
  it("produces a valid Laminar Opportunity", () => {
    const opportunity = mapMorphoMarketToOpportunity(baseMarket);

    expect(opportunity).toEqual({
      id: "morpho-usdc-base",
      protocolId: "morpho",
      protocolName: "Morpho",
      asset: "USDC",
      chain: "Base",
      apy: 0.0612,
      isExperimental: false,
      protocolRiskLevel: "medium",
      auditCount: 2,
      exposureCategory: "lending",
    });
  });

  it("carries adapter-provided APY and asset through", () => {
    const opportunity = mapMorphoMarketToOpportunity({
      ...baseMarket,
      id: "morpho-eurc-base",
      asset: "EURC",
      apy: 0.041,
      source: "static-fallback",
    });

    expect(opportunity.id).toBe("morpho-eurc-base");
    expect(opportunity.asset).toBe("EURC");
    expect(opportunity.apy).toBe(0.041);
    expect(opportunity.exposureCategory).toBe("lending");
    expect(opportunity.isExperimental).toBe(false);
  });
});
