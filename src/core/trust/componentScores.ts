import {
  AUDIT_SCORE_CAP,
  AUDIT_TIER_POINTS,
  INCIDENT_BASE_PENALTIES,
  INCIDENT_RECOVERY_YEARS,
  PROTOCOL_AGE_SCORES,
  PROTOCOL_AGE_THRESHOLDS_YEARS,
  SECURITY_COMPONENT_BASE_SCORE,
  TRUST_DECAY_MODEL,
  TVL_SCORES,
  TVL_THRESHOLDS_USD,
} from "./trustConfig.js";
import type {
  AuditorTier,
  IncidentSeverity,
  ProtocolAudit,
  ProtocolTrustProfile,
  SecurityIncident,
  TrustComponentScores,
} from "./types.js";

export type DecayedIncidentPenalty = {
  severity: IncidentSeverity;
  basePenalty: number;
  decayedPenalty: number;
  occurredAt: string;
  description: string;
};

function yearsBetween(startIso: string, asOf: Date): number {
  const start = new Date(startIso);
  const milliseconds = asOf.getTime() - start.getTime();
  return Math.max(0, milliseconds / (1000 * 60 * 60 * 24 * 365.25));
}

function applyIncidentDecay(
  basePenalty: number,
  yearsSince: number,
  recoveryYears: number,
): number {
  if (TRUST_DECAY_MODEL === "linear") {
    const decayFactor = Math.max(0, 1 - yearsSince / recoveryYears);
    return basePenalty * decayFactor;
  }

  return basePenalty;
}

export function calculateDecayedIncidentPenalties(
  incidents: readonly SecurityIncident[],
  asOf: Date,
): DecayedIncidentPenalty[] {
  return incidents.map((incident) => {
    const basePenalty = INCIDENT_BASE_PENALTIES[incident.severity];
    const yearsSince = yearsBetween(incident.occurredAt, asOf);
    const recoveryYears = INCIDENT_RECOVERY_YEARS[incident.severity];
    const decayedPenalty = applyIncidentDecay(
      basePenalty,
      yearsSince,
      recoveryYears,
    );

    return {
      severity: incident.severity,
      basePenalty,
      decayedPenalty,
      occurredAt: incident.occurredAt,
      description: incident.description,
    };
  });
}

export function calculateSecurityIncidentsScore(
  incidents: readonly SecurityIncident[],
  asOf: Date,
): number {
  const penalties = calculateDecayedIncidentPenalties(incidents, asOf);
  const totalPenalty = penalties.reduce(
    (sum, penalty) => sum + penalty.decayedPenalty,
    0,
  );

  return Math.max(0, SECURITY_COMPONENT_BASE_SCORE - totalPenalty);
}

function auditTierRank(tier: AuditorTier): number {
  return tier;
}

export function calculateAuditScore(audits: readonly ProtocolAudit[]): number {
  const sortedAudits = [...audits].sort((left, right) => {
    const tierDifference = auditTierRank(left.tier) - auditTierRank(right.tier);
    if (tierDifference !== 0) {
      return tierDifference;
    }

    return (
      new Date(right.completedAt).getTime() -
      new Date(left.completedAt).getTime()
    );
  });

  const tierCounts: Record<AuditorTier, number> = { 1: 0, 2: 0, 3: 0 };
  let score = 0;

  for (const audit of sortedAudits) {
    const tierPoints = AUDIT_TIER_POINTS[audit.tier];
    const index = tierCounts[audit.tier];
    const points = tierPoints[Math.min(index, tierPoints.length - 1)] ?? 0;

    score += points;
    tierCounts[audit.tier] += 1;
  }

  return Math.min(AUDIT_SCORE_CAP, score);
}

export function calculateProtocolAgeScore(protocolAgeYears: number): number {
  for (
    let index = 0;
    index < PROTOCOL_AGE_THRESHOLDS_YEARS.length;
    index += 1
  ) {
    const threshold = PROTOCOL_AGE_THRESHOLDS_YEARS[index];
    const score = PROTOCOL_AGE_SCORES[index];

    if (
      threshold !== undefined &&
      score !== undefined &&
      protocolAgeYears < threshold
    ) {
      return score;
    }
  }

  return PROTOCOL_AGE_SCORES[PROTOCOL_AGE_SCORES.length - 1] as number;
}

export function calculateTvlScore(tvlUsd: number): number {
  for (let index = 0; index < TVL_THRESHOLDS_USD.length; index += 1) {
    const threshold = TVL_THRESHOLDS_USD[index];
    const score = TVL_SCORES[index];

    if (threshold !== undefined && score !== undefined && tvlUsd < threshold) {
      return score;
    }
  }

  return TVL_SCORES[TVL_SCORES.length - 1] as number;
}

export function calculateComponentScores(
  profile: ProtocolTrustProfile,
  asOf: Date,
): TrustComponentScores {
  return {
    securityIncidents: calculateSecurityIncidentsScore(profile.incidents, asOf),
    audits: calculateAuditScore(profile.audits),
    protocolAge: calculateProtocolAgeScore(profile.protocolAgeYears),
    tvl: calculateTvlScore(profile.tvlUsd),
  };
}
