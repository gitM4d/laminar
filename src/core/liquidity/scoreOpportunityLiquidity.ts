import type { Opportunity } from "../opportunity/types.js";
import { calculateLiquidityScore } from "./calculateLiquidityScore.js";
import { MOCK_OPPORTUNITY_LIQUIDITY_PROFILES } from "./mockOpportunityLiquidityProfiles.js";
import type {
  OpportunityLiquidityProfile,
  ScoredOpportunityLiquidity,
} from "./types.js";

export class UnknownOpportunityLiquidityProfileError extends Error {
  readonly opportunityId: string;

  constructor(opportunityId: string) {
    super(`No liquidity profile found for opportunity: ${opportunityId}`);
    this.name = "UnknownOpportunityLiquidityProfileError";
    this.opportunityId = opportunityId;
  }
}

export function getOpportunityLiquidityProfile(
  opportunityId: string,
  profiles: Record<
    string,
    OpportunityLiquidityProfile
  > = MOCK_OPPORTUNITY_LIQUIDITY_PROFILES,
): OpportunityLiquidityProfile {
  const profile = profiles[opportunityId];

  if (profile === undefined) {
    throw new UnknownOpportunityLiquidityProfileError(opportunityId);
  }

  return profile;
}

export function scoreOpportunityLiquidity(
  opportunity: Opportunity,
  options: {
    profiles?: Record<string, OpportunityLiquidityProfile>;
  } = {},
): ScoredOpportunityLiquidity {
  const profile = getOpportunityLiquidityProfile(
    opportunity.id,
    options.profiles,
  );
  const liquidity = calculateLiquidityScore(profile);

  return {
    opportunityId: opportunity.id,
    protocolId: opportunity.protocolId,
    protocolName: opportunity.protocolName,
    asset: opportunity.asset,
    liquidity,
  };
}

export function scoreOpportunitiesLiquidity(
  opportunities: readonly Opportunity[],
  options: {
    profiles?: Record<string, OpportunityLiquidityProfile>;
  } = {},
): ScoredOpportunityLiquidity[] {
  return opportunities.map((opportunity) =>
    scoreOpportunityLiquidity(opportunity, options),
  );
}
