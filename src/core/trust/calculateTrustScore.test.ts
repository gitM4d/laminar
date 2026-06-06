import { describe, expect, it } from "vitest";
import { calculateTrustScore } from "./calculateTrustScore.js";
import { TRUST_COMPONENT_WEIGHTS } from "./trustConfig.js";
import type { ProtocolTrustProfile } from "./types.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const pristineProfile: ProtocolTrustProfile = {
  protocolId: "pristine",
  protocolName: "Pristine Protocol",
  protocolAgeYears: 5,
  tvlUsd: 2_000_000_000,
  audits: [
    {
      auditor: "OpenZeppelin",
      tier: 1,
      completedAt: "2022-01-01",
    },
    {
      auditor: "Trail of Bits",
      tier: 1,
      completedAt: "2023-01-01",
    },
  ],
  incidents: [],
  chainAdjustment: 0,
};

describe("calculateTrustScore", () => {
  it("returns a high trust score for a strong protocol profile", () => {
    const result = calculateTrustScore(pristineProfile, asOf);

    expect(result.trustScore).toBeGreaterThanOrEqual(80);
    expect(result.breakdown.componentScores.securityIncidents).toBe(100);
    expect(result.explanations.length).toBeGreaterThan(0);
  });

  it("returns a low trust score for a weak protocol profile", () => {
    const result = calculateTrustScore(
      {
        protocolId: "weak",
        protocolName: "Weak Protocol",
        protocolAgeYears: 0.3,
        tvlUsd: 2_000_000,
        audits: [
          {
            auditor: "Emerging Audit Shop",
            tier: 3,
            completedAt: "2026-01-01",
          },
        ],
        incidents: [
          {
            severity: "critical",
            occurredAt: "2026-03-01",
            description: "Critical incident",
          },
        ],
        chainAdjustment: 0,
      },
      asOf,
    );

    expect(result.trustScore).toBeLessThan(65);
    expect(result.breakdown.incidentPenalties[0]?.severity).toBe("critical");
  });

  it("clamps trust scores between 0 and 100", () => {
    const catastrophic = calculateTrustScore(
      {
        protocolId: "broken",
        protocolName: "Broken Protocol",
        protocolAgeYears: 0.2,
        tvlUsd: 100_000,
        audits: [],
        incidents: [
          {
            severity: "catastrophic",
            occurredAt: "2026-05-01",
            description: "Collapse",
          },
        ],
        chainAdjustment: 0,
      },
      asOf,
    );

    expect(catastrophic.trustScore).toBeGreaterThanOrEqual(0);
    expect(catastrophic.trustScore).toBeLessThanOrEqual(100);
  });

  it("applies chain adjustment after protocol trust score", () => {
    const baseline = calculateTrustScore(pristineProfile, asOf);
    const adjusted = calculateTrustScore(
      {
        ...pristineProfile,
        chainAdjustment: 2,
      },
      asOf,
    );

    expect(adjusted.trustScore).toBe(baseline.trustScore + 2);
    expect(adjusted.breakdown.chainAdjustment).toBe(2);
  });

  it("exposes a breakdown with weighted contributions for all components", () => {
    const result = calculateTrustScore(pristineProfile, asOf);
    const { weightedContributions } = result.breakdown;

    expect(weightedContributions.securityIncidents).toBeGreaterThan(0);
    expect(weightedContributions.audits).toBeGreaterThan(0);
    expect(weightedContributions.protocolAge).toBeGreaterThan(0);
    expect(weightedContributions.tvl).toBeGreaterThan(0);

    const recomposed =
      weightedContributions.securityIncidents +
      weightedContributions.audits +
      weightedContributions.protocolAge +
      weightedContributions.tvl;

    expect(recomposed).toBe(result.breakdown.protocolTrustScore);
  });

  it("uses registry component weights", () => {
    expect(TRUST_COMPONENT_WEIGHTS.securityIncidents).toBe(0.35);
    expect(TRUST_COMPONENT_WEIGHTS.audits).toBe(0.3);
    expect(TRUST_COMPONENT_WEIGHTS.protocolAge).toBe(0.15);
    expect(TRUST_COMPONENT_WEIGHTS.tvl).toBe(0.1);
  });
});
