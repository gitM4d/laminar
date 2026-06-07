import {
  meetsLockupRequirement,
  meetsWithdrawalDelay,
} from "../liquidity/eligibility.js";
import type { ProtocolRiskLevel } from "../opportunity/types.js";
import type { ProtocolRiskLevel as PolicyProtocolRiskLevel } from "../policy/types.js";
import {
  EXPERIMENTAL_PROTOCOL_PENALTY,
  INCIDENT_HISTORY_OPERATIONAL_PENALTY,
  PENALTY_DEFINITIONS,
  PROTOCOL_RISK_EXCESS_PENALTY_PER_LEVEL,
  PROTOCOL_RISK_LEVEL_ORDER,
  REJECTION_REASON_DEFINITIONS,
  RISK_PENALTY_MAX,
  RISK_PENALTY_MIN,
  SOFT_LIQUIDITY_PENALTY,
  SOFT_LIQUIDITY_SCORE_THRESHOLD,
} from "./riskConfig.js";
import type {
  EvaluateOpportunityRiskInput,
  RiskAssessmentResult,
  RiskPenalty,
  RiskRejectionReason,
} from "./types.js";

function clampRiskPenalty(penalty: number): number {
  return Math.min(RISK_PENALTY_MAX, Math.max(RISK_PENALTY_MIN, penalty));
}

function formatTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

function getProtocolRiskExcessLevels(
  opportunityRisk: ProtocolRiskLevel,
  maxAllowed: PolicyProtocolRiskLevel,
): number {
  return Math.max(
    0,
    PROTOCOL_RISK_LEVEL_ORDER[opportunityRisk] -
      PROTOCOL_RISK_LEVEL_ORDER[maxAllowed],
  );
}

function collectRejectionReasons(
  input: EvaluateOpportunityRiskInput,
): RiskRejectionReason[] {
  const {
    opportunity,
    riskLimits,
    liquidityRequirements,
    trustScoreResult,
    liquidityScoreResult,
    liquidityProfile,
  } = input;
  const reasons: RiskRejectionReason[] = [];

  if (trustScoreResult.trustScore < riskLimits.minTrustScore) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.belowMinTrustScore.id,
      message: formatTemplate(
        REJECTION_REASON_DEFINITIONS.belowMinTrustScore.messageTemplate,
        {
          trustScore: trustScoreResult.trustScore,
          minTrustScore: riskLimits.minTrustScore,
        },
      ),
    });
  }

  if (
    liquidityScoreResult.liquidityScore <
    liquidityRequirements.minLiquidityScore
  ) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.belowMinLiquidityScore.id,
      message: formatTemplate(
        REJECTION_REASON_DEFINITIONS.belowMinLiquidityScore.messageTemplate,
        {
          liquidityScore: liquidityScoreResult.liquidityScore,
          minLiquidityScore: liquidityRequirements.minLiquidityScore,
        },
      ),
    });
  }

  if (!liquidityScoreResult.eligible) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.structurallyIneligibleLiquidity.id,
      message: formatTemplate(
        REJECTION_REASON_DEFINITIONS.structurallyIneligibleLiquidity
          .messageTemplate,
        {
          reasons: liquidityScoreResult.ineligibilityReasons.join("; "),
        },
      ),
    });
  }

  if (!riskLimits.allowExperimentalProtocols && opportunity.isExperimental) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.experimentalProtocolNotAllowed.id,
      message:
        REJECTION_REASON_DEFINITIONS.experimentalProtocolNotAllowed
          .messageTemplate,
    });
  }

  if (!riskLimits.allowUnauditedProtocols && opportunity.auditCount === 0) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.unauditedProtocolNotAllowed.id,
      message:
        REJECTION_REASON_DEFINITIONS.unauditedProtocolNotAllowed
          .messageTemplate,
    });
  }

  if (
    !meetsWithdrawalDelay(
      liquidityProfile,
      liquidityRequirements.maxWithdrawalDelay,
    )
  ) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.withdrawalDelayExceeded.id,
      message: formatTemplate(
        REJECTION_REASON_DEFINITIONS.withdrawalDelayExceeded.messageTemplate,
        {
          opportunityDelay: liquidityProfile.maxWithdrawalDelay,
          policyDelay: liquidityRequirements.maxWithdrawalDelay,
        },
      ),
    });
  }

  if (
    !meetsLockupRequirement(
      liquidityProfile,
      liquidityRequirements.allowLockups,
    )
  ) {
    reasons.push({
      id: REJECTION_REASON_DEFINITIONS.lockupsNotAllowed.id,
      message: REJECTION_REASON_DEFINITIONS.lockupsNotAllowed.messageTemplate,
    });
  }

  return reasons;
}

function collectSoftPenalties(
  input: EvaluateOpportunityRiskInput,
): RiskPenalty[] {
  const { opportunity, riskLimits, trustScoreResult, liquidityScoreResult } =
    input;
  const penalties: RiskPenalty[] = [];

  const protocolRiskExcess = getProtocolRiskExcessLevels(
    opportunity.protocolRiskLevel,
    riskLimits.maxProtocolRisk,
  );

  if (protocolRiskExcess > 0) {
    penalties.push({
      id: PENALTY_DEFINITIONS.protocolRiskAbovePolicy.id,
      amount: clampRiskPenalty(
        protocolRiskExcess * PROTOCOL_RISK_EXCESS_PENALTY_PER_LEVEL,
      ),
      description: formatTemplate(
        PENALTY_DEFINITIONS.protocolRiskAbovePolicy.descriptionTemplate,
        {
          protocolRiskLevel: opportunity.protocolRiskLevel,
          maxProtocolRisk: riskLimits.maxProtocolRisk,
        },
      ),
    });
  }

  if (
    liquidityScoreResult.liquidityScore >=
      input.liquidityRequirements.minLiquidityScore &&
    liquidityScoreResult.liquidityScore < SOFT_LIQUIDITY_SCORE_THRESHOLD
  ) {
    penalties.push({
      id: PENALTY_DEFINITIONS.softLiquidityConcern.id,
      amount: SOFT_LIQUIDITY_PENALTY,
      description: formatTemplate(
        PENALTY_DEFINITIONS.softLiquidityConcern.descriptionTemplate,
        {
          liquidityScore: liquidityScoreResult.liquidityScore,
          threshold: SOFT_LIQUIDITY_SCORE_THRESHOLD,
        },
      ),
    });
  }

  if (trustScoreResult.breakdown.incidentPenalties.length > 0) {
    penalties.push({
      id: PENALTY_DEFINITIONS.incidentHistoryOperational.id,
      amount: INCIDENT_HISTORY_OPERATIONAL_PENALTY,
      description:
        PENALTY_DEFINITIONS.incidentHistoryOperational.descriptionTemplate,
    });
  }

  if (riskLimits.allowExperimentalProtocols && opportunity.isExperimental) {
    penalties.push({
      id: PENALTY_DEFINITIONS.experimentalProtocolAllowed.id,
      amount: EXPERIMENTAL_PROTOCOL_PENALTY,
      description:
        PENALTY_DEFINITIONS.experimentalProtocolAllowed.descriptionTemplate,
    });
  }

  return penalties;
}

function buildExplanations(
  input: EvaluateOpportunityRiskInput,
  decision: RiskAssessmentResult["decision"],
  rejectionReasons: RiskRejectionReason[],
  penalties: RiskPenalty[],
  totalRiskPenalty: number,
): string[] {
  const explanations = [
    `Risk assessment for ${input.opportunity.id}: ${decision}.`,
    `Consumed trust score: ${input.trustScoreResult.trustScore}.`,
    `Consumed liquidity score: ${input.liquidityScoreResult.liquidityScore}.`,
  ];

  if (rejectionReasons.length > 0) {
    explanations.push(
      `Rejection reasons: ${rejectionReasons.map((reason) => reason.message).join(" ")}`,
    );
  }

  if (penalties.length > 0) {
    explanations.push(
      `Risk penalties: ${penalties.map((penalty) => `${penalty.id} (${penalty.amount})`).join(", ")}.`,
    );
    explanations.push(`Total risk penalty: ${totalRiskPenalty}.`);
  } else if (decision === "eligible") {
    explanations.push("No soft risk penalties applied.");
  }

  return explanations;
}

export function evaluateOpportunityRisk(
  input: EvaluateOpportunityRiskInput,
): RiskAssessmentResult {
  const rejectionReasons = collectRejectionReasons(input);
  const decision = rejectionReasons.length === 0 ? "eligible" : "rejected";

  const penalties = decision === "eligible" ? collectSoftPenalties(input) : [];
  const totalRiskPenalty =
    decision === "eligible"
      ? clampRiskPenalty(
          penalties.reduce((sum, penalty) => sum + penalty.amount, 0),
        )
      : RISK_PENALTY_MIN;

  return {
    opportunityId: input.opportunity.id,
    decision,
    totalRiskPenalty,
    penalties,
    rejectionReasons,
    explanations: buildExplanations(
      input,
      decision,
      rejectionReasons,
      penalties,
      totalRiskPenalty,
    ),
    consumedTrustScore: input.trustScoreResult.trustScore,
    consumedLiquidityScore: input.liquidityScoreResult.liquidityScore,
  };
}
