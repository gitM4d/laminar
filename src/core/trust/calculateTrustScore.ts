import {
  calculateComponentScores,
  calculateDecayedIncidentPenalties,
} from "./componentScores.js";
import {
  TRUST_COMPONENT_WEIGHTS,
  TRUST_COMPONENT_WEIGHT_SUM,
  TRUST_SCORE_MAX,
  TRUST_SCORE_MIN,
} from "./trustConfig.js";
import type {
  ProtocolTrustProfile,
  TrustScoreBreakdown,
  TrustScoreResult,
} from "./types.js";

function clampTrustScore(score: number): number {
  return Math.min(TRUST_SCORE_MAX, Math.max(TRUST_SCORE_MIN, score));
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}

function buildWeightedContributions(
  componentScores: ReturnType<typeof calculateComponentScores>,
): TrustScoreBreakdown["weightedContributions"] {
  return {
    securityIncidents:
      (componentScores.securityIncidents *
        TRUST_COMPONENT_WEIGHTS.securityIncidents) /
      TRUST_COMPONENT_WEIGHT_SUM,
    audits:
      (componentScores.audits * TRUST_COMPONENT_WEIGHTS.audits) /
      TRUST_COMPONENT_WEIGHT_SUM,
    protocolAge:
      (componentScores.protocolAge * TRUST_COMPONENT_WEIGHTS.protocolAge) /
      TRUST_COMPONENT_WEIGHT_SUM,
    tvl:
      (componentScores.tvl * TRUST_COMPONENT_WEIGHTS.tvl) /
      TRUST_COMPONENT_WEIGHT_SUM,
  };
}

function buildExplanations(
  profile: ProtocolTrustProfile,
  breakdown: TrustScoreBreakdown,
  trustScore: number,
): string[] {
  const explanations: string[] = [
    `Trust Score ${trustScore} for ${profile.protocolName}.`,
    `Security incidents component score: ${roundScore(breakdown.componentScores.securityIncidents)}.`,
    `Audit component score: ${roundScore(breakdown.componentScores.audits)}.`,
    `Protocol age component score: ${roundScore(breakdown.componentScores.protocolAge)}.`,
    `TVL component score: ${roundScore(breakdown.componentScores.tvl)}.`,
  ];

  if (breakdown.incidentPenalties.length === 0) {
    explanations.push("No security incidents on record.");
  } else {
    for (const penalty of breakdown.incidentPenalties) {
      explanations.push(
        `${penalty.severity} incident penalty: -${roundScore(penalty.decayedPenalty)} (${penalty.description}).`,
      );
    }
  }

  if (breakdown.chainAdjustment !== 0) {
    explanations.push(
      `Chain adjustment: ${breakdown.chainAdjustment > 0 ? "+" : ""}${breakdown.chainAdjustment}.`,
    );
  } else {
    explanations.push("Base deployment uses default chain adjustment of 0.");
  }

  return explanations;
}

export function calculateTrustScore(
  profile: ProtocolTrustProfile,
  asOf: Date = new Date(),
): TrustScoreResult {
  const componentScores = calculateComponentScores(profile, asOf);
  const weightedContributions = buildWeightedContributions(componentScores);
  const protocolTrustScore = roundScore(
    weightedContributions.securityIncidents +
      weightedContributions.audits +
      weightedContributions.protocolAge +
      weightedContributions.tvl,
  );
  const chainAdjustment = profile.chainAdjustment;
  const trustScore = clampTrustScore(
    roundScore(protocolTrustScore + chainAdjustment),
  );

  const breakdown: TrustScoreBreakdown = {
    componentScores,
    weightedContributions: {
      securityIncidents: roundScore(weightedContributions.securityIncidents),
      audits: roundScore(weightedContributions.audits),
      protocolAge: roundScore(weightedContributions.protocolAge),
      tvl: roundScore(weightedContributions.tvl),
    },
    incidentPenalties: calculateDecayedIncidentPenalties(
      profile.incidents,
      asOf,
    ).map((penalty) => ({
      ...penalty,
      decayedPenalty: roundScore(penalty.decayedPenalty),
      basePenalty: penalty.basePenalty,
    })),
    chainAdjustment,
    protocolTrustScore,
  };

  return {
    protocolId: profile.protocolId,
    protocolName: profile.protocolName,
    trustScore,
    breakdown,
    explanations: buildExplanations(profile, breakdown, trustScore),
  };
}
