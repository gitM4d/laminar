import { describe, expect, it } from "vitest";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import { calculateLiquidityScore } from "./calculateLiquidityScore.js";
import { MOCK_OPPORTUNITY_LIQUIDITY_PROFILES } from "./mockOpportunityLiquidityProfiles.js";
import {
  scoreOpportunitiesLiquidity,
  scoreOpportunityLiquidity,
  UnknownOpportunityLiquidityProfileError,
} from "./scoreOpportunityLiquidity.js";

describe("scoreOpportunityLiquidity", () => {
  it("scores mock opportunities using liquidity profiles", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const scored = scoreOpportunityLiquidity(
      morpho as NonNullable<typeof morpho>,
    );

    expect(scored.liquidity.liquidityScore).toBe(100);
    expect(scored.asset).toBe("USDC");
  });

  it("scores all discovered opportunities deterministically", () => {
    const scored = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);

    expect(scored).toHaveLength(MOCK_OPPORTUNITIES.length);

    for (const entry of scored) {
      const expected = calculateLiquidityScore(
        MOCK_OPPORTUNITY_LIQUIDITY_PROFILES[entry.opportunityId] as NonNullable<
          (typeof MOCK_OPPORTUNITY_LIQUIDITY_PROFILES)[string]
        >,
      );

      expect(entry.liquidity.liquidityScore).toBe(expected.liquidityScore);
    }
  });

  it("ranks mock opportunities by liquidity accessibility", () => {
    const scored = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
    const byOpportunity = Object.fromEntries(
      scored.map((entry) => [entry.opportunityId, entry.liquidity.liquidityScore]),
    ) as Record<string, number>;

    expect(byOpportunity["morpho-usdc-base"]).toBeGreaterThan(
      byOpportunity["moonwell-dai-base"],
    );
    expect(byOpportunity["aave-usdc-base"]).toBeGreaterThan(
      byOpportunity["experimental-usdc-base"],
    );
    expect(byOpportunity["experimental-usdc-base"]).toBeLessThan(65);
  });

  it("throws when a liquidity profile is missing", () => {
    expect(() =>
      scoreOpportunityLiquidity({
        id: "missing",
        protocolId: "missing",
        protocolName: "Missing",
        asset: "USDC",
        chain: "Base",
        apy: 0.05,
        isExperimental: false,
        protocolRiskLevel: "low",
        auditCount: 0,
      }),
    ).toThrow(UnknownOpportunityLiquidityProfileError);
  });
});
