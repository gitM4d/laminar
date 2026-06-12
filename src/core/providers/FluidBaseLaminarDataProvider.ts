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
import { buildCuratedProtocolTrustProfile } from "../protocols/protocolRegistry.js";
import type { LaminarDataProvider, ProviderInfo } from "./types.js";
import { buildProtocolTrustProfileWithDerivedTvl } from "./deriveProtocolTvl.js";
import {
  deriveLiquiditySignalsFromMarkets,
  type LiquidityDerivedSignals,
} from "../liquidity/deriveLiquiditySignals.js";

/** @deprecated Import from protocol registry via buildCuratedProtocolTrustProfile("fluid"). */
export const FLUID_BASE_CURATED_TRUST_PROFILE: ProtocolTrustProfile =
  buildCuratedProtocolTrustProfile(FLUID_BASE_CONFIG.protocolId);

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
  private readonly liquidityDerivedSignalsByProtocol: Record<
    string,
    LiquidityDerivedSignals
  >;

  constructor(
    opportunities: readonly Opportunity[],
    trustProfiles: Record<string, ProtocolTrustProfile>,
    liquidityProfiles: Record<string, OpportunityLiquidityProfile>,
    liquidityDerivedSignalsByProtocol: Record<string, LiquidityDerivedSignals>,
  ) {
    this.opportunities = opportunities;
    this.trustProfiles = trustProfiles;
    this.liquidityProfiles = liquidityProfiles;
    this.liquidityDerivedSignalsByProtocol = liquidityDerivedSignalsByProtocol;
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

  getLiquidityDerivedSignals(
    protocolId: string,
  ): LiquidityDerivedSignals | undefined {
    return this.liquidityDerivedSignalsByProtocol[protocolId];
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
  const liquidityDerivedSignalsByProtocol: Record<string, LiquidityDerivedSignals> =
    {};

  if (opportunities.length > 0) {
    trustProfiles[FLUID_BASE_CONFIG.protocolId] =
      buildProtocolTrustProfileWithDerivedTvl(
        FLUID_BASE_CURATED_TRUST_PROFILE,
        eligibleMarkets,
      );
    liquidityDerivedSignalsByProtocol[FLUID_BASE_CONFIG.protocolId] =
      deriveLiquiditySignalsFromMarkets(
        eligibleMarkets,
        FLUID_BASE_CONFIG.protocolId,
      );
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
    liquidityDerivedSignalsByProtocol,
  );
}

export {
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
};
