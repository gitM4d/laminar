import { describe, expect, it } from "vitest";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import { calculateTrustScore } from "./calculateTrustScore.js";
import { MOCK_PROTOCOL_TRUST_PROFILES } from "./mockProtocolTrustProfiles.js";
import {
  scoreOpportunitiesTrust,
  scoreOpportunityTrust,
  UnknownProtocolTrustProfileError,
} from "./scoreOpportunityTrust.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("scoreOpportunityTrust", () => {
  it("scores mock opportunities using protocol trust profiles", () => {
    const morpho = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );

    expect(morpho).toBeDefined();

    const scored = scoreOpportunityTrust(morpho as NonNullable<typeof morpho>, {
      asOf,
    });

    expect(scored.opportunityId).toBe("morpho-usdc-base");
    expect(scored.trust.protocolId).toBe("morpho");
    expect(scored.trust.trustScore).toBeGreaterThan(75);
  });

  it("scores all discovered opportunities deterministically", () => {
    const scored = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });

    expect(scored).toHaveLength(MOCK_OPPORTUNITIES.length);

    for (const entry of scored) {
      const expected = calculateTrustScore(
        MOCK_PROTOCOL_TRUST_PROFILES[entry.protocolId] as NonNullable<
          (typeof MOCK_PROTOCOL_TRUST_PROFILES)[string]
        >,
        asOf,
      );

      expect(entry.trust.trustScore).toBe(expected.trustScore);
    }
  });

  it("ranks known mock protocols by trust score", () => {
    const scored = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
    const byProtocol = Object.fromEntries(
      scored.map((entry) => [entry.protocolId, entry.trust.trustScore]),
    ) as Record<string, number>;

    expect(byProtocol.aave).toBeGreaterThanOrEqual(byProtocol.moonwell);
    expect(byProtocol.morpho).toBeGreaterThan(byProtocol["experimental-lend"]);
    expect(byProtocol["experimental-lend"]).toBeLessThan(65);
  });

  it("throws when a protocol trust profile is missing", () => {
    expect(() =>
      scoreOpportunityTrust({
        id: "unknown",
        protocolId: "missing-protocol",
        protocolName: "Missing",
        asset: "USDC",
        chain: "Base",
        apy: 0.05,
        isExperimental: false,
        protocolRiskLevel: "low",
        auditCount: 0,
        exposureCategory: "lending",
      }),
    ).toThrow(UnknownProtocolTrustProfileError);
  });
});
