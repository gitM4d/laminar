import { AaveBaseReadOnlyAdapter } from "../../adapters/aave/AaveBaseReadOnlyAdapter.js";
import type { AaveBaseReadOnlyAdapterOptions } from "../../adapters/aave/AaveBaseReadOnlyAdapter.js";
import { mapAaveMarketToOpportunity } from "../../adapters/aave/mapAaveMarketToOpportunity.js";
import { AAVE_BASE_CONFIG } from "../../adapters/aave/aaveBaseConfig.js";
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

/** @deprecated Import from protocol registry via buildCuratedProtocolTrustProfile("aave"). */
export const AAVE_BASE_CURATED_TRUST_PROFILE: ProtocolTrustProfile =
  buildCuratedProtocolTrustProfile(AAVE_BASE_CONFIG.protocolId);

/**
 * Curated liquidity profile for Aave Base stablecoin markets.
 *
 * NOTE: Liquidity metadata is curated/static. USDC/EURC lending positions
 * are instant, no lockup, with very high reliability.
 */
function buildCuratedLiquidityProfile(
  opportunityId: string,
): OpportunityLiquidityProfile {
  return {
    opportunityId,
    withdrawalSpeedBucket: "instant",
    withdrawalConstraintType: "none",
    redemptionReliabilityLevel: "veryHigh",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "instant",
    hasLockup: false,
  };
}

/**
 * Read-only Aave Base data provider.
 *
 * Wraps on-chain discovered opportunities (with real supply APR) and curated
 * trust/liquidity profiles into a synchronous `LaminarDataProvider` that can
 * be passed directly into `createLaminarRecommendation`.
 *
 * IMPORTANT:
 * - Supply APY is real (Aave liquidityRate APR approximation).
 * - TVL remains a static placeholder.
 * - Trust/liquidity profiles are curated/static.
 * - No transactions are created; the adapter is read-only.
 * - This is experimental. The API/frontend default remains MockLaminarDataProvider.
 */
class AaveBaseLaminarDataProvider implements LaminarDataProvider {
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
      providerType: "AaveBaseLaminarDataProvider",
      providerName: "Aave Base (experimental)",
    };
  }
}

export {
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
};

export type AaveBaseProviderSnapshotOptions = AaveBaseReadOnlyAdapterOptions;

/**
 * Experimental factory that builds a LaminarDataProvider snapshot from the
 * read-only Aave Base adapter.
 *
 * This is async because adapter discovery is async, but it returns a plain
 * synchronous LaminarDataProvider snapshot so that createLaminarRecommendation
 * stays synchronous.
 *
 * Usage:
 * ```ts
 * const provider = await createAaveBaseLaminarDataProviderSnapshot();
 * const result = createLaminarRecommendation({ intent, portfolioValueUsd, dataProvider: provider });
 * ```
 *
 * IMPORTANT:
 * - This is experimental and is NOT the default provider.
 * - Supply APY is from Aave liquidityRate (APR approximation, no incentives).
 * - TVL is a static placeholder.
 * - Trust/liquidity metadata is curated/static.
 * - No transactions are created; the adapter is read-only.
 */
export async function createAaveBaseLaminarDataProviderSnapshot(
  options: AaveBaseProviderSnapshotOptions = {},
): Promise<LaminarDataProvider> {
  const adapter = new AaveBaseReadOnlyAdapter(options);
  const markets = await adapter.discoverMarkets();
  const opportunities: Opportunity[] = markets.map(mapAaveMarketToOpportunity);

  const trustProfiles: Record<string, ProtocolTrustProfile> = {
    [AAVE_BASE_CONFIG.protocolId]: buildProtocolTrustProfileWithDerivedTvl(
      AAVE_BASE_CURATED_TRUST_PROFILE,
      markets,
    ),
  };

  const liquidityProfiles: Record<string, OpportunityLiquidityProfile> = {};
  for (const opportunity of opportunities) {
    liquidityProfiles[opportunity.id] = buildCuratedLiquidityProfile(
      opportunity.id,
    );
  }

  return new AaveBaseLaminarDataProvider(
    opportunities,
    trustProfiles,
    liquidityProfiles,
    {
      [AAVE_BASE_CONFIG.protocolId]: deriveLiquiditySignalsFromMarkets(
        markets,
        AAVE_BASE_CONFIG.protocolId,
      ),
    },
  );
}
