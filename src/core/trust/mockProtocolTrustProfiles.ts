import type { ProtocolTrustProfile } from "./types.js";

export const MOCK_PROTOCOL_TRUST_PROFILES: Record<
  string,
  ProtocolTrustProfile
> = {
  aave: {
    protocolId: "aave",
    protocolName: "Aave",
    protocolAgeYears: 5.5,
    tvlUsd: 12_500_000_000,
    audits: [
      {
        auditor: "OpenZeppelin",
        tier: 1,
        completedAt: "2021-03-15",
      },
      {
        auditor: "Trail of Bits",
        tier: 1,
        completedAt: "2023-08-01",
      },
    ],
    incidents: [
      {
        severity: "minor",
        occurredAt: "2024-02-10",
        description: "Vulnerability discovered before exploitation",
      },
    ],
    chainAdjustment: 0,
  },
  morpho: {
    protocolId: "morpho",
    protocolName: "Morpho",
    protocolAgeYears: 3.2,
    tvlUsd: 2_100_000_000,
    audits: [
      {
        auditor: "Spearbit",
        tier: 1,
        completedAt: "2023-05-20",
      },
      {
        auditor: "Halborn",
        tier: 1,
        completedAt: "2024-01-12",
      },
    ],
    incidents: [],
    chainAdjustment: 0,
  },
  moonwell: {
    protocolId: "moonwell",
    protocolName: "Moonwell",
    protocolAgeYears: 2.1,
    tvlUsd: 180_000_000,
    audits: [
      {
        auditor: "Certora",
        tier: 1,
        completedAt: "2023-11-05",
      },
      {
        auditor: "Independent Security Firm",
        tier: 2,
        completedAt: "2024-06-18",
      },
    ],
    incidents: [
      {
        severity: "moderate",
        occurredAt: "2023-09-01",
        description: "Temporary operational impact with limited user exposure",
      },
    ],
    chainAdjustment: 0,
  },
  "experimental-lend": {
    protocolId: "experimental-lend",
    protocolName: "Experimental Lend",
    protocolAgeYears: 0.4,
    tvlUsd: 8_500_000,
    audits: [
      {
        auditor: "Emerging Audit Shop",
        tier: 3,
        completedAt: "2025-12-01",
      },
    ],
    incidents: [
      {
        severity: "major",
        occurredAt: "2026-01-15",
        description: "Meaningful financial impact during early deployment",
      },
    ],
    chainAdjustment: 0,
  },
};
