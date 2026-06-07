import type { Opportunity } from "../opportunity/types.js";
import { calculateOpportunityScore } from "./calculateOpportunityScore.js";
import type {
  OpportunityRanking,
  RankOpportunitiesInput,
  RejectedOpportunity,
  ScoredOpportunity,
} from "./types.js";

function buildRejectedOpportunity(
  opportunity: Opportunity,
  rejectionReasons: RejectedOpportunity["rejectionReasons"],
  explanations: readonly string[],
): RejectedOpportunity {
  return {
    opportunityId: opportunity.id,
    protocolId: opportunity.protocolId,
    protocolName: opportunity.protocolName,
    asset: opportunity.asset,
    rejectionReasons,
    explanations,
  };
}

export function rankOpportunities(
  input: RankOpportunitiesInput,
): OpportunityRanking {
  const trustByOpportunityId = new Map(
    input.trustScores.map((entry) => [entry.opportunityId, entry]),
  );
  const liquidityByOpportunityId = new Map(
    input.liquidityScores.map((entry) => [entry.opportunityId, entry]),
  );
  const riskByOpportunityId = new Map(
    input.riskAssessments.map((entry) => [entry.opportunityId, entry]),
  );

  const scoredEligible: ScoredOpportunity[] = [];
  const rejected: RejectedOpportunity[] = [];

  for (const opportunity of input.opportunities) {
    const trust = trustByOpportunityId.get(opportunity.id);
    const liquidity = liquidityByOpportunityId.get(opportunity.id);
    const risk = riskByOpportunityId.get(opportunity.id);

    if (trust === undefined) {
      throw new Error(
        `No trust score found for opportunity: ${opportunity.id}`,
      );
    }

    if (liquidity === undefined) {
      throw new Error(
        `No liquidity score found for opportunity: ${opportunity.id}`,
      );
    }

    if (risk === undefined) {
      throw new Error(
        `No risk assessment found for opportunity: ${opportunity.id}`,
      );
    }

    if (risk.assessment.decision === "rejected") {
      rejected.push(
        buildRejectedOpportunity(
          opportunity,
          risk.assessment.rejectionReasons,
          risk.assessment.explanations,
        ),
      );
      continue;
    }

    const scoring = calculateOpportunityScore({
      opportunity,
      selectedProfile: input.policy.selectedProfile,
      trustScoreResult: trust.trust,
      liquidityScoreResult: liquidity.liquidity,
      riskAssessmentResult: risk.assessment,
    });

    scoredEligible.push({
      opportunityId: opportunity.id,
      protocolId: opportunity.protocolId,
      protocolName: opportunity.protocolName,
      asset: opportunity.asset,
      rank: 0,
      scoring,
    });
  }

  scoredEligible.sort(
    (left, right) => right.scoring.score - left.scoring.score,
  );

  const ranked = scoredEligible.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return { ranked, rejected };
}
