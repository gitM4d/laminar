import { AaveBaseReadOnlyAdapter } from "../../adapters/aave/AaveBaseReadOnlyAdapter.js";
import type { AaveBaseReadOnlyAdapterOptions } from "../../adapters/aave/AaveBaseReadOnlyAdapter.js";
import { mapAaveMarketToOpportunity } from "../../adapters/aave/mapAaveMarketToOpportunity.js";
import { AAVE_BASE_CONFIG } from "../../adapters/aave/aaveBaseConfig.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import { MockLaminarDataProvider } from "./MockLaminarDataProvider.js";
import type { LaminarDataProvider } from "./types.js";

/**
 * Curated Aave trust profile for the read-only adapter spike.
 *
 * NOTE: Trust metadata remains curated/static in Sprint 17. It is NOT sourced
 * on-chain. Aave is treated as a conservative, high-trust protocol.
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
 * NOTE: Liquidity metadata remains curated/static in Sprint 17. USDC/EURC
 * lending positions are instant, no lockup, with very high reliability.
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

export type AaveBaseProviderSnapshotOptions = AaveBaseReadOnlyAdapterOptions;

/**
 * Experimental factory that builds a LaminarDataProvider snapshot from the
 * read-only Aave Base adapter.
 *
 * This is async because adapter discovery is async, but it returns a plain
 * synchronous LaminarDataProvider snapshot so that createLaminarRecommendation
 * stays synchronous.
 *
 * IMPORTANT:
 * - This is experimental and is NOT the default provider.
 * - Market APY/TVL are adapter-provided (static in Sprint 17).
 * - Trust/liquidity metadata is curated/static in Sprint 17.
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

  return new MockLaminarDataProvider({
    opportunities,
    trustProfiles,
    liquidityProfiles,
  });
}
