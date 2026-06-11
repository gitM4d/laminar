import { FluidBaseReadOnlyAdapter } from "../../adapters/fluid/FluidBaseReadOnlyAdapter.js";
import type { FluidBaseReadOnlyAdapterOptions } from "../../adapters/fluid/FluidBaseReadOnlyAdapter.js";
import { mapFluidMarketToOpportunity } from "../../adapters/fluid/mapFluidMarketToOpportunity.js";
import { FLUID_BASE_CONFIG } from "../../adapters/fluid/fluidBaseConfig.js";
import { filterRealDataEligibleMarkets } from "../../adapters/realDataEligibility.js";
import {
  getOpportunityLiquidityProfile,
  UnknownOpportunityLiquidityProfileError,
} from "../liquidity/scoreOpportunityLiquidity.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { Opportunity } from "../opportunity/types.js";
import {
  getProtocolTrustProfile,
  UnknownProtocolTrustProfileError,
} from "../trust/scoreOpportunityTrust.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type { LaminarDataProvider, ProviderInfo } from "./types.js";

export const FLUID_BASE_CURATED_TRUST_PROFILE: ProtocolTrustProfile = {
  protocolId: FLUID_BASE_CONFIG.protocolId,
  protocolName: FLUID_BASE_CONFIG.protocolName,
  protocolAgeYears: 2,
  tvlUsd: 12_000_000,
  audits: [
    {
      auditor: "ChainSecurity",
      tier: 1,
      completedAt: "2024-06-01",
    },
    {
      auditor: "Spearbit",
      tier: 1,
      completedAt: "2024-09-01",
    },
  ],
  incidents: [],
  chainAdjustment: 0,
};

function buildCuratedLiquidityProfile(
  opportunityId: string,
): OpportunityLiquidityProfile {
  return {
    opportunityId,
    withdrawalSpeedBucket: "instant",
    withdrawalConstraintType: "none",
    redemptionReliabilityLevel: "high",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "instant",
    hasLockup: false,
  };
}

class FluidBaseLaminarDataProvider implements LaminarDataProvider {
  private readonly opportunities: readonly Opportunity[];
  private readonly trustProfiles: Record<string, ProtocolTrustProfile>;
  private readonly liquidityProfiles: Record<
    string,
    OpportunityLiquidityProfile
  >;

  constructor(
    opportunities: readonly Opportunity[],
    trustProfiles: Record<string, ProtocolTrustProfile>,
    liquidityProfiles: Record<string, OpportunityLiquidityProfile>,
  ) {
    this.opportunities = opportunities;
    this.trustProfiles = trustProfiles;
    this.liquidityProfiles = liquidityProfiles;
  }

  discoverOpportunities(): Opportunity[] {
    return [...this.opportunities];
  }

  getTrustProfile(protocolId: string): ProtocolTrustProfile {
    return getProtocolTrustProfile(protocolId, this.trustProfiles);
  }

  getLiquidityProfile(opportunityId: string): OpportunityLiquidityProfile {
    return getOpportunityLiquidityProfile(opportunityId, this.liquidityProfiles);
  }

  getProviderInfo(): ProviderInfo {
    return {
      providerType: "FluidBaseLaminarDataProvider",
      providerName: "Fluid Base (experimental)",
    };
  }
}

export type FluidBaseProviderSnapshotOptions = FluidBaseReadOnlyAdapterOptions;

/**
 * Builds a read-only Fluid Base provider snapshot.
 *
 * Only real-data-eligible markets are exposed. Static dev fallback markets from
 * the adapter are filtered out and never appear in provider recommendations.
 */
export async function createFluidBaseLaminarDataProviderSnapshot(
  options: FluidBaseProviderSnapshotOptions = {},
): Promise<LaminarDataProvider> {
  const adapter = new FluidBaseReadOnlyAdapter(options);
  const discoveredMarkets = await adapter.discoverMarkets();
  const eligibleMarkets = filterRealDataEligibleMarkets(discoveredMarkets);
  const opportunities = eligibleMarkets.map(mapFluidMarketToOpportunity);

  const trustProfiles: Record<string, ProtocolTrustProfile> = {};
  const liquidityProfiles: Record<string, OpportunityLiquidityProfile> = {};

  if (opportunities.length > 0) {
    trustProfiles[FLUID_BASE_CONFIG.protocolId] =
      FLUID_BASE_CURATED_TRUST_PROFILE;
    for (const opportunity of opportunities) {
      liquidityProfiles[opportunity.id] = buildCuratedLiquidityProfile(
        opportunity.id,
      );
    }
  }

  return new FluidBaseLaminarDataProvider(
    opportunities,
    trustProfiles,
    liquidityProfiles,
  );
}

export {
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
};
