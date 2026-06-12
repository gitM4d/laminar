import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { LiquidityDerivedSignals } from "../liquidity/deriveLiquiditySignals.js";
import type { Opportunity } from "../opportunity/types.js";
import type { ProtocolTrustProfile } from "../trust/types.js";

export type ProviderInfo = {
  /** Short machine-readable type identifier (e.g. "MockLaminarDataProvider"). */
  providerType: string;
  /** Human-readable display name (e.g. "Aave Base (experimental)"). */
  providerName: string;
};

export interface OpportunityProvider {
  discoverOpportunities(): Opportunity[];
}

export interface TrustProfileProvider {
  getTrustProfile(protocolId: string): ProtocolTrustProfile;
}

export interface LiquidityProfileProvider {
  getLiquidityProfile(opportunityId: string): OpportunityLiquidityProfile;
}

export interface LiquidityDerivedSignalsProvider {
  /** Optional informational liquidity signals derived from real market TVL. */
  getLiquidityDerivedSignals?(
    protocolId: string,
  ): LiquidityDerivedSignals | undefined;
}

export interface LaminarDataProvider
  extends OpportunityProvider,
    TrustProfileProvider,
    LiquidityProfileProvider,
    LiquidityDerivedSignalsProvider {
  /** Optional: providers may report their type for diagnostics. */
  getProviderInfo?(): ProviderInfo;
}
