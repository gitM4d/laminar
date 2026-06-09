import { MOCK_OPPORTUNITY_LIQUIDITY_PROFILES } from "../liquidity/mockOpportunityLiquidityProfiles.js";
import {
  getOpportunityLiquidityProfile,
  UnknownOpportunityLiquidityProfileError,
} from "../liquidity/scoreOpportunityLiquidity.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import type { Opportunity } from "../opportunity/types.js";
import { MOCK_PROTOCOL_TRUST_PROFILES } from "../trust/mockProtocolTrustProfiles.js";
import {
  getProtocolTrustProfile,
  UnknownProtocolTrustProfileError,
} from "../trust/scoreOpportunityTrust.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type { LaminarDataProvider, ProviderInfo } from "./types.js";

export class MockLaminarDataProvider implements LaminarDataProvider {
  private readonly opportunities: readonly Opportunity[];
  private readonly trustProfiles: Record<string, ProtocolTrustProfile>;
  private readonly liquidityProfiles: Record<string, OpportunityLiquidityProfile>;

  constructor(
    options: {
      opportunities?: readonly Opportunity[];
      trustProfiles?: Record<string, ProtocolTrustProfile>;
      liquidityProfiles?: Record<string, OpportunityLiquidityProfile>;
    } = {},
  ) {
    this.opportunities = options.opportunities ?? MOCK_OPPORTUNITIES;
    this.trustProfiles = options.trustProfiles ?? MOCK_PROTOCOL_TRUST_PROFILES;
    this.liquidityProfiles =
      options.liquidityProfiles ?? MOCK_OPPORTUNITY_LIQUIDITY_PROFILES;
  }

  discoverOpportunities(): Opportunity[] {
    return [...this.opportunities];
  }

  getTrustProfile(protocolId: string): ProtocolTrustProfile {
    return getProtocolTrustProfile(protocolId, this.trustProfiles);
  }

  getLiquidityProfile(opportunityId: string): OpportunityLiquidityProfile {
    return getOpportunityLiquidityProfile(
      opportunityId,
      this.liquidityProfiles,
    );
  }

  getProviderInfo(): ProviderInfo {
    return {
      providerType: "MockLaminarDataProvider",
      providerName: "MockLaminarDataProvider",
    };
  }
}

export {
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
};
