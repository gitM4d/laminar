import type { PortfolioConstructionResult } from "../construction/types.js";
import type { ScoredOpportunityLiquidity } from "../liquidity/types.js";
import type { Opportunity, SupportedAsset } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type { ProfileName } from "../profile/types.js";
import type { AssessedOpportunityRisk } from "../risk/types.js";
import type { OpportunityRanking, RejectedOpportunity } from "../scoring/types.js";
import type { ScoredOpportunityTrust } from "../trust/types.js";

export type RejectionReasonCategory =
  | "trust"
  | "liquidity"
  | "risk"
  | "policy"
  | "construction"
  | "unknown";

export type RejectedOpportunityDetail = {
  code: string;
  category: RejectionReasonCategory;
  message: string;
  observedValue?: number | string | boolean;
  requiredValue?: number | string | boolean;
};

export type RejectedOpportunityExplanation = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  status: "rejected";
  primaryReasonCode: string;
  primaryReasonCategory: RejectionReasonCategory;
  summary: string;
  details: RejectedOpportunityDetail[];
};

export type BuildRejectedOpportunityExplanationsInput = {
  selectedProfile: ProfileName;
  policy: PortfolioPolicy;
  opportunities: readonly Opportunity[];
  opportunityRanking: OpportunityRanking;
  portfolioConstruction: PortfolioConstructionResult;
  riskAssessments: AssessedOpportunityRisk[];
  trustScores: ScoredOpportunityTrust[];
  liquidityScores: ScoredOpportunityLiquidity[];
};

type ReasonMetadata = {
  category: RejectionReasonCategory;
  message: string;
};

const REJECTION_REASON_METADATA: Record<string, ReasonMetadata> = {
  belowMinTrustScore: {
    category: "trust",
    message:
      "Trust score is below the minimum required by the selected policy.",
  },
  belowMinLiquidityScore: {
    category: "liquidity",
    message:
      "Liquidity score is below the minimum required by the selected policy.",
  },
  structurallyIneligibleLiquidity: {
    category: "liquidity",
    message:
      "Liquidity scoring marked this opportunity as structurally ineligible.",
  },
  experimentalProtocolNotAllowed: {
    category: "policy",
    message: "The selected policy does not allow experimental protocols.",
  },
  unauditedProtocolNotAllowed: {
    category: "policy",
    message: "The selected policy does not allow unaudited protocols.",
  },
  withdrawalDelayExceeded: {
    category: "liquidity",
    message: "The withdrawal delay exceeds the selected policy maximum.",
  },
  lockupsNotAllowed: {
    category: "liquidity",
    message: "The selected policy does not allow lockups.",
  },
};

const UNKNOWN_REASON: ReasonMetadata = {
  category: "unknown",
  message: "This opportunity was rejected by the risk engine.",
};

const PRIMARY_REASON_PRIORITY: Record<string, number> = {
  experimentalProtocolNotAllowed: 10,
  unauditedProtocolNotAllowed: 20,
  belowMinTrustScore: 30,
  structurallyIneligibleLiquidity: 40,
  belowMinLiquidityScore: 50,
  withdrawalDelayExceeded: 60,
  lockupsNotAllowed: 70,
};

const PRIMARY_REASON_SUMMARY: Record<
  string,
  (profile: ProfileName) => string
> = {
  belowMinTrustScore: (profile) =>
    `Trust score below ${profile} minimum.`,
  belowMinLiquidityScore: (profile) =>
    `Liquidity score below ${profile} minimum.`,
  structurallyIneligibleLiquidity: () =>
    "Liquidity scoring marked this opportunity as structurally ineligible.",
  experimentalProtocolNotAllowed: () =>
    "Experimental protocols are not allowed.",
  unauditedProtocolNotAllowed: () =>
    "Unaudited protocols are not allowed.",
  withdrawalDelayExceeded: () =>
    "Withdrawal delay exceeds policy maximum.",
  lockupsNotAllowed: () => "Lockups are not allowed by policy.",
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function getReasonMetadata(reasonCode: string): ReasonMetadata {
  return REJECTION_REASON_METADATA[reasonCode] ?? UNKNOWN_REASON;
}

function getPrimaryReasonPriority(reasonCode: string): number {
  return PRIMARY_REASON_PRIORITY[reasonCode] ?? 999;
}

function buildPrimarySummary(
  reasonCode: string,
  selectedProfile: ProfileName,
): string {
  const builder = PRIMARY_REASON_SUMMARY[reasonCode];
  if (builder !== undefined) {
    return builder(selectedProfile);
  }

  return UNKNOWN_REASON.message;
}

function collectUniqueRejected(
  ranking: OpportunityRanking,
  construction: PortfolioConstructionResult,
): RejectedOpportunity[] {
  const byId = new Map<string, RejectedOpportunity>();

  for (const rejected of ranking.rejected) {
    byId.set(rejected.opportunityId, rejected);
  }

  for (const rejected of construction.rejectedOpportunities) {
    if (!byId.has(rejected.opportunityId)) {
      byId.set(rejected.opportunityId, rejected);
    }
  }

  return [...byId.values()];
}

function selectPrimaryReasonCode(
  rejectionReasons: RejectedOpportunity["rejectionReasons"],
): string {
  if (rejectionReasons.length === 0) {
    return "unknown";
  }

  return rejectionReasons.reduce((primary, current) =>
    getPrimaryReasonPriority(current.id) <
    getPrimaryReasonPriority(primary.id)
      ? current
      : primary,
  ).id;
}

function buildDetailForReason(
  reasonCode: string,
  input: BuildRejectedOpportunityExplanationsInput,
  opportunity: Opportunity,
  riskAssessment: AssessedOpportunityRisk | undefined,
  liquidityScore: ScoredOpportunityLiquidity | undefined,
): RejectedOpportunityDetail {
  const metadata = getReasonMetadata(reasonCode);
  const detail: RejectedOpportunityDetail = {
    code: reasonCode,
    category: metadata.category,
    message: metadata.message,
  };

  switch (reasonCode) {
    case "belowMinTrustScore":
      if (riskAssessment !== undefined) {
        detail.observedValue = roundScore(
          riskAssessment.assessment.consumedTrustScore,
        );
        detail.requiredValue = input.policy.riskLimits.minTrustScore;
      }
      break;
    case "belowMinLiquidityScore":
      if (riskAssessment !== undefined) {
        detail.observedValue = roundScore(
          riskAssessment.assessment.consumedLiquidityScore,
        );
        detail.requiredValue =
          input.policy.liquidityRequirements.minLiquidityScore;
      }
      break;
    case "experimentalProtocolNotAllowed":
      detail.observedValue = opportunity.isExperimental;
      detail.requiredValue = input.policy.riskLimits.allowExperimentalProtocols;
      break;
    case "unauditedProtocolNotAllowed":
      detail.observedValue = opportunity.auditCount;
      detail.requiredValue = input.policy.riskLimits.allowUnauditedProtocols;
      break;
    case "structurallyIneligibleLiquidity":
      if (
        liquidityScore !== undefined &&
        liquidityScore.liquidity.ineligibilityReasons.length > 0
      ) {
        detail.observedValue =
          liquidityScore.liquidity.ineligibilityReasons.join("; ");
      }
      break;
    case "withdrawalDelayExceeded":
      detail.requiredValue =
        input.policy.liquidityRequirements.maxWithdrawalDelay;
      break;
    case "lockupsNotAllowed":
      detail.requiredValue = input.policy.liquidityRequirements.allowLockups;
      break;
  }

  return detail;
}

function buildExplanationForRejected(
  rejected: RejectedOpportunity,
  input: BuildRejectedOpportunityExplanationsInput,
  opportunityById: Map<string, Opportunity>,
  riskByOpportunityId: Map<string, AssessedOpportunityRisk>,
  liquidityByOpportunityId: Map<string, ScoredOpportunityLiquidity>,
): RejectedOpportunityExplanation {
  const opportunity =
    opportunityById.get(rejected.opportunityId) ??
    ({
      id: rejected.opportunityId,
      protocolId: rejected.protocolId,
      protocolName: rejected.protocolName,
      asset: rejected.asset as SupportedAsset,
      chain: "Base",
      apy: 0,
      isExperimental: false,
      protocolRiskLevel: "low",
      auditCount: 0,
      exposureCategory: "lending",
    } satisfies Opportunity);
  const riskAssessment = riskByOpportunityId.get(rejected.opportunityId);
  const liquidityScore = liquidityByOpportunityId.get(rejected.opportunityId);

  const primaryReasonCode = selectPrimaryReasonCode(rejected.rejectionReasons);
  const primaryMetadata = getReasonMetadata(primaryReasonCode);

  const details =
    rejected.rejectionReasons.length > 0
      ? rejected.rejectionReasons.map((reason) =>
          buildDetailForReason(
            reason.id,
            input,
            opportunity,
            riskAssessment,
            liquidityScore,
          ),
        )
      : [
          {
            code: "unknown",
            category: "unknown" as const,
            message: UNKNOWN_REASON.message,
          },
        ];

  return {
    opportunityId: rejected.opportunityId,
    protocolId: rejected.protocolId,
    protocolName: rejected.protocolName,
    asset: rejected.asset,
    status: "rejected",
    primaryReasonCode,
    primaryReasonCategory: primaryMetadata.category,
    summary: buildPrimarySummary(primaryReasonCode, input.selectedProfile),
    details,
  };
}

export function buildRejectedOpportunityExplanations(
  input: BuildRejectedOpportunityExplanationsInput,
): RejectedOpportunityExplanation[] {
  const rejectedEntries = collectUniqueRejected(
    input.opportunityRanking,
    input.portfolioConstruction,
  );

  const opportunityById = new Map(
    input.opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );
  const riskByOpportunityId = new Map(
    input.riskAssessments.map((entry) => [entry.opportunityId, entry]),
  );
  const liquidityByOpportunityId = new Map(
    input.liquidityScores.map((entry) => [entry.opportunityId, entry]),
  );

  const explanations = rejectedEntries.map((rejected) =>
    buildExplanationForRejected(
      rejected,
      input,
      opportunityById,
      riskByOpportunityId,
      liquidityByOpportunityId,
    ),
  );

  explanations.sort((left, right) =>
    left.opportunityId.localeCompare(right.opportunityId),
  );

  return explanations;
}

export type SnapshotRejectionHighlight = {
  opportunityId: string;
  label: string;
  protocolName: string;
  asset: string;
  primaryReasonCategory: RejectionReasonCategory;
  summary: string;
};

export function buildRejectionHighlights(
  explanations: readonly RejectedOpportunityExplanation[],
): SnapshotRejectionHighlight[] {
  const seen = new Set<string>();
  const highlights: SnapshotRejectionHighlight[] = [];

  for (const explanation of explanations) {
    if (seen.has(explanation.opportunityId)) {
      continue;
    }

    seen.add(explanation.opportunityId);
    highlights.push({
      opportunityId: explanation.opportunityId,
      label: `${explanation.protocolName} ${explanation.asset}`,
      protocolName: explanation.protocolName,
      asset: explanation.asset,
      primaryReasonCategory: explanation.primaryReasonCategory,
      summary: explanation.summary,
    });
  }

  return highlights;
}
