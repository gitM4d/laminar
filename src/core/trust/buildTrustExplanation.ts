import { calculateTrustScore } from "./calculateTrustScore.js";
import type { AuditorTier, ProtocolTrustProfile, ProtocolTrustTvlSource } from "./types.js";

export type TrustExplanationAuditTier = "tier1" | "tier2" | "tier3" | "none";

export type TrustExplanationTvlBucket =
  | "veryLow"
  | "low"
  | "medium"
  | "high";

export type TrustExplanationComponents = {
  age: number;
  audits: number;
  incidents: number;
  tvl: number;
  chainAdjustment: number;
};

export type TrustExplanation = {
  protocolAgeYears: number;
  auditCount: number;
  auditTier: TrustExplanationAuditTier;
  historicalIncidents: number;
  tvlUsd: number;
  tvlBucket: TrustExplanationTvlBucket;
  tvlSource?: ProtocolTrustTvlSource;
  components: TrustExplanationComponents;
};

export type ProtocolTrustExplanation = {
  protocolId: string;
  protocolName: string;
  trustScore: number;
  trustExplanation: TrustExplanation;
  summary: string;
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatAuditTier(tier: AuditorTier): TrustExplanationAuditTier {
  return `tier${tier}` as TrustExplanationAuditTier;
}

function getBestAuditTier(profile: ProtocolTrustProfile): TrustExplanationAuditTier {
  if (profile.audits.length === 0) {
    return "none";
  }

  const bestTier = profile.audits.reduce<AuditorTier>(
    (best, audit) => (audit.tier < best ? audit.tier : best),
    profile.audits[0]?.tier ?? 3,
  );

  return formatAuditTier(bestTier);
}

function getTvlBucket(tvlUsd: number): TrustExplanationTvlBucket {
  if (tvlUsd >= 1_000_000_000) {
    return "high";
  }
  if (tvlUsd >= 10_000_000) {
    return "medium";
  }
  if (tvlUsd >= 1_000_000) {
    return "low";
  }
  return "veryLow";
}

function formatAgeSummary(protocolAgeYears: number): string {
  if (protocolAgeYears >= 5) {
    return "5+ years";
  }
  if (protocolAgeYears >= 4) {
    return "4+ years";
  }
  if (protocolAgeYears >= 3) {
    return "3+ years";
  }
  return `${protocolAgeYears.toFixed(1)} years`;
}

function formatAuditSummary(
  tier: TrustExplanationAuditTier,
  auditCount: number,
): string {
  if (auditCount === 0 || tier === "none") {
    return "no audits";
  }

  return `${tier.replace("tier", "tier-")} audits`;
}

function formatIncidentSummary(historicalIncidents: number): string {
  return historicalIncidents === 0
    ? "no incidents"
    : `${historicalIncidents.toString()} historical incident${historicalIncidents === 1 ? "" : "s"}`;
}

function formatTvlSummary(bucket: TrustExplanationTvlBucket): string {
  switch (bucket) {
    case "high":
      return "high TVL";
    case "medium":
      return "medium TVL";
    case "low":
      return "lower TVL";
    case "veryLow":
      return "very low TVL";
  }
}

export function buildTrustExplanation(
  profile: ProtocolTrustProfile,
  asOf: Date = new Date(),
): ProtocolTrustExplanation {
  const trust = calculateTrustScore(profile, asOf);
  const auditTier = getBestAuditTier(profile);
  const tvlBucket = getTvlBucket(profile.tvlUsd);

  const components: TrustExplanationComponents = {
    age: trust.breakdown.weightedContributions.protocolAge,
    audits: trust.breakdown.weightedContributions.audits,
    incidents: trust.breakdown.weightedContributions.securityIncidents,
    tvl: trust.breakdown.weightedContributions.tvl,
    chainAdjustment: trust.breakdown.chainAdjustment,
  };

  const explanation: TrustExplanation = {
    protocolAgeYears: profile.protocolAgeYears,
    auditCount: profile.audits.length,
    auditTier,
    historicalIncidents: profile.incidents.length,
    tvlUsd: profile.tvlUsd,
    tvlBucket,
    ...(profile.tvlSource !== undefined ? { tvlSource: profile.tvlSource } : {}),
    components,
  };

  return {
    protocolId: profile.protocolId,
    protocolName: profile.protocolName,
    trustScore: trust.trustScore,
    trustExplanation: explanation,
    summary: [
      formatAgeSummary(profile.protocolAgeYears),
      formatAuditSummary(auditTier, profile.audits.length),
      formatIncidentSummary(profile.incidents.length),
      formatTvlSummary(tvlBucket),
    ].join(", "),
  };
}

export function sumTrustExplanationComponents(
  explanation: TrustExplanation,
): number {
  return roundScore(
    explanation.components.age +
      explanation.components.audits +
      explanation.components.incidents +
      explanation.components.tvl +
      explanation.components.chainAdjustment,
  );
}
