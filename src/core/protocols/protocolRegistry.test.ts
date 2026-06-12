import { describe, expect, it } from "vitest";
import { RecommendationDataConsistencyError } from "../recommendation/generatePortfolioRecommendation.js";
import { calculateTrustScore } from "../trust/calculateTrustScore.js";
import {
  buildCuratedProtocolTrustProfile,
  getProtocolMetadata,
  listProtocolMetadata,
  tryGetProtocolMetadata,
} from "./protocolRegistry.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("protocolRegistry", () => {
  it("listProtocolMetadata includes aave, morpho, fluid, moonwell", () => {
    const protocolIds = listProtocolMetadata()
      .map((entry) => entry.protocolId)
      .sort();

    expect(protocolIds).toEqual(["aave", "fluid", "moonwell", "morpho"]);
  });

  it("getProtocolMetadata returns expected metadata for aave", () => {
    const metadata = getProtocolMetadata("aave");

    expect(metadata.protocolName).toBe("Aave");
    expect(metadata.chain).toBe("Base");
    expect(metadata.ageYears).toBe(5.5);
    expect(metadata.auditTier).toBe("tier1");
    expect(metadata.auditCount).toBe(2);
    expect(metadata.tvlUsd).toBe(12_500_000_000);
    expect(metadata.chainAdjustment).toBe(0);
    expect(metadata.protocolRiskLevel).toBe("low");
  });

  it("tryGetProtocolMetadata returns undefined for unknown protocols", () => {
    expect(tryGetProtocolMetadata("unknown-protocol")).toBeUndefined();
  });

  it("getProtocolMetadata throws for unknown protocols", () => {
    expect(() => getProtocolMetadata("unknown-protocol")).toThrow(
      RecommendationDataConsistencyError,
    );
  });

  it("buildCuratedProtocolTrustProfile builds a valid ProtocolTrustProfile", () => {
    const profile = buildCuratedProtocolTrustProfile("moonwell");
    const metadata = getProtocolMetadata("moonwell");

    expect(profile.protocolId).toBe("moonwell");
    expect(profile.protocolName).toBe("Moonwell");
    expect(profile.protocolAgeYears).toBe(metadata.ageYears);
    expect(profile.tvlUsd).toBe(metadata.tvlUsd);
    expect(profile.audits).toEqual(metadata.audits);
    expect(profile.incidents).toEqual(metadata.historicalIncidents);
    expect(profile.chainAdjustment).toBe(metadata.chainAdjustment);
    expect(profile.metadataSource).toBe("protocol-registry");
    expect(profile.tvlSource).toBeUndefined();

    const trust = calculateTrustScore(profile, asOf);
    expect(trust.trustScore).toBeGreaterThan(0);
    expect(trust.trustScore).toBeLessThan(100);
  });
});
