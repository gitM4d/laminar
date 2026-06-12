import type { ProtocolRiskLevel } from "../opportunity/types.js";
import type {
  AuditorTier,
  ProtocolAudit,
  SecurityIncident,
} from "../trust/types.js";

export type ProtocolMetadataChain = "Base";

export type ProtocolMetadataAuditTier = "tier1" | "tier2" | "tier3" | "none";

export type ProtocolMetadata = {
  protocolId: string;
  protocolName: string;
  chain: ProtocolMetadataChain;
  ageYears: number;
  /** Curated fallback TVL when real provider markets do not supply TVL. */
  tvlUsd: number;
  auditTier: ProtocolMetadataAuditTier;
  auditCount: number;
  audits: readonly ProtocolAudit[];
  historicalIncidents: readonly SecurityIncident[];
  chainAdjustment: number;
  protocolRiskLevel?: ProtocolRiskLevel;
  notes?: readonly string[];
  officialWebsite?: string;
  docsUrl?: string;
};

export function deriveAuditTierFromAudits(
  audits: readonly { tier: AuditorTier }[],
): ProtocolMetadataAuditTier {
  if (audits.length === 0) {
    return "none";
  }

  const bestTier = Math.min(...audits.map((audit) => audit.tier));

  if (bestTier === 1) {
    return "tier1";
  }

  if (bestTier === 2) {
    return "tier2";
  }

  return "tier3";
}
