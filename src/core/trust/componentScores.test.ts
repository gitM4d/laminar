import { describe, expect, it } from "vitest";
import {
  calculateAuditScore,
  calculateDecayedIncidentPenalties,
  calculateProtocolAgeScore,
  calculateSecurityIncidentsScore,
  calculateTvlScore,
} from "./componentScores.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("componentScores", () => {
  it("applies incident penalties with severity-dependent decay", () => {
    const penalties = calculateDecayedIncidentPenalties(
      [
        {
          severity: "minor",
          occurredAt: "2025-06-01",
          description: "Minor issue",
        },
        {
          severity: "catastrophic",
          occurredAt: "2010-06-01",
          description: "Historic catastrophic issue",
        },
      ],
      asOf,
    );

    expect(penalties[0]?.decayedPenalty).toBeGreaterThan(0);
    expect(penalties[1]?.decayedPenalty).toBe(0);
  });

  it("reduces security incidents score as penalties increase", () => {
    const cleanScore = calculateSecurityIncidentsScore([], asOf);
    const penalizedScore = calculateSecurityIncidentsScore(
      [
        {
          severity: "major",
          occurredAt: "2026-01-01",
          description: "Recent major incident",
        },
      ],
      asOf,
    );

    expect(cleanScore).toBe(100);
    expect(penalizedScore).toBeLessThan(cleanScore);
  });

  it("scores tier-1 audits higher than tier-3 audits", () => {
    const tierOneScore = calculateAuditScore([
      {
        auditor: "OpenZeppelin",
        tier: 1,
        completedAt: "2024-01-01",
      },
    ]);
    const tierThreeScore = calculateAuditScore([
      {
        auditor: "Emerging Audit Shop",
        tier: 3,
        completedAt: "2024-01-01",
      },
    ]);

    expect(tierOneScore).toBeGreaterThan(tierThreeScore);
  });

  it("applies diminishing returns for repeated audits in the same tier", () => {
    const singleAudit = calculateAuditScore([
      {
        auditor: "OpenZeppelin",
        tier: 1,
        completedAt: "2024-01-01",
      },
    ]);
    const multipleAudits = calculateAuditScore([
      {
        auditor: "OpenZeppelin",
        tier: 1,
        completedAt: "2024-01-01",
      },
      {
        auditor: "Trail of Bits",
        tier: 1,
        completedAt: "2023-01-01",
      },
      {
        auditor: "Spearbit",
        tier: 1,
        completedAt: "2022-01-01",
      },
      {
        auditor: "Halborn",
        tier: 1,
        completedAt: "2021-01-01",
      },
      {
        auditor: "Certora",
        tier: 1,
        completedAt: "2020-01-01",
      },
    ]);

    const twoAudits = calculateAuditScore([
      {
        auditor: "OpenZeppelin",
        tier: 1,
        completedAt: "2024-01-01",
      },
      {
        auditor: "Trail of Bits",
        tier: 1,
        completedAt: "2023-01-01",
      },
    ]);

    expect(multipleAudits).toBeGreaterThan(singleAudit);
    expect(twoAudits - singleAudit).toBeLessThan(singleAudit);
  });

  it("scores protocol age using the capped Lindy curve", () => {
    expect(calculateProtocolAgeScore(0.25)).toBe(30);
    expect(calculateProtocolAgeScore(0.75)).toBe(55);
    expect(calculateProtocolAgeScore(1.5)).toBe(75);
    expect(calculateProtocolAgeScore(3)).toBe(90);
    expect(calculateProtocolAgeScore(6)).toBe(100);
  });

  it("scores TVL as a secondary confidence signal", () => {
    expect(calculateTvlScore(1_000_000)).toBe(50);
    expect(calculateTvlScore(50_000_000)).toBe(70);
    expect(calculateTvlScore(500_000_000)).toBe(85);
    expect(calculateTvlScore(2_000_000_000)).toBe(100);
  });
});
