import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { ProtocolTrustProfile } from "../trust/types.js";

export interface OpportunityProvider {
  discoverOpportunities(): Opportunity[];
}

export interface TrustProfileProvider {
  getTrustProfile(protocolId: string): ProtocolTrustProfile;
}

export interface LiquidityProfileProvider {
  getLiquidityProfile(opportunityId: string): OpportunityLiquidityProfile;
}

export interface LaminarDataProvider
  extends OpportunityProvider,
    TrustProfileProvider,
    LiquidityProfileProvider {}
