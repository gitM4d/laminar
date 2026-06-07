import type { Opportunity } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import { getOpportunityLiquidityProfile } from "../liquidity/scoreOpportunityLiquidity.js";
import type {
  OpportunityLiquidityProfile,
  ScoredOpportunityLiquidity,
} from "../liquidity/types.js";
import type { ScoredOpportunityTrust } from "../trust/types.js";
import { evaluateOpportunityRisk } from "./evaluateOpportunityRisk.js";
import type { AssessedOpportunityRisk } from "./types.js";

export function assessOpportunityRisk(
  opportunity: Opportunity,
  policy: PortfolioPolicy,
  trust: ScoredOpportunityTrust,
  liquidity: ScoredOpportunityLiquidity,
  liquidityProfile?: OpportunityLiquidityProfile,
): AssessedOpportunityRisk {
  const profile =
    liquidityProfile ?? getOpportunityLiquidityProfile(opportunity.id);
  const assessment = evaluateOpportunityRisk({
    opportunity,
    riskLimits: policy.riskLimits,
    liquidityRequirements: policy.liquidityRequirements,
    trustScoreResult: trust.trust,
    liquidityScoreResult: liquidity.liquidity,
    liquidityProfile: profile,
  });

  return {
    opportunityId: opportunity.id,
    protocolId: opportunity.protocolId,
    protocolName: opportunity.protocolName,
    asset: opportunity.asset,
    assessment,
  };
}

export function assessOpportunitiesRisk(
  opportunities: readonly Opportunity[],
  policy: PortfolioPolicy,
  trustScores: readonly ScoredOpportunityTrust[],
  liquidityScores: readonly ScoredOpportunityLiquidity[],
): AssessedOpportunityRisk[] {
  const trustByOpportunityId = new Map(
    trustScores.map((entry) => [entry.opportunityId, entry]),
  );
  const liquidityByOpportunityId = new Map(
    liquidityScores.map((entry) => [entry.opportunityId, entry]),
  );

  return opportunities.map((opportunity) => {
    const trust = trustByOpportunityId.get(opportunity.id);
    const liquidity = liquidityByOpportunityId.get(opportunity.id);

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

    return assessOpportunityRisk(opportunity, policy, trust, liquidity);
  });
}
