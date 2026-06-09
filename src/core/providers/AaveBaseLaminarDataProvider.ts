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
import type { LaminarDataProvider, ProviderInfo } from "./types.js";

/**
 * Curated Aave trust profile for the read-only adapter.
 *
 * NOTE: Trust metadata is curated/static — not sourced on-chain.
 * Aave is treated as a conservative, high-trust protocol.
 */
export const AAVE_BASE_CURATED_TRUST_PROFILE: ProtocolTrustProfile = {
  protocolId: AAVE_BASE_CONFIG.protocolId,
  protocolName: AAVE_BASE_CONFIG.protocolName,
  protocolAgeYears: 5.5,
  tvlUsd: 12_500_000_000,
  audits: [
    {
      auditor: "OpenZeppelin",
      tier: 1,
      completedAt: "2021-03-15",
    },
    {
      auditor: "Trail of Bits",
      tier: 1,
      completedAt: "2023-08-01",
    },
  ],
  incidents: [],
  chainAdjustment: 0,
};

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
    [AAVE_BASE_CONFIG.protocolId]: AAVE_BASE_CURATED_TRUST_PROFILE,
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
  );
}
