export type IncidentSeverity =
  | "minor"
  | "moderate"
  | "major"
  | "critical"
  | "catastrophic";

export type AuditorTier = 1 | 2 | 3;

export type ProtocolAudit = {
  auditor: string;
  tier: AuditorTier;
  completedAt: string;
};

export type SecurityIncident = {
  severity: IncidentSeverity;
  occurredAt: string;
  description: string;
};

export type ProtocolTrustTvlSource =
  | "real-provider-markets"
  | "curated-fallback";

export type ProtocolTrustMetadataSource = "protocol-registry";

export type ProtocolTrustProfile = {
  protocolId: string;
  protocolName: string;
  protocolAgeYears: number;
  tvlUsd: number;
  /** Indicates whether TVL input came from real provider markets or curated fallback. */
  tvlSource?: ProtocolTrustTvlSource;
  /** Indicates curated trust facts were sourced from the protocol metadata registry. */
  metadataSource?: ProtocolTrustMetadataSource;
  audits: readonly ProtocolAudit[];
  incidents: readonly SecurityIncident[];
  chainAdjustment: number;
};

export type TrustComponentScores = {
  securityIncidents: number;
  audits: number;
  protocolAge: number;
  tvl: number;
};

export type TrustScoreBreakdown = {
  componentScores: TrustComponentScores;
  weightedContributions: {
    securityIncidents: number;
    audits: number;
    protocolAge: number;
    tvl: number;
  };
  incidentPenalties: readonly {
    severity: IncidentSeverity;
    basePenalty: number;
    decayedPenalty: number;
    occurredAt: string;
    description: string;
  }[];
  chainAdjustment: number;
  protocolTrustScore: number;
};

export type TrustScoreResult = {
  protocolId: string;
  protocolName: string;
  trustScore: number;
  breakdown: TrustScoreBreakdown;
  explanations: readonly string[];
};

export type ScoredOpportunityTrust = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  trust: TrustScoreResult;
};
