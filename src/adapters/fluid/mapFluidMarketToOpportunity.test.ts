import { describe, expect, it } from "vitest";
import { mapFluidMarketToOpportunity } from "./mapFluidMarketToOpportunity.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

const baseMarket: ReadOnlyMarketOpportunity = {
  id: "fluid-usdc-base",
  protocolId: "fluid",
  protocolName: "Fluid",
  chain: "Base",
  asset: "USDC",
  apy: 0.0465,
  tvlUsd: 9_311_428,
  exposureCategory: "lending",
  source: "fluid-api",
  fetchedAt: "2026-06-01T00:00:00.000Z",
  metadata: {
    reserveDiscovery: "api",
    reserveAddress: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169",
    apySource: "fluid-api",
    apyIsApproximation: false,
    tvlSource: "fluid-api",
  },
};

describe("mapFluidMarketToOpportunity", () => {
  it("produces a valid Laminar Opportunity from a real Fluid market fixture", () => {
    const opportunity = mapFluidMarketToOpportunity(baseMarket);

    expect(opportunity).toEqual({
      id: "fluid-usdc-base",
      protocolId: "fluid",
      protocolName: "Fluid",
      asset: "USDC",
      chain: "Base",
      apy: 0.0465,
      isExperimental: false,
      protocolRiskLevel: "medium",
      auditCount: 2,
      exposureCategory: "lending",
    });
  });

  it("carries adapter-provided APY and asset through", () => {
    const opportunity = mapFluidMarketToOpportunity({
      ...baseMarket,
      id: "fluid-eurc-base",
      asset: "EURC",
      apy: 0.0225,
    });

    expect(opportunity.id).toBe("fluid-eurc-base");
    expect(opportunity.asset).toBe("EURC");
    expect(opportunity.apy).toBe(0.0225);
  });
});
