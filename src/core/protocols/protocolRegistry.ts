import { AAVE_BASE_CONFIG } from "../../adapters/aave/aaveBaseConfig.js";
import { FLUID_BASE_CONFIG } from "../../adapters/fluid/fluidBaseConfig.js";
import { MORPHO_BASE_CONFIG } from "../../adapters/morpho/morphoBaseConfig.js";
import { MOONWELL_BASE_CONFIG } from "../../adapters/moonwell/moonwellBaseConfig.js";
import { RecommendationDataConsistencyError } from "../recommendation/generatePortfolioRecommendation.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type { ProtocolMetadata } from "./types.js";

const PROTOCOL_METADATA_REGISTRY: Record<string, ProtocolMetadata> = {
  [AAVE_BASE_CONFIG.protocolId]: {
    protocolId: AAVE_BASE_CONFIG.protocolId,
    protocolName: AAVE_BASE_CONFIG.protocolName,
    chain: "Base",
    ageYears: 5.5,
    tvlUsd: 12_500_000_000,
    auditTier: "tier1",
    auditCount: 2,
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
    historicalIncidents: [],
    chainAdjustment: 0,
    protocolRiskLevel: "low",
  },
  [MORPHO_BASE_CONFIG.protocolId]: {
    protocolId: MORPHO_BASE_CONFIG.protocolId,
    protocolName: MORPHO_BASE_CONFIG.protocolName,
    chain: "Base",
    ageYears: 3,
    tvlUsd: 2_500_000_000,
    auditTier: "tier1",
    auditCount: 2,
    audits: [
      {
        auditor: "Spearbit",
        tier: 1,
        completedAt: "2023-11-01",
      },
      {
        auditor: "ChainSecurity",
        tier: 1,
        completedAt: "2024-02-15",
      },
    ],
    historicalIncidents: [],
    chainAdjustment: 0,
    protocolRiskLevel: "medium",
  },
  [FLUID_BASE_CONFIG.protocolId]: {
    protocolId: FLUID_BASE_CONFIG.protocolId,
    protocolName: FLUID_BASE_CONFIG.protocolName,
    chain: "Base",
    ageYears: 2,
    tvlUsd: 12_000_000,
    auditTier: "tier1",
    auditCount: 2,
    audits: [
      {
        auditor: "ChainSecurity",
        tier: 1,
        completedAt: "2024-06-01",
      },
      {
        auditor: "Spearbit",
        tier: 1,
        completedAt: "2024-09-01",
      },
    ],
    historicalIncidents: [],
    chainAdjustment: 0,
    protocolRiskLevel: "medium",
  },
  [MOONWELL_BASE_CONFIG.protocolId]: {
    protocolId: MOONWELL_BASE_CONFIG.protocolId,
    protocolName: MOONWELL_BASE_CONFIG.protocolName,
    chain: "Base",
    ageYears: 4,
    tvlUsd: 60_000_000,
    auditTier: "tier2",
    auditCount: 3,
    audits: [
      {
        auditor: "Halborn",
        tier: 2,
        completedAt: "2022-09-01",
      },
      {
        auditor: "Halborn",
        tier: 2,
        completedAt: "2023-08-01",
      },
      {
        auditor: "Code4rena",
        tier: 2,
        completedAt: "2023-11-01",
      },
    ],
    historicalIncidents: [],
    chainAdjustment: 0,
    protocolRiskLevel: "medium",
    notes: [
      "Moonwell has operated since 2021–2022 and launched on Base in 2023.",
      "Trust TVL is approximate current Moonwell total TVL (order of magnitude).",
      "No unverified incidents are modeled for V1 stablecoin lending markets.",
    ],
  },
};

export function listProtocolMetadata(): ProtocolMetadata[] {
  return Object.values(PROTOCOL_METADATA_REGISTRY);
}

export function tryGetProtocolMetadata(
  protocolId: string,
): ProtocolMetadata | undefined {
  return PROTOCOL_METADATA_REGISTRY[protocolId];
}

export function getProtocolMetadata(protocolId: string): ProtocolMetadata {
  const metadata = tryGetProtocolMetadata(protocolId);

  if (metadata === undefined) {
    throw new RecommendationDataConsistencyError(
      `Unknown protocol metadata for protocolId "${protocolId}"`,
    );
  }

  return metadata;
}

export function buildCuratedProtocolTrustProfile(
  protocolId: string,
): ProtocolTrustProfile {
  const metadata = getProtocolMetadata(protocolId);

  return {
    protocolId: metadata.protocolId,
    protocolName: metadata.protocolName,
    protocolAgeYears: metadata.ageYears,
    tvlUsd: metadata.tvlUsd,
    audits: metadata.audits,
    incidents: metadata.historicalIncidents,
    chainAdjustment: metadata.chainAdjustment,
    metadataSource: "protocol-registry",
  };
}
